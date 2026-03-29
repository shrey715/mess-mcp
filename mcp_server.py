import httpx
import json
from fastmcp import FastMCP
from typing import Optional, List, Dict, Any
from datetime import datetime

# Initialize FastMCP server
mcp = FastMCP("Mess Management System")

BASE_URL = "https://mess.iiit.ac.in/api"

async def make_request(
    endpoint: str, 
    method: str = "GET", 
    params: Optional[Dict[str, Any]] = None, 
    json_data: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Helper function to make requests to the Mess API."""
    headers = {}
    if api_key:
        headers["authorization"] = api_key
    
    async with httpx.AsyncClient() as client:
        try:
            if method == "GET":
                response = await client.get(f"{BASE_URL}{endpoint}", params=params, headers=headers)
            elif method == "POST":
                response = await client.post(f"{BASE_URL}{endpoint}", json=json_data, headers=headers)
            elif method == "DELETE":
                response = await client.delete(f"{BASE_URL}{endpoint}", params=params, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            return {"error": str(e), "status_code": e.response.status_code, "detail": e.response.text}
        except Exception as e:
            return {"error": str(e)}

async def fetch_config_internal(api_key: str) -> Dict[str, Any]:
    """Internal helper to fetch all config settings."""
    async with httpx.AsyncClient() as client:
        headers = {"authorization": api_key}
        endpoints = [
            "/config/registration-window",
            "/config/cancellation-window",
            "/config/feedback-window",
            "/config/extras-window",
            "/config/registration-max-date"
        ]
        results = {}
        for ep in endpoints:
            key = ep.split("/")[-1]
            try:
                resp = await client.get(f"{BASE_URL}{ep}", headers=headers)
                results[key] = resp.json().get("data")
            except:
                results[key] = None
        return results

# --- MCP Resources (Static/Semi-Static Data) ---

@mcp.resource("mess://info")
async def mess_info_resource() -> str:
    """Static information about all messes (names, IDs, locations)."""
    data = await make_request("/mess/info")
    return json.dumps(data, indent=2)

@mcp.resource("mess://menus/today")
async def todays_menu_resource() -> str:
    """Today's menu for all messes."""
    data = await make_request("/mess/menus")
    return json.dumps(data, indent=2)

@mcp.resource("mess://menus/{date}")
async def menu_by_date_resource(date: str) -> str:
    """Menu for a specific date (YYYY-MM-DD format)."""
    data = await make_request("/mess/menus", params={"on": date})
    return json.dumps(data, indent=2)

@mcp.resource("mess://rates/{meal}")
async def rates_by_meal_resource(meal: str) -> str:
    """Rates for a meal (breakfast, lunch, snacks, dinner) for today."""
    data = await make_request("/mess/rates", params={"meal": meal})
    return json.dumps(data, indent=2)

@mcp.resource("mess://rates/{meal}/{date}")
async def rates_by_meal_date_resource(meal: str, date: str) -> str:
    """Rates for a meal on a specific date."""
    data = await make_request("/mess/rates", params={"meal": meal, "on": date})
    return json.dumps(data, indent=2)

@mcp.resource("mess://ratings/{meal}/{mess}/{date}")
async def meal_ratings_resource(meal: str, mess: str, date: str) -> str:
    """Public average ratings for a specific meal, mess, and date."""
    params = {"meal": meal, "mess": mess, "date": date}
    data = await make_request("/registration/rating", params=params)
    return json.dumps(data, indent=2)

@mcp.resource("mess://billing/history/{api_key}")
async def bill_history_resource(api_key: str) -> str:
    """Full breakdown of mess bills for all months."""
    data = await make_request("/bills", api_key=api_key)
    return json.dumps(data, indent=2)

@mcp.resource("mess://billing/{year}/{month}/{api_key}")
async def monthly_bill_resource(year: int, month: int, api_key: str) -> str:
    """Mess bill for a specific month and year."""
    params = {"year": year, "month": month}
    data = await make_request("/registrations/bill", params=params, api_key=api_key)
    return json.dumps(data, indent=2)

@mcp.resource("mess://config/windows/{api_key}")
async def config_windows_resource(api_key: str) -> str:
    """Current registration, cancellation, and feedback windows."""
    data = await fetch_config_internal(api_key)
    return json.dumps(data, indent=2)

@mcp.resource("mess://config/cancellation-limits/{meal}/{api_key}")
async def cancellation_limits_resource(meal: str, api_key: str) -> str:
    """Max cancellations for a specific meal."""
    params = {"meal": meal}
    data = await make_request("/config/max-cancellations", params=params, api_key=api_key)
    return json.dumps(data, indent=2)

@mcp.resource("mess://extras/available/{meal}/{date}/{api_key}")
async def available_extras_resource(meal: str, date: str, api_key: str) -> str:
    """Available extra items for a specific meal and date."""
    params = {"meal": meal, "date": date}
    data = await make_request("/extras", params=params, api_key=api_key)
    return json.dumps(data, indent=2)

# --- Public Tools ---

@mcp.tool()
async def get_capacities(meal: str, api_key: str, date: Optional[str] = None) -> Dict[str, Any]:
    """
    Get mess capacities for a meal.
    :param meal: The name of the meal (breakfast, lunch, snacks, dinner).
    :param api_key: MMS API Key.
    :param date: Meal date for getting the capacity (YYYY-MM-DD). Defaults to today's date.
    """
    params = {"meal": meal}
    if date:
        params["on"] = date
    return await make_request("/mess/capacities", params=params, api_key=api_key)

# --- Registration Tools ---

@mcp.tool()
async def get_registrations(from_date: str, to_date: str, api_key: str) -> Dict[str, Any]:
    """
    Get all registrations (past and upcoming) in a timeframe.
    :param from_date: Start date (YYYY-MM-DD).
    :param to_date: End date (YYYY-MM-DD).
    :param api_key: MMS API Key.
    """
    params = {"from": from_date, "to": to_date}
    return await make_request("/registrations", params=params, api_key=api_key)

@mcp.tool()
async def get_single_registration(date: Optional[str] = None, meal: Optional[str] = None, api_key: str = None) -> Dict[str, Any]:
    """
    Get one registration for meal on date.
    :param date: Date (YYYY-MM-DD). Defaults to today.
    :param meal: Meal name (breakfast, lunch, snacks, dinner).
    :param api_key: MMS API Key.
    """
    params = {}
    if date: params["date"] = date
    if meal: params["meal"] = meal
    return await make_request("/registration", params=params, api_key=api_key)

@mcp.tool()
async def register_meal(meal_date: str, meal_type: str, meal_mess: str, guests: int = 0, api_key: str = None) -> Dict[str, Any]:
    """
    Create or update a meal registration.
    :param meal_date: Date (YYYY-MM-DD).
    :param meal_type: Meal type (breakfast, lunch, snacks, dinner).
    :param meal_mess: Mess ID (e.g., yuktahar, kadamba-nonveg).
    :param guests: Number of guests.
    :param api_key: MMS API Key.
    """
    json_data = {
        "meal_date": meal_date,
        "meal_type": meal_type,
        "meal_mess": meal_mess,
        "guests": guests
    }
    return await make_request("/registrations", method="POST", json_data=json_data, api_key=api_key)

@mcp.tool()
async def cancel_meal(meal_date: str, meal_type: str, api_key: str) -> Dict[str, Any]:
    """
    Cancel a meal registration.
    :param meal_date: Date (YYYY-MM-DD).
    :param meal_type: Meal type.
    :param api_key: MMS API Key.
    """
    json_data = {"meal_date": meal_date, "meal_type": meal_type}
    return await make_request("/registrations/cancel", method="POST", json_data=json_data, api_key=api_key)

@mcp.tool()
async def uncancel_meal(meal_date: str, meal_type: str, api_key: str) -> Dict[str, Any]:
    """
    Uncancel a meal registration.
    :param meal_date: Date (YYYY-MM-DD).
    :param meal_type: Meal type.
    :param api_key: MMS API Key.
    """
    json_data = {"meal_date": meal_date, "meal_type": meal_type}
    return await make_request("/registrations/uncancel", method="POST", json_data=json_data, api_key=api_key)

@mcp.tool()
async def skip_meal(meal_date: str, meal_type: str, meal_mess: str, skipping: bool = True, api_key: str = None) -> Dict[str, Any]:
    """
    Set a registration as skipped/unskipped.
    :param meal_date: Date (YYYY-MM-DD).
    :param meal_type: Meal type.
    :param meal_mess: Mess ID.
    :param skipping: Whether to skip or not.
    :param api_key: MMS API Key.
    """
    json_data = {
        "meal_date": meal_date,
        "meal_type": meal_type,
        "meal_mess": meal_mess,
        "skipping": skipping
    }
    return await make_request("/registrations/skipping", method="POST", json_data=json_data, api_key=api_key)

# --- Monthly Registration Tools ---

@mcp.tool()
async def get_monthly_registration(month: Optional[int] = None, year: Optional[int] = None, api_key: str = None) -> Dict[str, Any]:
    """
    Get monthly registration status.
    :param month: Month (1-12). Defaults to current.
    :param year: Year (YYYY). Defaults to current.
    :param api_key: MMS API Key.
    """
    params = {}
    if month: params["month"] = month
    if year: params["year"] = year
    return await make_request("/registrations/monthly", params=params, api_key=api_key)

@mcp.tool()
async def create_monthly_registration(month: int, year: int, mess: str, api_key: str) -> Dict[str, Any]:
    """
    Create a monthly registration.
    :param month: Month (1-12).
    :param year: Year (YYYY).
    :param mess: Mess ID.
    :param api_key: MMS API Key.
    """
    json_data = {"month": month, "year": year, "mess": mess}
    return await make_request("/registrations/monthly", method="POST", json_data=json_data, api_key=api_key)

@mcp.tool()
async def delete_monthly_registration(month: int, year: int, api_key: str) -> Dict[str, Any]:
    """
    Delete a monthly registration.
    :param month: Month (1-12).
    :param year: Year (YYYY).
    :param api_key: MMS API Key.
    """
    params = {"month": month, "year": year}
    return await make_request("/registrations/monthly", method="DELETE", params=params, api_key=api_key)

# --- Feedback Tools ---

@mcp.tool()
async def provide_feedback(meal_date: str, meal_type: str, rating: int, remarks: Optional[str] = None, api_key: str = None) -> Dict[str, Any]:
    """
    Provide feedback for a meal.
    :param meal_date: Date (YYYY-MM-DD).
    :param meal_type: Meal type.
    :param rating: Rating (1-5).
    :param remarks: Additional comments.
    :param api_key: MMS API Key.
    """
    json_data = {
        "meal_date": meal_date,
        "meal_type": meal_type,
        "rating": rating
    }
    if remarks: json_data["remarks"] = remarks
    return await make_request("/registrations/feedback", method="POST", json_data=json_data, api_key=api_key)

# --- Billing Tools ---

@mcp.tool()
async def get_cancellation_count(meal: str, month: Optional[int] = None, year: Optional[int] = None, api_key: str = None) -> Dict[str, Any]:
    """
    Get the number of cancelled registrations in a month.
    :param meal: Meal type.
    :param month: Month (1-12).
    :param year: Year (YYYY).
    :param api_key: MMS API Key.
    """
    params = {"meal": meal}
    if month: params["month"] = month
    if year: params["year"] = year
    return await make_request("/registrations/cancellations", params=params, api_key=api_key)

# --- Extras Tools ---

@mcp.tool()
async def get_registered_extras(meal: str, date: Optional[str] = None, api_key: str = None) -> Dict[str, Any]:
    """
    Get extra items that have been registered to.
    :param meal: Meal type.
    :param date: Date (YYYY-MM-DD).
    :param api_key: MMS API Key.
    """
    params = {"meal": meal}
    if date: params["date"] = date
    return await make_request("/registrations/extras", params=params, api_key=api_key)

@mcp.tool()
async def register_extra(extra_id: str, meal_date: str, meal_type: str, meal_mess: str, api_key: str) -> Dict[str, Any]:
    """
    Create an extra registration.
    :param extra_id: ID of the extra item.
    :param meal_date: Date (YYYY-MM-DD).
    :param meal_type: Meal type.
    :param meal_mess: Mess ID.
    :param api_key: MMS API Key.
    """
    json_data = {
        "extra": extra_id,
        "meal_date": meal_date,
        "meal_type": meal_type,
        "meal_mess": meal_mess
    }
    return await make_request("/registrations/extras", method="POST", json_data=json_data, api_key=api_key)

@mcp.tool()
async def delete_extra(registration_id: str, api_key: str) -> Dict[str, Any]:
    """
    Delete an extra registration.
    :param registration_id: ID of the extra registration.
    :param api_key: MMS API Key.
    """
    params = {"id": registration_id}
    return await make_request("/registrations/extras", method="DELETE", params=params, api_key=api_key)

# --- Streamable HTTP Server ---

if __name__ == "__main__":
    import uvicorn
    # Create Starlette app with streamable-http transport
    app = mcp.http_app(path="/mcp", transport="streamable-http")
    uvicorn.run(app, host="0.0.0.0", port=8000)
