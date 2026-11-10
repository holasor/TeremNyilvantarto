
import os

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base


DB_SERVER = os.getenv("DB_SERVER", "db")
DB_PORT = int(os.getenv("DB_PORT", "1433"))
DB_NAME = os.getenv("DB_NAME", "TeremNyilvantarto")
DB_USER = os.getenv("DB_USER", "sa")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

def get_database_url(database_name):
    return URL.create(
        "mssql+pyodbc",
        username=DB_USER,
        password=DB_PASSWORD,
        host=DB_SERVER,
        port=DB_PORT,
        database=database_name,
        query={
            "driver": "ODBC Driver 18 for SQL Server",
            "TrustServerCertificate": "yes"
        }
    )


master_engine = create_engine(
    get_database_url("master"),
    isolation_level="AUTOCOMMIT",
    pool_pre_ping=True
)


def create_database_if_not_exists():
    with master_engine.connect() as connection:
        connection.execute(text("""
            IF DB_ID(N'TeremNyilvantarto') IS NULL
            BEGIN
                CREATE DATABASE [TeremNyilvantarto]
            END
        """))


engine = create_engine(
    get_database_url(DB_NAME),
    pool_pre_ping=True
)


Base = declarative_base()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
