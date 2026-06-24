"""Test endpoints — verify Gemini and WhatsApp connectivity."""

from fastapi import APIRouter
from app.services.ai_engine import test_gemini_connection
from app.services.whatsapp import test_whatsapp_connection

router = APIRouter(prefix="/test", tags=["Test"])


@router.get("/gemini")
async def test_gemini():
    """Test Gemini API connectivity."""
    return await test_gemini_connection()


@router.get("/whatsapp")
async def test_whatsapp():
    """Test WhatsApp API connectivity."""
    return await test_whatsapp_connection()


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {"status": "healthy", "service": "Fashion World Studio AI Business OS"}
