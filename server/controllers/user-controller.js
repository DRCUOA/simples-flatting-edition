// server/controllers/user-controller.js

const userDAO = require('../models/user_dao');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Create a new user
exports.createUser = (req, res) => {
  const { username, email, password } = req.body;
  
  // Validate required fields
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  // Optional: Check if user already exists (by email or username)
  userDAO.getUserByEmail(email, (err, existingUserByEmail) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to validate email uniqueness' });
    }
    if (existingUserByEmail) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    userDAO.getUserByUsername(username, (err, existingUserByUsername) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to validate username uniqueness' });
      }
      if (existingUserByUsername) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      // If no duplicate, create the user
      userDAO.createUser({ username, email, password }, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }
        res.status(201).json({ 
          message: 'User created successfully',
          user_id: result.user_id
        });
      });
    });
  });
};

// Update user information (admin version with userId param)
exports.updateUser = (req, res) => {
  const { userId } = req.params;
  const { username, email, password } = req.body;

  // Validate required fields
  if (!username && !email && !password) {
    return res.status(400).json({ error: 'At least one field (username, email, password) is required' });
  }

  userDAO.updateUser(userId, { username, email, password }, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update user' });
    }
    res.json({ message: 'User updated successfully' });
  });
};

// Update current user profile (authenticated user)
exports.updateCurrentUser = (req, res) => {
  const userId = req.user.user_id; // Get from authenticated token
  const { username, email, password } = req.body;

  // Validate required fields
  if (!username && !email && !password) {
    return res.status(400).json({ error: 'At least one field (username, email, password) is required' });
  }

  userDAO.updateUser(userId, { username, email, password }, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    res.json({ message: 'Profile updated successfully' });
  });
};
// Delete user (optional)
exports.deleteUser = (req, res) => {
  const { userId } = req.params;

  userDAO.deleteUser(userId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    res.json({ message: 'User deleted successfully' });
  });
};
// Optional: Get all users (for admin purposes)
exports.getAllUsers = (req, res) => {
  userDAO.getAllUsers((err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(users);
  });
};
// Optional: Get user by ID (for admin purposes)
exports.getUserById = (req, res) => {
  const { userId } = req.params;

  userDAO.getUserById(userId, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
};

// Login user
exports.loginUser = (req, res) => {
  const { username, password } = req.body;

  // Validate required fields
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Get user by username
  userDAO.getUserByUsername(username, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication failed' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password with hash
    bcrypt.compare(password, user.password_hash, (err, isValid) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication failed' });
      }

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role || 'user' // Default role if not set
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Update last login
      userDAO.updateLastLogin(user.user_id, (updateErr) => {
        if (updateErr) {
          console.error('Failed to update last login:', updateErr);
        }
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role || 'user'
        }
      });
    });
  });
};

// Logout user (client-side token removal)
exports.logoutUser = (req, res) => {
  // For stateless JWT, logout is handled client-side by removing the token
  // In a production environment, you might want to implement token blacklisting
  res.json({ message: 'Logout successful' });
};

// Get current user profile
exports.getCurrentUser = (req, res) => {
  userDAO.getUserById(req.user.user_id, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
};
