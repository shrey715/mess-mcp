#!/bin/bash
set -e

# Function to kill background processes on exit
cleanup() {
    echo "Stopping background services..."
    kill $(jobs -p) 2>/dev/null || true
    echo "Services stopped."
}
trap cleanup EXIT

echo "🚀 Starting OnlyApps Stack..."

# 1. Start Moodle (Docker)
echo "------------------------------------------------"
echo "📦 Starting Moodle (Docker)..."
cd moodle/docker
docker compose up -d
cd ../../
echo "✅ Moodle started!"

# 2. Start MCP Servers
echo "------------------------------------------------"
echo "🔌 Starting MCP Servers..."

# Mess MCP (Port 8000)
echo "   - Mess MCP (Port 8000)..."
cd mcp_servers/mess_mcp
# Check if uvicorn is installed, if not, maybe run pip? 
# Assuming env is ready for now based on context.
python3 mcp_server.py > ../../mess_mcp.log 2>&1 &
cd ../../

# Intranet MCP (Port 8001)
echo "   - Intranet MCP (Port 8001)..."
cd mcp_servers/intranet_mcp
python3 http_server.py > ../../intranet_mcp.log 2>&1 &
cd ../../

# Moodle MCP (Port 3001)
echo "   - Moodle MCP (Port 3001)..."
cd mcp_servers/moodle_mcp
# Install dependencies if missing (quick check)
if [ ! -d "node_modules" ]; then
    echo "Installing Moodle MCP dependencies..."
    npm install
fi
npm run start:http > ../../moodle_mcp.log 2>&1 &
cd ../../

# Wait a moment for servers to initialize
sleep 3
echo "✅ MCP Servers running in background."
echo "   Logs: mess_mcp.log, intranet_mcp.log, moodle_mcp.log"

# 3. Start Applets
echo "------------------------------------------------"
echo "📱 Starting Applets..."

# Mess Mate (Port 5174)
echo "   - Mess Mate (Port 5174)..."
cd orchestrator/applets/mess-mate/applet
if [ ! -d "node_modules" ]; then
    echo "Installing Mess Mate dependencies..."
    npm install
fi
npm run dev > ../../../../mess_mate.log 2>&1 &
cd ../../../../

echo "✅ Applets running in background."

# 4. Start Orchestrator
echo "------------------------------------------------"
echo "🎹 Starting Orchestrator..."
cd orchestrator
if [ ! -d "node_modules" ]; then
    echo "Installing Orchestrator dependencies..."
    npm install
fi
echo "Launching Orchestrator (Electron)..."
npm run dev
