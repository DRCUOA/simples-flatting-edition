<template>
  <div class="h-full flex flex-col p-4">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg h-full flex flex-col">
      <div class="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between gap-4 mb-4">
          <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Income & Expense Flow</h3>
        </div>
        
        <!-- Month/Year Selectors -->
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Start:</label>
            <select v-model="startMonth" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700">
              <option v-for="month in monthOptions" :key="month.value" :value="month.value">
                {{ month.label }}
              </option>
            </select>
            <select v-model="startYear" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700">
              <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>
          
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">End:</label>
            <select v-model="endMonth" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700">
              <option v-for="month in monthOptions" :key="month.value" :value="month.value">
                {{ month.label }}
              </option>
            </select>
            <select v-model="endYear" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700">
              <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>
          
          <button 
            @click="loadFlowData" 
            :disabled="loading"
            class="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Loading...' : 'Update' }}
          </button>
        </div>
      </div>

      <!-- Flow Diagram -->
      <div class="flex-1 overflow-auto p-6" v-if="!loading && flowData.nodes.length > 0 && flowData.links.length > 0">
        <SankeyDiagram :data="flowData" />
      </div>
      
      <div v-else-if="loading" class="flex-1 flex items-center justify-center">
        <div class="text-gray-500 dark:text-gray-400">Loading flow data...</div>
      </div>
      
      <div v-else-if="flowData.nodes.length === 0" class="flex-1 flex items-center justify-center">
        <div class="text-gray-500 dark:text-gray-400">
          <p>No data available for the selected period.</p>
          <p class="text-sm mt-2">Make sure you have transactions with categories assigned.</p>
        </div>
      </div>
      
      <div v-else class="flex-1 flex items-center justify-center">
        <div class="text-gray-500 dark:text-gray-400">
          <p>No flow connections found.</p>
          <p class="text-sm mt-2">Categories need to have transactions to show flow.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTransactionStore } from '../stores/transaction';
import { useCategoryStore } from '../stores/category';
import { normalizeAppDateClient } from '../utils/dateUtils';
import SankeyDiagram from '../components/SankeyDiagram.vue';

const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();

const loading = ref(false);
const startMonth = ref('');
const startYear = ref('');
const endMonth = ref('');
const endYear = ref('');
const flowData = ref({ nodes: [], links: [] });

