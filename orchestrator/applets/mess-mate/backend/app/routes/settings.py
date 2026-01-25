from fastapi import APIRouter, HTTPException, Body
from app.database import db
from bson import ObjectId

router = APIRouter()

@router.get("/settings/{userId}")
async def get_settings(userId: str):
    settings = await db.auto_registrations.find_one({"userId": ObjectId(userId)})
    if settings:
        settings["_id"] = str(settings["_id"])
        settings["userId"] = str(settings["userId"])
        return settings
    return {"enabled": False, "preferences": {}}

@router.post("/settings")
async def save_settings(
    userId: str = Body(...),
    autoRegEnabled: bool = Body(...),
    preferences: dict = Body(...)
):
    res = await db.auto_registrations.update_one(
        {"userId": ObjectId(userId)},
        {"$set": {"enabled": autoRegEnabled, "preferences": preferences}},
        upsert=True
    )
    return {"success": True}
