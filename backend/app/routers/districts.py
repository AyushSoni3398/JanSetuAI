"""District and priority-score endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import District
from app.schemas import DistrictOut, DistrictPriorityOut, FactorOut
from app.services import scoring_service

router = APIRouter(prefix="/districts", tags=["districts"])


def _to_out(score: scoring_service.DistrictScore) -> DistrictPriorityOut:
    top = score.top_factor
    return DistrictPriorityOut(
        district=DistrictOut.model_validate(score.district),
        rank=score.rank,
        priority_score=score.priority_score,
        complaint_count=score.complaint_count,
        duplicate_reports=score.duplicate_reports,
        average_severity=score.average_severity,
        analyzed_count=score.analyzed_count,
        top_factor=top.name if top else "none",
        factors=[
            FactorOut(
                name=f.name,
                label=f.label,
                raw_value=f.raw_value,
                normalized=f.normalized,
                weight=f.weight,
                contribution=round(f.contribution, 2),
            )
            for f in score.factors
        ],
    )


@router.get("", response_model=list[DistrictOut])
def list_districts(db: Session = Depends(get_db)):
    """All districts, unscored - for dropdowns and map bootstrapping."""
    return db.execute(select(District).order_by(District.name)).scalars().all()


@router.get("/priority", response_model=list[DistrictPriorityOut])
def district_priorities(
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
):
    """Every district ranked by priority score, highest need first."""
    return [_to_out(s) for s in scoring_service.compute_scores(db)[:limit]]


@router.get("/{district_id}/priority", response_model=DistrictPriorityOut)
def district_priority(district_id: int, db: Session = Depends(get_db)):
    """One district's score with the full factor breakdown behind it."""
    score = scoring_service.compute_score_for(db, district_id)
    if score is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"District {district_id} not found",
        )
    return _to_out(score)
