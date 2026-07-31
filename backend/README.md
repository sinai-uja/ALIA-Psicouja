# 🌟 Psicouja Backend — Clinical Psychology Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLModel](https://img.shields.io/badge/SQLModel-e91e63?style=for-the-badge)](https://sqlmodel.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge)](../LICENSE)

Welcome to the backend service for **Psicouja**, an advanced management and simulation platform for clinical psychology. Built using **FastAPI** and **SQLModel**, this API drives secure communications, Ecological Momentary Assessments (EMA), multi-agent LLM evaluations, and interactive therapist-patient training modules.

---

## 🚀 Overview

Psicouja bridges clinical psychology and modern digital tooling. The platform is designed to provide therapists with rich diagnostic and patient monitoring panels, while offering an interactive, AI-simulated patient environment (powered by state-of-the-art LLMs) to train therapists in clinical models such as **Cognitive Behavioral Therapy (CBT)** and **Acceptance and Commitment Therapy (ACT)**.

### 🌟 Key Features

* **🛡️ Secure Authentication & RBAC**: Complete Role-Based Access Control supporting Patients, Psychologists, and Superadministrators with cryptographically secure JWT tokens.
* **🤖 AI Simulated Patients**: A practice module allowing psychologists to interact with dynamic fictional patients (e.g., simulating anxiety, resistance, and specific life backgrounds) powered by local and custom LLMs.
* **📈 Real-Time Therapy Chat & AI Pilling**: Fast secure messaging between patients and therapists, integrated with an AI Supervisor recommending real-time therapy strategies (Validating, Socratic questioning, Action commitment, etc.).
* **📋 Ecological Momentary Assessments (EMA)**: Automated daily scheduling and delivery of clinical tracking questionnaires to monitor patient state indicators in real time.
* **📊 Clinical Analytics & Logs**: Dashboard calculations on online session time, active patient tracking, clinical history, and automated AI session summary generation.
* **🔔 Push Notifications**: Firebase Cloud Messaging (FCM) integration delivering real-time alerts for incoming chat messages and new questionnaire assignments.
* **🪵 Structural Audit Logging**: Secure and automated system logs tracking high-risk operations (such as logins, password changes, patient code resets, and database wipes).

---

## 🛠️ Technology Stack

