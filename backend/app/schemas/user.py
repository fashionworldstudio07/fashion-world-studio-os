"""Pydantic schemas for user authentication and management."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ── Request Schemas ──────────────────────────────────────

class LoginRequest(BaseModel):
    email: str = Field(..., example="admin@fashionworld.com")
    password: str = Field(..., min_length=4)


class RegisterRequest(BaseModel):
    email: str = Field(..., example="staff@fashionworld.com")
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    role: str = Field(default="staff", pattern="^(admin|staff)$")


# ── Response Schemas ─────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithTokens(BaseModel):
    user: UserResponse
    tokens: TokenResponse


class OTPSendRequest(BaseModel):
    email: str


class OTPVerifyRequest(BaseModel):
    email: str
    otp: str
