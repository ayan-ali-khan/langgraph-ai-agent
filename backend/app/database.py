from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import get_settings

settings = get_settings()

# Neon (and other serverless Postgres providers) close idle connections.
# pool_pre_ping=True re-validates the connection before each use.
# pool_recycle recycles connections older than 5 minutes.
# connect_args carries SSL settings through the URL (sslmode=require).
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10,
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
