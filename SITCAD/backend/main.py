import models
import database
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import auth, admin

load_dotenv()

# Initialize Firebase Admin SDK
# Ensure your serviceAccountKey.json is in the /backend folder
# This key is only for the BACKEND.
cred = credentials.Certificate("sitcad-sabahsprout-firebase-adminsdk.json")
firebase_admin.initialize_app(cred)

# Create Database tables automatically on startup
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="SITCAD SabahSprout API")

# Configure CORS
# Allows your Vite frontend (port 5173) to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
    