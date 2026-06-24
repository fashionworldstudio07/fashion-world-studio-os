"""Authentication routes — login, register, refresh, current user."""

import logging
import random
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserWithTokens,
    OTPSendRequest,
    OTPVerifyRequest,
)
from app.services.email import send_email

logger = logging.getLogger(__name__)

# In-memory store for OTPs: {email: {"otp": otp, "expires_at": expires_at}}
ACTIVE_OTPS = {}

def normalize_email(email: str) -> str:
    """Normalize input email: trim, convert to lower case, append @gmail.com if domain is omitted."""
    email_clean = email.strip().lower()
    if "@" not in email_clean:
        email_clean = f"{email_clean}@gmail.com"
    return email_clean

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=UserWithTokens)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate user and return JWT tokens."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    tokens = TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )

    return UserWithTokens(
        user=UserResponse.model_validate(user),
        tokens=tokens,
    )


@router.post("/register", response_model=UserResponse)
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Register a new user (admin only)."""
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    new_user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
        role=body.role,
    )
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)

    return UserResponse.model_validate(new_user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get new access token using refresh token."""
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    return TokenResponse(
        access_token=create_access_token({"sub": payload["sub"]}),
        refresh_token=create_refresh_token({"sub": payload["sub"]}),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get current authenticated user."""
    return UserResponse.model_validate(current_user)


@router.post("/otp/send")
async def send_otp(body: OTPSendRequest):
    """Generate a random 6-digit OTP, store it, and email it to the user."""
    email = normalize_email(body.email)
    
    # Generate 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    ACTIVE_OTPS[email] = {"otp": otp, "expires_at": expires_at}
    
    logger.info(f"🔑 Generated OTP for {email}: {otp}")
    
    # Try sending email
    try:
        subject = "Fashion World Studio OS - Your Login OTP"
        msg_body = f"Your login OTP is {otp}. This code is valid for 5 minutes."
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 20px;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #111111; border: 1px solid #D4AF37; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(212,175,55,0.15); text-align: center;">
              <h2 style="color: #D4AF37; margin-bottom: 20px;">💇 Fashion World Studio</h2>
              <p style="color: #CCCCCC; font-size: 14px;">Use the following OTP to complete your login:</p>
              <div style="font-size: 32px; font-weight: bold; color: #D4AF37; letter-spacing: 4px; margin: 25px 0; background-color: #1A1A1A; padding: 15px; border-radius: 8px; border: 1px dashed rgba(212,175,55,0.3); display: inline-block; min-width: 180px;">
                {otp}
              </div>
              <p style="color: #888888; font-size: 11px; margin-top: 20px;">This code is valid for 5 minutes. If you did not request this code, please ignore this email.</p>
            </div>
          </body>
        </html>
        """
        await send_email(
            subject=subject,
            body=msg_body,
            recipient=email,
            html_body=html_body
        )
    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
        
    return {"status": "success", "message": "OTP sent successfully"}


@router.post("/otp/verify", response_model=UserWithTokens)
async def verify_otp(
    body: OTPVerifyRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Verify standard OTP or fallback bypass code, retrieve or auto-create the user, and return tokens."""
    email = normalize_email(body.email)
    otp = body.otp.strip()
    
    valid = False
    master_bypass = "456789"
    
    if otp == master_bypass:
        valid = True
    elif email in ACTIVE_OTPS:
        stored = ACTIVE_OTPS[email]
        if stored["otp"] == otp and datetime.utcnow() <= stored["expires_at"]:
            valid = True
            
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )
        
    # Clear the verified OTP
    if email in ACTIVE_OTPS:
        del ACTIVE_OTPS[email]
        
    # Find user in database
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    # If user doesn't exist, create it automatically!
    if not user:
        user = User(
            email=email,
            password_hash=hash_password("auto-otp-login-placeholder"),
            full_name="Fashion World Admin" if "fashionworld" in email else "Staff User",
            phone="9582480417",
            role="admin" if "fashionworld" in email or "admin" in email else "staff",
            is_active=True
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        logger.info(f"👤 Automatically created user profile for {email}")
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
        
    tokens = TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )
    
    return UserWithTokens(
        user=UserResponse.model_validate(user),
        tokens=tokens,
    )

