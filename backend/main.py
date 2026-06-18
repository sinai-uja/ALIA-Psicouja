from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlmodel import Session, select
from dotenv import load_dotenv
import os
import asyncio
from services.scheduler import run_scheduler
from utils.logger import logger, LOGGING_CONFIG

load_dotenv()

from database import create_db_and_tables, migrate_db_schema, engine
from models import Psychologist, Questionnaire
from auth import hash_password

from routers import (
    auth_router,
    psychologists_router,
    patients_router,
    questionnaires_router,
    assignments_router,
    messages_router,
    notes_router,
    sessions_router,
    assessment_stats_router,
    audit_logs_router,
    dashboard_router,
    dashboard_router,
    chat_router,
    superadmin_router,
    notifications_router
)
from services.firebase_service import initialize_firebase

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    migrate_db_schema()
    
    # Create Default Super Admin if no users exist or specific superadmin is missing
    with Session(engine) as session:
        # Load from environment variables or use default fallbacks safely
        superadmin_email = os.getenv("DEFAULT_SUPERADMIN_EMAIL", "superadmin@example.com")
        superadmin_password = os.getenv("DEFAULT_SUPERADMIN_PASSWORD", "change-me-superadmin")
        
        # Check for 'superadmin' role user specifically
        super_admin = session.exec(select(Psychologist).where(Psychologist.email == superadmin_email)).first()
        if not super_admin:
            super_admin_user = Psychologist(
                name="Super Admin",
                email=superadmin_email,
                password=hash_password(superadmin_password),
                role="superadmin",
                schedule="Siempre Disponible"
            )
            session.add(super_admin_user)
            session.commit()
            logger.success(f"Created default superadmin user: {superadmin_email}")

        admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "change-me-admin")

        # Keep existing admin check for backward compatibility or other admin users
        admin = session.exec(select(Psychologist).where(Psychologist.role == "admin")).first()
        if not admin:
            admin_user = Psychologist(
                name="Admin",
                email=admin_email,
                password=hash_password(admin_password),
                role="admin",
                schedule="Siempre Disponible"
            )
            session.add(admin_user)
            session.commit()
            logger.success(f"Created default admin user: {admin_email}")
    
        # Create Default EMA Questionnaire if it doesn't exist
        ema = session.exec(select(Questionnaire).where(Questionnaire.title == "EMA")).first()
        if not ema:
            ema_q = Questionnaire(
                title="EMA",
                icon="Activity",
                description="Evaluación Ecológica Momentánea diaria",
                questions=[
                    {"id": "1", "text": "A continuación encontrarás una serie de preguntas sobre cómo te has sentido y cómo has actuado en las últimas dos horas. Lee cada pregunta con atención y marca el número que mejor describa tu experiencia. No hay respuestas correctas o incorrectas.\nEn las últimas dos horas, ¿has sentido poco interés o placer en hacer las cosas?", "type": "likert", "min": 1, "max": 7, "minLabel": "Nada", "maxLabel": "Todo el tiempo"},
                    {"id": "2", "text": "En las últimas dos horas, ¿te has sentido desanimado, deprimido o desesperanzado?", "type": "likert", "min": 1, "max": 7, "minLabel": "Nada", "maxLabel": "Todo el tiempo"},
                    {"id": "3", "text": "En las últimas dos horas, ¿te has sentido nervioso, ansioso o con los nervios de punta?", "type": "likert", "min": 1, "max": 7, "minLabel": "Nada", "maxLabel": "Todo el tiempo"},
                    {"id": "4", "text": "En las últimas dos horas, ¿has sentido que no podías parar de preocuparte?", "type": "likert", "min": 1, "max": 7, "minLabel": "Nada", "maxLabel": "Todo el tiempo"},
                    {"id": "5", "text": "En las dos últimas horas, ¿has evitado hacer algo que pudiera traerte pensamientos o sentimientos difíciles?", "type": "likert", "min": 1, "max": 7, "minLabel": "Nada", "maxLabel": "Todo el tiempo"},
                    {"id": "6", "text": "En las últimas dos horas, ¿has sentido que ibas en “piloto automático” sin prestar atención a lo que hacías?", "type": "likert", "min": 1, "max": 7, "minLabel": "Nada", "maxLabel": "Todo el tiempo"},
                    {"id": "7", "text": "En las últimas dos horas, ¿has actuado de forma consistente con cómo deseas vivir tu vida?", "type": "likert", "min": 1, "max": 7, "minLabel": "Nada consistente", "maxLabel": "Totalmente consistente"}
                ]
            )
            session.add(ema_q)
            session.commit()
    
    # Initialize Firebase
    initialize_firebase()
    
    # Start Background Scheduler
    asyncio.create_task(run_scheduler())
    
    yield

app = FastAPI(lifespan=lifespan)

# CORS Configuration
cors_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", "")
if cors_origins_str:
    allow_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]
    # If the user specified '*', we must disable credentials support in FastAPI CORSMiddleware
    # to avoid runtime configuration errors.
    allow_credentials = False if "*" in allow_origins else True
else:
    allow_origins = ["*"]
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(auth_router.router, tags=["Authentication"])
app.include_router(psychologists_router.router, tags=["Psychologists"])
app.include_router(patients_router.router, tags=["Patients"])
app.include_router(questionnaires_router.router, prefix="/questionnaires", tags=["Questionnaires"])
app.include_router(assignments_router.router, prefix="/assignments", tags=["Assignments"])
app.include_router(messages_router.router, prefix="/messages", tags=["Messages"])
app.include_router(notes_router.router, prefix="/notes", tags=["Notes"])
app.include_router(sessions_router.router, prefix="/sessions", tags=["Sessions"])
app.include_router(assessment_stats_router.router, prefix="/assessment-stats", tags=["Assessment Stats"])
app.include_router(audit_logs_router.router, prefix="/audit-logs", tags=["Audit Logs"])
app.include_router(dashboard_router.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(chat_router.router, prefix="/chat", tags=["Chat AI"])
app.include_router(superadmin_router.router, prefix="/superadmin", tags=["Superadmin"])
app.include_router(notifications_router.router, prefix="/notifications", tags=["Notifications"])

@app.get("/")
def read_root():
    return {"message": "Psychology Backend API is running"}

if __name__ == "__main__":
    import uvicorn
    route_paths = [r.path for r in app.routes if hasattr(r, "path")]
    logger.info(f"Registered {len(route_paths)} routes")
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    logger.info(f"Starting Psicouja Backend on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True, log_config=LOGGING_CONFIG)