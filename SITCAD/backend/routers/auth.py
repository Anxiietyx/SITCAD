import os
import models
from firebase_admin import auth
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from dependencies import get_db

ADMIN_SECRET = os.getenv("ADMIN_SECRET")

router = APIRouter(prefix="/auth", tags=["auth"])

class AuthRequest(BaseModel):
    id_token: str
    role: str = None        # Optional: 'teacher', 'parent', or 'admin'
    full_name: str = None
    admin_secret: str = None  # Required when registering as admin

class RoleUpdateRequest(BaseModel):
    id_token: str
    role: str

@router.post("/sync")
async def sync_user(request: AuthRequest, db: Session = Depends(get_db)):
    try:
        decoded_token = auth.verify_id_token(request.id_token)
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    try:
        uid = decoded_token['uid']
        email = decoded_token.get('email')

        # Validate admin secret if registering as admin
        if request.role == 'admin':
            if not request.admin_secret or request.admin_secret != ADMIN_SECRET:
                raise HTTPException(status_code=403, detail="Invalid admin secret key")

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

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        print(f"DB sync error:\n{error_detail}")
        raise HTTPException(
            status_code=500,
            detail=f"Database sync failed: {str(e)}"
        )


@router.patch("/update-role")
async def update_role(request: RoleUpdateRequest, db: Session = Depends(get_db)):
    try:
        decoded_token = auth.verify_id_token(request.id_token)
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    if request.role not in ("teacher", "parent", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'teacher', 'parent', or 'admin'")

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
