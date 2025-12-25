# DRY and Functional Programming Patterns

**Version:** 2.0.0  
**Date:** October 16, 2025  
**Status:** Guidelines Established ✅

## Overview

This document outlines the DRY (Don't Repeat Yourself) and Functional Programming principles applied to Simples v2.0. The goal is to keep the codebase simple, maintainable, and easy to understand by enforcing single-purpose functions and clear separation of concerns.

## Core Principles

### 1. Don't Repeat Yourself (DRY)

**Definition:** Every piece of knowledge or logic should have a single, unambiguous representation in the system.

**Benefits:**
- Change logic once, affects entire system
- Reduces bugs from inconsistent implementations
- Easier to maintain and understand
- Smaller codebase

### 2. Functional Programming

**Definition:** Write pure, composable functions with single responsibilities and no side effects where possible.

**Benefits:**
- Predictable behavior
- Easy to test
- Clear data flow
- Composable and reusable

### 3. Single Responsibility

**Definition:** Each function should do ONE thing and do it well.

**Benefits:**
- Easy to name
- Easy to test
- Easy to reuse
- Clear purpose

## Backend Architecture

### Layer Separation

```
┌─────────────────────────────────────┐
│         HTTP Layer (Routes)          │  ← Routing only
├─────────────────────────────────────┤
│      Controller Layer (5-15 lines)   │  ← HTTP concerns
├─────────────────────────────────────┤
│   Service Layer (Business Logic)     │  ← Orchestration
├─────────────────────────────────────┤
│     DAO Layer (Data Access)          │  ← Database queries
├─────────────────────────────────────┤
│    Utility Layer (Pure Functions)    │  ← Transformations
└─────────────────────────────────────┘
```

### Controller Pattern

**Purpose:** Handle HTTP concerns ONLY (request/response)

**Maximum Length:** 5-15 lines

**Responsibilities:**
- Extract data from request
- Call service/DAO methods
- Return response
- Handle authentication check (if needed)

**❌ WRONG: Fat Controller**
```javascript
exports.createTransaction = async (req, res) => {
  try {
    const data = req.body;
    
    // ❌ Validation in controller
    if (!data.amount) {
      return res.status(400).json({ error: 'Missing amount' });
    }
    if (!data.account_id) {
      return res.status(400).json({ error: 'Missing account' });
    }
    if (parseFloat(data.amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // ❌ Business logic in controller
    const account = await accountDAO.getById(data.account_id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // ❌ Data manipulation in controller
    const signedAmount = data.transaction_type === 'expense' 
      ? -Math.abs(parseFloat(data.amount))
      : Math.abs(parseFloat(data.amount));
    
    // ❌ Direct database access in controller
    const transaction = await db.run(
      'INSERT INTO Transactions (amount, signed_amount, account_id, ...) VALUES (?, ?, ?, ...)',
      [data.amount, signedAmount, data.account_id, ...]
    );
    
    // ❌ More business logic
    account.current_balance = parseFloat(account.current_balance) + signedAmount;
    await db.run('UPDATE Accounts SET current_balance = ? WHERE account_id = ?', 
      [account.current_balance, account.account_id]);
    
    res.json({ transaction, account });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**✅ CORRECT: Thin Controller**
```javascript
exports.createTransaction = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const transactionData = req.body;
    const transaction = await transactionService.create(transactionData, userId);
    res.json(transaction);
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      error: error.message || 'Failed to create transaction' 
    });
  }
};
```

### Service Pattern

**Purpose:** Orchestrate business logic, coordinate between DAOs

**Responsibilities:**
- Validate input
- Coordinate multiple DAO calls
- Apply business rules
- Transform data
- Handle transactions (database)

**✅ CORRECT: Service Layer**
```javascript
// services/transaction-service.js
const transactionDAO = require('../models/transaction_dao');
const accountDAO = require('../models/account_dao');
const { validateTransaction } = require('../utils/validators');
const { calculateSignedAmount } = require('../utils/calculateSignedAmount');

exports.create = async (transactionData, userId) => {
  // 1. Validate
  const validation = validateTransaction(transactionData);
  if (!validation.valid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }
  
  // 2. Check account exists and belongs to user
  const account = await accountDAO.getById(transactionData.account_id, userId);
  if (!account) {
    const error = new Error('Account not found');
    error.statusCode = 404;
    throw error;
  }
  
  // 3. Calculate signed amount
  const signedAmount = calculateSignedAmount(
    transactionData.amount,
    transactionData.transaction_type
  );
  
  // 4. Create transaction
  const transaction = await transactionDAO.create({
    ...transactionData,
    signed_amount: signedAmount,
    user_id: userId
  });
  
  return transaction;
};
```

### DAO Pattern

**Purpose:** Database access ONLY

**Responsibilities:**
- Execute SQL queries
- Return raw data
- No business logic
- No validation
- No transformations

**✅ CORRECT: DAO Layer**
```javascript
// models/transaction_dao.js
const { getConnection } = require('../db');

