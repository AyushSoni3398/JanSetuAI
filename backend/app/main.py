"""JanSetu AI - FastAPI application entrypoint."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine

# Importing models registers them on Base.metadata before create_all runs.
from app import models  # noqa: F401
from app.routers import complaints, districts, recommendations, webhooks
from app.services import ai_service

app = FastAPI(title="JanSetu AI", version="0.1.0")

# No Alembic for the hackathon: tables are created at import time if missing.
# create_all is a no-op for tables that already exist and never alters columns.
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router)
app.include_router(districts.router)
app.include_router(recommendations.router)
app.include_router(webhooks.router)


@app.get("/health")
def health():
    """Reports whether the API is up and whether it can actually reach the DB."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception as exc:
        database_status = f"error: {exc}"

    return {
        "status": "ok",
        "service": "jansetu-api",
        "database": database_status,
        "ai_provider": ai_service.active_provider(),
    }


# --------------------------------------------------------------------------
# Optionally serve the built frontend from this same service.
#
# When frontend/dist exists, the whole application is reachable on one origin:
# the API under its own paths, the site everywhere else. That means a single
# public URL and no CORS configuration at all. If the build is absent - the
# normal state during development, where Vite serves the frontend on :5173 -
# this block does nothing.
# --------------------------------------------------------------------------
_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if _DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        """Return the requested file, falling back to index.html.

        The fallback is what makes client-side routing work: /districts/2 is a
        React route, not a file, so a hard refresh must still be answered with
        the app shell rather than a 404. Registered last, so every real API
        route is matched first.
        """
        candidate = _DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_DIST / "index.html")
