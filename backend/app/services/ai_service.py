"""Single-call AI analysis for citizen complaints.

One request does language detection + translation + classification and returns
structured JSON. Two interchangeable backends sit behind `analyze_text`:

  MockAnalyzer   - deterministic, keyword-driven, no network, no cost
  ClaudeAnalyzer - one `messages.parse` call against the Claude API

Selection is automatic: the real analyser runs only when ANTHROPIC_API_KEY is
set, and ANY failure inside it (missing SDK, network, bad key, rate limit,
malformed output) falls back to the mock rather than raising. The demo must
never die because the model is unreachable.
"""

from __future__ import annotations

import logging
import re

from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

CATEGORIES = [
    "Roads", "Water Supply", "Sanitation", "Electricity",
    "Public Transport", "Healthcare", "Drainage", "Street Lighting", "Other",
]


class ComplaintAnalysis(BaseModel):
    """The structured result of one analysis call. Shared by both backends."""

    language: str = Field(description="ISO 639-1 code of the original text, e.g. hi, mr, ta, bn, en")
    translated_text: str = Field(description="Faithful English translation of the complaint")
    category: str = Field(description="One of: " + ", ".join(CATEGORIES))
    severity: int = Field(ge=1, le=5, description="1 = trivial, 5 = life-threatening or widespread")
    urgency: int = Field(ge=1, le=5, description="1 = can wait months, 5 = needs action now")
    sentiment: str = Field(description="One of: angry, frustrated, concerned, neutral, positive")
    summary: str = Field(description="One-line neutral summary for a policymaker")
    population_affected: int = Field(ge=0, description="Rough estimate of people affected")


# --------------------------------------------------------------------------
# Mock analyser
# --------------------------------------------------------------------------

# Script detection.
#
# The DANDA (U+0964) and DOUBLE DANDA (U+0965) are deliberately excluded from
# the Devanagari range: they are the sentence terminator for Bengali, Marathi,
# Nepali and most Indic scripts, but Unicode files them in the Devanagari
# block. Including them made a single full stop at the end of a Bengali
# sentence outweigh every Bengali letter in it.
_SCRIPT_RANGES = [
    ("hi", 0x0900, 0x0963),   # Devanagari, below the danda
    ("hi", 0x0966, 0x097F),   # Devanagari, above the danda
    ("bn", 0x0980, 0x09FF),
    ("gu", 0x0A80, 0x0AFF),
    ("ta", 0x0B80, 0x0BFF),
    ("te", 0x0C00, 0x0C7F),
]

# Devanagari carries both Hindi and Marathi, so script alone cannot separate
# them - only function words can. These are chosen to be unambiguous: the
# Marathi forms use different vowel signs from their Hindi counterparts
# (आहे vs है, नाही vs नहीं), so they cannot match inside each other.
_DEVANAGARI_MARKERS = {
    "mr": ["आहे", "आहेत", "नाही", "नाहीत", "झाले", "पडले", "अशक्य",
           "चालवणे", "मध्ये", "सुधारली", "गुणवत्ता", "यांनी"],
    "hi": ["है", "हैं", "नहीं", "रहा", "रहे", "हुआ", "गया", "किया", "रही"],
}

# Romanised cues, since many complaints are transliterated into Latin script
# rather than written in the native one.
_ROMAN_HINTS = {
    "mr": ["aahe", "aahet", "rastyavar", "jhale", "purvatha", "sudharli", "khadde", "panyachi"],
    "hi": ["hai", "nahi", "raha", "rahe", "paani", "sadak", "gaddha", "mohalla", "kharab"],
    "ta": ["ullathu", "illai", "engal", "mudiya", "varugirathu", "arugil", "aatoo"],
    "bn": ["amader", "hocche", "thake", "nei", "onek", "protidin", "elakay"],
}

