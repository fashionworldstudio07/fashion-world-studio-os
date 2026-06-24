"""Pydantic schemas for transactions and smart entry."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ── Smart Entry ──────────────────────────────────────────

class SmartEntryRequest(BaseModel):
    """Input from voice or text entry."""
    text: str = Field(..., min_length=1, description="Raw text or voice transcription")
    input_type: str = Field(default="text", pattern="^(voice|text)$")


class AIExtractedData(BaseModel):
    """Structured data extracted by AI from natural language."""
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    services: List[str] = []
    total_amount: Optional[float] = None
    payment_mode: str = "cash"
    notes: Optional[str] = None
    service_date: Optional[str] = None
    confidence: float = 0.0


class SmartEntryResponse(BaseModel):
    """Response with AI-extracted data for user confirmation."""
    extracted: AIExtractedData
    raw_input: str
    requires_confirmation: bool = True


class SmartEntryConfirm(BaseModel):
    """User-confirmed data to save as transaction."""
    customer_name: str
    phone: Optional[str] = None
    services: List[str]
    total_amount: float
    payment_mode: str = "cash"
    notes: Optional[str] = None
    raw_input: Optional[str] = None
    input_type: str = "text"
    ai_extracted_json: Optional[str] = None
    service_date: Optional[datetime] = None


# ── Transaction CRUD ─────────────────────────────────────

class TransactionServiceItem(BaseModel):
    service_name: str
    price: float = 0.0
    quantity: int = 1


class TransactionCreate(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    services: List[TransactionServiceItem]
    total_amount: float
    payment_mode: str = "cash"
    notes: Optional[str] = None
    service_date: Optional[datetime] = None


class TransactionServiceResponse(BaseModel):
    id: int
    service_name: str
    price: float
    quantity: int

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    id: int
    customer_id: Optional[int]
    customer_name: Optional[str] = None
    staff_id: Optional[int]
    total_amount: float
    payment_mode: str
    raw_input: Optional[str]
    input_type: Optional[str]
    notes: Optional[str]
    service_date: datetime
    created_at: datetime
    services: List[TransactionServiceResponse] = []

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int
    page: int
    page_size: int
