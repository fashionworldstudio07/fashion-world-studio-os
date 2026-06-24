"""Pydantic schemas for service management."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1)
    category: Optional[str] = None
    base_price: Optional[float] = None
    duration_minutes: Optional[int] = None
    is_custom: bool = False


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    base_price: Optional[float] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class ServiceResponse(BaseModel):
    id: int
    name: str
    category: Optional[str]
    base_price: Optional[float]
    duration_minutes: Optional[int]
    is_active: bool
    is_custom: bool
    created_at: datetime

    class Config:
        from_attributes = True
