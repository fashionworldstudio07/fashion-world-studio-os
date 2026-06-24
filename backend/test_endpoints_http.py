import httpx

def test_api():
    base_url = "http://127.0.0.1:8000/api"
    print("=== STARTING HTTP API AUDIT ===")
    
    # 1. Login
    login_url = f"{base_url}/auth/login"
    login_data = {"username": "admin@fashionworld.com", "password": "admin123"}
    try:
        r = httpx.post(login_url, data=login_data, timeout=5.0)
        print("Login Status:", r.status_code)
        if r.status_code != 200:
            print("Login failed:", r.text)
            return
        token_info = r.json()
        token = token_info["access_token"]
        print("Login Successful!")
    except Exception as e:
        print("Login request error:", e)
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get Dashboard Summary
    try:
        r = httpx.get(f"{base_url}/dashboard/summary", headers=headers, timeout=5.0)
        print("Dashboard summary status:", r.status_code)
        if r.status_code == 200:
            data = r.json()
            print("Dashboard KPI - Month Revenue:", data.get("kpi", {}).get("month_revenue"))
            print("Dashboard KPI - Today Revenue:", data.get("kpi", {}).get("today_revenue"))
    except Exception as e:
        print("Dashboard query error:", e)

    # 3. Generate Insights (should fall back to Gemini since Anthropic isn't set)
    try:
        print("Testing AI Insights generation (with Gemini fallback)...")
        r = httpx.get(f"{base_url}/insights/generate", headers=headers, timeout=30.0)
        print("Insights generation status:", r.status_code)
        if r.status_code == 200:
            print("AI Insights generated successfully:", r.json())
        else:
            print("AI Insights failed:", r.text)
    except Exception as e:
        print("Insights query error:", e)

    # 4. Get Customers list
    try:
        r = httpx.get(f"{base_url}/customers", headers=headers, timeout=5.0)
        print("Customers List Status:", r.status_code)
        if r.status_code == 200:
            customers = r.json().get("customers", [])
            print(f"Loaded {len(customers)} customers.")
    except Exception as e:
        print("Customers list query error:", e)

    # 5. Get settings list
    try:
        r = httpx.get(f"{base_url}/settings", headers=headers, timeout=5.0)
        print("Settings GET Status:", r.status_code)
        if r.status_code == 200:
            print("Settings loaded successfully!")
    except Exception as e:
        print("Settings query error:", e)

    # 6. Test Gemini connection
    try:
        r = httpx.get(f"{base_url}/test/gemini", timeout=10.0)
        print("Test Gemini Status:", r.status_code)
        if r.status_code == 200:
            print("Test Gemini payload:", r.json())
    except Exception as e:
        print("Test Gemini error:", e)

    # 7. Test WhatsApp connection
    try:
        r = httpx.get(f"{base_url}/test/whatsapp", timeout=15.0)
        print("Test WhatsApp Status:", r.status_code)
        if r.status_code == 200:
            print("Test WhatsApp payload:", r.json())
    except Exception as e:
        print("Test WhatsApp error:", e)

    print("=== END OF HTTP API AUDIT ===")

if __name__ == "__main__":
    test_api()
