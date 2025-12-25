# Quick Start Guide - Critical Security Fixes

## ⚡ 3-Minute Setup

All critical security fixes have been implemented. Follow these steps to get your application running securely:

### Step 1: Generate Environment Variables (30 seconds)

```bash
cd server
node setup-env.js
```

This will:
- Generate cryptographically secure JWT secrets
- Create a `.env` file with secure defaults
- Display the configuration for your review

### Step 2: Review Configuration (30 seconds)

Open `server/.env` and verify:
- `FRONTEND_ORIGIN` matches your client URL (default: `http://localhost:5173`)
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are different
- All other settings look correct

### Step 3: Start the Server (1 minute)

```bash
# From the server directory
npm start
```

**Look for these success messages:**
```
✓ Environment validation passed
✓ Database connection established
✓ SQLite WAL mode enabled (supports concurrent reads/writes)
✓ Foreign key constraints enabled
✓ Cache size set to 64MB
✓ Busy timeout set to 5000ms
✓ Database initialization complete
BackendServer is running on port 3050
```

### Step 4: Start the Client (1 minute)

```bash
# From the client directory (new terminal)
cd ../client
npm run dev
```

### Step 5: Verify Security Fixes (30 seconds)

1. Open browser to `http://localhost:5173`
2. Open DevTools (F12) → Application → Local Storage
3. Log in to the application
4. ✅ Verify: No `auth_token` in localStorage (security fix working!)
5. Refresh the page
6. ✅ Verify: You're still logged in (httpOnly cookies working!)

---

## 🎉 Success!

If you see the success messages above, all critical security fixes are working:

✅ **No hardcoded secrets** - Server validates JWT secrets at startup  
✅ **No XSS token theft** - Tokens stored in memory only  
✅ **High concurrency support** - SQLite WAL mode enabled  
✅ **Fail-fast validation** - Misconfigurations caught at startup

---

## 🚨 Troubleshooting

### Error: "JWT_ACCESS_SECRET is required"

**Solution:** Run `node setup-env.js` from the server directory

### Error: "FRONTEND_ORIGIN format is invalid"

**Solution:** Edit `server/.env` and set:
```bash
FRONTEND_ORIGIN=http://localhost:5173
```

### Warning: "Using default JWT_ISS or JWT_AUD"

**Solution (optional):** Edit `server/.env` and customize:
```bash
JWT_ISS=your-app-name
JWT_AUD=your-app-users
```

### Server won't start / Database errors

**Solution:** Delete the database and let it recreate:
```bash
cd server
rm database.sqlite
npm start
```

---

## 📋 What Changed?

### Backend (Server)
- **Environment validation** added to `app.js`
- **JWT secret validation** added to `middleware/auth.js`
- **Database WAL mode** enabled in `db/index.js`
- **Duplicate connection** removed from `transaction-controller.js`

### Frontend (Client)
- **Token storage** moved from localStorage to memory (XSS protection)
- **Automatic token refresh** before expiry
- **Token provider** pattern for shared http client

### New Files
- `server/setup-env.js` - Environment setup helper
- `CRITICAL_SECURITY_FIXES.md` - Detailed documentation
- `QUICKSTART_SECURITY_FIXES.md` - This file

---

## 🔜 Next Steps

### Before Production Deployment

1. ✅ All critical fixes are complete
2. ⏳ Review and implement HIGH severity fixes
3. ⏳ Update `.env` for production:
   ```bash
   NODE_ENV=production
   FRONTEND_ORIGIN=https://your-domain.com
   ```
4. ⏳ Run security test suite
5. ⏳ Test with 20+ concurrent users

### Recommended (Within 2 Weeks)

- Implement refresh token rotation
- Add structured logging
- Add mobile-responsive views
- Document API with Swagger

---

## 📚 Documentation

- **Full Details:** See `CRITICAL_SECURITY_FIXES.md`
- **Original Analysis:** See the production readiness report
- **Code Comments:** All changes include security notes

---

## 💬 Need Help?

1. Check server startup logs for specific error messages
2. Review `CRITICAL_SECURITY_FIXES.md` for detailed troubleshooting
3. Verify `.env` file exists in `/server` directory
4. Ensure JWT secrets are at least 32 characters

---

**Status:** Ready to test! 🚀

Run `node setup-env.js` from the server directory to begin.
