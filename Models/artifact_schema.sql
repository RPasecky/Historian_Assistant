-- Simplified Historian Schema (artifact centric)
-- 4 core entities: Artifact, Person, Location, Event, Milestone

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- ARTIFACTS (metadata only)
-- ============================================================================

CREATE TABLE artifacts (
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
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    birth_year INTEGER,
    death_year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_persons_name ON persons USING gin(name gin_trgm_ops);
CREATE INDEX idx_persons_artifact ON persons(artifact_id);

-- ============================================================================
-- LOCATION
-- ============================================================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    aliases TEXT[],
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geometry GEOMETRY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_name ON locations USING gin(name gin_trgm_ops);
CREATE INDEX idx_locations_artifact ON locations(artifact_id);
CREATE INDEX idx_locations_geometry ON locations USING gist(geometry);

-- ============================================================================
-- CONTEXT SNAPSHOTS
-- ============================================================================

CREATE TABLE context_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    chunk_label TEXT,
    page_range INTEGER[],
    summary TEXT,
    key_persons TEXT[],
    key_locations TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_context_chunks_artifact ON context_chunks(artifact_id);

-- ============================================================================
-- EVENT
-- ============================================================================

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    page_range INTEGER[], -- [start, end]
    context_chunk_id UUID REFERENCES context_chunks(id) ON DELETE SET NULL,
    event_type TEXT,
    event_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_artifact ON events(artifact_id);
CREATE INDEX idx_events_date ON events(event_date);

-- ============================================================================
-- MILESTONE
-- ============================================================================

CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    milestone_type TEXT,
    milestone_date DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_person ON milestones(person_id);
CREATE INDEX idx_milestones_type ON milestones(milestone_type);

-- ============================================================================
-- CROSS-REFERENCES
-- ============================================================================

CREATE TABLE event_participants (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    role TEXT,
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
    matching_signals JSONB,
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

CREATE VIEW canonical_persons AS
SELECT * FROM persons;

CREATE VIEW canonical_locations AS
SELECT * FROM locations;

CREATE VIEW events_full AS
SELECT
    e.*,
    json_agg(DISTINCT p.name) FILTER (WHERE p.id IS NOT NULL) AS person_names,
    json_agg(DISTINCT l.name) FILTER (WHERE l.id IS NOT NULL) AS location_names
FROM events e
LEFT JOIN event_participants ep ON ep.event_id = e.id
LEFT JOIN persons p ON p.id = ep.person_id
LEFT JOIN event_venues ev ON ev.event_id = e.id
LEFT JOIN locations l ON l.id = ev.location_id
GROUP BY e.id;
