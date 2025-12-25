// server/routes/user-router.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user-controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  sanitizeInput,
  validateUserCreation,
  validateUserLogin,
  validateUserUpdate,
  validateUUID
} = require('../middleware/validation');
const { authLimiter } = require('../middleware/security');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Public routes (no authentication required)
router.post('/', validateUserCreation, userController.createUser);
router.post('/login', authLimiter, validateUserLogin, userController.loginUser);
router.post('/logout', userController.logoutUser);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, userController.getCurrentUser);
router.put('/profile', authenticateToken, validateUserUpdate, userController.updateCurrentUser);

// Admin-only routes (authentication + admin role required)
// Get all users
router.get('/', authenticateToken, authorizeRoles('admin'), userController.getAllUsers);

// Get a single user by userId (admin only)
router.get('/:userId', authenticateToken, authorizeRoles('admin'), validateUUID, userController.getUserById);

// Update user by userId (admin only)
router.put('/:userId', authenticateToken, authorizeRoles('admin'), validateUUID, validateUserUpdate, userController.updateUser);

// Delete user by userId (admin only)
router.delete('/:userId', authenticateToken, authorizeRoles('admin'), validateUUID, userController.deleteUser);

module.exports = router;
