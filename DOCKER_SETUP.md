# HOSKDOG Docker Setup Guide

This guide explains how to run HOSKDOG using Docker for development and production environments.

## Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)
- At least 2GB free disk space
- At least 2GB free RAM

## Quick Start (Development)

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/Adahandles/HOSKDOG.git
   cd HOSKDOG
   ```

2. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Edit .env** with your configuration:
   - Add your Blockfrost API key
   - Configure wallet addresses
   - Set network (Preprod for testing, Mainnet for production)

4. **Start all services**:
   ```bash
   npm run docker:dev
   # or
   docker compose up --build
   ```

5. **Access the application**:
   - Frontend: http://localhost:8080
   - API: http://localhost:4000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

## Services

The Docker setup includes:

### 1. App Container
- **Port**: 4000, 8080
- **Image**: Custom Node.js 18 Alpine
- **Description**: Main HOSKDOG application (API + Frontend)

### 2. PostgreSQL Database
- **Port**: 5432
- **Image**: postgres:15-alpine
- **Database**: hoskdog
- **User**: hoskdog
- **Password**: hoskdog (dev only)
- **Description**: Stores slurp history, deposits, and rate limits

### 3. Redis Cache
- **Port**: 6379
- **Image**: redis:7-alpine
- **Description**: Rate limiting and caching

### 4. Nginx Reverse Proxy
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Image**: nginx:alpine
- **Description**: Reverse proxy with SSL support

### 5. Certbot
- **Image**: certbot/certbot
- **Description**: Automatic SSL certificate management

## Environment Variables

### Required Variables

```bash
# Cardano Network
NETWORK=Preprod                    # or Mainnet
BLOCKFROST_API_KEY=preprod_xxx     # Get from blockfrost.io

# Database (Docker default for development)
DATABASE_URL=postgresql://hoskdog:hoskdog@postgres:5432/hoskdog

# Redis (Docker default for development)
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=hoskdog_redis_pass

# Faucet Configuration
FAUCET_WALLET_ADDRESS=addr_test1...
FAUCET_WALLET_PRIVATE_KEY=ed25519_sk1...
HKDG_POLICY_ID=your_policy_id

# Deposit Configuration
HOSKDOG_RECEIVING_ADDRESS=addr_test1...

# Security
JWT_SECRET=your_secret_here_min_32_chars
CORS_ORIGIN=http://localhost:8080
```

## Common Commands

### Development

```bash
# Start all services
npm run docker:dev

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f app
docker compose logs -f postgres

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v

# Restart a service
docker compose restart app
```

### Production

```bash
# Deploy to production
npm run docker:prod

# Or manually
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker compose ps

# View production logs
docker compose logs -f
```

### Database

```bash
# Access PostgreSQL shell
docker compose exec postgres psql -U hoskdog

# Backup database
npm run docker:backup

# Restore database
docker compose exec -T postgres psql -U hoskdog hoskdog < backups/db_backup_YYYYMMDD_HHMMSS.sql

# View database tables
docker compose exec postgres psql -U hoskdog -c "\dt"
```

### Redis

```bash
# Access Redis CLI
docker compose exec redis redis-cli

# Check Redis keys
docker compose exec redis redis-cli KEYS '*'

# Monitor Redis commands
docker compose exec redis redis-cli MONITOR
```

## Health Checks

All services include health checks:

```bash
# Check app health
curl http://localhost:4000/api/health

# Check PostgreSQL
docker compose exec postgres pg_isready -U hoskdog

# Check Redis
docker compose exec redis redis-cli ping
```

Expected response from `/api/health`:
```json
{
  "status": "OK",
  "service": "HOSKDOG Deposit Server",
  "network": "Preprod",
  "timestamp": "2024-01-30T12:00:00.000Z",
  "configured": true,
  "database": {
    "healthy": true,
    "timestamp": "2024-01-30 12:00:00.000000+00"
  },
  "redis": {
    "healthy": true
  }
}
```

## Troubleshooting

### Services Won't Start

1. Check if ports are already in use:
   ```bash
   # Check port 4000
   lsof -i :4000
   
   # Check port 5432 (PostgreSQL)
   lsof -i :5432
   
   # Check port 6379 (Redis)
   lsof -i :6379
   ```

2. Check Docker resources:
   ```bash
   docker system df
   ```

3. View service logs:
   ```bash
   docker compose logs app
   docker compose logs postgres
   docker compose logs redis
   ```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker compose ps postgres
   ```

