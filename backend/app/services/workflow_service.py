"""Complaint status workflow and citizen verification rules.

The lifecycle is a straight line:

    Received -> Under Review -> Funded -> Resolved

with one loop back: a citizen who disputes a claimed fix sends a Resolved
complaint back to Under Review. That loop is the whole point of citizen
verification - without it, "Resolved" is whatever the department says it is,
and the feedback loop the product promises does not close.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.models import Complaint

STATUS_ORDER: list[str] = ["Received", "Under Review", "Funded", "Resolved"]

# Only a Resolved complaint can be reopened, and only back to Under Review -
# reopening to Received would discard the fact that it was already triaged.
REOPEN_TARGET = "Under Review"


class WorkflowError(ValueError):
    """Raised when a requested transition is not permitted."""


def allowed_transitions(current: str) -> list[str]:
    """Statuses reachable from `current`.

    Forward movement may skip stages (a complaint can be funded without a
    separate review step), but backward movement is limited to the reopen path.
    """
    if current not in STATUS_ORDER:
        return list(STATUS_ORDER)

    index = STATUS_ORDER.index(current)
    forward = STATUS_ORDER[index + 1 :]
    if current == "Resolved":
        return [REOPEN_TARGET]
    return forward


def set_status(complaint: Complaint, new_status: str) -> Complaint:
    """Move a complaint to `new_status`, enforcing the workflow rules."""
    if new_status not in STATUS_ORDER:
        raise WorkflowError(
            f"Unknown status '{new_status}'. Valid: {', '.join(STATUS_ORDER)}"
        )

    if new_status == complaint.status:
        raise WorkflowError(f"Complaint is already '{new_status}'")

    permitted = allowed_transitions(complaint.status)
    if new_status not in permitted:
        raise WorkflowError(
            f"Cannot move from '{complaint.status}' to '{new_status}'. "
            f"Allowed from here: {', '.join(permitted) or 'none'}"
        )

    complaint.status = new_status

    # Re-entering the workflow clears any previous verdict: the citizen will be
    # asked again once it is resolved a second time.
    if new_status != "Resolved":
        complaint.citizen_verified = None
        complaint.verified_at = None

    return complaint


def verify(complaint: Complaint, confirmed: bool) -> Complaint:
    """Record the citizen's verdict on a claimed fix.

    Only meaningful once the department says the work is done, so verification
    of anything other than a Resolved complaint is rejected. A disputed fix
    reopens the complaint automatically - that is the loop closing.
    """
    if complaint.status != "Resolved":
        raise WorkflowError(
            f"Only a Resolved complaint can be verified; this one is "
            f"'{complaint.status}'"
        )

    complaint.citizen_verified = confirmed
    complaint.verified_at = datetime.now(timezone.utc)

    if not confirmed:
        complaint.status = REOPEN_TARGET

    return complaint
