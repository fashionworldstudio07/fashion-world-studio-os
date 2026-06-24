"""
Hybrid AI Engine — handles all AI-powered features:
  1. Smart text/voice entry extraction (Local rule-based NLP + API fallbacks)
  2. Business insights generation (Claude via Anthropic)
"""

import json
import logging
import re
from datetime import datetime, timedelta
from typing import Optional

import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini
_model = None


def _get_model():
    """Lazy-load Gemini model."""
    global _model
    if _model is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _model = genai.GenerativeModel("gemini-1.5-flash")
    return _model


# ── Default salon services (for extraction context) ─────
DEFAULT_SERVICES = [
    "Hair Cut", "Hair Spa", "Hair Color", "Hair Smoothening",
    "Keratin", "Rebonding", "Facial", "Cleanup", "Waxing",
    "Threading", "Manicure", "Pedicure", "Makeup", "Bridal Makeup",
]


def extract_locally(raw_text: str, services_list: list[str]) -> dict:
    """
    Local rule-based NLP extractor running completely offline.
    Extracts customer name, services, amount, payment mode, date, and phone.
    """
    text_lower = raw_text.lower()

    # 1. Extract Services
    sorted_services = sorted(services_list, key=len, reverse=True)
    extracted_services = []

    # Create normalized versions for comparison
    temp_text = text_lower.replace(" ", "").replace("-", "").replace(".", "")
    matched_services = []

    for s in sorted_services:
        s_norm = s.lower().replace(" ", "").replace("-", "").replace(".", "")
        if s_norm in temp_text:
            is_sub = False
            for matched in matched_services:
                if s_norm in matched.lower().replace(" ", "").replace("-", "").replace(".", ""):
                    is_sub = True
                    break
            if not is_sub:
                extracted_services.append(s)
                matched_services.append(s)
                temp_text = temp_text.replace(s_norm, "", 1)

    # 2. Extract Payment Mode
    payment_mode = "cash"
    if any(x in text_lower for x in ["upi", "gpay", "google pay", "phonepe", "paytm", "online", "net banking", "netbanking"]):
        payment_mode = "upi"
    elif any(x in text_lower for x in ["card", "credit", "debit", "pos", "machine"]):
        payment_mode = "card"
    elif any(x in text_lower for x in ["cash", "rokda", "rokar", "paise"]):
        payment_mode = "cash"

    # 3. Extract Phone Number
    phone = None
    phone_match = re.search(r"\b(?:\+91|0)?\s*([6-9]\d{9})\b", raw_text)
    if phone_match:
        phone = phone_match.group(1)

    # 4. Extract Amount
    words_map = {
        "one thousand": 1000, "two thousand": 2000, "three thousand": 3000,
        "four thousand": 4000, "five thousand": 5000, "ten thousand": 10000,
        "twelve hundred": 1200, "fifteen hundred": 1500, "eighteen hundred": 1800,
        "twenty five hundred": 2500, "ek hazaar": 1000, "do hazaar": 2000,
        "teen hazaar": 3000, "char hazaar": 4000, "paanch hazaar": 5000,
        "dedh hazaar": 1500, "dhai hazaar": 2500, "ek sau": 100, "do sau": 200,
        "teen sau": 300, "char sau": 400, "paanch sau": 500, "chhe sau": 600,
        "saat sau": 700, "aath sau": 800, "nau sau": 900
    }

    amount = None
    for word, val in words_map.items():
        if word in text_lower:
            amount = val
            break

    if amount is None:
        clean_text_for_amt = raw_text
        if phone:
            clean_text_for_amt = clean_text_for_amt.replace(phone, "")

        # Regex to find numbers
        numbers = re.findall(r"\b\d+[\d,]*\b", clean_text_for_amt)
        for num_str in numbers:
            val = int(num_str.replace(",", ""))
            is_explicit = False
            idx = clean_text_for_amt.find(num_str)
            if idx > 0:
                context_prefix = clean_text_for_amt[max(0, idx-15):idx].lower()
                if any(x in context_prefix for x in ["rs", "₹", "rupees", "bill", "total", "amount", "paid", "rupay", "rupaye", "rs.", "amount:"]):
                    is_explicit = True

            # Standard salon bill ranges, filtering out common date years
            if is_explicit or (50 <= val <= 25000 and val not in [2024, 2025, 2026]):
                amount = val
                break

    # 5. Extract Customer Name
    customer_name = None
    stop_words = [
        "came", "aayi", "aaya", "for", "visited", "had", "got", "completed", "aur", "and",
        "ke", "ne", "ko", "bill", "total", "paid", "dono", "facial", "hair", "spa", "cut",
        "color", "smoothening", "keratin", "rebonding", "cleanup", "waxing", "threading",
        "manicure", "pedicure", "makeup", "bridal"
    ]
    for s in services_list:
        stop_words.append(s.lower())
        stop_words.append(s.lower().replace(" ", ""))

    earliest_stop = len(raw_text)
    for sw in stop_words:
        pattern = r"\b" + re.escape(sw) + r"\b"
        m = re.search(pattern, text_lower)
        if m and m.start() < earliest_stop:
            earliest_stop = m.start()

    name_part = raw_text[:earliest_stop].strip()
    name_part = re.sub(r"[^a-zA-Z\s]", "", name_part).strip()

    words = name_part.split()
    filtered_words = []
    exclude_words = ["total", "bill", "rs", "rupees", "upi", "card", "cash", "yesterday", "today", "tomorrow", "kal", "parso", "aaj"]
    for w in words:
        if w.lower() not in exclude_words and len(w) > 1:
            filtered_words.append(w)

    if filtered_words:
        customer_name = " ".join(filtered_words).title()
    else:
        customer_name = "Walk-in Customer"

    # 6. Extract Service Date
    service_date = datetime.now().strftime("%Y-%m-%d")
    if "yesterday" in text_lower or "kal" in text_lower:
        service_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    elif "parso" in text_lower or "day before" in text_lower:
        service_date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")

    # Calculate Confidence
    confidence = 0.4
    if amount is not None:
        confidence += 0.25
    if extracted_services:
        confidence += 0.25
    if customer_name != "Walk-in Customer":
        confidence += 0.1

    return {
        "customer_name": customer_name,
        "phone": phone,
        "services": extracted_services if extracted_services else ["Hair Cut"],
        "total_amount": amount if amount is not None else 100,
        "payment_mode": payment_mode,
        "notes": f"Locally parsed input — raw: {raw_text}",
        "service_date": service_date,
        "confidence": round(confidence, 2)
    }


