"""Main entry point for the Mess MCP server."""

import sys
import logging
import asyncio
from mess_mcp.server import get_mcp

logging.basicConfig(level=logging.INFO, stream=sys.stderr)

def main():
    """Run the standard MCP STDIO server."""
    mcp = get_mcp()
    
    # We use CLI runner if provided, or standard stdio run
    try:
        from mcp.server.fastmcp import context
        # Standard approach
        mcp.run()
    except Exception as e:
        logging.error(f"Failed to start Mess MCP server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
