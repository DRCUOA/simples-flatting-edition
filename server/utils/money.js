/**
 * Money utilities for precise financial calculations and comparisons
 * Uses Decimal.js to avoid floating-point rounding errors
 * Maintains 2 decimal places precision for NZD currency
 */

const Decimal = require('decimal.js');

// Configure Decimal.js for currency precision (2 decimal places)
Decimal.set({ 
  precision: 28,  // High precision for intermediate calculations
  rounding: Decimal.ROUND_HALF_UP,  // Standard banking rounding
  toExpNeg: -9e15,
  toExpPos: 9e15
});

// Currency precision constant for comparisons
const CURRENCY_EPSILON = 0.01;
const CURRENCY_DECIMALS = 2;

/**
 * Round monetary amount to currency precision (2 decimal places)
 * @param {number|string|Decimal} amount - Amount to round
 * @returns {number} Rounded amount as number
 */
const roundMoney = (amount) => {
  if (amount === null || amount === undefined) {
    return 0;
  }
  
  try {
    const decimal = new Decimal(amount);
    return decimal.toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    console.warn('[roundMoney] Invalid amount:', amount, error);
    return 0;
  }
};

/**
 * Add two or more monetary amounts with precision
 * @param {...number|string|Decimal} amounts - Amounts to add
 * @returns {number} Sum rounded to 2 decimal places
 */
const addMoney = (...amounts) => {
  try {
    let sum = new Decimal(0);
    amounts.forEach(amount => {
      if (amount !== null && amount !== undefined) {
        sum = sum.plus(new Decimal(amount));
      }
    });
    return sum.toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    console.warn('[addMoney] Error adding amounts:', amounts, error);
    return 0;
  }
};

/**
 * Subtract monetary amounts with precision
 * @param {number|string|Decimal} a - First amount
 * @param {number|string|Decimal} b - Second amount
 * @returns {number} Difference (a - b) rounded to 2 decimal places
 */
const subtractMoney = (a, b) => {
  try {
    const decimalA = new Decimal(a || 0);
    const decimalB = new Decimal(b || 0);
    return decimalA.minus(decimalB).toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    console.warn('[subtractMoney] Error subtracting amounts:', a, b, error);
    return 0;
  }
};

/**
 * Multiply monetary amount with precision
 * @param {number|string|Decimal} amount - Amount to multiply
 * @param {number|string|Decimal} multiplier - Multiplier
 * @returns {number} Product rounded to 2 decimal places
 */
const multiplyMoney = (amount, multiplier) => {
  try {
    const decimalAmount = new Decimal(amount || 0);
    const decimalMultiplier = new Decimal(multiplier || 0);
    return decimalAmount.times(decimalMultiplier).toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    console.warn('[multiplyMoney] Error multiplying amounts:', amount, multiplier, error);
    return 0;
  }
};

/**
 * Divide monetary amount with precision
 * @param {number|string|Decimal} amount - Amount to divide
 * @param {number|string|Decimal} divisor - Divisor
 * @returns {number} Quotient rounded to 2 decimal places
 */
const divideMoney = (amount, divisor) => {
  try {
    const decimalAmount = new Decimal(amount || 0);
    const decimalDivisor = new Decimal(divisor || 0);
    if (decimalDivisor.isZero()) {
      console.warn('[divideMoney] Division by zero');
      return 0;
    }
    return decimalAmount.dividedBy(decimalDivisor).toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    console.warn('[divideMoney] Error dividing amounts:', amount, divisor, error);
    return 0;
  }
};

/**
 * Compare two monetary amounts for equality within currency precision
 * @param {number|string|Decimal} a - First amount
 * @param {number|string|Decimal} b - Second amount
 * @param {number} epsilon - Precision threshold (defaults to CURRENCY_EPSILON)
 * @returns {boolean} True if amounts are equal within precision
 */
const moneyEquals = (a, b, epsilon = CURRENCY_EPSILON) => {
  try {
    const decimalA = new Decimal(a || 0);
    const decimalB = new Decimal(b || 0);
    const diff = decimalA.minus(decimalB).abs();
    return diff.lessThanOrEqualTo(new Decimal(epsilon));
  } catch (error) {
    console.warn('[moneyEquals] Error comparing amounts:', a, b, error);
    return false;
  }
};

