# 🚀 Fashion World Studio AI Business OS — Production Deployment Next Steps

This document outlines the operational guidelines and tasks to move the completely implemented application into production.

---

## 📅 Action Plan

### 1. Environment & Secrets Management
- [ ] **Configure Production Keys:** Ensure all keys are configured in the host environment or a secure `.env` file:
  - `GEMINI_API_KEY`: For voice/text smart billing extraction.
  - `ANTHROPIC_API_KEY`: Optional fallback/alternative insights engine.
  - `WHATSAPP_ACCESS_TOKEN`: The permanent Meta Cloud API token.
  - `WHATSAPP_PHONE_NUMBER_ID`: The verified phone ID on Meta's WhatsApp Developer dashboard.
  - `SMTP_USER` & `SMTP_PASSWORD`: Valid sender credentials (e.g. Gmail App Password for `fashionworldstudio@gmail.com`).

### 2. Process Manager Setup (PM2 or Systemd)
- [ ] **Daemonize the Backend:** Configure a Systemd service or PM2 process descriptor to run Uvicorn.
  - Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`
  - Ensure it auto-restarts on system reboots.
- [ ] **Daemonize the Frontend:** Build and host using Nginx/Apache, or run a lightweight node server for preview/static files.
  - Build command: `npm run build` in `frontend` directory.
  - Point Nginx server block to the `frontend/dist` folder.

### 3. Nginx Reverse Proxy & SSL Configuration
- [ ] **Setup Nginx:** Route incoming web traffic through Nginx.
  - Forward `/api/*` request prefixes to `http://localhost:8000`.
  - Serve static frontend assets for all other routes.
- [ ] **Configure SSL (HTTPS):** Run Certbot (Let's Encrypt) to enforce secure connections.
  - Required for browser Web Speech API (voice recordings) on remote clients.

### 4. Database Backups
- [ ] **Setup Cron Backups:** Schedule a simple daily cron job to copy the SQLite `salon.db` database to a backup directory or cloud storage to prevent data loss.
