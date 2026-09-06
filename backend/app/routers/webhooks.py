"""Inbound messaging-app intake.

WhatsApp is how most Indian citizens already communicate, so the platform
accepts complaints from it rather than requiring a web form. This endpoint
speaks Twilio's WhatsApp webhook contract: a form-encoded POST in, TwiML out.

It is provider shaped but not provider locked - anything that can POST
`Body` and `From` works, which is why it can be exercised with curl and needs
no Twilio account to run or test.

Privacy note: the sender's phone number is deliberately NOT stored. It is used
only to word the reply. A civic platform should not accumulate a database
linking phone numbers to complaints when nothing in the product needs it.
"""

from fastapi import APIRouter, Depends, Form, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Complaint
from app.services import ai_service, duplicate_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

MIN_LENGTH = 5
MAX_LENGTH = 5000


def _twiml(message: str) -> Response:
    """Twilio expects TwiML XML, not JSON."""
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response><Message>{message}</Message></Response>"
    )
    return Response(content=body, media_type="application/xml")


@router.post("/whatsapp")
def whatsapp_inbound(
    db: Session = Depends(get_db),
    Body: str = Form(default=""),
    From: str = Form(default=""),
    ProfileName: str = Form(default=""),
):
    """Accept a complaint sent over WhatsApp and reply with its analysis.

    Field names are capitalised because Twilio sends them that way; renaming
    them would mean the endpoint no longer matches the webhook contract.
    """
    text = Body.strip()
    greeting = f"Namaste {ProfileName.strip()}" if ProfileName.strip() else "Namaste"

    if len(text) < MIN_LENGTH:
        return _twiml(
            f"{greeting}! Send a short description of the problem in your area, "
            "in any language, and we will log it. For example: "
            '"Sadak par bada gaddha hai".'
        )

    complaint = Complaint(text=text[:MAX_LENGTH], source="whatsapp")
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Analysis is best effort: a complaint that could not be classified is
    # still a complaint, and must not be lost because a provider was down.
    try:
        analysis, _provider = ai_service.analyze_text(complaint.text)
        complaint.language = analysis.language
        complaint.translated_text = analysis.translated_text
        complaint.category = analysis.category
        complaint.severity = analysis.severity
        complaint.urgency = analysis.urgency
        complaint.sentiment = analysis.sentiment
        complaint.ai_summary = analysis.summary
        complaint.population_affected = analysis.population_affected
        canonical = duplicate_service.link_duplicate(db, complaint)
        db.commit()
        db.refresh(complaint)
    except Exception:
        canonical = None

    if complaint.category is None:
        return _twiml(
            f"{greeting}! Your report has been logged as #{complaint.id}. "
            "It will be reviewed shortly."
        )

    lines = [
        f"{greeting}! Report #{complaint.id} logged.",
        f"Category: {complaint.category}",
        f"Severity: {complaint.severity}/5",
    ]
    if canonical is not None:
        lines.append(
            f"Others have reported this too (grouped with #{canonical.id}) - "
            "repeat reports help us prioritise it."
        )
    lines.append("Reply STATUS with your report number to check progress.")
    return _twiml("\n".join(lines))


@router.post("/whatsapp/status")
def whatsapp_status(
    db: Session = Depends(get_db),
    Body: str = Form(default=""),
):
    """Look up a report's progress from a message like 'STATUS 42'."""
    digits = "".join(ch for ch in Body if ch.isdigit())
    if not digits:
        return _twiml("Send STATUS followed by your report number, e.g. STATUS 42.")

    complaint = db.get(Complaint, int(digits))
    if complaint is None:
        return _twiml(f"No report found with number {digits}.")

    reply = [f"Report #{complaint.id}: {complaint.status}"]
    if complaint.category:
        reply.append(f"Category: {complaint.category}")
    if complaint.status == "Resolved":
        reply.append("If this is not actually fixed, reply NOT FIXED.")
    return _twiml("\n".join(reply))