/**
 * Calculate the difference between two monetary amounts
 * @param {number|string|Decimal} a - First amount
 * @param {number|string|Decimal} b - Second amount
 * @returns {number} Difference (a - b) rounded to 2 decimal places
 */
const moneyDifference = (a, b) => {
  return subtractMoney(a, b);
};

/**
 * Get the absolute value of a monetary amount
 * @param {number|string|Decimal} amount - Amount
 * @returns {number} Absolute value rounded to 2 decimal places
 */
const absMoney = (amount) => {
  try {
    const decimal = new Decimal(amount || 0);
    return decimal.abs().toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    console.warn('[absMoney] Error getting absolute value:', amount, error);
    return 0;
  }
};

/**
 * Get the maximum of two or more monetary amounts
 * @param {...number|string|Decimal} amounts - Amounts to compare
 * @returns {number} Maximum value rounded to 2 decimal places
 */
const maxMoney = (...amounts) => {
  try {
    if (amounts.length === 0) return 0;
    let max = new Decimal(amounts[0] || 0);
    amounts.slice(1).forEach(amount => {
      const decimal = new Decimal(amount || 0);
      if (decimal.greaterThan(max)) {
        max = decimal;
      }
    });
    return max.toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    console.warn('[maxMoney] Error getting maximum:', amounts, error);
    return 0;
  }
};

/**
 * Get the minimum of two or more monetary amounts
 * @param {...number|string|Decimal} amounts - Amounts to compare
 * @returns {number} Minimum value rounded to 2 decimal places
 */
const minMoney = (...amounts) => {
  try {
    if (amounts.length === 0) return 0;
    let min = new Decimal(amounts[0] || 0);
    amounts.slice(1).forEach(amount => {
      const decimal = new Decimal(amount || 0);
      if (decimal.lessThan(min)) {
        min = decimal;
      }
    });
    return min.toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    console.warn('[minMoney] Error getting minimum:', amounts, error);
    return 0;
  }
};

/**
 * Validate that a value is a valid monetary amount
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid monetary amount
 */
const isValidMoney = (value) => {
  if (value === null || value === undefined) {
    return false;
  }
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite();
  } catch (error) {
    return false;
  }
};

/**
 * Parse and validate a monetary amount from various input types
 * @param {any} value - Value to parse
 * @returns {number|null} Parsed amount rounded to 2 decimal places, or null if invalid
 */
const parseMoney = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  
  try {
    const decimal = new Decimal(value);
    if (!decimal.isFinite()) {
      return null;
    }
    return decimal.toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toNumber();
  } catch (error) {
    return null;
  }
};

/**
 * Sum an array of monetary amounts with precision
 * @param {Array<number|string|Decimal>} amounts - Array of amounts to sum
 * @returns {number} Sum rounded to 2 decimal places
 */
const sumMoney = (amounts) => {
  if (!Array.isArray(amounts) || amounts.length === 0) {
    return 0;
  }
  return addMoney(...amounts);
};

/**
 * Format a monetary amount as a string with 2 decimal places
 * @param {number|string|Decimal} amount - Amount to format
 * @returns {string} Formatted amount (e.g., "1234.56")
 */
const formatMoney = (amount) => {
  try {
    const decimal = new Decimal(amount || 0);
    return decimal.toDecimalPlaces(CURRENCY_DECIMALS, Decimal.ROUND_HALF_UP).toFixed(CURRENCY_DECIMALS);
  } catch (error) {
    console.warn('[formatMoney] Error formatting amount:', amount, error);
    return '0.00';
  }
};

module.exports = {
  CURRENCY_EPSILON,
  CURRENCY_DECIMALS,
  Decimal, // Export Decimal for advanced use cases
  roundMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  moneyEquals,
  moneyDifference,
  absMoney,
  maxMoney,
  minMoney,
  isValidMoney,
  parseMoney,
  sumMoney,
  formatMoney
};
