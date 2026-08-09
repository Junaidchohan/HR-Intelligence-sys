from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./talent.db"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 8
    algorithm: str = "HS256"

    github_token: str | None = None
    github_offline_fixtures: bool = False

    anthropic_api_key: str | None = None
    screening_use_llm_summary: bool = False

    admin_email: str = "admin@example.com"
    admin_password: str = "change-me-admin-password"


settings = Settings()
