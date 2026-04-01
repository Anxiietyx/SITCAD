import models
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from dependencies import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    counts = {}
    for role in ("teacher", "parent", "admin"):
        counts[role] = db.query(models.User).filter(models.User.role == role).count()
    counts["total"] = db.query(models.User).count()
    return counts

@router.get("/users")
async def get_admin_users(
    role: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    users = query.order_by(models.User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}
