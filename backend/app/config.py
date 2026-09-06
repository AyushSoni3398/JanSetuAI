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

    GEMINI_API_KEY: str = ""
    # Comma-separated, tried in order. The free tier caps requests PER DAY
    # PER MODEL (as low as 20), so one model alone runs dry quickly - a
    # chain multiplies the usable quota without touching billing.
    GEMINI_MODEL: str = "gemini-3.1-flash-lite,gemini-flash-latest,gemini-3.5-flash,gemini-3.6-flash"
    # Seconds between Gemini calls. The free tier is ~10 requests/minute,
    # so 6.5s paces just under it with room for jitter.
    GEMINI_MIN_INTERVAL: float = 6.5

    @property
    def gemini_models(self) -> list[str]:
        return [m.strip() for m in self.GEMINI_MODEL.split(",") if m.strip()]

    @property
    def claude_enabled(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY.strip())

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.GEMINI_API_KEY.strip())

    @property
    def ai_enabled(self) -> bool:
        return self.claude_enabled or self.gemini_enabled

    @property
    def cors_origins_list(self) -> list[str]:
        """Allowed origins, with a scheme guaranteed.

        Render supplies a bare hostname when one service references
        another, and CORS matching is exact - an entry without a scheme
        never matches, and the browser blocks every request with no
        server-side error to show for it.
        """
        origins = []
        for origin in self.CORS_ORIGINS.split(","):
            origin = origin.strip()
            if not origin:
                continue
            if not origin.startswith(("http://", "https://")):
                # A bare name with no dot is a service name, not a host.
                if "." not in origin and origin != "localhost":
                    origin = f"{origin}.onrender.com"
                origin = f"https://{origin}"
            origins.append(origin)
        return origins


settings = Settings()
