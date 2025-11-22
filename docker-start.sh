#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       SentinelNet Docker Launcher      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${YELLOW}ℹ️  Checking Docker daemon...${NC}"
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running. Please start Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}\n"

# Parse arguments
COMMAND=${1:-up}

case $COMMAND in
    up)
        echo -e "${YELLOW}🚀 Starting SentinelNet...${NC}\n"
        docker-compose up -d
        
        echo -e "\n${YELLOW}⏳ Waiting for services to be healthy...${NC}"
        sleep 10
        
        # Check if services are running
        if docker-compose ps | grep -q "healthy"; then
            echo -e "${GREEN}✓ Backend is healthy${NC}"
        fi
        
        echo -e "\n${GREEN}✅ SentinelNet is running!${NC}\n"
        echo -e "📍 Frontend: ${YELLOW}http://localhost:3165${NC}"
        echo -e "📍 Backend:  ${YELLOW}http://localhost:8000${NC}"
        echo -e "📍 API Docs: ${YELLOW}http://localhost:8000/docs${NC}\n"
        
        echo -e "Demo Organizations:"
        echo -e "  - ${YELLOW}org_alice${NC}    (API Key: ${YELLOW}alice_key_12345${NC})"
        echo -e "  - ${YELLOW}org_bob${NC}      (API Key: ${YELLOW}bob_key_67890${NC})"
        echo -e "  - ${YELLOW}org_charlie${NC}  (API Key: ${YELLOW}charlie_key_11111${NC})\n"
        
        echo -e "View logs: ${YELLOW}docker-compose logs -f${NC}"
        echo -e "Stop all: ${YELLOW}docker-compose down${NC}\n"
        ;;
        
    down)
        echo -e "${YELLOW}🛑 Stopping SentinelNet...${NC}"
        docker-compose down
        echo -e "${GREEN}✓ Services stopped${NC}\n"
        ;;
        
    logs)
        echo -e "${YELLOW}📋 Showing logs...${NC}\n"
        docker-compose logs -f
        ;;
        
    ps)
        echo -e "${YELLOW}📊 Service Status:${NC}\n"
        docker-compose ps
        ;;
        
    build)
        echo -e "${YELLOW}🏗️  Building images...${NC}\n"
        docker-compose build
        echo -e "${GREEN}✓ Build complete${NC}\n"
        ;;
        
    rebuild)
        echo -e "${YELLOW}🔨 Rebuilding and starting services...${NC}\n"
        docker-compose up -d --build
        echo -e "${GREEN}✓ Services rebuilt and started${NC}\n"
        ;;
        
    clean)
        echo -e "${YELLOW}🧹 Cleaning up...${NC}"
        docker-compose down -v
        echo -e "${GREEN}✓ All services and volumes removed${NC}\n"
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting services...${NC}"
        docker-compose restart
        echo -e "${GREEN}✓ Services restarted${NC}\n"
        ;;
        
    test)
        echo -e "${YELLOW}🧪 Running backend tests...${NC}\n"
        docker-compose exec backend pytest backend/tests/ -v
        ;;
        
    *)
        echo -e "${YELLOW}Usage:${NC}"
        echo -e "  ./docker-start.sh ${GREEN}up${NC}      - Start all services"
        echo -e "  ./docker-start.sh ${GREEN}down${NC}    - Stop all services"
        echo -e "  ./docker-start.sh ${GREEN}logs${NC}    - View service logs"
        echo -e "  ./docker-start.sh ${GREEN}ps${NC}      - Show service status"
        echo -e "  ./docker-start.sh ${GREEN}build${NC}   - Build Docker images"
        echo -e "  ./docker-start.sh ${GREEN}rebuild${NC} - Rebuild and start"
        echo -e "  ./docker-start.sh ${GREEN}clean${NC}   - Remove all services and volumes"
        echo -e "  ./docker-start.sh ${GREEN}restart${NC} - Restart services"
        echo -e "  ./docker-start.sh ${GREEN}test${NC}    - Run backend tests"
        echo ""
        ;;
esac
