"""Unit tests for mess_mcp/tools.py — all MCP tool functions."""

import json
import pytest
import httpx
import respx

from mess_mcp import tools  # ensure decorators register against the mcp instance


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _json(text: str) -> dict:
    return json.loads(text)


# ---------------------------------------------------------------------------
# Mess information tools
# ---------------------------------------------------------------------------

class TestGetCapacities:
    @pytest.mark.asyncio
    async def test_returns_capacities(self, mock_api):
        payload = {"data": {"registered": [{"mess": "yuktahar", "available": 50, "capacity": 420}]}}
        mock_api.get("/mess/capacities").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_capacities(meal="lunch"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_with_date_param(self, mock_api):
        payload = {"data": {}}
        mock_api.get("/mess/capacities").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_capacities(meal="dinner", date="2026-03-30"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_api_error_returns_error_dict(self, mock_api):
        mock_api.get("/mess/capacities").mock(return_value=httpx.Response(401, json={"error": "unauth"}))
        result = _json(await tools.get_capacities(meal="lunch"))
        assert result["error"] is True
        assert result["status_code"] == 401

    @pytest.mark.asyncio
    async def test_network_error_returns_error_dict(self, mock_api):
        mock_api.get("/mess/capacities").mock(side_effect=httpx.ConnectError("fail"))
        result = _json(await tools.get_capacities(meal="lunch"))
        assert result["error"] is True


class TestGetMealTimings:
    @pytest.mark.asyncio
    async def test_returns_timings(self, mock_api):
        payload = {"data": {"yuktahar": [{"meal": "breakfast", "start_time": "07:30:00"}]}}
        mock_api.get("/config/meal-timings").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_meal_timings())
        assert result == payload

    @pytest.mark.asyncio
    async def test_with_date(self, mock_api):
        payload = {"data": {}}
        mock_api.get("/config/meal-timings").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_meal_timings(date="2026-04-01"))
        assert result == payload


# ---------------------------------------------------------------------------
# Registration tools
# ---------------------------------------------------------------------------

class TestCheckRegistrations:
    @pytest.mark.asyncio
    async def test_returns_list(self, mock_api):
        payload = {"data": [{"id": "reg-001", "meal_type": "lunch"}]}
        mock_api.get("/registrations").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.check_registrations(from_date="2026-03-01", to_date="2026-03-31"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_error_propagated(self, mock_api):
        mock_api.get("/registrations").mock(return_value=httpx.Response(500, json={}))
        result = _json(await tools.check_registrations(from_date="2026-03-01", to_date="2026-03-31"))
        assert result["error"] is True


class TestGetRegistration:
    @pytest.mark.asyncio
    async def test_single_meal(self, mock_api):
        payload = {"data": {"id": "reg-001", "meal_type": "lunch"}}
        mock_api.get("/registration").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_registration(meal="lunch", date="2026-03-30"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_no_params_defaults(self, mock_api):
        payload = {"data": {"breakfast": {"id": "reg-001"}}}
        mock_api.get("/registration").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_registration())
        assert result == payload

    @pytest.mark.asyncio
    async def test_404_returns_error(self, mock_api):
        mock_api.get("/registration").mock(return_value=httpx.Response(404, json={}))
        result = _json(await tools.get_registration(meal="lunch"))
        assert result["error"] is True
        assert result["status_code"] == 404


class TestRegisterMeal:
    @pytest.mark.asyncio
    async def test_successful_registration(self, mock_api):
        payload = {"data": {"id": "reg-002", "meal_type": "dinner", "meal_mess": "north"}}
        mock_api.post("/registrations").mock(return_value=httpx.Response(200, json=payload))
        result = _json(
            await tools.register_meal(
                meal_date="2026-03-31",
                meal_type="dinner",
                meal_mess="north",
            )
        )
        assert result == payload

    @pytest.mark.asyncio
    async def test_with_guests(self, mock_api):
        payload = {"data": {"id": "reg-003", "guests": 2}}
        mock_api.post("/registrations").mock(return_value=httpx.Response(200, json=payload))
        result = _json(
            await tools.register_meal(
                meal_date="2026-03-31",
                meal_type="lunch",
                meal_mess="yuktahar",
                guests=2,
            )
        )
        assert result["data"]["guests"] == 2

    @pytest.mark.asyncio
    async def test_window_closed_error(self, mock_api):
        mock_api.post("/registrations").mock(
            return_value=httpx.Response(403, json={"error": {"code": "window-closed"}})
        )
        result = _json(
            await tools.register_meal(
                meal_date="2026-03-01",
                meal_type="lunch",
                meal_mess="yuktahar",
            )
        )
        assert result["error"] is True
        assert result["status_code"] == 403

    @pytest.mark.asyncio
    async def test_capacity_exceeded_error(self, mock_api):
        mock_api.post("/registrations").mock(
            return_value=httpx.Response(403, json={"error": {"code": "capacity-exceeded"}})
        )
        result = _json(
            await tools.register_meal(
                meal_date="2026-03-31",
                meal_type="breakfast",
                meal_mess="north",
            )
        )
        assert result["status_code"] == 403


class TestCancelMeal:
    @pytest.mark.asyncio
    async def test_successful_cancellation(self, mock_api):
        mock_api.post("/registrations/cancel").mock(return_value=httpx.Response(204))
        result = _json(await tools.cancel_meal(meal_date="2026-03-30", meal_type="lunch"))
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_error_propagated(self, mock_api):
        mock_api.post("/registrations/cancel").mock(return_value=httpx.Response(403, json={}))
        result = _json(await tools.cancel_meal(meal_date="2026-03-30", meal_type="lunch"))
        assert result["error"] is True


class TestUncancelMeal:
    @pytest.mark.asyncio
    async def test_successful_uncancel(self, mock_api):
        payload = {"data": {"cancelled": False}}
        mock_api.post("/registrations/uncancel").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.uncancel_meal(meal_date="2026-03-30", meal_type="lunch"))
        assert result == payload


