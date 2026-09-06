"""JanSetu AI - FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
