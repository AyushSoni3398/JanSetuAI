# JanSetu AI — Presentation Script

Eight slides, ~6 minutes, plus prepared answers. Written for
`JanSetuAI_Team_GlitchX.pdf`.

**Live:** https://jansetu-web.onrender.com · **API:** https://jansetu-api-f7y1.onrender.com
**Repo:** https://github.com/AyushSoni3398/JanSetuAI

**Before you walk up:** open the live URL and let it load. The free tier sleeps
after 15 minutes idle and takes about 50 seconds to wake. A judge watching a
spinner is the worst possible opening.

**If you only get 3 minutes:** slides 1, 2, 6, 7. Skip 3, 4, 5 and mention
them in one line each.

---

## Slide 1 — Title  ·  25 seconds

> "JanSetu — *jan* means people, *setu* means bridge. A bridge between what
> citizens report and what governments build.
>
> Citizens report infrastructure problems by voice, text or WhatsApp, in ten
> Indian languages across nine scripts. The system detects the language,
> classifies the problem, merges repeat reports, fuses the result with
> demographic, infrastructure and investment data, and returns a ranked list of
> development projects that shows its working.
>
> It is live — 1,180 complaints, thirteen districts, sixty-seven recommended
> projects."

**Do not read the stat strip aloud.** Let it sit there while you talk.

### Cross-questions

**"Is this actually deployed, or a local demo?"**
> Deployed. jansetu-web.onrender.com — the frontend is a static build, the API
> is a separate service, both on Render. I can open it now.

**"Is the data real?"**
> The district figures and complaint history are synthetic and I will be
> specific about that in a moment. Anything submitted live during this
> presentation is real and analysed live.

**"Who built this?"**
> Answer plainly and briefly. Do not oversell the timeline.

---

## Slide 2 — The problem  ·  55 seconds

> "India has no shortage of citizen feedback. It has no way to turn it into a
> spending decision.
>
> Four things break. Intake is **fragmented** — phone, paper, web, WhatsApp,
> into systems that never meet. It is **unreadable at scale** — an official
> holding a budget in Delhi cannot read a Tamil or Odia complaint, so most of
> the corpus is invisible to them. There is **no feedback loop** — once a
> department marks something resolved, nobody asks the citizen whether it
> actually was.
>
> And the one that matters most: **volume is not need.**"

Point at the chart.

> "Muzaffarpur and Bathinda file almost the same number of complaints — 144 and
> 142. Their infrastructure indices are 28.4 and 39.8. Volume cannot separate
> them. Counting complaints rewards whichever area complains loudest, and a
> district with poor roads and low literacy files fewer reports, not more."

### Cross-questions

**"Isn't this what existing grievance portals already do?"**
> They collect and they route. CPGRAMS will get your complaint to the right
> department. What none of them do is aggregate across complaints to produce a
> comparative priority signal, or explain why one district outranks another.
> Collection is solved. Prioritisation is not.

**"How do you know officials can't read the complaints?"**
> Be careful here — do not overclaim. India has 22 scheduled languages and no
> official reads all of them. The point is structural, not an accusation about
> any particular department: at national scale, someone is always reading a
> language they do not speak.

**"Where did 144 and 142 come from?"**
> Synthetic seed data, engineered into three tiers so the weighting has a real
> signal to find. I will come back to that — it proves the maths is right, not
> that we discovered something unknown.

---

## Slide 3 — How it works  ·  60 seconds

> "Five steps. A citizen **reports** by voice, text or WhatsApp, in native
> script or Roman letters. One model call **understands** it — language
> detection, translation and classification in a single structured response.
> Near-duplicates **group** by district and category, so repeat reports become
> corroboration instead of inflated volume. That is **fused** with population,
> infrastructure index and committed investment. And it is **prioritised** into
> a 0–100 score with its factor breakdown."

Pause before the closing line. This is the most important sentence in the deck.

> "The AI classifies. It does not decide.
>
> The model reads individual complaints and nothing else. Clustering, weighting,
> ranking and every project recommendation are deterministic Python. A
> department can audit the arithmetic line by line — and the system still runs
> with no AI vendor at all."

### Cross-questions

**"Which model?"**
> Gemini, called with a JSON schema so the response shape is enforced rather
> than parsed hopefully. It sits behind an interface with two implementations —
> the other is a deterministic keyword analyser used as a fallback.

