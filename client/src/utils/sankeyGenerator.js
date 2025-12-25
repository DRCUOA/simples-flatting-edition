/**
 * Sankey Diagram Generator Utility
 * Generates Sankey diagram data for a specific month/date range
 */

/**
 * Generate Sankey diagram data for a specific date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} transactionStore - Transaction store instance
 * @param {Object} categoryStore - Category store instance
 * @returns {Promise<Object>} Sankey diagram data with nodes and links
 */
export const generateSankeyData = async (startDate, endDate, transactionStore, categoryStore) => {
  // Ensure stores are loaded
  await Promise.all([
    transactionStore.fetchTransactions(startDate, endDate),
    categoryStore.fetchCategories()
  ]);

  const transactions = transactionStore.getTransactionsByDateRange(startDate, endDate);
  const categories = categoryStore.categories;

  // Build category map
  const categoryMap = new Map();
  categories.forEach(cat => {
    categoryMap.set(cat.category_id, cat);
  });

  // Calculate totals by category
  const categoryTotals = new Map();
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(t => {
    const amount = parseFloat(t.signed_amount) || 0;
    const categoryId = t.category_id;

    // Exclude transactions without categories
    if (!categoryId) return;

    const category = categoryMap.get(categoryId);
    if (!category) return;

    // Exclude Internal-Transfers category
    const categoryName = category.category_name || '';
    if (categoryName === 'Internal-Transfers') return;

    // Exclude by is_transfer flag
    if (t.is_transfer === true || t.is_transfer === 1) return;

    // Find root parent category
    let rootCategory = category;
    while (rootCategory.parent_category_id) {
      rootCategory = categoryMap.get(rootCategory.parent_category_id);
      if (!rootCategory) break;
    }

    // Exclude transfer root categories
    const rootCategoryName = rootCategory.category_name || '';
    if (rootCategoryName === 'Internal-Transfers') return;

    const rootId = rootCategory.category_id;

    if (!categoryTotals.has(rootId)) {
      categoryTotals.set(rootId, {
        category: rootCategory,
        total: 0,
        incomeTotal: 0,
        expenseTotal: 0,
        children: new Map(),
        isIncomeRoot: false,
        rootCategoryType: 'expense'
      });
    }

    const rootData = categoryTotals.get(rootId);

    // Calculate income/expense based on transaction sign
    if (amount > 0) {
      rootData.total += amount;
      rootData.incomeTotal += amount;
      totalIncome += amount;
    } else if (amount < 0) {
      const expenseAmount = Math.abs(amount);
      rootData.total += expenseAmount;
      rootData.expenseTotal += expenseAmount;
      totalExpenses += expenseAmount;
    }

    // Track child category totals
    if (category.category_id !== rootId) {
      if (!rootData.children.has(category.category_id)) {
        rootData.children.set(category.category_id, {
          category: category,
          total: 0,
          incomeTotal: 0,
          expenseTotal: 0,
          isIncomeDescendant: false
        });
      }
      const childData = rootData.children.get(category.category_id);
      if (amount > 0) {
        childData.total += amount;
        childData.incomeTotal += amount;
      } else if (amount < 0) {
        const expenseAmount = Math.abs(amount);
        childData.total += expenseAmount;
        childData.expenseTotal += expenseAmount;
      }
    }
  });

  // Determine root category types based on income vs expense totals
  categoryTotals.forEach((data) => {
    data.rootCategoryType = data.incomeTotal > data.expenseTotal ? 'income' : 'expense';
    data.isIncomeRoot = data.rootCategoryType === 'income';
    data.children.forEach((childData) => {
      childData.isIncomeDescendant = data.isIncomeRoot;
    });
  });

  // Calculate net
  const netAmount = totalIncome - totalExpenses;
  const isProfit = netAmount >= 0;

  // Build nodes and links
  const nodes = [];
  const links = [];
  const nodeIdToIndex = new Map();
  let nodeIndex = 0;

  // Add net income node
  const netIndex = nodeIndex++;
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };
  const netLabel = isProfit 
    ? `Net Income: ${formatCurrency(netAmount)}`
    : `Net Loss: ${formatCurrency(Math.abs(netAmount))}`;
  nodes.push({
    id: 'net',
    name: netLabel,
    value: Math.abs(netAmount),
    type: 'source',
    isProfit: isProfit,
    actualNetAmount: netAmount,
    rootCategoryType: null
  });
  nodeIdToIndex.set('net', netIndex);

  // Add Income summary node
  const incomeSummaryIndex = nodeIndex++;
  nodes.push({
    id: 'income-summary',
    name: `Income: ${formatCurrency(totalIncome)}`,
    value: totalIncome,
    type: 'summary',
    categoryType: 'income',
    isIncomeDescendant: true,
    rootCategoryType: 'income'
  });
  nodeIdToIndex.set('income-summary', incomeSummaryIndex);

  // Add Expense summary node
  const expenseSummaryIndex = nodeIndex++;
  nodes.push({
    id: 'expense-summary',
    name: `Expense: ${formatCurrency(totalExpenses)}`,
    value: totalExpenses,
    type: 'summary',
    categoryType: 'expense',
    isIncomeDescendant: false,
    rootCategoryType: 'expense'
  });
  nodeIdToIndex.set('expense-summary', expenseSummaryIndex);

  // Link from Income summary to Net Income
  links.push({
    source: incomeSummaryIndex,
    target: netIndex,
    value: Math.abs(netAmount)
  });

  // Link from Income summary to Expense summary
  links.push({
    source: incomeSummaryIndex,
    target: expenseSummaryIndex,
    value: totalExpenses
  });

  // Separate income and expense categories
  const incomeCategories = [];
  const expenseCategories = [];

  categoryTotals.forEach((data, rootId) => {
    const category = data.category;
    const total = data.total;

    if (total === 0) return;

    // Exclude transfer categories
    const categoryName = (category.category_name || '').toLowerCase();
    if (categoryName.includes('transfer')) return;

    const rootCategoryType = data.rootCategoryType || 'expense';

    if (rootCategoryType === 'income') {
      incomeCategories.push({ ...data, rootId });
    } else if (rootCategoryType === 'expense') {
      expenseCategories.push({ ...data, rootId });
    }
  });

  // Sort categories
  incomeCategories.sort((a, b) => b.total - a.total);
  expenseCategories.sort((a, b) => b.total - a.total);

  // Add income category nodes and links
  incomeCategories.forEach((data) => {
    const category = data.category;
    const total = data.total;

    const parentNodeId = `income-cat-${data.rootId}`;
    const parentIndex = nodeIndex++;
    nodes.push({
      id: parentNodeId,
      name: `${category.category_name}: ${formatCurrency(total)}`,
      value: total,
      type: 'category',
      categoryType: 'income',
      isIncomeDescendant: data.isIncomeRoot === true,
      rootCategoryType: data.rootCategoryType || 'income'
    });
    nodeIdToIndex.set(parentNodeId, parentIndex);

    // Link from Income summary to income category
    links.push({
      source: incomeSummaryIndex,
      target: parentIndex,
      value: total
    });

    // Add child category nodes
    data.children.forEach((childData, childId) => {
      if (childData.total === 0) return;

      const childNodeId = `income-child-${childId}`;
      const childIndex = nodeIndex++;
      nodes.push({
        id: childNodeId,
        name: `${childData.category.category_name}: ${formatCurrency(childData.total)}`,
        value: childData.total,
        type: 'subcategory',
        categoryType: 'income',
        isIncomeDescendant: childData.isIncomeDescendant === true,
        rootCategoryType: data.rootCategoryType || 'income'
      });
      nodeIdToIndex.set(childNodeId, childIndex);

      // Link from parent to child
      links.push({
        source: parentIndex,
        target: childIndex,
        value: childData.total
      });
    });
  });

  // Add expense category nodes and links
  expenseCategories.forEach((data) => {
    const category = data.category;
    const total = data.total;

    const parentNodeId = `expense-cat-${data.rootId}`;
    const parentIndex = nodeIndex++;
    nodes.push({
      id: parentNodeId,
      name: `${category.category_name}: ${formatCurrency(total)}`,
      value: total,
      type: 'category',
      categoryType: 'expense',
      isIncomeDescendant: data.isIncomeRoot === true,
      rootCategoryType: data.rootCategoryType || 'expense'
    });
    nodeIdToIndex.set(parentNodeId, parentIndex);

    // Link from Expense summary to expense category
    links.push({
      source: expenseSummaryIndex,
      target: parentIndex,
      value: total
    });

    // Add child category nodes
    data.children.forEach((childData, childId) => {
      if (childData.total === 0) return;

      const childNodeId = `expense-child-${childId}`;
      const childIndex = nodeIndex++;
      nodes.push({
        id: childNodeId,
        name: `${childData.category.category_name}: ${formatCurrency(childData.total)}`,
        value: childData.total,
        type: 'subcategory',
        categoryType: 'expense',
        isIncomeDescendant: childData.isIncomeDescendant === true,
        rootCategoryType: data.rootCategoryType || 'expense'
      });
      nodeIdToIndex.set(childNodeId, childIndex);

      // Link from parent to child
      links.push({
        source: parentIndex,
        target: childIndex,
        value: childData.total
      });
    });
  });

  return { nodes, links };
};

