---
description: Start Moodle MCP HTTP Server for OnlyApps
---
# Starting the Moodle MCP Server

This workflow starts the Moodle MCP HTTP server which enables role-based Moodle access.

## Prerequisites
- Moodle running at http://localhost:8085
- tokens.json configured with valid tokens

## Steps

// turbo-all

1. Navigate to the MCP server directory:
```bash
cd /home/vishak/hackiiit\'26/OnlyApps/mcp_servers/moodle_mcp
```

2. Install dependencies (if needed):
```bash
npm install
```

3. Start the HTTP server:
```bash
npm run start:http
```

## Expected Output
```
🚀 Moodle MCP HTTP Server started
   URL: http://localhost:3001
   Current Role: admin (Admin User)
```

## Usage in VS Code Chat
Once running, you can ask Claude:
- "List available Moodle roles"
- "Switch to student1 role"
- "Get my courses"
- "What assignments do I have?"

## Endpoints
- GET /roles - List available roles
- POST /switch-role - Switch user role
- GET /api/courses - Get courses for current role
- GET /health - Health check
