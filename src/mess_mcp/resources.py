"""MCP Resources — read-only context data surfaced to the language model."""

import json
from typing import Any

from mess_mcp.server import mcp
from mess_mcp.api import make_request, fetch_config_internal, APIError


def _dump(data: Any) -> str:
    return json.dumps(data, indent=2)


def _error(msg: str) -> str:
    return json.dumps({"error": msg})


# ---------------------------------------------------------------------------
# Public resources (no authentication required)
# ---------------------------------------------------------------------------


@mcp.resource("mess://info")
async def mess_info_resource() -> str:
    """Static information about all messes: names, identifiers, and locations."""
    try:
        return _dump(await make_request("/mess/info"))
    except APIError as exc:
        return _error(str(exc))


@mcp.resource("mess://menus/today")
async def todays_menu_resource() -> str:
    """Today's food menu for every mess."""
    try:
        return _dump(await make_request("/mess/menus"))
    except APIError as exc:
        return _error(str(exc))


@mcp.resource("mess://menus/{date_str}")
async def menu_by_date_resource(date_str: str) -> str:
    """Food menu for all messes on a specific date (YYYY-MM-DD)."""
    try:
        return _dump(await make_request("/mess/menus", params={"on": date_str}))
    except APIError as exc:
        return _error(f"Could not fetch menu for {date_str}: {exc}")


@mcp.resource("mess://rates/{meal}")
async def rates_by_meal_resource(meal: str) -> str:
    """Per-mess meal rates for a given meal type (breakfast/lunch/snacks/dinner)."""
    try:
        return _dump(await make_request("/mess/rates", params={"meal": meal}))
    except APIError as exc:
        return _error(f"Could not fetch rates for {meal}: {exc}")


@mcp.resource("mess://capacities/{meal}")
async def capacities_resource(meal: str) -> str:
    """Available seat counts and maximum capacity per mess for a given meal."""
    try:
        return _dump(await make_request("/mess/capacities", params={"meal": meal}))
    except APIError as exc:
        return _error(str(exc))


@mcp.resource("mess://config/meal-timings")
async def meal_timings_resource() -> str:
    """Official meal serving timings for each mess (today's date)."""
    try:
        return _dump(await make_request("/config/meal-timings"))
    except APIError as exc:
        return _error(str(exc))


# ---------------------------------------------------------------------------
# Authenticated resources (require MESS_API_KEY environment variable)
# ---------------------------------------------------------------------------


@mcp.resource("mess://profile")
async def my_profile_resource() -> str:
    """The authenticated user's profile and account details."""
    try:
        return _dump(await make_request("/auth/me"))
    except APIError as exc:
        return _error(f"Authentication required: {exc}")


@mcp.resource("mess://auth/keys")
async def auth_keys_resource() -> str:
    """All API keys associated with the authenticated user, including expired ones."""
    try:
        return _dump(await make_request("/auth/keys"))
    except APIError as exc:
        return _error(f"Authentication required: {exc}")


@mcp.resource("mess://config/windows")
async def config_windows_resource() -> str:
    """All system operational windows: registration, cancellation, feedback, extras, skip."""
    try:
        return _dump(await fetch_config_internal())
    except Exception as exc:
        return _error(str(exc))


@mcp.resource("mess://preferences")
async def preferences_resource() -> str:
    """The authenticated user's saved preferences."""
    try:
        return _dump(await make_request("/preferences"))
    except APIError as exc:
        return _error(f"Authentication required: {exc}")


@mcp.resource("mess://billing/history")
async def bill_history_resource() -> str:
    """Full historical breakdown of mess bills across all recorded months."""
    try:
        return _dump(await make_request("/bills"))
    except APIError as exc:
        return _error(f"Authentication required: {exc}")


@mcp.resource("mess://billing/{year}/{month}")
async def monthly_bill_resource(year: str, month: str) -> str:
    """Projected and confirmed mess bill for a specific year and month (1-12)."""
    try:
        params = {"year": int(year), "month": int(month)}
    except ValueError:
        return _error("year and month must be integers.")
    try:
        return _dump(await make_request("/registrations/bill", params=params))
    except APIError as exc:
        return _error(f"Authentication required: {exc}")
