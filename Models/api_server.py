from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .artifact_db import get_connection


app = FastAPI(title="Historian API", version="0.1.0")

# Allow Vite dev server and common localhost ports
app.add_middleware(
    CORSMiddleware,
    # Use permissive regex in dev to avoid origin mismatches across ports/hosts
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe_json_list(value: Optional[str]) -> List[Any]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def _row_to_person(row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "aliases": _safe_json_list(row["aliases"]),
        "book_id": row["artifact_id"],  # frontend expects book_id
        "birth_year": row["birth_year"],
        "death_year": row["death_year"],
        # optional field in frontend schema; we don't have this in DB
        "canonical_id": None,
    }


def _row_to_location(row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "book_id": row["artifact_id"],  # frontend expects book_id
        "normalized_address": row["address"],
        "neighborhood": None,
        "borough": None,
        "latitude": row["latitude"],
        "longitude": row["longitude"],
        # optional WKT
        "geometry": None,
    }


def _extract_year(date_str: Optional[str]) -> Optional[int]:
    if not date_str:
        return None
    # Expecting formats like YYYY or YYYY-MM-DD
    try:
        return int(str(date_str)[:4])
    except Exception:
        return None


@app.get("/healthz")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/events/enriched")
def get_enriched_events(
    start_year: Optional[int] = Query(None),
    end_year: Optional[int] = Query(None),
) -> List[Dict[str, Any]]:
    """
    Returns events enriched with their primary location (if any) and participants.
    Shapes the payload to match the Website's EnrichedEvent/Person/Location interfaces.
    """
    conn = get_connection()
    cur = conn.cursor()

    # Fetch all events; filtering by year will be applied in Python for simplicity
    events = cur.execute(
        """
        SELECT
            id,
            description,
            artifact_id,
            page_range,
            context_chunk_id,
            event_type,
            event_date,
            created_at
        FROM events
        -- SQLite doesn't support NULLS LAST; emulate by sorting NULLs after non-NULLs
        ORDER BY (event_date IS NULL) ASC, event_date ASC, created_at ASC
        """
    ).fetchall()

    enriched: List[Dict[str, Any]] = []
    for ev in events:
        year = _extract_year(ev["event_date"])

        if start_year is not None and (year is None or year < start_year):
            continue
        if end_year is not None and (year is None or year > end_year):
            continue

        # Get first (primary) venue if present
        venue_row = cur.execute(
            """
            SELECT l.*
            FROM event_venues ev
            JOIN locations l ON l.id = ev.location_id
            WHERE ev.event_id = ?
            LIMIT 1
            """,
            (ev["id"],),
        ).fetchone()
        location = _row_to_location(venue_row) if venue_row else None

        # Get people
        person_rows = cur.execute(
            """
            SELECT p.*
            FROM event_participants ep
            JOIN persons p ON p.id = ep.person_id
            WHERE ep.event_id = ?
            """,
            (ev["id"],),
        ).fetchall()
        people = [_row_to_person(r) for r in person_rows]

        enriched.append(
            {
                "id": ev["id"],
                "description": ev["description"],
                "book_id": ev["artifact_id"],  # frontend expects book_id
                "event_date": ev["event_date"],
                "date_precision": "exact" if ev["event_date"] else "unknown",
                "year": year if year is not None else 0,
                "location": location,
                "people": people,
            }
        )

    conn.close()
    return enriched


# For local dev: uvicorn Models.api_server:app --reload --port 8000
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


