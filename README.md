# JanSetu AI

Turns multilingual citizen infrastructure complaints into a ranked, explainable
district priority signal — and closes the loop by letting the citizen verify
whether the fix actually happened.

Accepts complaints in **native script** (देवनागरी, বাংলা, தமிழ்) **and romanised
script** ("Sadak par gaddha hai"), and identifies which language either one is.

Built as a 24-hour hackathon project.

---

## The problem

Citizens report broken roads, dry taps and absent doctors in a dozen languages.
Those reports accumulate as unstructured text, and nobody can answer the
question a policymaker actually needs answered: **where should the next rupee
go?**

Complaint volume alone is a bad proxy — it rewards whichever area complains
loudest, not whichever area is worst off.

## What it does

```
citizen complaint (any language)
        │
        ├─ language detection ─┐
        ├─ translation         ├─ one structured AI call
        └─ classification ─────┘   (category, severity, urgency, sentiment)
        │
        ├─ near-duplicate detection      repeat reports become corroboration,
        │                                 not extra volume
        ▼
  fused with district data                population, infrastructure index,
        │                                 existing investment
        ▼
  priority score 0–100  ──────────────▶  policymaker dashboard
        │                                 map hotspots + ranking
        ▼
  per-factor explanation                 "why this area"
        │
        ▼
  status workflow ───────────────────▶  citizen verifies the fix
  Received → Under Review → Funded → Resolved
                     ▲                        │
                     └──── disputed ──────────┘
```

Two audiences, one deployment: a **citizen side** for reporting and tracking,
and a **policymaker dashboard** for prioritising and acting.

### Pages

| Route | Page |
|---|---|
| `/` | Landing page with live stats and the current top-priority districts |
| `/dashboard` | Policymaker view: map, ranking, category chart, complaint feed |
| `/districts/:id` | District detail: full score breakdown, chart and complaints. Shareable link |
| `/report` | Citizen submission form with voice input and instant analysis |
| `/my-reports` | Citizen tracking and verification of claimed fixes |


---

## Quickstart

**Requires** Python 3.13 and Node 20+. No database server needed — it runs on
SQLite.

```bash
git clone https://github.com/AyushSoni3398/JanSetuAI.git; cd JanSetuAI
```

Run the commands below from the **repository root** unless a `cd` is shown.

### Backend

```bash
python -m venv .venv
```

```bash
.venv\Scripts\Activate.ps1
```

```bash
python -m pip install -r backend/requirements.txt
```

Seed the database with 10 districts and 135 synthetic complaints, then run the
API (both from `backend/`):

```bash
cd backend; python -m app.seed --reset
```

