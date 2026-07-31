# Installation Guide

Follow these steps to set up and run the Psicouja Backend project locally.

## 📋 Prerequisites
- **Python 3.8** or higher
- **pip** (Python package installer)
- (Recommended) **SQLite** for development or **PostgreSQL** for production.

## 🛠️ Step-by-Step Setup

### 1. Create a Virtual Environment
It is highly recommended to use a virtual environment to manage dependencies and avoid conflicts.

```powershell
# On Windows
python -m venv venv

# Activate it
.\venv\Scripts\activate
```

```bash
# On macOS/Linux
python3 -m venv venv

# Activate it
source venv/bin/activate
```

### 2. Install Dependencies
Install all required packages listed in the `requirements.txt` file.

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add the necessary configuration. You can copy the provided `.env.example` as a template:

```bash
cp .env.example .env
```

Key configuration parameters include:
- **Server configuration**:
  - `HOST`: Host to bind the server (default: `0.0.0.0`).
  - `PORT`: Port to run the FastAPI server (default: `8001`).
  - `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (default: `*`).
  - `SECRET_KEY`: Security secret key to sign JWT tokens.
  - `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT token expiration time in minutes (default: 43200 / 30 days).
- **Frontend URL & Communications**:
  - `FRONTEND_URL`: URL of the frontend application (used in emails and push notification redirection links).
- **Default Accounts**:
  - `DEFAULT_SUPERADMIN_EMAIL` / `DEFAULT_SUPERADMIN_PASSWORD`: Default credentials generated on database startup for the Super Administrator.
  - `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`: Default credentials generated on database startup for the regular Administrator.
- **Database selection (`DB_TYPE`)**:
  - `"sqlite"`: Uses local zero-config `psychology.db`.
  - `"postgresql"`: Uses PostgreSQL with connection parameters specified in `.env` (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`).
- **LLM / AI Model Integration**:
  - `OPENAI_API_KEY_PSICOUJA`: API key for OpenAI-compatible endpoint.
  - `BASE_URL_MODELS_PSICOUJA`: Base endpoint URL for local/remote LLM service.
  - `MODEL_PSICOUJA` / `MODEL_QWEN` / `MODEL_GEMMA`: Configured model names for clinical client simulation and supervisor suggestions.
- **Firebase & SMTP Email**:
  - `FIREBASE_CREDENTIALS_PATH`: Path to Firebase service account JSON key file (`firebase-adminsdk.json`).
  - `FIREBASE_WEBPUSH_LINK`: Web push redirection target URL.
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SENDER`, `PASSWORD`: SMTP server credentials for password resets and automated email alerts.

### 4. Database Setup & Administrative Utilities

The application uses **SQLModel** and automatically initializes tables and default superadmin accounts on backend startup via `main.py`.

#### Option A: Local SQLite (Default / Zero-Config)
Set `DB_TYPE=sqlite` in `.env`. No Docker or external database service is required.

#### Option B: PostgreSQL with Docker Compose
1. Ensure Docker Desktop / Docker daemon is running.
2. In `.env`, set:
   ```env
   DB_TYPE=postgresql
   POSTGRES_USER=psicouja
   POSTGRES_PASSWORD=psicouja_secret
   POSTGRES_DB=psicouja
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   ```
3. Start the PostgreSQL service and automatic daily backup runner:
   ```bash
   docker compose up -d
   ```

#### 🛠️ Data Migration & Backups

* **Migrate from SQLite to PostgreSQL**:
  ```bash
  python scripts/migrate_to_postgres.py
  ```
* **Export AI Session Logs to JSONL**:
  ```bash
  python scripts/export_to_jsonl.py
  ```
* **Manual Database Backups & Restores**:
  ```powershell
  # Backup (Windows PowerShell)
  .\scripts\backup_db.ps1

  # Restore (Windows PowerShell)
  .\scripts\restore_db.ps1
  ```

### 5. Running the Application

There are two ways to start the server:

**Option A: Directly with Python**
```bash
python main.py
```

**Option B: Using Uvicorn (Recommended for Development)**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

The API will be available at [http://localhost:8001](http://localhost:8001).

## ✅ Verification
Check the health of the application by visiting:
- [http://localhost:8001/docs](http://localhost:8001/docs) to see the API documentation.
- The root endpoint [http://localhost:8001/](http://localhost:8001/) should return a "running" message.
