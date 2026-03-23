from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone
from database import Base

class User(Base):
  __tablename__ = "users"
  
  """
  1. 'id' in this case refers to the User UID created on the Firebase side, we use this as the unique identifier.
  2. role is nullable for new users who haven't finished onboarding.
  """
  id = Column(String, primary_key=True, index=True)
  email = Column(String, unique=True, index=True)
  full_name = Column(String)
  role = Column(String, nullable=True)
  created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
  