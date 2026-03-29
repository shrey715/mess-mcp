"""MCP Resources. Maps to static or read-only context data."""

import json
from datetime import datetime, date
from mess_mcp.server import mcp
from mess_mcp.api import make_request, fetch_config_internal, APIError

# --- Static Informational Resources ---

@mcp.resource("mess://info")
async def mess_info_resource() -> str:
    """Static information about all messes (names, IDs, locations)."""
    try:
        data = await make_request("/mess/info")
        return json.dumps(data, indent=2)
    except APIError as e:
        return f"Error fetching mess info: {e}"

@mcp.resource("mess://menus/today")
async def todays_menu_resource() -> str:
    """Today's menu for all messes."""
    try:
        data = await make_request("/mess/menus")
        return json.dumps(data, indent=2)
    except APIError as e:
        return f"Error fetching today's menu: {e}"

@mcp.resource("mess://menus/{date_str}")
async def menu_by_date_resource(date_str: str) -> str:
    """Menu for a specific date (YYYY-MM-DD format)."""
    try:
        data = await make_request("/mess/menus", params={"on": date_str})
        return json.dumps(data, indent=2)
    except APIError as e:
        return f"Error fetching menu for {date_str}: {e}"

@mcp.resource("mess://rates/{meal}")
async def rates_by_meal_resource(meal: str) -> str:
    """Rates for a meal (breakfast, lunch, snacks, dinner) for today."""
    try:
        data = await make_request("/mess/rates", params={"meal": meal})
        return json.dumps(data, indent=2)
    except APIError as e:
        return f"Error fetching rates for {meal}: {e}"

@mcp.resource("mess://capacities")
async def general_capacities_resource() -> str:
    """Overall Mess Capacity details for the current period."""
    try:
        data = await make_request("/mess/capacities")
        return json.dumps(data, indent=2)
    except APIError as e:
        return f"Error fetching capacities: {e}"

# --- Authenticated Resources (Require MESS_API_KEY environment variable or system defaults) ---

@mcp.resource("mess://profile")
async def my_profile_resource() -> str:
    """The current user's profile and authentication token data."""
    try:
        data = await make_request("/auth/me")
        return json.dumps(data, indent=2)
    except APIError as e:
        return json.dumps({"error": f"Requires valid authentication. {e}"})

@mcp.resource("mess://config/windows")
async def config_windows_resource() -> str:
    """Current registration, cancellation, and feedback windows."""
    try:
        data = await fetch_config_internal(api_key=None)
        return json.dumps(data, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})

@mcp.resource("mess://billing/history")
async def bill_history_resource() -> str:
    """Full breakdown of mess bills for all recorded months."""
    try:
        data = await make_request("/bills")
        return json.dumps(data, indent=2)
    except APIError as e:
        return json.dumps({"error": f"Requires valid authentication. {e}"})

@mcp.resource("mess://billing/{year}/{month}")
async def monthly_bill_resource(year: str, month: str) -> str:
    """Mess bill for a specific month (1-12) and year (YYYY)."""
    try:
        month_int = int(month)
        year_int = int(year)
    except ValueError:
        return json.dumps({"error": "Month and year must be integers."})
        
    try:
        params = {"year": year_int, "month": month_int}
        data = await make_request("/registrations/bill", params=params)
        return json.dumps(data, indent=2)
    except APIError as e:
        return json.dumps({"error": f"Requires valid authentication. {e}"})
