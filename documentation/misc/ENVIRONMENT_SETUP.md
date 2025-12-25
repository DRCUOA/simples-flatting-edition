# Environment Setup Guide

This guide explains how to set up and manage development and production environments for the Financial App.

## 🎯 Quick Start

### Development Environment
```bash
# 1. Setup development environment
npm run setup:dev

# 2. Start development servers
npm run dev
```

### Production Environment
```bash
# 1. Setup production environment
npm run setup:prod

# 2. Test production configuration
npm run test:prod

# 3. Start production servers
npm run prod
```

## 📁 Environment File Structure

```
server/
├── .env                    # Active environment file (auto-generated)
├── env.development.template # Development template
├── env.production.template  # Production template
└── setup-env.js           # Environment setup script
```

## 🔧 Environment Setup Commands

### From Root Directory
```bash
# Development setup
npm run setup:dev

# Production setup  
npm run setup:prod

# Interactive setup (defaults to development)
npm run setup
```

### From Server Directory
```bash
cd server

# Development setup
npm run setup:dev

# Production setup
npm run setup:prod

# Interactive setup
npm run setup
```

## 🚀 Running the Application

### Development Mode
```bash
# Run both client and server in development mode
npm run dev

# Run only server in development mode
npm run dev:server

# Run only client in development mode
npm run dev:client
```

### Production Mode
```bash
# Run both client and server in production mode
npm run prod

# Run only server in production mode
npm run prod:server

# Run only client in production mode (builds and serves)
npm run prod:client
```

## 🔐 Environment Variables

### Development Environment
- **NODE_ENV**: `development`
- **LOG_LEVEL**: `debug`
- **BCRYPT_ROUNDS**: `10` (faster for development)
- **RATE_LIMIT_MAX_REQUESTS**: `1000` (relaxed)
- **FRONTEND_ORIGIN**: `http://localhost:5173`
- **DEBUG**: `true`

### Production Environment
- **NODE_ENV**: `production`
- **LOG_LEVEL**: `info`
- **BCRYPT_ROUNDS**: `12` (secure)
- **RATE_LIMIT_MAX_REQUESTS**: `100` (strict)
- **FRONTEND_ORIGIN**: `https://your-domain.com` (must be HTTPS)
- **DEBUG**: `false`

## 🛡️ Security Configuration

### JWT Secrets
The setup script automatically generates cryptographically secure JWT secrets:
- **JWT_ACCESS_SECRET**: 64-character hex string
- **JWT_REFRESH_SECRET**: 64-character hex string (different from access secret)

### Production Security Checklist
- [ ] JWT secrets are different from development
- [ ] FRONTEND_ORIGIN uses HTTPS
- [ ] BCRYPT_ROUNDS is 12 or higher
- [ ] Rate limiting is enabled
- [ ] Debug mode is disabled

## 📋 Environment Templates

### Development Template (`env.development.template`)
```bash
NODE_ENV=development
JWT_ACCESS_SECRET=dev-access-secret-change-in-production-min-32-chars-long
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production-min-32-chars-long
FRONTEND_ORIGIN=http://localhost:5173
BCRYPT_ROUNDS=10
LOG_LEVEL=debug
DEBUG=true
```

### Production Template (`env.production.template`)
```bash
NODE_ENV=production
JWT_ACCESS_SECRET=CHANGE-THIS-TO-SECURE-PRODUCTION-SECRET-MIN-32-CHARS
JWT_REFRESH_SECRET=CHANGE-THIS-TO-DIFFERENT-SECURE-PRODUCTION-SECRET-MIN-32-CHARS
FRONTEND_ORIGIN=https://your-production-domain.com
BCRYPT_ROUNDS=12
LOG_LEVEL=info
DEBUG=false
```

## 🔄 Switching Between Environments

### From Development to Production
```bash
# 1. Setup production environment
npm run setup:prod

# 2. Update production-specific values in .env
# - Change FRONTEND_ORIGIN to your production domain
# - Update JWT_ISS and JWT_AUD if needed

# 3. Test production configuration
npm run test:prod

# 4. Start production servers
npm run prod
```

### From Production to Development
```bash
# 1. Setup development environment
npm run setup:dev

# 2. Start development servers
npm run dev
```

## 🧪 Testing Production Configuration

```bash
# Test that the server can start with production settings
npm run test:prod
```

This command:
- Generates test JWT secrets
- Sets NODE_ENV=production
- Validates all security requirements
- Starts the server briefly to verify configuration
- Reports success/failure with detailed feedback

## 📝 Manual Environment Setup

If you prefer to set up environments manually:

### 1. Copy Template
```bash
# For development
cp server/env.development.template server/.env

# For production
cp server/env.production.template server/.env
```

### 2. Generate JWT Secrets
```bash
# Generate secure secrets
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Update Configuration
Edit `server/.env` and update:
- JWT secrets (use generated values)
- FRONTEND_ORIGIN (your domain)
- Any other environment-specific values

## 🚨 Important Security Notes

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use different JWT secrets** for development and production
3. **Always use HTTPS** in production for FRONTEND_ORIGIN
4. **Keep secrets secure** - Store production secrets in a secure secret management system
5. **Test production config** before deploying

## 🔍 Troubleshooting

### Environment Validation Errors
If you see environment validation errors:
1. Check that all required variables are set
2. Verify JWT secrets are 32+ characters
3. Ensure FRONTEND_ORIGIN format is correct
4. Run `npm run test:prod` to validate configuration

### Port Conflicts
If you get port conflicts:
1. Check if another process is using port 3050
2. Update PORT in your `.env` file
3. Restart the server

### CORS Issues
If you see CORS errors:
1. Verify FRONTEND_ORIGIN matches your client URL exactly
2. Check that the protocol (http/https) is correct
3. Ensure no trailing slashes in the URL

## 📚 Additional Resources

- [Production Deployment Guide](documentation/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Security Configuration](documentation/CRITICAL_SECURITY_FIXES.md)
- [Environment Templates](documentation/PRODUCTION_ENV_TEMPLATE.md)
