from motor.motor_asyncio import AsyncIOMotorClient
from os import getenv

MONGO_URI = getenv("MONGO_URL", "mongodb://localhost:27017/mess-mate")

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database("mess-mate")

async def get_db():
    return db
