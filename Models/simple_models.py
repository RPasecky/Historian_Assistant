"""
Simplified Pydantic models - 4 core entities only
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, field_validator


class Precision(str, Enum):
    EXACT = "exact"
    MONTH = "month"
    YEAR = "year"
    CIRCA = "circa"
    UNKNOWN = "unknown"


class MilestoneType(str, Enum):
    BIRTH = "birth"
    DEATH = "death"
    MARRIAGE = "marriage"
    IMMIGRATION = "immigration"
    CAREER_CHANGE = "career_change"
    OTHER = "other"


class MatchStatus(str, Enum):
    PENDING = "pending"
    MERGED = "merged"
    REJECTED = "rejected"


def _ensure_page_range(value: List[int]) -> List[int]:
    if not value:
        return value
    if len(value) != 2 or value[0] > value[1]:
        raise ValueError("page_range must be [start, end] with start <= end")
    return value


class ORMModel(BaseModel):
    """Shared Pydantic config for ORM-style models."""
    model_config = ConfigDict(from_attributes=True)


class TimestampedORMModel(ORMModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IdentifiedModel(TimestampedORMModel):
    id: UUID = Field(default_factory=uuid4)


# ============================================================================
# CORE ENTITIES
# ============================================================================

class Book(IdentifiedModel):
    title: str
    author: str
    publication_year: Optional[int] = None
    time_period_start: Optional[int] = None
    time_period_end: Optional[int] = None


class Person(IdentifiedModel):
    name: str
    aliases: List[str] = Field(default_factory=list)
    book_id: UUID

    # For deduplication
    birth_year: Optional[int] = None
    death_year: Optional[int] = None

    canonical_id: Optional[UUID] = None
    external_ids: Dict[str, str] = Field(default_factory=dict)


class Location(IdentifiedModel):
    name: str
    aliases: List[str] = Field(default_factory=list)
    book_id: UUID

    # For deduplication (all optional)
    normalized_address: Optional[str] = None
    street_name: Optional[str] = None
    cross_streets: List[str] = Field(default_factory=list)
    neighborhood: Optional[str] = None
    borough: Optional[str] = None

    year_start: Optional[int] = None
    year_end: Optional[int] = None

    geometry: Optional[str] = None  # WKT or GeoJSON

    canonical_id: Optional[UUID] = None
    external_ids: Dict[str, str] = Field(default_factory=dict)


class ContextChunk(IdentifiedModel):
    book_id: UUID
    chunk_label: Optional[str] = None  # e.g., chapter title or page span label
    page_range: List[int] = Field(default_factory=list)  # [start, end]
    summary: Optional[str] = None
    key_persons: List[str] = Field(default_factory=list)
    key_locations: List[str] = Field(default_factory=list)

    @field_validator("page_range")
    @classmethod
    def _validate_page_range(cls, value: List[int]) -> List[int]:
        return _ensure_page_range(value)


class Event(IdentifiedModel):
    description: str
    book_id: UUID
    page_range: List[int] = Field(default_factory=list)  # [start, end]
    context_chunk_id: Optional[UUID] = None
    event_type: Optional[str] = None

    event_date: Optional[date] = None
    date_precision: Optional[Precision] = None

    @field_validator("page_range")
    @classmethod
    def _validate_page_range(cls, value: List[int]) -> List[int]:
        return _ensure_page_range(value)


class Milestone(IdentifiedModel):
    person_id: UUID
    book_id: UUID

    milestone_type: MilestoneType
    milestone_date: Optional[date] = None
    date_precision: Optional[Precision] = None
    description: Optional[str] = None


# ============================================================================
# RELATIONSHIPS
# ============================================================================

class EventParticipant(ORMModel):
    event_id: UUID
    person_id: UUID
    role: Optional[str] = None


class EventVenue(ORMModel):
    event_id: UUID
    location_id: UUID


class MilestonePlace(ORMModel):
    milestone_id: UUID
    location_id: UUID


# ============================================================================
# DEDUPLICATION
# ============================================================================

class EntityMatch(IdentifiedModel):
    entity_type: str  # "person" or "location"
    entity_id_1: UUID
    entity_id_2: UUID

    similarity_score: Decimal = Field(ge=0, le=1)
    matching_signals: Dict[str, Any] = Field(default_factory=dict)

    status: MatchStatus = MatchStatus.PENDING
    reviewed_at: Optional[datetime] = None


# ============================================================================
# EXTRACTION OUTPUTS (for LLM responses)
# ============================================================================

class PersonExtraction(BaseModel):
    """What LLM returns when extracting persons"""
    name: str
    aliases: List[str] = Field(default_factory=list)
    birth_year: Optional[int] = None
    death_year: Optional[int] = None


class LocationExtraction(BaseModel):
    """What LLM returns when extracting locations"""
    name: str
    aliases: List[str] = Field(default_factory=list)

    normalized_address: Optional[str] = None
    street_name: Optional[str] = None
    cross_streets: List[str] = Field(default_factory=list)
    neighborhood: Optional[str] = None
    borough: Optional[str] = None

    year_start: Optional[int] = None
    year_end: Optional[int] = None


class EventExtraction(BaseModel):
    """What LLM returns when extracting events"""
    description: str
    page_range: List[int] = Field(default_factory=list)
    event_type: Optional[str] = None
    context_label: Optional[str] = None

    event_date: Optional[str] = None  # Will parse to date
    date_precision: Optional[Precision] = None
    quotes: List[str] = Field(default_factory=list)
    interactions: List[str] = Field(default_factory=list)

    # References (by name, will resolve to IDs)
    person_names: List[str] = Field(default_factory=list)
    location_names: List[str] = Field(default_factory=list)

    @field_validator("page_range")
    @classmethod
    def _validate_page_range(cls, value: List[int]) -> List[int]:
        return _ensure_page_range(value)


class MilestoneExtraction(BaseModel):
    """What LLM returns when extracting milestones"""
    person_name: str  # Will resolve to person_id
    milestone_type: MilestoneType
    milestone_date: Optional[str] = None
    date_precision: Optional[Precision] = None
    description: Optional[str] = None
    location_name: Optional[str] = None


class ContextChunkExtraction(BaseModel):
    """High-level snapshot for a source chunk"""
    chunk_label: Optional[str] = None
    page_range: List[int] = Field(default_factory=list)
    summary: Optional[str] = None
    key_persons: List[str] = Field(default_factory=list)
    key_locations: List[str] = Field(default_factory=list)

    @field_validator("page_range")
    @classmethod
    def _validate_page_range(cls, value: List[int]) -> List[int]:
        return _ensure_page_range(value)


class DocumentExtraction(BaseModel):
    """Complete extraction from one source document"""
    book: Book
    persons: List[PersonExtraction] = Field(default_factory=list)
    locations: List[LocationExtraction] = Field(default_factory=list)
    context_chunks: List[ContextChunkExtraction] = Field(default_factory=list)
    events: List[EventExtraction] = Field(default_factory=list)
    milestones: List[MilestoneExtraction] = Field(default_factory=list)
