from fastapi import APIRouter, HTTPException, Body
from app.database import db
from bson import ObjectId
import random, string

router = APIRouter()

@router.post("/create")
async def create_group(name: str = Body(...), userId: str = Body(...)):
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    group_data = {
        "name": name,
        "code": code,
        "members": [ObjectId(userId)],
        "admins": [ObjectId(userId)]
    }
    res = await db.groups.insert_one(group_data)
    
    # Update user
    await db.users.update_one({"_id": ObjectId(userId)}, {"$set": {"groupId": res.inserted_id}})
    
    group = await db.groups.find_one({"_id": res.inserted_id})
    group["_id"] = str(group["_id"])
    group["members"] = [str(m) for m in group["members"]]
    group["admins"] = [str(a) for a in group["admins"]]
    return group

@router.get("/{userId}")
async def get_my_group(userId: str):
    user = await db.users.find_one({"_id": ObjectId(userId)})
    if not user or not user.get("groupId"):
        return None
        
    group = await db.groups.find_one({"_id": user["groupId"]})
    if not group: return None
    
    # Populate members
    members = []
    async for m in db.users.find({"_id": {"$in": group["members"]}}):
        members.append({
            "_id": str(m["_id"]),
            "name": m.get("name"),
            "email": m.get("email")
        })
    
    group["_id"] = str(group["_id"])
    group["members"] = members
    group["admins"] = [str(a) for a in group["admins"]]
    return group

@router.post("/join")
async def join_group(code: str = Body(...), userId: str = Body(...)):
    group = await db.groups.find_one({"code": code})
    if not group:
         raise HTTPException(status_code=404, detail="Group not found")
         
    uid = ObjectId(userId)
    if uid not in group["members"]:
        await db.groups.update_one({"_id": group["_id"]}, {"$push": {"members": uid}})
        await db.users.update_one({"_id": uid}, {"$set": {"groupId": group["_id"]}})
        
    # Return updated group
    return await get_my_group(userId)
