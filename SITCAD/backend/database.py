import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
# from google.cloud.sql.connector import Connector

# Load environment variables from .env file:
load_dotenv()

# PostgreSQL connection details:
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME")

# Construct local connection URL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Initialise the Connector GLOBALLY (important for performance)
# connector = Connector()

# Define the connection function
# def getconn():
#   conn = connector.connect(
#     INSTANCE_CONNECTION_NAME,
#     "pg8000",
#     user=DB_USER,
#     password=DB_PASSWORD,
#     db=DB_NAME
#   )
#   return conn

# Create the engine
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
