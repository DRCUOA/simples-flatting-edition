# Quick Start Guide - New Budget System

## 🎉 Your Budget System is Ready!

The budget refactor is complete and your server is already running with the new system enabled.

---

## 🚀 Quick Access

### View Budget Report
```
http://localhost:5173/budget-report
```

This is your new budget vs actual report showing:
- Monthly summary (budgeted, spent, remaining)
- Per-category breakdowns with progress bars
- Reconciliation status
- Pending transaction alerts

---

## 💡 Key Concepts

### 1. Month-Based Budgets
Budgets are now organized by month (YYYY-MM format) instead of date ranges.

```
October 2025 = "2025-10"
```

### 2. Category-First
Every budget is per category. The month total is automatically calculated as the sum of all category budgets.

### 3. Integer Cents
All amounts are stored as integer cents internally:
- $60.00 = 6000 cents
- $1,234.56 = 123456 cents

The frontend automatically converts for you.

### 4. Revision Tracking
Budget changes create new revisions - history is preserved:
- Rev 1: $600
- Rev 2: $650 (updated)
- Rev 3: $700 (updated)

Only the latest revision is active.

---

## 📱 Using the Frontend

### Budget Report View

1. **Navigate to Budget Report:**
   - Click on "Budget Report" in navigation (or visit `/budget-report`)

2. **Select Month:**
   - Use the month picker to view different months
   - Click "Refresh" to reload data

3. **Review Summary:**
   - See totals at a glance
   - Check reconciliation status
   - View pending transaction count

4. **Analyze Categories:**
   - Each category shows budgeted vs actual
   - Progress bars indicate spending %
   - Green = under budget, Red = over budget
   - Click categories for details

### Transaction Management

1. **Creating Transactions:**
   - New fields available:
     - **Status**: pending / cleared / posted
     - **Is Transfer**: checkbox for transfers

2. **Default Behavior:**
   - New transactions default to "posted"
   - Transfers are auto-detected from category

3. **Pending vs Posted:**
   - Only "cleared" and "posted" count in actuals
   - Pending shown separately in report

---

## 🔧 Using the API

### Get Month Report

```bash
curl http://localhost:3051/budgets/month/2025-10/report \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create/Update Budget

```bash
curl -X POST http://localhost:3051/budgets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "month": "2025-10",
    "category_id": "your-category-id",
    "amount_cents": 60000
  }'
```

### Bulk Set Budgets for a Month

```bash
curl -X POST http://localhost:3051/budgets/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "month": "2025-10",
      "category_id": "cat-groceries",
      "amount_cents": 60000
    },
    {
      "month": "2025-10",
      "category_id": "cat-rent",
      "amount_cents": 180000
    }
  ]'
```

### Get Month Total

```bash
curl http://localhost:3051/budgets/month/2025-10/total \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Revision History

```bash
curl http://localhost:3051/budgets/month/2025-10/category/cat-groceries/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Understanding the Report

### Summary Cards

- **Budgeted**: Total of all category budgets
- **Spent**: Total of all expenses (posted/cleared only)
- **Remaining**: Budgeted - Spent
- **Income**: Total income for the month

### Category Rows

Each category shows:
- **Budgeted**: Amount budgeted for this category
- **Spent**: Actual spending (excludes transfers and pending)
- **Variance**: Budgeted - Spent
  - Positive (green) = under budget
  - Negative (red) = over budget
- **Progress**: Visual progress bar (0-100%+)

### Status Badges

- **⚠️ Unreconciled Accounts**: Some accounts need reconciliation
- **Pending Transactions**: Count of pending transactions
- **Rev. X**: Current revision number

---

## 🎯 Best Practices

### 1. Reconcile Regularly
- Reconcile your accounts monthly
- Unreconciled accounts show a warning
- Reconciliation ensures accurate reports

### 2. Use Correct Status
- **Pending**: Authorized but not yet cleared
- **Cleared**: Transaction has cleared the bank
- **Posted**: Transaction is final

### 3. Mark Transfers
- Always check "Is Transfer" for transfers
- Transfers are excluded from budget calculations
- Helps maintain accurate variance

### 4. Review Pending
- Check the pending panel regularly
- Pending transactions shown separately
- They don't affect current budget calculations

### 5. Track History
- Use revision history to see changes
- All budget updates are preserved
- Useful for audit and analysis

---

## 🔍 Troubleshooting

### "No budgets found"
- Make sure you've created budgets for the selected month
- Check that you're viewing the correct month

### "Unreconciled accounts" warning
- Reconcile your accounts via the Statements view
- Match transactions to statement periods

### Amounts don't match
- Remember: only posted/cleared transactions count
- Transfers are excluded from actuals
- Pending transactions shown separately

### Can't update budget
- Budgets are append-only (creates new revision)
- Old revisions are preserved for history

---

## 📚 Additional Resources

- **Full Documentation**: See `BUDGET_REFACTOR_COMPLETE.md`
- **Implementation Details**: See `BUDGET_REFACTOR_IMPLEMENTATION.md`
- **API Tests**: Run `npm test -- budget` in server directory

---

## 🎉 You're All Set!

Your budget system is now using:
- ✅ Category-first principles
- ✅ Month-based organization
- ✅ Immutable revision tracking
- ✅ Proper actuals filtering
- ✅ Derived month totals

Start exploring your new budget report at:
**http://localhost:5173/budget-report**

---

*Need help? Check the documentation files or contact support.*

