"""Seed the database with synthetic districts and complaints.

Usage (from the backend/ directory, with the venv active):

    python -m app.seed            # seed only if the database is empty
    python -m app.seed --reset    # wipe complaints + districts, then reseed

Most complaints are seeded already-analysed so the dashboard has data to render
immediately. A deliberate slice is left UNANALYSED (all AI fields null) so the
M5 analysis pass has real work to do during the demo.
"""

import argparse
import random
from datetime import datetime, timedelta, timezone

from app.database import Base, SessionLocal, engine
from app.models import Complaint, District
from app.seed_data import CATEGORIES, DISTRICTS, LOCATIONS, STATUSES, TEMPLATES

# Fixed seed: reruns produce the same database, so demo numbers never shift.
RANDOM_SEED = 20260906

# How many complaints each district tier receives. Volume is itself a priority
# signal (0.25 weight in M6), so the tiers must differ here too.
VOLUME_BY_TIER = {
    "underserved": (22, 28),
    "moderate": (10, 15),
    "well_served": (3, 6),
}

# Severity is nudged per tier: underserved areas report worse problems.
# Values are indices into a template list sorted by severity.
SEVERITY_BIAS = {
    "underserved": (3, 5),
    "moderate": (2, 4),
    "well_served": (1, 3),
}

UNANALYSED_FRACTION = 0.10  # ~10% left for the M5 pass to process live


def _pick_template(rng: random.Random, tier: str):
    """Choose a complaint template whose severity fits the district tier."""
    lo, hi = SEVERITY_BIAS[tier]
    candidates = [t for t in TEMPLATES if lo <= t[4] <= hi]
    return rng.choice(candidates or TEMPLATES)


def _status_for(rng: random.Random, tier: str) -> str:
    """Well-served districts have progressed further through the workflow."""
    if tier == "well_served":
        weights = [0.20, 0.20, 0.25, 0.35]
    elif tier == "moderate":
        weights = [0.40, 0.30, 0.20, 0.10]
    else:
        weights = [0.65, 0.25, 0.07, 0.03]
    return rng.choices(STATUSES, weights=weights, k=1)[0]


def seed(reset: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    rng = random.Random(RANDOM_SEED)
    db = SessionLocal()

    try:
        existing = db.query(Complaint).count() + db.query(District).count()
        if existing and not reset:
            print(
                f"Database already contains {existing} rows. "
                "Re-run with --reset to wipe and reseed."
            )
            return

        if reset:
            # Complaints first: they hold FKs to districts (and to each other).
            deleted_c = db.query(Complaint).delete()
            deleted_d = db.query(District).delete()
            db.commit()
            print(f"Reset: removed {deleted_c} complaints, {deleted_d} districts.")

        # --- districts -------------------------------------------------
        districts: list[tuple[District, str]] = []
        for name, state, lat, lon, pop, infra, invest, tier in DISTRICTS:
            d = District(
                name=name,
                state=state,
                latitude=lat,
                longitude=lon,
                population=pop,
                infrastructure_index=infra,
                current_investment=invest,
            )
            db.add(d)
            districts.append((d, tier))
        db.commit()
        for d, _ in districts:
            db.refresh(d)
        print(f"Seeded {len(districts)} districts.")

        # --- complaints ------------------------------------------------
        now = datetime.now(timezone.utc)
        created: list[Complaint] = []

        for district, tier in districts:
            lo, hi = VOLUME_BY_TIER[tier]
            for _ in range(rng.randint(lo, hi)):
                lang, raw, english, category, severity, urgency, sentiment = _pick_template(
                    rng, tier
                )
                analysed = rng.random() > UNANALYSED_FRACTION

                c = Complaint(
                    text=raw,
                    location_text=rng.choice(LOCATIONS),
                    # Jitter around the district centroid so map pins spread out.
                    latitude=district.latitude + rng.uniform(-0.06, 0.06),
                    longitude=district.longitude + rng.uniform(-0.06, 0.06),
                    district_id=district.id,
                    status=_status_for(rng, tier),
                    timestamp=now - timedelta(
                        days=rng.randint(0, 59), hours=rng.randint(0, 23)
                    ),
                )

                if analysed:
                    c.language = lang
                    c.translated_text = english
                    c.category = category
                    c.severity = severity
                    c.urgency = urgency
                    c.sentiment = sentiment
                    c.ai_summary = f"{category} issue reported in {district.name}."
                    c.population_affected = rng.randint(200, 15000)

                db.add(c)
                created.append(c)

        db.commit()
        for c in created:
            db.refresh(c)

        # --- duplicate clusters ---------------------------------------
        # Link a few analysed complaints that share a district+category, so the
        # dashboard has real dedup data before M5's detector exists.
        by_key: dict[tuple[int, str], list[Complaint]] = {}
        for c in created:
            if c.category and c.district_id:
                by_key.setdefault((c.district_id, c.category), []).append(c)

        clusters = 0
        dupes = 0
        for group in by_key.values():
            if len(group) < 3:
                continue
            canonical, *rest = group
            for dup in rest[: rng.randint(1, 3)]:
                dup.duplicate_of = canonical.id
                dupes += 1
            canonical.duplicate_count = sum(
                1 for x in rest if x.duplicate_of == canonical.id
            )
            if canonical.duplicate_count:
                clusters += 1
        db.commit()

        total = len(created)
        unanalysed = sum(1 for c in created if c.category is None)
        print(f"Seeded {total} complaints ({unanalysed} left unanalysed for M5).")
        print(f"Linked {dupes} duplicates across {clusters} clusters.")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the JanSetu database.")
    parser.add_argument(
        "--reset", action="store_true", help="wipe existing rows before seeding"
    )
    args = parser.parse_args()
    seed(reset=args.reset)
