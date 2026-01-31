# GitHub Secrets Configuration

## Required Secrets

### Deployment Secrets

#### Staging Environment
- `STAGING_HOST` - Staging server IP or hostname
- `STAGING_USER` - SSH username for staging
- `STAGING_SSH_KEY` - Private SSH key for staging
- `STAGING_PORT` - SSH port (default: 22)

#### Production Environment
- `PRODUCTION_HOST` - Production server IP or hostname
- `PRODUCTION_USER` - SSH username for production
- `PRODUCTION_SSH_KEY` - Private SSH key for production
- `PRODUCTION_PORT` - SSH port (default: 22)

### Application Secrets

These should be set as environment secrets in GitHub:

- `BLOCKFROST_API_KEY` - Blockfrost API key for mainnet
- `FAUCET_WALLET_PRIVATE_KEY` - Private key for faucet wallet
- `JWT_SECRET` - Secret for JWT token generation
- `DATABASE_URL` - Production database connection string
- `REDIS_URL` - Production Redis connection string
- `REDIS_PASSWORD` - Redis authentication password

### Optional Secrets

- `DISCORD_WEBHOOK` - Discord webhook for deployment notifications
- `SNYK_TOKEN` - Snyk API token for security scanning
- `SENTRY_DSN` - Sentry DSN for error tracking

## Setting Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with its value
4. For environment-specific secrets, use Environment secrets

## Environment Configuration

Create two environments in GitHub:
1. **staging** - For testing before production
2. **production** - Protected, requires approval

### Protection Rules (Production)
- Required reviewers: 1
- Wait timer: 5 minutes
- Allowed branches: main only
