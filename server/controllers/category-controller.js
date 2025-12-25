const categoryDAO = require('../models/category_dao');
const db = require('../db');
const { validateAuthentication, validateRequiredFields, validateArray, validateUserAccess } = require('../utils/validators');
const { createErrorResponse, createSuccessResponse } = require('../utils/transformers');

// Get all categories for authenticated user
exports.getAllCategories = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;
  
  categoryDAO.getAllCategories(userId, (err, categories) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
    return res.json(categories);
  });
};

// Get category by ID (user-scoped)
exports.getCategoryById = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  categoryDAO.getCategoryById(id, userId, (err, category) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch category' });
    }
    if (!category) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }
    res.json(category);
  });
};

// Create multiple categories
exports.bulkCreateCategories = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    // Validate array
    const arrayValidation = validateArray(req.body, 'categories');
    if (!arrayValidation.isValid) {
      return res.status(400).json(arrayValidation.error);
    }

    const categories = req.body;
    const userId = req.user.user_id;
    
    // Basic validation and set user_id
    for (const category of categories) {
      if (!category.category_name) {
        return res.status(400).json({ error: 'Each category must have category_name' });
      }
      category.user_id = userId; // Ensure user_id is set to authenticated user
    }

    // Insert all categories
    const result = await new Promise((resolve, reject) => {
      categoryDAO.bulkCreateCategories(categories, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    return res.status(201).json({
      message: `${result.successCount} categories created successfully`,
      created: result.createdCategories
    });
  } catch (error) {
    const errorResponse = createErrorResponse('Internal Server Error');
    return res.status(errorResponse.statusCode).json(errorResponse.error);
  }
};

// Get categories by user ID (admin only or self)
exports.getCategoriesByUserId = (req, res) => {
  const { userId } = req.params;
  const requestingUserId = req.user?.user_id;
  const userRole = req.user?.role;
  
  if (!requestingUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Only allow users to access their own categories, or admins to access any categories
  if (requestingUserId !== userId && userRole !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Cannot access other user categories' });
  }
  
  categoryDAO.getCategoriesByUserId(userId, (err, categories) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
    res.json(categories);
  });
};

// Create a new category
exports.createCategory = (req, res) => {
  const category = req.body;
  const userId = req.user?.user_id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Validate required fields
  if (!category.category_name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  // Ensure user_id is set to authenticated user
  category.user_id = userId;
  
  categoryDAO.createCategory(category, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to create category' });
    }
    res.status(201).json({ 
      message: 'Category created successfully',
      category_id: result.category_id
    });
  });
};

// Update a category (user-scoped)
exports.updateCategory = (req, res) => {
  const { id } = req.params;
  const category = req.body;
  const userId = req.user?.user_id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Validate required fields
  if (!category.category_name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  categoryDAO.updateCategory(id, category, userId, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update category' });
    }
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }
    res.json({ message: 'Category updated successfully' });
  });
};

// Delete a category (user-scoped)
exports.deleteCategory = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.user_id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  categoryDAO.deleteCategory(id, userId, (err, result) => {
    if (err) {
      // Handle specific error cases
      if (err.message.includes('Cannot delete category that is used by transactions')) {
        return res.status(400).json({ error: 'Cannot delete category that is used by transactions' });
      }
      if (err.message.includes('Cannot delete category that has child categories')) {
        return res.status(400).json({ error: 'Cannot delete category that has child categories' });
      }
      
      return res.status(500).json({ error: 'Failed to delete category' });
    }
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found or access denied' });
    }
    res.json({ message: 'Category deleted successfully' });
  });
};

// Bulk update category display order
exports.updateCategoryOrder = (req, res) => {
  const userId = req.user?.user_id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const categoryOrders = req.body;
  
  if (!Array.isArray(categoryOrders)) {
    console.error('[updateCategoryOrder] Invalid request body:', typeof categoryOrders, categoryOrders);
    return res.status(400).json({ error: 'Category orders must be an array' });
  }

  if (categoryOrders.length === 0) {
    return res.status(400).json({ error: 'Category orders array cannot be empty' });
  }

  // Validate each order entry
  for (let i = 0; i < categoryOrders.length; i++) {
    const order = categoryOrders[i];
    if (!order) {
      console.error(`[updateCategoryOrder] Invalid order at index ${i}:`, order);
      return res.status(400).json({ error: `Order entry at index ${i} is invalid` });
    }
    if (!order.category_id) {
      console.error(`[updateCategoryOrder] Missing category_id at index ${i}:`, order);
      return res.status(400).json({ error: `Order entry at index ${i} must have category_id` });
    }
    if (typeof order.display_order !== 'number' || isNaN(order.display_order)) {
      console.error(`[updateCategoryOrder] Invalid display_order at index ${i}:`, order, typeof order.display_order);
      return res.status(400).json({ error: `Order entry at index ${i} must have a valid numeric display_order` });
    }
  }

  categoryDAO.updateCategoryOrder(userId, categoryOrders, (err, result) => {
    if (err) {
      console.error('[updateCategoryOrder] DAO error:', err);
      return res.status(500).json({ error: 'Failed to update category order' });
    }
    res.json({ 
      message: 'Category order updated successfully',
      updatedCount: result.updatedCount
    });
  });
};