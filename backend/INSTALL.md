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
  - `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT token expiration time in minutes (default: 30 days).
- **Frontend URL & Communications**:
  - `FRONTEND_URL`: URL of the frontend application (used in emails and push notification redirection links).
- **Default Accounts**:
  - `DEFAULT_SUPERADMIN_EMAIL` / `DEFAULT_SUPERADMIN_PASSWORD`: Default credentials generated on database startup for the Super Administrator.
  - `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`: Default credentials generated on database startup for the regular Administrator.
- **Database selection (`DB_TYPE`)**:
  - `"sqlite"`: Uses local `psychology.db`.
  - `"postgresql"`: Uses PostgreSQL with connection parameters specified in the `.env` file.
- **AI/LLM models**:
  - `OPENAI_API_KEY_PSICOUJA`: OpenAI API credential key.
  - `BASE_URL_MODELS_PSICOUJA`: Custom API endpoint for local university models.
- **Email (SMTP)**:
  - `SMTP_HOST` / `SMTP_PORT` / `SMTP_SENDER` / `PASSWORD`: Parameterized email server config to automatically send access credentials and reset emails to therapists/patients.
- **Firebase integration**:
  - `FIREBASE_CREDENTIALS_PATH`: Optional path to service account Firebase credentials JSON. Defaults to the local `psicouja-...json` certificate file.
  - `FIREBASE_WEBPUSH_LINK`: Destination link for FCM push notifications (falls back to `FRONTEND_URL`).

### 4. Database Initialization
The application uses **SQLModel** and automatically initializes the database schema (and default superadmin users) on startup via the `lifespan` event in `main.py`.

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
