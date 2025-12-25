<template>
  <div class="h-full flex flex-col">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading data...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center h-full">
      <div class="text-center text-red-600 dark:text-red-400">
        <p class="text-lg font-medium">{{ error }}</p>
        <button @click="fetchData" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
          Retry
        </button>
      </div>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Filters: Timeframe (compact, at top) -->
      <div class="mb-4">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg px-3 py-2">
          <div class="flex items-center gap-3">
            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Timeframe:</label>
            <div class="flex gap-1.5">
              <button
                v-for="tfOption in timeframeOptions"
                :key="tfOption.value"
                @click="selectedTimeframe = tfOption.value"
                class="px-2 py-1 text-xs font-medium rounded-md transition-colors"
                :class="selectedTimeframe === tfOption.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
              >
                {{ tfOption.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Summary and Chart Side by Side -->
      <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Assets, Liabilities, and Net Balance Summary -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-3 py-3 sm:px-4">
            <h3 class="text-base leading-5 font-medium text-gray-900 dark:text-white mb-3">Financial Summary</h3>
            <div class="grid grid-cols-1 gap-2">
              <!-- Total Assets -->
              <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div class="text-xs font-medium text-green-800 dark:text-green-300 mb-0.5">Total Assets</div>
                <div class="text-xl font-bold text-green-900 dark:text-green-200">
                  {{ formatCurrency(totalAssets) }}
                </div>
                <div class="text-xs text-green-600 dark:text-green-400 mt-0.5">
                  {{ assetAccountCount }} account{{ assetAccountCount !== 1 ? 's' : '' }}
                </div>
              </div>
              
              <!-- Total Liabilities -->
              <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                <div class="text-xs font-medium text-red-800 dark:text-red-300 mb-0.5">Total Liabilities</div>
                <div class="text-xl font-bold text-red-900 dark:text-red-200">
                  {{ formatCurrency(totalLiabilities) }}
                </div>
                <div class="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  {{ liabilityAccountCount }} account{{ liabilityAccountCount !== 1 ? 's' : '' }}
                </div>
              </div>
              
              <!-- Net Balance (Net Worth) -->
              <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
                <div class="text-xs font-medium text-indigo-800 dark:text-indigo-300 mb-0.5">Net Worth</div>
                <div class="text-xl font-bold" :class="netBalance >= 0 ? 'text-indigo-900 dark:text-indigo-200' : 'text-red-900 dark:text-red-200'">
                  {{ formatCurrency(netBalance) }}
                </div>
                <div class="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                  Assets - Liabilities
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Net Balance History Chart -->
        <div>
          <NetBalanceChart :timeframe="selectedTimeframe" />
        </div>
      </div>

      <!-- Account Filter (Collapsible) -->
      <div class="mb-6">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-3 py-2 sm:px-4 flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">Account Filter</h3>
            <button @click="showAccountFilter = !showAccountFilter" class="px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              {{ showAccountFilter ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div v-if="showAccountFilter" class="px-3 pb-3 sm:px-4">
            <!-- Account Filter -->
            <div class="flex items-center space-x-2">
              <div class="relative w-full max-w-xl" @keydown.escape="isAccountDropdownOpen = false">
                <button type="button" @click="isAccountDropdownOpen = !isAccountDropdownOpen" class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 text-sm">
                  <div class="flex flex-wrap gap-1 items-center">
                    <span v-if="selectedAccounts.length === 0" class="text-gray-400 dark:text-gray-400 text-xs">All Accounts</span>
                    <template v-else>
                      <span v-for="acc in selectedAccountObjects" :key="acc.account_id" class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {{ acc.account_name }}
                        <button type="button" @click.stop="removeAccountSelection(acc.account_id)" class="hover:text-indigo-900 dark:hover:text-indigo-200">
                          ✕
                        </button>
                      </span>
                    </template>
                  </div>
                  <svg class="h-3 w-3 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div v-if="isAccountDropdownOpen" class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                  <div class="p-2">
                    <input v-model="accountSearchQuery" type="text" placeholder="Search accounts..." class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800" />
                  </div>
                  <div class="max-h-60 overflow-auto py-1">
                    <button type="button" class="w-full flex items-center justify-between px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700" @click="toggleSelectAllAccounts">
                      <span>Select all</span>
                      <span v-if="isAllAccountsSelected">✓</span>
                    </button>
                    <div v-for="account in filteredAccountOptions" :key="account.account_id" class="px-2 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" @click="toggleAccountSelection(account.account_id)">
                      <input type="checkbox" :checked="isAccountSelected(account.account_id)" class="rounded border-gray-300 dark:border-gray-600" @change.prevent />
                      <span class="text-xs text-gray-800 dark:text-gray-200">{{ account.account_name }}</span>
                    </div>
                    <div v-if="filteredAccountOptions.length === 0" class="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">No results</div>
                  </div>
                  <div class="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" class="px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300" @click="clearSelectedAccounts">Clear</button>
                    <button type="button" class="px-2 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700" @click="isAccountDropdownOpen = false">Done</button>
                  </div>
                </div>
              </div>
              <button @click="clearSelectedAccounts" class="px-2 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 whitespace-nowrap">Clear</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Account Summary Cards Carousel -->
      <div class="mt-6 relative">
        <button
          v-if="accountSummaries && accountSummaries.length > 0"
          @click="goToPrevAccountCard"
          class="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow hover:bg-gray-50"
          aria-label="Previous"
        >
          ‹
        </button>
        <div ref="accountCarouselRef" class="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory px-1">
          <div
            v-for="account in accountSummaries"
            :key="account.account_id"
            class="snap-start shrink-0 w-full md:w-1/2 lg:w-1/3"
            data-card
          >
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg h-full">
              <div class="p-5">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex-1">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ account.account_name }}</h3>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs px-2 py-0.5 rounded-full capitalize"
                        :class="{
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': account.account_class === 'asset',
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': account.account_class === 'liability',
                          'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300': account.account_class === 'equity'
                        }">
                        {{ account.account_class || 'asset' }}
                      </span>
                      <span class="text-xs text-gray-500 dark:text-gray-400 capitalize">{{ account.account_type }}</span>
                    </div>
                  </div>
                </div>
                <div class="space-y-4">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-500 dark:text-gray-400">Current Balance</span>
                    <span class="text-lg font-semibold" :class="account.current_balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ formatCurrency(Math.abs(account.current_balance)) }}
                    </span>
                  </div>
                  
                  <!-- Reconciliation Info -->
                  <div v-if="getActiveReconciliation(account.account_id)" class="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Reconciliation</div>
                    <div class="space-y-2 text-xs">
                      <div class="flex justify-between items-center">
                        <span class="text-gray-500 dark:text-gray-400">Period</span>
                        <span class="text-gray-700 dark:text-gray-300">
                          {{ formatReconciliationDate(getActiveReconciliation(account.account_id).period_start) }} - 
                          {{ formatReconciliationDate(getActiveReconciliation(account.account_id).period_end) }}
                        </span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-500 dark:text-gray-400">Closing Balance</span>
                        <span class="text-gray-700 dark:text-gray-300 font-medium">
                          {{ formatCurrency(getActiveReconciliation(account.account_id).closing_balance || 0) }}
                        </span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-500 dark:text-gray-400">Calculated</span>
                        <span class="text-gray-700 dark:text-gray-300 font-medium">
                          {{ formatCurrency(getActiveReconciliation(account.account_id).calculated_balance || 0) }}
                        </span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-500 dark:text-gray-400">Variance</span>
                        <span 
                          class="font-semibold"
                          :class="{
                            'text-green-600 dark:text-green-400': Math.abs(getActiveReconciliation(account.account_id).variance || 0) < 0.01,
                            'text-yellow-600 dark:text-yellow-400': Math.abs(getActiveReconciliation(account.account_id).variance || 0) >= 0.01 && Math.abs(getActiveReconciliation(account.account_id).variance || 0) < 1.00,
                            'text-red-600 dark:text-red-400': Math.abs(getActiveReconciliation(account.account_id).variance || 0) >= 1.00
                          }"
                        >
                          {{ formatCurrency(getActiveReconciliation(account.account_id).variance || 0) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          v-if="accountSummaries && accountSummaries.length > 0"
          @click="goToNextAccountCard"
          class="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow hover:bg-gray-50"
          aria-label="Next"
        >
          ›
        </button>
      </div>

      <!-- Transactions Section removed (moved to /transactions view) -->
      <!-- Budget vs Actual Section removed -->
    </template>

    <!-- Modals -->
    <div v-if="showTransactionModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ isEditing ? 'Edit Transaction' : 'New Transaction' }}</h3>
          <button @click="closeTransactionModal" class="text-gray-500 hover:text-gray-700 dark:text-gray-300">✕</button>
        </div>
        <div class="grid grid-cols-1 gap-3">
          <input v-model="modalForm.transaction_date" type="date" class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
          <input v-model="modalForm.description" type="text" placeholder="Description" class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
          <input v-model.number="modalForm.amount" type="number" step="0.01" placeholder="Amount" class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
          <select v-model="modalForm.transaction_type" class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700">
            <option value="C">Credit</option>
            <option value="D">Debit</option>
          </select>
          <select v-model="modalForm.account_id" class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700">
            <option v-for="a in accounts" :key="a.account_id" :value="a.account_id">{{ a.account_name }}</option>
          </select>
          <select v-model="modalForm.category_id" class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700">
            <option value="">Uncategorized</option>
            <option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.category_name }}</option>
          </select>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2">
          <button @click="closeTransactionModal" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancel</button>
          <button @click="submitTransactionModal" class="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">{{ isEditing ? 'Save' : 'Create' }}</button>
        </div>
      </div>
    </div>
    <div v-if="showConfirmDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">Delete selected transactions?</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">This will remove {{ selectedTransactionIds.length }} transaction(s) and update affected account balances.</p>
        <div class="flex justify-end gap-2">
          <button @click="showConfirmDelete = false" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancel</button>
          <button @click="performBulkDelete" class="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Dashboard" 
      :components="['NetBalanceChart']"
      :script-blocks="[
        { name: 'useTransactionStore', type: 'store', functions: ['fetchTransactions', 'updateTransaction', 'createTransaction', 'deleteTransaction', 'batchDeleteTransactions', 'getTransactionsByDateRange', 'getIncomeTotalByDateRange', 'getExpenseTotalByDateRange'] },
        { name: 'useAccountStore', type: 'store', functions: ['fetchAccounts', 'getAccountSummaries', 'getTotalBalance'] },
        { name: 'useCategoryStore', type: 'store', functions: ['fetchCategories'] },
        { name: 'useUiStore', type: 'store', functions: ['setSelectedMonth'] },
        { name: 'useAuthStore', type: 'store', functions: [] },
        { name: 'reconciliationAPI', type: 'api', functions: ['getSessions'] }
      ]"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useTransactionStore } from '../stores/transaction';
