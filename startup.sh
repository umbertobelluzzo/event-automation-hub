#!/bin/bash
# startup.sh - Quick development environment startup

echo "🚀 Starting UIS Event-Automation Hub Development Environment"
echo "=========================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check if port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Kill processes on ports if they exist
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
for port in 3000 4000 8000; do
    if check_port $port; then
        echo "Killing process on port $port..."
        kill -9 $(lsof -ti:$port) 2>/dev/null || true
    fi
done

# Wait a moment for cleanup
sleep 2

# Start AI Agents (Python)
echo -e "${BLUE}Starting AI Agents (Port 8000)...${NC}"
cd agents
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
python main.py &
AGENTS_PID=$!
cd ..

# Wait for agents to start
sleep 3

# Start Backend (Node.js)
echo -e "${BLUE}Starting Backend API (Port 4000)...${NC}"
cd backend
npm install > /dev/null 2>&1
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start Frontend (Next.js)
echo -e "${BLUE}Starting Frontend (Port 3000)...${NC}"
cd frontend
npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for services to start
echo -e "${YELLOW}Waiting for services to initialize...${NC}"
sleep 10

# Check service status
echo -e "${BLUE}Checking service status...${NC}"
echo "================================"

# Check AI Agents
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "AI Agents:    ${GREEN}✅ Running${NC} (http://localhost:8000)"
else
    echo -e "AI Agents:    ${RED}❌ Failed${NC}"
fi

# Check Backend
if curl -s http://localhost:4000/api/health > /dev/null; then
    echo -e "Backend API:  ${GREEN}✅ Running${NC} (http://localhost:4000)"
else
    echo -e "Backend API:  ${RED}❌ Failed${NC}"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "Frontend:     ${GREEN}✅ Running${NC} (http://localhost:3000)"
else
    echo -e "Frontend:     ${RED}❌ Failed${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo ""
echo "Access your application:"
echo "• Frontend:   http://localhost:3000"
echo "• Backend:    http://localhost:4000/api"
echo "• AI Agents:  http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $AGENTS_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Keep script running
wait