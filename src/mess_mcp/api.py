"""
API Client for interacting with the Mess OpenAPI.
Provides authenticated access and robust error handling.
"""

import os
import httpx
from typing import Optional, Dict, Any, Union

BASE_URL = "https://mess.iiit.ac.in/api"

class APIError(Exception):
    """Exception raised for API-level anomalies."""
    def __init__(self, message: str, status_code: int = None, response_body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body

async def make_request(
    endpoint: str,
    method: str = "GET",
    params: Optional[Dict[str, Any]] = None,
    json_data: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None
) -> Union[Dict[str, Any], list]:
    """
    Central method to execute standardized API requests.
    Falls back to MESS_API_KEY environment variable.
    """
    key_to_use = api_key or os.environ.get("MESS_API_KEY")
    headers = {}
    if key_to_use:
        headers["authorization"] = key_to_use

    url = f"{BASE_URL}{endpoint}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                headers=headers,
                timeout=15.0
            )
            
            # API uses 204 No Content for standard successful deletions etc.
            if response.status_code == 204:
                return {"success": True, "message": "Operation completed successfully (204 No Content)."}
                
            response.raise_for_status()
            
            try:
                # The API typically wraps lists or objects into JSON.
                res_data = response.json()
                return res_data
            except ValueError:
                return {"success": True, "text": response.text}
                
        except httpx.HTTPStatusError as e:
            try:
                err_data = e.response.json()
            except ValueError:
                err_data = e.response.text
            raise APIError(f"HTTP Error: {e.response.status_code}", e.response.status_code, err_data)
        except httpx.RequestError as e:
            raise APIError(f"Network request failed: {str(e)}")

async def fetch_config_internal(api_key: Optional[str]) -> Dict[str, Any]:
    """Batch fetch all configuration settings exposed by the system."""
    key_to_use = api_key or os.environ.get("MESS_API_KEY")
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
            resp = await make_request(ep, api_key=key_to_use)
            # Unpack 'data' property if it exists, otherwise store response
            if isinstance(resp, dict) and "data" in resp:
                results[key] = resp["data"]
            else:
                results[key] = resp
        except APIError:
            results[key] = None
    return results