async def extract_entry_data(raw_text: str, available_services: list[str] | None = None) -> dict:
    """
    Extract structured billing data from natural language input.
    Uses local rule-based parsing first; falls back to Claude or Gemini APIs if necessary.
    """
    services_list = available_services or DEFAULT_SERVICES

    # Run Local Extractor first
    local_result = extract_locally(raw_text, services_list)

    # If the local parser succeeded with high confidence, return immediately
    if local_result["confidence"] >= 0.90:
        logger.info(f"Local NLP extraction successful (High Confidence): {local_result}")
        return local_result

    # Otherwise, prepare to call APIs
    from datetime import datetime
    today_str = datetime.now().strftime("%A, %d %B %Y")
    services_str = ", ".join(services_list)

    prompt = f"""You are a smart salon billing assistant for "{settings.SALON_NAME}" in {settings.SALON_CITY}, India.

Extract structured billing data from the following input. The input may be typed text or a browser speech-to-text transcript in English, Hindi, or Hinglish (mix of Hindi and English).

Available salon services: {services_str}

CURRENT DATE REFERENCE: Today is {today_str}.

RULES:
1. Match service names to the closest available service. Be flexible with spelling/language.
2. Extract the total amount (handle words like "eighteen hundred" = 1800, "dedh hazaar" = 1500).
3. Detect payment mode: cash, upi, card. Default to "cash" if not mentioned.
4. Extract customer name if mentioned.
5. Extract phone number if mentioned.
6. If a service is not in the list, still include it as-is.
7. Parse references to the date when the service took place relative to today ({today_str}):
   - "aaj", "today", "aaj ka" -> Today's date in YYYY-MM-DD format.
   - "kal", "yesterday", "kal ka" -> Yesterday's date in YYYY-MM-DD format.
   - "parso", "day before yesterday" -> 2 days ago in YYYY-MM-DD format.
   - Specific day numbers (e.g. "15 tarikh", "15th", "15 june", "15/06", "15-06") -> The corresponding date in YYYY-MM-DD format. Default to current year unless specified.
   - Default to null if no date reference or past keyword is mentioned.
   - Never return a future date.
8. Voice transcripts may have no punctuation and may contain filler words. Focus on the salon facts.

INPUT: "{raw_text}"

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{{
    "customer_name": "string or null",
    "phone": "string or null",
    "services": ["service1", "service2"],
    "total_amount": number_or_null,
    "payment_mode": "cash|upi|card",
    "notes": "any extra info or null",
    "service_date": "YYYY-MM-DD or null",
    "confidence": 0.0_to_1.0
}}"""

    # 1. Try Claude first if key is present (unlimited/highly reliable)
    api_key = settings.ANTHROPIC_API_KEY
    if api_key:
        import httpx
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1024,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    resp_data = response.json()
                    text = resp_data["content"][0]["text"].strip()
                    if text.startswith("```"):
                        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    text = text.strip()
                    if text.startswith("json"):
                        text = text[4:].strip()
                    result = json.loads(text)
                    logger.info(f"Claude extraction successful: {result}")
                    return result
                logger.warning(f"Claude extraction status code {response.status_code}: {response.text}")
        except Exception as e:
            logger.warning(f"Claude extraction error: {e}")

    # 2. Try Gemini (default fallback)
    try:
        model = _get_model()
        response = await model.generate_content_async(prompt)
        text = response.text.strip()

        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()

        result = json.loads(text)
        logger.info(f"Gemini extraction successful: {result}")
        return result

    except Exception as e:
        logger.error(f"API extraction failed (Gemini error: {e}). Returning local parse fallback.")
        # If API failed, return the local result anyway!
        return local_result