// Generate month options
const monthOptions = [
  { label: 'January', value: '01' },
  { label: 'February', value: '02' },
  { label: 'March', value: '03' },
  { label: 'April', value: '04' },
  { label: 'May', value: '05' },
  { label: 'June', value: '06' },
  { label: 'July', value: '07' },
  { label: 'August', value: '08' },
  { label: 'September', value: '09' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' }
];

// Generate year options (last 5 years to current year)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

// Initialize with current month
const now = new Date();
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
startMonth.value = currentMonth;
startYear.value = currentYear;
endMonth.value = currentMonth;
endYear.value = currentYear;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const loadFlowData = async () => {
  loading.value = true;
  
  try {
    // Ensure stores are loaded
    await Promise.all([
      transactionStore.fetchTransactions(),
      categoryStore.fetchCategories()
    ]);
    
    // Calculate date range
    const startDate = `${startYear.value}-${startMonth.value}-01`;
    // Calculate last day of end month
    const endYearNum = parseInt(endYear.value);
    const endMonthNum = parseInt(endMonth.value);
    const lastDay = new Date(endYearNum, endMonthNum, 0).getDate(); // Day 0 = last day of previous month
    const endDate = `${endYear.value}-${endMonth.value}-${String(lastDay).padStart(2, '0')}`;
    
    // Get transactions in date range
    const transactions = transactionStore.getTransactionsByDateRange(startDate, endDate);
    const categories = categoryStore.categories;
    
    // Build category map first (needed for debugging)
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.category_id, cat);
    });
    
    console.log('Loading flow data:', {
      startDate,
      endDate,
      startMonth: startMonth.value,
      startYear: startYear.value,
      endMonth: endMonth.value,
      endYear: endYear.value,
      transactionCount: transactions.length,
      categoryCount: categories.length,
      totalTransactionsInStore: transactionStore.transactions.length
    });
    
    // Debug: Check a specific category like "Life Assurance"
    const lifeAssuranceTransactions = transactions.filter(t => {
      if (!t.category_id) return false;
      const cat = categoryMap.get(t.category_id);
      if (!cat) return false;
      const catName = (cat.category_name || '').toLowerCase();
      return catName.includes('life') || catName.includes('assurance');
    });
    
    if (lifeAssuranceTransactions.length > 0) {
      console.log('Life Assurance transactions:', {
        count: lifeAssuranceTransactions.length,
        transactions: lifeAssuranceTransactions.map(t => ({
          date: t.transaction_date,
          amount: t.signed_amount,
          description: t.description,
          category_id: t.category_id
        })),
        total: lifeAssuranceTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.signed_amount) || 0), 0)
      });
    }
    
    // Calculate totals by category
    const categoryTotals = new Map();
    let totalIncome = 0;
    let totalExpenses = 0;
    
    let processedCount = 0;
    let excludedCount = 0;
    let excludedReasons = { transfers: 0, noCategory: 0, categoryNotFound: 0, transferCategory: 0 };
    
    transactions.forEach(t => {
      const amount = parseFloat(t.signed_amount) || 0;
      const categoryId = t.category_id;
      
      // Exclude transactions without categories (consistent with Reports view)
      if (!categoryId) {
        excludedReasons.noCategory++;
        excludedCount++;
        return;
      }
      
      const category = categoryMap.get(categoryId);
      if (!category) {
        excludedReasons.categoryNotFound++;
        excludedCount++;
        return;
      }
      
      // Exclude transactions in Internal-Transfers category (consistent with Reports view)
      // This matches the Reports view exclusion: c.category_name != 'Internal-Transfers'
      const categoryName = category.category_name || '';
      if (categoryName === 'Internal-Transfers') {
        excludedReasons.transferCategory++;
        excludedCount++;
        return;
      }
      
      // Also exclude by is_transfer flag for additional safety
      // (Some transfers might not be in Internal-Transfers category)
      if (t.is_transfer === true || t.is_transfer === 1) {
        excludedReasons.transfers++;
        excludedCount++;
        return;
      }
      
      processedCount++;
      
      // Find root parent category
      let rootCategory = category;
      while (rootCategory.parent_category_id) {
        rootCategory = categoryMap.get(rootCategory.parent_category_id);
        if (!rootCategory) break;
      }
      
      // Also check root category name for Internal-Transfers (case-sensitive match)
      const rootCategoryName = rootCategory.category_name || '';
      if (rootCategoryName === 'Internal-Transfers') {
        excludedReasons.transferCategory++;
        excludedCount++;
        return;
      }
      
      const rootId = rootCategory.category_id;
      
      if (!categoryTotals.has(rootId)) {
        categoryTotals.set(rootId, {
          category: rootCategory,
          total: 0,
          incomeTotal: 0,  // Track income transactions for this root
          expenseTotal: 0, // Track expense transactions for this root
          children: new Map(),
          isIncomeRoot: false, // Will be determined later based on totals
          rootCategoryType: 'expense' // Will be determined later, default to expense
        });
      }
      
      const rootData = categoryTotals.get(rootId);
      
      // Calculate income/expense based on transaction sign (consistent with Transactions/Reports views)
      // Positive signed_amount = income, Negative signed_amount = expense
      // This matches the logic in transaction store: getIncomeTotalByDateRange and getExpenseTotalByDateRange
      if (amount > 0) {
        // Positive amount = income transaction
        rootData.incomeTotal += amount;
        totalIncome += amount;
      } else if (amount < 0) {
        // Negative amount = expense transaction
        const expenseAmount = Math.abs(amount);
        rootData.expenseTotal += expenseAmount;
        totalExpenses += expenseAmount;
      }
      // Calculate net total (income - expense) instead of sum of absolutes
      rootData.total = rootData.incomeTotal - rootData.expenseTotal;
      
      // Track child category totals
      if (category.category_id !== rootId) {
        if (!rootData.children.has(category.category_id)) {
          rootData.children.set(category.category_id, {
            category: category,
            total: 0,
            incomeTotal: 0,  // Track income transactions for this child
            expenseTotal: 0, // Track expense transactions for this child
            isIncomeDescendant: false // Will be set later based on root type
          });
        }
        const childData = rootData.children.get(category.category_id);
        // Use transaction-sign-based calculation (consistent with Transactions/Reports)
        if (amount > 0) {
          childData.incomeTotal += amount;
        } else if (amount < 0) {
          const expenseAmount = Math.abs(amount);
          childData.expenseTotal += expenseAmount;
        }
        // Calculate net total (income - expense) instead of sum of absolutes
        childData.total = childData.incomeTotal - childData.expenseTotal;
      }
    });
    
    // Determine root category types based on income vs expense totals
    // This matches the backend logic: totals.income > totals.expense ? 'income' : 'expense'
    categoryTotals.forEach((data, rootId) => {
      // Determine root type: income if incomeTotal > expenseTotal, otherwise expense
      data.rootCategoryType = data.incomeTotal > data.expenseTotal ? 'income' : 'expense';
      data.isIncomeRoot = data.rootCategoryType === 'income';
      
      // Update child categories' isIncomeDescendant based on root type
      data.children.forEach((childData) => {
        childData.isIncomeDescendant = data.isIncomeRoot;
      });
    });
    
    // Debug: Calculate totals by category type for comparison (not used for actual totals)
    // Note: data.total is now net (income - expense), so summing by category type gives net totals
    let incomeByCategoryType = 0;
    let expensesByCategoryType = 0;
    categoryTotals.forEach((data, rootId) => {
      if (data.rootCategoryType === 'income') {
        incomeByCategoryType += data.total; // This is now net, not absolute income
      } else {
        expensesByCategoryType += data.total; // This is now net, not absolute expense
      }
    });
    
    console.log('Transaction processing summary:', {
      totalTransactions: transactions.length,
      processedCount,
      excludedCount,
      exclusionReasons: excludedReasons,
      categoryTotalsCount: categoryTotals.size,
      totalIncome, // Based on transaction sign (positive = income)
      totalExpenses, // Based on transaction sign (negative = expense)
      netAmount: totalIncome - totalExpenses,
      note: 'Totals are calculated by transaction sign, not category type',
      rootTypes: Array.from(categoryTotals.entries()).map(([id, data]) => ({
        rootId: id,
        rootName: data.category.category_name,
        rootCategoryType: data.rootCategoryType,
        incomeTotal: data.incomeTotal,
        expenseTotal: data.expenseTotal
      })),
      incomeByCategoryType, // For reference only - shows what category-based calc would give
      expensesByCategoryType, // For reference only
      netByCategoryType: incomeByCategoryType - expensesByCategoryType // For reference only
    });
    
    // Calculate net (income - expenses)
    const netAmount = totalIncome - totalExpenses;
    const isProfit = netAmount >= 0;
    
    console.log('Income/Expense totals:', {
      totalIncome,
      totalExpenses,
      netAmount,
      isProfit,
      calculation: `${totalIncome} - ${totalExpenses} = ${netAmount}`
    });
    
    // Build Sankey nodes and links
    const nodes = [];
    const links = [];
    const nodeIdToIndex = new Map();
    let nodeIndex = 0;
    
    // Add net income as the source node on the left
    const netIndex = nodeIndex++;
    const netLabel = isProfit 
      ? `Net Income: ${formatCurrency(netAmount)}`
      : `Net Loss: ${formatCurrency(Math.abs(netAmount))}`;
    nodes.push({
      id: 'net',
      name: netLabel,
      value: Math.abs(netAmount), // Use absolute value of net for display
      type: 'source',
      isProfit: isProfit,
      actualNetAmount: netAmount // Store actual value for reference
    });
    nodeIdToIndex.set('net', netIndex);
    
    // Add Income summary node (using actual transaction totals, not category-based)
    // Income flows to both Net Income (what's left) and Expenses (what was spent)
    // Color: green (income category type)
    const incomeSummaryIndex = nodeIndex++;
    nodes.push({
      id: 'income-summary',
      name: `Income: ${formatCurrency(totalIncome)}`,
      value: totalIncome,
      type: 'summary',
      categoryType: 'income',
      isIncomeDescendant: true, // Green color
      rootCategoryType: 'income' // For consistent coloring
    });
    nodeIdToIndex.set('income-summary', incomeSummaryIndex);
    
    // Add Expense summary node (using actual transaction totals, not category-based)
    // Color: red (expense category type)
    const expenseSummaryIndex = nodeIndex++;
    nodes.push({
      id: 'expense-summary',
      name: `Expense: ${formatCurrency(totalExpenses)}`,
      value: totalExpenses,
      type: 'summary',
      categoryType: 'expense',
      isIncomeDescendant: false, // Red color
      rootCategoryType: 'expense' // For consistent coloring
    });
    nodeIdToIndex.set('expense-summary', expenseSummaryIndex);
    
    // Link from Income summary to Net Income (what's left after expenses)
    links.push({
      source: incomeSummaryIndex,
      target: netIndex,
      value: Math.abs(netAmount)
    });
    
    // Link from Income summary to Expense summary (what was spent)
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
      
      // Exclude transfer categories (they net to zero and shouldn't be in income/expense flow)
      const categoryName = (category.category_name || '').toLowerCase();
      if (categoryName.includes('transfer')) {
        return; // Skip transfer categories
      }
      
      // Use rootCategoryType for separation (not category.category_type)
      // This ensures consistent coloring based on root category classification
      const rootCategoryType = data.rootCategoryType || category.category_type || 'expense';
      
      // Separate by root category type (income root = green, expense root = red)
      if (rootCategoryType === 'income') {
        incomeCategories.push({ ...data, rootId });
      } else if (rootCategoryType === 'expense') {
        expenseCategories.push({ ...data, rootId });
      }
      // Transfer type categories are excluded (they net to zero)
    });
    
    console.log('Category separation:', {
      totalCategories: categoryTotals.size,
      incomeCategories: incomeCategories.length,
      expenseCategories: expenseCategories.length,
      incomeCategoryNames: incomeCategories.map(c => c.category.category_name),
      expenseCategoryNames: expenseCategories.map(c => c.category.category_name)
    });
    
    // Sort by absolute net value (largest first) - income first, then expenses
    incomeCategories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    expenseCategories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    
    // Add income category nodes and links first (will appear at top)
    incomeCategories.forEach((data) => {
      const category = data.category;
      const netTotal = data.total; // Net: incomeTotal - expenseTotal
      
      // Skip categories with zero net and no transactions
      if (netTotal === 0 && data.incomeTotal === 0 && data.expenseTotal === 0) return;
      
      // Add parent category node (showing net total)
      const parentNodeId = `income-cat-${data.rootId}`;
      const parentIndex = nodeIndex++;
      nodes.push({
        id: parentNodeId,
        name: `${category.category_name}: ${formatCurrency(netTotal)}`,
        value: Math.abs(netTotal), // Use absolute value for Sankey node size
        type: 'category',
        categoryType: 'income',
        isIncomeDescendant: data.isIncomeRoot === true, // Green if income root
        rootCategoryType: data.rootCategoryType || 'income', // Store root type for coloring
        netTotal: netTotal // Store actual net for reference
      });
      nodeIdToIndex.set(parentNodeId, parentIndex);
      
      // Link from Income summary to income category (use income portion)
      if (data.incomeTotal > 0) {
        links.push({
          source: incomeSummaryIndex,
          target: parentIndex,
          value: data.incomeTotal
        });
      }
      
      // If category has expenses, link from category to expense summary
      if (data.expenseTotal > 0) {
        links.push({
          source: parentIndex,
          target: expenseSummaryIndex,
          value: data.expenseTotal
        });
      }
      
      // Add child category nodes and links
      data.children.forEach((childData, childId) => {
        const childNetTotal = childData.total; // Net: incomeTotal - expenseTotal
        if (childNetTotal === 0 && childData.incomeTotal === 0 && childData.expenseTotal === 0) return;
        
        const childNodeId = `income-child-${childId}`;
        const childIndex = nodeIndex++;
        nodes.push({
          id: childNodeId,
          name: `${childData.category.category_name}: ${formatCurrency(childNetTotal)}`,
          value: Math.abs(childNetTotal), // Use absolute value for Sankey node size
          type: 'subcategory',
          categoryType: 'income',
          isIncomeDescendant: childData.isIncomeDescendant === true, // Green if income root
          rootCategoryType: data.rootCategoryType || 'income', // Inherit root type for coloring
          netTotal: childNetTotal // Store actual net for reference
        });
        nodeIdToIndex.set(childNodeId, childIndex);
        
        // Link from parent to child (use income portion)
        if (childData.incomeTotal > 0) {
          links.push({
            source: parentIndex,
            target: childIndex,
            value: childData.incomeTotal
          });
        }
        
        // If child has expenses, link from child to expense summary
        if (childData.expenseTotal > 0) {
          links.push({
            source: childIndex,
            target: expenseSummaryIndex,
            value: childData.expenseTotal
          });
        }
      });
    });
    
    // Add expense category nodes and links
    expenseCategories.forEach((data) => {
      const category = data.category;
      const netTotal = data.total; // Net: incomeTotal - expenseTotal
      
      // Skip categories with zero net and no transactions
      if (netTotal === 0 && data.incomeTotal === 0 && data.expenseTotal === 0) return;
      
      // Add parent category node (showing net total)
      const parentNodeId = `expense-cat-${data.rootId}`;
      const parentIndex = nodeIndex++;
      nodes.push({
        id: parentNodeId,
        name: `${category.category_name}: ${formatCurrency(netTotal)}`,
        value: Math.abs(netTotal), // Use absolute value for Sankey node size
        type: 'category',
        categoryType: 'expense',
        isIncomeDescendant: data.isIncomeRoot === true, // Red if expense root (false)
        rootCategoryType: data.rootCategoryType || 'expense', // Store root type for coloring
        netTotal: netTotal // Store actual net for reference
      });
      nodeIdToIndex.set(parentNodeId, parentIndex);
      
      // Link from Expense summary to expense category (use expense portion)
      if (data.expenseTotal > 0) {
        links.push({
          source: expenseSummaryIndex,
          target: parentIndex,
          value: data.expenseTotal
        });
      }
      
      // If category has income, link from income summary to category
      if (data.incomeTotal > 0) {
        links.push({
          source: incomeSummaryIndex,
          target: parentIndex,
          value: data.incomeTotal
        });
      }
      
      // Add child category nodes and links
      data.children.forEach((childData, childId) => {
        const childNetTotal = childData.total; // Net: incomeTotal - expenseTotal
        if (childNetTotal === 0 && childData.incomeTotal === 0 && childData.expenseTotal === 0) return;
        
        const childNodeId = `expense-child-${childId}`;
        const childIndex = nodeIndex++;
        nodes.push({
          id: childNodeId,
          name: `${childData.category.category_name}: ${formatCurrency(childNetTotal)}`,
          value: Math.abs(childNetTotal), // Use absolute value for Sankey node size
          type: 'subcategory',
          categoryType: 'expense',
          isIncomeDescendant: childData.isIncomeDescendant === true, // Red if expense root (false)
          rootCategoryType: data.rootCategoryType || 'expense', // Inherit root type for coloring
          netTotal: childNetTotal // Store actual net for reference
        });
        nodeIdToIndex.set(childNodeId, childIndex);
        
        // Link from parent to child (use expense portion)
        if (childData.expenseTotal > 0) {
          links.push({
            source: parentIndex,
            target: childIndex,
            value: childData.expenseTotal
          });
        }
        
        // If child has income, link from income summary to child
        if (childData.incomeTotal > 0) {
          links.push({
            source: incomeSummaryIndex,
            target: childIndex,
            value: childData.incomeTotal
          });
        }
      });
    });
    
    flowData.value = { nodes, links };
    
    // Debug: Check category totals
    const categoryDebug = [];
    categoryTotals.forEach((data, rootId) => {
      categoryDebug.push({
        categoryName: data.category.category_name,
        total: data.total,
        transactionCount: transactions.filter(t => {
          const cat = categoryMap.get(t.category_id);
          if (!cat) return false;
          let root = cat;
          while (root.parent_category_id) {
            root = categoryMap.get(root.parent_category_id);
            if (!root) break;
          }
          return root.category_id === rootId;
        }).length
      });
    });
    
    console.log('Flow data prepared:', {
      totalIncome,
      totalExpenses,
      netAmount,
      dateRange: `${startDate} to ${endDate}`,
      nodeCount: nodes.length,
      linkCount: links.length,
      incomeCategoryCount: incomeCategories.length,
      expenseCategoryCount: expenseCategories.length,
      categoryTotals: categoryDebug.sort((a, b) => b.total - a.total),
      nodes: nodes.map(n => ({ name: n.name, value: n.value, type: n.type })),
      links: links.map(l => ({ 
        source: l.source, 
        target: l.target, 
        value: l.value,
        sourceName: nodes[l.source]?.name,
        targetName: nodes[l.target]?.name
      }))
    });
  } catch (error) {
    console.error('Error loading flow data:', error);
    flowData.value = { nodes: [], links: [] };
  } finally {
    loading.value = false;
  }
};

const getLastDayOfMonth = (year, month) => {
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
};

onMounted(() => {
  loadFlowData();
});
</script>

