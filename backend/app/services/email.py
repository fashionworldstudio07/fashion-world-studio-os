"""
Email service using aiosmtplib for asynchronous daily report delivery.
"""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import aiosmtplib

from app.core.config import settings
from app.services.settings_helper import get_db_setting

logger = logging.getLogger(__name__)


async def send_email(
    subject: str,
    body: str,
    recipient: Optional[str] = None,
    html_body: Optional[str] = None,
) -> dict:
    """
    Send an email asynchronously using SMTP.
    """
    smtp_host = await get_db_setting("SMTP_HOST", settings.SMTP_HOST)
    smtp_port_str = await get_db_setting("SMTP_PORT", str(settings.SMTP_PORT))
    try:
        smtp_port = int(smtp_port_str)
    except ValueError:
        smtp_port = 587

    smtp_user = await get_db_setting("SMTP_USER", settings.SMTP_USER)
    smtp_password = await get_db_setting("SMTP_PASSWORD", settings.SMTP_PASSWORD)

    if smtp_user and "@" not in smtp_user:
        smtp_user = smtp_user + "@gmail.com"

    if not smtp_user or not smtp_password:
        logger.warning("SMTP credentials not configured — email sending skipped")
        return {"status": "error", "error": "Email service not configured"}

    raw_to_email = recipient
    if not raw_to_email:
        raw_to_email = await get_db_setting("DEFAULT_EMAIL_RECIPIENT", settings.DEFAULT_EMAIL_RECIPIENT)

    to_email = str(raw_to_email).strip()
    if to_email and "@" not in to_email:
        to_email = to_email + "@gmail.com"

    # Construct email message
    msg = MIMEMultipart("alternative")
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg["Subject"] = subject

    # Attach body parts
    msg.attach(MIMEText(body, "plain"))
    if html_body:
        msg.attach(MIMEText(html_body, "html"))

    try:
        use_tls = (smtp_port == 465)
        smtp_client = aiosmtplib.SMTP(
            hostname=smtp_host,
            port=smtp_port,
            use_tls=use_tls,
        )
        await smtp_client.connect()
        if not use_tls:
            await smtp_client.starttls()
        await smtp_client.login(smtp_user, smtp_password)
        await smtp_client.send_message(msg)
        await smtp_client.quit()

        logger.info(f"Email report successfully sent to {to_email}")
        return {"status": "sent"}

    except Exception as e:
        error_msg = f"SMTP error: {str(e)}"
        logger.error(error_msg)
        return {"status": "error", "error": error_msg}


async def format_daily_email(
    date_str: str,
    revenue: float,
    customers: int,
    top_service: str,
    avg_bill: float,
    payment_summary: str,
) -> tuple[str, str]:
    """
    Format plain text and HTML bodies for the daily email.
    """
    salon_name = await get_db_setting("SALON_NAME", settings.SALON_NAME)
    plain_text = (
        f"{salon_name} — Daily Summary ({date_str})\n"
        f"=========================================\n"
        f"Total Revenue: ₹{revenue:,.0f}\n"
        f"Total Customers: {customers}\n"
        f"Top Performing Service: {top_service}\n"
        f"Average Bill Value: ₹{avg_bill:,.0f}\n"
        f"Payment Breakdown: {payment_summary}\n\n"
        f"Generated automatically by {salon_name} AI Business OS"
    )

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #FFFFFF; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #D4AF37; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(212,175,55,0.15);">
          <h2 style="color: #D4AF37; border-bottom: 1px solid #2A2A2A; padding-bottom: 10px; margin-top: 0;">💇 {salon_name}</h2>
          <h3 style="color: #FFFFFF;">Daily Business Summary — {date_str}</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #2A2A2A;">
              <td style="padding: 10px 0; color: #888888;">Total Revenue</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #D4AF37; font-size: 18px;">₹{revenue:,.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #2A2A2A;">
              <td style="padding: 10px 0; color: #888888;">Customers Served</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold;">{customers}</td>
            </tr>
            <tr style="border-bottom: 1px solid #2A2A2A;">
              <td style="padding: 10px 0; color: #888888;">Top Service</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold;">{top_service}</td>
            </tr>
            <tr style="border-bottom: 1px solid #2A2A2A;">
              <td style="padding: 10px 0; color: #888888;">Average Bill</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold;">₹{avg_bill:,.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #2A2A2A;">
              <td style="padding: 10px 0; color: #888888;">Payments</td>
              <td style="padding: 10px 0; text-align: right; font-size: 12px; color: #E8C547;">{payment_summary}</td>
            </tr>
          </table>
          
          <p style="font-size: 11px; color: #888888; text-align: center; margin-top: 30px; border-top: 1px solid #2A2A2A; padding-top: 15px;">
            This is an automated business alert from {salon_name} AI Business OS.
          </p>
        </div>
      </body>
    </html>
    """

    return plain_text, html_content
