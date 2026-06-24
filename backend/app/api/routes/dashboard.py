"""Dashboard analytics routes — KPIs, revenue trends, service/payment breakdowns."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.transaction import Transaction, TransactionService
from app.schemas.dashboard import (
    DashboardResponse, KPISummary, RevenueTrendItem,
    ServiceBreakdown, PaymentBreakdown,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardResponse)
async def get_dashboard_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    year_start = today_start.replace(month=1, day=1)

    async def rev(start):
        r = await db.execute(
            select(func.coalesce(func.sum(Transaction.total_amount), 0))
            .where(Transaction.service_date >= start)
        )
        return float(r.scalar() or 0)

    async def cust(start):
        r = await db.execute(
            select(func.count(func.distinct(Transaction.customer_id)))
            .where(Transaction.service_date >= start)
        )
        return int(r.scalar() or 0)

    t_rev, t_cust = await rev(today_start), await cust(today_start)
    w_rev, m_rev, y_rev = await rev(week_start), await rev(month_start), await rev(year_start)

    tc = await db.execute(select(func.count(Customer.id)))
    total_customers = int(tc.scalar() or 0)

    avg_r = await db.execute(
        select(func.coalesce(func.avg(Transaction.total_amount), 0))
        .where(Transaction.service_date >= month_start)
    )
    avg_bill = float(avg_r.scalar() or 0)

    rr = await db.execute(select(func.count(Customer.id)).where(Customer.total_visits > 1))
    repeat = int(rr.scalar() or 0)
    repeat_rate = (repeat / total_customers * 100) if total_customers > 0 else 0

    kpi = KPISummary(
        today_revenue=t_rev, today_customers=t_cust, week_revenue=w_rev,
        month_revenue=m_rev, year_revenue=y_rev, avg_bill_value=round(avg_bill, 2),
        repeat_customer_rate=round(repeat_rate, 1), total_customers=total_customers,
    )

    # Revenue trend (30 days)
    ago30 = today_start - timedelta(days=30)
    tr = await db.execute(
        select(
            func.date(Transaction.service_date).label("day"),
            func.coalesce(func.sum(Transaction.total_amount), 0).label("revenue"),
            func.count(func.distinct(Transaction.customer_id)).label("customers"),
        ).where(Transaction.service_date >= ago30)
        .group_by(func.date(Transaction.service_date))
        .order_by(func.date(Transaction.service_date))
    )
    revenue_trend = [
        RevenueTrendItem(date=str(r.day), revenue=float(r.revenue), customers=int(r.customers))
        for r in tr.all()
    ]

    # Top services
    sr = await db.execute(
        select(
            TransactionService.service_name,
            func.count(TransactionService.id).label("count"),
            func.coalesce(func.sum(TransactionService.price), 0).label("revenue"),
        ).join(Transaction, TransactionService.transaction_id == Transaction.id)
        .where(Transaction.service_date >= month_start)
        .group_by(TransactionService.service_name)
        .order_by(func.count(TransactionService.id).desc()).limit(10)
    )
    srows = sr.all()
    srev_tot = sum(float(r.revenue) for r in srows) or 1.0
    top_services = [
        ServiceBreakdown(service_name=r.service_name, count=r.count,
                         revenue=float(r.revenue), percentage=round(float(r.revenue)/srev_tot*100, 1))
        for r in srows
    ]

    # Payment breakdown
    pr = await db.execute(
        select(
            Transaction.payment_mode,
            func.count(Transaction.id).label("count"),
            func.coalesce(func.sum(Transaction.total_amount), 0).label("amount"),
        ).where(Transaction.service_date >= month_start)
        .group_by(Transaction.payment_mode)
    )
    prows = pr.all()
    ptot = sum(r.count for r in prows) or 1
    payment_breakdown = [
        PaymentBreakdown(mode=r.payment_mode, count=r.count,
                         amount=float(r.amount), percentage=round(r.count/ptot*100, 1))
        for r in prows
    ]

    return DashboardResponse(
        kpi=kpi, revenue_trend=revenue_trend,
        top_services=top_services, payment_breakdown=payment_breakdown,
    )
