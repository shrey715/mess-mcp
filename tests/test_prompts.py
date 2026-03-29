"""Unit tests for mess_mcp/prompts.py — all MCP prompt functions."""

import pytest
from mess_mcp import prompts


class TestPlanMyWeek:
    def test_returns_list(self):
        result = prompts.plan_my_week(start_date="2026-03-30", end_date="2026-04-05")
        assert isinstance(result, list)
        assert len(result) == 1

    def test_message_structure(self):
        result = prompts.plan_my_week(start_date="2026-03-30", end_date="2026-04-05")
        msg = result[0]
        assert msg["role"] == "user"
        assert isinstance(msg["content"], str)

    def test_dates_interpolated_in_content(self):
        result = prompts.plan_my_week(start_date="2026-03-30", end_date="2026-04-05")
        content = result[0]["content"]
        assert "2026-03-30" in content
        assert "2026-04-05" in content

    def test_contains_iiit_h(self):
        result = prompts.plan_my_week(start_date="2026-03-30", end_date="2026-04-05")
        assert "IIIT-H" in result[0]["content"]

    def test_references_register_meal_tool(self):
        result = prompts.plan_my_week(start_date="2026-03-30", end_date="2026-04-05")
        assert "register_meal" in result[0]["content"]


class TestReviewMonthlyExpenses:
    def test_returns_list(self):
        result = prompts.review_monthly_expenses()
        assert isinstance(result, list)
        assert len(result) == 1

    def test_message_structure(self):
        result = prompts.review_monthly_expenses()
        msg = result[0]
        assert msg["role"] == "user"
        assert isinstance(msg["content"], str)

    def test_references_billing_resource(self):
        content = prompts.review_monthly_expenses()[0]["content"]
        assert "billing/history" in content

    def test_references_skip_window(self):
        content = prompts.review_monthly_expenses()[0]["content"]
        assert "skip" in content.lower()

    def test_contains_iiit_h(self):
        content = prompts.review_monthly_expenses()[0]["content"]
        assert "IIIT-H" in content


class TestSubmitRecentFeedback:
    def test_returns_list(self):
        result = prompts.submit_recent_feedback(date="2026-03-30")
        assert isinstance(result, list)
        assert len(result) == 1

    def test_date_interpolated(self):
        result = prompts.submit_recent_feedback(date="2026-03-30")
        assert "2026-03-30" in result[0]["content"]

    def test_references_submit_feedback_tool(self):
        result = prompts.submit_recent_feedback(date="2026-03-30")
        assert "submit_feedback" in result[0]["content"]

    def test_references_get_registration_tool(self):
        result = prompts.submit_recent_feedback(date="2026-03-30")
        assert "get_registration" in result[0]["content"]

    def test_contains_iiit_h(self):
        result = prompts.submit_recent_feedback(date="2026-03-30")
        assert "IIIT-H" in result[0]["content"]


class TestCheckCancellationBudget:
    def test_returns_list(self):
        result = prompts.check_cancellation_budget(meal="lunch")
        assert isinstance(result, list)
        assert len(result) == 1

    def test_meal_interpolated(self):
        result = prompts.check_cancellation_budget(meal="dinner")
        assert "dinner" in result[0]["content"]

    def test_references_cancellation_tool(self):
        content = prompts.check_cancellation_budget(meal="breakfast")[0]["content"]
        assert "get_cancellation_count" in content

    def test_references_config_windows(self):
        content = prompts.check_cancellation_budget(meal="breakfast")[0]["content"]
        assert "config/windows" in content

    def test_references_skip_window_alternative(self):
        content = prompts.check_cancellation_budget(meal="lunch")[0]["content"]
        assert "skip" in content.lower()

    def test_contains_iiit_h(self):
        content = prompts.check_cancellation_budget(meal="lunch")[0]["content"]
        assert "IIIT-H" in content

    @pytest.mark.parametrize("meal", ["breakfast", "lunch", "snacks", "dinner"])
    def test_all_valid_meals(self, meal):
        result = prompts.check_cancellation_budget(meal=meal)
        assert meal in result[0]["content"]