* **Web Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous, high-performance API framework).
* **Database & ORM**: [SQLModel](https://sqlmodel.tiangolo.com/) (Seamless SQLAlchemy & Pydantic integration).
* **Asynchronous Tasks**: [APScheduler](https://apscheduler.readthedocs.io/) & `asyncio` for background EMA questionnaire execution.
* **Security & Tokens**: [python-jose](https://github.com/mpdavis/python-jose) for JWT signatures and [passlib](https://passlib.readthedocs.io/) (Bcrypt) for robust password hashing.
* **AI/LLM Integrations**: Asynchronous [OpenAI](https://github.com/openai/openai-python) client compatible with university-hosted local LLM clusters (Gemma, Qwen, custom-tuned ALIA model).
* **Notifications**: [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) for secure cross-device push delivery.

---

## 📁 Project Structure

```bash
backend/
├── main.py                 # Application entrypoint & FastAPI Lifespan (DB init)
├── database.py             # Database engines, SQLModel sessions & connection logic
├── models.py               # SQLModel schemas for DB tables & Pydantic validation
├── auth.py                 # JWT token generation, password verification, & RBAC dependencies
├── llm_service.py          # Asynchronous LLM client handlers & Prompt templates
├── logging_utils.py        # Central auditing helper functions
├── prompts/                # Modular LLM prompt templates (Markdown format)
│   ├── patient_system.md   # Patient simulation system instructions
│   ├── patient_default_personality.md # Persona baseline defaults
│   ├── therapist_system.md # AI therapist supervision prompt
│   ├── strategies_system.md# Clinical intervention tactics selector
│   ├── bitacora_system.md  # Session bitácora summary generator
│   └── generate_questionnaire.md # EMA questionnaire auto-generation
├── routers/                # 14 domain-specific API endpoint controllers
│   ├── auth_router.py      # Authentication & token endpoints
│   ├── superadmin_router.py# Platform analytics & user management
│   ├── patients_router.py  # Clinical patient management & risk tracking
│   ├── chat_router.py      # AI Client simulator & supervisor API
│   ├── assignments_router.py # EMA questionnaire assignment lifecycle
│   ├── sessions_router.py  # Therapy session records & bitácoras
│   ├── audit_logs_router.py# High-risk audit trail logging
│   └── ...                 # Notes, messages, notifications, stats, etc.
├── scripts/                # Utility & Database management scripts
│   ├── export_to_jsonl.py  # Dataset exporter for LLM fine-tuning & research
│   ├── migrate_to_postgres.py # SQLite to PostgreSQL data migration script
│   ├── backup_db.ps1 / .sh # Database backup scripts (PowerShell / Bash)
│   └── restore_db.ps1      # Database restoration script (PowerShell)
├── services/               # Internal business logic and background runners
│   ├── firebase_service.py # Firebase Cloud Messaging push notification service
│   └── scheduler.py        # Background APScheduler for EMA assignment timelines
└── utils/                  # Utility modules
    ├── assignment_utils.py # EMA assignment scheduling logic
    ├── sender.py           # Configurable SMTP email templates & SSL sender
    └── logger.py           # Loguru-based central logging configuration
```

---

## 🛠️ Utility & Database Management Scripts

The `/scripts` folder contains administrative utilities for data processing and database administration:

* **`export_to_jsonl.py`**: Exports all AI-assisted therapy interactions, supervisor suggestions, human edits, and patient inputs to JSON Lines (`.jsonl`) format. Crucial for academic research, evaluation, and LLM fine-tuning datasets.
  ```bash
  python scripts/export_to_jsonl.py
  ```
* **`migrate_to_postgres.py`**: Migrates all data from local `psychology.db` (SQLite) into a PostgreSQL instance while preserving primary key auto-increments and foreign key relationships.
  ```bash
  python scripts/migrate_to_postgres.py
  ```
* **`backup_db.ps1` / `backup_db.sh`**: Creates timestamped backups of SQLite (`psychology.db`) or PostgreSQL databases into `/backups`.
* **`restore_db.ps1`**: Restores the database from a selected backup file in `/backups`.

---

## 🔑 Default Initial Accounts

On server lifespan startup (`main.py`), the backend automatically checks and seeds the following default accounts if they do not exist:

| Role | Default Email | Default Password | Environment Variable Overrides |
| :--- | :--- | :--- | :--- |
| **Superadmin** | `superadmin@example.com` | `change-me-superadmin` | `DEFAULT_SUPERADMIN_EMAIL` / `DEFAULT_SUPERADMIN_PASSWORD` |
| **Admin** | `admin@example.com` | `change-me-admin` | `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` |

---

## 🤖 Modular LLM Prompt System (`prompts/`)

The backend utilizes modular Markdown prompt templates located in `backend/prompts/` to drive local and remote LLMs:
* **Patient Simulator**: `patient_system.md` & `patient_default_personality.md` define persona parameters, therapeutic frameworks (CBT/ACT), and emotional states.
* **AI Supervisor**: `therapist_system.md`, `strategies_system.md`, `strategies_instructions.md` generate real-time therapeutic tactic suggestions (Validation, Socratic questioning, Action commitment, etc.).
* **Session & Questionnaire Summaries**: `bitacora_system.md` and `session_summary_system.md` construct clinical bitácoras from therapy session transcripts.

---

## ⚙️ Installation & Quick Start

For detailed environment configuration, dependency guides, and custom environments, please read the [INSTALL.md](INSTALL.md) guide.

### Quick Commands

1. **Clone & Navigate**:
   ```bash
   cd backend
   ```

2. **Virtual Environment**:
   ```bash
   python -m venv venv
   # Activate on Windows:
   .\venv\Scripts\activate
   # Activate on macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Packages**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment File**:
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

5. **Database Setup**:
   * **SQLite (Default)**: Set `DB_TYPE=sqlite` in `.env`. No external installation required; database file is created automatically as `psychology.db`.
   * **PostgreSQL via Docker Compose**: Set `DB_TYPE=postgresql` in `.env` and run Docker Compose to launch PostgreSQL 16 and automated daily backups:
     ```bash
     docker compose up -d
     ```

6. **Run Development Server**:
   ```bash
   python main.py
   ```

---

## 📖 API Documentation

FastAPI automatically generates interactive, self-documenting APIs. Once your local server is up and running (default: `http://localhost:8001`), you can explore the contract details at:

* **Swagger UI**: [http://localhost:8001/docs](http://localhost:8001/docs)
* **ReDoc Visualizer**: [http://localhost:8001/redoc](http://localhost:8001/redoc)

---

## 🔒 Security & Environment Configuration

The backend is fully parameterized using a strict `.env` strategy to guarantee secure production builds:
* **Secret Rotation**: Custom `SECRET_KEY` variables can be set to override default development keys securely.
* **CORS Safe Mode**: Origins are parsed dynamically via the `CORS_ALLOWED_ORIGINS` key.
* **Default Database Isolation**: Supports both rapid local development (`SQLite`) and heavy multi-user deployments (`PostgreSQL`) through `DB_TYPE` toggles.
