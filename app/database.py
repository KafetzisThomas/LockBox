import os
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

class Base(DeclarativeBase):
    pass

connect_args = {}
if os.environ.get("USE_POSTGRESQL") == "True":
    DATABASE_URL = os.getenv("DATABASE_URL")
else:
    DATABASE_URL = "sqlite+aiosqlite:///./lockbox.db"
    connect_args = {"check_same_thread": False}

engine = create_async_engine(DATABASE_URL, connect_args=connect_args)

AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
