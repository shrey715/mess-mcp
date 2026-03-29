# Mess MCP Server

A Model Context Protocol (MCP) server for the IIIT Mess portal. This server provides robust, real-time integration enabling AI assistants to securely interact with the institution's mess dining and marketplace systems over standard STDIO transports.

## Architecture & Features

The server interfaces via the official Anthropic `mcp` SDK, abstracting the `mess.iiit.ac.in/api` into easily digestible Resources, Tools, and Prompts.

- **Resources**: Exposes static read-only constraints such as system capacities, current multi-week menus, available extras, operating hours, and standard meal rates.
- **Tools**: Authorizes state mutations including modifying registrations (cancel, skip, un-cancel, register), applying for extras, and seamlessly filing formal qualitative feedback.
- **Prompts**: Provides pre-programmed reasoning flows, assisting agents with weekly meal planning and historic billing analysis, mitigating overspending on non-essential items.

## Prerequisites

- **Python 3.10+**
- **uv** (recommended for seamless environments) or **pip**

## Installation

1. Clone the repository to your local environment:
   ```bash
   git clone https://github.com/shrey715/mess-mcp.git
   cd mess-mcp
   ```

2. Sync the dependencies and build the virtual environment:
   ```bash
   uv sync
   # Or using standard pip
   pip install .
   ```

## Configuration

The server operations are authenticated. You must set the correct environment variables before launch, preventing API tokens from passing unnecessarily through the language model context window.

```bash
export MESS_API_KEY="your-jwt-or-api-token"
```

## Usage Integration

The server operates exclusively via standard `stdio`, assuring strong compatibility with high-performance desktop clients. 

### Claude Desktop Integration

Locate your Claude Desktop JSON configuration and append the following:

```json
{
  "mcpServers": {
    "mess-mcp": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/mess-mcp", "mess-mcp"],
      "env": {
        "MESS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor or VS Code Integration

Use standard integration settings inside Cursor or VS Code Copilot to register local MCPs. Provide the exact executable invocation:

**Command Path**: `uv run --directory /path/to/mess-mcp mess-mcp`

## Documentation

Full architectural insights are encoded directly into the MCP introspection system (`mcp list`). Endpoints trace the official OpenAPI 3.0 specification available from the institution portal.

## License

This software is released under the GNU General Public License v3.0 (GPLv3). Review the `LICENSE` file for strict distribution and modification stipulations.
