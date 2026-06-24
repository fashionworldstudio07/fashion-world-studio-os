"""
SQLAlchemy models — all models are imported here for Alembic and Base.metadata.
"""

from app.models.user import User
from app.models.customer import Customer
from app.models.service import Service
from app.models.transaction import Transaction, TransactionService
from app.models.settings import AppSetting, DailySummary, AIInsight, AutomationLog

__all__ = [
    "User",
    "Customer",
    "Service",
    "Transaction",
    "TransactionService",
    "AppSetting",
    "DailySummary",
    "AIInsight",
    "AutomationLog",
]
