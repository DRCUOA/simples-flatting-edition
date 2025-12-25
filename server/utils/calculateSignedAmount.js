// server/utils/calculateSignedAmount.js

/**
 * Compute a normalized signed amount where:
 * - Positive values increase the account balance
 * - Negative values decrease the account balance
 *
 * Rules:
 * - If transaction_type is provided and starts with 'C' (credit) or 'D' (debit),
 *   use that exclusively: 'C' => +abs(amount), 'D' => -abs(amount).
 * - Otherwise, use the account configuration to interpret the raw amount sign:
 *   when positive_is_credit is true, keep the amount sign as-is; when false, invert it.
 */
function calculateSignedAmount(account, transaction) {
  const { positive_is_credit } = account;
  const rawAmount = Number(transaction.amount) || 0;
  const absAmount = Math.abs(rawAmount);
  const typeUpper = String(transaction.transaction_type || '').trim().toUpperCase();
  
  // Handle various transaction type formats (C, CREDIT, D, DEBIT, etc.)
  const isCredit = typeUpper === 'C' || typeUpper === 'CREDIT' || typeUpper.startsWith('C');
  const isDebit = typeUpper === 'D' || typeUpper === 'DEBIT' || typeUpper.startsWith('D');

  // Prefer explicit transaction type semantics when available
  if (isCredit) return absAmount;   // credit increases balance (always positive)
  if (isDebit) return -absAmount;   // debit decreases balance (always negative)

  // Fallback: interpret sign based on account configuration of the CSV
  // If positive amounts in the CSV represent credits (money-in), keep sign; else invert
  return positive_is_credit ? rawAmount : -rawAmount;
}

module.exports = calculateSignedAmount;