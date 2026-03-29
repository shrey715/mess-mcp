"""Shared fixtures and test helpers for the Mess MCP test suite."""

import pytest
import respx
import httpx

from mess_mcp.constants import BASE_URL


# ---------------------------------------------------------------------------
# Common mock API payloads
# ---------------------------------------------------------------------------

MESS_INFO_RESPONSE = {
    "data": [
        {"id": "yuktahar", "name": "Yuktahar", "short_name": "YH", "color": "0.5 0.2 120"},
        {"id": "north", "name": "North Mess", "short_name": "NM", "color": "0.6 0.3 200"},
    ]
}

MENUS_RESPONSE = {
    "data": [
        {
            "mess": "yuktahar",
            "effective_from": "2026-03-23",
            "updated_at": "2026-03-22T10:00:00Z",
            "days": {
                "monday": {
                    "breakfast": [{"name": "Idli", "category": "main"}],
                    "lunch": [{"name": "Dal", "category": "main"}],
                    "snacks": [{"name": "Samosa", "category": "snack"}],
                    "dinner": [{"name": "Roti", "category": "main"}],
                }
            },
        }
    ]
}

RATES_RESPONSE = {
    "data": {
        "registered": [{"mess": "yuktahar", "day": None, "rate": 4210}],
        "unregistered": [{"mess": "yuktahar", "day": None, "rate": 5000}],
    }
}

CAPACITIES_RESPONSE = {
    "data": {
        "registered": [{"mess": "yuktahar", "available": 50, "capacity": 420}],
        "unregistered": [],
    }
}

REGISTRATION_RESPONSE = {
    "data": {
        "id": "reg-001",
        "meal_date": "2026-03-30",
        "meal_type": "lunch",
        "meal_mess": "yuktahar",
        "guests": 0,
        "cancelled": False,
        "skipping": False,
    }
}

REGISTRATIONS_LIST_RESPONSE = {
    "data": [REGISTRATION_RESPONSE["data"]]
}

CONFIG_WINDOWS_RESPONSE = {
    "data": {
        "registration_window": 172800,
        "cancellation_window": 864000,
        "feedback_window": 86400,
        "extras_window": 42000,
        "skip_window": 10800,
    }
}

MEAL_TIMINGS_RESPONSE = {
    "data": {
        "yuktahar": [
            {
                "meal": "breakfast",
                "start_time": "07:30:00",
                "end_time": "09:30:00",
            }
        ]
    }
}

BILLS_RESPONSE = {
    "data": [
        {"month": 3, "year": 2026, "food_bill": 42000, "extras_bill": 5000, "infra_bill": 1000}
    ]
}

MONTHLY_BILL_RESPONSE = {
    "data": {"non_projected": 38000, "projected": 42000}
}

CANCELLATIONS_RESPONSE = {"data": 2}

SCANS_RESPONSE = {
    "data": {"meal": "lunch", "mess": "yuktahar", "date": "2026-03-30", "total": 88, "recent": 5}
}

EXTRAS_LIST_RESPONSE = {
    "data": [
        {"id": "omelette-001", "name": "Omelette", "price": 1500, "mess": "yuktahar"}
    ]
}

EXTRA_REGISTRATIONS_RESPONSE = {
    "data": [
        {"id": "ereg-001", "extra": "omelette-001", "meal_date": "2026-03-30", "meal_type": "breakfast"}
    ]
}

AUTH_KEYS_RESPONSE = {
    "data": [
        {"id": "key-001", "name": "my-key", "expiry": "2027-01-01", "created_at": "2026-01-01T00:00:00Z"}
    ]
}

CREATE_KEY_RESPONSE = {
    "data": {"id": "key-002", "name": "new-key", "expiry": "2027-06-01", "key": "tok_abc123"}
}

PROFILE_RESPONSE = {
    "data": {
        "id": "usr-001",
        "name": "Test User",
        "email": "test@students.iiit.ac.in",
        "roll": "2021XXXX",
    }
}

PREFERENCES_RESPONSE = {
    "data": {"default_mess": "yuktahar", "notify_before_registration": True}
}

MONTHLY_REGISTRATION_RESPONSE = {
    "data": {"month": 3, "year": 2026, "mess": "yuktahar"}
}

SUCCESS_204 = {"success": True, "message": "Operation completed successfully."}

API_ERROR_RESPONSE = {"error": {"code": "unauthorized", "message": "Authentication required."}}


# ---------------------------------------------------------------------------
# Pytest fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_api():
    """
    Activate respx mock router scoped to a single test.

    All tests that require HTTP interception should request this fixture.
    Any request not explicitly mocked will raise an error, ensuring no
    accidental real network calls are made.
    """
    with respx.mock(base_url=BASE_URL, assert_all_called=False) as router:
        yield router


@pytest.fixture
def api_token() -> str:
    """A fake API token for use in authenticated test calls."""
    return "test-api-token-abc123"
