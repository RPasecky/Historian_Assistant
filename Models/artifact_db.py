"""
Simplified SQLite database - artifact-centric entities
"""

import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "historian.db"
DB_PATH.parent.mkdir(exist_ok=True)


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()

    schema = """
    CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        publication_year INTEGER,
        time_period_start INTEGER,
        time_period_end INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        aliases TEXT, -- JSON array
        artifact_id TEXT REFERENCES artifacts(id) ON DELETE CASCADE,
        birth_year INTEGER,
        death_year INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name);

    CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        aliases TEXT, -- JSON array
        artifact_id TEXT REFERENCES artifacts(id) ON DELETE CASCADE,
        address TEXT,
        latitude REAL,
        longitude REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
    CREATE INDEX IF NOT EXISTS idx_locations_artifact ON locations(artifact_id);

    CREATE TABLE IF NOT EXISTS context_chunks (
        id TEXT PRIMARY KEY,
        artifact_id TEXT REFERENCES artifacts(id) ON DELETE CASCADE,
        chunk_label TEXT,
        page_range TEXT,
        summary TEXT,
        key_persons TEXT,
        key_locations TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_context_chunks_artifact ON context_chunks(artifact_id);

    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        artifact_id TEXT REFERENCES artifacts(id) ON DELETE CASCADE,
        page_range TEXT, -- JSON [start, end]
        context_chunk_id TEXT REFERENCES context_chunks(id) ON DELETE SET NULL,
        event_type TEXT,
        event_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_events_artifact ON events(artifact_id);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

    CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        person_id TEXT REFERENCES persons(id) ON DELETE CASCADE,
        artifact_id TEXT REFERENCES artifacts(id) ON DELETE CASCADE,
        milestone_type TEXT,
        milestone_date TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_milestones_person ON milestones(person_id);

    CREATE TABLE IF NOT EXISTS event_participants (
        event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
        person_id TEXT REFERENCES persons(id) ON DELETE CASCADE,
        role TEXT,
        PRIMARY KEY (event_id, person_id)
    );

    CREATE TABLE IF NOT EXISTS event_venues (
        event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
        location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
        PRIMARY KEY (event_id, location_id)
    );

    CREATE TABLE IF NOT EXISTS milestone_places (
        milestone_id TEXT REFERENCES milestones(id) ON DELETE CASCADE,
        location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
        PRIMARY KEY (milestone_id, location_id)
    );

    CREATE TABLE IF NOT EXISTS entity_matches (
        id TEXT PRIMARY KEY,
        entity_type TEXT CHECK (entity_type IN ('person', 'location')),
        entity_id_1 TEXT NOT NULL,
        entity_id_2 TEXT NOT NULL,
        similarity_score REAL CHECK (similarity_score BETWEEN 0 AND 1),
        matching_signals TEXT, -- JSON
        status TEXT CHECK (status IN ('pending', 'merged', 'rejected')) DEFAULT 'pending',
        reviewed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        CHECK (entity_id_1 < entity_id_2)
    );
    CREATE INDEX IF NOT EXISTS idx_matches_status ON entity_matches(status);
    """

    conn.executescript(schema)
    conn.commit()
    conn.close()
    print(f"Database initialized: {DB_PATH}")


def dump_sql():
    """Export as SQL for git"""
    dump_path = DB_PATH.parent / "historian_dump.sql"
    conn = get_connection()
    with open(dump_path, 'w') as f:
        for line in conn.iterdump():
            f.write(f'{line}\n')
    conn.close()
    print(f"Dumped to: {dump_path}")


def stats():
    """Show row counts"""
    conn = get_connection()
    tables = ['artifacts', 'persons', 'locations', 'context_chunks', 'events', 'milestones', 'entity_matches']
    stats = {}
    for table in tables:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        stats[table] = count
    conn.close()
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "init"

    if cmd == "init":
        init_db()
    elif cmd == "dump":
        dump_sql()
    elif cmd == "stats":
        stats()
    else:
        print("Commands: init, dump, stats")