import { useAccountStore } from '../stores/account';
import { useCategoryStore } from '../stores/category';
import { useUiStore } from '../stores/ui';
import { useAuthStore } from '../stores/auth';
import { reconciliationAPI } from '../lib/http';
import NetBalanceChart from '../components/NetBalanceChart.vue';
import ViewInfo from '../components/ViewInfo.vue';
import { formatDate, daysDifference, compareDates, normalizeAppDateClient } from '../utils/dateUtils';

const transactionStore = useTransactionStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const uiStore = useUiStore();
const authStore = useAuthStore();

// Helper function to parse date in DD/MM/YYYY format
// Removed parseDate - use compareDates from dateUtils instead

const selectedAccounts = ref([]);
const selectedCategory = ref('');
const selectedTimeframe = ref('long'); // 'short', 'mid', 'long' (progressive: short=short only, mid=short+mid, long=short+mid+long)
const startDate = ref('');
const endDate = ref('');
const sortBy = ref('transaction_date');
const sortDir = ref('desc'); // 'asc' | 'desc'
const showAccountFilter = ref(false);
const isAccountDropdownOpen = ref(false);
const accountSearchQuery = ref('');
const accountCarouselRef = ref(null);
const selectedMonth = ref(uiStore.selectedMonth);
const activeReconciliations = ref({}); // Map of account_id -> active session

