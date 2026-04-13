import os
import urllib.parse
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv(Path(__file__).resolve().parent / ".env")

# Retrieve variables
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
CLOUD_SQL_INSTANCE = os.getenv("CLOUD_SQL_INSTANCE")  # e.g. project:region:instance

# Cloud Run: connect via Unix socket. Local dev: connect via TCP (cloud-sql-proxy).
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

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800 
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()