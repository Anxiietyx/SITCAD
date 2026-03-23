import models
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dependencies import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    counts = {}
    for role in ("teacher", "parent", "admin"):
        counts[role] = db.query(models.User).filter(models.User.role == role).count()
    return counts
