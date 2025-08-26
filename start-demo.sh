#!/bin/bash

# Node-RED Sandbox Mode Startup Script
# This script starts Node-RED in a safe sandbox mode where users can explore the UI

echo "Starting Node-RED in Sandbox Mode..."
echo "===================================="
echo ""

# Create temporary directories for sandbox
echo "Setting up sandbox environment..."
mkdir -p /tmp/node-red-sandbox
mkdir -p /tmp/node-red-demo
mkdir -p /tmp/empty-nodes-dir

# Clear any previous sandbox data
rm -rf /tmp/node-red-sandbox/.config.*.json 2>/dev/null
rm -rf /tmp/node-red-sandbox/flows*.json 2>/dev/null

echo ""
echo "🎮 SANDBOX MODE ACTIVE"
echo "======================"
echo ""
echo "✨ What you CAN do:"
echo "  • Explore the full Node-RED editor interface"
echo "  • Drag and drop nodes to build flows"
echo "  • Configure node properties"
echo "  • Connect nodes together"
echo "  • Click Deploy (UI will work, but flows won't execute)"
echo "  • Import/Export flow JSON for learning"
echo ""
echo "🛡️ Safety Features:"
echo "  • Flows are temporary (not saved to disk)"
echo "  • No actual execution of workflows"
echo "  • HTTP endpoints disabled"
echo "  • File system access restricted"
echo "  • External modules blocked"
echo "  • WebSocket connections blocked"
echo ""
echo "📍 Access Node-RED at: http://localhost:${PORT:-1880}"
echo ""
echo "Press Ctrl+C to stop the sandbox"
echo ""

# Start Node-RED with sandbox settings
node packages/node_modules/node-red/red.js -s user-settings.js "$@"