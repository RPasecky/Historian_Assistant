# NYC Historian - Simplified

4 entities: **Person**, **Location**, **Event**, **Milestone**

## Setup

```bash
pip install pydantic anthropic python-Levenshtein
python artifact_db.py init
```

## Schema

**Person**
- name, aliases, birth_year, death_year
- Dedup on: name similarity + birth/death years

**Location**
- name, normalized_address, street_name, cross_streets, neighborhood, borough
- Dedup on: address OR street+cross streets OR name+neighborhood

**Event**
- description, event_date, page_range
- Links to: persons, locations

**Milestone**
- person_id, milestone_type (birth/death/marriage/immigration/etc), milestone_date
- Links to: locations

## Usage

```bash
# After processing an artifact
python artifact_db.py dump
git add data/historian_dump.sql
git commit -m "Added: [Artifact]"
```

## Files

- `artifact_models.py` - Pydantic schemas
- `artifact_db.py` - SQLite setup (init/dump/stats)
- `artifact_schema.sql` - PostgreSQL version (for later)

## Deduplication

**Person**: Birth/death years act as natural unique IDs when combined with name similarity
**Location**: Multi-strategy matching without requiring coordinates

Run after each book to find duplicates across sources.
