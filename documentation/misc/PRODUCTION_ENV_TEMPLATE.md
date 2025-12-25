# Production Environment Configuration Template

**File Location:** Copy this content to `server/.env` for production deployment

**⚠️ CRITICAL:** NEVER commit the actual `.env` file to version control

## Quick Setup

To generate secure secrets, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Environment Variables

### Environment
```bash
NODE_ENV=production
```

### JWT Configuration (REQUIRED - CRITICAL SECURITY)

Generate secure random strings (minimum 32 characters each). These MUST be different from each other.

```bash
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars

# JWT Issuer and Audience (optional but recommended for production)
JWT_ISS=your-app-name
JWT_AUD=your-domain.com

# Token Time-to-Live Settings
TOKEN_TTL_MIN=15
REFRESH_TTL_DAYS=7
```

### Password Security (RECOMMENDED)

Bcrypt hashing rounds (OWASP 2025 recommends 12+). Higher = more secure but slower. Range: 10-15

```bash
BCRYPT_ROUNDS=12
```

### CORS Configuration (REQUIRED)

Your frontend domain (must be exact match):
- Production: `https://yourdomain.com`
- Development: `http://localhost:5173`

```bash
FRONTEND_ORIGIN=https://yourdomain.com
```

### Server Configuration

```bash
PORT=3050

# Cookie name for refresh tokens (optional)
REFRESH_COOKIE_NAME=refresh_token
```

### Rate Limiting (optional)

```bash
# Maximum requests per time window
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Authentication rate limiting (login/register endpoints)
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW_MS=900000
```

### Performance Monitoring (optional)

```bash
# Log requests slower than this threshold (in milliseconds)
SLOW_REQUEST_THRESHOLD_MS=1000
```

### Database Configuration (optional)

```bash
# Database path (defaults to ./database.sqlite)
DATABASE_PATH=./database.sqlite
```

### Logging (optional)

```bash
# Log level: error, warn, info, debug
LOG_LEVEL=info
```

### Security Headers (optional)

```bash
# Trusted proxy hops (for rate limiting behind reverse proxy)
# Set to 1 if behind nginx/Apache, 0 if direct connection
TRUST_PROXY=1
```

---

## Complete .env Template

Copy this entire block to `server/.env` and replace the placeholder values:

```bash
# Environment
NODE_ENV=production

# JWT Configuration (REQUIRED)
JWT_ACCESS_SECRET=<generate-with-crypto-randomBytes>
JWT_REFRESH_SECRET=<generate-with-crypto-randomBytes>
JWT_ISS=your-app-name
JWT_AUD=your-domain.com
TOKEN_TTL_MIN=15
REFRESH_TTL_DAYS=7

# Password Security
BCRYPT_ROUNDS=12

# CORS Configuration (REQUIRED)
FRONTEND_ORIGIN=https://yourdomain.com

# Server Configuration
PORT=3050
REFRESH_COOKIE_NAME=refresh_token

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW_MS=900000

# Performance Monitoring
SLOW_REQUEST_THRESHOLD_MS=1000

# Database
DATABASE_PATH=./database.sqlite

# Logging
LOG_LEVEL=info

# Security
TRUST_PROXY=1
```

---

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] `JWT_ACCESS_SECRET` is set to a cryptographically random 32+ char string
- [ ] `JWT_REFRESH_SECRET` is set to a different random 32+ char string
- [ ] `FRONTEND_ORIGIN` is set to your actual domain (https://yourdomain.com)
- [ ] `NODE_ENV=production`
- [ ] `BCRYPT_ROUNDS` is set to 12 or higher
- [ ] SSL/TLS certificates are configured
- [ ] Database backups are configured
- [ ] Log rotation is set up
- [ ] Health monitoring is configured
- [ ] Rate limiting is tested and working

---

## Generate Secrets Script

Run this to generate all required secrets:

```bash
#!/bin/bash
echo "# Generated Secrets for Production"
echo "JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

Save as `generate-secrets.sh`, make executable with `chmod +x generate-secrets.sh`, and run with `./generate-secrets.sh`

