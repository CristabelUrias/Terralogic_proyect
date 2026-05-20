from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
import time

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
print("DATABASE_URL:", SQLALCHEMY_DATABASE_URL)
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "postgresql://postgres:05072001@postgres:5432/terralogic"


# Esperar a PostgreSQL
for i in range(10):
    try:
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            connect_args={
                "options": "-c client_encoding=utf8"
            },
            pool_pre_ping=True
        )
        connection = engine.connect()
        connection.close()
        print("✅ PostgreSQL conectado")
        break

    except Exception as e:
        print("⏳ Esperando PostgreSQL...", e)
        time.sleep(5)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()