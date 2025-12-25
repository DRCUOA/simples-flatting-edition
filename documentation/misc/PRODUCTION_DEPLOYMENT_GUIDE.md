# Production Deployment Guide - v1.0

## Pre-Deployment Overview

This guide provides step-by-step instructions for deploying the financial management application to production with all security fixes implemented.

### Security Fixes Completed ✓

1. ✅ **JWT Secret Validation** - Environment validation prevents deployment without secure secrets
2. ✅ **XSS Token Storage Fix** - Tokens stored in memory only, not localStorage
3. ✅ **SQLite WAL Mode** - Concurrent access enabled for 20+ simultaneous users
4. ✅ **Environment Validation** - Fail-fast on missing or insecure configuration
5. ✅ **Refresh Token Rotation** - Tokens automatically rotated to prevent theft escalation
6. ✅ **Enhanced Cookie Security** - `__Host-` prefix in production for maximum security
7. ✅ **Configurable Bcrypt Rounds** - OWASP 2025 compliant password hashing (12+ rounds)

---

## Phase 1: Pre-Deployment Preparation

### 1.1 Generate Secure Secrets

Generate cryptographically secure secrets for JWT tokens:

```bash
# Generate JWT Access Secret
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT Refresh Secret
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Critical:** These secrets MUST be:
- At least 32 characters long
- Cryptographically random
- Different from each other
- Never committed to version control

### 1.2 Prepare Production Environment File

Create `server/.env` with the following configuration (see `PRODUCTION_ENV_TEMPLATE.md` for full template):

```bash
NODE_ENV=production
JWT_ACCESS_SECRET=<your-generated-secret-1>
JWT_REFRESH_SECRET=<your-generated-secret-2>
JWT_ISS=your-app-identifier
JWT_AUD=your-domain.com
BCRYPT_ROUNDS=12
FRONTEND_ORIGIN=https://yourdomain.com
PORT=3050
```

### 1.3 SSL/TLS Certificate Setup

**Requirements:**
- Valid SSL/TLS certificate for your domain
- Certificate chain properly configured
- Automatic renewal configured (e.g., Let's Encrypt with certbot)

**For Let's Encrypt:**
```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

### 1.4 Reverse Proxy Configuration

