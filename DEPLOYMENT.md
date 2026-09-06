# Deployment

Two pieces: a FastAPI service and a static frontend. Everything in the repo is
already configured — what remains is creating accounts and pasting two URLs,
which has to be done by the repository owner.

**Deploy the backend first.** The frontend needs the API's URL at build time.

---

## 1. Backend — Render

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Blueprint**, pick this repository. Render reads [`render.yaml`](render.yaml).
3. Set the two environment variables it asks for:

   | Variable | Value |
   |---|---|
   | `GEMINI_API_KEY` | your Google AI Studio key (or leave empty to run the mock) |
   | `CORS_ORIGINS` | leave blank for now — filled in at step 3 |

4. Deploy, then confirm `https://<your-service>.onrender.com/health` returns
   `{"status":"ok","database":"connected",...}`.

The start command seeds the database before serving, so a fresh instance comes
up with the full synthetic corpus.

**Free-tier behaviour worth knowing:** the service sleeps after ~15 minutes of
inactivity and takes roughly 50 seconds to wake. Open `/health` a minute before
demoing. The filesystem is also ephemeral, so complaints submitted to the
deployed instance disappear on the next deploy — acceptable for synthetic data,
and the fix is a managed Postgres plus a changed `DATABASE_URL`, nothing more.

---

## 2. Frontend — Vercel or Netlify

1. Sign in at [vercel.com](https://vercel.com) (or Netlify) with GitHub and
   import this repository.
2. Configure the project:

   | Setting | Value |
   |---|---|
   | Root directory | `frontend` |
   | Build command | `npm run build` |
   | Output directory | `dist` |

3. Add one environment variable:

   ```
   VITE_API_BASE = https://<your-service>.onrender.com
   ```

   It is read at **build time**, so changing it later needs a redeploy.

4. Deploy, and note the resulting URL.

SPA routing is already handled — [`vercel.json`](frontend/vercel.json) and
[`public/_redirects`](frontend/public/_redirects) rewrite every path to
`index.html`, so `/districts/2` works on a hard refresh instead of 404ing.

---

## 3. Close the loop on CORS

Back in Render, set `CORS_ORIGINS` to the frontend URL from step 2 and redeploy:

```
CORS_ORIGINS=https://jansetu.vercel.app
```

Without this the browser blocks every API call and the dashboard sits empty
with a network error. It is the single most common thing to forget.

---

## 4. WhatsApp, if you want it on the deployed instance

Point the Twilio sandbox webhook at the deployed API instead of a local tunnel:

```
https://<your-service>.onrender.com/webhooks/whatsapp
```

This is strictly better than the Cloudflare tunnel used in local development —
the URL is stable, so it does not need re-pasting after every restart.

Watch the cold start: if the service is asleep, Twilio's webhook may time out
before it wakes. Hit `/health` first to warm it.

---

## Checklist

- [ ] `https://<api>/health` returns `database: connected`
- [ ] `https://<api>/docs` loads
- [ ] Frontend loads and shows real numbers, not zeros
- [ ] `https://<frontend>/districts/1` works on a **hard refresh**
- [ ] Footer shows `AI: gemini` (or `mock` if no key is set)
- [ ] Submitting a complaint returns an analysis
- [ ] If using WhatsApp: a message gets a `Report #N logged` reply

## Local development is unchanged

`VITE_API_BASE` defaults to `http://localhost:8000` when unset, so nothing
about the local workflow changes.
