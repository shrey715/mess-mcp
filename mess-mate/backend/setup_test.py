import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["mess-mate"]
    
    groups = await db.groups.find({}).to_list(100)
    if not groups:
        print("No groups found")
        return

    # Use first group
    group = groups[0]
    print(f"Using Group: {group['name']}")

    # Create Test User
    test_user = {
        "name": "Arjun Test",
        "email": "arjun@test.com",
        "mmsId": "test_123",
        "authKey": "dummy_key",
        "createdAt": datetime.now()
    }
    
    # Check if exists
    existing = await db.users.find_one({"email": "arjun@test.com"})
    if existing:
        user_id = str(existing["_id"])
    else:
        res = await db.users.insert_one(test_user)
        user_id = str(res.inserted_id)

    user_obj = {
        "_id": user_id,
        "name": "Arjun Test",
        "email": "arjun@test.com",
        "authKey": "dummy_key"
    }
    
    import json
    print(f"GROUP_CODE:{group['code']}")
    print(f"USER_JSON:{json.dumps(user_obj)}")

from datetime import datetime
asyncio.run(main())
