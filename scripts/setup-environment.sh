#!/bin/bash
set -e

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo "🔧 Setting up $ENVIRONMENT environment..."

# Create app directory
sudo mkdir -p /opt/hoskdog
sudo chown $USER:$USER /opt/hoskdog
cd /opt/hoskdog

# Clone repository
if [ ! -d ".git" ]; then
    git clone https://github.com/Adahandles/HOSKDOG.git .
fi

# Copy environment file
if [ ! -f ".env.$ENVIRONMENT" ]; then
    echo "❌ .env.$ENVIRONMENT not found!"
    echo "Please create it with required configuration"
    exit 1
fi

cp .env.$ENVIRONMENT .env.production

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Pull and start containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo "✅ $ENVIRONMENT environment setup complete!"