const timeframeOptions = [
  { label: 'Short', value: 'short' },
  { label: 'Mid', value: 'mid' },
  { label: 'Long', value: 'long' }
];

// Helper function to get allowed timeframes based on progressive filter
// short = short only, mid = short + mid, long = short + mid + long
const getAllowedTimeframes = (timeframe) => {
  if (timeframe === 'short') {
    return ['short'];
  } else if (timeframe === 'mid') {
    return ['short', 'mid'];
  } else if (timeframe === 'long') {
    return ['short', 'mid', 'long'];
  }
  return [];
};

// Build a Set of category ids based on selection:
// - If a parent is selected: include ALL descendants (children, grandchildren, ...), but EXCLUDE the parent itself
// - If a leaf is selected: include only itself
const selectedCategoryIdsSet = computed(() => {
  if (!selectedCategory.value) return null;
  const list = categories.value || [];
  const childrenByParent = new Map();
  for (const cat of list) {
    const parentKey = cat.parent_category_id != null ? String(cat.parent_category_id) : null;
    if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
    childrenByParent.get(parentKey).push(String(cat.category_id));
  }
  const id = String(selectedCategory.value);
  const isParent = (childrenByParent.get(id) || []).length > 0;
  if (!isParent) {
    return new Set([id]);
  }
  // Collect all descendants, excluding the parent itself
  const result = new Set();
  const stack = [...(childrenByParent.get(id) || [])];
  while (stack.length) {
    const childId = stack.pop();
    if (result.has(childId)) continue;
    result.add(childId);
    const kids = childrenByParent.get(childId) || [];
    for (const k of kids) stack.push(k);
  }
  return result;
});

