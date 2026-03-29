"""MCP Prompts — predefined reasoning flows for common user tasks."""

from mcp.server.fastmcp import FastMCP
from mess_mcp.server import mcp


@mcp.prompt()
def plan_my_week(start_date: str, end_date: str) -> list:
    """
    Guide the assistant to plan optimal meals for a week.

    Loads menus and existing registrations, then suggests a varied, healthy
    meal schedule and optionally books them upon confirmation.

    Args:
        start_date: Range start date (YYYY-MM-DD).
        end_date: Range end date (YYYY-MM-DD).
    """
    return [
        {
            "role": "user",
            "content": (
                f"I need help planning my meals at the IIIT-H mess between {start_date} and {end_date}.\n\n"
                "Please:\n"
                f"1. Load the menu resources for each date in the range using mess://menus/{{date}}.\n"
                "2. Check my existing registrations using the check_registrations tool.\n"
                "3. Suggest the most varied and nutritious meal combinations, "
                "avoiding consecutive repetitions of the same dish.\n"
                "4. Present the plan clearly, then ask me to confirm before calling register_meal."
            ),
        }
    ]


@mcp.prompt()
def review_monthly_expenses() -> list:
    """
    Guide the assistant to analyse billing history and identify cost drivers.

    Loads bill history and extra registrations, then provides a structured
    breakdown and recommendations for reducing future spending.
    """
    return [
        {
            "role": "user",
            "content": (
                "Please analyse my IIIT-H mess billing history.\n\n"
                "Steps:\n"
                "1. Load mess://billing/history to get all monthly bills.\n"
                "2. Identify the most expensive month and the largest cost components "
                "(food, extras, infrastructure).\n"
                "3. Use list_extras_in_range to understand extra item spending patterns.\n"
                "4. Provide three concrete recommendations for reducing my bill next month, "
                "specifically mentioning the skip window and cancellation budget."
            ),
        }
    ]


@mcp.prompt()
def submit_recent_feedback(date: str) -> list:
    """
    Guide the assistant to collect and submit structured meal feedback.

    Looks up which meals the user ate, asks targeted quality questions,
    then files formal feedback through the API.

    Args:
        date: The date to review (YYYY-MM-DD).
    """
    return [
        {
            "role": "user",
            "content": (
                f"I would like to submit feedback for the meals I had on {date} "
                "at the IIIT-H mess.\n\n"
                "Please:\n"
                "1. Use get_registration to find all meals I attended that day.\n"
                "2. For each meal, ask me focused questions: "
                "taste quality (1–5), food temperature, hygiene observations, "
                "and any specific dish complaints.\n"
                "3. Once I have answered, call submit_feedback for each meal with a "
                "structured rating and a concise remarks string summarising my responses."
            ),
        }
    ]


@mcp.prompt()
def check_cancellation_budget(meal: str) -> list:
    """
    Guide the assistant to report remaining cancellation allowance for a meal.

    Fetches the current cancellation count and system maximum, then clearly
    states how many cancellations remain before penalties apply.

    Args:
        meal: One of 'breakfast', 'lunch', 'snacks', 'dinner'.
    """
    return [
        {
            "role": "user",
            "content": (
                f"How many {meal} cancellations do I have left this month at IIIT-H?\n\n"
                "Please:\n"
                f"1. Call get_cancellation_count with meal='{meal}' to get my current count.\n"
                "2. Load mess://config/windows to find the system cancellation maximum.\n"
                "3. Calculate and clearly state: used / maximum, and how many remain.\n"
                "4. If I am at or near the limit, warn me and suggest using the skip "
                "window instead of cancellation for upcoming meals."
            ),
        }
    ]
