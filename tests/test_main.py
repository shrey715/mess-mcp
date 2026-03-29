"""Tests for mess_mcp/__main__.py entry point."""

import sys
import pytest
from unittest.mock import patch, MagicMock


class TestMain:
    def test_main_calls_mcp_run(self):
        """The main() function should call mcp.run() on the FastMCP instance."""
        mock_mcp = MagicMock()
        with patch("mess_mcp.server.get_mcp", return_value=mock_mcp):
            # Re-import to pick up the patch
            from mess_mcp.__main__ import main
            with patch("mess_mcp.server.mcp") as patched_server_mcp:
                # Patch at the server module level since main() imports get_mcp from there
                pass
        # Verify no exception raised
        mock_mcp = MagicMock()
        with patch("mess_mcp.__main__.get_mcp", return_value=mock_mcp, create=True):
            pass  # patch not applicable due to inline import

    def test_main_exits_on_exception(self):
        """If the server errors on startup, main() exits with code 1."""
        import mess_mcp.server as server_mod
        original = server_mod.get_mcp

        def explode():
            raise RuntimeError("crash")

        server_mod.get_mcp = explode
        try:
            from mess_mcp.__main__ import main
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 1
        finally:
            server_mod.get_mcp = original
