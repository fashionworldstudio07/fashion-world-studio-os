"""
Background scheduler (APScheduler) for automated computations and reports.
Schedules nightly DailySummary calculations, WhatsApp reports, and Email notifications.
"""

import logging
from datetime import datetime, date, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.core.database import engine
from app.api.routes.reports import _compute_daily_stats
from app.services.whatsapp import send_whatsapp_message, format_daily_report
from app.services.email import send_email, format_daily_email
from app.models.settings import DailySummary, AutomationLog

logger = logging.getLogger(__name__)

# Singleton scheduler
scheduler = AsyncIOScheduler()


async def run_daily_nightly_job():
    """
    Calculates stats, saves DailySummary, and dispatches WhatsApp & Email reports.
    """
    logger.info("⏰ Starting nightly business OS sync job...")
    
    # Establish dynamic session factory
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            # 1. Compute stats
            stats = await _compute_daily_stats(db)
            
            # 2. Persist DailySummary
            summary_record = DailySummary(
                summary_date=date.today(),
                total_revenue=stats["revenue"],
                total_customers=stats["customers"],
                total_transactions=int(stats.get("total_transactions", 0)),
                top_services=stats["top_service"],
                payment_breakdown=stats["payment_summary"],
            )
            db.add(summary_record)
            await db.flush()
            logger.info("💾 Saved nightly DailySummary record")

            # 3. Format & send WhatsApp report
            wa_message = await format_daily_report(
                date=stats["date"],
                revenue=stats["revenue"],
                customers=stats["customers"],
                top_service=stats["top_service"],
                avg_bill=stats["avg_bill"],
                payment_summary=stats["payment_summary"],
            )
            wa_res = await send_whatsapp_message(wa_message)
            
            wa_log = AutomationLog(
                type="whatsapp",
                status="sent" if wa_res.get("status") == "sent" else "failed",
                message=wa_message[:500],
                recipient="default",
                error=wa_res.get("error"),
            )
            db.add(wa_log)
            logger.info("📱 Nightly WhatsApp report sent & logged")

            # 4. Format & send SMTP email report
            plain_email, html_email = await format_daily_email(
                date_str=stats["date"],
                revenue=stats["revenue"],
                customers=stats["customers"],
                top_service=stats["top_service"],
                avg_bill=stats["avg_bill"],
                payment_summary=stats["payment_summary"],
            )
            
            from app.services.settings_helper import get_db_setting
            salon_name = await get_db_setting("SALON_NAME", settings.SALON_NAME)
            
            email_res = await send_email(
                subject=f"{salon_name} — Daily Summary ({stats['date']})",
                body=plain_email,
                html_body=html_email,
            )
            
            email_log = AutomationLog(
                type="email",
                status="sent" if email_res.get("status") == "sent" else "failed",
                message=plain_email[:500],
                recipient="default",
                error=email_res.get("error"),
            )
            db.add(email_log)
            logger.info("✉️ Nightly Email report sent & logged")

            await db.commit()
            logger.info("✅ Nightly job completed successfully!")

        except Exception as e:
            await db.rollback()
            logger.error(f"❌ Failed to execute nightly scheduled job: {e}")


def start_scheduler():
    """Start background scheduler."""
    if not scheduler.running:
        # Schedule nightly job at 23:30 (11:30 PM) daily
        scheduler.add_job(
            run_daily_nightly_job,
            trigger="cron",
            hour=23,
            minute=30,
            id="nightly_sync_report",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("📅 Background scheduler initialized (Nightly job set at 11:30 PM)")


def stop_scheduler():
    """Stop background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("🛑 Background scheduler stopped")