**"Why one call instead of separate detect, translate and classify steps?"**
> Cost and latency. Three calls per complaint is three times the quota and
> three times the failure surface, and the three tasks share context — knowing
> the language helps the classification.

**"What happens when the AI gets it wrong?"**
> Two things. Severity is the weakest signal, and we measured it — the fallback
> analyser is within one point on every test case. And nothing acts on a single
> complaint: the score aggregates over a district, so one misclassification
> moves a ranking by a fraction of a point. A human still approves the spend.

**"Why not fine-tune your own model?"**
> There is no labelled dataset of Indian civic-infrastructure complaints worth
> training on, and a general multimodal model already does this well. Fine-tuning
> would cost weeks and produce something harder to audit.

**"What if the API key runs out?"**
> The header switches to `mock` and the deterministic analyser takes over.
> Detection and classification keep working; translation stops. The demo cannot
> die because a vendor is down.

---

## Slide 4 — Under the hood  ·  40 seconds

> "FastAPI and SQLAlchemy on the backend, React with Leaflet and Recharts on the
> front. SQLite as the datastore. Fourteen documented endpoints, MIT licensed.
>
> The architecture is deliberately boring. Three intake channels into one
> gateway, four processing stages, one store, one dashboard. Every stage is a
> separate service module, so the AI provider, the duplicate detector and the
> scoring function can each be replaced without touching the others."

### Cross-questions

**"SQLite? Will that scale?"**
> This is the most likely question on this slide. Answer it directly:
>
> For reads, further than people expect — 1,180 complaints rank in under 20
> milliseconds. It breaks on concurrent writes, which is where a real
> deployment needs Postgres. That is a one-line change: no dialect-specific
> column types are used anywhere, so it is the connection string and one
> dependency. We chose SQLite because it has no server to run, which matters
> more in a 24-hour build than write throughput we do not have.

**"Why FastAPI?"**
> Pydantic validation at the edge and an OpenAPI spec generated from the code,
> so `/docs` is always accurate. For a Digital Public Good, a machine-readable
> API contract that cannot drift from the implementation is worth a lot.

**"Is there a queue? What about async processing?"**
> No queue. Submission and analysis are separate endpoints deliberately — a
> complaint is stored first and analysed second, so if the model is slow or
> down, the report is never lost. That is the property a queue would give you,
> without the infrastructure.

**"How do you handle failures between stages?"**
> Analysis is best-effort. An unanalysed complaint is a valid state — it is
> stored, it appears in the queue, and the dashboard shows how many are
> pending.

---

## Slide 5 — Languages and channels  ·  55 seconds

> "Ten languages, nine scripts — Hindi and Marathi share Devanagari — across
> three channels.
>
> WhatsApp is the largest at 582, and it is a complete loop on its own: send a
> message, get a report number, reply STATUS to track it or NOT FIXED to reopen
> it. No app, no form. Voice uses the browser's speech engine and transcribes
> Indian languages into their own script. The web form is for anyone who
> prefers to type."

Point at the Roman-script panel. **This is your differentiator — slow down.**

> "The hard half is this. *Sadak par bada gaddha hai* — Hindi typed in Latin
> letters, which is how most people actually type on a phone. Translation
> engines expect Devanagari and read this as broken English. There is no
> standard spelling to train on: the same word appears as *sadak*, *sarak*,
> *sadhak*.
>
> We handle it, and native script, and tell Hindi from Marathi by function
> words. Measured at 41 out of 41 on language and category."

### Cross-questions

**"41 out of 41 of what?"**
> Answer honestly and immediately:
>
> 41 ground-truth templates across the ten languages — not 41,000 complaints.
> It is a regression check that the detector handles every language and script
> we claim, not a benchmark against a held-out corpus. We do not have labelled
> real-world data to benchmark against.

**"Why not just use Google Translate?"**
> Because it cannot read the input. Feed it romanised Hindi and it returns
> nonsense, because those tokens are not in its Hindi vocabulary. That is the
> harder half of the problem and it is the half most solutions skip.

**"What about the other 12 scheduled languages?"**
> The model already handles them. What is missing is the offline fallback for
> each — a script range and a keyword list, roughly an hour per language. The
> architecture does not change.

**"Is the translation real?"**
> The live ones are. Anything submitted now is translated by the model. The
> English beside the seeded historical complaints is authored seed data — say
> "seeded historical data" for those, and offer to demonstrate a live one.

