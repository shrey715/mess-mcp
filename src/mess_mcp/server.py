"""Main Server initialization."""

from mcp.server.fastmcp import FastMCP

# Create the primary FastMCP instance.
# Disabling the default prompt extraction here so we define everything explicitly.
mcp = FastMCP("Mess Management System", dependencies=["httpx", "mcp"])

def get_mcp() -> FastMCP:
    """Helper to retrieve the fully-bound MCP app instance."""
    # We delay binding the specific resources, tools, and prompts until they are imported.
    import mess_mcp.resources
    import mess_mcp.tools
    import mess_mcp.prompts
    
    return mcp