const scrollAccountCarouselBy = (direction) => {
  const container = accountCarouselRef.value;
  if (!container) return;
  const firstCard = container.querySelector('[data-card]');
  const gapPx = 24; // matches gap-6 (1.5rem)
  const cardWidth = firstCard ? firstCard.offsetWidth + gapPx : container.clientWidth;
  container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
};

const goToPrevAccountCard = () => scrollAccountCarouselBy(-1);
const goToNextAccountCard = () => scrollAccountCarouselBy(1);

const toggleSort = (key) => {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortDir.value = key === 'transaction_date' ? 'desc' : 'asc';
  }
};

const accounts = computed(() => accountStore.accounts);
const categories = computed(() => categoryStore.categories);
const transactions = computed(() => transactionStore.transactions);
const isLoading = computed(() => transactionStore.loading || accountStore.loading || categoryStore.loading);
const error = computed(() => transactionStore.error || accountStore.error || categoryStore.error);

// No date range: load everything once (and on mount)

const fetchData = async () => {
  try {
    // Fetch accounts, categories, and transactions
    await Promise.all([
      accountStore.fetchAccounts(),
      categoryStore.fetchCategories()
    ]);
    
    // Fetch all transactions (no date filtering)
    await transactionStore.fetchTransactions();
    
    // Fetch active reconciliation sessions
    await fetchActiveReconciliations();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

const fetchActiveReconciliations = async () => {
  try {
    // Fetch all active (non-closed) reconciliation sessions
    const response = await reconciliationAPI.getSessions({ closedOnly: false });
    const sessions = response.data || [];
    
    // Filter to only active (non-closed) sessions and create a map by account_id
    const activeSessionsMap = {};
    sessions.forEach(session => {
      if (!session.closed && session.account_id) {
        // If multiple active sessions exist for an account, use the most recent one
        const existing = activeSessionsMap[session.account_id];
        if (!existing || compareDates(session.run_started, existing.run_started) > 0) {
          activeSessionsMap[session.account_id] = session;
        }
      }
    });
    
    activeReconciliations.value = activeSessionsMap;
  } catch (error) {
    console.error('Error fetching active reconciliations:', error);
    activeReconciliations.value = {};
  }
};

const getActiveReconciliation = (accountId) => {
  return activeReconciliations.value[accountId] || null;
};

const formatReconciliationDate = (dateString) => {
  if (!dateString) return '';
  // Use date utils for formatting
  return formatDate(dateString);
};

// Filter transactions using store getters (single source of truth)
const filteredTransactions = computed(() => {
  // Start with date-filtered transactions from store
  let filtered = transactionStore.getTransactionsByDateRange(
    startDate.value || null,
    endDate.value || null
  );

  // Apply progressive timeframe filter via accounts
  // NULL timeframe accounts are included in all filters (uncategorized accounts)
  const allowedTimeframes = getAllowedTimeframes(selectedTimeframe.value);
  if (allowedTimeframes.length > 0) {
    const accountsByTimeframe = accounts.value.filter(a => {
      // Include accounts with matching timeframe, or NULL accounts (uncategorized)
      return allowedTimeframes.includes(a.timeframe) || 
             (a.timeframe === null || a.timeframe === undefined);
    });
    const timeframeAccountIds = new Set(accountsByTimeframe.map(a => String(a.account_id)));
    filtered = filtered.filter(t => timeframeAccountIds.has(String(t.account_id)));
  }

  // Apply account filter if selected
  const hasAccountFilter = Array.isArray(selectedAccounts.value) && selectedAccounts.value.length > 0;
  if (hasAccountFilter) {
    const selectedIdsSet = new Set(selectedAccounts.value.map((id) => String(id)));
    filtered = filtered.filter(t => selectedIdsSet.has(String(t.account_id)));
  }

  // Apply category filter if selected
  if (selectedCategoryIdsSet.value) {
    filtered = filtered.filter(t => selectedCategoryIdsSet.value.has(String(t.category_id)));
  }

  // Sort
  const multiplier = sortDir.value === 'asc' ? 1 : -1;
  return filtered.slice().sort((a, b) => {
    const key = sortBy.value;
    if (key === 'signed_amount') {
      const av = parseFloat(a.signed_amount) || 0;
      const bv = parseFloat(b.signed_amount) || 0;
      return (av - bv) * multiplier;
    }
    if (key === 'transaction_date') {
      const dateA = normalizeAppDateClient(a.transaction_date, 'api-to-domain') || '0000-00-00';
      const dateB = normalizeAppDateClient(b.transaction_date, 'api-to-domain') || '0000-00-00';
      return compareDates(dateA, dateB) * multiplier;
    }
    const av = String(a[key] || '').toLowerCase();
    const bv = String(b[key] || '').toLowerCase();
    if (av < bv) return -1 * multiplier;
    if (av > bv) return 1 * multiplier;
    return 0;
  });
});

const clearDateRange = () => {
  startDate.value = '';
  endDate.value = '';
};

// removed subtotal feature

// Get account summaries from store (single source of truth)
const accountSummaries = computed(() => {
  const summaries = accountStore.getAccountSummaries;
  
  // Apply progressive timeframe filter
  // NULL timeframe accounts are included in all filters (uncategorized accounts)
  let filtered = summaries;
  const allowedTimeframes = getAllowedTimeframes(selectedTimeframe.value);
  if (allowedTimeframes.length > 0) {
    filtered = filtered.filter(a => {
      // Include accounts with matching timeframe, or NULL accounts (uncategorized)
      return allowedTimeframes.includes(a.timeframe) || 
             (a.timeframe === null || a.timeframe === undefined);
    });
  }
  
  // Apply account filter if selected
  const hasAccountFilter = Array.isArray(selectedAccounts.value) && selectedAccounts.value.length > 0;
  if (hasAccountFilter) {
    const selectedIdsSet = new Set(selectedAccounts.value.map((id) => String(id)));
    filtered = filtered.filter(a => selectedIdsSet.has(String(a.account_id)));
  }
  
  return filtered;
});

// Get total balance from store (single source of truth)
const totalBalance = computed(() => {
  return accountStore.getTotalBalance;
});

// Calculate total assets (sum of balances for asset accounts)
// Assets should always be >= 0 (negative balances are overdrawn, treat as 0 for net worth)
const totalAssets = computed(() => {
  if (!accounts.value || accounts.value.length === 0) return 0;
  let filtered = accounts.value.filter(account => account.account_class === 'asset');
  
  // Apply progressive timeframe filter
  // NULL timeframe accounts are included in all filters (uncategorized accounts)
  const allowedTimeframes = getAllowedTimeframes(selectedTimeframe.value);
  if (allowedTimeframes.length > 0) {
    filtered = filtered.filter(account => {
      // Include accounts with matching timeframe, or NULL accounts (uncategorized)
      return allowedTimeframes.includes(account.timeframe) || 
             (account.timeframe === null || account.timeframe === undefined);
    });
  }
  
  return filtered.reduce((sum, account) => {
    const balance = Math.max(0, parseFloat(account.current_balance) || 0);
    return sum + balance;
  }, 0);
});

// Calculate total liabilities (sum of balances for liability accounts)
// Note: Liabilities are stored as negative values in the database
const totalLiabilities = computed(() => {
  if (!accounts.value || accounts.value.length === 0) return 0;
  let filtered = accounts.value.filter(account => account.account_class === 'liability');
  
  // Apply progressive timeframe filter
  // NULL timeframe accounts are included in all filters (uncategorized accounts)
  const allowedTimeframes = getAllowedTimeframes(selectedTimeframe.value);
  if (allowedTimeframes.length > 0) {
    filtered = filtered.filter(account => {
      // Include accounts with matching timeframe, or NULL accounts (uncategorized)
      return allowedTimeframes.includes(account.timeframe) || 
             (account.timeframe === null || account.timeframe === undefined);
    });
  }
  
  const sum = filtered.reduce((sum, account) => sum + (parseFloat(account.current_balance) || 0), 0);
  // Return absolute value for display (since stored as negative)
  return Math.abs(sum);
});

// Calculate net balance (Net Worth = Assets + Liabilities)
// Since liabilities are stored as negative, we add them: Assets + (-Liabilities) = Assets - |Liabilities|
// Assets should always be >= 0 (negative balances are overdrawn, treat as 0 for net worth)
const netBalance = computed(() => {
  if (!accounts.value || accounts.value.length === 0) return 0;
  
  // Apply progressive timeframe filter
  // NULL timeframe accounts are included in all filters (uncategorized accounts)
  let filteredAccounts = accounts.value;
  const allowedTimeframes = getAllowedTimeframes(selectedTimeframe.value);
  if (allowedTimeframes.length > 0) {
    filteredAccounts = filteredAccounts.filter(account => {
      // Include accounts with matching timeframe, or NULL accounts (uncategorized)
      return allowedTimeframes.includes(account.timeframe) || 
             (account.timeframe === null || account.timeframe === undefined);
    });
  }
  
  const assets = filteredAccounts
    .filter(account => account.account_class === 'asset')
    .reduce((sum, account) => {
      const balance = Math.max(0, parseFloat(account.current_balance) || 0);
      return sum + balance;
    }, 0);
  const liabilities = filteredAccounts
    .filter(account => account.account_class === 'liability')
    .reduce((sum, account) => sum + (parseFloat(account.current_balance) || 0), 0);
  // Liabilities are negative, so adding them gives: Assets + Liabilities = Assets - |Liabilities|
  return assets + liabilities;
});

// Count asset accounts
const assetAccountCount = computed(() => {
  if (!accounts.value || accounts.value.length === 0) return 0;
  return accounts.value.filter(account => account.account_class === 'asset').length;
});

// Count liability accounts
const liabilityAccountCount = computed(() => {
  if (!accounts.value || accounts.value.length === 0) return 0;
  return accounts.value.filter(account => account.account_class === 'liability').length;
});

// Get total income from store using date range (single source of truth)
const totalIncome = computed(() => {
  return transactionStore.getIncomeTotalByDateRange(
    startDate.value || null,
    endDate.value || null
  );
});

// Get total expenses from store using date range (single source of truth)
const totalExpenses = computed(() => {
  return transactionStore.getExpenseTotalByDateRange(
    startDate.value || null,
    endDate.value || null
  );
});

// Days in selected range (inclusive). Used for simple weekly average formula.
const daysInRange = computed(() => {
  if (!startDate.value || !endDate.value) return 0;
  const diff = daysDifference(startDate.value, endDate.value);
  if (diff === null || diff < 0) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
});

// Average Weekly = (Total in range / days) * 7
const avgWeeklyIncome = computed(() => {
  if (!daysInRange.value) return 0;
  return (totalIncome.value / daysInRange.value) * 7;
});

const avgWeeklyExpenses = computed(() => {
  if (!daysInRange.value) return 0;
  return (totalExpenses.value / daysInRange.value) * 7;
});

// Net = income average - expense average (do not recalc)
const netAvgWeekly = computed(() => {
  return avgWeeklyIncome.value - avgWeeklyExpenses.value;
});

// formatDate is now imported from dateUtils

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};


const clearSelectedAccounts = () => {
  selectedAccounts.value = [];
};

const selectedAccountObjects = computed(() => {
  const byId = new Map(accounts.value.map(a => [String(a.account_id), a]));
  return selectedAccounts.value
    .map(id => byId.get(String(id)))
    .filter(Boolean);
});

const isAccountSelected = (id) => {
  return selectedAccounts.value.map(String).includes(String(id));
};

const toggleAccountSelection = (id) => {
  const idStr = String(id);
  const asStr = selectedAccounts.value.map(String);
  if (asStr.includes(idStr)) {
    selectedAccounts.value = selectedAccounts.value.filter(aid => String(aid) !== idStr);
  } else {
    selectedAccounts.value = [...selectedAccounts.value, id];
  }
};

const removeAccountSelection = (id) => {
  const idStr = String(id);
  selectedAccounts.value = selectedAccounts.value.filter(aid => String(aid) !== idStr);
};

const filteredAccountOptions = computed(() => {
  const q = accountSearchQuery.value.trim().toLowerCase();
  if (!q) return accounts.value || [];
  return (accounts.value || []).filter(a => (a.account_name || '').toLowerCase().includes(q));
});

const isAllAccountsSelected = computed(() => {
  return accounts.value && selectedAccounts.value && selectedAccounts.value.length > 0 && selectedAccounts.value.length === accounts.value.length;
});

const toggleSelectAllAccounts = () => {
  if (!accounts.value) return;
  if (isAllAccountsSelected.value) {
    selectedAccounts.value = [];
  } else {
    selectedAccounts.value = accounts.value.map(a => a.account_id);
  }
};

const isParentCategory = (categoryId) => {
  const idStr = String(categoryId);
  const list = categories.value || [];
  return list.some(cat => String(cat.parent_category_id) === idStr);
};

const getCategoryOptionLabel = (category) => {
  const isParent = isParentCategory(category.category_id);
  // Use a compact parking-style icon for parent categories. Works inside <option> text.
  const parentIcon = '🅿';
  return isParent ? `${parentIcon} ${category.category_name}` : category.category_name;
};

// Debounced fetch function to prevent cascading API calls
let fetchDataTimeout = null;
const debouncedFetchData = async () => {
  if (fetchDataTimeout) {
    clearTimeout(fetchDataTimeout);
  }
  fetchDataTimeout = setTimeout(async () => {
    await fetchData();
  }, 300); // 300ms debounce
};

// Initial data fetch
onMounted(async () => {
  await fetchData();
});

// Debounced watchers to prevent cascading API calls
watch(() => selectedMonth.value, async () => {
  await debouncedFetchData();
  uiStore.setSelectedMonth(selectedMonth.value);
});

// Transactions selection and modal state
const selectedTransactionIds = ref([]);
const showTransactionModal = ref(false);
const isEditing = ref(false);
const modalForm = ref({
  transaction_id: null,
  transaction_date: '',
  description: '',
  amount: 0,
  transaction_type: 'D',
  account_id: '',
  category_id: ''
});
const showConfirmDelete = ref(false);

const allVisibleSelected = computed(() => {
  if (!filteredTransactions.value || filteredTransactions.value.length === 0) return false;
  const ids = new Set(selectedTransactionIds.value);
  return filteredTransactions.value.every(t => ids.has(t.transaction_id));
});

const toggleSelectAllVisible = (evt) => {
  if (evt.target.checked) {
    const ids = filteredTransactions.value.map(t => t.transaction_id);
    const set = new Set([...selectedTransactionIds.value, ...ids]);
    selectedTransactionIds.value = Array.from(set);
  } else {
    const visible = new Set(filteredTransactions.value.map(t => t.transaction_id));
    selectedTransactionIds.value = selectedTransactionIds.value.filter(id => !visible.has(id));
  }
};

const openCreateModal = () => {
  isEditing.value = false;
  modalForm.value = {
    transaction_id: null,
    transaction_date: '',
    description: '',
    amount: 0,
    transaction_type: 'D',
    account_id: accounts.value[0]?.account_id || '',
    category_id: ''
  };
  showTransactionModal.value = true;
};

const openEditModal = (transaction) => {
  isEditing.value = true;
  modalForm.value = {
    transaction_id: transaction.transaction_id,
    transaction_date: transaction.transaction_date.includes('/') ? transaction.transaction_date.split('/').reverse().join('-') : transaction.transaction_date,
    description: transaction.description || '',
    amount: Number(transaction.amount) || Math.abs(Number(transaction.signed_amount) || 0),
    transaction_type: Number(transaction.signed_amount) >= 0 ? 'C' : 'D',
    account_id: transaction.account_id,
    category_id: transaction.category_id || ''
  };
  showTransactionModal.value = true;
};

const closeTransactionModal = () => {
  showTransactionModal.value = false;
};

const submitTransactionModal = async () => {
  const payload = { ...modalForm.value };
  if (isEditing.value) {
    const id = payload.transaction_id;
    delete payload.transaction_id;
    await transactionStore.updateTransaction(id, payload);
  } else {
    await transactionStore.createTransaction(payload);
  }
  showTransactionModal.value = false;
};

const confirmBulkDelete = () => {
  showConfirmDelete.value = true;
};

const performBulkDelete = async () => {
  const ids = [...selectedTransactionIds.value];
  if (ids.length === 1) {
    await transactionStore.deleteTransaction(ids[0]);
  } else if (ids.length > 1) {
    await transactionStore.batchDeleteTransactions(ids);
  }
  selectedTransactionIds.value = [];
  showConfirmDelete.value = false;
};
</script>