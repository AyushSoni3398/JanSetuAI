"""Application settings, loaded from environment / .env file."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Swap point for the database. SQLite by default so the project runs with
    # zero external services; moving to Postgres is a change to this one value.
    DATABASE_URL: str = "sqlite:///./jansetu.db"

    # Kept as a plain comma-separated string rather than a list: pydantic-settings
    # tries to JSON-decode env vars typed as list, which makes the .env awkward.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- AI analysis (M5) ---
    # Empty = run the deterministic mock. The real provider is used only when a
    # key is present, and it still falls back to the mock on any failure.
    ANTHROPIC_API_KEY: str = ""
    AI_MODEL: str = "claude-opus-5"

    @property
    def ai_enabled(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY.strip())

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
