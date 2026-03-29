"""MCP Tools. Allows the LLM to take actions and advanced lookups."""

from typing import Optional, Dict, Any, List
from mess_mcp.server import mcp
from mess_mcp.api import make_request, APIError

def _handle_error(e: Exception) -> str:
    """Transform API exceptions into readable tool output errors."""
    if isinstance(e, APIError):
        return f"API Error ({e.status_code}): {e.response_body or e.args[0]}"
    return f"Unexpected Error: {str(e)}"

@mcp.tool()
async def get_capacities(meal: str, date: Optional[str] = None, api_key: Optional[str] = None) -> str:
    """
    Get current system limits and available seat counts for a specific meal.
    Use this to see if a particular mess is full before attempting registration.
    
    Args:
        meal: Options are 'breakfast', 'lunch', 'snacks', 'dinner'
        date: Target date in YYYY-MM-DD. Defaults to today's date if empty.
        api_key: Optional API key if not set in MESS_API_KEY environment.
    """
    try:
        params = {"meal": meal}
        if date:
            params["on"] = date
        res = await make_request("/mess/capacities", params=params, api_key=api_key)
        import json
        return json.dumps(res, indent=2)
    except Exception as e:
        return _handle_error(e)

@mcp.tool()
async def check_registrations(from_date: str, to_date: str, api_key: Optional[str] = None) -> str:
    """
    Check the student's mess registrations for a given time window. Includes 'skipping' statuses.
    
    Args:
        from_date: Start date (YYYY-MM-DD)
        to_date: End date (YYYY-MM-DD)
    """
    try:
        params = {"from": from_date, "to": to_date}
        res = await make_request("/registrations", params=params, api_key=api_key)
        import json
        return json.dumps(res, indent=2)
    except Exception as e:
        return _handle_error(e)

@mcp.tool()
async def register_meal(meal_date: str, meal_type: str, meal_mess: str, guests: int = 0, api_key: Optional[str] = None) -> str:
    """
    Creates or updates a meal registration for a specific day and mess.
    
    Args:
        meal_date: Target date (YYYY-MM-DD)
        meal_type: Meal period ('breakfast', 'lunch', 'snacks', 'dinner')
        meal_mess: The identifier of the mess (e.g., 'yuktahar', 'kadamba-nonveg', 'north')
        guests: Number of external guests to bring (Billed additionally, max 5).
    """
    try:
        payload = {
            "meal_date": meal_date,
            "meal_type": meal_type,
            "meal_mess": meal_mess,
            "guests": guests
        }
        res = await make_request("/registrations", method="POST", json_data=payload, api_key=api_key)
        import json
        return json.dumps(res, indent=2)
    except Exception as e:
        return _handle_error(e)

@mcp.tool()
async def manage_skipping(meal_date: str, meal_type: str, meal_mess: str, leaving_campus: bool = True, api_key: Optional[str] = None) -> str:
    """
    Notifies the mess system that the student will skip an already registered meal.
    This helps the kitchen reduce food waste. Must be done before the "skip window" closes.
    
    Args:
        meal_date: Target date (YYYY-MM-DD)
        meal_type: Meal period ('breakfast', 'lunch', 'snacks', 'dinner')
        meal_mess: The currently registered mess.
        leaving_campus: True if the student plans to skip/leave. False un-skips.
    """
    try:
        payload = {
            "meal_date": meal_date,
            "meal_type": meal_type,
            "meal_mess": meal_mess,
            "skipping": leaving_campus
        }
        res = await make_request("/registrations/skipping", method="POST", json_data=payload, api_key=api_key)
        import json
        return json.dumps(res, indent=2)
    except Exception as e:
        return _handle_error(e)

@mcp.tool()
async def cancel_meal(meal_date: str, meal_type: str, api_key: Optional[str] = None) -> str:
    """
    Completely cancels a meal registration. Keep in mind strict cancellation limits per month may apply.
    """
    try:
        payload = {"meal_date": meal_date, "meal_type": meal_type}
        res = await make_request("/registrations/cancel", method="POST", json_data=payload, api_key=api_key)
        import json
        return json.dumps(res, indent=2)
    except Exception as e:
            return _handle_error(e)

@mcp.tool()
async def submit_feedback(meal_date: str, meal_type: str, rating: int, remarks: Optional[str] = None, api_key: Optional[str] = None) -> str:
    """
    Submits mandatory or optional feedback after a meal is consumed.
    
    Args:
        meal_date: Date the meal was eaten (YYYY-MM-DD).
        meal_type: Type of meal.
        rating: Value out of 5 stars (1-5).
        remarks: Free text explaining issues regarding taste, hygiene, or quality.
    """
    try:
        payload = {
            "meal_date": meal_date,
            "meal_type": meal_type,
            "rating": rating
        }
        if remarks:
            payload["remarks"] = remarks
        res = await make_request("/registrations/feedback", method="POST", json_data=payload, api_key=api_key)
        import json
        return json.dumps(res, indent=2)
    except Exception as e:
        return _handle_error(e)

@mcp.tool()
async def list_registered_extras(meal_type: str, date: Optional[str] = None, api_key: Optional[str] = None) -> str:
    """
    Check currently booked add-ons and extras (e.g. Omelettes, special dishes)
    """
    try:
        params = {"meal": meal_type}
        if date:
            params["date"] = date
        res = await make_request("/registrations/extras", params=params, api_key=api_key)
        import json
        return json.dumps(res, indent=2)
    except Exception as e:
        return _handle_error(e)

@mcp.tool()
async def manage_monthly(month: int, year: int, mess_id: str, register: bool = True, api_key: Optional[str] = None) -> str:
    """
    Sets or un-sets the default monthly registration for an entire calendar month.
    
    Args:
        month: 1-12.
        year: YYYY
        mess_id: the mess default identifier.
        register: True to enroll for the whole month, False to delete/unregister.
    """
    try:
        if register:
            payload = {"month": month, "year": year, "mess": mess_id}
            res = await make_request("/registrations/monthly", method="POST", json_data=payload, api_key=api_key)
        else:
            params = {"month": month, "year": year}
            res = await make_request("/registrations/monthly", method="DELETE", params=params, api_key=api_key)
        import json
        return json.dumps(res, indent=2)
    except Exception as e:
        return _handle_error(e)
