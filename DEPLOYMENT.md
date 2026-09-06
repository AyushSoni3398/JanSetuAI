# Deployment

Two Render services from one blueprint: a Python API and a static frontend.
Everything in the repo is configured — what remains needs a Render account,
which only the repository owner can create.

## What you get

| Service | What it is | URL shape |
|---|---|---|
| `jansetu-api` | FastAPI, seeded on boot | https://jansetu-api-f7y1.onrender.com |
| `jansetu-web` | Static React build | https://jansetu-web.onrender.com |

Render appends a suffix when a name is already taken globally — hence the
`-f7y1` on the API. Both URLs are set explicitly in `render.yaml`; if you
redeploy under different names, change them there.

The frontend is a separate static site rather than being built inside the
Python service, because Render's Python runtime is not guaranteed to have Node
available. Each service also caches and scales on its own terms.

---

## Deploy

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Blueprint**, select this repository. Render reads
   [`render.yaml`](render.yaml) and proposes both services.
3. It will ask for one value it cannot infer:

   | Variable | Value |
   |---|---|
   | `GEMINI_API_KEY` | your Google AI Studio key — or leave empty to run the deterministic mock |

4. **Apply**. The API builds first; the static site follows.

`CORS_ORIGINS` and `VITE_API_BASE` are set explicitly in the blueprint.

**Do not use `fromService ... property: host` for these.** It resolves to the
service *name*, not the hostname — which yields `https://jansetu-web`, an
origin that matches nothing, and the browser then blocks every API call with
no server-side error to show for it. The code has a fallback that appends
`.onrender.com` to a bare name, but explicit URLs are the reliable answer.

## Verify

- [ ] https://jansetu-api-f7y1.onrender.com/health returns `"database":"connected"`
- [ ] https://jansetu-api-f7y1.onrender.com/docs loads
- [ ] The frontend shows real numbers, not zeros
- [ ] https://jansetu-web.onrender.com/districts/1 works on a **hard refresh**
- [ ] Footer reads `AI: gemini` (or `mock` with no key)
- [ ] Submitting a complaint returns an analysis

If the dashboard shows zeros and the browser console reports a CORS error, the
API has not finished its first deploy — the hostname reference resolves on the
next sync. Redeploy the API and reload.

---

## Free-tier behaviour worth knowing

**The API sleeps after ~15 minutes idle** and takes roughly 50 seconds to wake.
Open `/health` a minute before demoing so the first visitor does not sit on a
spinner.

**The filesystem is ephemeral.** Complaints submitted to the deployed instance
disappear on the next deploy. Acceptable for synthetic data; the fix is a
managed Postgres and a changed `DATABASE_URL`, nothing else — no dialect-specific
column types are used anywhere.

**Seeding is idempotent.** `python -m app.seed` without `--reset` only seeds an
empty database, so restarts do not wipe live submissions.

---

## WhatsApp on the deployed instance

Point the Twilio sandbox webhook at the deployed API instead of a local tunnel:

```
https://jansetu-api-f7y1.onrender.com/webhooks/whatsapp
```

Strictly better than the Cloudflare tunnel used locally — the URL is stable, so
it never needs re-pasting after a restart.

The webhook acknowledges in milliseconds and classifies in the background,
because Twilio abandons a webhook that takes longer than about fifteen
seconds and a model call plus its rate-limit pacing can exceed that. The
citizen gets a report number immediately; `STATUS <id>` returns the
classification a moment later.

Still hit `/health` before demoing: a sleeping free-tier service takes ~50
seconds to wake, which Twilio will not wait for.

---

## A note on scheme handling

Render exposes a referenced service as a bare hostname, not a full URL. Both
sides normalise it: the frontend prepends `https://` to `VITE_API_BASE`, and the
API prepends it to any `CORS_ORIGINS` entry without a scheme. CORS matching is
exact, so an origin missing its scheme silently blocks every request with no
server-side error to show for it.

## Local development is unchanged

`VITE_API_BASE` defaults to `http://localhost:8000` when unset, and
`CORS_ORIGINS` defaults to the Vite dev origins.
