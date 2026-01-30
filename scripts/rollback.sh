#!/bin/bash
set -e

echo "⏮️  Rolling back to previous version..."

# Get previous image tag
PREVIOUS_TAG=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep hoskdog | sed -n '2p')

if [ -z "$PREVIOUS_TAG" ]; then
    echo "❌ No previous version found!"
    exit 1
fi

echo "Rolling back to: $PREVIOUS_TAG"

# Update docker-compose to use previous tag
export IMAGE_TAG=$PREVIOUS_TAG

# Restart with previous version
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify rollback
sleep 10
curl -f http://localhost:4000/api/health || exit 1

echo "✅ Rollback completed successfully!"
