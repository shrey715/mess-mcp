"""Centralized constants for the Mess MCP server."""

from typing import Literal

BASE_URL = "https://mess.iiit.ac.in/api"

AUTH_HEADER = "authorization"
ENV_API_KEY = "MESS_API_KEY"

MealType = Literal["breakfast", "lunch", "snacks", "dinner"]

VALID_MEALS: tuple[str, ...] = ("breakfast", "lunch", "snacks", "dinner")

# Known mess IDs from the IIIT-H Mess portal.
# These are not exhaustive; new messes may be added by the portal at any time.
KNOWN_MESS_IDS: tuple[str, ...] = (
    "yuktahar",
    "kadamba-nonveg",
    "kadamba-veg",
    "north",
    "palash",
)
