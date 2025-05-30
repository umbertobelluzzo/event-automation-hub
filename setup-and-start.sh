#!/bin/bash
# setup-and-start.sh - Complete setup and startup script

echo "🔧 UIS Event-Automation Hub - Complete Setup & Start"
echo "====================================================="

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

# Clean up existing processes
echo -e "${YELLOW}1. Cleaning up existing processes...${NC}"
for port in 3000 4000 8000; do
    if check_port $port; then
        echo "Killing process on port $port..."
        kill -9 $(lsof -ti:$port) 2>/dev/null || true
    fi
done
sleep 2

# Setup environment files
echo -e "${YELLOW}2. Setting up environment files...${NC}"

# Root .env file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# Core Configuration
OPENROUTER_API_KEY=your_openrouter_key_here
AGENTS_API_KEY=your_agents_api_key_here
JWT_SECRET=supersecretjwtsecret123456789
DATABASE_URL=postgresql://uis_user:supersecretpassword@localhost:5432/uis_events

# Service URLs
BACKEND_URL=http://localhost:4000
AGENTS_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Optional APIs (for later)
CANVA_API_TOKEN=your_canva_api_key_here
GOOGLE_SERVICE_ACCOUNT_JSON={}
CLICKUP_API_KEY=your_clickup_api_key_here

# Development settings
NODE_ENV=development
LOG_LEVEL=info
EOF
fi

# Frontend .env.local file
if [ ! -f frontend/.env.local ]; then
    echo "Creating frontend/.env.local file..."
    cat > frontend/.env.local << 'EOF'
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=supersecretkey123456789abcdefghijklmnop
BACKEND_URL=http://localhost:4000/api
EOF
fi

# Install dependencies
echo -e "${YELLOW}3. Installing dependencies...${NC}"

# Backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install --silent
cd ..

# Frontend dependencies  
echo "Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

# Python dependencies for agents
echo "Installing Python dependencies..."
cd agents
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --quiet
cd ..

# Start services
echo -e "${YELLOW}4. Starting services...${NC}"

# Start AI Agents (Python)
echo -e "${BLUE}Starting AI Agents (Port 8000)...${NC}"
cd agents
source venv/bin/activate
python main.py &
AGENTS_PID=$!
cd ..
sleep 3

# Start Backend (Node.js)
echo -e "${BLUE}Starting Backend API (Port 4000)...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..
sleep 3

# Start Frontend (Next.js)
echo -e "${BLUE}Starting Frontend (Port 3000)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for services to start
echo -e "${YELLOW}5. Waiting for services to initialize...${NC}"
sleep 15

# Check service status
echo -e "${BLUE}6. Checking service status...${NC}"
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
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Visit http://localhost:3000 to see your application"
echo "2. The backend will work with mock authentication in development"
echo "3. Add your API keys to .env when ready (Canva, Google, ClickUp)"
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