// server/models/user_dao.js

const { getConnection } = require('../db/index');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const db = getConnection();

// SECURITY: Use environment variable for bcrypt rounds (OWASP 2025 recommendation: 12+)
// Higher rounds = more secure but slower hashing. Balance security with performance.
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// User DAO with CRUD operations
const userDAO = {
  // Create a new user
  createUser: (user, callback) => {
    const userId = user.user_id || uuidv4();

    bcrypt.hash(user.password, BCRYPT_ROUNDS, (err, passwordHash) => {
      if (err) {
        callback(err);
        return;
      }

      const sql = `
        INSERT INTO Users (user_id, username, email, password_hash)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(sql, [
        userId,
        user.username,
        user.email,
        passwordHash
      ], function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null, { user_id: userId });
        }
      });
    });
  },

  // Get user by email (for checking duplicates or login)
  getUserByEmail: (email, callback) => {
    const sql = 'SELECT * FROM Users WHERE email = ?';
    db.get(sql, [email], (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row);
      }
    });
  },

  // Get user by username (optional, for checking duplicates)
  getUserByUsername: (username, callback) => {
    const sql = 'SELECT * FROM Users WHERE username = ?';
    db.get(sql, [username], (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row);
      }
    });
  },

  // Delete a user by user_id
  deleteUser: (userId, callback) => {
    const sql = 'DELETE FROM Users WHERE user_id = ?';
    db.run(sql, [userId], function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { deleted: this.changes > 0 });
      }
    });
  },

  // Update last login timestamp
  updateLastLogin: (userId, callback) => {
    const sql = 'UPDATE Users SET last_login = datetime("now") WHERE user_id = ?';
    db.run(sql, [userId], function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { updated: this.changes > 0 });
      }
    });
  },

  // Get user by ID (without password hash for security)
  getUserById: (userId, callback) => {
    const sql = 'SELECT user_id, username, email, created_at, last_login FROM Users WHERE user_id = ?';
    db.get(sql, [userId], (err, row) => {
      if (err) {
        callback(err);
      } else {
        callback(null, row);
      }
    });
  },

  // Update user information (with password hashing)
  updateUser: (userId, userData, callback) => {
    const { username, email, password } = userData;

    // If password is being updated, hash it first
    if (password) {
      bcrypt.hash(password, BCRYPT_ROUNDS, (err, passwordHash) => {
        if (err) {
          callback(err);
          return;
        }

        const sql = `
          UPDATE Users
          SET username = ?, email = ?, password_hash = ?
          WHERE user_id = ?
        `;

        db.run(sql, [username, email, passwordHash, userId], function (err) {
          if (err) {
            callback(err);
          } else {
            callback(null, { updated: this.changes > 0 });
          }
        });
      });
    } else {
      // Update without password
      const sql = `
        UPDATE Users
        SET username = ?, email = ?
        WHERE user_id = ?
      `;

      db.run(sql, [username, email, userId], function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null, { updated: this.changes > 0 });
        }
      });
    }
  },

  // Get all users (for admin purposes, without password hashes)
  getAllUsers: (callback) => {
    const sql = 'SELECT user_id, username, email, created_at, last_login FROM Users';
    db.all(sql, [], (err, rows) => {
      if (err) {
        callback(err);
      } else {
        callback(null, rows);
      }
    });
  }
};

module.exports = userDAO;
