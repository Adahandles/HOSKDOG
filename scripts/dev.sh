#!/bin/bash
set -e

echo "🐳 Starting HOSKDOG development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
    exit 1
fi

# Build and start containers
docker-compose up --build

echo "✅ Development environment started!"
echo "🌐 Application: http://localhost:8080"
echo "🔧 API: http://localhost:4000"
echo "🗄️  PostgreSQL: localhost:5432"
echo "📦 Redis: localhost:6379"
