import httpx

async def main():
    # Login as admin
    login_payload = {
        "email": "admin@fashionworld.com",
        "password": "admin123"
    }
    
    url = "http://127.0.0.1:8000/api"
    
    async with httpx.AsyncClient() as client:
        # FastAPI login expects JSON body
        r = await client.post(f"{url}/auth/login", json=login_payload)
        print("Login status:", r.status_code)
        if r.status_code != 200:
            print("Login failed:", r.text)
            return
            
        token_data = r.json()
        token = token_data["tokens"]["access_token"]
        
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        # Get dashboard summary
        r = await client.get(f"{url}/dashboard/summary", headers=headers)
        print("\nDashboard Summary status:", r.status_code)
        import json
        print(json.dumps(r.json(), indent=2))

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
