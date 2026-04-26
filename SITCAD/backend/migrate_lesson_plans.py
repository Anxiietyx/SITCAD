#!/usr/bin/env python3
"""
Migration script to add is_deleted column to lesson_plans table.
Run this once before starting the backend if the table already exists.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
import urllib.parse

# Load environment
_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
CLOUD_SQL_INSTANCE = os.getenv("CLOUD_SQL_INSTANCE")

# Create engine
if CLOUD_SQL_INSTANCE:
    DATABASE_URL = (
        f"postgresql+psycopg2://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD or '')}"
        f"@/{DB_NAME}?host=/cloudsql/{CLOUD_SQL_INSTANCE}"
    )
else:
    DATABASE_URL = (
        f"postgresql+psycopg2://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD or '')}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

engine = create_engine(DATABASE_URL)

def migrate():
    """Add is_deleted column to lesson_plans if it doesn't exist."""
    with engine.connect() as conn:
        # Check if column exists
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('lesson_plans')]
        
        if 'is_deleted' in columns:
            print("✓ Column 'is_deleted' already exists in lesson_plans table")
            return
        
        # Add the column
        print("Adding 'is_deleted' column to lesson_plans table...")
        conn.execute(text(
            "ALTER TABLE lesson_plans ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        conn.commit()
        print("✓ Successfully added 'is_deleted' column to lesson_plans table")

if __name__ == "__main__":
    try:
        migrate()
        print("\n✓ Migration complete!")
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        engine.dispose()
