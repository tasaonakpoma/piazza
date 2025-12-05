#!/bin/bash

#
# Piazza API 
#
# Just installs dependencies and starts the server.
#
# Usage: ./start-server.sh
#

set -e

# Move to the script's directory (in case we're called from elsewhere)
cd "$(dirname "$0")"

echo "=== Piazza API Server ==="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install it from https://nodejs.org/"
    exit 1
fi

echo "Node.js version: $(node --version)"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "Warning: No .env file found."
    echo "Creating one with default values..."
    
    cat > .env << 'EOF'
PORT=3000
MONGODB_URI=mongodb://localhost:27017/piazza
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRE=7d
NODE_ENV=development
EOF
    
    echo "Created .env file. Edit it if you need to change settings."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install
fi

# Start the server
echo ""
echo "Starting server..."
echo "Press Ctrl+C to stop."
echo ""

node server.js
