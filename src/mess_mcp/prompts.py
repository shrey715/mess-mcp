"""MCP Prompts. Provides predefined interaction flows."""

from mcp.server.fastmcp.prompts.base import Message
from mess_mcp.server import mcp

@mcp.prompt()
def plan_my_week(start_date: str, end_date: str) -> list[Message]:
    """
    Aids users in picking their meals intelligently across the week, considering capacities and avoiding repetitions.
    
    Args:
        start_date: Start search window YYYY-MM-DD
        end_date: End search window YYYY-MM-DD
    """
    return [
        Message(
            role="user",
            content=f"""
I need assistance planning my meals between {start_date} and {end_date}.
Please do the following:
1. Load `mess://menus/{{date}}` for the dates in range.
2. Check my existing registrations using the `check_registrations` tool.
3. Suggest the healthiest or most varied combinations, avoiding repetitive curries or overly heavy meals if possible.
4. Optionally use `register_meal` to set them up for me once I confirm.
"""
        )
    ]

@mcp.prompt()
def review_monthly_expenses() -> list[Message]:
    """
    Assists in understanding unexpected spikes in a given month's mess bill.
    """
    return [
        Message(
            role="user",
            content="""
Please run `mess://billing/history` to load my previous bills.
Identify my most expensive month this semester, and provide a detailed analysis of:
1. Extra item spending (`list_registered_extras` tool or bill insights).
2. Number of cancelled meals vs guests hosted.
3. Recommendations for keeping my food costs down next month using the skip window.
"""
        )
    ]

@mcp.prompt()
def submit_recent_feedback(date: str) -> list[Message]:
    """
    Step-by-step workflow to help a user submit robust feedback about the food quality.
    
    Args:
        date: The date to review YYYY-MM-DD. Defaults to yesterday.
    """
    return [
        Message(
            role="user",
            content=f"""
I would like to submit feedback for my meals on {date}.
1. First, find out what messes I ate at using `check_registrations`.
2. Ask me exactly what I thought about each meal (taste, hygiene, temperature, delays).
3. Once I reply, organize my responses and use `submit_feedback` to officially file it.
"""
        )
    ]
