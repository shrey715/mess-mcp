from fastapi import APIRouter, HTTPException, Query, Header, Body
from app.services.mms import MMSService
from app.database import db
from datetime import datetime
from bson import ObjectId
from typing import Optional, Dict, Any

router = APIRouter()

# ==================== HELPER ====================

async def get_auth_key_for_user(user_id: str, authorization: Optional[str] = None) -> str:
    """Get auth key from header or database."""
    if authorization:
        return authorization
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    auth_key = user.get("authKey")
    if not auth_key:
        raise HTTPException(status_code=401, detail="No Auth Key available")
    return auth_key

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_dashboard(
    userId: str, 
    authorization: str = Header(None)
):
    auth_key = await get_auth_key_for_user(userId, authorization)
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Fetch all data in parallel
    menus = await MMSService.get_menus(date=today)
    registrations = await MMSService.get_registrations(auth_key, today, today)
    mess_info = await MMSService.get_mess_info()
    timings = await MMSService.get_meal_timings()
    
    # Build mess info lookup
    mess_lookup = {}
    if mess_info.get("data"):
        for m in mess_info["data"]:
            mess_lookup[m["id"]] = m
    
    hour = datetime.now().hour
    current_meal = 'breakfast'
    if hour >= 10: current_meal = 'lunch'
    if hour >= 14: current_meal = 'snacks'
    if hour >= 18: current_meal = 'dinner'
    
    reg_list = registrations.get("data", []) or []
    next_meal_reg = next((r for r in reg_list if r["meal_date"] == today and r["meal_type"] == current_meal), None)
    my_mess = next_meal_reg["meal_mess"] if next_meal_reg else None
    
    next_meal_items = []
    day_name = datetime.now().strftime("%A").lower()
    
    if my_mess and menus.get("data"):
        mess_menu = next((m for m in menus["data"] if m["mess"] == my_mess), None)
        if mess_menu and "days" in mess_menu and day_name in mess_menu["days"]:
            next_meal_items = mess_menu["days"][day_name].get(current_meal, [])
    
    # Get timing for current meal at user's mess
    mess_timings = timings.get("data", {}).get(my_mess, []) if my_mess else []
    
    # User specified "correct" timings - strictly use these
    standard_time = get_meal_time(current_meal)
    
    # Get mess details
    my_mess_info = mess_lookup.get(my_mess, {}) if my_mess else {}

    return {
        "nextMeal": {
            "type": current_meal,
            "mess": my_mess if my_mess else "Not Registered",
            "messName": my_mess_info.get("name", my_mess),
            "messColor": my_mess_info.get("color"),
            "messRating": my_mess_info.get("rating"),
            "items": next_meal_items,
            "isRegistered": bool(my_mess),
            "time": standard_time,
            # We explicitly cleared API timings to force the standard user-defined time to show
            "startTime": None, 
            "endTime": None
        },
        "menus": menus,
        "messInfo": mess_info,
        "todayRegistrations": reg_list
    }


def get_meal_time(meal_type):
    times = {
        "breakfast": "07:30 - 09:30",
        "lunch": "12:30 - 14:30",
        "snacks": "16:30 - 17:30",
        "dinner": "19:30 - 21:30"
    }
    return times.get(meal_type, "")


# ==================== MESS INFO ====================

@router.get("/mess/info")
async def get_mess_info():
    return await MMSService.get_mess_info()

@router.get("/menus")
async def get_menus_proxy(on: str = Query(None)):
    return await MMSService.get_menus(on)

@router.get("/mess/rates")
async def get_mess_rates(meal: str, on: str = Query(None)):
    return await MMSService.get_rates(meal, on)

@router.get("/mess/capacities")
async def get_mess_capacities(meal: str, on: str = Query(None)):
    return await MMSService.get_capacities(meal, on)

# ==================== RATINGS ====================

@router.get("/ratings")
async def get_ratings(meal: str, mess: str = Query(None), date: str = Query(None)):
    return await MMSService.get_rating(meal=meal, mess=mess, date=date)

# ==================== REGISTRATIONS ====================

@router.get("/registrations")
async def get_registrations(
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    authorization: str = Header(...)
):
    return await MMSService.get_registrations(authorization, from_date, to_date)

@router.get("/registration")
async def get_registration(
    meal: str = Query(None),
    date: str = Query(None),
    authorization: str = Header(...)
):
    return await MMSService.get_registration(authorization, meal, date)

@router.post("/registrations")
async def register_meal(
    body: Dict[str, Any] = Body(...),
    authorization: str = Header(...)
):
    # Register for self
    result = await MMSService.register_meal(
        authorization,
        body["meal_date"],
        body["meal_type"],
        body["meal_mess"],
        body.get("guests", 0)
    )

    # IMPLICIT GROUP REGISTRATION
    # If successful and user is in a group, try to register for others
    if result.get("status") == "success":
        try:
            # Find user from Auth Key to check group
            user = await db.users.find_one({"authKey": authorization})
            if user and user.get("groupId"):
                group = await db.groups.find_one({"_id": ObjectId(user["groupId"])})
                if group and group.get("members"):
                    tasks = []
                    for member_oid in group["members"]:
                        # Skip self
                        if str(member_oid) == str(user["_id"]):
                            continue
                        
                        member = await db.users.find_one({"_id": member_oid})
                        if member and member.get("authKey"):
                             print(f"GROUP_REG_DEBUG: Registering member {member['_id']}")
                             tasks.append(MMSService.register_meal(
                                 member["authKey"],
                                 body["meal_date"],
                                 body["meal_type"],
                                 body["meal_mess"],
                                 0 # No guests for members
                             ))
                    
                    if tasks:
                        # Run in parallel, ignore errors for now (best effort)
                        await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            print(f"Group registration failed: {e}")

    return result

