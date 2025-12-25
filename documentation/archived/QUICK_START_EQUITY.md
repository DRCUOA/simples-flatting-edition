# Quick Start Guide: Equity & Net Worth Features

## 🎯 What's New?

Your financial management system now includes **proper double-entry accounting** with automatic equity tracking. This means you can see your true net worth and the system ensures that **Assets = Liabilities + Equity** at all times.

---

## 🚀 Quick Start (3 Steps)

### 1. View Your Net Worth
1. Open the application
2. Click **Reports** → **Net Worth**
3. See your complete financial position!

### 2. Check Balance Status
Look for the status badge:
- **✓ Balanced** (Green) = Everything is perfect
- **⚠ Needs Reconciliation** (Yellow) = Click "Reconcile Now"

### 3. Run a Quick Audit (Optional)
```bash
cd /Users/Rich/simples
node server/utils/equity-reconciliation.js audit
```

---

## 💡 Common Tasks

### See Your Net Worth
**UI:** Reports → Net Worth  
**API:** `GET /api/equity/net-worth`

### Check if Balanced
**CLI:**
```bash
node server/utils/equity-reconciliation.js audit
```

**API:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3050/api/equity/equation
```

### Reconcile Equity
**UI:** Click "Reconcile Now" button on Net Worth page  
**CLI:**
```bash
node server/utils/equity-reconciliation.js reconcile
```

**API:**
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Manual reconciliation"}' \
  http://localhost:3050/api/equity/reconcile
```

---

## 📊 Understanding Your Accounts

### Asset Accounts (What You Own)
- Checking accounts
- Savings accounts
- Investment accounts
- Cash

### Liability Accounts (What You Owe)
- Credit cards
- Loans
- Mortgages

### Equity Account (Your Net Worth)
- **Owner's Equity** (automatically managed)
- Formula: Assets - Liabilities = Equity
- Cannot be manually edited

---

## 🔍 Troubleshooting

### "Needs Reconciliation" Warning?
**Solution:** Click the "Reconcile Now" button or run:
```bash
node server/utils/equity-reconciliation.js reconcile
```

### Check Specific User
```bash
node server/utils/equity-reconciliation.js user <user_id>
```

### View Adjustment History
**UI:** Net Worth page shows recent adjustments  
**API:** `GET /api/equity/history`

---

## 📁 Important Files

### Backend
- **Service:** `/server/services/equity-service.js`
- **Controller:** `/server/controllers/equity-controller.js`
- **Routes:** `/server/routes/equity-routes.js`
- **Utility:** `/server/utils/equity-reconciliation.js`
- **Migrations:** `/server/migrations/add_equity_account_support.sql`

### Frontend
- **Store:** `/client/src/stores/equity.js`
- **View:** `/client/src/views/NetWorthView.vue`

### Documentation
- **Complete Guide:** `EQUITY_IMPLEMENTATION.md`
- **Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Quick Start:** `QUICK_START_EQUITY.md` (this file)

---

## 🎓 Learn More

### What is Double-Entry Accounting?
Every financial transaction has two sides. For example:
- When you deposit $100 in checking (Asset +$100)
- Your equity also increases (Equity +$100)
- The equation stays balanced: Assets = Liabilities + Equity

### Why is This Important?
1. **Accuracy** - Catches errors automatically
2. **Completeness** - Shows full financial picture
3. **Compliance** - Follows accounting standards
4. **Transparency** - Clear understanding of finances

---

## ⚡ Quick Commands

```bash
# Check everything
node server/utils/equity-reconciliation.js audit

# Fix any issues
node server/utils/equity-reconciliation.js reconcile

# Check yourself
node server/utils/equity-reconciliation.js user $(whoami)

# Get help
node server/utils/equity-reconciliation.js help
```

---

## ✅ Current Status

As of implementation (Oct 11, 2025):

✅ All 4 users have balanced accounts  
✅ Equity accounts created automatically  
✅ All assets and liabilities tracked  
✅ Net worth calculations working  
✅ UI fully integrated  
✅ API endpoints operational  
✅ Command-line tools ready  

**You're all set!** 🎉

---

## 🤝 Need Help?

1. **Check audit status** first
2. **Review the documentation** in EQUITY_IMPLEMENTATION.md
3. **Run reconciliation** if needed
4. **Check the adjustment history** for clues

---

**Enjoy your new financial insights!** 💰📈