def generate_local_insights(data_context: str) -> list[str]:
    """
    Generate number-focused, rule-based business insights locally.
    Does not require any internet connection or API keys.
    """
    today_rev_match = re.search(r"Today:\s*₹?([0-9,]+)", data_context)
    week_rev_match = re.search(r"This Week:\s*₹?([0-9,]+)", data_context)
    month_rev_match = re.search(r"This Month:\s*₹?([0-9,]+)", data_context)
    repeat_rate_match = re.search(r"Repeat customer rate:\s*([0-9.]+)%", data_context)
    avg_bill_match = re.search(r"Average bill value:\s*₹?([0-9,]+)", data_context)
    
    today_rev = float(today_rev_match.group(1).replace(",", "")) if today_rev_match else 0.0
    week_rev = float(week_rev_match.group(1).replace(",", "")) if week_rev_match else 0.0
    month_rev = float(month_rev_match.group(1).replace(",", "")) if month_rev_match else 0.0
    repeat_rate = float(repeat_rate_match.group(1)) if repeat_rate_match else 0.0
    avg_bill = float(avg_bill_match.group(1).replace(",", "")) if avg_bill_match else 0.0
    
    # Extract payment methods
    upi_amt = 0.0
    cash_amt = 0.0
    card_amt = 0.0
    for line in data_context.split("\n"):
        if "upi" in line.lower() or "online" in line.lower():
            m = re.search(r"₹?([0-9,]+)$", line)
            if m: upi_amt = float(m.group(1).replace(",", ""))
        elif "cash" in line.lower():
            m = re.search(r"₹?([0-9,]+)$", line)
            if m: cash_amt = float(m.group(1).replace(",", ""))
        elif "card" in line.lower():
            m = re.search(r"₹?([0-9,]+)$", line)
            if m: card_amt = float(m.group(1).replace(",", ""))

    # Find top service
    top_service_name = None
    top_service_revenue = 0.0
    in_top_services = False
    for line in data_context.split("\n"):
        if "Top Services" in line:
            in_top_services = True
            continue
        if in_top_services and line.strip().startswith("-"):
            parts = line.split(":")
            if len(parts) >= 2:
                name = parts[0].replace("-", "").strip()
                rev_m = re.search(r"₹?([0-9,]+)\s*revenue", parts[1])
                if rev_m:
                    rev = float(rev_m.group(1).replace(",", ""))
                    if rev > top_service_revenue:
                        top_service_revenue = rev
                        top_service_name = name
        elif in_top_services and not line.strip().startswith("-") and line.strip():
            in_top_services = False

    insights = []
    
    # 1. Revenue Insight
    if month_rev > 0:
        insights.append(f"Monthly revenue stands at ₹{month_rev:,.0f}, showing a steady growth trajectory driven by daily transactions.")
    else:
        insights.append("Set a target monthly revenue and push packages or combos to increase repeat sales.")

    # 2. Top Service Insight
    if top_service_name and top_service_revenue > 0:
        pct = (top_service_revenue / month_rev * 100) if month_rev > 0 else 0
        insights.append(f"{top_service_name} is the top revenue driver this month, contributing ₹{top_service_revenue:,.0f} ({pct:.1f}% of total).")
    else:
        insights.append("Promote trending haircare and skin services to boost early-week salon visits.")

    # 3. Repeat Customer Rate Insight
    if repeat_rate > 35:
        insights.append(f"Repeat customer rate is strong at {repeat_rate:.1f}%, indicating high customer satisfaction and retention.")
    elif repeat_rate > 0:
        insights.append(f"Repeat customer rate is currently {repeat_rate:.1f}%. Launch a weekend SMS or WhatsApp offer to increase revisit frequency.")
    else:
        insights.append("Build customer profiles and send feedback alerts to improve customer return rates.")

    # 4. Average Ticket Size / Bill Value
    if avg_bill > 1500:
        insights.append(f"Average bill value is premium at ₹{avg_bill:,.0f}. Continue recommending premium treatments like Keratin and Bridal packages.")
    elif avg_bill > 0:
        insights.append(f"Average bill value is ₹{avg_bill:,.0f}. Cross-sell small services (Threading, Waxing) to increase ticket size.")

    # 5. Payment Methods
    total_payment = upi_amt + cash_amt + card_amt
    if total_payment > 0:
        if upi_amt > cash_amt and upi_amt > card_amt:
            pct = (upi_amt / total_payment * 100)
            insights.append(f"UPI is the preferred payment mode, accounting for {pct:.1f}% of transactions. Ensure payment QR codes are easily accessible.")
        elif cash_amt > upi_amt and cash_amt > card_amt:
            pct = (cash_amt / total_payment * 100)
            insights.append(f"Cash payments account for {pct:.1f}% of total revenue. Encourage UPI payments to reduce cash handling.")
    
    # Fill remaining spots if needed
    while len(insights) < 4:
        insights.append("Review staff utilization and service duration to optimize chair turnover rates.")
        
    return insights[:6]