exports.create = async (transactionData) => {
  const db = getConnection();
  const result = await db.run(
    `INSERT INTO Transactions (
      amount, signed_amount, transaction_date, description,
      account_id, category_id, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      transactionData.amount,
      transactionData.signed_amount,
      transactionData.transaction_date,
      transactionData.description,
      transactionData.account_id,
      transactionData.category_id,
      transactionData.user_id
    ]
  );
  
  return exports.getById(result.lastID);
};

exports.getById = async (transactionId) => {
  const db = getConnection();
  return db.get(
    'SELECT * FROM Transactions WHERE transaction_id = ?',
    [transactionId]
  );
};
```

### Utility Pattern

**Purpose:** Pure, reusable transformations

**Characteristics:**
- Pure functions (no side effects)
- Single purpose
- Easy to test
- Composable

**✅ CORRECT: Utility Functions**
```javascript
// utils/validators.js

/**
 * Validate required fields
 * @param {string[]} fields - Required field names
 * @param {object} data - Data object to validate
 * @returns {boolean}
 */
exports.validateRequired = (fields, data) => {
  return fields.every(field => data[field] !== undefined && data[field] !== null);
};

/**
 * Validate transaction data
 * @param {object} transaction - Transaction data
 * @returns {{ valid: boolean, error?: string }}
 */
exports.validateTransaction = (transaction) => {
  if (!transaction.amount || parseFloat(transaction.amount) <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }
  
  if (!transaction.account_id) {
    return { valid: false, error: 'Missing account_id' };
  }
  
  if (!transaction.transaction_date) {
    return { valid: false, error: 'Missing transaction_date' };
  }
  
  return { valid: true };
};

// utils/transformers.js

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
exports.formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse amount to float
 * @param {any} amount
 * @returns {number}
 */
exports.parseAmount = (amount) => {
  return parseFloat(amount) || 0;
};

/**
 * Group array by key
 * @param {Array} arr - Array to group
 * @param {string} key - Key to group by
 * @returns {object}
 */
exports.groupBy = (arr, key) => {
  return arr.reduce((acc, item) => {
    const groupKey = item[key];
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {});
};

// utils/calculateSignedAmount.js

/**
 * Calculate signed amount based on transaction type
 * @param {number|string} amount - Transaction amount
 * @param {string} transactionType - 'income' or 'expense'
 * @returns {number}
 */
module.exports = function calculateSignedAmount(amount, transactionType) {
  const absAmount = Math.abs(parseFloat(amount) || 0);
  return transactionType === 'expense' ? -absAmount : absAmount;
};
```

## Common Patterns

### Pattern 1: Validation Extraction

**❌ BEFORE: Duplicate Validation**
```javascript
// In transaction-controller.js
if (!data.amount || parseFloat(data.amount) <= 0) {
  return res.status(400).json({ error: 'Invalid amount' });
}

// In account-controller.js
if (!data.amount || parseFloat(data.amount) <= 0) {
  return res.status(400).json({ error: 'Invalid amount' });
}
```

**✅ AFTER: Shared Validation**
```javascript
// utils/validators.js
exports.isValidAmount = (amount) => {
  return amount && parseFloat(amount) > 0;
};

// In controllers
const { isValidAmount } = require('../utils/validators');
if (!isValidAmount(data.amount)) {
  return res.status(400).json({ error: 'Invalid amount' });
}
```

### Pattern 2: Date Formatting

**❌ BEFORE: Duplicate Date Logic**
```javascript
// In multiple files
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

**✅ AFTER: Shared Utility**
```javascript
// utils/date.js
exports.formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// In files that need it
const { formatDate } = require('../utils/date');
```

### Pattern 3: Error Handling

**❌ BEFORE: Inconsistent Errors**
```javascript
// Different error formats
res.status(400).json({ error: 'Bad request' });
res.status(400).json({ message: 'Invalid data' });
res.status(400).send('Error occurred');
```

**✅ AFTER: Consistent Errors**
```javascript
// middleware/errorHandler.js
exports.errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  console.error(`[Error] ${statusCode}: ${message}`, {
    path: req.path,
    method: req.method,
    userId: req.user?.user_id,
    error: err
  });
  
  res.status(statusCode).json({ error: message });
};

// In controllers - throw errors consistently
if (!account) {
  const error = new Error('Account not found');
  error.statusCode = 404;
  throw error;
}
```

## Function Composition

### Composing Utilities

**✅ CORRECT: Small, Composable Functions**
```javascript
// utils/array.js
const filterBy = (arr, predicate) => arr.filter(predicate);
const mapTo = (arr, mapper) => arr.map(mapper);
const sumBy = (arr, getter) => arr.reduce((sum, item) => sum + getter(item), 0);

// Usage: Compose for specific needs
const getTotalAmount = (transactions) => 
  sumBy(
    filterBy(transactions, t => t.transaction_type === 'income'),
    t => parseFloat(t.amount)
  );

// Or create reusable composed functions
const getIncomeTotal = compose(
  transactions => sumBy(transactions, t => parseFloat(t.amount)),
  transactions => filterBy(transactions, t => t.transaction_type === 'income')
);
```

### Pipeline Pattern

**✅ CORRECT: Clear Data Pipeline**
```javascript
const processTransactions = (transactions) => {
  return transactions
    .filter(isValid)           // Step 1: Filter invalid
    .map(normalizeAmount)      // Step 2: Normalize amounts
    .map(calculateSigned)      // Step 3: Calculate signed amounts
    .sort(byDate);             // Step 4: Sort by date
};
```

## Code Review Checklist

### Controllers
- [ ] Controller is 5-15 lines
- [ ] No business logic in controller
- [ ] No database access in controller
- [ ] No validation logic in controller
- [ ] Delegates to service/DAO
- [ ] Consistent error handling

### Services
- [ ] Orchestrates business logic only
- [ ] Calls DAOs for data
- [ ] Uses utility functions for transformations
- [ ] No SQL queries in services
- [ ] Clear function names
- [ ] Single responsibility per function

### DAOs
- [ ] Database access only
- [ ] No business logic
- [ ] No validation
- [ ] Returns raw data
- [ ] Consistent query patterns

### Utilities
- [ ] Pure functions (no side effects)
- [ ] Single purpose
- [ ] Easy to test
- [ ] Clear function names
- [ ] No dependencies on other layers

### General
- [ ] No duplicate code blocks
- [ ] No functions longer than 20 lines (in critical paths)
- [ ] Clear, descriptive names
- [ ] Consistent patterns across codebase
- [ ] DRY principle followed

## Refactoring Guide

### When You See Duplicate Code

1. **Identify the pattern**
   - What's being duplicated?
   - Where is it used?
   - What varies vs what stays the same?

2. **Extract to utility**
   - Create pure function in `utils/`
   - Name clearly
   - Add JSDoc comment
   - Add to this document

3. **Replace all instances**
   - Search for duplicate pattern
   - Replace with utility function
   - Test thoroughly

4. **Verify**
   - Same behavior as before
   - No side effects introduced
   - Easier to understand

### When You See Long Functions

1. **Identify responsibilities**
   - What does this function do?
   - Can it be split?
   - What's the single responsibility?

2. **Extract sub-functions**
   - Create focused functions
   - Name by what they do
   - Keep main function as coordinator

3. **Test each function**
   - Test in isolation
   - Compose together
   - Verify same behavior

## Examples from Simples v2.0

### calculateSignedAmount Utility

**Purpose:** Calculate signed amount for transactions

**Location:** `server/utils/calculateSignedAmount.js`

**Usage:**
```javascript
const signedAmount = calculateSignedAmount(100, 'expense');
// Returns: -100

const signedAmount = calculateSignedAmount(-100, 'income');
// Returns: 100
```

**Pattern:** Single-purpose, pure function used across multiple controllers

### Transaction Store Getters

**Purpose:** Provide filtered/calculated transaction views

**Location:** `client/src/stores/transaction.js`

**Pattern:** All filtering logic centralized in store, consumed by all views

## Anti-Patterns to Avoid

### 1. God Functions
```javascript
// ❌ DON'T: One function does everything
async function handleTransaction(data) {
  // Validation (10 lines)
  // Database queries (15 lines)
  // Business logic (20 lines)
  // Response formatting (5 lines)
  // Total: 50 lines doing 4 different things
}
```

### 2. Copy-Paste Programming
```javascript
// ❌ DON'T: Copy code to multiple places
// File 1
if (!data.amount || parseFloat(data.amount) <= 0) { ... }

// File 2
if (!data.amount || parseFloat(data.amount) <= 0) { ... }

// File 3
if (!data.amount || parseFloat(data.amount) <= 0) { ... }
```

### 3. Mixed Concerns
```javascript
// ❌ DON'T: Mix layers
async function createTransaction(req, res) {
  const data = req.body;  // HTTP layer
  if (!valid(data)) { ... } // Business layer
  const result = await db.run('INSERT...'); // Data layer
  res.json(result); // HTTP layer
}
```

## Summary

**The Golden Rules:**

1. **Controllers:** HTTP concerns only (5-15 lines)
2. **Services:** Business logic and orchestration
3. **DAOs:** Database access only
4. **Utilities:** Pure, single-purpose functions
5. **No Duplication:** Extract common logic
6. **Single Responsibility:** One function, one purpose
7. **Composition:** Build complex from simple

**Remember:**
- ✅ Keep functions small and focused
- ✅ Extract common logic to utilities
- ✅ Separate concerns by layer
- ✅ Write pure functions where possible
- ✅ Name functions clearly
- ❌ NO duplicate code
- ❌ NO long functions (>20 lines in critical paths)
- ❌ NO mixed concerns

Following these patterns keeps the codebase maintainable, testable, and easy to understand.