# Category cues in every script we accept. Native-script terms sit alongside
# the romanised ones in the same list: matching is plain substring search, and
# str.lower() is a no-op for Indic scripts, so one lookup covers both.
_CATEGORY_KEYWORDS = {
    "Roads": [
        "road", "pothole", "gaddha", "khadde", "sadak", "rasta", "rastyavar", "highway",
        "सड़क", "गड्ढा", "गड्ढे", "रास्ता", "रस्ता", "रस्त्यावर", "खड्डे",
        "রাস্তা", "গর্ত", "சாலை", "குழி",
    ],
    "Water Supply": [
        "water", "paani", "nal ", "tap", "panyachi", "jol", "muddy", "borewell",
        "पानी", "पाणी", "पाण्याची", "नल", "जल", "नळ",
        "পানি", "জল", "নল", "தண்ணீர்", "குழாய்",
    ],
    "Sanitation": [
        "garbage", "kuppai", "waste", "kachra", "toilet", "sanitation", "rubbish", "dump",
        "कचरा", "कूड़ा", "गंदगी", "सफाई", "स्वच्छता",
        "আবর্জনা", "নোংরা", "ময়লা", "குப்பை", "கழிவு",
    ],
    "Electricity": [
        "electric", "power", "vij", "bijli", "bidyut", "outage", "transformer",
        "बिजली", "विद्युत", "वीज", "करंट",
        "বিদ্যুৎ", "কারেন্ট", "மின்சாரம்", "மின்",
    ],
    "Public Transport": [
        "bus", "transport", "auto", "vasathi", "route", "pergundu", "train",
        "बस", "परिवहन", "बससेवा", "रेल",
        "বাস", "পরিবহন", "பேருந்து", "போக்குவரத்து",
    ],
    "Healthcare": [
        "hospital", "doctor", "daktar", "health centre", "health center", "maruthuva", "clinic",
        "अस्पताल", "डॉक्टर", "स्वास्थ्य", "दवाखाना", "रुग्णालय",
        "হাসপাতাল", "ডাক্তার", "চিকিৎসক", "மருத்துவமனை", "மருத்துவர்",
    ],
    "Drainage": [
        "drain", "naali", "sewage", "sewer", "waterlog", "flood", "overflow",
        "नाली", "नाला", "गटार", "सीवर", "जलभराव",
        "নর্দমা", "ড্রেন", "கழிவுநீர்", "வடிகால்",
    ],
    "Street Lighting": [
        "street light", "streetlight", "lamp", "pole", "dark",
        "स्ट्रीट लाइट", "बत्ती", "रोशनी", "दिवा", "पथदिवा", "अंधेरा",
        "বাতি", "আলো", "விளக்கு", "தெருவிளக்கு",
    ],
}

_SEVERITY_HIGH = [
    "accident", "death", "died", "danger", "khatarnak", "disease", "bimari",
    "emergency", "collapse", "doctor", "daktar", "sewage", "gnda paani",
    "दुर्घटना", "अपघात", "खतरनाक", "धोकादायक", "बीमारी", "बिमारी", "आजार", "मौत", "गंभीर",
    "দুর্ঘটনা", "বিপজ্জনক", "রোগ", "মৃত্যু", "গুরুতর",
    "விபத்து", "ஆபத்து", "நோய்",
]

# A problem type carries inherent severity before any keyword is read: no
# doctor is worse than a flickering lamp even when both are worded calmly.
# This is the single biggest accuracy win in the mock - keyword counting alone
# scored every category the same.
_BASE_SEVERITY = {
    "Healthcare": 4,
    "Water Supply": 4,
    "Drainage": 4,
    "Roads": 3,
    "Electricity": 3,
    "Sanitation": 3,
    "Public Transport": 3,
    "Street Lighting": 2,
    "Other": 3,
}
_SEVERITY_MED = [
    "weeks", "hafte", "broken", "kharab", "not working", "irregular", "delay",
    "हफ्ते", "महीने", "खराब", "बंद", "आठवडे", "महिने", "नियमित नाही",
    "সপ্তাহ", "মাস", "খারাপ", "வாரம்", "மாதம்", "பழுது",
]
_POSITIVE = [
    "good condition", "repaired", "improved", "sudharli", "resolved", "no longer an issue",
    "ठीक हो गया", "सुधार", "सुधारली", "दुरुस्त", "अच्छी स्थिति",
    "ভালো হয়েছে", "সংস্কার", "சரிசெய்யப்பட்டது",
]
_MILD = [
    "slightly", "occasionally", "mostly works", "could be", "minor", "thoda",
    "थोड़ा", "कभी-कभी", "थोडे", "किरकोळ",
    "সামান্য", "মাঝে মাঝে", "சிறிது",
]


def _script_counts(text: str) -> dict[str, int]:
    """How many characters of the text belong to each supported script."""
    counts: dict[str, int] = {}
    for ch in text:
        cp = ord(ch)
        for code, lo, hi in _SCRIPT_RANGES:
            if lo <= cp <= hi:
                counts[code] = counts.get(code, 0) + 1
                break
    return counts


def _detect_language(text: str) -> str:
    """Identify the language of a complaint in native OR romanised script.

    Native script wins when present, decided by which script contributes the
    most characters rather than by first match - that keeps a stray shared
    character (or a quoted English word) from flipping the result.
    """
    counts = _script_counts(text)
    if counts:
        script = max(counts, key=lambda code: counts[code])
        if script == "hi":
            mr = sum(text.count(word) for word in _DEVANAGARI_MARKERS["mr"])
            hi = sum(text.count(word) for word in _DEVANAGARI_MARKERS["hi"])
            # Ties go to Hindi: it is the more common submission language.
            return "mr" if mr > hi else "hi"
        return script

    lowered = " " + text.lower() + " "
    scores = {
        lang: sum(1 for hint in hints if hint in lowered)
        for lang, hints in _ROMAN_HINTS.items()
    }
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "en"