async def generate_business_insights(data_context: str) -> list[str]:
    """
    Generate AI business insights from aggregated salon data.
    Uses Claude (claude-3-5-sonnet-20241022) via Anthropic API.
    """
    import httpx

    prompt = f"""You are a business intelligence consultant for a beauty salon called "{settings.SALON_NAME}" in {settings.SALON_CITY}, India.

Based on the following business data, generate 4-6 actionable insights. Be specific with numbers and percentages.

Format each insight as a short, clear sentence. Focus on:
- Revenue trends
- Service popularity
- Payment patterns
- Customer behavior
- Growth opportunities

BUSINESS DATA:
{data_context}

Respond with a JSON array of insight strings:
["insight 1", "insight 2", ...]"""

    api_key = settings.ANTHROPIC_API_KEY
    if api_key:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1024,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    resp_data = response.json()
                    text = resp_data["content"][0]["text"].strip()

                    if text.startswith("```"):
                        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    text = text.strip()
                    if text.startswith("json"):
                        text = text[4:].strip()

                    return json.loads(text)
                logger.warning(f"Anthropic API returned error {response.status_code}: {response.text}")
        except Exception as e:
            logger.warning(f"Claude API insights failed: {e}")

    # Fallback to Gemini
    try:
        model = _get_model()
        response = await model.generate_content_async(prompt)
        text = response.text.strip()

        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()

        return json.loads(text)

    except Exception as e:
        logger.error(f"Gemini API insights failed: {e}. Falling back to high-quality local insights.")
        return generate_local_insights(data_context)



async def test_gemini_connection() -> dict:
    """Test API connectivity (Gemini/Claude). Returns status dict."""
    status_info = []

    # Test Claude if ANTHROPIC_API_KEY is present
    if settings.ANTHROPIC_API_KEY:
        import httpx
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "Reply: OK"}]
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    status_info.append("Claude AI: Connected")
                else:
                    status_info.append(f"Claude AI: Failed ({response.status_code})")
        except Exception as e:
            status_info.append(f"Claude AI: Error ({str(e)})")

    # Test Gemini
    try:
        model = _get_model()
        response = await model.generate_content_async("Reply with: OK")
        status_info.append("Gemini AI: Connected")
    except Exception as e:
        status_info.append(f"Gemini AI: Error ({str(e)})")

    joined_status = " | ".join(status_info)
    if "Connected" in joined_status:
        return {
            "status": "connected",
            "model": "Hybrid AI Engine",
            "response": joined_status,
        }
    else:
        return {
            "status": "error",
            "error": joined_status if joined_status else "No API keys configured",
        }
