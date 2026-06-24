"""
Application configuration loaded from environment variables.
All secrets are read from the .env file located in the project root.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


def _find_env_file() -> str:
    """Locate the .env file — check project root first, then backend/."""
    # Project root (parent of backend/)
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    root_env = project_root / ".env"
    if root_env.exists():
        return str(root_env)
    # Fallback: backend/.env
    backend_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if backend_env.exists():
        return str(backend_env)
    return str(root_env)  # will raise validation error if missing


class Settings(BaseSettings):
    """Central configuration — every setting comes from env vars."""

    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "Fashion World Studio AI Business OS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── JWT Authentication ───────────────────────────────
    JWT_SECRET_KEY: str = Field(
        default="fw-studio-dev-secret-change-in-production-2024",
        description="Secret key for JWT token signing",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for dev convenience
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = ""  # Empty → SQLite default

    # ── Gemini AI ────────────────────────────────────────
    GEMINI_API_KEY: str = Field(
        default="", description="Google Gemini API key"
    )

    # ── Anthropic Claude ──────────────────────────────────
    ANTHROPIC_API_KEY: str = Field(
        default="", description="Anthropic API key for Claude"
    )

    # ── WhatsApp Business API ────────────────────────────
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = ""
    DEFAULT_WHATSAPP_RECIPIENT: str = "919582480417"

    # ── Email (SMTP) ─────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "fashionworldstudio@gmail.com"
    SMTP_PASSWORD: str = ""
    DEFAULT_EMAIL_RECIPIENT: str = "fashionworldstudio@gmail.com"

    # ── Salon Defaults ───────────────────────────────────
    SALON_NAME: str = "Fashion World Studio"
    SALON_CITY: str = "Dehradun"
    SALON_STATE: str = "Uttarakhand"

    class Config:
        env_file = _find_env_file()
        env_file_encoding = "utf-8"
        case_sensitive = True

    @property
    def sqlite_url(self) -> str:
        """Default SQLite database path."""
        db_dir = Path(__file__).resolve().parent.parent.parent
        return f"sqlite+aiosqlite:///{db_dir / 'salon.db'}"

    @property
    def effective_database_url(self) -> str:
        """Returns configured DATABASE_URL or falls back to SQLite."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return self.sqlite_url

    def validate_critical_keys(self) -> list[str]:
        """Return list of missing critical configuration keys."""
        warnings = []
        if not self.GEMINI_API_KEY:
            warnings.append("GEMINI_API_KEY is not set — AI features will be disabled")
        if not self.ANTHROPIC_API_KEY:
            warnings.append("ANTHROPIC_API_KEY is not set — Claude insights will be disabled")
        if not self.WHATSAPP_ACCESS_TOKEN:
            warnings.append("WHATSAPP_ACCESS_TOKEN is not set — WhatsApp automation disabled")
        return warnings


# Singleton instance
settings = Settings()
