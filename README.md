# 🚀 Fashion World Studio AI Business OS

A production-ready, full-stack Business Operating System (OS) designed to streamline operations, customer catalogs, dynamic financial tracking, and AI-driven automation for a business studio.

Built with a fast, modern asynchronous backend (**FastAPI + Python**) and a responsive, interactive frontend (**React + TypeScript + Tailwind CSS**). The system integrates **Google Gemini AI** for voice/text smart billing extraction and automated daily business insights, alongside automated daily reports sent via the **Meta WhatsApp Cloud API** and secure **SMTP/Email**.

---

## ✨ Features

- **🤖 AI-Driven Smart Entry:** Natural language voice recording and text parsing (supporting English, Hindi, and Hinglish inputs) to automatically extract services, amounts, and payment methods. Powered by the Gemini AI API.
- **📊 Real-time Analytics Dashboard:** Dynamic KPI metric cards, detailed charts built with Recharts, and automated daily AI business analysis recommendations.
- **📱 Meta WhatsApp Cloud API Integration:** Automated nightly dispatch of daily business performance summaries, transaction totals, and active metrics to verified WhatsApp targets.
- **📧 Advanced Email Reporting (SMTP):** Background worker runner that sends structured end-of-day SMTP emails via secure STARTTLS (Port 587) or SSL/TLS (Port 465).
- **🔒 OTP-Based Secure Authentication:** Password-less JWT secure login using temporary Email One-Time Passwords (OTPs) with fallback password support.
- **📁 Document Exports:** Instant server-side generation and streaming of dynamic Excel workbooks (`.xlsx`) and styled PDF logs for transaction histories.
- **🕒 Background Automated Tasks:** APScheduler daemon that automatically calculates and logs daily financial metrics and updates database catalogs overnight.

---

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **Database ORM:** SQLAlchemy 2.0 (Declarative Async Mappings)
- **Database Engines:** SQLite (Development) / PostgreSQL (Production)
- **Background Tasks:** APScheduler (Advanced Python Scheduler)
- **Email Dispatch:** aiosmtplib

### Frontend
- **Framework:** React 19 + TypeScript (Vite bundler)
- **State Management:** Zustand
- **Charting & UI Components:** Recharts + Lucide React
- **Styling:** Tailwind CSS

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/           # API router endpoints (Auth, Transactions, Customers, etc.)
│   │   ├── core/          # Configuration, security, database sessions, and schedulers
│   │   ├── models/        # SQLAlchemy database model definitions
│   │   ├── schemas/       # Pydantic models for data validation
│   │   └── services/      # Gemini AI extraction, WhatsApp, Email, & spreadsheet exports
│   ├── requirements.txt   # Python project dependencies
│   └── .env.example       # Example environment variables template
└── frontend/
    ├── src/
    │   ├── components/    # Reusable UI widgets (Layouts, Modals, Cards)
    │   ├── pages/         # Page components (Dashboard, Smart Entry, Customers, etc.)
    │   └── services/      # Axios API request clients
    ├── package.json       # Node package configurations
    └── vite.config.ts     # Vite bundler configurations
```

---

## 🚀 Installation & Local Development

### 1. Backend Setup
Navigate to the `backend` directory, create a virtual environment, and install dependencies:

```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

#### Database Setup
Create a `.env` file in the `backend` directory based on `.env.example` and run migrations or initialization script:
```bash
python check_db.py
```
This initializes your SQLite database (`salon.db`) and seeds the default admin credentials.

Start the FastAPI development server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be available locally at `http://127.0.0.1:8000/docs`.

---

### 2. Frontend Setup
Navigate to the `frontend` directory and install the Node packages:

```bash
cd ../frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
The app will run locally at `http://localhost:5173`.

---

## ⚙️ Environment Variables

Configure the following environment variables in your backend `.env` file:

```env
# Server
PORT=8000
DATABASE_URL=sqlite+aiosqlite:///./salon.db  # Change to postgresql+asyncpg://... for production

# Security
JWT_SECRET_KEY=your_jwt_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Meta WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# SMTP/Email Config
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

---

## 🚢 Production Deployment

### Backend Deployment (Render / Heroku / VPS)
1. Run Uvicorn in production mode:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```
2. For database reliability, switch the `DATABASE_URL` to a hosted PostgreSQL instance.

### Frontend Deployment (Nginx / Vercel / Netlify)
Build static production files:
```bash
npm run build
```
This outputs compiled, optimized assets to the `dist` directory, which can be served by Nginx or hosted on Vercel. Ensure Nginx routes all `/api/*` queries to your backend server port.
