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
- [ ] Header shows **`AI: gemini`** (falls back to `mock` if quota is spent)
- [ ] Browser zoom at 100%, `/dashboard` already open in a tab
- [ ] Clear browser storage so "My reports" starts empty
- [ ] Have the Hindi sample ready to paste (below) — **do not type it live**

**Complaint to paste** (romanised Hindi):

```
Hamare gaon me hospital me daktar nahi hai, log door jaate hain aur bimari fail rahi hai.
```

**Optional second complaint** (native Devanagari — shows both scripts work):

```
हमारे गाँव के अस्पताल में डॉक्टर नहीं है, बीमारी फैल रही है।
```

---

## 2. The three-minute script

### 0:00 – 0:20 — The problem

> "Citizens report infrastructure problems in dozens of languages. Those
> complaints pile up as unstructured text, and nobody can answer the question a
> policymaker actually needs answered: *where should the next rupee go?*
> JanSetu turns complaints into a priority signal."

### 0:20 – 0:55 — Citizen side

Go to **Report an issue** (`/report`). Paste the Hindi complaint. Choose
district **Balangir, Odisha**. Click **Submit report**.

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

Click **Dashboard** (`/dashboard`).

> "Now the same data from the government's side. 135 complaints, ten districts,
> five languages, in both native and romanised script."

Point at the map.

> "Red is urgent, green is well-served, and circle size scales with priority.
> The hotspots are Bihar, Odisha and Uttar Pradesh — the system found those, we
> didn't place them."

Point at the ranking table.

| # | District | Score | Issues | Avg severity | Infra index |
|---|---|---|---|---|---|
| 1 | Balangir, Odisha | **83.8** | 18 | 4.44 | 31.2 |
| 2 | Muzaffarpur, Bihar | **81.6** | 15 | 4.08 | 28.4 |
| 3 | Chitrakoot, UP | **73.8** | 16 | 4.38 | 34.6 |
| … | | | | | |
| 8 | Pune, Maharashtra | 27.8 | 5 | 2.40 | 78.9 |
| 10 | Coimbatore, Tamil Nadu | 13.1 | 5 | 2.25 | 74.2 |

> "Weighted score: severity 30%, volume 25%, infrastructure 20%, population 15%,
> investment 10%. Complaint volume alone would be misleading — we count distinct
> problems, not repeat reports, so one loud issue can't outrank a district with
> many real ones."

### 1:40 – 2:20 — The differentiator: why this area

Click **Balangir** in the table &mdash; this opens its own page at
`/districts/2`, which is a shareable link.

> "This is the part that matters. The score isn't a black box."

| Factor | Points | Raw |
|---|---|---|
| Average severity | **30.0** | 4.44 / 5 |
| Distinct issues | **25.0** | 18 |
| Infrastructure shortfall | **18.9** | index 31.2 / 100 |
| Investment per person | 8.7 | ₹47.30 |
| Population | 1.2 | 1,648,997 |

> "Balangir is first because it maxes out the two heaviest factors — the most
> severe problems in the set, and the most of them. Population barely
> contributes: it is a small district."

Now click **Pune** — this contrast is the strongest 15 seconds of the demo.

> "Pune scores 28 — and look, volume and infrastructure contribute **zero**,
> because Pune is the best in the set on both. Its score is almost entirely
> population and low per-head investment. Same formula, opposite explanation.
> A department head can argue with this. They can't argue with a number."

### 2:20 – 2:50 — Closing the loop

Still on Balangir, find your complaint at the top of the feed (severity 5,
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
> Yes. One structured model call per complaint does language detection,
> translation and classification together. Behind it sits a deterministic
> keyword analyser as a fallback, so an exhausted quota or a dead network
> degrades the result instead of breaking the demo.

**"Are the translations real?"**
> The live ones are — every complaint you submit is translated by the model, in
> native or romanised script. The English beside the *seeded* historical
> complaints is authored seed data, not model output. Say "seeded historical
> data" for those and demonstrate a live one.

**"Does it handle native script, or only romanised?"**
> Both, and it tells them apart. Native script is detected by counting
> characters per Unicode block; romanised text falls through to language-specific
> word cues. Devanagari carries both Hindi and Marathi, so those are separated by
> function words. Measured: 25/25 on language and 25/25 on category across both
> scripts. Standard translation engines can't parse romanised Hindi at all —
> that is the harder half and we handle it.

**"Why not Bhashini?"**
> Out of scope for 24 hours. The analysis layer is a swappable interface — a
> Bhashini backend would implement the same `analyze_text` contract.

**"A score of 84 out of what? Is that absolute need?"**
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
> as corroboration, not volume — the table shows `18 +7` for Balangir:
> eighteen distinct problems, seven repeat reports.

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
| Header flips to `AI: mock` | Daily free quota spent | Still fully functional — say so plainly; classification is unaffected |
| Submit button disabled | Text under 5 characters | Paste the sample |
| "Analyse N pending" button visible | 11 complaints unanalysed | That's intentional — clicking it is a fine bonus beat |

**Golden rule:** if a piece breaks, skip it and go to the explanation panel.
That is the strongest part of the product and needs only data already loaded.

---

## 5. One-sentence version

> JanSetu turns multilingual citizen complaints into a ranked, explainable
> district priority signal — and closes the loop by letting the citizen verify
> whether the fix actually happened.
