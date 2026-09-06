# JanSetu AI — Demo Script

Three-minute live demo, plus prepared answers.

Numbers below come from a freshly seeded database (`RANDOM_SEED = 20260906`).
**Reseed before you present** and the ranking will be exactly these. Scores
shift by a point or two once a live AI provider analyses the pending queue or
someone submits during the demo — that is expected, so quote scores as
approximate ("about 90") rather than reading decimals aloud.

---

## 1. Pre-demo checklist

### Reset and start

```bash
cd C:\Users\ayush\JanSetuAI\JanSetuAI\backend; ..\.venv\Scripts\python.exe -m app.seed --reset
```

```bash
cd C:\Users\ayush\JanSetuAI\JanSetuAI\backend; ..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

```bash
cd C:\Users\ayush\JanSetuAI\JanSetuAI\frontend; npm run dev
```

### Confirm, in this order

- [ ] **Use Chrome or Edge, not Brave** — Brave blocks the speech service, so voice input cannot work there
- [ ] http://localhost:8000/health returns `"database":"connected"` and `"ai_provider":"gemini"`
- [ ] http://localhost:5173 loads and **map tiles render** (needs internet — test on venue wifi)
- [ ] Footer shows **`AI: gemini`** (falls back to `mock` if the daily quota is spent — still fully functional)
- [ ] **Grant microphone permission now** — open `/report`, click "Speak your complaint", allow the prompt. Never let that dialog appear first on stage
- [ ] Browser storage cleared so "My reports" starts empty
- [ ] Tabs pre-opened: `/`, `/dashboard`, `/recommendations`, `/report`

### If you are demoing live WhatsApp

- [ ] Cloudflare tunnel running, and its URL saved in Twilio's sandbox settings
- [ ] `curl <tunnel-url>/health` returns 200 **right before you present**
- [ ] Test message sent and answered

⚠️ **The tunnel URL changes every restart.** If cloudflared restarts or the
machine sleeps, re-paste the new URL into Twilio or WhatsApp silently stops
working.

### Have these ready to paste — do not type them live

Romanised Hindi:
```
Hamare gaon me hospital me daktar nahi hai, log door jaate hain aur bimari fail rahi hai.
```

Native Devanagari:
```
नाली का गंदा पानी सड़क पर बह रहा है, बीमारी फैल रही है।
```

---

## 2. The three-minute script

### 0:00 – 0:20 — The problem

> "Citizens across India report infrastructure problems in a dozen languages,
> through whatever channel they already use. Those reports sit in fragmented
> systems, and nobody can answer the question a policymaker actually needs
> answered: *where should the next rupee go, and what should it build?*"

### 0:20 – 0:55 — Citizen side, and the hard input

Open **`/report`**. Paste the **romanised Hindi**. District **Muzaffarpur, Bihar**. Submit.

> "This is Hindi typed in Roman letters — how most people actually type on a
> phone. Standard translation engines can't parse this at all; they expect
> Devanagari. One submission, and the language, translation and classification
> come back in a single pass."

Point at the analysis card:

| Field | Value |
|---|---|
| Language | `hi` |
| Category | `Healthcare` |
| Severity | `4–5 / 5` |
| English | *"There is no doctor in the hospital in our village…"* |

**Optional, 10 seconds:** paste the Devanagari sample to show native script
works too, or click **Speak your complaint** and say it aloud.

### 0:55 – 1:40 — Policymaker side

Open **`/dashboard`**.

> "1,180 complaints, thirteen districts across twelve states, ten languages,
> arriving through three channels — web, voice and WhatsApp."

Point at the map.

> "Red is urgent, green is well served, and circle size scales with priority.
> Bihar, Odisha and Uttar Pradesh surfaced on their own — we didn't place them."

Point at the ranking.

| # | District | Score | Issues | Avg severity | Infra index |
|---|---|---|---|---|---|
| 1 | Muzaffarpur, Bihar | **87.1** | 144 (+9) | 4.26 | 28.4 |
| 2 | Balangir, Odisha | **83.9** | 151 (+13) | 4.59 | 31.2 |
| 3 | Chitrakoot, UP | **75.5** | 149 (+9) | 4.32 | 34.6 |
| 4 | Bathinda, Punjab | **72.4** | 142 (+14) | 4.23 | 39.8 |
| … | | | | | |
| 13 | Coimbatore, Tamil Nadu | low | | | 74.2 |

> "Severity 30%, volume 25%, infrastructure 20%, population 15%, investment
> 10%. Note the `+18` — those are repeat reports. Ten reports of one pothole
> are one problem, not ten, so duplicates count as corroboration, never volume.
> Otherwise the loudest area wins instead of the worst-off one."

**Then type `pothole` into the complaint search box** (bottom right).

> "And an official who doesn't read Hindi isn't locked out of the data. Search
> runs over the original text *and* the English translation together — one
> English word, 156 complaints across six languages, and not one of them was
> written in English."

Point at a couple of results: Hindi, Odia, Punjabi and Kannada originals,
English underneath.
Clear the search before moving on.

### 1:40 – 2:15 — Why this area

Click **Muzaffarpur** — it opens its own page at `/districts/1`, a shareable link.

| Factor | Points | Raw |
|---|---|---|
| Average severity | **26.6** | 4.26 / 5 |
| Distinct issues | **23.7** | 144 |
| Infrastructure shortfall | **20.0** | index 28.4 / 100 |
| Investment per person | 10.0 | ₹19.79 |
| Population | 6.8 | 4,801,062 |

> "The score isn't a black box. Muzaffarpur is first because it maxes out
> severity and has the worst infrastructure index in the set — and note the
> investment figure: ₹19.79 per person. In absolute rupees Muzaffarpur has more
> money than Balangir. Per head it has the least. Absolute spending would have
> hidden that completely."

Now open **Pune** — the strongest 15 seconds of the demo.

> "Pune scores 25. Infrastructure contributes **zero**, severity and volume
> almost nothing, because Pune is the best in the set on all three. Its whole
> score is population and low per-head investment. Same formula, opposite
> explanation. A department can argue with this. They can't argue with a number."

### 2:15 – 2:40 — What to build

Open **`/recommendations`**.

> "Ranking districts isn't enough — a policymaker holding a budget needs to know
> what to build. These are 67 project recommendations derived from clustered
> complaints. And this part is deterministic: the model classifies individual
> complaints, but the clustering and ranking are plain Python, so a department
> can audit every line."

| | |
|---|---|
| **91.3** | Storm water drainage and sewerage works — **Balangir** |
| **89.4** | Road resurfacing and pothole repair programme — **Muzaffarpur** |

### 2:40 – 3:00 — Closing the loop

Back on the district page, find your complaint in the feed. Click **Mark Resolved**.

> "The department acts and marks it resolved. But 'resolved' shouldn't be
> whatever the department says it is."

Go to **`/my-reports`**, click **No, still broken**.

> "The citizen disputes it and it reopens automatically. Complaint in any
> language through any channel, to a ranked priority, to a costed project, to
> action, and back to the citizen who verifies it."

---

## 3. Optional beats, if you have extra time

**Live WhatsApp (30s).** Message the sandbox number from your phone; the reply
comes back with a report number and classification, and it appears on the
dashboard with a WhatsApp badge. Then send `STATUS <number>` to show tracking
works over the same channel. *Only if the tunnel is confirmed working.*

WhatsApp commands:

| Send | Reply |
|---|---|
| any complaint text | report number, category, severity |
| `STATUS 42` | current status of report 42 |
| `NOT FIXED 42` | reopens report 42 if it was marked resolved |

**The AI pass (15s).** The dashboard shows **"Analyse 10 pending"** — click it
and watch complaints classify live. Takes about a minute with a live provider.

**Voice (20s).** On `/report`, click "Speak your complaint", pick हिन्दी, and
speak. Chrome or Edge only.

---

## 4. Questions you will get, and honest answers

**"Is the AI actually doing anything?"**
> Yes — one structured model call per complaint does language detection,
> translation and classification together. Behind it is a deterministic keyword
> analyser as a fallback, so an exhausted quota or dead network degrades the
> result instead of breaking the demo.

**"Are the translations real?"**
> The live ones are — anything submitted during this demo is translated by the
> model. The English beside the *seeded* historical complaints is authored seed
> data. Say "seeded historical data" for those, and demonstrate a live one.

**"Does it handle native script, or only romanised?"**
> Both, and it tells them apart. Native script is identified by counting
> characters per Unicode block; romanised text falls through to language-specific
> word cues. Devanagari carries both Hindi and Marathi, so those are separated by
> function words. Measured 25/25 on language and category across both scripts.

**"Why not Bhashini?"**
> Out of scope for 24 hours. The analysis layer is a swappable interface — a
> Bhashini backend implements the same `analyze_text` contract. Voice today uses
> the browser's own speech recognition, not Bhashini.

**"A score of 90 out of what? Is that absolute need?"**
> No. Every factor is min-max normalised **across this district set**, so it
> ranks relative need. The top district always scores near 100 by construction.
> Add a worse district and every score shifts. The UI says this on every
> explanation panel.

**"Isn't your seed data engineered to make the scoring look good?"**
> Yes, deliberately — ten districts in three tiers so the weighting has a real
> signal to find. It proves the maths is right, not that the model discovered
> something unknown. Real deployment needs real complaint data.

**"How do you stop one person spamming the ranking?"**
> Duplicate detection. Repeat reports are grouped and counted as corroboration,
> not volume — the ranking shows `135 +18`: 135 distinct problems, 18 repeat
> reports.

**"Is this really a Digital Public Good?"**
> It meets six of the nine DPG Standard requirements and partially meets three.
> The README has the full table, including the gaps: no formal privacy policy,
> no bias audit, no accessibility conformance statement. MIT licensed, no vendor
> lock-in — the AI provider is replaceable and the system works with none at all.

**"What about photo intake?"**
> Not built. Text, voice and WhatsApp are.

**"Is there authentication?"**
> No, deliberately. "My reports" lives in the citizen's own browser, and the
> WhatsApp webhook does not store the sender's phone number.

---

## 5. If something breaks

| Symptom | Cause | What to do |
|---|---|---|
| `ERR_CONNECTION_REFUSED` | uvicorn not running | Restart it; keep the terminal open |
| Blank map, markers visible | No internet for OSM tiles | Keep going — ranking and explanation carry the demo |
| Footer shows `AI: mock` | Daily free quota spent | Say so plainly; classification is unaffected, only translation |
| Voice shows a Brave warning | Running in Brave | Switch to Chrome/Edge, or skip the voice beat |
| Mic does nothing | Permission blocked, or offline | Type instead — the pipeline is identical |
| WhatsApp gets the default reply | Tunnel URL changed | Re-paste the current tunnel URL into Twilio, or skip the beat |
| Numbers differ from this script | DB reseeded, or live analysis ran | Expected — quote approximate scores |
| Submit disabled | Text, location or district missing | All three are required — paste a sample and pick a district |
| Search returns nothing | Term not in the corpus | Use `pothole`, `doctor` or `water` — all have many hits |

**Golden rule:** if anything breaks, go to the district page and the
recommendations. Those are the strongest parts and need only data already
loaded in the browser.

---

## 6. One-sentence version

> JanSetu turns multilingual citizen complaints — typed, spoken, or sent over
> WhatsApp, in native script or Roman letters — into a ranked, explainable list
> of development projects, and closes the loop by letting the citizen verify
> whether the fix actually happened.
