-- Simplified NYC Historian Schema
-- 4 core entities: Person, Location, Event, Milestone

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- BOOKS (metadata only)
-- ============================================================================

CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publication_year INTEGER,
    time_period_start INTEGER,
    time_period_end INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERSON
-- ============================================================================

CREATE TABLE persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    aliases TEXT[], -- other names found
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    
    -- For deduplication
    birth_year INTEGER,
    death_year INTEGER,
    
    -- Reconciliation
    canonical_id UUID REFERENCES persons(id), -- points to "true" entity after dedup
    
    external_ids JSONB, -- {wikidata: "Q123", ...}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_persons_name ON persons USING gin(name gin_trgm_ops);
CREATE INDEX idx_persons_canonical ON persons(canonical_id);
CREATE INDEX idx_persons_birth_death ON persons(birth_year, death_year);

-- ============================================================================
-- LOCATION
-- ============================================================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    aliases TEXT[],
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    
    -- For deduplication (all optional)
    normalized_address TEXT, -- "123 BOWERY ST"
    street_name TEXT,
    cross_streets TEXT[], -- for intersections
    neighborhood TEXT,
    borough TEXT,
    
    year_start INTEGER, -- temporal bounds
    year_end INTEGER,
    
    geometry GEOMETRY(GEOMETRY, 4326), -- optional coordinates
    
    -- Reconciliation
    canonical_id UUID REFERENCES locations(id),
    
    external_ids JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_name ON locations USING gin(name gin_trgm_ops);
CREATE INDEX idx_locations_canonical ON locations(canonical_id);
CREATE INDEX idx_locations_address ON locations(normalized_address);
CREATE INDEX idx_locations_street ON locations(street_name);
CREATE INDEX idx_locations_neighborhood ON locations(neighborhood, borough);
CREATE INDEX idx_locations_geometry ON locations USING gist(geometry);

-- ============================================================================
-- CONTEXT SNAPSHOTS
-- ============================================================================

CREATE TABLE context_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chunk_label TEXT,
    page_range INTEGER[],
    summary TEXT,
    key_persons TEXT[],
    key_locations TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_context_chunks_book ON context_chunks(book_id);

-- ============================================================================
-- EVENT
-- ============================================================================

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    page_range INTEGER[], -- [start, end]
    context_chunk_id UUID REFERENCES context_chunks(id) ON DELETE SET NULL,
    event_type TEXT,
    
    event_date DATE, -- when it happened
    date_precision TEXT CHECK (date_precision IN ('exact', 'month', 'year', 'circa', 'unknown')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_book ON events(book_id);
CREATE INDEX idx_events_date ON events(event_date);

-- ============================================================================
-- MILESTONE (Person-specific events)
-- ============================================================================

CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    
    milestone_type TEXT CHECK (milestone_type IN ('birth', 'death', 'marriage', 'immigration', 'career_change', 'other')),
    milestone_date DATE,
    date_precision TEXT CHECK (date_precision IN ('exact', 'month', 'year', 'circa', 'unknown')),
    
    description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_person ON milestones(person_id);
CREATE INDEX idx_milestones_type ON milestones(milestone_type);

-- ============================================================================
-- CROSS-REFERENCES (link entities to events)
-- ============================================================================

CREATE TABLE event_participants (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    role TEXT, -- "participant", "witness", "victim", etc.
    PRIMARY KEY (event_id, person_id)
);

CREATE TABLE event_venues (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, location_id)
);

CREATE TABLE milestone_places (
    milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (milestone_id, location_id)
);

-- ============================================================================
-- DEDUPLICATION QUEUE
-- ============================================================================

CREATE TABLE entity_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT CHECK (entity_type IN ('person', 'location')),
    entity_id_1 UUID NOT NULL,
    entity_id_2 UUID NOT NULL,
    
    similarity_score DECIMAL(3,2) CHECK (similarity_score BETWEEN 0 AND 1),
    matching_signals JSONB, -- what matched: name, birth_year, location_overlap, etc.
    
    status TEXT CHECK (status IN ('pending', 'merged', 'rejected')) DEFAULT 'pending',
    reviewed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (entity_id_1 < entity_id_2)
);

CREATE INDEX idx_matches_status ON entity_matches(status);
CREATE INDEX idx_matches_score ON entity_matches(similarity_score DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Canonical entities only (after deduplication)
CREATE VIEW canonical_persons AS
SELECT * FROM persons WHERE canonical_id IS NULL OR id = canonical_id;

CREATE VIEW canonical_locations AS
SELECT * FROM locations WHERE canonical_id IS NULL OR id = canonical_id;

-- Events with linked entities
CREATE VIEW events_full AS
SELECT 
    e.*,
    ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.id IS NOT NULL) AS person_names,
    ARRAY_AGG(DISTINCT l.name) FILTER (WHERE l.id IS NOT NULL) AS location_names
FROM events e
LEFT JOIN event_participants ep ON e.id = ep.event_id
LEFT JOIN persons p ON ep.person_id = p.id
LEFT JOIN event_venues el ON e.id = el.event_id
LEFT JOIN locations l ON el.location_id = l.id
GROUP BY e.id;

-- ============================================================================
-- DEDUPLICATION HELPERS
-- ============================================================================

-- Find person matches based on name + birth/death years
CREATE OR REPLACE FUNCTION find_person_matches(
    p_name TEXT,
    p_birth_year INTEGER,
    p_death_year INTEGER
)
RETURNS TABLE (
    person_id UUID,
    match_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        (
            (similarity(p.name, p_name) * 0.5) +
            (CASE WHEN p.birth_year = p_birth_year THEN 0.3 ELSE 0 END) +
            (CASE WHEN p.death_year = p_death_year THEN 0.2 ELSE 0 END)
        )::DECIMAL AS score
    FROM persons p
    WHERE similarity(p.name, p_name) > 0.6
        OR (p.birth_year = p_birth_year AND p.birth_year IS NOT NULL)
        OR (p.death_year = p_death_year AND p.death_year IS NOT NULL)
    ORDER BY score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Find location matches (multi-strategy)
CREATE OR REPLACE FUNCTION find_location_matches(
    p_name TEXT,
    p_normalized_address TEXT,
    p_street_name TEXT,
    p_cross_streets TEXT[],
    p_neighborhood TEXT,
    p_borough TEXT,
    p_year_start INTEGER,
    p_year_end INTEGER
)
RETURNS TABLE (
    location_id UUID,
    match_type TEXT,
    match_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    
    -- Exact address match
    SELECT 
        l.id,
        'exact_address'::TEXT,
        0.95::DECIMAL
    FROM locations l
    WHERE l.normalized_address IS NOT NULL
        AND l.normalized_address = p_normalized_address
        AND (p_year_start IS NULL OR l.year_start IS NULL OR 
             (l.year_start <= p_year_end AND l.year_end >= p_year_start))
    
    UNION ALL
    
    -- Street + cross streets
    SELECT 
        l.id,
        'street_intersection'::TEXT,
        0.85::DECIMAL
    FROM locations l
    WHERE l.street_name = p_street_name
        AND l.cross_streets && p_cross_streets
        AND l.borough = p_borough
    
    UNION ALL
    
    -- Name + neighborhood + borough
    SELECT 
        l.id,
        'name_location'::TEXT,
        (0.6 + (similarity(l.name, p_name) * 0.4))::DECIMAL
    FROM locations l
    WHERE similarity(l.name, p_name) > 0.7
        AND l.neighborhood = p_neighborhood
        AND l.borough = p_borough;
END;
$$ LANGUAGE plpgsql;
