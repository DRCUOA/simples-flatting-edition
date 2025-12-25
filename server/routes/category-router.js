const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category-controller');
const { authenticateToken } = require('../middleware/auth');
const etag = require('../middleware/etag');

// All category routes require authentication
router.use(authenticateToken);

// Get all categories (with ETag support)
router.get('/', etag(), categoryController.getAllCategories);

// Get category by ID
router.get('/:id', categoryController.getCategoryById);

// Get categories by user ID
router.get('/user/:userId', categoryController.getCategoriesByUserId);

// Create a new category
router.post('/', categoryController.createCategory);

// Bulk update category display order (must be before /:id route)
router.put('/order', categoryController.updateCategoryOrder);

// Create multiple categories
router.post('/bulk', categoryController.bulkCreateCategories);

// Update a category
router.put('/:id', categoryController.updateCategory);

// Delete a category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router; 