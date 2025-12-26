/**
 * Environment Configuration Module
 * 
 * This module handles environment variable loading and validation
 * with clear separation between development and production settings.
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Environment validation configuration
const REQUIRED_ENV_VARS = {
  JWT_ACCESS_SECRET: { 
    minLength: 32, 
    description: 'JWT access token secret (min 32 chars)' 
  },
  JWT_REFRESH_SECRET: { 
    minLength: 32, 
    description: 'JWT refresh token secret (min 32 chars)' 
  },
  FRONTEND_ORIGIN: { 
    pattern: /^https?:\/\/.+/,
    description: 'Frontend origin URL (e.g., http://localhost:5173 or https://app.example.com)' 
  }
};

const PRODUCTION_REQUIRED_ENV_VARS = {
  BCRYPT_ROUNDS: { 
    min: 12, 
    max: 15, 
    description: 'Bcrypt hashing rounds (12-15 recommended)' 
  }
};

const RECOMMENDED_ENV_VARS = {
  JWT_ISS: { description: 'JWT issuer (application identifier)' },
  JWT_AUD: { description: 'JWT audience (token recipients)' },
  TOKEN_TTL_MIN: { description: 'Access token TTL in minutes' },
  REFRESH_TTL_DAYS: { description: 'Refresh token TTL in days' },
  BCRYPT_ROUNDS: { 
    min: 10, 
    max: 15,
    description: 'Bcrypt hashing rounds (10-15, recommended: 12+)' 
  }
};

/**
 * Validates environment variables
 * @returns {Object} Validation result with errors and warnings
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Check required environment variables
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];
    
    if (!value) {
      errors.push(`❌ ${key} is required - ${config.description}`);
      continue;
    }
    
    if (config.minLength && value.length < config.minLength) {
      errors.push(`❌ ${key} must be at least ${config.minLength} characters`);
    }
    
    if (config.pattern && !config.pattern.test(value)) {
      errors.push(`❌ ${key} format is invalid - ${config.description}`);
    }
  }

  // Production-specific validation
  if (isProduction) {
    for (const [key, config] of Object.entries(PRODUCTION_REQUIRED_ENV_VARS)) {
      const value = process.env[key];
      
      if (value) {
        const numValue = parseInt(value, 10);
        if (config.min && numValue < config.min) {
          errors.push(`❌ ${key} must be at least ${config.min} in production`);
        }
        if (config.max && numValue > config.max) {
          errors.push(`❌ ${key} must not exceed ${config.max}`);
        }
      } else if (config.min) {
        warnings.push(`⚠️  ${key} not set - ${config.description}`);
      }
    }

    // Validate HTTPS in production
    const frontendOrigin = process.env.FRONTEND_ORIGIN || '';
    if (frontendOrigin && !frontendOrigin.startsWith('https://')) {
      warnings.push(`⚠️  FRONTEND_ORIGIN should use HTTPS in production (current: ${frontendOrigin})`);
    }

    // Validate JWT secrets are different
    if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
      errors.push(`❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values`);
    }

    // Check for default/weak secrets
    const defaultSecretPattern = /secret|password|changeme|default|example/i;
    if (defaultSecretPattern.test(process.env.JWT_ACCESS_SECRET || '')) {
      errors.push(`❌ JWT_ACCESS_SECRET appears to be a default/weak value - generate a secure secret`);
    }
    if (defaultSecretPattern.test(process.env.JWT_REFRESH_SECRET || '')) {
      errors.push(`❌ JWT_REFRESH_SECRET appears to be a default/weak value - generate a secure secret`);
    }
  }

  // Check recommended variables
  for (const [key, config] of Object.entries(RECOMMENDED_ENV_VARS)) {
    const value = process.env[key];
    
    if (!value) {
      warnings.push(`⚠️  ${key} not set - ${config.description}`);
    } else if (config.min || config.max) {
      const numValue = parseInt(value, 10);
      if (config.min && numValue < config.min) {
        warnings.push(`⚠️  ${key} is below recommended minimum (${config.min})`);
      }
      if (config.max && numValue > config.max) {
        warnings.push(`⚠️  ${key} exceeds recommended maximum (${config.max})`);
      }
    }
  }

  // Display results if there are errors (fatal)
  if (errors.length > 0) {
    console.error('\n' + '='.repeat(80));
    console.error('🚨 ENVIRONMENT VALIDATION FAILED - Cannot start server');
    console.error('='.repeat(80));
    console.error('\nCritical Issues:\n');
    errors.forEach(err => console.error(`  ${err}`));
    
    console.error('\n' + '-'.repeat(80));
    console.error('💡 Quick Fix - Generate secure secrets:\n');
    console.error('  node -e "console.log(\'JWT_ACCESS_SECRET=\' + require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('  node -e "console.log(\'JWT_REFRESH_SECRET=\' + require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('\n  Add these to your .env file in the server directory');
    console.error('='.repeat(80) + '\n');
  }

  // Display warnings (non-fatal) in production
  if (warnings.length > 0 && isProduction) {
    console.warn('\n' + '='.repeat(80));
    console.warn('⚠️  ENVIRONMENT WARNINGS (Production)');
    console.warn('='.repeat(80));
    warnings.forEach(warn => console.warn(`  ${warn}`));
    console.warn('='.repeat(80) + '\n');
  }

  // Success message (only in development or if no warnings in production)
  if (errors.length === 0) {
    if (!isProduction) {
      console.log('✓ Environment validation passed');
      console.log('  Environment: Development');
    } else if (warnings.length === 0) {
      console.log('✓ Environment validation passed');
      console.log('  Environment: Production (enhanced security checks enabled)');
    }
  }

  return { errors, warnings, isProduction };
}

/**
 * Gets the current environment configuration
 * @returns {Object} Environment configuration object
 */
function getEnvironmentConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // Environment
    NODE_ENV: process.env.NODE_ENV || 'development',
    isProduction,
    isDevelopment: !isProduction,
    
    // JWT Configuration
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      issuer: process.env.JWT_ISS || 'financial-app',
      audience: process.env.JWT_AUD || 'financial-app-users',
      tokenTTL: parseInt(process.env.TOKEN_TTL_MIN || '15', 10),
      refreshTTL: parseInt(process.env.REFRESH_TTL_DAYS || '7', 10),
      refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'refresh_token'
    },
    
    // Security Configuration
    security: {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || (isProduction ? '12' : '10'), 10),
      corsOrigin: process.env.FRONTEND_ORIGIN,
      corsCredentials: process.env.CORS_CREDENTIALS === 'true'
    },
    
    // Rate Limiting
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MIN || '15', 10) * 60 * 1000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (isProduction ? '100' : '1000'), 10),
      authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || (isProduction ? '5' : '10'), 10)
    },
    
    // Server Configuration
    server: {
      port: parseInt(process.env.PORT || '3050', 10),
      host: process.env.HOST || 'localhost'
    },
    
    // Database Configuration
    database: {
      path: process.env.DATABASE_PATH || './database.sqlite'
    },
    
    // Logging Configuration
    logging: {
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '1000', 10)
    },
    
    // Feature Flags
    features: {
      strictActuals: process.env.FEATURE_STRICT_ACTUALS === 'true',
      debug: process.env.DEBUG === 'true'
    },
    
    // File Upload Configuration
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10) * 1024 * 1024 // Convert to bytes
    }
  };
}

/**
 * Checks if .env file exists and provides helpful setup instructions
 */
function checkEnvironmentSetup() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  Environment Configuration Missing');
    console.log('='.repeat(80));
    console.log('');
    console.log('No .env file found. Please set up your environment:');
    console.log('');
    console.log('For Development:');
    console.log('  npm run setup:dev');
    console.log('');
    console.log('For Production:');
    console.log('  npm run setup:prod');
    console.log('');
    console.log('Or run the setup script manually:');
    console.log('  cd server && node setup-env.js');
    console.log('');
    console.log('='.repeat(80) + '\n');
    return false;
  }
  
  return true;
}

module.exports = {
  validateEnvironment,
  getEnvironmentConfig,
  checkEnvironmentSetup,
  REQUIRED_ENV_VARS,
  PRODUCTION_REQUIRED_ENV_VARS,
  RECOMMENDED_ENV_VARS
};
