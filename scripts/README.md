# HOSKDOG Scripts

This directory contains automation and utility scripts for the HOSKDOG project.

## Scripts Overview

### health-check.js
Health check script that verifies the application is running correctly.

**Usage:**
```bash
node scripts/health-check.js
```

**Exit codes:**
- `0` - Health check passed
- `1` - Health check failed

### setup-environment.sh
Sets up a deployment environment (staging or production) with all necessary dependencies.

**Usage:**
```bash
./scripts/setup-environment.sh [staging|production]
```

**Requirements:**
- Git
- Docker and Docker Compose (will be installed if not present)
- `.env.[environment]` file with configuration

### rollback.sh
Rolls back to the previous Docker image version.

**Usage:**
```bash
./scripts/rollback.sh
```

**Note:** Requires at least 2 Docker images to be available locally.

### backup.sh
Creates a backup of the database and important application files.

**Usage:**
```bash
./scripts/backup.sh
```

**Backup location:** `/opt/hoskdog/backups/`

**Retention:** Keeps the last 7 backups automatically.

## GitHub Actions Integration

These scripts are used by the GitHub Actions CI/CD workflows:
- `health-check.js` - Used in deployment workflows to verify successful deployments
- `setup-environment.sh` - Used for initial server setup
- `rollback.sh` - Used when deployments fail health checks
- `backup.sh` - Run before production deployments

## Security Notes

- All scripts should be executable (`chmod +x`)
- Never commit sensitive data or credentials
- Use environment variables for configuration
- Review scripts before running in production
