"""Pydantic request/response schemas.

These are the API contract and are deliberately separate from the ORM models:
the client must not be able to set AI-derived fields, and the response shape
should not change just because a column was added.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ComplaintCreate(BaseModel):
    """What a citizen submits. Only raw, human-supplied facts.

    Every AI-derived field (category, severity, language, ...) is intentionally
    absent - it is filled later by the analysis pass, never by the client.
    """

    text: str = Field(min_length=5, max_length=5000)
    location_text: str | None = Field(default=None, max_length=255)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    district_id: int | None = None


class ComplaintOut(BaseModel):
    """Full complaint as returned by the API. AI fields are null until analyzed."""

    model_config = ConfigDict(from_attributes=True)

    id: int

    # Submitted
    text: str
    location_text: str | None
    latitude: float | None
    longitude: float | None

    # AI-derived (null until the analysis pass runs)
    language: str | None
    translated_text: str | None
    category: str | None
    severity: int | None
    urgency: int | None
    sentiment: str | None
    ai_summary: str | None
    population_affected: int | None

    # Duplicate detection
    duplicate_of: int | None
    duplicate_count: int

    # Fusion + workflow
    district_id: int | None
    status: str
    timestamp: datetime


class DistrictOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    state: str
    latitude: float
    longitude: float
    population: int
    infrastructure_index: float
    current_investment: float


class AnalysisResult(BaseModel):
    """Returned after analysing a single complaint."""

    complaint: ComplaintOut
    provider: str = Field(description="Which analyser produced this: claude or mock")
    duplicate_of: int | None = Field(
        default=None, description="Canonical complaint this was linked to, if any"
    )


class BatchAnalysisResult(BaseModel):
    """Summary of an analyse-pending run."""

    analyzed: int
    duplicates_found: int
    provider: str
    remaining_unanalyzed: int


class FactorOut(BaseModel):
    """One weighted component of a district's priority score."""

    name: str
    label: str
    raw_value: float = Field(description="The measured value before normalisation")
    normalized: float = Field(ge=0, le=1, description="0-1 position within the district set")
    weight: float
    contribution: float = Field(description="Points this factor adds to the 0-100 score")


class DistrictPriorityOut(BaseModel):
    """A district with its priority score and the breakdown behind it."""

    district: DistrictOut
    rank: int
    priority_score: float = Field(ge=0, le=100)

    complaint_count: int = Field(description="Distinct issues, duplicates excluded")
    duplicate_reports: int = Field(description="Repeat reports corroborating those issues")
    average_severity: float
    analyzed_count: int = Field(description="How many complaints have been AI-analysed")

    top_factor: str = Field(description="Name of the largest single driver")
    factors: list[FactorOut]
