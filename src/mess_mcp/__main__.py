"""Main entry point for the Mess MCP server."""

import sys
import logging

logging.basicConfig(level=logging.INFO, stream=sys.stderr)


def main() -> None:
    """Launch the Mess MCP server over standard STDIO."""
    from mess_mcp.server import get_mcp

    try:
        mcp = get_mcp()
        mcp.run()
    except Exception as e:
        logging.error("Failed to start Mess MCP server: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
