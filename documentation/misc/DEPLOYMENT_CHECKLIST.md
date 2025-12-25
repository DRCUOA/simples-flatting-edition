# v1.0 Production Deployment Checklist

**Quick Reference Guide for Production Launch**

---

## ⚠️ CRITICAL - Do Before Deployment

### 1. Generate Secure Secrets ⚠️

```bash
# Generate JWT Access Secret
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT Refresh Secret  
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

**❗ CRITICAL:** Save these secrets securely. They MUST be:
- At least 32 characters (64 recommended)
- Cryptographically random
- Different from each other
- NEVER committed to git

---

### 2. Create Production Environment File ⚠️

Create `server/.env` with:

```bash
NODE_ENV=production
JWT_ACCESS_SECRET=<paste-generated-secret-1>
JWT_REFRESH_SECRET=<paste-generated-secret-2>
JWT_ISS=your-app-name
JWT_AUD=your-domain.com
BCRYPT_ROUNDS=12
FRONTEND_ORIGIN=https://yourdomain.com
PORT=3050
```

**Reference:** `documentation/PRODUCTION_ENV_TEMPLATE.md` for complete template

---

### 3. Test Production Configuration ⚠️

```bash
cd server
node test-production-config.js
```

**Expected Output:**
```
✅ SUCCESS: Server configured correctly for production
Production readiness: READY ✅
```

**If test fails:** Review error messages and fix configuration before proceeding.

---

## 📋 Pre-Deployment Checklist

### Environment Configuration
- [ ] Generated secure JWT secrets (64+ characters)
- [ ] Created `server/.env` file
- [ ] Set `NODE_ENV=production`
- [ ] Set `BCRYPT_ROUNDS=12` or higher
- [ ] Configured `FRONTEND_ORIGIN` to production domain
- [ ] Verified JWT secrets are different
- [ ] Ran production config test (passed)

### Infrastructure
- [ ] SSL/TLS certificates installed
- [ ] Certificate auto-renewal configured (Let's Encrypt)
- [ ] Reverse proxy configured (nginx/Apache)
- [ ] HTTPS enforced (HTTP → HTTPS redirect)
- [ ] Security headers configured
- [ ] Firewall rules configured

### Database
- [ ] Database backups scheduled (automated)
- [ ] Backup restoration tested
- [ ] Log rotation configured
- [ ] Database permissions verified

### Application
- [ ] Server dependencies installed (`npm install --production`)
- [ ] Client built (`npm run build`)
- [ ] PM2 or process manager configured
- [ ] Graceful shutdown handlers working

---

## 🚀 Deployment Steps

### 1. Install Dependencies

```bash
# Server
cd server
npm install --production

# Client
cd ../client
npm install
npm run build
```

### 2. Deploy Static Files

```bash
# Copy client build to web server
cp -r client/dist/* /var/www/yourdomain.com/
```

### 3. Start Server with PM2

```bash
# Install PM2
npm install -g pm2

# Start server
cd server
pm2 start app.js --name financial-app-api -i 2

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 4. Configure Reverse Proxy

**Nginx example:**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/yourdomain.com;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## ✅ Post-Deployment Verification

### Immediate Checks (0-5 minutes)

```bash
# 1. Health check
curl https://yourdomain.com/healthz

# Expected: {"status":"healthy","timestamp":"..."}

# 2. Server logs
pm2 logs financial-app-api --lines 50

# Look for:
# ✓ Environment validation passed
# ✓ SQLite WAL mode enabled
# ✓ Server started successfully

# 3. SSL verification
curl -I https://yourdomain.com

# Check headers:
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
```

### Functional Testing (5-15 minutes)

- [ ] User can access login page
- [ ] User can register new account
- [ ] User can login successfully
- [ ] Dashboard loads correctly
- [ ] Transactions page works
- [ ] Budget page works
- [ ] Reports page works
- [ ] User can logout

### Security Verification (15-30 minutes)

- [ ] Login with valid credentials works
- [ ] Login with invalid credentials fails appropriately
- [ ] Tokens are not in localStorage (inspect DevTools)
- [ ] Refresh token cookie has `__Host-` prefix
- [ ] Refresh token cookie has HttpOnly, Secure, SameSite flags
- [ ] Token refresh works (wait for token expiration or force)
- [ ] CORS blocks unauthorized origins
- [ ] Rate limiting works (try multiple failed logins)

### Mobile Testing (30-60 minutes)

- [ ] Test on iPhone Safari
- [ ] Test on Android Chrome
- [ ] Test on iPad
- [ ] All pages are responsive
- [ ] No horizontal scrolling
- [ ] Touch targets are adequate
- [ ] Forms are usable

---

## 📊 Monitoring (First 24-48 Hours)

### Critical Metrics

```bash
# Server status
pm2 status

# CPU and Memory
pm2 monit

# Error logs
tail -f server/logs/error-$(date +%Y-%m-%d).log

# Security logs
tail -f server/logs/security-$(date +%Y-%m-%d).log

# Performance logs
tail -f server/logs/performance-$(date +%Y-%m-%d).log
```

### Monitor For:
- [ ] No database locking errors
- [ ] Response times under 500ms
- [ ] No 500 errors in logs
- [ ] Security events are normal
- [ ] Memory usage stable
- [ ] CPU usage reasonable

---

## 🆘 Troubleshooting

### Server won't start

**Check:**
1. Environment validation errors
   ```bash
   cd server
   node app.js
   ```
2. Port already in use
   ```bash
   lsof -i :3050
   ```
3. Database permissions
   ```bash
   ls -la database.sqlite*
   ```

### Cookies not being set

**Check:**
1. HTTPS is active (required for Secure cookies)
2. `NODE_ENV=production`
3. `FRONTEND_ORIGIN` matches exactly
4. Browser DevTools → Application → Cookies

### Token refresh fails

**Check:**
1. Cookie domain and path settings
2. Cookie is being sent in request
3. Server logs for token validation errors
4. JWT secrets are correct

### Database locked errors

**Check:**
1. WAL mode is enabled
   ```bash
   sqlite3 server/database.sqlite "PRAGMA journal_mode;"
   ```
2. File permissions on database.sqlite-wal
3. No other processes accessing database

---

## 🔄 Rollback Procedure

If critical issues arise:

```bash
# 1. Stop server
pm2 stop financial-app-api

# 2. Restore database (if needed)
cp /backups/financial-app/database_<timestamp>.sqlite server/database.sqlite

# 3. Restore previous version
git checkout <previous-tag>
npm install --production
npm run build

# 4. Restart
pm2 restart financial-app-api
```

**Recovery Time:** < 5 minutes

---

## 📞 Emergency Contacts

- **System Administrator:** [Contact Info]
- **Database Administrator:** [Contact Info]
- **Security Team:** [Contact Info]

---

## 📚 Documentation References

| Document | Purpose |
|----------|---------|
| `PRODUCTION_ENV_TEMPLATE.md` | Environment variables reference |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | Detailed deployment guide |
| `V1_IMPLEMENTATION_SUMMARY.md` | Implementation details |
| `MOBILE_RESPONSIVE_VERIFICATION.md` | Mobile testing guide |

---

## ✅ Sign-Off

**Deployment completed by:** ___________________________

**Date:** ___________________________

**Time:** ___________________________

**All checks passed:** [ ] Yes  [ ] No

**Issues encountered:** ___________________________

**Notes:** 
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

---

**Version:** 1.0  
**Last Updated:** October 10, 2025

