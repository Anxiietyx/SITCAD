# Run this file to verify if your database connection works

import os
from sqlalchemy import create_engine
from sqlalchemy import inspect
from dotenv import load_dotenv
from database import engine

# Load environment variables from .env file:
load_dotenv()

# PostgreSQL connection details:
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# Replace with your actual credentials
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(
  DATABASE_URL,
  pool_size=5,
  max_overflow=10,
  pool_timeout=30,
  pool_recycle=1800
)

try:
    with engine.connect() as conn:
        print("Connection successful!")
except Exception as e:
    print(f"Connection failed: {e}")
    
inspector = inspect(engine)
print(inspector.get_table_names())

# Close the engine
engine.dispose()