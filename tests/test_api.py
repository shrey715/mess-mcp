"""Unit tests for mess_mcp/api.py — HTTP client and APIError."""

import json
import os
import pytest
import respx
import httpx

from mess_mcp.api import make_request, fetch_config_internal, APIError
from mess_mcp.constants import BASE_URL


# ---------------------------------------------------------------------------
# make_request — success paths
# ---------------------------------------------------------------------------

class TestMakeRequestSuccess:
    @pytest.mark.asyncio
    async def test_get_returns_json(self, mock_api):
        payload = {"data": [{"id": "yuktahar"}]}
        mock_api.get("/mess/info").mock(return_value=httpx.Response(200, json=payload))
        result = await make_request("/mess/info")
        assert result == payload

    @pytest.mark.asyncio
    async def test_post_sends_json_body(self, mock_api):
        payload = {"data": {"id": "reg-001"}}
        mock_api.post("/registrations").mock(return_value=httpx.Response(200, json=payload))
        result = await make_request(
            "/registrations",
            method="POST",
            json_data={"meal_date": "2026-03-30", "meal_type": "lunch"},
        )
        assert result == payload

    @pytest.mark.asyncio
    async def test_put_sends_json_body(self, mock_api):
        mock_api.put("/preferences").mock(return_value=httpx.Response(200, json={"data": {}}))
        result = await make_request("/preferences", method="PUT", json_data={"default_mess": "north"})
        assert result == {"data": {}}

    @pytest.mark.asyncio
    async def test_delete_sends_params(self, mock_api):
        mock_api.delete("/registrations/monthly").mock(
            return_value=httpx.Response(200, json={"data": "deleted"})
        )
        result = await make_request(
            "/registrations/monthly", method="DELETE", params={"month": 3, "year": 2026}
        )
        assert result == {"data": "deleted"}

    @pytest.mark.asyncio
    async def test_204_returns_success_dict(self, mock_api):
        mock_api.post("/registrations/cancel").mock(return_value=httpx.Response(204))
        result = await make_request("/registrations/cancel", method="POST", json_data={})
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_non_json_200_returns_text_dict(self, mock_api):
        mock_api.get("/misc").mock(return_value=httpx.Response(200, text="plain text"))
        result = await make_request("/misc")
        assert result == {"success": True, "text": "plain text"}

    @pytest.mark.asyncio
    async def test_api_key_sent_in_header(self, mock_api):
        """Verify the API token is transmitted in the authorization header."""
        captured = {}

        def capture(request, route):
            captured["auth"] = request.headers.get("authorization")
            return httpx.Response(200, json={"data": []})

        mock_api.get("/auth/keys").mock(side_effect=capture)
        await make_request("/auth/keys", api_key="my-token")
        assert captured["auth"] == "my-token"

    @pytest.mark.asyncio
    async def test_env_var_fallback(self, mock_api, monkeypatch):
        """Falls back to MESS_API_KEY environment variable when no api_key given."""
        monkeypatch.setenv("MESS_API_KEY", "env-token")
        captured = {}

        def capture(request, route):
            captured["auth"] = request.headers.get("authorization")
            return httpx.Response(200, json={"data": []})

        mock_api.get("/auth/me").mock(side_effect=capture)
        await make_request("/auth/me")
        assert captured["auth"] == "env-token"

    @pytest.mark.asyncio
    async def test_no_auth_header_when_no_key(self, mock_api, monkeypatch):
        monkeypatch.delenv("MESS_API_KEY", raising=False)
        captured = {}

        def capture(request, route):
            captured["auth"] = request.headers.get("authorization")
            return httpx.Response(200, json={"data": []})

        mock_api.get("/mess/info").mock(side_effect=capture)
        await make_request("/mess/info")
        assert captured["auth"] is None


# ---------------------------------------------------------------------------
# make_request — error paths
# ---------------------------------------------------------------------------

