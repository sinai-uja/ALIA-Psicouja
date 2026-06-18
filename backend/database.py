import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Selección de base de datos mediante variable de entorno DB_TYPE
#   - "sqlite"     → usa psychology.db local  (por defecto)
#   - "postgresql"  → usa PostgreSQL (ver POSTGRES_* en .env)
# ---------------------------------------------------------------------------

DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()

if DB_TYPE == "postgresql":
    PG_USER = os.getenv("POSTGRES_USER", "psicouja")
    PG_PASS = os.getenv("POSTGRES_PASSWORD", "psicouja_secret")
    PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
    PG_PORT = os.getenv("POSTGRES_PORT", "5432")
    PG_DB   = os.getenv("POSTGRES_DB", "psicouja")

    DATABASE_URL = (
        f"postgresql://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}"
    )
    engine = create_engine(DATABASE_URL, echo=False)
else:
    sqlite_file_name = "psychology.db"
    sqlite_url = f"sqlite:///{sqlite_file_name}"
    engine = create_engine(sqlite_url, echo=False)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def migrate_db_schema():
    import os
    from sqlalchemy import text
    db_type = os.getenv("DB_TYPE", "sqlite").lower()
    
    with Session(engine) as session:
        try:
            if db_type == "postgresql":
                # Check columns
                result_status = session.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='message' AND column_name='safety_status';"
                )).fetchone()
                if not result_status:
                    session.execute(text("ALTER TABLE message ADD COLUMN safety_status VARCHAR;"))
                    session.execute(text("ALTER TABLE message ADD COLUMN safety_explanation VARCHAR;"))
                    session.commit()
                
                result_keywords = session.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name='message' AND column_name='safety_keywords';"
                )).fetchone()
                if not result_keywords:
                    session.execute(text("ALTER TABLE message ADD COLUMN safety_keywords VARCHAR;"))
                    session.commit()
                    print("Database migrated: added safety_keywords field to message table (PostgreSQL)")
            else:
                # For SQLite, use PRAGMA table_info
                result = session.execute(text("PRAGMA table_info(message);")).fetchall()
                column_names = [r[1] for r in result]
                
                # Check and add safety_status
                if "safety_status" not in column_names:
                    session.execute(text("ALTER TABLE message ADD COLUMN safety_status VARCHAR;"))
                    print("Added safety_status column to message table")
                
                # Check and add safety_explanation
                if "safety_explanation" not in column_names:
                    session.execute(text("ALTER TABLE message ADD COLUMN safety_explanation VARCHAR;"))
                    print("Added safety_explanation column to message table")
                
                # Check and add safety_keywords
                if "safety_keywords" not in column_names:
                    session.execute(text("ALTER TABLE message ADD COLUMN safety_keywords VARCHAR;"))
                    print("Added safety_keywords column to message table")
                
                session.commit()
        except Exception as e:
            session.rollback()
            print(f"Error during schema migration: {e}")


def get_session():
    with Session(engine) as session:
        yield session
