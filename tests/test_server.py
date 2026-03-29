"""Integration tests for mess_mcp/server.py — MCP server initialization."""

import pytest
from mcp.server.fastmcp import FastMCP

from mess_mcp.server import get_mcp


class TestServerInitialization:
    def test_get_mcp_returns_fastmcp_instance(self):
        mcp = get_mcp()
        assert isinstance(mcp, FastMCP)

    def test_server_name(self):
        mcp = get_mcp()
        assert mcp.name == "Mess Management System"

    def test_tools_registered(self):
        mcp = get_mcp()
        tool_names = [t.name for t in mcp._tool_manager.list_tools()]
        assert len(tool_names) > 0, "No tools registered on the MCP server."
        # Spot-check critical tools
        expected_tools = [
            "get_capacities",
            "check_registrations",
            "register_meal",
            "cancel_meal",
            "uncancel_meal",
            "manage_skipping",
            "submit_feedback",
            "list_available_extras",
            "list_registered_extras",
            "register_extra",
            "delete_extra",
            "get_cancellation_count",
            "get_meal_scan_count",
            "create_monthly_registration",
            "delete_monthly_registration",
            "get_monthly_registration",
            "list_auth_keys",
            "create_auth_key",
            "delete_auth_key",
            "get_config_windows",
            "get_monthly_bill",
            "get_all_bills",
            "get_preferences",
            "update_preferences",
            "get_meal_timings",
            "get_registration",
        ]
        for tool in expected_tools:
            assert tool in tool_names, f"Expected tool '{tool}' not registered."

    def test_resources_registered(self):
        mcp = get_mcp()
        resource_uris = [str(r.uri) for r in mcp._resource_manager.list_resources()]
        assert len(resource_uris) > 0, "No resources registered on the MCP server."
        expected_uris = [
            "mess://info",
            "mess://menus/today",
            "mess://profile",
            "mess://billing/history",
            "mess://config/windows",
            "mess://preferences",
            "mess://auth/keys",
            "mess://config/meal-timings",
        ]
        for uri in expected_uris:
            assert uri in resource_uris, f"Expected resource '{uri}' not registered."

    def test_prompts_registered(self):
        mcp = get_mcp()
        prompt_names = [p.name for p in mcp._prompt_manager.list_prompts()]
        assert len(prompt_names) > 0, "No prompts registered on the MCP server."
        expected_prompts = [
            "plan_my_week",
            "review_monthly_expenses",
            "submit_recent_feedback",
            "check_cancellation_budget",
        ]
        for name in expected_prompts:
            assert name in prompt_names, f"Expected prompt '{name}' not registered."

    def test_get_mcp_is_idempotent(self):
        """Calling get_mcp() multiple times returns the same instance."""
        mcp1 = get_mcp()
        mcp2 = get_mcp()
        assert mcp1 is mcp2
