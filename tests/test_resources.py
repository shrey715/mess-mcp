"""Unit tests for mess_mcp/resources.py — all MCP resource functions."""

import json
import pytest
import httpx

from mess_mcp import resources


def _json(text: str) -> dict:
    return json.loads(text)


# ---------------------------------------------------------------------------
# Public resources
# ---------------------------------------------------------------------------

class TestMessInfoResource:
    @pytest.mark.asyncio
    async def test_returns_mess_list(self, mock_api):
        payload = {"data": [{"id": "yuktahar", "name": "Yuktahar"}]}
        mock_api.get("/mess/info").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.mess_info_resource())
        assert result == payload

    @pytest.mark.asyncio
    async def test_api_error_returns_error_string(self, mock_api):
        mock_api.get("/mess/info").mock(return_value=httpx.Response(500, json={}))
        result = _json(await resources.mess_info_resource())
        assert "error" in result


class TestTodaysMenuResource:
    @pytest.mark.asyncio
    async def test_returns_menu(self, mock_api):
        payload = {"data": [{"mess": "yuktahar", "days": {}}]}
        mock_api.get("/mess/menus").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.todays_menu_resource())
        assert result == payload

    @pytest.mark.asyncio
    async def test_error_is_json(self, mock_api):
        mock_api.get("/mess/menus").mock(return_value=httpx.Response(401, json={}))
        result = _json(await resources.todays_menu_resource())
        assert "error" in result


class TestMenuByDateResource:
    @pytest.mark.asyncio
    async def test_passes_date_param(self, mock_api):
        payload = {"data": []}
        mock_api.get("/mess/menus").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.menu_by_date_resource(date_str="2026-04-01"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_error_includes_date(self, mock_api):
        mock_api.get("/mess/menus").mock(return_value=httpx.Response(400, json={}))
        result = _json(await resources.menu_by_date_resource(date_str="2026-04-01"))
        assert "error" in result
        # Error message should mention the date
        assert "2026-04-01" in result["error"]


class TestRatesByMealResource:
    @pytest.mark.asyncio
    async def test_returns_rates(self, mock_api):
        payload = {"data": {"registered": [{"mess": "yuktahar", "rate": 4210}]}}
        mock_api.get("/mess/rates").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.rates_by_meal_resource(meal="lunch"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_error_includes_meal(self, mock_api):
        mock_api.get("/mess/rates").mock(return_value=httpx.Response(500, json={}))
        result = _json(await resources.rates_by_meal_resource(meal="breakfast"))
        assert "breakfast" in result["error"]


class TestCapacitiesResource:
    @pytest.mark.asyncio
    async def test_returns_capacities(self, mock_api):
        payload = {"data": {"registered": []}}
        mock_api.get("/mess/capacities").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.capacities_resource(meal="dinner"))
        assert result == payload


class TestMealTimingsResource:
    @pytest.mark.asyncio
    async def test_returns_timings(self, mock_api):
        payload = {"data": {"yuktahar": [{"meal": "breakfast"}]}}
        mock_api.get("/config/meal-timings").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.meal_timings_resource())
        assert result == payload


# ---------------------------------------------------------------------------
# Authenticated resources
# ---------------------------------------------------------------------------

class TestMyProfileResource:
    @pytest.mark.asyncio
    async def test_returns_profile(self, mock_api):
        payload = {"data": {"id": "usr-001", "name": "Test User"}}
        mock_api.get("/auth/me").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.my_profile_resource())
        assert result == payload

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_error(self, mock_api):
        mock_api.get("/auth/me").mock(return_value=httpx.Response(401, json={}))
        result = _json(await resources.my_profile_resource())
        assert "error" in result


class TestAuthKeysResource:
    @pytest.mark.asyncio
    async def test_returns_keys_list(self, mock_api):
        payload = {"data": [{"id": "key-001", "name": "my-key"}]}
        mock_api.get("/auth/keys").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.auth_keys_resource())
        assert result == payload

    @pytest.mark.asyncio
    async def test_unauth_returns_error(self, mock_api):
        mock_api.get("/auth/keys").mock(return_value=httpx.Response(401, json={}))
        result = _json(await resources.auth_keys_resource())
        assert "error" in result


class TestConfigWindowsResource:
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
        result = _json(await resources.config_windows_resource())
        assert "registration-window" in result

    @pytest.mark.asyncio
    async def test_partial_failure_graceful(self, mock_api):
        mock_api.get("/config/registration-window").mock(
            return_value=httpx.Response(200, json={"data": 172800})
        )
        for ep in [
            "/config/cancellation-window",
            "/config/feedback-window",
            "/config/extras-window",
            "/config/skip-window",
            "/config/registration-max-date",
        ]:
            mock_api.get(ep).mock(return_value=httpx.Response(500, json={}))
        result = _json(await resources.config_windows_resource())
        # Should not raise; should return partial data
        assert "registration-window" in result


class TestPreferencesResource:
    @pytest.mark.asyncio
    async def test_returns_preferences(self, mock_api):
        payload = {"data": {"default_mess": "yuktahar"}}
        mock_api.get("/preferences").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.preferences_resource())
        assert result == payload

    @pytest.mark.asyncio
    async def test_unauth_returns_error(self, mock_api):
        mock_api.get("/preferences").mock(return_value=httpx.Response(401, json={}))
        result = _json(await resources.preferences_resource())
        assert "error" in result


class TestBillHistoryResource:
    @pytest.mark.asyncio
    async def test_returns_bills(self, mock_api):
        payload = {"data": [{"month": 3, "year": 2026, "food_bill": 42000}]}
        mock_api.get("/bills").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.bill_history_resource())
        assert result == payload

    @pytest.mark.asyncio
    async def test_unauth_returns_error(self, mock_api):
        mock_api.get("/bills").mock(return_value=httpx.Response(401, json={}))
        result = _json(await resources.bill_history_resource())
        assert "error" in result


class TestMonthlyBillResource:
    @pytest.mark.asyncio
    async def test_returns_bill(self, mock_api):
        payload = {"data": {"non_projected": 38000, "projected": 42000}}
        mock_api.get("/registrations/bill").mock(return_value=httpx.Response(200, json=payload))
        result = _json(await resources.monthly_bill_resource(year="2026", month="3"))
        assert result == payload

    @pytest.mark.asyncio
    async def test_invalid_year_month_type(self, mock_api):
        result = _json(await resources.monthly_bill_resource(year="abc", month="xyz"))
        assert "error" in result
        assert "integer" in result["error"]

    @pytest.mark.asyncio
    async def test_unauth_returns_error(self, mock_api):
        mock_api.get("/registrations/bill").mock(return_value=httpx.Response(401, json={}))
        result = _json(await resources.monthly_bill_resource(year="2026", month="3"))
        assert "error" in result
