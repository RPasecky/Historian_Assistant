"""
Simplified Pydantic models - 4 core entities only
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, field_validator


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


# ============================================================================
# CORE ENTITIES
# ============================================================================

class Artifact(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    title: str
    author: str
    publication_year: Optional[int] = None
    time_period_start: Optional[int] = None
    time_period_end: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Person(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    name: str
    artifact_id: UUID
    aliases: List[str] = Field(default_factory=list)
    birth_year: Optional[int] = None
    death_year: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Location(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    name: str
    artifact_id: UUID
    aliases: List[str] = Field(default_factory=list)
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ContextChunk(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    artifact_id: UUID
    chunk_label: Optional[str] = None
    page_range: List[int] = Field(default_factory=list)
    summary: Optional[str] = None
    key_persons: List[str] = Field(default_factory=list)
    key_locations: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("page_range")
    @classmethod
    def _validate_page_range(cls, value: List[int]) -> List[int]:
        return _ensure_page_range(value)


class Event(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    description: str
    artifact_id: UUID
    page_range: List[int] = Field(default_factory=list)
    context_chunk_id: Optional[UUID] = None
    event_type: Optional[str] = None
    event_date: date
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("page_range")
    @classmethod
    def _validate_page_range(cls, value: List[int]) -> List[int]:
        return _ensure_page_range(value)


class Milestone(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    person_id: UUID
    artifact_id: UUID
    milestone_type: str
    milestone_date: Optional[date] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# RELATIONSHIPS
# ============================================================================

class EventParticipant(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: UUID
    person_id: UUID
    role: Optional[str] = None


class EventVenue(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: UUID
    location_id: UUID


class MilestonePlace(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    milestone_id: UUID
    location_id: UUID


# ============================================================================
# DEDUPLICATION
# ============================================================================

class EntityMatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    entity_type: str  # "person" or "location"
    entity_id_1: UUID
    entity_id_2: UUID
    similarity_score: Decimal = Field(ge=0, le=1)
    matching_signals: Dict[str, Any] = Field(default_factory=dict)
    status: MatchStatus = MatchStatus.PENDING
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# EXTRACTION OUTPUTS
# ============================================================================

class PersonExtraction(BaseModel):
    """What LLM returns when extracting persons."""

    name: str
    aliases: List[str] = Field(default_factory=list)
    birth_year: Optional[int] = None
    death_year: Optional[int] = None


class LocationExtraction(BaseModel):
    """What LLM returns when extracting locations."""

    name: str = Field(..., description="Name of the location.")
    aliases: List[str] = Field(default_factory=list)
    address: Optional[str] = None
    latitude: float = Field(..., description="Latitude in decimal degrees.")
    longitude: float = Field(..., description="Longitude in decimal degrees.")


class EventExtraction(BaseModel):
    """What LLM returns when extracting events."""

    description: str
    page_range: List[int] = Field(default_factory=list)
    event_type: Optional[str] = None
    context_label: Optional[str] = None
    event_date: Optional[str] = None
    quotes: List[str] = Field(default_factory=list)
    interactions: List[str] = Field(default_factory=list)
    person_names: List[str] = Field(default_factory=list)
    location_names: List[str] = Field(default_factory=list)

    @field_validator("page_range")
    @classmethod
    def _validate_page_range(cls, value: List[int]) -> List[int]:
        return _ensure_page_range(value)


class MilestoneExtraction(BaseModel):
    """What LLM returns when extracting milestones."""

    person_name: str
    milestone_type: str
    milestone_date: Optional[str] = None
    description: Optional[str] = None
    location_name: Optional[str] = None


class ContextChunkExtraction(BaseModel):
    """High-level snapshot for a source chunk."""

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
    """Complete extraction from one source document."""

    artifact: Artifact
    persons: List[PersonExtraction] = Field(default_factory=list)
    locations: List[LocationExtraction] = Field(default_factory=list)
    context_chunks: List[ContextChunkExtraction] = Field(default_factory=list)
    events: List[EventExtraction] = Field(default_factory=list)
    milestones: List[MilestoneExtraction] = Field(default_factory=list)
