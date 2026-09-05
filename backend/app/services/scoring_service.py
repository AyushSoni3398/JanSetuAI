"""Priority scoring: turns complaints + district data into a single 0-100 signal.

The score is a weighted sum of five normalised factors:

    0.30  severity              average severity of complaints in the district
    0.25  volume                how many distinct issues were reported
    0.20  infrastructure deficit how far below full provision the district is
    0.15  population            how many people live there
    0.10  investment gap        how little has already been spent per person

Every factor is min-max normalised ACROSS THE DISTRICT SET before weighting, so
the score answers "which district needs attention most, relative to the others"
rather than pretending to be an absolute measure. That is also why the top
district always scores near 100: the scale is comparative by construction.

Each result carries the per-factor breakdown that produced it, which is what
the M9 "why this area" explanation renders.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Complaint, District

WEIGHTS: dict[str, float] = {
    "severity": 0.30,
    "volume": 0.25,
    "infrastructure_deficit": 0.20,
    "population": 0.15,
    "investment_gap": 0.10,
}

# Human-readable explanation of what each factor measures, surfaced in the API
# so the frontend does not have to hardcode copy.
FACTOR_LABELS: dict[str, str] = {
    "severity": "Average severity of reported complaints",
    "volume": "Number of distinct issues reported",
    "infrastructure_deficit": "Shortfall in existing infrastructure",
    "population": "Population affected by under-provision",
    "investment_gap": "Public investment per person already committed",
}


@dataclass
class Factor:
    name: str
    label: str
    raw_value: float
    normalized: float
    weight: float

    @property
    def contribution(self) -> float:
        """Points this factor adds to the final 0-100 score."""
        return 100.0 * self.weight * self.normalized


@dataclass
class DistrictScore:
    district: District
    complaint_count: int
    duplicate_reports: int
    average_severity: float
    analyzed_count: int
    factors: list[Factor] = field(default_factory=list)
    rank: int = 0

    @property
    def priority_score(self) -> float:
        return round(sum(f.contribution for f in self.factors), 1)

    @property
    def top_factor(self) -> Factor | None:
        """The single largest driver - the headline of the M9 explanation."""
        return max(self.factors, key=lambda f: f.contribution, default=None)


def _normalize(values: list[float]) -> list[float]:
    """Min-max scale to 0..1.

    When every district shares a value the factor carries no comparative
    information, so it is flattened to 0 rather than an arbitrary 0.5 - it
    should not silently push scores up.
    """
    lo, hi = min(values), max(values)
    if hi == lo:
        return [0.0 for _ in values]
    span = hi - lo
    return [(v - lo) / span for v in values]


def _aggregate(db: Session) -> list[tuple[District, int, int, float, int]]:
    """Per-district complaint statistics.

    Volume counts CANONICAL complaints only (duplicate_of IS NULL). Ten reports
    of one pothole are one problem, not ten - counting duplicates as volume
    would let a single loud issue outrank a district with many real ones. The
    duplicate reports are still returned separately as corroboration evidence.
    """
    canonical = (
        select(
            Complaint.district_id.label("did"),
            func.count(Complaint.id).label("n"),
        )
        .where(Complaint.duplicate_of.is_(None))
        .group_by(Complaint.district_id)
        .subquery()
    )
    dupes = (
        select(
            Complaint.district_id.label("did"),
            func.count(Complaint.id).label("n"),
        )
        .where(Complaint.duplicate_of.is_not(None))
        .group_by(Complaint.district_id)
        .subquery()
    )
    severity = (
        select(
            Complaint.district_id.label("did"),
            func.avg(Complaint.severity).label("avg_sev"),
            func.count(Complaint.id).label("n_analyzed"),
        )
        .where(Complaint.severity.is_not(None), Complaint.duplicate_of.is_(None))
        .group_by(Complaint.district_id)
        .subquery()
    )

    stmt = (
        select(
            District,
            func.coalesce(canonical.c.n, 0),
            func.coalesce(dupes.c.n, 0),
            func.coalesce(severity.c.avg_sev, 0.0),
            func.coalesce(severity.c.n_analyzed, 0),
        )
        .outerjoin(canonical, canonical.c.did == District.id)
        .outerjoin(dupes, dupes.c.did == District.id)
        .outerjoin(severity, severity.c.did == District.id)
        .order_by(District.id)
    )
    return list(db.execute(stmt).all())


def compute_scores(db: Session) -> list[DistrictScore]:
    """Score every district and return them ranked, highest priority first."""
    rows = _aggregate(db)
    if not rows:
        return []

    scores = [
        DistrictScore(
            district=d,
            complaint_count=int(n),
            duplicate_reports=int(dupes),
            average_severity=round(float(avg_sev), 2),
            analyzed_count=int(n_analyzed),
        )
        for d, n, dupes, avg_sev, n_analyzed in rows
    ]

    # --- raw factor values, in the same order as `scores` ---
    raw: dict[str, list[float]] = {
        "severity": [s.average_severity for s in scores],
        "volume": [float(s.complaint_count) for s in scores],
        # Higher index = better provision, so the deficit is its complement.
        "infrastructure_deficit": [
            100.0 - s.district.infrastructure_index for s in scores
        ],
        "population": [float(s.district.population) for s in scores],
        # Per capita, not absolute: a large district with a large budget may
        # still be under-funded per person, and absolute rupees would simply
        # rank big districts as well-served. Negated so that LESS money per
        # person normalises to a LARGER gap.
        "investment_gap": [
            -(s.district.current_investment / max(s.district.population, 1) * 1_000_000)
            for s in scores
        ],
    }

    normalized = {name: _normalize(values) for name, values in raw.items()}

    for i, score in enumerate(scores):
        score.factors = [
            Factor(
                name=name,
                label=FACTOR_LABELS[name],
                # Report the investment gap as real rupees-per-person, not the
                # negated sorting value.
                raw_value=round(abs(raw[name][i]), 2),
                normalized=round(normalized[name][i], 4),
                weight=weight,
            )
            for name, weight in WEIGHTS.items()
        ]

    scores.sort(key=lambda s: s.priority_score, reverse=True)
    for rank, score in enumerate(scores, start=1):
        score.rank = rank
    return scores


def compute_score_for(db: Session, district_id: int) -> DistrictScore | None:
    """Score one district, keeping its rank relative to all the others.

    Scoring is comparative, so a single district cannot be scored in isolation -
    the whole set is computed and the requested one picked out.
    """
    for score in compute_scores(db):
        if score.district.id == district_id:
            return score
    return None
