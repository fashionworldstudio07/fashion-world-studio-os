"""AI Insights & Assistant routes — business intelligence powered by Gemini."""

import json
from datetime import datetime, timedelta, timezone, date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.transaction import Transaction, TransactionService
from app.models.settings import AIInsight
from app.services.ai_engine import generate_business_insights

router = APIRouter(prefix="/insights", tags=["AI Insights"])


async def _build_data_context(db: AsyncSession) -> str:
    """Build a business data context string for AI from the last 30 days."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)
    week_start = today_start - timedelta(days=today_start.weekday())
    ago30 = today_start - timedelta(days=30)

    # Revenue aggregates
    async def rev(start):
        r = await db.execute(
            select(func.coalesce(func.sum(Transaction.total_amount), 0))
            .where(Transaction.service_date >= start)
        )
        return float(r.scalar() or 0)

    today_rev = await rev(today_start)
    week_rev = await rev(week_start)
    month_rev = await rev(month_start)

    # Customer counts
    tc = await db.execute(select(func.count(Customer.id)))
    total_customers = int(tc.scalar() or 0)

    ttx = await db.execute(
        select(func.count(Transaction.id))
        .where(Transaction.service_date >= month_start)
    )
    month_transactions = int(ttx.scalar() or 0)

    # Top services
    sr = await db.execute(
        select(
            TransactionService.service_name,
            func.count(TransactionService.id).label("count"),
            func.coalesce(func.sum(TransactionService.price), 0).label("revenue"),
        ).join(Transaction, TransactionService.transaction_id == Transaction.id)
        .where(Transaction.service_date >= month_start)
        .group_by(TransactionService.service_name)
        .order_by(func.count(TransactionService.id).desc()).limit(8)
    )
    top_services = [(r.service_name, r.count, float(r.revenue)) for r in sr.all()]

    # Payment breakdown
    pr = await db.execute(
        select(
            Transaction.payment_mode,
            func.count(Transaction.id).label("count"),
            func.coalesce(func.sum(Transaction.total_amount), 0).label("amount"),
        ).where(Transaction.service_date >= month_start)
        .group_by(Transaction.payment_mode)
    )
    payments = [(r.payment_mode, r.count, float(r.amount)) for r in pr.all()]

    # Average bill
    avg_r = await db.execute(
        select(func.coalesce(func.avg(Transaction.total_amount), 0))
        .where(Transaction.service_date >= month_start)
    )
    avg_bill = float(avg_r.scalar() or 0)

    # Repeat customers
    rr = await db.execute(select(func.count(Customer.id)).where(Customer.total_visits > 1))
    repeat = int(rr.scalar() or 0)
    repeat_rate = (repeat / total_customers * 100) if total_customers > 0 else 0

    context = f"""
Salon: Fashion World Studio, Dehradun
Period: Current month ({month_start.strftime('%B %Y')})

Revenue:
- Today: ₹{today_rev:,.0f}
- This Week: ₹{week_rev:,.0f}
- This Month: ₹{month_rev:,.0f}

Customers:
- Total registered: {total_customers}
- Repeat customer rate: {repeat_rate:.1f}%
- Transactions this month: {month_transactions}
- Average bill value: ₹{avg_bill:,.0f}

Top Services (this month):
{chr(10).join(f'  - {name}: {count} bookings, ₹{rev:,.0f} revenue' for name, count, rev in top_services) if top_services else '  No data yet'}

Payment Methods:
{chr(10).join(f'  - {mode}: {count} transactions, ₹{amt:,.0f}' for mode, count, amt in payments) if payments else '  No data yet'}
""".strip()

    return context


@router.get("/generate")
async def generate_insights(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Generate AI business insights from current salon data."""
    context = await _build_data_context(db)
    insights = await generate_business_insights(context)

    # Store in database
    insight_record = AIInsight(
        insight_date=date.today(),
        insight_type="daily",
        insight_text=json.dumps(insights) if isinstance(insights, list) else str(insights),
        data=context,
    )
    db.add(insight_record)

    return {
        "insights": insights,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/latest")
async def get_latest_insights(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get the most recent AI insights from database."""
    result = await db.execute(
        select(AIInsight)
        .order_by(AIInsight.created_at.desc())
        .limit(1)
    )
    insight = result.scalar_one_or_none()

    if not insight:
        return {"insights": [], "generated_at": None}

    try:
        parsed = json.loads(insight.insight_text)
    except (json.JSONDecodeError, TypeError):
        parsed = [insight.insight_text]

    return {
        "insights": parsed,
        "generated_at": insight.created_at.isoformat() if insight.created_at else None,
        "insight_type": insight.insight_type,
    }



