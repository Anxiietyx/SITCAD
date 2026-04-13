import os
import models
import database
import firebase_admin
from pathlib import Path
from firebase_admin import credentials
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import ai_integrations
from routers import auth, admin, parents, teachers, curriculum, lesson_plans, activities, reports, messages

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")

# Initialize Firebase Admin SDK
# Local dev: use service account JSON. Cloud Run: use Application Default Credentials.
_cred_path = _BACKEND_DIR / "sitcad-sabahsprout-firebase-adminsdk.json"
_app_options = {"storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", "sitcad-sabahsprout.firebasestorage.app")}
if _cred_path.exists():
    firebase_admin.initialize_app(credentials.Certificate(str(_cred_path)), _app_options)
else:
    firebase_admin.initialize_app(options=_app_options)

# Create Database tables automatically on startup
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="SITCAD SabahSprout API")

# Configure CORS
# Allows your Vite frontend (port 5173) to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://sitcad-sabahsprout.web.app",
        "https://sitcad-sabahsprout.firebaseapp.com",
        "https://sitcad-api-884480710214.asia-southeast1.run.app"
    ],
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
app.include_router(messages.router)
#app.include_router(students.router)