import httpx
from typing import Optional, Dict, Any

MMS_BASE_URL = "https://mess.iiit.ac.in/api"

class MMSService:
    """Complete MMS API wrapper based on OpenAPI spec v2."""
    
    @staticmethod
    async def make_request(
        endpoint: str, 
        method: str = "GET", 
        params: Optional[Dict[str, Any]] = None, 
        json_data: Optional[Dict[str, Any]] = None,
        auth_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Helper function to make requests to the Mess API."""
        headers = {}
        if auth_key:
            headers["authorization"] = auth_key
        
        # MOCK FOR TEST USERS
        if auth_key in ["dummy", "dummy_key"]:
            print(f"Mocking MMS Request to {endpoint} for dummy user")
            return {"success": True, "data": [], "status": "success"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                if method == "GET":
                    response = await client.get(f"{MMS_BASE_URL}{endpoint}", params=params, headers=headers)
                elif method == "POST":
                    response = await client.post(f"{MMS_BASE_URL}{endpoint}", json=json_data, headers=headers)
                elif method == "PUT":
                    response = await client.put(f"{MMS_BASE_URL}{endpoint}", json=json_data, headers=headers)
                elif method == "DELETE":
                    response = await client.delete(f"{MMS_BASE_URL}{endpoint}", params=params, headers=headers)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                # Handle 204 No Content
                if response.status_code == 204:
                    return {"success": True}
                
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                print(f"MMS API Error: {e.response.text}")
                return {"error": str(e), "status_code": e.response.status_code}
            except Exception as e:
                print(f"MMS Request Failed: {e}")
                return {"error": str(e)}

    # ==================== AUTHENTICATION ====================
    
    @staticmethod
    async def get_user_profile(auth_key: str):
        """GET /auth/me - Get logged in user details."""
        return await MMSService.make_request("/auth/me", auth_key=auth_key)

    @staticmethod
    async def get_auth_keys(auth_key: str):
        """GET /auth/keys - Get all auth keys for user."""
        return await MMSService.make_request("/auth/keys", auth_key=auth_key)

    @staticmethod
    async def create_auth_key(auth_key: str, name: str, expiry: str):
        """POST /auth/keys - Create a new auth key."""
        return await MMSService.make_request(
            "/auth/keys", method="POST", 
            json_data={"name": name, "expiry": expiry}, 
            auth_key=auth_key
        )

    @staticmethod
    async def get_auth_key_info(auth_key: str):
        """GET /auth/keys/info - Get info about an auth key."""
        return await MMSService.make_request("/auth/keys/info", auth_key=auth_key)

    @staticmethod
    async def delete_auth_key(auth_key: str, name: str):
        """DELETE /auth/keys/{name} - Delete an auth key by name."""
        return await MMSService.make_request(
            f"/auth/keys/{name}", method="DELETE", auth_key=auth_key
        )

    @staticmethod
    async def reset_token(auth_key: str):
        """POST /auth/reset-token - Reset QR token."""
        return await MMSService.make_request("/auth/reset-token", method="POST", auth_key=auth_key)

    # ==================== MESS INFO ====================
    
    @staticmethod
    async def get_mess_info():
        """GET /mess/info - Get information about all messes."""
        return await MMSService.make_request("/mess/info")

    @staticmethod
    async def get_menus(date: Optional[str] = None):
        """GET /mess/menus - Get mess menus on a certain day."""
        params = {}
        if date:
            params["on"] = date
        return await MMSService.make_request("/mess/menus", params=params)

    @staticmethod
    async def get_rates(meal: str, date: Optional[str] = None):
        """GET /mess/rates - Get mess rates for a meal."""
        params = {"meal": meal}
        if date:
            params["on"] = date
        return await MMSService.make_request("/mess/rates", params=params)

    @staticmethod
    async def get_capacities(meal: str, date: Optional[str] = None):
        """GET /mess/capacities - Get mess capacities for a meal."""
        params = {"meal": meal}
        if date:
            params["on"] = date
        return await MMSService.make_request("/mess/capacities", params=params)

    # ==================== REGISTRATIONS ====================
    
    @staticmethod
    async def get_registrations(auth_key: str, from_date: str, to_date: str):
        """GET /registrations - Get all registrations in a timeframe."""
        params = {"from": from_date, "to": to_date}
        return await MMSService.make_request("/registrations", params=params, auth_key=auth_key)

    @staticmethod
    async def get_registration(auth_key: str, meal: Optional[str] = None, date: Optional[str] = None):
        """GET /registration - Get one registration for meal on date."""
        params = {}
        if meal:
            params["meal"] = meal
        if date:
            params["date"] = date
        return await MMSService.make_request("/registration", params=params, auth_key=auth_key)

    @staticmethod
    async def register_meal(auth_key: str, date: str, meal: str, mess: str, guests: int = 0):
        """POST /registrations - Create/update a registration."""
        data = {
            "meal_date": date,
            "meal_type": meal,
            "meal_mess": mess
        }
        if guests > 0:
            data["guests"] = guests
        return await MMSService.make_request("/registrations", method="POST", json_data=data, auth_key=auth_key)

    @staticmethod
    async def cancel_registration(auth_key: str, date: str, meal: str):
        """POST /registrations/cancel - Cancel a registration."""
        data = {"meal_date": date, "meal_type": meal}
        return await MMSService.make_request("/registrations/cancel", method="POST", json_data=data, auth_key=auth_key)

    @staticmethod
    async def uncancel_registration(auth_key: str, date: str, meal: str):
        """POST /registrations/uncancel - Uncancel a registration."""
        data = {"meal_date": date, "meal_type": meal}
        return await MMSService.make_request("/registrations/uncancel", method="POST", json_data=data, auth_key=auth_key)

    @staticmethod
    async def set_skipping(auth_key: str, date: str, meal: str, mess: str, skipping: bool):
        """POST /registrations/skipping - Set meal as skipped/unskipped."""
        data = {
            "meal_date": date,
            "meal_type": meal,
            "meal_mess": mess,
            "skipping": skipping
        }
        return await MMSService.make_request("/registrations/skipping", method="POST", json_data=data, auth_key=auth_key)

    # ==================== MONTHLY REGISTRATIONS ====================
    
    @staticmethod
    async def get_monthly_registration(auth_key: str, month: Optional[int] = None, year: Optional[int] = None):
        """GET /registrations/monthly - Get monthly registration."""
        params = {}
        if month:
            params["month"] = month
        if year:
            params["year"] = year
        return await MMSService.make_request("/registrations/monthly", params=params, auth_key=auth_key)

    @staticmethod
    async def create_monthly_registration(auth_key: str, month: int, year: int, mess: str):
        """POST /registrations/monthly - Create monthly registration."""
        data = {"month": month, "year": year, "mess": mess}
        return await MMSService.make_request("/registrations/monthly", method="POST", json_data=data, auth_key=auth_key)

    @staticmethod
    async def delete_monthly_registration(auth_key: str, month: int, year: int):
        """DELETE /registrations/monthly - Delete monthly registration."""
        params = {"month": month, "year": year}
        return await MMSService.make_request("/registrations/monthly", method="DELETE", params=params, auth_key=auth_key)

    @staticmethod
    async def get_cancellations_count(auth_key: str, meal: str, month: Optional[int] = None, year: Optional[int] = None):
        """GET /registrations/cancellations - Get cancelled registration count."""
        params = {"meal": meal}
        if month:
            params["month"] = month
        if year:
            params["year"] = year
        return await MMSService.make_request("/registrations/cancellations", params=params, auth_key=auth_key)

    # ==================== FEEDBACK & RATINGS ====================
    
    @staticmethod
    async def submit_feedback(auth_key: str, date: str, meal: str, rating: int, remarks: Optional[str] = None):
        """POST /registrations/feedback - Provide feedback for a meal."""
        data = {
            "meal_date": date,
            "meal_type": meal,
            "rating": rating
        }
        if remarks:
            data["remarks"] = remarks
        return await MMSService.make_request("/registrations/feedback", method="POST", json_data=data, auth_key=auth_key)

    @staticmethod
    async def get_rating(meal: str, mess: Optional[str] = None, date: Optional[str] = None):
        """GET /registration/rating - Get average rating for a meal."""
        params = {"meal": meal}
        if mess:
            params["mess"] = mess
        if date:
            params["date"] = date
        return await MMSService.make_request("/registration/rating", params=params)

    # ==================== BILLING ====================
    
    @staticmethod
    async def get_bill(auth_key: str, month: Optional[int] = None, year: Optional[int] = None):
        """GET /registrations/bill - Get mess bill for a month."""
        params = {}
        if month:
            params["month"] = month
        if year:
            params["year"] = year
        return await MMSService.make_request("/registrations/bill", params=params, auth_key=auth_key)

    @staticmethod
    async def get_all_bills(auth_key: str):
        """GET /bills - Get breakdown of mess bill for all months."""
        return await MMSService.make_request("/bills", auth_key=auth_key)

    # ==================== EXTRAS ====================
    
    @staticmethod
    async def get_extras(meal: str, date: Optional[str] = None):
        """GET /extras - List available extra items."""
        params = {"meal": meal}
        if date:
            params["date"] = date
        return await MMSService.make_request("/extras", params=params)

    @staticmethod
    async def get_extra_registrations(auth_key: str, meal: str, date: Optional[str] = None):
        """GET /registrations/extras - Get registered extra items."""
        params = {"meal": meal}
        if date:
            params["date"] = date
        return await MMSService.make_request("/registrations/extras", params=params, auth_key=auth_key)

    @staticmethod
    async def register_extra(auth_key: str, extra_id: str, date: str, meal: str, mess: str):
        """POST /registrations/extras - Register for an extra item."""
        data = {
            "extra": extra_id,
            "meal_date": date,
            "meal_type": meal,
            "meal_mess": mess
        }
        return await MMSService.make_request("/registrations/extras", method="POST", json_data=data, auth_key=auth_key)

    @staticmethod
    async def delete_extra_registration(auth_key: str, registration_id: str):
        """DELETE /registrations/extras - Delete extra registration."""
        params = {"id": registration_id}
        return await MMSService.make_request("/registrations/extras", method="DELETE", params=params, auth_key=auth_key)

    # ==================== CONFIG ====================
    
    @staticmethod
    async def get_registration_window():
        """GET /config/registration-window - Get registration window time in seconds."""
        return await MMSService.make_request("/config/registration-window")

    @staticmethod
    async def get_cancellation_window():
        """GET /config/cancellation-window - Get cancellation window time in seconds."""
        return await MMSService.make_request("/config/cancellation-window")

    @staticmethod
    async def get_feedback_window():
        """GET /config/feedback-window - Get feedback window time in seconds."""
        return await MMSService.make_request("/config/feedback-window")

    @staticmethod
    async def get_extras_window():
        """GET /config/extras-window - Get extra registration window time in seconds."""
        return await MMSService.make_request("/config/extras-window")

    @staticmethod
    async def get_registration_max_date():
        """GET /config/registration-max-date - Get max date for registration."""
        return await MMSService.make_request("/config/registration-max-date")

    @staticmethod
    async def get_max_cancellations(meal: str):
        """GET /config/max-cancellations - Get max cancellations per meal."""
        return await MMSService.make_request("/config/max-cancellations", params={"meal": meal})

    @staticmethod
    async def get_meal_timings(date: Optional[str] = None):
        """GET /config/meal-timings - Get timings of meals in each mess."""
        params = {}
        if date:
            params["on"] = date
        return await MMSService.make_request("/config/meal-timings", params=params)

    # ==================== PREFERENCES ====================
    
    @staticmethod
    async def get_preferences(auth_key: str):
        """GET /preferences - Fetch all user preferences."""
        return await MMSService.make_request("/preferences", auth_key=auth_key)

    @staticmethod
    async def update_preferences(auth_key: str, preferences: Dict[str, bool]):
        """PUT /preferences - Update user preferences."""
        return await MMSService.make_request("/preferences", method="PUT", json_data=preferences, auth_key=auth_key)
