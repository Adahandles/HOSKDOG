#!/bin/bash
set -e

echo "🚀 Deploying HOSKDOG to production..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production not found!"
    exit 1
fi

# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Run health checks
docker-compose exec app node -e "require('http').get('http://localhost:4000/api/health', (r) => console.log('Health check:', r.statusCode))"

echo "✅ Production deployment complete!"
