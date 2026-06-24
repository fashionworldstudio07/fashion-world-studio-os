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
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    
    week_start = today_start - timedelta(days=today_start.weekday())
    last_week_start = week_start - timedelta(days=7)
    
    month_start = today_start.replace(day=1)
    if month_start.month == 1:
        last_month_start = month_start.replace(year=month_start.year - 1, month=12)
    else:
        last_month_start = month_start.replace(month=month_start.month - 1)
        
    year_start = today_start.replace(month=1, day=1)

    async def rev_range(start, end=None):
        query = select(func.coalesce(func.sum(Transaction.total_amount), 0)).where(Transaction.service_date >= start)
        if end is not None:
            query = query.where(Transaction.service_date < end)
        r = await db.execute(query)
        return float(r.scalar() or 0)

    async def cust_range(start, end=None):
        query = select(func.count(func.distinct(Transaction.customer_id))).where(Transaction.service_date >= start)
        if end is not None:
            query = query.where(Transaction.service_date < end)
        r = await db.execute(query)
        return int(r.scalar() or 0)

    t_rev = await rev_range(today_start)
    t_cust = await cust_range(today_start)
    w_rev = await rev_range(week_start)
    m_rev = await rev_range(month_start)
    y_rev = await rev_range(year_start)

    # Comparisons
    yesterday_revenue = await rev_range(yesterday_start, today_start)
    yesterday_customers = await cust_range(yesterday_start, today_start)
    last_week_revenue = await rev_range(last_week_start, week_start)
    last_month_revenue = await rev_range(last_month_start, month_start)

    if yesterday_revenue > 0:
        today_revenue_change_pct = round(((t_rev - yesterday_revenue) / yesterday_revenue) * 100, 1)
    else:
        today_revenue_change_pct = 100.0 if t_rev > 0 else 0.0

    today_customers_change = t_cust - yesterday_customers

    if last_week_revenue > 0:
        week_revenue_change_pct = round(((w_rev - last_week_revenue) / last_week_revenue) * 100, 1)
    else:
        week_revenue_change_pct = 100.0 if w_rev > 0 else 0.0

    if last_month_revenue > 0:
        month_revenue_change_pct = round(((m_rev - last_month_revenue) / last_month_revenue) * 100, 1)
    else:
        month_revenue_change_pct = 100.0 if m_rev > 0 else 0.0

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
        today_revenue_change_pct=today_revenue_change_pct,
        today_customers_change=today_customers_change,
        week_revenue_change_pct=week_revenue_change_pct,
        month_revenue_change_pct=month_revenue_change_pct,
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