**"Voice — is that Bhashini?"**
> No. It is the browser's built-in speech recognition, which is Google's engine.
> We have applied for Bhashini API keys; it would drop in behind the same
> interface. Do not imply Bhashini is running.

---

## Slide 6 — The priority score  ·  70 seconds

**This slide wins or loses the judging. Do not rush it.**

> "Muzaffarpur scores 87. The score is a weighted sum of five factors: severity
> at 30%, volume at 25%, infrastructure deficit at 20%, population 15%,
> investment 10%.
>
> But the number is not the point — the breakdown is. Muzaffarpur is first
> because it maxes out severity and has the worst infrastructure index in the
> set."

Point at the money panel.

> "And look at investment. Muzaffarpur holds more rupees than Balangir in
> absolute terms — and the least per head in the set, ₹19.79. Measuring
> absolute spending would have hidden that inversion completely."

Then the contrast. **This is the strongest fifteen seconds you have.**

> "Now Pune. It scores 24 — and severity and infrastructure contribute exactly
> **zero**, because Pune is the best in the set on both. Its entire score is
> population and low spend per head.
>
> Same formula, opposite explanation. A department can argue with this. They
> cannot argue with a number."

Close honestly, before anyone asks.

> "One caveat we state on every panel in the product: scores are comparative.
> Every factor is min-max normalised across the district set, so this ranks
> relative need — it does not measure need on an absolute scale."

### Cross-questions

**"Who decided the weights? Why 30/25/20/15/10?"**
> The hardest question on the deck. Do not pretend they are derived:
>
> We did, and they are a judgement call, not a finding. Severity is weighted
> highest because harm should outrank popularity. What matters is that they are
> constants in source, visible in the UI, and every score exposes what each one
> contributed — so a state that disagrees can change them and see the ranking
> move. A weighting nobody can inspect is the actual problem; ours is arguable
> by design.

**"87 out of what? Is Muzaffarpur in absolute crisis?"**
> No, and we are careful about this. It is relative to these thirteen
> districts. Add a worse district tomorrow and every score shifts. The top of a
> comparative scale is always near 100 by construction.

**"Could a district game this by flooding you with complaints?"**
> That is what duplicate detection is for. 127 repeat reports are grouped —
> volume counts distinct problems, not messages. And severity is assigned by
> the classifier from the text, not claimed by the reporter, so you cannot
> inflate it by saying "this is urgent".

**"Why is population only 15%?"**
> Because it is the factor least connected to unmet need. A large well-served
> district should not outrank a small neglected one. Pune is the demonstration:
> nine million people, and it still ranks near the bottom.

**"What if a district has no complaints at all?"**
> It scores zero on severity and volume and still appears, ranked by
> infrastructure, population and investment. Absence of complaints is not
> evidence of absence of need — which is exactly why volume is only a quarter
> of the score.

---

## Slide 7 — From ranking to action  ·  60 seconds

> "Ranking districts is not enough. A policymaker holding a budget needs to know
> what to build.
>
> Sixty-seven project recommendations, each carrying its evidence. Top of the
> list: storm water drainage in Balangir — 38 distinct complaints at severity
> five, affecting roughly 290,000 people. That is a line an officer can put in a
> file note."

Then the loop.

> "And it closes. Received, Under Review, Funded, Resolved — but *resolved*
> should not be whatever the department says it is. A citizen who disputes a
> fix reopens it automatically. Twenty-seven have. Sixty-nine resolved,
> fifty-one citizen-confirmed."

Close on provenance.

> "These recommendations are derived, not generated. Complaints are clustered by
> district and category, then weighted 45% severity, 30% distinct volume, 25%
> district need. Nothing here is a model's opinion."

### Cross-questions

**"Is the AI writing these project recommendations?"**
> No — and this is the point. The model classifies individual complaints. The
> clustering, the weighting and the ranking are deterministic Python. A
> recommendation a department can audit line by line is fundable. One an LLM
> wrote is not.

**"Where does '290,000 people' come from?"**
> Be honest — this is the softest number on the slide:
>
> It is the sum of a per-complaint population estimate, which the model
> produces. It is an order-of-magnitude figure, not a census count. In
> production you would join to ward-level population data instead.

**"Do you estimate cost or timeline for these projects?"**
> No. That needs departmental cost norms and procurement data we do not have.
> The output is a prioritised, evidenced shortlist — the input to a costing
> exercise, not a replacement for one.

