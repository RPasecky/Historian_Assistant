import { EnrichedEvent } from "../types";

const API_BASE: string =
  (import.meta as any)?.env?.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function fetchEnrichedEvents(params?: {
  start_year?: number;
  end_year?: number;
}): Promise<EnrichedEvent[]> {
  const url = new URL("/events/enriched", API_BASE);
  if (params?.start_year !== undefined) url.searchParams.set("start_year", String(params.start_year));
  if (params?.end_year !== undefined) url.searchParams.set("end_year", String(params.end_year));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.status}`);
  }
  return res.json();
}


