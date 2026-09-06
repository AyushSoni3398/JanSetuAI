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

Seed the database with 10 districts and ~894 synthetic complaints, then run the
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
| `GET` | `/districts/{id}/recommendations` | Projects recommended for one district |
| `GET` | `/recommendations` | National project recommendations, ranked |
| `POST` | `/webhooks/whatsapp` | Inbound complaint from a messaging app (Twilio webhook contract) |
| `POST` | `/webhooks/whatsapp/status` | Status lookup by report number |

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

This is the browser's engine, **not Bhashini and not a model we run**. It needs
an internet connection and works in Chrome and Edge.

**Brave is a special case worth knowing about:** it ships the
`webkitSpeechRecognition` object but blocks the speech service behind it, so
feature detection passes while every attempt fails with a `network` error.
The app therefore identifies Brave directly via `navigator.brave.isBrave()`
and explains the situation instead of showing a misleading error. Where the
API is absent entirely (Firefox, Safari) the control is not rendered at all.
Typing works identically in every browser.

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
moderate / well-served) so the weighting has a real signal to find, and ~894
complaints in Hindi, Marathi, Tamil, Bengali and English — in both native and
romanised script.

Complaints are spread across all three intake channels (`web`, `voice`,
`whatsapp`) so the multi-channel model is visible in the UI. **These channel
labels are synthetic** - no seeded complaint actually arrived over WhatsApp;
they describe a hypothetical deployment. Complaints genuinely submitted
through the webhook carry `source: "whatsapp"` for real.

`RANDOM_SEED` is fixed, so reruns produce identical data and demo numbers never
shift. Ten complaints are left unanalysed so the AI pass has live work to do - a
fixed count rather than a percentage, because a free-tier provider cannot
analyse a large batch in one run.

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

## Designed as a Digital Public Good

The [DPG Standard](https://digitalpublicgoods.net/standard/) sets nine
requirements. Where this build meets one it is stated plainly; where it does
not, that is stated too rather than glossed over.

| # | DPG requirement | Status |
|---|---|---|
| 1 | Relevance to a Sustainable Development Goal | **Met** - SDG 11 (sustainable cities) and SDG 16 (accountable institutions) |
| 2 | Use of an approved open licence | **Met** - MIT, see [LICENSE](LICENSE) |
| 3 | Clear ownership | **Met** - stated in LICENSE |
| 4 | Platform independence | **Met** - Python and Node, no proprietary runtime. The AI provider is an interchangeable interface and the mock keeps the system fully functional with no vendor at all |
| 5 | Documentation | **Met** - this README covers setup, API, scoring and limitations |
| 6 | Mechanism for extracting data | **Met** - every entity is readable over a documented JSON API; the store is a single SQLite file |
| 7 | Adherence to privacy and applicable laws | **Partial** - no accounts, no personal data collected, and the WhatsApp webhook deliberately does not store the sender's phone number. A production deployment would need a formal privacy policy and a retention rule |
| 8 | Adherence to standards and best practices | **Partial** - OpenAPI 3 spec at `/openapi.json`, ISO 639-1 language codes, BCP-47 speech tags. No India Stack or other DPI standard integration |
| 9 | Do no harm by design | **Partial** - scoring is deterministic and fully explainable rather than a model verdict, and every score exposes its factors. No formal bias assessment has been carried out |

### What being a DPG changes about the design

- **The AI is replaceable, not required.** `analyze_text()` falls back to a
  deterministic analyser, so an adopting government is never locked to one
  vendor or forced to send citizen data to an external API.
- **The score is arithmetic, not a model output.** Weights are constants in
  `scoring_service.py` and every result carries its own breakdown, so a
  department can audit or challenge a ranking rather than take it on faith.
- **Recommendations are derived, not generated.** The model classifies
  individual complaints; the clustering and ranking behind a project proposal
  are deterministic Python.
- **Minimal data collection.** No accounts, no phone numbers, no device
  identifiers. "My reports" lives in the citizen's own browser.

### Honest gaps

No formal privacy policy, no bias audit, no accessibility conformance
statement, and no third-party security review. These are what a real DPG
submission would need next, and none of them are 24-hour work.

## Licence

MIT — see [LICENSE](LICENSE).
