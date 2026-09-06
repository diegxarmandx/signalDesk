import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# Read variables from backend/.env
load_dotenv()


# Get the database connection string.
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")


# The engine manages communication between SQLAlchemy
# and our PostgreSQL database.
engine = create_engine(DATABASE_URL)


# A Session represents one working conversation
# between our Python application and the database.
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


# Every SQLAlchemy database model we create
# will inherit from this class.
class Base(DeclarativeBase):
    pass


# FastAPI dependency that creates a database session
# for a request and always closes it afterward.
def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()