# Historian_Assistant
Research assistant for parsing large corpuses of text.

## Background

Historian Assistant ingests literary artifacts (books, essays, notes), runs extraction pipelines to pull out people/locations/events, and serves a curated knowledge graph via the `Models/` API plus a Leaflet-powered website in `Website/`. The workflow is:

1. Process an artifact to produce `LocationExtraction`, `PersonExtraction`, and `EventExtraction` payloads.
2. Review/dedupe those extractions into canonical `Location`, `Person`, `Event`, and `Milestone` rows.
3. Serve enriched events through `Models/api_server.py`, which the website consumes to drive the map, timeline, and network views.

## Running the App

1. Start the API server from the project root:
   ```bash
   uv run python -m Models.api_server
   ```
2. In another terminal, start the website from the `Website/` directory (install dependencies first if needed):
   ```bash
   cd Website
   npm run dev
   ```

## Location Data Cheat Sheet

- **LocationExtraction** (`Models/artifact_models.py`) is the raw payload we get back from the LLM when we parse a book. Treat it like a sketch: helpful for review, but it is neither deduplicated nor guaranteed to have geometry.
- **Location** is the curated record we persist once we’ve merged extractions, filled in coordinates, and hooked it to an `artifact_id`. This is what events and milestones reference, so it stays stable across sessions.
- **Website Map** renders the canonical `Location` attached to each enriched event (see `Website/types.ts`). If you surface the extraction objects instead, you’ll get duplicate pins, missing lat/lngs, and no guarantee the rest of the UI can link back to the entity.

When in doubt, map with the finalized `Location` rows and treat `LocationExtraction` as an intermediate review step.

## Repo Diagram

```
Historian_Assistant/
├── Models/                 # Extraction schemas, SQLite helpers, API server
│   ├── artifact_models.py  # Pydantic models for canonical + extraction entities
│   ├── api_server.py       # FastAPI service feeding the website
│   └── ...                 # DB artifacts, schema, notebooks
├── Website/                # Vite + React frontend (Leaflet map, d3 network, timeline)
│   ├── components/         # MapView, NetworkGraph, Timeline
│   ├── services/api.ts     # Fetch enriched events
│   └── ...                 # Tailwind config, entry TSX, build outputs
├── notebooks/              # Exploratory data summaries and QA notebooks
├── Library/                # Supporting scripts and helpers
└── README.md               # You are here
```
