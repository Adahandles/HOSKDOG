#!/bin/bash

# HOSKDOG Docker Setup Validation Script
# This script checks if all required files and configurations are in place

echo "🚽 HOSKDOG Docker Setup Validation"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
    else
        echo -e "${RED}✗${NC} $1 is missing"
        ((errors++))
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 directory exists"
    else
        echo -e "${RED}✗${NC} $1 directory is missing"
        ((errors++))
    fi
}

# Function to check environment variable in file
check_env_var() {
    local file=$1
    local var=$2
    if [ -f "$file" ]; then
        if grep -q "^${var}=" "$file" || grep -q "^# ${var}=" "$file"; then
            echo -e "${GREEN}✓${NC} ${var} is defined in ${file}"
        else
            echo -e "${YELLOW}⚠${NC} ${var} is not defined in ${file}"
            ((warnings++))
        fi
    fi
}

echo "Checking Docker Configuration Files..."
echo "--------------------------------------"
check_file "Dockerfile"
check_file "docker-compose.yml"
check_file "docker-compose.prod.yml"
check_file ".dockerignore"
echo ""

echo "Checking Nginx Configuration..."
echo "-------------------------------"
check_dir "nginx"
check_dir "nginx/conf.d"
check_file "nginx/nginx.conf"
check_file "nginx/conf.d/hoskdog.conf"
echo ""

echo "Checking Database Configuration..."
echo "----------------------------------"
check_dir "database"
check_file "database/init.sql"
check_file "database/db.js"
check_file "database/redis.js"
echo ""

echo "Checking Scripts..."
echo "-------------------"
check_dir "scripts"
check_file "scripts/dev.sh"
check_file "scripts/prod.sh"
check_file "scripts/backup.sh"

# Check if scripts are executable
if [ -f "scripts/dev.sh" ]; then
    if [ -x "scripts/dev.sh" ]; then
        echo -e "${GREEN}✓${NC} scripts/dev.sh is executable"
    else
        echo -e "${YELLOW}⚠${NC} scripts/dev.sh is not executable (run: chmod +x scripts/dev.sh)"
        ((warnings++))
    fi
fi
echo ""

echo "Checking Environment Files..."
echo "-----------------------------"
check_file ".env.example"
check_file ".env.production.example"

if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env exists"
    
    # Check critical environment variables
    check_env_var ".env" "DATABASE_URL"
    check_env_var ".env" "REDIS_URL"
    check_env_var ".env" "BLOCKFROST_KEY"
    check_env_var ".env" "NETWORK"
else
    echo -e "${YELLOW}⚠${NC} .env does not exist (copy from .env.example)"
    ((warnings++))
fi
echo ""

echo "Checking Package Files..."
echo "-------------------------"
check_file "package.json"
check_file "server/package.json"

# Check if pg and redis are in dependencies
if [ -f "package.json" ]; then
    if grep -q '"pg"' package.json; then
        echo -e "${GREEN}✓${NC} pg dependency found in package.json"
    else
        echo -e "${RED}✗${NC} pg dependency missing in package.json"
        ((errors++))
    fi
    
    if grep -q '"redis"' package.json; then
        echo -e "${GREEN}✓${NC} redis dependency found in package.json"
    else
        echo -e "${RED}✗${NC} redis dependency missing in package.json"
        ((errors++))
    fi
fi
echo ""

echo "Checking Docker Installation..."
echo "-------------------------------"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed: $(docker --version)"
else
    echo -e "${RED}✗${NC} Docker is not installed"
    ((errors++))
fi

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} docker-compose is installed: $(docker-compose --version)"
elif docker compose version &> /dev/null; then
    echo -e "${GREEN}✓${NC} docker compose is installed: $(docker compose version)"
else
    echo -e "${RED}✗${NC} docker-compose is not installed"
    ((errors++))
fi
echo ""

echo "Checking Documentation..."
echo "-------------------------"
check_file "DOCKER_SETUP.md"
check_file "README.md"
echo ""

echo "Summary"
echo "======="
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You're ready to start with:"
    echo "  npm run docker:dev"
    echo "or"
    echo "  docker compose up --build"
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠ ${warnings} warning(s) found${NC}"
    echo "Review warnings above, but you should be able to proceed."
    exit 0
else
    echo -e "${RED}✗ ${errors} error(s) found${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}⚠ ${warnings} warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors above before proceeding."
    exit 1
fi