```bash
cd backend; python -m uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs

### Frontend

```bash
cd frontend; npm install
```

```bash
cd frontend; npm run dev
```

Dashboard at http://localhost:5173

---

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | API, database and active AI provider |
| `POST` | `/complaints` | Submit a complaint (raw text only) |
| `GET` | `/complaints` | List; filters: `status`, `category`, `district_id`, `unanalyzed` |
| `GET` | `/complaints/{id}` | One complaint |
| `POST` | `/complaints/{id}/analyze` | Run the AI pass on one complaint |
| `POST` | `/complaints/analyze-pending` | Drain the unanalysed queue |
| `PATCH` | `/complaints/{id}/status` | Move along the workflow |
| `POST` | `/complaints/{id}/verify` | Citizen confirms or disputes a fix |
| `GET` | `/districts` | All districts |
| `GET` | `/districts/priority` | Ranked by priority score |
| `GET` | `/districts/{id}/priority` | One district + factor breakdown |

---

## How the priority score works

A weighted sum of five factors, each min-max normalised across the district set:

| Weight | Factor | Measured as |
|---|---|---|
| 0.30 | Severity | average severity of distinct complaints |
| 0.25 | Volume | count of **distinct** issues |
| 0.20 | Infrastructure deficit | `100 − infrastructure_index` |
| 0.15 | Population | district population |
| 0.10 | Investment gap | public investment **per person** |

Three decisions worth knowing:

- **Volume counts canonical complaints only.** Ten reports of one pothole are
  one problem. Duplicates are tracked separately as corroboration, so a single
  loud issue cannot outrank a district with many real ones.
- **Investment is per capita.** Absolute rupees would rank every large district
  as well-funded. Muzaffarpur has more money than Balangir in absolute terms but
  the worst provision per person in the set.
- **The score is comparative, not absolute.** Every factor is scaled against the
  other districts, so the top district always scores near 100 by construction.
  Adding a worse district shifts every score. This is stated in the UI on every
  explanation panel.

`GET /districts/{id}/priority` returns the full per-factor breakdown — raw
value, normalised position, weight and points contributed — which is what the
"why this area" panel renders.

---

## The AI layer

### Script handling

Native script is identified by counting characters per Unicode block and
taking the majority — not by first match. That detail matters: the DANDA
(`।`, U+0964) is the sentence terminator for Bengali, Marathi and Nepali but
Unicode files it in the *Devanagari* block, so a first-match detector labels
every properly punctuated Bengali complaint as Hindi.

Devanagari carries both Hindi and Marathi, so those are separated by function
words (`आहे`/`नाही` vs `है`/`नहीं`). Text with no Indic characters falls
through to romanised word cues.

### Voice input

`/report` accepts spoken complaints through the browser's built-in speech
recognition (`webkitSpeechRecognition`). The citizen picks a language first -
recognition cannot detect one before it listens - and Indian languages are
transcribed into **native script**, which feeds straight into the script
handling above. The transcript lands in the same textarea, so it can be
corrected before submitting and the rest of the pipeline is unchanged.

This is the browser's engine, **not Bhashini and not a model we run**. It
requires an internet connection and works in Chrome, Edge and Brave; where
the API is missing the control is not rendered and typing still works.

### The analysis call

One call does language detection, translation and classification together,
returning structured JSON. Two interchangeable backends sit behind
`analyze_text()`:

| Backend | When | What it does |
|---|---|---|
| `GeminiAnalyzer` | `GEMINI_API_KEY` set | One structured `generateContent` call. Tried first. |
| `ClaudeAnalyzer` | `ANTHROPIC_API_KEY` set | One `messages.parse` call to the Claude API. |
| `MockAnalyzer` | always, as backstop | Deterministic keyword analysis. No network, no cost. |

Providers are tried in order and the mock is the final backstop, so a dead
key, an exhausted quota or no network degrades the *result* rather than
failing the request. `analyze_text()` never throws.

To enable a real provider, copy `backend/.env.example` to `backend/.env` and
set a key. A free Google AI Studio key (aistudio.google.com, no card) is
enough. `/health` then reports `"ai_provider": "gemini"`.

**Free-tier quota is per model, per day, and small** (as little as 20
requests/day/model). `GEMINI_MODEL` is therefore a comma-separated chain —
on a 429 the next model is tried, which multiplies usable quota without
billing. Calls are also paced by `GEMINI_MIN_INTERVAL` to respect the
per-minute limit.

Language codes are normalised to ISO 639-1 on the way out of every provider:
models answer `"Hindi"` about as often as `"hi"`, and a mixed corpus would
render two different badges for one language.

**Be aware of what the mock does and does not do.** Measured against the 25
ground-truth seed templates, split by script:

| | Romanised (18) | Native script (7) | Combined (25) |
|---|---|---|---|
| Language detection | 100% | 100% | **25/25 (100%)** |
| Category | 100% | 100% | **25/25 (100%)** |
| Severity, exact | 50% | 29% | 11/25 (44%) |
| Severity, within ±1 | 100% | 100% | **25/25 (100%)** |

Severity is the weakest signal — it is the one judgement call a keyword matcher
cannot really make — but it never misses by more than one point, and it carries
the heaviest weight in the score, which is why the real provider matters most
there.

**The mock cannot translate.** It returns `"[auto] " + original` and the UI
strips that marker rather than displaying it as a translation. Real translation
requires an API key.

Near-duplicate detection is deliberately **not** an LLM call — it is Jaccard
token overlap scoped to the same district and category, which is milliseconds
and free. Measured separation on real pairs: 1.00 and 0.71 for duplicates, 0.09
and 0.00 for distinct issues, against a 0.55 threshold.

---

## Project structure

```
backend/
  app/
    config.py               settings (pydantic-settings)
    database.py             engine, session, Base, get_db
    models.py               Complaint, District
    schemas.py              API request/response contracts
    seed.py / seed_data.py  synthetic districts and complaints
    routers/
      complaints.py         submission, analysis, workflow
      districts.py          districts and priority scoring
    services/
      ai_service.py         mock + Claude analysers
      duplicate_service.py  near-duplicate detection
      scoring_service.py    the weighted priority score
      workflow_service.py   status transitions and verification
frontend/
  src/
    api.js                  API client
    App.jsx                 route table
    DataContext.jsx         one fetch shared across routes
    myReports.js            per-device report ids (localStorage)
    pages/                  Home, Dashboard, District, Report, MyReports, NotFound
    components/             layout, map, ranking, chart, feed, explanation
DEMO_SCRIPT.md              three-minute demo walkthrough
```

## Seed data

10 districts across 9 states, engineered into three tiers (underserved /
moderate / well-served) so the weighting has a real signal to find, and 135
complaints in Hindi, Marathi, Tamil, Bengali and English — in both native and
romanised script.

`RANDOM_SEED` is fixed, so reruns produce identical data and demo numbers never
shift. About 10% of complaints are left unanalysed so the AI pass has live work
to do.

This data is synthetic and deliberately shaped. It demonstrates that the
weighting is correct — not that the model discovered anything unknown.

---

## Deliberately not built

Scope decisions for a 24-hour build, not oversights:

- **No authentication.** "My reports" is browser-local storage.
- **No photo intake, and no server-side ASR.** Voice uses the browser's own
  speech recognition; Bhashini is not integrated.
- **No migrations.** `Base.metadata.create_all()`; schema changes need a reseed.
- **No websockets**, no multi-tenancy, no RBAC, no model training.
- **SQLite, not Postgres.** No dialect-specific column types are used, so
  switching is a `DATABASE_URL` change plus adding `psycopg2-binary`.

## Licence

MIT — see [LICENSE](LICENSE).
