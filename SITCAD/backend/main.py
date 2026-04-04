import models
import database
import firebase_admin
from pathlib import Path
from firebase_admin import credentials
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import ai_integrations, auth, admin, parents, teachers, curriculum, lesson_plans, activities, reports

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")

# Initialize Firebase Admin SDK
cred = credentials.Certificate(str(_BACKEND_DIR / "sitcad-sabahsprout-firebase-adminsdk.json"))
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

app.include_router(ai_integrations.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(parents.router)
app.include_router(teachers.router)
app.include_router(curriculum.router)
app.include_router(lesson_plans.router)
app.include_router(activities.router)
app.include_router(reports.router)
#app.include_router(students.router)