@router.post("/registrations/cancel")
async def cancel_registration(
    body: Dict[str, Any] = Body(...),
    authorization: str = Header(...)
):
    return await MMSService.cancel_registration(authorization, body["meal_date"], body["meal_type"])

@router.post("/registrations/uncancel")
async def uncancel_registration(
    body: Dict[str, Any] = Body(...),
    authorization: str = Header(...)
):
    return await MMSService.uncancel_registration(authorization, body["meal_date"], body["meal_type"])

@router.post("/registrations/skipping")
async def set_skipping(
    body: Dict[str, Any] = Body(...),
    authorization: str = Header(...)
):
    return await MMSService.set_skipping(
        authorization,
        body["meal_date"],
        body["meal_type"],
        body["meal_mess"],
        body["skipping"]
    )

# ==================== MONTHLY REGISTRATIONS ====================

@router.get("/registrations/monthly")
async def get_monthly(
    month: int = Query(None),
    year: int = Query(None),
    authorization: str = Header(...)
):
    return await MMSService.get_monthly_registration(authorization, month, year)

@router.post("/registrations/monthly")
async def create_monthly(
    body: Dict[str, Any] = Body(...),
    authorization: str = Header(...)
):
    return await MMSService.create_monthly_registration(
        authorization, body["month"], body["year"], body["mess"]
    )

@router.delete("/registrations/monthly")
async def delete_monthly(
    month: int = Query(...),
    year: int = Query(...),
    authorization: str = Header(...)
):
    return await MMSService.delete_monthly_registration(authorization, month, year)

@router.get("/registrations/cancellations")
async def get_cancellations(
    meal: str,
    month: int = Query(None),
    year: int = Query(None),
    authorization: str = Header(...)
):
    return await MMSService.get_cancellations_count(authorization, meal, month, year)

# ==================== FEEDBACK ====================

@router.post("/registrations/feedback")
async def submit_feedback(
    body: Dict[str, Any] = Body(...),
    authorization: str = Header(...)
):
    return await MMSService.submit_feedback(
        authorization,
        body["meal_date"],
        body["meal_type"],
        body["rating"],
        body.get("remarks")
    )

# ==================== BILLING ====================

@router.get("/registrations/bill")
async def get_bill(
    month: int = Query(None),
    year: int = Query(None),
    authorization: str = Header(...)
):
    return await MMSService.get_bill(authorization, month, year)

@router.get("/bills")
async def get_all_bills(authorization: str = Header(...)):
    return await MMSService.get_all_bills(authorization)

# ==================== EXTRAS ====================

@router.get("/extras")
async def get_extras(meal: str, date: str = Query(None)):
    return await MMSService.get_extras(meal, date)

@router.get("/registrations/extras")
async def get_extra_registrations(
    meal: str,
    date: str = Query(None),
    authorization: str = Header(...)
):
    return await MMSService.get_extra_registrations(authorization, meal, date)

@router.post("/registrations/extras")
async def register_extra(
    body: Dict[str, Any] = Body(...),
    authorization: str = Header(...)
):
    return await MMSService.register_extra(
        authorization,
        body["extra"],
        body["meal_date"],
        body["meal_type"],
        body["meal_mess"]
    )

@router.delete("/registrations/extras")
async def delete_extra(
    id: str = Query(...),
    authorization: str = Header(...)
):
    return await MMSService.delete_extra_registration(authorization, id)

# ==================== CONFIG ====================

@router.get("/config/registration-window")
async def get_registration_window():
    return await MMSService.get_registration_window()

@router.get("/config/cancellation-window")
async def get_cancellation_window():
    return await MMSService.get_cancellation_window()

@router.get("/config/feedback-window")
async def get_feedback_window():
    return await MMSService.get_feedback_window()

@router.get("/config/extras-window")
async def get_extras_window():
    return await MMSService.get_extras_window()

@router.get("/config/registration-max-date")
async def get_registration_max_date():
    return await MMSService.get_registration_max_date()

@router.get("/config/max-cancellations")
async def get_max_cancellations(meal: str):
    return await MMSService.get_max_cancellations(meal)

@router.get("/config/meal-timings")
async def get_meal_timings(on: str = Query(None)):
    return await MMSService.get_meal_timings(on)

# ==================== PREFERENCES ====================

@router.get("/preferences")
async def get_preferences(authorization: str = Header(...)):
    return await MMSService.get_preferences(authorization)

@router.put("/preferences")
async def update_preferences(
    body: Dict[str, bool] = Body(...),
    authorization: str = Header(...)
):
    return await MMSService.update_preferences(authorization, body)
