# Mess MCP 🍱

> A Model Context Protocol (MCP) server for the IIIT Mess portal, providing real-time menu, registration, and marketplace data for AI assistants.

This server enables AI assistants (like Claude) to interact with the IIIT Mess system, allowing users to query meal menus, check registration status, and interact with the mess marketplace through natural language.

---

## ✨ Features

- **🍴 Real-time Menu**: Query breakfast, lunch, snacks, and dinner menus for any day.
- **📝 Registration Management**: Check and update mess registration status.
- **🛒 Marketplace API**: Access the mess buy/sell marketplace for meal vouchers.
- **🕒 Availability Queries**: Check mess timings and real-time availability.
- **📄 OpenAPI Integration**: Fully documented with OpenAPI 3.0.

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **uv** (recommended) or **pip**

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/shrey715/mess-mcp.git
   cd mess-mcp
   ```

2. **Sync dependencies**:
   Using `uv`:
   ```bash
   uv sync
   ```
   Or using `pip`:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Server

Start the MCP server locally:
```bash
python mcp_server.py
```

## 🛠 Usage with Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mess-mcp": {
      "command": "python",
      "args": ["/path/to/mess-mcp/mcp_server.py"]
    }
  }
}
```

## 📚 API Documentation

The server implements the [Model Context Protocol](https://modelcontextprotocol.io/). Detailed API specifications can be found in [docs/mess_openapi.yaml](docs/mess_openapi.yaml).

### Available Tools

- `get_menu`: Fetch the menu for a specific date and meal type.
- `get_registration_status`: Check a student's current mess registration.
- `list_marketplace_items`: View active buy/sell offers in the marketplace.
- `get_mess_timings`: Get official mess operating hours.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT

---

**Built with ❤️ for the IIIT Community**
