"""
API Client for interacting with the Mess OpenAPI (mess.iiit.ac.in/api).

Provides authenticated HTTP access with consistent error handling.
All functions are async and raise APIError on non-2xx responses.
"""

import os
import httpx
from typing import Any, Optional, Union

from mess_mcp.constants import BASE_URL, AUTH_HEADER, ENV_API_KEY


class APIError(Exception):
    """Raised when the Mess API returns a non-2xx HTTP status."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        response_body: Any = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


async def make_request(
    endpoint: str,
    method: str = "GET",
    params: Optional[dict[str, Any]] = None,
    json_data: Optional[dict[str, Any]] = None,
    api_key: Optional[str] = None,
) -> Union[dict[str, Any], list]:
    """
    Execute a standardised HTTP request against the Mess API.

    Falls back to the MESS_API_KEY environment variable when `api_key` is not
    provided.  Raises APIError on any non-2xx response or network failure.
    """
    key = api_key or os.environ.get(ENV_API_KEY)
    headers: dict[str, str] = {}
    if key:
        headers[AUTH_HEADER] = key

    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method=method,
                url=f"{BASE_URL}{endpoint}",
                params=params,
                json=json_data,
                headers=headers,
                timeout=15.0,
            )

            if response.status_code == 204:
                return {"success": True, "message": "Operation completed successfully."}

            response.raise_for_status()

            try:
                return response.json()
            except ValueError:
                return {"success": True, "text": response.text}

        except httpx.HTTPStatusError as exc:
            try:
                body = exc.response.json()
            except ValueError:
                body = exc.response.text
            raise APIError(
                f"HTTP {exc.response.status_code}",
                status_code=exc.response.status_code,
                response_body=body,
            ) from exc

        except httpx.RequestError as exc:
            raise APIError(f"Network request failed: {exc}") from exc


async def fetch_config_internal(api_key: Optional[str] = None) -> dict[str, Any]:
    """
    Batch-fetch all system configuration window values.

    Returns a dict mapping window names to their values (in seconds).
    Individual failures are silently stored as None so callers can still
    receive partial results.
    """
    key = api_key or os.environ.get(ENV_API_KEY)
    endpoints = [
        "/config/registration-window",
        "/config/cancellation-window",
        "/config/feedback-window",
        "/config/extras-window",
        "/config/skip-window",
        "/config/registration-max-date",
    ]
    results: dict[str, Any] = {}
    for ep in endpoints:
        window_key = ep.removeprefix("/config/")
        try:
            resp = await make_request(ep, api_key=key)
            results[window_key] = resp.get("data") if isinstance(resp, dict) else resp
        except APIError:
            results[window_key] = None
    return results
