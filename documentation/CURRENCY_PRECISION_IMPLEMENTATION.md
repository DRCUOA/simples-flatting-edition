# Currency Precision Implementation

## Overview

This document describes the implementation of precise decimal arithmetic for currency calculations to avoid floating-point rounding errors. All currency amounts (NZD) are now maintained with 2 decimal places precision using the `decimal.js` library.

## Problem

JavaScript's native floating-point arithmetic can cause rounding errors when performing currency calculations. For example:
- `0.1 + 0.2 = 0.30000000000000004` (not exactly 0.30)
- Multiple additions/subtractions can accumulate errors
- This leads to discrepancies in financial calculations

## Solution

We've implemented a comprehensive currency utility system using `decimal.js`, a well-tested library for arbitrary-precision decimal arithmetic.

### Key Features

1. **Precise Decimal Arithmetic**: All currency operations use `decimal.js` internally
2. **2 Decimal Places**: All amounts are rounded to 2 decimal places (NZD standard)
3. **Banking Rounding**: Uses `ROUND_HALF_UP` (standard banking rounding)
4. **Consistent API**: Same utilities available on both server and client

## Implementation

### Libraries Installed

- **Server**: `decimal.js` (in `/server/package.json`)
- **Client**: `decimal.js` (in `/client/package.json`)

### Files Created

1. **`/server/utils/money.js`** - Server-side currency utilities
2. **`/client/src/utils/money.js`** - Client-side currency utilities

### Files Updated

#### Server-Side
- `/server/models/account_dao.js` - Balance calculations
- `/server/controllers/reporting-controller.js` - Net balance calculations
- `/server/models/transaction_dao.js` - Transaction amount parsing (via existing utilities)

#### Client-Side
- `/client/src/stores/account.js` - Account balance calculations
- `/client/src/stores/transaction.js` - Transaction totals and aggregations

## Usage Guide

### Importing Utilities

**Server-side:**
```javascript
const { parseMoney, addMoney, subtractMoney, roundMoney, sumMoney } = require('../utils/money');
```

**Client-side:**
```javascript
import { parseMoney, addMoney, subtractMoney, roundMoney, sumMoney } from '../utils/money';
```

### Common Operations

#### 1. Parse Currency Values
```javascript
// Parse from string, number, or other types
const amount = parseMoney('123.456');  // Returns 123.46 (rounded)
const amount2 = parseMoney(123.456);   // Returns 123.46
const amount3 = parseMoney(null);      // Returns null
```

#### 2. Add Currency Amounts
```javascript
// Add multiple amounts
const total = addMoney(10.50, 20.75, 5.25);  // Returns 36.50

// Or use sumMoney for arrays
const amounts = [10.50, 20.75, 5.25];
const total = sumMoney(amounts);  // Returns 36.50
```

#### 3. Subtract Currency Amounts
```javascript
const difference = subtractMoney(100.50, 25.75);  // Returns 74.75
```

#### 4. Round Currency Amounts
```javascript
const rounded = roundMoney(123.456789);  // Returns 123.46
```

#### 5. Compare Currency Amounts
```javascript
const { moneyEquals } = require('../utils/money');

// Compare with epsilon tolerance (default 0.01)
const isEqual = moneyEquals(100.00, 100.005);  // Returns true (within tolerance)
```

### Available Functions

#### Core Functions
- `parseMoney(value)` - Parse and round to 2 decimal places
- `roundMoney(amount)` - Round to 2 decimal places
- `addMoney(...amounts)` - Add multiple amounts
- `subtractMoney(a, b)` - Subtract b from a
- `multiplyMoney(amount, multiplier)` - Multiply with precision
- `divideMoney(amount, divisor)` - Divide with precision
- `sumMoney(amounts)` - Sum an array of amounts

#### Comparison Functions
- `moneyEquals(a, b, epsilon)` - Compare with tolerance
- `moneyDifference(a, b)` - Calculate difference
- `maxMoney(...amounts)` - Get maximum value
- `minMoney(...amounts)` - Get minimum value
- `absMoney(amount)` - Get absolute value

#### Utility Functions
- `isValidMoney(value)` - Validate monetary amount
- `formatMoney(amount)` - Format as string with 2 decimals

### Constants
- `CURRENCY_EPSILON` - Default tolerance for comparisons (0.01)
- `CURRENCY_DECIMALS` - Decimal places (2)

## Migration Guide

### Before (Incorrect)
```javascript
// ❌ DON'T: Direct floating-point arithmetic
const total = parseFloat(amount1) + parseFloat(amount2);
const balance = account.balance + transaction.amount;
const sum = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
```

### After (Correct)
```javascript
// ✅ DO: Use money utilities
const total = addMoney(amount1, amount2);
const balance = addMoney(account.balance, transaction.amount);
const sum = sumMoney(transactions.map(t => t.amount));
```

### Common Patterns

#### Summing Arrays
```javascript
// Before
const total = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

// After
const total = sumMoney(items.map(item => item.amount || 0));
```

#### Parsing Database Values
```javascript
// Before
const balance = parseFloat(row.balance || 0);

// After
const balance = parseMoney(row.balance) || 0;
```

#### Accumulating in Loops
```javascript
// Before
let total = 0;
items.forEach(item => {
  total += parseFloat(item.amount || 0);
});

// After
let total = 0;
items.forEach(item => {
  total = addMoney(total, item.amount || 0);
});
```

## Best Practices

1. **Always use `parseMoney()`** when reading currency values from:
   - Database queries
   - API responses
   - User input
   - JSON data

2. **Always use money utilities** for arithmetic:
   - `addMoney()` for addition
   - `subtractMoney()` for subtraction
   - `multiplyMoney()` for multiplication
   - `divideMoney()` for division

3. **Use `roundMoney()`** when you need to ensure 2 decimal places:
   - Before storing in database
   - Before displaying to user
   - After complex calculations

4. **Use `sumMoney()`** for summing arrays of amounts

5. **Never use**:
   - Direct `+`, `-`, `*`, `/` operators on currency values
   - `parseFloat()` without `roundMoney()`
   - `Number()` without `roundMoney()`
   - `Math.round()` directly (use `roundMoney()` instead)

## Testing

When testing currency calculations, use `moneyEquals()` for comparisons:

```javascript
const { moneyEquals } = require('../utils/money');

// ✅ Correct
assert(moneyEquals(calculatedTotal, expectedTotal));

// ❌ Incorrect (may fail due to floating-point precision)
assert(calculatedTotal === expectedTotal);
```

## Performance Considerations

- `decimal.js` is optimized for performance but is slightly slower than native arithmetic
- The performance difference is negligible for typical financial applications
- The precision benefits far outweigh the minimal performance cost

## Future Enhancements

Consider adding:
- Currency formatting utilities (e.g., `formatCurrencyNZD()`)
- Currency validation (e.g., max/min limits)
- Exchange rate conversion utilities
- Multi-currency support (if needed)

## References

- [decimal.js Documentation](https://mikemcl.github.io/decimal.js/)
- [IEEE 754 Floating Point Standard](https://en.wikipedia.org/wiki/IEEE_754)
- [Banking Rounding](https://en.wikipedia.org/wiki/Rounding#Round_half_up)


