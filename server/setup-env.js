#!/usr/bin/env node
/**
 * Environment Setup Helper
 * Generates secure JWT secrets and creates environment-specific .env files
 * 
 * Usage: 
 *   node setup-env.js                    # Interactive mode
 *   node setup-env.js dev                # Development environment
 *   node setup-env.js production         # Production environment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args[0] || 'interactive';

console.log('\n' + '='.repeat(80));
console.log('🔐 Secure Environment Setup for Financial App');
console.log('='.repeat(80) + '\n');

// Generate cryptographically secure secrets
const accessSecret = crypto.randomBytes(32).toString('hex');
const refreshSecret = crypto.randomBytes(32).toString('hex');

console.log('✨ Generated secure JWT secrets:\n');
console.log('JWT_ACCESS_SECRET=' + accessSecret);
console.log('JWT_REFRESH_SECRET=' + refreshSecret);
console.log('');

// Environment templates
const envTemplates = {
  development: `# Development Environment Configuration
# Generated on: ${new Date().toISOString()}

# Environment
NODE_ENV=development

# JWT Configuration (REQUIRED - SECURITY CRITICAL)
JWT_ACCESS_SECRET=${accessSecret}
JWT_REFRESH_SECRET=${refreshSecret}
JWT_ISS=financial-app-dev
JWT_AUD=financial-app-dev-users
TOKEN_TTL_MIN=15
REFRESH_TTL_DAYS=7
REFRESH_COOKIE_NAME=refresh_token

# Frontend Configuration (REQUIRED)
FRONTEND_ORIGIN=http://localhost:5173

# Security Configuration
BCRYPT_ROUNDS=10

# Rate Limiting (Relaxed for development)
RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=10

# File Upload Limits
MAX_FILE_SIZE_MB=5

# Logging
LOG_LEVEL=debug

# Feature Flags
FEATURE_STRICT_ACTUALS=false

# Server Configuration
PORT=3050

# Database Configuration
DATABASE_PATH=./database.sqlite

# Development-specific settings
DEBUG=true
CORS_CREDENTIALS=true`,

  production: `# Production Environment Configuration
# Generated on: ${new Date().toISOString()}

# Environment
NODE_ENV=production

# JWT Configuration (REQUIRED - SECURITY CRITICAL)
JWT_ACCESS_SECRET=${accessSecret}
JWT_REFRESH_SECRET=${refreshSecret}
JWT_ISS=financial-app
JWT_AUD=your-production-domain.com
TOKEN_TTL_MIN=15
REFRESH_TTL_DAYS=7
REFRESH_COOKIE_NAME=refresh_token

# Frontend Configuration (REQUIRED)
# Must use HTTPS in production
FRONTEND_ORIGIN=https://your-production-domain.com

# Security Configuration (Enhanced for production)
BCRYPT_ROUNDS=12

# Rate Limiting (Strict for production)
RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# File Upload Limits
MAX_FILE_SIZE_MB=5

# Logging
LOG_LEVEL=info

# Feature Flags
FEATURE_STRICT_ACTUALS=true

# Server Configuration
PORT=3050

# Database Configuration
DATABASE_PATH=./database.sqlite

# Production-specific settings
DEBUG=false
CORS_CREDENTIALS=true

# Performance Monitoring
SLOW_REQUEST_THRESHOLD_MS=1000`
};

// Handle environment selection
function selectEnvironment() {
  if (environment === 'interactive') {
    console.log('🎯 Environment Selection:');
    console.log('  1. Development (default)');
    console.log('  2. Production');
    console.log('');
    console.log('Usage: node setup-env.js [dev|production]');
    console.log('Example: node setup-env.js dev');
    console.log('');
    return 'development'; // Default to development
  }
  
  if (environment === 'dev' || environment === 'development') {
    return 'development';
  }
  
  if (environment === 'prod' || environment === 'production') {
    return 'production';
  }
  
  console.log(`❌ Unknown environment: ${environment}`);
  console.log('Valid options: dev, development, prod, production');
  process.exit(1);
}

const selectedEnv = selectEnvironment();
const envPath = path.join(__dirname, '.env');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  console.log('');
  console.log('Options:');
  console.log('1. Keep your existing .env file (recommended if already configured)');
  console.log('2. Backup and create new .env file\n');
  
  const backupPath = path.join(__dirname, `.env.backup.${Date.now()}`);
  console.log(`To create backup and new .env:`);
  console.log(`  mv .env "${backupPath}"`);
  console.log(`  node setup-env.js ${selectedEnv}`);
  console.log('');
} else {
  // Write .env file
  const template = envTemplates[selectedEnv];
  fs.writeFileSync(envPath, template);
  console.log(`✅ Created .env file for ${selectedEnv} environment at: ${envPath}`);
  console.log('');
  console.log('📝 Next Steps:');
  if (selectedEnv === 'development') {
    console.log('  1. Review and update FRONTEND_ORIGIN if needed');
    console.log('  2. Start the development server: npm run dev');
  } else {
    console.log('  1. Update FRONTEND_ORIGIN to your production domain (must use HTTPS)');
    console.log('  2. Update JWT_ISS and JWT_AUD for your application');
    console.log('  3. Start the production server: npm run start:prod');
  }
  console.log('');
}

// Validation tips
console.log('💡 Security Tips:');
console.log('  • Never commit .env file to Git (it\'s in .gitignore)');
console.log('  • Keep JWT secrets secret - never share or expose them');
console.log('  • Use different secrets for access and refresh tokens');
console.log('  • In production, always use HTTPS for FRONTEND_ORIGIN');
console.log('  • Store production secrets in secure secret management system');
console.log('');

// Check if running in production
if (process.env.NODE_ENV === 'production') {
  console.log('⚠️  WARNING: Running in production mode!');
  console.log('  Make sure you:');
  console.log('  • Are using HTTPS');
  console.log('  • Have updated all secrets');
  console.log('  • Have tested in staging first');
  console.log('');
}

console.log('='.repeat(80));
console.log('✨ Environment setup complete!');
console.log('='.repeat(80) + '\n');
