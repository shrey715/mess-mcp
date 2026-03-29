"""MCP Tools — actionable operations exposed to the language model."""

import json
from typing import Optional

from mess_mcp.server import mcp
from mess_mcp.api import make_request, APIError


def _ok(data: object) -> str:
    return json.dumps(data, indent=2)


def _err(exc: Exception) -> str:
    if isinstance(exc, APIError):
        return json.dumps(
            {
                "error": True,
                "status_code": exc.status_code,
                "detail": exc.response_body or str(exc),
            }
        )
    return json.dumps({"error": True, "detail": str(exc)})


# ---------------------------------------------------------------------------
# Mess information
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_capacities(
    meal: str,
    date: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    Return available seat counts and maximum capacity for every mess for a meal.

    Call this before registering to verify a mess is not full.

    Args:
        meal: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        date: Target date (YYYY-MM-DD). Defaults to today.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        params: dict = {"meal": meal}
        if date:
            params["on"] = date
        return _ok(await make_request("/mess/capacities", params=params, api_key=api_key))
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def get_meal_timings(
    date: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    Return official meal serving timings for each mess.

    Args:
        date: Target date (YYYY-MM-DD). Defaults to today.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        params: dict = {}
        if date:
            params["on"] = date
        return _ok(await make_request("/config/meal-timings", params=params, api_key=api_key))
    except Exception as exc:
        return _err(exc)


# ---------------------------------------------------------------------------
# Registrations
# ---------------------------------------------------------------------------


@mcp.tool()
async def check_registrations(
    from_date: str,
    to_date: str,
    api_key: Optional[str] = None,
) -> str:
    """
    List all meal registrations (past and upcoming) within a date range (max 2 months).

    Args:
        from_date: Range start date (YYYY-MM-DD), inclusive.
        to_date: Range end date (YYYY-MM-DD), inclusive.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations",
                params={"from": from_date, "to": to_date},
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def get_registration(
    meal: Optional[str] = None,
    date: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    Look up the registration for a single meal.

    If meal is omitted, returns registrations for all meals on that date.
    If date is omitted, today is assumed.

    Args:
        meal: One of 'breakfast', 'lunch', 'snacks', 'dinner'. Optional.
        date: Target date (YYYY-MM-DD). Optional.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        params: dict = {}
        if meal:
            params["meal"] = meal
        if date:
            params["date"] = date
        return _ok(await make_request("/registration", params=params, api_key=api_key))
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def register_meal(
    meal_date: str,
    meal_type: str,
    meal_mess: str,
    guests: int = 0,
    api_key: Optional[str] = None,
) -> str:
    """
    Create or update a meal registration.

    If the registration already exists it will be updated. Use check_registrations
    to confirm the registration or cancellation window is open before calling this.

    Args:
        meal_date: Target date (YYYY-MM-DD).
        meal_type: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        meal_mess: Mess identifier, e.g. 'yuktahar', 'kadamba-nonveg', 'north'.
        guests: Number of external guests (0–5, billed additionally).
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations",
                method="POST",
                json_data={
                    "meal_date": meal_date,
                    "meal_type": meal_type,
                    "meal_mess": meal_mess,
                    "guests": guests,
                },
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def cancel_meal(
    meal_date: str,
    meal_type: str,
    api_key: Optional[str] = None,
) -> str:
    """
    Cancel a meal registration.

    Monthly cancellation limits may apply. Check get_cancellation_count first.

    Args:
        meal_date: Target date (YYYY-MM-DD).
        meal_type: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations/cancel",
                method="POST",
                json_data={"meal_date": meal_date, "meal_type": meal_type},
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def uncancel_meal(
    meal_date: str,
    meal_type: str,
    api_key: Optional[str] = None,
) -> str:
    """
    Reverse a meal cancellation.

    Args:
        meal_date: Target date (YYYY-MM-DD).
        meal_type: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations/uncancel",
                method="POST",
                json_data={"meal_date": meal_date, "meal_type": meal_type},
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def manage_skipping(
    meal_date: str,
    meal_type: str,
    meal_mess: str,
    skipping: bool = True,
    api_key: Optional[str] = None,
) -> str:
    """
    Mark a registered meal as skipped (or un-skipped).

    Notifying the kitchen reduces food waste. Must be submitted before the
    skip window closes (typically 3 hours before the meal).

    Args:
        meal_date: Target date (YYYY-MM-DD).
        meal_type: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        meal_mess: The mess at which the user is registered.
        skipping: True to mark as skipping, False to undo.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations/skipping",
                method="POST",
                json_data={
                    "meal_date": meal_date,
                    "meal_type": meal_type,
                    "meal_mess": meal_mess,
                    "skipping": skipping,
                },
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def get_cancellation_count(
    meal: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    Return how many cancellations the user has used for a meal in a given month.

    Compares this against the system maximum (from get_config_windows) to
    determine remaining budget before penalties apply.

    Args:
        meal: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        month: Month (1-12). Defaults to current month.
        year: Year (YYYY). Defaults to current year.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        params: dict = {"meal": meal}
        if month:
            params["month"] = month
        if year:
            params["year"] = year
        return _ok(await make_request("/registrations/cancellations", params=params, api_key=api_key))
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def get_meal_scan_count(
    meal: str,
    mess: str,
    date: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    Return aggregated meal scan/availment counts for a mess on a given day.

    This is public data — no authentication is required, but an api_key can
    be provided for consistency.

    Args:
        meal: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        mess: Mess identifier, e.g. 'yuktahar'.
        date: Target date (YYYY-MM-DD). Defaults to today.
        api_key: API key. Optional.
    """
    try:
        params: dict = {"meal": meal, "mess": mess}
        if date:
            params["date"] = date
        return _ok(await make_request("/registrations/scans", params=params, api_key=api_key))
    except Exception as exc:
        return _err(exc)


# ---------------------------------------------------------------------------
# Monthly registrations
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_monthly_registration(
    month: Optional[int] = None,
    year: Optional[int] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    Return the current monthly registration status.

    Args:
        month: Month (1-12). Defaults to current month.
        year: Year (YYYY). Defaults to current year.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        params: dict = {}
        if month:
            params["month"] = month
        if year:
            params["year"] = year
        return _ok(await make_request("/registrations/monthly", params=params, api_key=api_key))
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def create_monthly_registration(
    month: int,
    year: int,
    mess_id: str,
    api_key: Optional[str] = None,
) -> str:
    """
    Enrol in a mess for an entire calendar month.

    Args:
        month: Month number (1-12).
        year: Year (YYYY).
        mess_id: Mess identifier, e.g. 'yuktahar'.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations/monthly",
                method="POST",
                json_data={"month": month, "year": year, "mess": mess_id},
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def delete_monthly_registration(
    month: int,
    year: int,
    api_key: Optional[str] = None,
) -> str:
    """
    Remove the monthly registration for a given month.

    Args:
        month: Month number (1-12).
        year: Year (YYYY).
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations/monthly",
                method="DELETE",
                params={"month": month, "year": year},
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------


@mcp.tool()
async def submit_feedback(
    meal_date: str,
    meal_type: str,
    rating: int,
    remarks: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    Submit quality feedback for a consumed meal.

    Args:
        meal_date: Date the meal was consumed (YYYY-MM-DD).
        meal_type: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        rating: Star rating out of 5 (1 = poor, 5 = excellent).
        remarks: Optional free-text comment on taste, hygiene, temperature, etc.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        payload: dict = {
            "meal_date": meal_date,
            "meal_type": meal_type,
            "rating": rating,
        }
        if remarks:
            payload["remarks"] = remarks
        return _ok(
            await make_request(
                "/registrations/feedback",
                method="POST",
                json_data=payload,
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


# ---------------------------------------------------------------------------
# Extras
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_available_extras(
    meal_type: str,
    date: Optional[str] = None,
    mess: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    List extra items (e.g. omelettes, special dishes) available to book for a meal.

    Args:
        meal_type: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        date: Target date (YYYY-MM-DD). Defaults to today.
        mess: Filter results to a specific mess. Optional.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        params: dict = {"meal": meal_type}
        if date:
            params["date"] = date
        if mess:
            params["mess"] = mess
        return _ok(await make_request("/extras", params=params, api_key=api_key))
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def list_registered_extras(
    meal_type: str,
    date: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    List extra items the user has already booked for a meal.

    Args:
        meal_type: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        date: Target date (YYYY-MM-DD). Defaults to today.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        params: dict = {"meal": meal_type}
        if date:
            params["date"] = date
        return _ok(await make_request("/registrations/extras", params=params, api_key=api_key))
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def list_extras_in_range(
    from_date: str,
    to_date: str,
    api_key: Optional[str] = None,
) -> str:
    """
    List all extra registrations within a date range (max 2 months).

    Args:
        from_date: Range start date (YYYY-MM-DD), inclusive.
        to_date: Range end date (YYYY-MM-DD), inclusive.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations/extras/range",
                params={"from": from_date, "to": to_date},
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def register_extra(
    extra_id: str,
    meal_date: str,
    meal_type: str,
    meal_mess: str,
    api_key: Optional[str] = None,
) -> str:
    """
    Book an extra item for a meal.

    The user must have an existing regular registration at the same mess for
    that meal before booking extras.

    Args:
        extra_id: Identifier of the extra item (from list_available_extras).
        meal_date: Target date (YYYY-MM-DD).
        meal_type: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
        meal_mess: Mess where the extra will be served.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations/extras",
                method="POST",
                json_data={
                    "extra": extra_id,
                    "meal_date": meal_date,
                    "meal_type": meal_type,
                    "meal_mess": meal_mess,
                },
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def delete_extra(
    registration_id: str,
    api_key: Optional[str] = None,
) -> str:
    """
    Cancel an extra item booking.

    Extra registrations cannot be modified — delete and recreate if needed.

    Args:
        registration_id: ID of the extra registration (from list_registered_extras).
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/registrations/extras",
                method="DELETE",
                params={"id": registration_id},
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


# ---------------------------------------------------------------------------
# Authentication management
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_auth_keys(api_key: Optional[str] = None) -> str:
    """
    List all API keys belonging to the authenticated user, including expired ones.

    Args:
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(await make_request("/auth/keys", api_key=api_key))
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def create_auth_key(
    name: str,
    expiry: str,
    api_key: Optional[str] = None,
) -> str:
    """
    Create a new named API key.

    The returned key value is only shown once — store it securely.

    Args:
        name: A unique human-readable name for the key.
        expiry: Expiry date in YYYY-MM-DD format.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/auth/keys",
                method="POST",
                json_data={"name": name, "expiry": expiry},
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def delete_auth_key(
    name: str,
    api_key: Optional[str] = None,
) -> str:
    """
    Delete an API key by name.

    The key is identified by its human-readable name, not its token value.

    Args:
        name: The name of the key to delete.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                f"/auth/keys/{name}",
                method="DELETE",
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_config_windows(api_key: Optional[str] = None) -> str:
    """
    Return all system operational windows in seconds.

    Includes registration, cancellation, feedback, extras, and skip windows,
    as well as the registration maximum date.

    Args:
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    from mess_mcp.api import fetch_config_internal

    try:
        return _ok(await fetch_config_internal(api_key=api_key))
    except Exception as exc:
        return _err(exc)


# ---------------------------------------------------------------------------
# Billing
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_monthly_bill(
    month: Optional[int] = None,
    year: Optional[int] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    Return the projected and confirmed mess bill for a calendar month.

    Bills are returned in paise (1 INR = 100 paise).

    Args:
        month: Month (1-12). Defaults to current month.
        year: Year (YYYY). Defaults to current year.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        params: dict = {}
        if month:
            params["month"] = month
        if year:
            params["year"] = year
        return _ok(await make_request("/registrations/bill", params=params, api_key=api_key))
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def get_all_bills(api_key: Optional[str] = None) -> str:
    """
    Return a full historical breakdown of mess bills across all recorded months.

    Bills are returned in paise (1 INR = 100 paise) and include food, extras,
    and infrastructure costs.

    Args:
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(await make_request("/bills", api_key=api_key))
    except Exception as exc:
        return _err(exc)


# ---------------------------------------------------------------------------
# Preferences
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_preferences(api_key: Optional[str] = None) -> str:
    """
    Fetch all saved user preferences from the Mess portal.

    Args:
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(await make_request("/preferences", api_key=api_key))
    except Exception as exc:
        return _err(exc)


@mcp.tool()
async def update_preferences(
    preferences: dict,
    api_key: Optional[str] = None,
) -> str:
    """
    Update all user preferences in the Mess portal.

    Args:
        preferences: A dictionary of preference keys and their new values.
        api_key: API key. Falls back to MESS_API_KEY environment variable.
    """
    try:
        return _ok(
            await make_request(
                "/preferences",
                method="PUT",
                json_data=preferences,
                api_key=api_key,
            )
        )
    except Exception as exc:
        return _err(exc)
