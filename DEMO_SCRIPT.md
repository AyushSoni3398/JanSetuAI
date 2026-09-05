# JanSetu AI — Demo Script

Three-minute live demo. Numbers below match a freshly seeded database
(`RANDOM_SEED = 20260906`), so they are stable across reruns — **reseed before
you present** and they will be exactly these.

---

## 1. Pre-demo checklist (do this 10 minutes before)

Reset to a clean state and start both servers:

```bash
cd C:\Users\ayush\JanSetuAI\JanSetuAI\backend; ..\.venv\Scripts\python.exe -m app.seed --reset
```

```bash
cd C:\Users\ayush\JanSetuAI\JanSetuAI\backend; ..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

```bash
cd C:\Users\ayush\JanSetuAI\JanSetuAI\frontend; npm run dev
```

Then confirm, in this order:

- [ ] http://localhost:8000/health returns `"database":"connected"`
- [ ] http://localhost:5173 loads, **map tiles render** (needs internet — check on venue wifi)
- [ ] Header shows `AI: mock` (or `AI: claude` if a key is set)
- [ ] Browser zoom at 100%, dashboard tab already open
- [ ] Clear browser storage so "My reports" starts empty
- [ ] Have the Hindi sample ready to paste (below) — **do not type it live**

**Complaint to paste** (romanised Hindi):

```
Hamare gaon me hospital me daktar nahi hai, log door jaate hain aur bimari fail rahi hai.
```

---

## 2. The three-minute script

### 0:00 – 0:20 — The problem

> "Citizens report infrastructure problems in dozens of languages. Those
> complaints pile up as unstructured text, and nobody can answer the question a
> policymaker actually needs answered: *where should the next rupee go?*
> JanSetu turns complaints into a priority signal."

### 0:20 – 0:55 — Citizen side

Click **Report an issue**. Paste the Hindi complaint. Choose district
**Muzaffarpur, Bihar**. Click **Submit report**.

> "A citizen writes in their own language — this is romanised Hindi. One
> submission, and the system detects the language and classifies it in a single
> pass."

Point at the analysis card:

| Field | Value |
|---|---|
| Language | `hi` |
| Category | `Healthcare` |
| Severity | `5 / 5` |
| Urgency | `5 / 5` |

> "Detected Hindi, classified as Healthcare, severity five out of five — nobody
> tagged that by hand."

### 0:55 – 1:40 — Policymaker side

Click **Dashboard**.

> "Now the same data from the government's side. 140 complaints, ten districts,
> five languages."

Point at the map.

> "Red is urgent, green is well-served, and circle size scales with priority.
> The hotspots are Bihar, Odisha and Uttar Pradesh — the system found those, we
> didn't place them."

Point at the ranking table.

| # | District | Score | Issues | Avg severity | Infra index |
|---|---|---|---|---|---|
| 1 | Muzaffarpur, Bihar | **81.1** | 15 | 3.92 | 28.4 |
| 2 | Balangir, Odisha | **80.2** | 18 | 4.12 | 31.2 |
| 3 | Chitrakoot, UP | **78.4** | 19 | 4.29 | 34.6 |
| … | | | | | |
| 8 | Pune, Maharashtra | 29.3 | 3 | 2.33 | 78.9 |

> "Weighted score: severity 30%, volume 25%, infrastructure 20%, population 15%,
> investment 10%. Complaint volume alone would be misleading — we count distinct
> problems, not repeat reports, so one loud issue can't outrank a district with
> many real ones."

### 1:40 – 2:20 — The differentiator: why this area

Click **Muzaffarpur** in the table.

> "This is the part that matters. The score isn't a black box."

| Factor | Points | Raw |
|---|---|---|
| Average severity | **25.5** | 3.92 / 5 |
| Infrastructure shortfall | **20.0** | index 28.4 / 100 |
| Distinct issues | **18.8** | 15 |
| Investment per person | **10.0** | ₹19.79 |
| Population | 6.8 | 4,801,062 |

> "Muzaffarpur is first because the problems reported there are the most
> dangerous, and its infrastructure index is the worst in the set."

Now click **Pune** — this contrast is the strongest 15 seconds of the demo.

> "Pune scores 29 — and look, three factors contribute **zero**, because Pune is
> the best in the set on severity, volume and infrastructure. Its entire score
> comes from population and low per-head investment. Same formula, completely
> different explanation. A department head can argue with this. They can't argue
> with a number."

### 2:20 – 2:50 — Closing the loop

Still on Muzaffarpur, find your complaint at the top of the feed (severity 5,
Healthcare). Click **Mark Resolved**.

> "The department acts and marks it resolved."

Switch to **Report an issue**.

> "But 'resolved' shouldn't be whatever the department says it is."

Click **No, still broken**.

> "The citizen disputes it — and it reopens automatically, back to Under Review."

### 2:50 – 3:00 — Close

> "Complaint in any language, to a ranked priority with a defensible
> explanation, to action, and back to the citizen who verifies it. That's the
> loop."

---

## 3. Questions you will get, and honest answers

**"Is the AI actually doing anything, or is this hardcoded?"**
> Language detection and classification run on every complaint. Right now they
> run through a deterministic keyword analyser — the mock. The real path is one
> structured Claude call behind the same interface, and it activates when an API
> key is set. We built it to degrade gracefully so the demo can't die on a
> network failure.

**"Are the translations real?"**
> No — be straight about this. The English text next to seeded complaints is
> authored seed data. The mock cannot translate; it marks its output so it can't
> masquerade as a translation. With an API key, translation is real.

**"Why not Bhashini?"**
> Out of scope for 24 hours. The analysis layer is a swappable interface — a
> Bhashini backend would implement the same `analyze_text` contract.

**"A score of 81 out of what? Is that absolute need?"**
> No. Every factor is min-max normalised **across this district set**, so it
> ranks relative need. The top district always scores near 100 by construction.
> Add a worse district and every score shifts. The UI says this on every
> explanation panel.

**"Isn't your seed data engineered to make the scoring look good?"**
> Yes, deliberately — 10 districts in three tiers so the weighting has a real
> signal to find. It proves the maths is right, not that the model discovered
> something unknown. Real deployment needs real complaint data.

**"How do you stop one angry person spamming the ranking?"**
> Duplicate detection. Repeat reports of the same issue are grouped and counted
> as corroboration, not volume — the table shows `15 +10`: fifteen distinct
> problems, ten repeat reports.

**"What about voice and photo intake?"**
> Not built. Text only in this 24-hour build.

**"Is there authentication?"**
> No. Deliberately out of scope. "My reports" is browser-local.

---

## 4. If something breaks

| Symptom | Cause | Fix / say |
|---|---|---|
| `ERR_CONNECTION_REFUSED` | uvicorn not running | Restart it; keep that terminal open |
| Blank map, markers still visible | No internet for OSM tiles | Keep going — the ranking and explanation carry the demo |
| Dashboard shows API down | Backend died | Restart uvicorn, reload page |
| Numbers differ from this script | DB reseeded mid-session | Reseed with `--reset` and reload |
| Submit button disabled | Text under 5 characters | Paste the sample |
| "Analyse N pending" button visible | 13 complaints unanalysed | That's intentional — clicking it is a fine bonus beat |

**Golden rule:** if a piece breaks, skip it and go to the explanation panel.
That is the strongest part of the product and needs only data already loaded.

---

## 5. One-sentence version

> JanSetu turns multilingual citizen complaints into a ranked, explainable
> district priority signal — and closes the loop by letting the citizen verify
> whether the fix actually happened.
