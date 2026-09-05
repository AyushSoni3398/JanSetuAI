"""Complaint submission and retrieval endpoints.

Analysis is deferred: POST stores the raw complaint and returns immediately with
every AI field null. Enrichment happens later via the M5 analysis service, so
submission never blocks on (or fails because of) the LLM.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Complaint, District
from app.schemas import ComplaintCreate, ComplaintOut

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(payload: ComplaintCreate, db: Session = Depends(get_db)):
    """Store a citizen complaint. Returns instantly; AI fields stay null."""
    if payload.district_id is not None:
        district = db.get(District, payload.district_id)
        if district is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"District {payload.district_id} not found",
            )

    complaint = Complaint(**payload.model_dump())
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("", response_model=list[ComplaintOut])
def list_complaints(
    db: Session = Depends(get_db),
    status_filter: str | None = Query(default=None, alias="status"),
    category: str | None = None,
    district_id: int | None = None,
    unanalyzed: bool | None = Query(
        default=None,
        description="true returns only complaints the AI pass has not touched yet",
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    """List complaints, newest first, with optional filters."""
    stmt = select(Complaint)

    if status_filter is not None:
        stmt = stmt.where(Complaint.status == status_filter)
    if category is not None:
        stmt = stmt.where(Complaint.category == category)
    if district_id is not None:
        stmt = stmt.where(Complaint.district_id == district_id)
    if unanalyzed is True:
        stmt = stmt.where(Complaint.category.is_(None))
    elif unanalyzed is False:
        stmt = stmt.where(Complaint.category.is_not(None))

    stmt = stmt.order_by(Complaint.timestamp.desc(), Complaint.id.desc())
    stmt = stmt.offset(skip).limit(limit)

    return db.execute(stmt).scalars().all()


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )
    return complaint
