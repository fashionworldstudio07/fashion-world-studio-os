"""
WhatsApp Cloud API integration for automated report delivery.
"""

import logging
from typing import Optional

import httpx

from app.core.config import settings
from app.services.settings_helper import get_db_setting

logger = logging.getLogger(__name__)

WHATSAPP_API_URL = "https://graph.facebook.com/v21.0"


async def send_whatsapp_message(
    message: str,
    recipient: Optional[str] = None,
) -> dict:
    """
    Send a text message via WhatsApp Cloud API.

    Args:
        message: Text message to send
        recipient: Phone number with country code (e.g., '919582480417')
    """
    if not settings.WHATSAPP_ACCESS_TOKEN:
        return {"status": "error", "error": "WhatsApp not configured"}

    raw_to_number = recipient
    if not raw_to_number:
        raw_to_number = await get_db_setting("DEFAULT_WHATSAPP_RECIPIENT", settings.DEFAULT_WHATSAPP_RECIPIENT)

    # Clean and format phone number (ensure country code 91 is prepended for 10-digit numbers)
    to_number = "".join(c for c in str(raw_to_number) if c.isdigit())
    if len(to_number) == 10:
        to_number = "91" + to_number

    url = f"{WHATSAPP_API_URL}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"

    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {"body": message},
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            result = response.json()
            logger.info(f"WhatsApp message sent to {to_number}")
            return {"status": "sent", "response": result}
    except httpx.HTTPStatusError as e:
        error_msg = f"WhatsApp API error {e.response.status_code}: {e.response.text}"
        logger.error(error_msg)
        return {"status": "error", "error": error_msg}
    except Exception as e:
        logger.error(f"WhatsApp send error: {e}")
        return {"status": "error", "error": str(e)}


async def test_whatsapp_connection() -> dict:
    """Test WhatsApp API connectivity by sending a test message."""
    if not settings.WHATSAPP_ACCESS_TOKEN:
        return {"status": "not_configured", "error": "WhatsApp credentials not set"}

    salon_name = await get_db_setting("SALON_NAME", settings.SALON_NAME)
    salon_city = await get_db_setting("SALON_CITY", settings.SALON_CITY)
    salon_state = await get_db_setting("SALON_STATE", settings.SALON_STATE)

    test_msg = (
        f"🔔 *{salon_name}* — Test Message\n\n"
        f"✅ WhatsApp integration is working!\n"
        f"📍 {salon_city}, {salon_state}"
    )

    return await send_whatsapp_message(test_msg)


async def format_daily_report(
    date: str,
    revenue: float,
    customers: int,
    top_service: str,
    avg_bill: float,
    payment_summary: str,
) -> str:
    """Format a daily summary message for WhatsApp."""
    salon_name = await get_db_setting("SALON_NAME", settings.SALON_NAME)
    return (
        f"📊 *{salon_name}*\n"
        f"Daily Report — {date}\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"💰 Revenue: ₹{revenue:,.0f}\n"
        f"👥 Customers: {customers}\n"
        f"⭐ Top Service: {top_service}\n"
        f"📝 Avg Bill: ₹{avg_bill:,.0f}\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"💳 {payment_summary}\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"Powered by AI Business OS"
    )