**"Why 45/30/25 here when the district score uses 30/25/20/15/10?"**
> Different question, different weighting. The district score answers "where is
> need greatest". This answers "what should be built first there", so severity
> dominates and district need becomes context rather than the driver.

**"What stops a department just ignoring this?"**
> Nothing technical — and no dashboard fixes political will. What it changes is
> that ignoring it is now visible: the ranking is public, the reasoning is
> published, and the citizen sees the status.

---

## Slide 8 — Digital Public Good  ·  50 seconds

> "We built this as a Digital Public Good, and measured it against the standard
> rather than claiming the label.
>
> **Open** — MIT licensed, a documented JSON API, a single-file datastore that
> exports whole. Six of the nine DPG Standard requirements met, three partial,
> and the gaps are named in the README rather than glossed over.
>
> **Auditable** — the weights are constants in source, not learned. Every score
> returns its own factor breakdown, so a department can challenge a ranking
> instead of trusting it.
>
> **Resilient** — the AI provider is an interchangeable interface with a
> deterministic fallback. No key, no network, no vendor, and detection and
> classification still run.
>
> What is next: photo intake, authentication, and Bhashini — we have already
> applied for the API keys."

**Say this out loud even though the slide no longer prints it:**

> "And to be explicit: the seeded district data is synthetic and deliberately
> tiered so the weighting has a signal to find. Complaints submitted live are
> real and analysed live."

### Cross-questions

**"Are you actually a registered Digital Public Good?"**
> No. We have not submitted to the DPG Alliance. We assessed ourselves against
> the nine requirements and published the result including the failures — no
> privacy policy, no bias audit, no accessibility conformance statement.

**"Which three are only partial?"**
> Privacy and legal compliance, standards adherence, and do-no-harm. We collect
> no personal data and the WhatsApp webhook deliberately does not store phone
> numbers, but there is no formal privacy policy or bias assessment, and no
> India Stack integration.

**"Why does photo intake matter, and why didn't you build it?"**
> The seam is there — the provider is already multimodal, so it is an image part
> in the same call, not a new pipeline. What is hard is not the model: it is
> blob storage, and moderation. People photograph streets with faces and number
> plates in frame, and storing those carries a duty we could not discharge
> responsibly in the time available.

**"Bhashini — applied when, and what happens if you get it?"**
> Keys are applied for. It would implement the same `analyze_text` contract the
> current provider does, so it is a class, not a rewrite. Voice would move from
> the browser engine to Bhashini's ASR.

---

## Questions that can come at any point

**"How much of this did you write, and how much is AI-generated?"**
> Answer calmly and specifically. Point at a decision only a human makes:
> excluding duplicates from volume, measuring investment per capita instead of
> absolute, the tri-state citizen verdict. Name a real bug you found and fixed
> — the Unicode danda that made every punctuated Bengali complaint look like
> Hindi. Specificity is the answer; defensiveness is not.

**"What was the hardest technical problem?"**
> Romanised Indic text. Every off-the-shelf translation engine fails on it,
> there is no standard spelling, and it is how people actually type. Second was
> telling Hindi from Marathi — they share Devanagari, so script detection is not
> enough and it has to be done on function words.

**"What would you do with another month?"**
> Real complaint data instead of synthetic. A bias audit — we assert the
> weighting is fair and have not tested that. Postgres for concurrent writes.
> Then photo intake.

**"Why should we believe any of these numbers?"**
> Every figure on these slides comes from the running system and can be
> reproduced: the API is public, `/districts/priority` returns the ranking,
> `/recommendations` returns the project list. Open it now if you like.

**"What is the business model?"**
> There is not one, deliberately. It is a Digital Public Good — MIT licensed
> for a state or municipal body to deploy itself. The cost is hosting and an
> optional model API.

---

## If you do not know an answer

Say so, then give the nearest thing you do know.

> "I don't have a measured answer to that. What I can tell you is [adjacent
> fact]. It is on the list to test."

A judge will forgive not knowing. They will not forgive a confident guess that
falls apart on the follow-up — and they ask follow-ups precisely to find out
which one they are dealing with.

## Three lines to land, whatever else happens

1. **"The AI classifies. It does not decide."**
2. **"Same formula, opposite explanation — a department can argue with this."**
3. **"Volume is not need."**
