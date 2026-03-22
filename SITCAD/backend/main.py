import models
import database
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

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

# Pydantic schema for the request body
class AuthRequest(BaseModel):
    id_token: str
    role: str = None  # Optional: 'teacher' or 'parent'
    full_name: str = None

# Dependency to provide a database session to routes
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# The "Sync" Endpoint
@app.post("/auth/sync")
async def sync_user(request: AuthRequest, db: Session = Depends(get_db)):
    try:
        decoded_token = auth.verify_id_token(request.id_token)
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    try:
        uid = decoded_token['uid']
        email = decoded_token.get('email')

        # 1. Try to find user by UID
        user = db.query(models.User).filter(models.User.id == uid).first()

        # 2. If not found by UID, check by email.
        # This handles provider-switching (e.g. registered with email/password,
        # then signs in with Google using the same email address).
        # We intentionally do NOT update the stored UID — the user's data is
        # keyed to their original registration UID and their role/profile must
        # not be lost just because Firebase issued a different UID for a second
        # provider.
        if not user and email:
            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                print(f"Provider switch detected for {email}: incoming UID {uid} differs from stored UID {user.id}. Returning existing record.")

        # 3. If still no user, create a brand new one
        if not user:
            user = models.User(
                id=uid,
                email=email,
                full_name=request.full_name or decoded_token.get('name', 'User'),
                role=request.role
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # User already exists — always update role/full_name when explicitly provided.
            # This handles the race condition where onAuthStateChanged syncs first
            # with no role/name, then Register syncs with the actual values.
            updated = False
            if request.role:
                user.role = request.role
                updated = True
            if request.full_name:
                user.full_name = request.full_name
                updated = True
            if updated:
                db.commit()
                db.refresh(user)

        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }

    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        print(f"DB sync error:\n{error_detail}")
        raise HTTPException(
            status_code=500, 
            detail=f"Database sync failed: {str(e)}"
        )


class RoleUpdateRequest(BaseModel):
    id_token: str
    role: str

@app.patch("/auth/update-role")
async def update_role(request: RoleUpdateRequest, db: Session = Depends(get_db)):
    try:
        decoded_token = auth.verify_id_token(request.id_token)
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    if request.role not in ("teacher", "parent"):
        raise HTTPException(status_code=400, detail="Role must be 'teacher' or 'parent'")

    try:
        uid = decoded_token['uid']
        user = db.query(models.User).filter(models.User.id == uid).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.role = request.role
        db.commit()
        db.refresh(user)

        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Role update error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update role: {str(e)}")
    