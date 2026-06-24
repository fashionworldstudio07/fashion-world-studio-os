"""Report routes — WhatsApp daily report, export, and automation."""

import json
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.transaction import Transaction, TransactionService
from app.models.settings import AutomationLog
from app.services.whatsapp import send_whatsapp_message, format_daily_report

router = APIRouter(prefix="/reports", tags=["Reports"])


async def _compute_daily_stats(db: AsyncSession, target_date: datetime = None):
    """Compute daily stats for report generation."""
    now = target_date or datetime.now(timezone.utc)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    # Revenue
    rev_r = await db.execute(
        select(func.coalesce(func.sum(Transaction.total_amount), 0))
        .where(Transaction.service_date >= day_start)
        .where(Transaction.service_date < day_end)
    )
    revenue = float(rev_r.scalar() or 0)

    # Customer count
    cust_r = await db.execute(
        select(func.count(func.distinct(Transaction.customer_id)))
        .where(Transaction.service_date >= day_start)
        .where(Transaction.service_date < day_end)
    )
    customers = int(cust_r.scalar() or 0)

    # Top service
    sr = await db.execute(
        select(
            TransactionService.service_name,
            func.count(TransactionService.id).label("cnt"),
        ).join(Transaction, TransactionService.transaction_id == Transaction.id)
        .where(Transaction.service_date >= day_start)
        .where(Transaction.service_date < day_end)
        .group_by(TransactionService.service_name)
        .order_by(func.count(TransactionService.id).desc())
        .limit(1)
    )
    top_row = sr.first()
    top_service = top_row.service_name if top_row else "N/A"

    # Avg bill
    avg_r = await db.execute(
        select(func.coalesce(func.avg(Transaction.total_amount), 0))
        .where(Transaction.service_date >= day_start)
        .where(Transaction.service_date < day_end)
    )
    avg_bill = float(avg_r.scalar() or 0)

    # Payment breakdown
    pr = await db.execute(
        select(
            Transaction.payment_mode,
            func.count(Transaction.id).label("cnt"),
            func.coalesce(func.sum(Transaction.total_amount), 0).label("amt"),
        ).where(Transaction.service_date >= day_start)
        .where(Transaction.service_date < day_end)
        .group_by(Transaction.payment_mode)
    )
    payments = pr.all()
    payment_summary = " | ".join(
        f"{r.payment_mode.upper()}: ₹{float(r.amt):,.0f}" for r in payments
    ) if payments else "No payments"

    return {
        "date": day_start.strftime("%d %b %Y"),
        "revenue": revenue,
        "customers": customers,
        "top_service": top_service,
        "avg_bill": avg_bill,
        "payment_summary": payment_summary,
    }


@router.post("/whatsapp/daily")
async def send_daily_whatsapp_report(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    recipient: Optional[str] = None,
):
    """Manually trigger a WhatsApp daily report."""
    stats = await _compute_daily_stats(db)

    message = await format_daily_report(
        date=stats["date"],
        revenue=stats["revenue"],
        customers=stats["customers"],
        top_service=stats["top_service"],
        avg_bill=stats["avg_bill"],
        payment_summary=stats["payment_summary"],
    )

    result = await send_whatsapp_message(message, recipient)

    # Log the automation
    log = AutomationLog(
        type="whatsapp",
        status="sent" if result.get("status") == "sent" else "failed",
        message=message[:500],
        recipient=recipient or "default",
        error=result.get("error"),
    )
    db.add(log)

    return {
        "status": result.get("status"),
        "stats": stats,
        "message_preview": message[:200],
        "error": result.get("error"),
    }


@router.post("/email/daily")
async def send_daily_email_report(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    recipient: Optional[str] = None,
):
    """Manually trigger an email daily report."""
    from app.services.email import send_email, format_daily_email
    
    stats = await _compute_daily_stats(db)

    plain_email, html_email = await format_daily_email(
        date_str=stats["date"],
        revenue=stats["revenue"],
        customers=stats["customers"],
        top_service=stats["top_service"],
        avg_bill=stats["avg_bill"],
        payment_summary=stats["payment_summary"],
    )

    from app.services.settings_helper import get_db_setting
    from app.core.config import settings
    salon_name = await get_db_setting("SALON_NAME", settings.SALON_NAME)

    result = await send_email(
        subject=f"{salon_name} — Daily Summary ({stats['date']})",
        body=plain_email,
        html_body=html_email,
        recipient=recipient,
    )

    log = AutomationLog(
        type="email",
        status="sent" if result.get("status") == "sent" else "failed",
        message=plain_email[:500],
        recipient=recipient or "default",
        error=result.get("error"),
    )
    db.add(log)

    return {
        "status": result.get("status"),
        "stats": stats,
        "error": result.get("error"),
    }


@router.get("/daily-stats")
async def get_daily_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get today's computed daily statistics."""
    stats = await _compute_daily_stats(db)
    return stats


@router.get("/automation-logs")
async def get_automation_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get recent automation logs (WhatsApp/Email sends)."""
    result = await db.execute(
        select(AutomationLog)
        .order_by(AutomationLog.sent_at.desc())
        .limit(20)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "type": log.type,
            "status": log.status,
            "message": log.message[:100] if log.message else None,
            "recipient": log.recipient,
            "error": log.error,
            "sent_at": log.sent_at.isoformat() if log.sent_at else None,
        }
        for log in logs
    ]
