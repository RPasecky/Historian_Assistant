import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

// Enums from Schema
export enum Precision {
    EXACT = "exact",
    MONTH = "month",
    YEAR = "year",
    CIRCA = "circa",
    UNKNOWN = "unknown"
}

export enum MilestoneType {
    BIRTH = "birth",
    DEATH = "death",
    MARRIAGE = "marriage",
    IMMIGRATION = "immigration",
    CAREER_CHANGE = "career_change",
    OTHER = "other"
}

// Core Entities
export interface Book {
    id: string;
    title: string;
    author: string;
    publication_year?: number;
}

export interface Person {
    id: string;
    name: string;
    aliases: string[];
    book_id: string;
    birth_year?: number;
    death_year?: number;
    canonical_id?: string;
}

export interface Location {
    id: string;
    name: string;
    book_id: string;
    normalized_address?: string;
    neighborhood?: string;
    borough?: string;
    // Integrating geometry as lat/lng for frontend simplicity
    latitude?: number; 
    longitude?: number;
    geometry?: string; // WKT
}

export interface Event {
    id: string;
    description: string;
    book_id: string;
    event_date?: string; // ISO Date string YYYY-MM-DD
    date_precision?: Precision;
    year: number; // Helper for filtering
}

// Relationships
export interface EventPerson {
    event_id: string;
    person_id: string;
    role?: string;
}

export interface EventLocation {
    event_id: string;
    location_id: string;
}

// Frontend Views
export enum TabView {
  MAP = 'MAP',
  TIMELINE = 'TIMELINE',
  NETWORK = 'NETWORK'
}

// Denormalized View for Components
export interface EnrichedEvent extends Event {
    location?: Location;
    people: Person[];
}

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  group: number;
  radius: number;
  label: string;
  type: 'PERSON' | 'LOCATION' | 'EVENT';
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  type: 'PARTICIPATED' | 'LOCATED_AT';
}
