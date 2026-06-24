"""Pydantic schemas for dashboard analytics."""

from typing import List, Optional
from pydantic import BaseModel


class KPISummary(BaseModel):
    today_revenue: float = 0.0
    today_customers: int = 0
    week_revenue: float = 0.0
    month_revenue: float = 0.0
    year_revenue: float = 0.0
    avg_bill_value: float = 0.0
    repeat_customer_rate: float = 0.0
    total_customers: int = 0
    today_revenue_change_pct: float = 0.0
    today_customers_change: int = 0
    week_revenue_change_pct: float = 0.0
    month_revenue_change_pct: float = 0.0


class RevenueTrendItem(BaseModel):
    date: str
    revenue: float
    customers: int


class ServiceBreakdown(BaseModel):
    service_name: str
    count: int
    revenue: float
    percentage: float


class PaymentBreakdown(BaseModel):
    mode: str
    count: int
    amount: float
    percentage: float


class DashboardResponse(BaseModel):
    kpi: KPISummary
    revenue_trend: List[RevenueTrendItem] = []
    top_services: List[ServiceBreakdown] = []
    payment_breakdown: List[PaymentBreakdown] = []
