"""SQLAlchemy ORM models for JanSetu AI.

Column types are deliberately dialect-neutral (no JSONB, no ARRAY, no PostGIS)
so the SQLite -> Postgres swap stays a DATABASE_URL change.
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class District(Base):
    """A geographic unit that complaints are aggregated into.

    Populated by the M4 seed script from synthetic demographic /
    infrastructure / investment data.
    """

    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(120), nullable=False)

    # District centroid - used to place map markers in M8.
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Fusion inputs for the M6 priority score.
    population: Mapped[int] = mapped_column(Integer, nullable=False)
    # 0-100, higher = better existing infrastructure. Deficit = 100 - index.
    infrastructure_index: Mapped[float] = mapped_column(Float, nullable=False)
    # Public money already allocated, in crore.
    current_investment: Mapped[float] = mapped_column(Float, nullable=False)

    complaints: Mapped[list["Complaint"]] = relationship(back_populates="district")

    def __repr__(self) -> str:
        return f"<District {self.id} {self.name}, {self.state}>"


class Complaint(Base):
    """A single citizen report, from raw submission through AI enrichment."""

    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # --- Filled at submission time (M3) ---
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # Which channel the complaint arrived through: web, voice or whatsapp.
    # Set by the server, never by the client - a caller must not be able to
    # claim its report came from somewhere it did not.
    source: Mapped[str] = mapped_column(
        String(20), nullable=False, default="web", index=True
    )
    location_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Filled by the AI analysis service (M5); nullable until then ---
    language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    translated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
    severity: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    urgency: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    population_affected: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # --- Duplicate detection (M5) ---
    # Self-referencing: points at the complaint this one duplicates.
    duplicate_of: Mapped[int | None] = mapped_column(
        ForeignKey("complaints.id"), nullable=True
    )
    # Only meaningful on a canonical complaint: how many duplicates point here.
    duplicate_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # --- Fusion + workflow ---
    district_id: Mapped[int | None] = mapped_column(
        ForeignKey("districts.id"), nullable=True, index=True
    )
    # M10 workflow: Received -> Under Review -> Funded -> Resolved
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="Received", index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, index=True
    )

    # --- Citizen verification (M10) ---
    # Tri-state, and the None matters: None = the citizen has not responded yet,
    # True = they confirmed the fix, False = they say it is still broken. A
    # plain boolean would make "not asked" indistinguishable from "disputed".
    citizen_verified: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    district: Mapped["District | None"] = relationship(back_populates="complaints")

    def __repr__(self) -> str:
        return f"<Complaint {self.id} {self.category or 'unclassified'} status={self.status}>"
