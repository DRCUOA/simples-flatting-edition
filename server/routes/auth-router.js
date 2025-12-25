// server/routes/auth-router.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const userDAO = require('../models/user_dao');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  requireUser,
  REFRESH_COOKIE_NAME
} = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const { securityLogger } = require('../middleware/logging');
const {
  sanitizeInput,
  validateUserLogin
} = require('../middleware/validation');

/**
 * POST /auth/login
 * Authenticate user and return access token + refresh token
 */
router.post('/login', 
  authLimiter,
  sanitizeInput,
  validateUserLogin,
  async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const loginField = username || email; // Support both username and email

      if (!loginField || !password) {
        return res.status(400).json({
          error: 'Username/email and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // Determine if login field is email or username and get user accordingly
      const isEmail = loginField.includes('@');
      const getUserMethod = isEmail ? userDAO.getUserByEmail : userDAO.getUserByUsername;

      getUserMethod(loginField, async (err, user) => {
        if (err) {
          securityLogger('LOGIN_ERROR', { loginField: isEmail ? loginField : '[username]', error: err.message }, req);
          return res.status(500).json({
            error: 'Internal server error',
            code: 'LOGIN_ERROR'
          });
        }

        if (!user) {
          securityLogger('LOGIN_ATTEMPT_INVALID_CREDENTIALS', { 
            loginField: isEmail ? loginField : '[username]',
            isEmail 
          }, req);
          return res.status(401).json({
            error: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS'
          });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
          securityLogger('LOGIN_ATTEMPT_INVALID_PASSWORD', { 
            email, 
            userId: user.user_id 
          }, req);
          return res.status(401).json({
            error: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS'
          });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Set HTTP-only refresh token cookie with enhanced security
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/'
          // Note: __Host- prefix requires secure=true, path='/', and no domain attribute
          // This is automatically enforced by the browser for __Host- cookies
        };

        // Use __Host- prefix in production for maximum cookie security
        const cookieName = isProduction ? '__Host-refresh_token' : REFRESH_COOKIE_NAME;
        res.cookie(cookieName, refreshToken, cookieOptions);

        // Update last login
        userDAO.updateLastLogin(user.user_id, (updateErr) => {
          if (updateErr) {
            console.error('Failed to update last login:', updateErr);
          }
        });

        securityLogger('LOGIN_SUCCESS', { 
          userId: user.user_id,
          username: user.username,
          email: user.email
        }, req);

        res.json({
          success: true,
          accessToken,
          user: {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role || 'user'
          }
        });
      });
    } catch (error) {
      securityLogger('LOGIN_EXCEPTION', { error: error.message }, req);
      res.status(500).json({
        error: 'Internal server error',
        code: 'LOGIN_EXCEPTION'
      });
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token from cookie
 */
router.post('/refresh', (req, res) => {
  try {
    // Support both production (__Host-) and development cookie names
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction ? '__Host-refresh_token' : REFRESH_COOKIE_NAME;
    const refreshToken = req.cookies[cookieName] || req.cookies[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      securityLogger('REFRESH_TOKEN_INVALID', { 
        error: error.message,
        tokenPresent: !!refreshToken
      }, req);
      
      // Clear invalid refresh token (both possible cookie names)
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieName = isProduction ? '__Host-refresh_token' : REFRESH_COOKIE_NAME;
      res.clearCookie(cookieName, { path: '/', httpOnly: true, secure: isProduction, sameSite: 'strict' });
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/', httpOnly: true, secure: isProduction, sameSite: 'strict' });
      
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    // Get current user data
    userDAO.getUserById(decoded.sub, (err, user) => {
      if (err || !user) {
        securityLogger('REFRESH_USER_NOT_FOUND', { 
          userId: decoded.sub 
        }, req);
        
        // Clear refresh token cookie (both possible cookie names)
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieName = isProduction ? '__Host-refresh_token' : REFRESH_COOKIE_NAME;
        res.clearCookie(cookieName, { path: '/', httpOnly: true, secure: isProduction, sameSite: 'strict' });
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/', httpOnly: true, secure: isProduction, sameSite: 'strict' });
        return res.status(401).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken({
        user_id: user.user_id,
        role: user.role || 'user'
      });

      // SECURITY: Generate new refresh token (token rotation)
      // This prevents stolen refresh tokens from being valid indefinitely
      const newRefreshToken = generateRefreshToken({
        user_id: user.user_id,
        role: user.role || 'user'
      });

      // Update refresh token cookie with new token (with __Host- prefix for production)
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      };
      const cookieName = isProduction ? '__Host-refresh_token' : REFRESH_COOKIE_NAME;
      res.cookie(cookieName, newRefreshToken, cookieOptions);

      securityLogger('TOKEN_REFRESHED_WITH_ROTATION', { 
        userId: user.user_id 
      }, req);

      res.json({
        success: true,
        accessToken: newAccessToken,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role || 'user'
        }
      });
    });
  } catch (error) {
    securityLogger('REFRESH_EXCEPTION', { error: error.message }, req);
    res.status(500).json({
      error: 'Internal server error',
      code: 'REFRESH_EXCEPTION'
    });
  }
});

/**
 * POST /auth/logout
 * Clear refresh token cookie
 */
router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieName = isProduction ? '__Host-refresh_token' : REFRESH_COOKIE_NAME;
  const refreshToken = req.cookies[cookieName] || req.cookies[REFRESH_COOKIE_NAME];
  
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      securityLogger('LOGOUT_SUCCESS', { 
        userId: decoded.sub 
      }, req);
    } catch (error) {
      // Token was invalid anyway, just log the logout attempt
      securityLogger('LOGOUT_WITH_INVALID_TOKEN', {}, req);
    }
  }

  // Clear refresh token cookie (both possible cookie names for compatibility)
  const clearOptions = { 
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict'
  };
  res.clearCookie(cookieName, clearOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, clearOptions);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /auth/me
 * Get current user information (requires valid access token)
 */
router.get('/me', requireUser, (req, res) => {
  userDAO.getUserById(req.user.user_id, (err, user) => {
    if (err || !user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        created_at: user.created_at,
        last_login: user.last_login
      }
    });
  });
});

module.exports = router;
