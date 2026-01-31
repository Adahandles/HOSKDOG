#!/bin/bash
set -e

BACKUP_DIR="/opt/hoskdog/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

echo "📦 Creating backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup database if postgres is running
if docker-compose ps | grep -q postgres; then
    echo "Backing up database..."
    docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-hoskdog} ${POSTGRES_DB:-hoskdog} > "$BACKUP_DIR/db_$TIMESTAMP.sql"
fi

# Backup important files
echo "Backing up application files..."
tar -czf "$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='backups' \
    --exclude='.git' \
    .env .env.production logs/ data/ 2>/dev/null || true

# Keep only last 7 backups
echo "Cleaning old backups..."
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +8 | xargs -r rm
ls -t "$BACKUP_DIR"/db_*.sql | tail -n +8 | xargs -r rm

echo "✅ Backup completed: $BACKUP_FILE"
