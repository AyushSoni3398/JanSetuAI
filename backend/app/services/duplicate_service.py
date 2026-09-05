"""Near-duplicate detection for complaints.

Deliberately NOT an LLM call. Two reasons: comparing each new complaint against
every existing one would cost N calls per submission, and the signal here is
lexical rather than semantic - the same pothole reported twice shares words.
A token-overlap (Jaccard) score over the same district + category is enough,
runs in milliseconds, and is fully deterministic for the demo.
"""

from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Complaint

# Above this overlap, two complaints in the same district and category are
# treated as the same underlying issue. Tuned on the seeded data: high enough
# that different problems stay separate, low enough to catch rewordings.
SIMILARITY_THRESHOLD = 0.55

_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for",
    "of", "and", "or", "not", "no", "has", "have", "had", "been", "it", "its",
    "this", "that", "there", "here", "our", "we", "us", "from", "by", "with",
    "hai", "hain", "ka", "ki", "ke", "se", "me", "par", "aur", "nahi", "ho",
}


def _tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9ऀ-෿]+", text.lower())
    return {w for w in words if len(w) > 2 and w not in _STOPWORDS}


def similarity(a: str, b: str) -> float:
    """Jaccard overlap of the two token sets. 0.0 = nothing shared, 1.0 = same."""
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def find_duplicate(db: Session, complaint: Complaint) -> Complaint | None:
    """Find the best existing complaint that this one appears to duplicate.

    Only complaints in the same district and category are considered, and only
    canonical ones (a duplicate never becomes the parent of another duplicate,
    which would create chains that break the dashboard's volume counts).
    """
    if complaint.district_id is None or complaint.category is None:
        return None

    stmt = select(Complaint).where(
        Complaint.id != complaint.id,
        Complaint.district_id == complaint.district_id,
        Complaint.category == complaint.category,
        Complaint.duplicate_of.is_(None),
    )
    candidates = db.execute(stmt).scalars().all()

    best: Complaint | None = None
    best_score = 0.0
    for other in candidates:
        score = similarity(complaint.text, other.text)
        if score > best_score:
            best, best_score = other, score

    return best if best_score >= SIMILARITY_THRESHOLD else None


def link_duplicate(db: Session, complaint: Complaint) -> Complaint | None:
    """Mark `complaint` as a duplicate of its best match, if one exists.

    Returns the canonical complaint it was linked to, or None. The caller
    commits - this keeps a batch run to a single transaction.
    """
    canonical = find_duplicate(db, complaint)
    if canonical is None:
        return None

    complaint.duplicate_of = canonical.id
    canonical.duplicate_count = (canonical.duplicate_count or 0) + 1
    return canonical
