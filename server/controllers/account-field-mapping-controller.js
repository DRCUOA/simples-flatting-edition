const accountFieldMappingDAO = require('../models/account_field_mapping_dao');
const { validateAuthentication, validateArray } = require('../utils/validators');
const { createErrorResponse, createSuccessResponse } = require('../utils/transformers');

// Get all mappings for an account
exports.getMappingsByAccountId = (req, res) => {
  const { accountId } = req.params;
  
  accountFieldMappingDAO.getMappingsByAccountId(accountId, (err, mappings) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch account field mappings' });
    }
    res.json(mappings);
  });
};

// Get a specific mapping by ID
exports.getMappingById = (req, res) => {
  const { id } = req.params;
  
  accountFieldMappingDAO.getMappingById(id, (err, mapping) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch account field mapping' });
    }
    if (!mapping) {
      return res.status(404).json({ error: 'Account field mapping not found' });
    }
    res.json(mapping);
  });
};

// Create a new mapping
exports.createMapping = (req, res) => {
  const mapping = req.body;
  
  // Validate required fields
  if (!mapping.account_id || !mapping.field_name || !mapping.csv_header) {
    return res.status(400).json({ error: 'Account ID, field name, and CSV header are required' });
  }
  
  accountFieldMappingDAO.createMapping(mapping, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to create account field mapping' });
    }
    res.status(201).json({ 
      message: 'Account field mapping created successfully',
      mapping_id: result.mapping_id
    });
  });
};

// Update an existing mapping
exports.updateMapping = (req, res) => {
  const { id } = req.params;
  const mapping = req.body;
  
  // Validate required fields
  if (!mapping.csv_header) {
    return res.status(400).json({ error: 'CSV header is required' });
  }
  
  accountFieldMappingDAO.updateMapping(id, mapping, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update account field mapping' });
    }
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Account field mapping not found' });
    }
    res.json({ message: 'Account field mapping updated successfully' });
  });
};

// Delete a mapping
exports.deleteMapping = (req, res) => {
  const { id } = req.params;
  
  accountFieldMappingDAO.deleteMapping(id, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete account field mapping' });
    }
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Account field mapping not found' });
    }
    res.json({ message: 'Account field mapping deleted successfully' });
  });
};

// Delete all mappings for an account
exports.deleteMappingsByAccountId = (req, res) => {
  const { accountId } = req.params;
  
  accountFieldMappingDAO.deleteMappingsByAccountId(accountId, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete account field mappings' });
    }
    res.json({ message: 'Account field mappings deleted successfully' });
  });
};

// Save multiple mappings for an account
exports.saveMappings = (req, res) => {
  const { accountId } = req.params;
  const mappings = req.body;
  
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;
  
  // Validate required fields
  const arrayValidation = validateArray(mappings, 'mappings');
  if (!arrayValidation.isValid) {
    return res.status(400).json(arrayValidation.error);
  }
  
  // Validate each mapping
  for (const mapping of mappings) {
    if (!mapping.field_name || !mapping.csv_header) {
      return res.status(400).json({ error: 'Each mapping must have a field_name and csv_header' });
    }
  }
  
  accountFieldMappingDAO.saveMappings(accountId, mappings, userId, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save account field mappings' });
    }
    res.json({ message: 'Account field mappings saved successfully' });
  });
}; 