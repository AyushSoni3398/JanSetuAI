"""National project recommendations.

The district ranking says where need is greatest. This says what to build, and
is the view a national policymaker allocating a budget actually works from.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.districts import _recommendation_out
from app.schemas import RecommendationOut
from app.services import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=list[RecommendationOut])
def national_recommendations(
    db: Session = Depends(get_db),
    sector: str | None = Query(default=None, description="Filter to one sector"),
    limit: int = Query(default=20, ge=1, le=200),
):
    """Recommended projects across every district, highest priority first."""
    results = recommendation_service.compute_recommendations(db)
    if sector:
        results = [r for r in results if r.sector.lower() == sector.lower()]
    return [_recommendation_out(r) for r in results[:limit]]
