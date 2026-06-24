"""Settings, summaries, insights, and automation log models."""

from datetime import datetime, date, timezone
from sqlalchemy import String, Date, DateTime, Integer, Float, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AppSetting(Base):
    """Key-value configuration store for runtime settings."""
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True)  # general | whatsapp | email
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class DailySummary(Base):
    """Pre-computed daily aggregates for fast dashboard loading."""
    __tablename__ = "daily_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    summary_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False, index=True)
    total_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    total_customers: Mapped[int] = mapped_column(Integer, default=0)
    total_transactions: Mapped[int] = mapped_column(Integer, default=0)
    top_services: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    payment_breakdown: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    ai_insights: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class AIInsight(Base):
    """AI-generated business insights."""
    __tablename__ = "ai_insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    insight_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    insight_type: Mapped[str] = mapped_column(String(20), nullable=False)  # daily | weekly | monthly
    insight_text: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class AutomationLog(Base):
    """Log of sent WhatsApp messages and emails."""
    __tablename__ = "automation_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # whatsapp | email
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # sent | failed | pending
    message: Mapped[str] = mapped_column(Text, nullable=True)
    recipient: Mapped[str] = mapped_column(String(255), nullable=True)
    error: Mapped[str] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