class TestManageSkipping:
    @pytest.mark.asyncio
    async def test_mark_as_skipping(self, mock_api):
        payload = {"data": {"skipping": True}}
        mock_api.post("/registrations/skipping").mock(return_value=httpx.Response(200, json=payload))
        result = _json(
            await tools.manage_skipping(
                meal_date="2026-03-30",
                meal_type="lunch",
                meal_mess="yuktahar",
                skipping=True,
            )
        )
        assert result["data"]["skipping"] is True

    @pytest.mark.asyncio
    async def test_unskip(self, mock_api):
        payload = {"data": {"skipping": False}}
        mock_api.post("/registrations/skipping").mock(return_value=httpx.Response(200, json=payload))
        result = _json(
            await tools.manage_skipping(
                meal_date="2026-03-30",
                meal_type="lunch",
                meal_mess="yuktahar",
                skipping=False,
            )
        )
        assert result["data"]["skipping"] is False


class TestGetCancellationCount:
    @pytest.mark.asyncio
    async def test_returns_count(self, mock_api):
        payload = {"data": 2}
        mock_api.get("/registrations/cancellations").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_cancellation_count(meal="lunch"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_with_month_year(self, mock_api):
        payload = {"data": 0}
        mock_api.get("/registrations/cancellations").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_cancellation_count(meal="dinner", month=2, year=2026))
        assert result == payload


