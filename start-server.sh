#!/bin/bash

###############################################################################
# Piazza API Server - Automated Startup Script
# Author: Auto-generated for tasaonakpoma/piazza
# Date: December 5, 2025
# Description: Automatically sets up and starts your Piazza server with Docker
###############################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print colored messages
print_info() { echo -e "${BLUE}ℹ ${1}${NC}"; }
print_success() { echo -e "${GREEN}✓ ${1}${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ ${1}${NC}"; }
print_error() { echo -e "${RED}✗ ${1}${NC}"; }

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════╗"
echo "║      Piazza API - Automated Server Setup      ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Check if Docker is installed
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo "Please install Docker first:"
    echo "  sudo apt update && sudo apt install docker.io docker-compose -y"
    exit 1
fi
print_success "Docker is installed"

# Step 2: Check if Docker Compose is installed
print_info "Checking Docker Compose installation..."
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed!"
    echo "Please install Docker Compose first:"
    echo "  sudo apt install docker-compose -y"
    exit 1
fi
print_success "Docker Compose is installed"

# Step 3: Check if .env file exists
print_info "Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found! Creating from template..."
    
    # Create .env file with default values
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/piazza
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_SECRET_KEY
JWT_EXPIRE=7d
EOF
    
    print_warning "Created .env file with default values"
    print_warning "IMPORTANT: Edit .env and change JWT_SECRET before production use!"
else
    print_success ".env file found"
fi

# Step 4: Stop any existing containers
print_info "Stopping any existing containers..."
docker-compose -f docker/docker-compose.yml down 2>/dev/null || true
print_success "Cleaned up existing containers"

# Step 5: Start the server
print_info "Starting Piazza API server with Docker Compose..."
docker-compose -f docker/docker-compose.yml up -d --build

# Step 6: Wait for container to be ready
print_info "Waiting for server to start..."
sleep 5

# Step 7: Check if container is running
if docker-compose -f docker/docker-compose.yml ps | grep -q "Up"; then
    print_success "Server is running!"
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           Server Started Successfully!         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Server Details:${NC}"
    echo "  • Container: piazza-app"
    echo "  • Port: 3000"
    echo "  • Status: Running"
    echo "  • Restart Policy: unless-stopped (auto-restart enabled)"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  • View logs:     docker-compose -f docker/docker-compose.yml logs -f"
    echo "  • Stop server:   docker-compose -f docker/docker-compose.yml stop"
    echo "  • Restart:       docker-compose -f docker/docker-compose.yml restart"
    echo "  • Check status:  docker-compose -f docker/docker-compose.yml ps"
    echo ""
    echo -e "${BLUE}Test your API:${NC}"
    echo "  curl http://localhost:3000/health"
    echo "  curl http://136.111.190.185:3000/health"
    echo ""
    
    # Try to test the health endpoint
    print_info "Testing health endpoint..."
    sleep 2
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Health check passed! Server is responding."
    else
        print_warning "Could not reach health endpoint. Server may still be starting..."
        print_info "Check logs with: docker-compose -f docker/docker-compose.yml logs -f"
    fi
    
else
    print_error "Failed to start server!"
    echo "Check logs with: docker-compose -f docker/docker-compose.yml logs"
    exit 1
fi

print_success "Setup complete! Your Piazza API is now running."