def _detect_category(text: str) -> str:
    """Most keyword hits wins; ties go to whichever cue appears first."""
    lowered = text.lower()
    ranked = []
    for cat, kws in _CATEGORY_KEYWORDS.items():
        hits = [lowered.find(kw) for kw in kws if kw in lowered]
        if hits:
            ranked.append((len(hits), -min(hits), cat))
    if not ranked:
        return "Other"
    return max(ranked)[2]


def _score_severity(text: str, category: str) -> tuple[int, int, str]:
    """Return (severity, urgency, sentiment).

    Severity starts from the category baseline and is raised by alarming
    wording, rather than being derived from keywords alone.
    """
    lowered = text.lower()

    # Hedged wording is checked first: "could be better" is a mild complaint,
    # not praise, and would otherwise be scored as positive.
    if any(m in lowered for m in _MILD):
        return 2, 2, "neutral"
    if any(p in lowered for p in _POSITIVE):
        return 1, 1, "positive"

    high = sum(1 for k in _SEVERITY_HIGH if k in lowered)
    med = sum(1 for k in _SEVERITY_MED if k in lowered)

    severity = _BASE_SEVERITY.get(category, 3)
    if high:
        severity += 1
    if high >= 2:
        severity += 1
    if med:
        severity += 1
    severity = max(1, min(5, severity))

    if high >= 2:
        sentiment = "angry"
    elif high or med:
        sentiment = "frustrated"
    else:
        sentiment = "concerned"

    # Urgency tracks severity but lags it: a severe problem is not always
    # something that must be fixed this week.
    urgency = severity if high else max(1, severity - 1)
    return severity, urgency, sentiment


class MockAnalyzer:
    """Deterministic keyword analyser. Same input always gives the same output."""

    name = "mock"

    def analyze(self, text: str) -> ComplaintAnalysis:
        language = _detect_language(text)
        category = _detect_category(text)
        severity, urgency, sentiment = _score_severity(text, category)

        # The mock cannot translate; it echoes the original and marks it.
        translated = text if language == "en" else "[auto] " + text

        return ComplaintAnalysis(
            language=language,
            translated_text=translated,
            category=category,
            severity=severity,
            urgency=urgency,
            sentiment=sentiment,
            summary=category + " issue reported (severity " + str(severity) + "/5).",
            population_affected=severity * 800,
        )


# --------------------------------------------------------------------------
# Claude analyser
# --------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You analyse citizen infrastructure complaints from India for a government "
    "dashboard. Complaints arrive in Hindi, Marathi, Tamil, Bengali, English or "
    "other Indian languages, often transliterated into Latin script.\n\n"
    "In a single pass: identify the language, translate faithfully into English, "
    "and classify the complaint.\n\n"
    "Rules:\n"
    "- category must be exactly one of: " + ", ".join(CATEGORIES) + "\n"
    "- severity 1-5 reflects harm: 5 = danger to life, or a whole locality "
    "without an essential service; 1 = cosmetic or already resolved\n"
    "- urgency 1-5 reflects how soon action is needed, which is not the same as "
    "severity: a slow-growing problem can be severe but not urgent\n"
    "- sentiment is one of: angry, frustrated, concerned, neutral, positive\n"
    "- population_affected is a rough order-of-magnitude estimate\n"
    "- do not invent details that are not in the complaint"
)


class ClaudeAnalyzer:
    """One structured `messages.parse` call per complaint."""

    name = "claude"

    def __init__(self) -> None:
        import anthropic  # imported lazily so the mock path needs no SDK

        self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def analyze(self, text: str) -> ComplaintAnalysis:
        response = self._client.messages.parse(
            model=settings.AI_MODEL,
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": "Complaint:\n" + text}],
            output_format=ComplaintAnalysis,
        )
        return response.parsed_output


# --------------------------------------------------------------------------
# Public interface
# --------------------------------------------------------------------------

_mock = MockAnalyzer()
_claude: ClaudeAnalyzer | None = None


def _get_claude() -> ClaudeAnalyzer | None:
    global _claude
    if not settings.ai_enabled:
        return None
    if _claude is None:
        try:
            _claude = ClaudeAnalyzer()
        except Exception as exc:  # missing SDK, bad key format, ...
            logger.warning("Claude analyser unavailable, using mock: %s", exc)
            return None
    return _claude


def analyze_text(text: str) -> tuple[ComplaintAnalysis, str]:
    """Analyse one complaint.

    Returns (analysis, provider_name). Never raises: if the real provider fails
    for any reason the mock result is returned instead.
    """
    claude = _get_claude()
    if claude is not None:
        try:
            return claude.analyze(text), claude.name
        except Exception as exc:
            logger.warning("Claude analysis failed, falling back to mock: %s", exc)
            return _mock.analyze(text), "mock (claude failed)"
    return _mock.analyze(text), _mock.name


def active_provider() -> str:
    """Which backend would be used right now - surfaced on /health."""
    return "claude" if settings.ai_enabled else "mock"