class TestMakeRequestErrors:
    @pytest.mark.asyncio
    async def test_4xx_raises_api_error_with_json_body(self, mock_api):
        body = {"error": {"code": "unauthorized"}}
        mock_api.get("/auth/me").mock(return_value=httpx.Response(401, json=body))
        with pytest.raises(APIError) as exc_info:
            await make_request("/auth/me")
        assert exc_info.value.status_code == 401
        assert exc_info.value.response_body == body

    @pytest.mark.asyncio
    async def test_4xx_raises_api_error_with_text_body(self, mock_api):
        mock_api.get("/auth/me").mock(return_value=httpx.Response(401, text="Unauthorized"))
        with pytest.raises(APIError) as exc_info:
            await make_request("/auth/me")
        assert exc_info.value.status_code == 401
        assert exc_info.value.response_body == "Unauthorized"

    @pytest.mark.asyncio
    async def test_5xx_raises_api_error(self, mock_api):
        mock_api.get("/mess/info").mock(return_value=httpx.Response(500, json={"error": "internal"}))
        with pytest.raises(APIError) as exc_info:
            await make_request("/mess/info")
        assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_network_error_raises_api_error(self, mock_api):
        mock_api.get("/mess/info").mock(side_effect=httpx.ConnectError("connection refused"))
        with pytest.raises(APIError) as exc_info:
            await make_request("/mess/info")
        assert "Network request failed" in str(exc_info.value)
        assert exc_info.value.status_code is None

    @pytest.mark.asyncio
    async def test_timeout_raises_api_error(self, mock_api):
        mock_api.get("/mess/info").mock(side_effect=httpx.TimeoutException("timed out"))
        with pytest.raises(APIError):
            await make_request("/mess/info")


# ---------------------------------------------------------------------------
# APIError
# ---------------------------------------------------------------------------

class TestAPIError:
    def test_attributes_stored(self):
        err = APIError("test error", status_code=404, response_body={"code": "not-found"})
        assert str(err) == "test error"
        assert err.status_code == 404
        assert err.response_body == {"code": "not-found"}

    def test_defaults_to_none(self):
        err = APIError("minimal error")
        assert err.status_code is None
        assert err.response_body is None


# ---------------------------------------------------------------------------
# fetch_config_internal
# ---------------------------------------------------------------------------

class TestFetchConfigInternal:
    @pytest.mark.asyncio
    async def test_all_windows_returned(self, mock_api):
        value = 172800
        for ep in [
            "/config/registration-window",
            "/config/cancellation-window",
            "/config/feedback-window",
            "/config/extras-window",
            "/config/skip-window",
            "/config/registration-max-date",
        ]:
            mock_api.get(ep).mock(return_value=httpx.Response(200, json={"data": value}))
        result = await fetch_config_internal()
        assert len(result) == 6
        assert result["registration-window"] == value

    @pytest.mark.asyncio
    async def test_partial_failure_returns_none(self, mock_api):
        """A single failing endpoint stores None and does not abort the batch."""
        mock_api.get("/config/registration-window").mock(
            return_value=httpx.Response(200, json={"data": 172800})
        )
        # All others return 500
        for ep in [
            "/config/cancellation-window",
            "/config/feedback-window",
            "/config/extras-window",
            "/config/skip-window",
            "/config/registration-max-date",
        ]:
            mock_api.get(ep).mock(return_value=httpx.Response(500, json={"error": "err"}))
        result = await fetch_config_internal()
        assert result["registration-window"] == 172800
        assert result["cancellation-window"] is None

    @pytest.mark.asyncio
    async def test_uses_api_key_arg(self, mock_api):
        """Explicit api_key parameter takes precedence over environment."""
        captured = {}

        def capture(request, route):
            captured["auth"] = request.headers.get("authorization")
            return httpx.Response(200, json={"data": 1})

        for ep in [
            "/config/registration-window",
            "/config/cancellation-window",
            "/config/feedback-window",
            "/config/extras-window",
            "/config/skip-window",
            "/config/registration-max-date",
        ]:
            mock_api.get(ep).mock(side_effect=capture)

        await fetch_config_internal(api_key="explicit-token")
        assert captured["auth"] == "explicit-token"
