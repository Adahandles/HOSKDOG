# Deployment Guide

## Automated Deployment

Every push to `main` branch triggers automatic deployment:
1. Run tests
2. Build Docker image
3. Deploy to staging
4. Deploy to production (with approval)

## Manual Deployment

### Deploy to Staging
```bash
git push origin main
```

### Deploy to Production
1. Push triggers staging deployment
2. Review staging at https://staging.yourdomain.com
3. Approve production deployment in GitHub Actions
4. Production automatically deploys

## Rollback

If deployment fails:
```bash
ssh user@production-server
cd /opt/hoskdog
./scripts/rollback.sh
```

## Monitoring Deployment

- GitHub Actions: https://github.com/Adahandles/HOSKDOG/actions
- Staging: https://staging.yourdomain.com/api/health
- Production: https://yourdomain.com/api/health

## Manual Database Migration

To run database migrations manually:

1. Go to GitHub Actions
2. Select "Database Migration" workflow
3. Click "Run workflow"
4. Choose environment (staging or production)
5. Confirm and run

## Environment Setup

To set up a new deployment environment:

```bash
# On the target server
./scripts/setup-environment.sh [staging|production]
```

## Health Checks

Test application health:
```bash
node scripts/health-check.js
```

Or via curl:
```bash
curl http://localhost:4000/api/health
```

## Troubleshooting

### Deployment Fails
1. Check GitHub Actions logs
2. Verify server SSH access
3. Check Docker logs: `docker-compose logs -f`
4. Rollback if needed: `./scripts/rollback.sh`

### Tests Failing
1. Check test output in GitHub Actions
2. Run tests locally: `npm test`
3. Fix issues and push again

### Health Check Fails
1. Check server logs: `docker-compose logs app`
2. Verify environment variables
3. Check database/redis connectivity
4. Restart services: `docker-compose restart`
