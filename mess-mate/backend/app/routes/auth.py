from fastapi import APIRouter, Header, HTTPException, Body
from app.services.mms import MMSService
from app.database import db
from app.models import UserInDB
from datetime import datetime

router = APIRouter()

@router.post("/login")
async def login(authKey: str = Body(..., embed=True)):
    if not authKey:
        raise HTTPException(status_code=400, detail="Auth Key required")

    # Validate against MMS
    mms_profile = await MMSService.get_user_profile(authKey)
    
    if not mms_profile or not mms_profile.get("data"):
        raise HTTPException(status_code=401, detail="Invalid Auth Key")
        
    data = mms_profile["data"]
    
    # Update/Upsert User in DB
    user_data = {
        "email": data.get("email"),
        "name": data.get("name"),
        "mmsId": data.get("id"),
        "authKey": authKey,
        "updatedAt": datetime.utcnow()
    }
    
    existing = await db.users.find_one({"mmsId": data["id"]})
    if existing:
        await db.users.update_one({"_id": existing["_id"]}, {"$set": user_data})
        user = await db.users.find_one({"_id": existing["_id"]})
    else:
        # Check by email fallback
        existing_email = await db.users.find_one({"email": data["email"]})
        if existing_email:
             await db.users.update_one({"_id": existing_email["_id"]}, {"$set": user_data})
             user = await db.users.find_one({"_id": existing_email["_id"]})
        else:
             user_data["createdAt"] = datetime.utcnow()
             res = await db.users.insert_one(user_data)
             user = await db.users.find_one({"_id": res.inserted_id})
             
    # Format _id for response
    user["_id"] = str(user["_id"])
    if user.get("groupId"):
        user["groupId"] = str(user["groupId"])
        
    return user