class TestGetMealScanCount:
    @pytest.mark.asyncio
    async def test_returns_scan_data(self, mock_api):
        payload = {"data": {"total": 88, "recent": 5}}
        mock_api.get("/registrations/scans").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_meal_scan_count(meal="lunch", mess="yuktahar"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_no_auth_required(self, mock_api, monkeypatch):
        """Scan endpoint is public — no API token should be needed."""
        monkeypatch.delenv("MESS_API_KEY", raising=False)
        payload = {"data": {"total": 10}}
        mock_api.get("/registrations/scans").mock(return_value=httpx.Response(200, json=payload))
        result = _json(
            await tools.get_meal_scan_count(meal="breakfast", mess="north", api_key=None)
        )
        assert result == payload


# ---------------------------------------------------------------------------
# Monthly registration tools
# ---------------------------------------------------------------------------

class TestMonthlyRegistration:
    @pytest.mark.asyncio
    async def test_get_monthly(self, mock_api):
        payload = {"data": {"month": 3, "year": 2026, "mess": "yuktahar"}}
        mock_api.get("/registrations/monthly").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_monthly_registration(month=3, year=2026))
        assert result == payload

    @pytest.mark.asyncio
    async def test_create_monthly(self, mock_api):
        payload = {"data": {"month": 4, "year": 2026, "mess": "north"}}
        mock_api.post("/registrations/monthly").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.create_monthly_registration(month=4, year=2026, mess_id="north"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_delete_monthly(self, mock_api):
        mock_api.delete("/registrations/monthly").mock(return_value=httpx.Response(204))
        result = _json(await tools.delete_monthly_registration(month=4, year=2026))
        assert result["success"] is True


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

class TestSubmitFeedback:
    @pytest.mark.asyncio
    async def test_with_remarks(self, mock_api):
        payload = {"data": {"id": "fb-001"}}
        mock_api.post("/registrations/feedback").mock(return_value=httpx.Response(200, json=payload))
        result = _json(
            await tools.submit_feedback(
                meal_date="2026-03-30",
                meal_type="lunch",
                rating=4,
                remarks="Good food, warm dal.",
            )
        )
        assert result == payload

    @pytest.mark.asyncio
    async def test_without_remarks(self, mock_api):
        payload = {"data": {"id": "fb-002"}}
        mock_api.post("/registrations/feedback").mock(return_value=httpx.Response(200, json=payload))
        result = _json(
            await tools.submit_feedback(meal_date="2026-03-30", meal_type="dinner", rating=3)
        )
        assert result == payload

    @pytest.mark.asyncio
    async def test_rating_1_min(self, mock_api):
        mock_api.post("/registrations/feedback").mock(
            return_value=httpx.Response(200, json={"data": {}})
        )
        result = _json(
            await tools.submit_feedback(meal_date="2026-03-30", meal_type="breakfast", rating=1)
        )
        assert "error" not in result or not result.get("error")

    @pytest.mark.asyncio
    async def test_window_closed_error(self, mock_api):
        mock_api.post("/registrations/feedback").mock(
            return_value=httpx.Response(403, json={"error": {"code": "window-closed"}})
        )
        result = _json(
            await tools.submit_feedback(meal_date="2025-01-01", meal_type="lunch", rating=5)
        )
        assert result["error"] is True


# ---------------------------------------------------------------------------
# Extras tools
# ---------------------------------------------------------------------------

class TestExtrasTools:
    @pytest.mark.asyncio
    async def test_list_available_extras(self, mock_api):
        payload = {"data": [{"id": "omelette-001", "name": "Omelette"}]}
        mock_api.get("/extras").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.list_available_extras(meal_type="breakfast"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_list_available_extras_with_mess_filter(self, mock_api):
        payload = {"data": []}
        mock_api.get("/extras").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.list_available_extras(meal_type="breakfast", mess="north"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_list_registered_extras(self, mock_api):
        payload = {"data": [{"id": "ereg-001", "extra": "omelette-001"}]}
        mock_api.get("/registrations/extras").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.list_registered_extras(meal_type="breakfast"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_list_extras_in_range(self, mock_api):
        payload = {"data": []}
        mock_api.get("/registrations/extras/range").mock(
            return_value=httpx.Response(200, json=payload)
        )
        result = _json(
            await tools.list_extras_in_range(from_date="2026-03-01", to_date="2026-03-31")
        )
        assert result == payload

    @pytest.mark.asyncio
    async def test_register_extra(self, mock_api):
        payload = {"data": [{"id": "ereg-002"}]}
        mock_api.post("/registrations/extras").mock(return_value=httpx.Response(200, json=payload))
        result = _json(
            await tools.register_extra(
                extra_id="omelette-001",
                meal_date="2026-03-31",
                meal_type="breakfast",
                meal_mess="yuktahar",
            )
        )
        assert result == payload

    @pytest.mark.asyncio
    async def test_delete_extra(self, mock_api):
        payload = {"data": [{"id": "ereg-001"}]}
        mock_api.delete("/registrations/extras").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.delete_extra(registration_id="ereg-001"))
        assert result == payload


# ---------------------------------------------------------------------------
# Auth key management tools
# ---------------------------------------------------------------------------

class TestAuthKeyTools:
    @pytest.mark.asyncio
    async def test_list_auth_keys(self, mock_api):
        payload = {"data": [{"id": "key-001", "name": "my-key"}]}
        mock_api.get("/auth/keys").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.list_auth_keys())
        assert result == payload

    @pytest.mark.asyncio
    async def test_create_auth_key(self, mock_api):
        payload = {"data": {"id": "key-002", "name": "new-key", "key": "tok_abc123"}}
        mock_api.post("/auth/keys").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.create_auth_key(name="new-key", expiry="2027-01-01"))
        assert result["data"]["key"] == "tok_abc123"

    @pytest.mark.asyncio
    async def test_create_key_conflict(self, mock_api):
        mock_api.post("/auth/keys").mock(
            return_value=httpx.Response(409, json={"error": {"code": "already-exists"}})
        )
        result = _json(await tools.create_auth_key(name="existing-key", expiry="2027-01-01"))
        assert result["error"] is True
        assert result["status_code"] == 409

    @pytest.mark.asyncio
    async def test_delete_auth_key(self, mock_api):
        mock_api.delete("/auth/keys/my-key").mock(return_value=httpx.Response(204))
        result = _json(await tools.delete_auth_key(name="my-key"))
        assert result["success"] is True


# ---------------------------------------------------------------------------
# Config tools
# ---------------------------------------------------------------------------

class TestGetConfigWindows:
    @pytest.mark.asyncio
    async def test_returns_all_windows(self, mock_api):
        for ep in [
            "/config/registration-window",
            "/config/cancellation-window",
            "/config/feedback-window",
            "/config/extras-window",
            "/config/skip-window",
            "/config/registration-max-date",
        ]:
            mock_api.get(ep).mock(return_value=httpx.Response(200, json={"data": 172800}))
        result = _json(await tools.get_config_windows())
        assert "registration-window" in result


# ---------------------------------------------------------------------------
# Billing tools
# ---------------------------------------------------------------------------

class TestBillingTools:
    @pytest.mark.asyncio
    async def test_get_monthly_bill(self, mock_api):
        payload = {"data": {"non_projected": 38000, "projected": 42000}}
        mock_api.get("/registrations/bill").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_monthly_bill(month=3, year=2026))
        assert result == payload

    @pytest.mark.asyncio
    async def test_get_monthly_bill_defaults(self, mock_api):
        payload = {"data": {"non_projected": 10000, "projected": 15000}}
        mock_api.get("/registrations/bill").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_monthly_bill())
        assert result == payload

    @pytest.mark.asyncio
    async def test_get_all_bills(self, mock_api):
        payload = {"data": [{"month": 3, "year": 2026, "food_bill": 42000}]}
        mock_api.get("/bills").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_all_bills())
        assert result == payload

    @pytest.mark.asyncio
    async def test_auth_required_for_bills(self, mock_api):
        mock_api.get("/bills").mock(return_value=httpx.Response(401, json={}))
        result = _json(await tools.get_all_bills())
        assert result["error"] is True
        assert result["status_code"] == 401


# ---------------------------------------------------------------------------
# Preferences tools
# ---------------------------------------------------------------------------

class TestPreferencesTools:
    @pytest.mark.asyncio
    async def test_get_preferences(self, mock_api):
        payload = {"data": {"default_mess": "yuktahar"}}
        mock_api.get("/preferences").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await tools.get_preferences())
        assert result == payload

    @pytest.mark.asyncio
    async def test_update_preferences(self, mock_api):
        mock_api.put("/preferences").mock(return_value=httpx.Response(204))
        result = _json(
            await tools.update_preferences(preferences={"default_mess": "north"})
        )
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_update_preferences_bad_request(self, mock_api):
        mock_api.put("/preferences").mock(return_value=httpx.Response(400, json={"error": "bad"}))
        result = _json(await tools.update_preferences(preferences={"invalid_key": True}))
        assert result["error"] is True
