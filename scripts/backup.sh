#!/bin/bash
set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "💾 Creating database backup..."
docker-compose exec -T postgres pg_dump -U hoskdog hoskdog > "$BACKUP_DIR/db_backup_$DATE.sql"

echo "💾 Creating Redis backup..."
docker-compose exec -T redis redis-cli --rdb /data/dump.rdb
docker cp $(docker-compose ps -q redis):/data/dump.rdb "$BACKUP_DIR/redis_backup_$DATE.rdb"

echo "✅ Backups created in $BACKUP_DIR"