**Nginx Configuration Example:**

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js Backend
    location /api {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend Static Files
    location / {
        root /var/www/yourdomain.com/client/dist;
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Phase 2: Database Setup

### 2.1 Database Migration

Ensure all migrations are applied:

```bash
cd server
# Run migrations (if you have a migration script)
# Otherwise, ensure database.sqlite exists with all tables
```

### 2.2 Database Backup Strategy

**Automated Daily Backups:**

Create backup script `/usr/local/bin/backup-financial-db.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/financial-app"
DB_PATH="/path/to/app/server/database.sqlite"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup with WAL checkpoint
sqlite3 $DB_PATH "PRAGMA wal_checkpoint(TRUNCATE);"
cp $DB_PATH "$BACKUP_DIR/database_$DATE.sqlite"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "database_*.sqlite" -mtime +30 -delete

echo "Backup completed: database_$DATE.sqlite"
```

**Setup Cron Job:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-financial-db.sh >> /var/log/db-backup.log 2>&1
```

### 2.3 Verify WAL Mode

```bash
sqlite3 server/database.sqlite "PRAGMA journal_mode;"
# Should return: wal
```

---

## Phase 3: Application Deployment

### 3.1 Install Dependencies

```bash
# Server dependencies
cd server
npm install --production

# Client build
cd ../client
npm install
npm run build
```

### 3.2 Start Server with PM2 (Process Manager)

**Install PM2:**
```bash
npm install -g pm2
```

**PM2 Ecosystem File** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'financial-app-api',
    script: './server/app.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false
  }]
};
```

**Start Application:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.3 Verify Application Health

```bash
curl https://yourdomain.com/healthz
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-10T...",
  "uptime": 12.345,
  "version": "1.0.0",
  "node": "v18.x.x",
  "environment": "production"
}
```

---

## Phase 4: Security Verification

### 4.1 Environment Validation

Start the server and verify environment validation passes:

```bash
cd server
node app.js
```

You should see:
```
✓ Environment validation passed
  Environment: Production (enhanced security checks enabled)
✓ Database connection established
✓ SQLite WAL mode enabled
✓ Foreign key constraints enabled
BackendServer is running on port 3050
```

### 4.2 SSL/HTTPS Verification

Test SSL configuration:
```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check SSL rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

### 4.3 Security Headers Check

```bash
curl -I https://yourdomain.com/api
```

Verify headers include:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`

### 4.4 Cookie Security Verification

Login and inspect cookies:
- Cookie name should be `__Host-refresh_token` (not `refresh_token`)
- Attributes: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`

### 4.5 Token Rotation Verification

1. Login and capture the refresh token cookie value
2. Call `/api/auth/refresh` endpoint
3. Verify the refresh token cookie has changed to a new value

---

## Phase 5: Performance Testing

### 5.1 Concurrent User Load Test

Test with 20+ simultaneous users (see test script in `prod-readiness-report-1.md`):

```bash
# Install test dependencies
npm install -g artillery

# Run load test
artillery quick --count 20 --num 10 https://yourdomain.com/api/transactions
```

Expected results:
- All requests complete within 5 seconds
- No database locking errors
- Response times under 500ms for most requests

### 5.2 Database Performance Verification

```bash
# Check WAL file size
ls -lh server/database.sqlite-wal

# Monitor database performance
sqlite3 server/database.sqlite "PRAGMA optimize;"
```

---

## Phase 6: Monitoring and Logging

### 6.1 Log Rotation Setup

Create `/etc/logrotate.d/financial-app`:

```
/path/to/app/server/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 6.2 Monitoring Dashboard

Monitor key metrics:
- Server uptime (PM2 dashboard)
- Error logs (`server/logs/error-*.log`)
- Security logs (`server/logs/security-*.log`)
- Performance logs (`server/logs/performance-*.log`)
- Database size and WAL file size

### 6.3 Alert Configuration

Setup alerts for:
- Server downtime
- High error rates (>10% of requests)
- Slow queries (>1000ms)
- Security events (failed login attempts, token violations)
- Disk space (database growth)

---

## Phase 7: Post-Deployment Verification

### 7.1 Complete Deployment Checklist

- [ ] All environment variables are set correctly
- [ ] JWT secrets are cryptographically secure and different
- [ ] `NODE_ENV=production`
- [ ] `BCRYPT_ROUNDS=12` or higher
- [ ] SSL/TLS certificates are installed and valid
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] Reverse proxy is configured with security headers
- [ ] Database backups are configured and tested
- [ ] Log rotation is set up
- [ ] PM2 is running the application in cluster mode
- [ ] Health check endpoint responds correctly
- [ ] `__Host-` cookie prefix is active
- [ ] Token rotation is working
- [ ] Rate limiting is active
- [ ] Cross-user isolation is enforced
- [ ] Error messages don't expose internal details
- [ ] 404 and 500 errors are handled gracefully

### 7.2 User Acceptance Testing

Test critical user flows:
1. User registration
2. User login
3. Token refresh (wait for expiration)
4. Create/edit/delete transactions
5. View budget reports
6. Upload statements
7. Export data
8. User logout

### 7.3 Security Audit

- [ ] No tokens in localStorage (inspect browser DevTools)
- [ ] Refresh tokens are httpOnly cookies
- [ ] CORS allows only your frontend domain
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (input sanitization)
- [ ] Rate limiting prevents brute force attacks
- [ ] Error logs don't contain sensitive data

---

## Rollback Procedure

If issues are encountered:

1. **Immediate Rollback:**
   ```bash
   pm2 stop financial-app-api
   # Restore previous version
   pm2 start ecosystem.config.js
   ```

2. **Database Rollback:**
   ```bash
   # Stop application
   pm2 stop financial-app-api
   
   # Restore from backup
   cp /backups/financial-app/database_YYYYMMDD_HHMMSS.sqlite server/database.sqlite
   
   # Restart application
   pm2 start financial-app-api
   ```

---

## Support and Troubleshooting

### Common Issues

**Issue: Environment validation fails**
- Solution: Check `.env` file exists in `server/` directory
- Verify all required variables are set
- Check secrets are at least 32 characters

**Issue: Database locked errors**
- Solution: Verify WAL mode is enabled
- Check file permissions on database.sqlite-wal
- Ensure no other processes are accessing the database

**Issue: Cookies not being set**
- Solution: Verify HTTPS is active
- Check `NODE_ENV=production`
- Verify `FRONTEND_ORIGIN` matches exactly

**Issue: Token refresh fails**
- Solution: Check cookie domain and path settings
- Verify refresh token cookie is being sent
- Check security logs for token validation errors

### Log Locations

- Application logs: `server/logs/`
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`

---

## Post-Launch Maintenance

### Daily Tasks
- Monitor error logs for unusual activity
- Check health endpoint status
- Review security logs for suspicious login attempts

### Weekly Tasks
- Review performance logs for slow queries
- Check database size and WAL file growth
- Verify backups are completing successfully

### Monthly Tasks
- Review and update dependencies for security patches
- Test backup restoration procedure
- Review access logs for unusual patterns
- Update SSL certificates if needed (Let's Encrypt auto-renews)

---

## Version History

- **v1.0** - Initial production release
  - All critical security fixes implemented
  - Refresh token rotation active
  - Enhanced cookie security with `__Host-` prefix
  - Configurable bcrypt rounds (OWASP compliant)
  - SQLite WAL mode for concurrent access
  - Comprehensive environment validation

---

## Contact and Support

For production issues, refer to:
- Security incidents: Review `server/logs/security-*.log`
- Performance issues: Review `server/logs/performance-*.log`
- Application errors: Review `server/logs/error-*.log`

**Emergency Contacts:**
- System Administrator: [contact info]
- Database Administrator: [contact info]
- Security Team: [contact info]

