# Moodle Setup for OnlyApps

This directory contains all Moodle-related files for the OnlyApps project.

## Structure

```
moodle/
├── docker/
│   └── docker-compose.yml    # Docker setup for Moodle + MySQL
├── docs/
│   ├── MOODLE_SETUP.md       # Setup instructions
│   └── TESTING_MCP.md        # MCP API testing guide
├── plugin/
│   └── [MCP plugin files]    # webservice_mcp plugin
└── moodle._mcp_doc.md        # MCP plugin documentation
```

## Quick Start

1. **Start Moodle**:
   ```bash
   cd docker
   docker compose up -d
   ```

2. **Access**: http://localhost:8080

3. **Credentials**: See `CREDENTIALS.md` in project root (not committed to git)

## Documentation

- [Setup Guide](docs/MOODLE_SETUP.md) - Installation and configuration
- [Testing MCP API](docs/TESTING_MCP.md) - How to test the MCP endpoint
- [MCP Plugin Docs](moodle._mcp_doc.md) - Full plugin documentation

## MCP Plugin

The `plugin/` directory contains the Moodle MCP web service plugin that exposes Moodle's external functions via JSON-RPC 2.0.

To install in Moodle:
1. Copy `plugin/` contents to `/var/www/html/webservice/mcp/` in the Moodle container
2. Visit Moodle admin to complete installation
3. Enable the MCP protocol and create a service token

See the main docs for detailed instructions.
