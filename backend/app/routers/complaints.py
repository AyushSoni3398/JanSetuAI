"""Complaint submission and retrieval endpoints.

Analysis is deferred: POST stores the raw complaint and returns immediately with
every AI field null. Enrichment happens later via the M5 analysis service, so
submission never blocks on (or fails because of) the LLM.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Complaint, District
from app.schemas import (
    AnalysisResult,
    BatchAnalysisResult,
    ComplaintCreate,
    ComplaintOut,
    StatusUpdate,
    VerificationUpdate,
    WorkflowOut,
)
from app.services import ai_service, duplicate_service, workflow_service

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
    # Raised from 200 so the dashboard can load the whole corpus in one
    # request. A production deployment would paginate instead - at this
    # size one request is simpler and still fast.
    limit: int = Query(default=50, ge=1, le=1000),
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


def _apply_analysis(complaint: Complaint) -> str:
    """Run the AI pass over one complaint and copy the result onto the row."""
    analysis, provider = ai_service.analyze_text(complaint.text)

    complaint.language = analysis.language
    complaint.translated_text = analysis.translated_text
    complaint.category = analysis.category
    complaint.severity = analysis.severity
    complaint.urgency = analysis.urgency
    complaint.sentiment = analysis.sentiment
    complaint.ai_summary = analysis.summary
    complaint.population_affected = analysis.population_affected
    return provider


@router.post("/{complaint_id}/analyze", response_model=AnalysisResult)
def analyze_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Run language detection + translation + classification on one complaint."""
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )

    provider = _apply_analysis(complaint)
    canonical = duplicate_service.link_duplicate(db, complaint)
    db.commit()
    db.refresh(complaint)

    return AnalysisResult(
        complaint=ComplaintOut.model_validate(complaint),
        provider=provider,
        duplicate_of=canonical.id if canonical else None,
    )


@router.post("/analyze-pending", response_model=BatchAnalysisResult)
def analyze_pending(
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=200),
):
    """Drain the unanalysed queue: analyse up to `limit` complaints in one pass."""
    pending = (
        db.execute(
            select(Complaint)
            .where(Complaint.category.is_(None))
            .order_by(Complaint.id)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    provider = ai_service.active_provider()
    duplicates = 0
    for complaint in pending:
        provider = _apply_analysis(complaint)
        if duplicate_service.link_duplicate(db, complaint) is not None:
            duplicates += 1
    db.commit()

    remaining = db.execute(
        select(func.count()).select_from(Complaint).where(Complaint.category.is_(None))
    ).scalar_one()

    return BatchAnalysisResult(
        analyzed=len(pending),
        duplicates_found=duplicates,
        provider=provider,
        remaining_unanalyzed=remaining,
    )


def _workflow_out(complaint: Complaint) -> WorkflowOut:
    return WorkflowOut(
        complaint=ComplaintOut.model_validate(complaint),
        allowed_transitions=workflow_service.allowed_transitions(complaint.status),
    )


def _get_or_404(db: Session, complaint_id: int) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )
    return complaint


@router.patch("/{complaint_id}/status", response_model=WorkflowOut)
def update_status(
    complaint_id: int, payload: StatusUpdate, db: Session = Depends(get_db)
):
    """Move a complaint along the workflow (policymaker action)."""
    complaint = _get_or_404(db, complaint_id)
    try:
        workflow_service.set_status(complaint, payload.status)
    except workflow_service.WorkflowError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc

    db.commit()
    db.refresh(complaint)
    return _workflow_out(complaint)


@router.post("/{complaint_id}/verify", response_model=WorkflowOut)
def verify_complaint(
    complaint_id: int, payload: VerificationUpdate, db: Session = Depends(get_db)
):
    """Citizen confirms or disputes a claimed fix.

    A disputed fix reopens the complaint - this is the loop that stops
    'Resolved' from being purely the department's own word.
    """
    complaint = _get_or_404(db, complaint_id)
    try:
        workflow_service.verify(complaint, payload.confirmed)
    except workflow_service.WorkflowError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc

    db.commit()
    db.refresh(complaint)
    return _workflow_out(complaint)
