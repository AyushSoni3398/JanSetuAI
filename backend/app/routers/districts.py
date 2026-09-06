"""District and priority-score endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import District
from app.schemas import (
    DistrictOut,
    DistrictPriorityOut,
    FactorOut,
    RecommendationOut,
)
from app.services import recommendation_service, scoring_service

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


def _recommendation_out(rec) -> RecommendationOut:
    return RecommendationOut(
        district=DistrictOut.model_validate(rec.district),
        district_rank=rec.district_rank,
        district_score=rec.district_score,
        category=rec.category,
        project=rec.project,
        sector=rec.sector,
        issue_count=rec.issue_count,
        repeat_reports=rec.repeat_reports,
        average_severity=rec.average_severity,
        people_affected=rec.people_affected,
        score=rec.score,
        rationale=rec.rationale,
    )


@router.get("/{district_id}/recommendations", response_model=list[RecommendationOut])
def district_recommendations(district_id: int, db: Session = Depends(get_db)):
    """Projects recommended for one district, most urgent first."""
    if db.get(District, district_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"District {district_id} not found",
        )
    return [
        _recommendation_out(r)
        for r in recommendation_service.recommendations_for(db, district_id)
    ]
