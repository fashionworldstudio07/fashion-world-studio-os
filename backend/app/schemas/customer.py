"""Pydantic schemas for customer management."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    gender: Optional[str]
    email: Optional[str]
    notes: Optional[str]
    first_visit: Optional[datetime]
    last_visit: Optional[datetime]
    total_visits: int
    lifetime_value: float
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    customers: List[CustomerResponse]
    total: int
    page: int
    page_size: int
