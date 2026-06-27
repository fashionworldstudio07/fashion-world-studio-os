# 📘 Fashion World Studio — User & Credentials Guide

Welcome to the **Fashion World Studio AI Business OS** user guide. This document contains all the login credentials, service URLs, and API tokens used by the application, along with a quick start guide on how to run it.

---

## 🔐 Default Admin Credentials

Use these credentials to sign in on the login page:

* **Primary Account:**
  * **Email:** `fashionworldstudio07@gmail.com`
  * **Password:** `admin123`
* **Legacy/Fallback Account:**
  * **Email:** `admin@fashionworld.com`
  * **Password:** `admin123`

---

## 🌐 Application Deployment Links

* **Frontend Netlify Deployments (Production):**
  * Primary: [https://fashionworldstudio.netlify.app](https://fashionworldstudio.netlify.app)
  * Secondary: [https://fashion-world-studio-v2.netlify.app](https://fashion-world-studio-v2.netlify.app)
  * Sandbox: [https://willowy-raindrop-89dfca.netlify.app](https://willowy-raindrop-89dfca.netlify.app)
* **Backend API Server (Render Host):**
  * Base Endpoint: `https://fashion-world-studio-backend.onrender.com`
  * API Documentation (Swagger UI): [https://fashion-world-studio-backend.onrender.com/docs](https://fashion-world-studio-backend.onrender.com/docs)

---

## ⚡ Local Development Addresses

* **Frontend Client (Vite Dev Server):** [http://localhost:5173](http://localhost:5173)
* **Backend API (Uvicorn Dev Server):** [http://localhost:8000](http://localhost:8000)
  * Local Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔑 Database & API Configurations (Secrets)

> [!IMPORTANT]
> The raw secrets and API keys are stored securely in your local root `.env` file (`c:\Antigravity\FW management app\.env`) which is not pushed to GitHub to prevent security leaks. 

### 1. Database Connections
* **Database Host:** Supabase PostgreSQL
* **Connection String Placeholder:**
  `postgresql+asyncpg://postgres:[PASSWORD]@db.vshvbpxasuejpiqozimf.supabase.co:5432/postgres` (Real password is in your local `.env` file)

### 2. Generative AI Settings
* **Gemini API Key:** Refer to `GEMINI_API_KEY` in your local `.env` file.

### 3. Meta / WhatsApp Developer Credentials
* **WhatsApp Phone Number ID:** `1208643578996320`
* **WhatsApp Business Account ID:** `1888670058478031`
* **WhatsApp Permanent Access Token:** Refer to `WHATSAPP_ACCESS_TOKEN` in your local `.env` file.

---

## 🚀 How to Run the App Locally

If you need to launch the dev servers manually on your local system:

### 1. Run the Backend API Server
Navigate to the `backend/` directory in your terminal and execute:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Run the Frontend Dev Server
Navigate to the `frontend/` directory in your terminal and execute:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