2. Check database logs:
   ```bash
   docker compose logs postgres
   ```

3. Test connection:
   ```bash
   docker compose exec postgres psql -U hoskdog -c "SELECT version();"
   ```

### Redis Connection Issues

1. Verify Redis is running:
   ```bash
   docker compose ps redis
   ```

2. Test connection:
   ```bash
   docker compose exec redis redis-cli ping
   ```

### App Container Issues

1. Check if dependencies are installed:
   ```bash
   docker compose exec app ls -la node_modules
   ```

2. Rebuild the container:
   ```bash
   docker compose build app --no-cache
   docker compose up -d app
   ```

### Volume Permission Issues

If you encounter permission errors:
```bash
# Stop services
docker compose down

# Remove volumes
docker compose down -v

# Recreate volumes with correct permissions
docker compose up -d
```

## Production Deployment

### 1. Prepare Environment

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with production values
nano .env.production
```

**Important**: Use strong passwords and mainnet configuration!

### 2. Update Nginx Configuration

Edit `nginx/conf.d/hoskdog.conf`:
- Replace `yourdomain.com` with your actual domain
- Ensure SSL certificates are configured

### 3. SSL Certificates

For Let's Encrypt SSL:

```bash
# Get certificate (first time)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com \
  -d www.yourdomain.com

# Reload nginx
docker compose exec nginx nginx -s reload
```

Certbot will auto-renew certificates every 12 hours.

### 4. Deploy

```bash
# Build and start production services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify health
curl https://yourdomain.com/api/health
```

### 5. Monitoring

```bash
# View logs
docker compose logs -f

# Monitor resource usage
docker stats

# Check service status
docker compose ps
```

## Backup and Restore

### Automated Backups

```bash
# Run backup script
npm run docker:backup
```

This creates:
- `backups/db_backup_YYYYMMDD_HHMMSS.sql` - PostgreSQL dump
- `backups/redis_backup_YYYYMMDD_HHMMSS.rdb` - Redis snapshot

### Manual Backup

```bash
# Database
docker compose exec postgres pg_dump -U hoskdog hoskdog > backup.sql

# Redis
docker compose exec redis redis-cli SAVE
docker cp $(docker compose ps -q redis):/data/dump.rdb redis_backup.rdb
```

### Restore

```bash
# Database
docker compose exec -T postgres psql -U hoskdog hoskdog < backup.sql

# Redis
docker compose stop redis
docker cp redis_backup.rdb $(docker compose ps -q redis):/data/dump.rdb
docker compose start redis
```

## Scaling

To scale the app service:

```bash
# Run 3 instances
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale app=3
```

Nginx will automatically load balance between instances.

## Security Best Practices

1. **Never commit .env files** - They're in .gitignore
2. **Use strong passwords** in production
3. **Keep secrets secret** - Don't expose sensitive env vars
4. **Update images regularly**:
   ```bash
   docker compose pull
   docker compose up -d
   ```
5. **Restrict CORS origins** in production
6. **Use managed databases** for production (AWS RDS, etc.)
7. **Enable firewall** on production servers
8. **Monitor logs** for suspicious activity

## Development Tips

### Hot Reload

The development setup mounts your code as a volume, enabling hot reload:
- Changes to code are reflected immediately
- No need to rebuild containers
- Node modules are isolated in named volumes

### Database Migrations

When you update `database/init.sql`:
```bash
# Recreate database
docker compose down
docker compose up -d postgres
docker compose logs -f postgres
```

### Debugging

```bash
# Access app container shell
docker compose exec app sh

# Access database shell
docker compose exec postgres psql -U hoskdog

# View environment variables
docker compose exec app env
```

## Architecture

```
┌─────────────────┐
│   Client/User   │
└────────┬────────┘
         │
         ↓
┌────────────────────┐
│   Nginx (80/443)   │  ← SSL Termination, Rate Limiting
└────────┬───────────┘
         │
         ↓
┌────────────────────┐
│   App (4000/8080)  │  ← Node.js Application
└────┬───────┬───────┘
     │       │
     ↓       ↓
┌────────┐  ┌───────┐
│ Postgres│  │ Redis │  ← Data Storage & Caching
└─────────┘  └───────┘
```

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review health checks: `curl localhost:4000/api/health`
- See main README.md for application-specific help

## License

MIT License - See LICENSE file
