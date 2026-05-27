"""
migrate_to_postgres.py
======================
Script to migrate ALL data from SQLite (psychology.db) to PostgreSQL.

Usage:
    1. Ensure the PostgreSQL container is running:
         docker compose up -d
    2. Configure variables in .env (POSTGRES_USER, POSTGRES_PASSWORD, etc.)
    3. Run:
         python scripts/migrate_to_postgres.py

The script:
  - Reads data from SQLite (psychology.db)
  - Creates tables in PostgreSQL if they don't exist
  - Inserts all records while preserving their original IDs
  - Adjusts PostgreSQL sequences so that auto-increments
    continue from the highest existing ID.

⚠️ The script does NOT delete previous data in PostgreSQL. If you want to start
    fresh, run: docker compose down -v  and spin up the container again.
"""

import os
import sys

# Add parent directory to sys.path to find models, database, etc.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, create_engine, text
from sqlalchemy import inspect

# Load environment variables
load_dotenv()

# ── Import ALL models so SQLModel.metadata is aware of them ──
from models import (  # noqa: F401
    Psychologist, Patient, Questionnaire, Assignment,
    QuestionnaireCompletion, Session as SessionModel, AssessmentStat,
    Note, Message, AISuggestionLog, AuditLog, PushSubscription, FCMToken,
)

# ── Engines ────────────────────────────────────────────────────────────
db_path = os.path.join(BACKEND_DIR, "psychology.db")
sqlite_engine = create_engine(f"sqlite:///{db_path}", echo=False)

PG_USER = os.getenv("POSTGRES_USER", "psicouja")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "psicouja_secret")
PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "5432")
PG_DB   = os.getenv("POSTGRES_DB", "psicouja")
pg_url  = f"postgresql://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}"
pg_engine = create_engine(pg_url, echo=False)

# ── Migration Order (to respect foreign key dependencies) ──────────────────
TABLE_ORDER = [
    Psychologist,
    Patient,
    Questionnaire,
    Assignment,
    QuestionnaireCompletion,
    SessionModel,
    AssessmentStat,
    Note,
    AISuggestionLog,
    Message,
    AuditLog,
    PushSubscription,
    FCMToken,
]


def get_table_name(model_cls):
    """Get the table name of the model."""
    return model_cls.__tablename__


def migrate():
    print("=" * 60)
    print("  MIGRATION: SQLite → PostgreSQL")
    print("=" * 60)

    # 1. Create tables in PostgreSQL
    print("\n📦 Creating tables in PostgreSQL...")
    SQLModel.metadata.create_all(pg_engine)
    print("   ✅ Tables created / verified.\n")

    # 2. Migrate each table
    total_rows = 0
    for model_cls in TABLE_ORDER:
        table_name = get_table_name(model_cls)
        print(f"📋 Migrating: {table_name}")

        # Read from SQLite
        with Session(sqlite_engine) as sqlite_session:
            rows = sqlite_session.query(model_cls).all()

        if not rows:
            print(f"   ⏭️  (empty, 0 records)\n")
            continue

        # Insert into PostgreSQL
        with Session(pg_engine) as pg_session:
            count = 0
            for row in rows:
                # Create a detached copy of the object
                data = {}
                mapper = inspect(model_cls)
                for col in mapper.columns:
                    data[col.key] = getattr(row, col.key)

                new_obj = model_cls(**data)
                pg_session.merge(new_obj)
                count += 1

            pg_session.commit()

        total_rows += count
        print(f"   ✅ {count} records migrated.\n")

    # 3. Adjust PostgreSQL sequences
    print("🔧 Adjusting auto-increment sequences...")
    with Session(pg_engine) as pg_session:
        for model_cls in TABLE_ORDER:
            table_name = get_table_name(model_cls)
            seq_name = f"{table_name}_id_seq"

            # Check if the table has an 'id' column
            try:
                result = pg_session.exec(
                    text(f"SELECT MAX(id) FROM {table_name}")
                )
                max_id = result.one()[0]
                if max_id is not None:
                    pg_session.exec(
                        text(f"SELECT setval('{seq_name}', {max_id})")
                    )
                    print(f"   ✅ {seq_name} → {max_id}")
                else:
                    print(f"   ⏭️  {seq_name} (empty table)")
            except Exception as e:
                print(f"   ⚠️  {seq_name}: {e}")
                pg_session.rollback()

        pg_session.commit()

    print(f"\n{'=' * 60}")
    print(f"  ✅ MIGRATION COMPLETED: {total_rows} total records")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    # Check that SQLite file exists
    if not os.path.exists(db_path):
        print(f"❌ psychology.db was not found at {db_path}")
        print("   Please ensure psychology.db is in the backend/ directory.")
        sys.exit(1)

    try:
        migrate()
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
