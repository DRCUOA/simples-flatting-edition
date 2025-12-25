<template>
  <div class="h-full flex flex-col p-4" @keydown="handleKeydown" tabindex="0">
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg h-full flex flex-col">
      <div class="sticky top-20 z-10 px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="flex items-center justify-between gap-4 mb-4">
          <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Transactions</h3>
          <div class="flex gap-2">
            <button @click="openGemModal" class="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">GEM Entry</button>
            <button @click="openCreateModal" class="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">New Transaction</button>
          </div>
        </div>
        
        <!-- Simplified Filters -->
        <div class="flex flex-wrap gap-3 items-center">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search..." 
            class="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <select v-model="selectedCategory" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700">
            <option value="">All Categories</option>
            <option value="__uncategorized__">Uncategorized</option>
            <option v-for="category in categories" :key="category.category_id" :value="category.category_id">
              {{ getCategoryOptionLabel(category) }}
            </option>
          </select>
          <select v-model="selectedAccount" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700">
            <option value="">All Accounts</option>
            <option v-for="account in accounts" :key="account.account_id" :value="account.account_id">
              {{ account.account_name }}
            </option>
          </select>
          <input type="date" v-model="startDate" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
          <input type="date" v-model="endDate" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700" />
          <button 
            v-if="hasActiveFilters" 
            @click="clearAllFilters" 
            class="px-3 py-2 text-sm rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            title="Clear all filters"
          >
            Clear
          </button>
        </div>
        
        <!-- Keyboard Shortcuts Hint -->
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span class="font-medium">Keyboard shortcuts:</span>
          <span class="ml-2">⌘/Ctrl + ↑↓ to select</span>
          <span class="ml-2">Shift + ↑↓ for range</span>
          <span class="ml-2">⌘/Ctrl + A for all</span>
          <span class="ml-2">Esc to clear</span>
        </div>
        
        <!-- Simplified Summary -->
        <div class="mt-4 flex flex-wrap gap-4 text-sm">
          <div class="text-gray-600 dark:text-gray-400">
            <span class="font-medium text-gray-900 dark:text-white">{{ filteredTransactions.length }}</span>
            <span v-if="hasActiveFilters" class="text-gray-500"> of {{ transactions.length }}</span>
            <span> transactions</span>
          </div>
          <div class="text-gray-600 dark:text-gray-400">
            Net: 
            <span :class="totalFilteredNet >= 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'">
              {{ totalFilteredNet >= 0 ? '+' : '' }}{{ formatCurrency(totalFilteredNet) }}
            </span>
          </div>
          <div 
            v-if="selectedTransactionIds.length > 0" 
            class="text-gray-600 dark:text-gray-400"
          >
            Selected: 
            <span :class="totalSelectedNet >= 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'">
              {{ totalSelectedNet >= 0 ? '+' : '' }}{{ formatCurrency(totalSelectedNet) }}
            </span>
          </div>
        </div>
      </div>

      <div class="overflow-auto" style="max-height: calc(100vh - 240px);">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
            <tr>
              <th scope="col" class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                <input type="checkbox" :checked="allVisibleSelected" @change="toggleSelectAllVisible($event)" class="cursor-pointer" />
              </th>
              <th @click="toggleSort('transaction_date')" scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600">
                Date
                <span v-if="sortBy === 'transaction_date'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('description')" scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600">
                Description
                <span v-if="sortBy === 'description'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('category_name')" scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 hidden lg:table-cell">
                Category
                <span v-if="sortBy === 'category_name'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th @click="toggleSort('account_name')" scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 hidden lg:table-cell">
                Account
                <span v-if="sortBy === 'account_name'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th scope="col" class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell w-24">
                Status
              </th>
              <th @click="toggleSort('signed_amount')" scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600">
                Amount
                <span v-if="sortBy === 'signed_amount'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
            </tr>
          </thead>
          <tbody v-if="filteredTransactions.length > 0" class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr 
              v-for="(transaction, index) in filteredTransactions" 
              :key="transaction.transaction_id" 
              :class="[
                'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                activeTransactionIndex === index ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400' : '',
                isTransactionSelected(transaction.transaction_id) && activeTransactionIndex !== index ? 'bg-blue-100 dark:bg-blue-900/30' : ''
              ]"
              @click="setActiveTransaction(index)"
            >
              <td class="px-3 py-4">
                <input 
                  type="checkbox" 
                  :value="transaction.transaction_id" 
                  v-model="selectedTransactionIds"
                  class="cursor-pointer"
                />
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(transaction.transaction_date) }}
              </td>
              <td class="px-4 py-4 text-sm">
                <div class="flex items-start gap-2">
                  <button 
                    @click.stop="openEditModal(transaction)" 
                    class="flex-shrink-0 mt-0.5 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  >
                    Edit
                  </button>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 dark:text-white break-words flex items-center gap-2">
                      <span>{{ transaction.description || 'No description' }}</span>
                      <span 
                        v-if="transaction.has_reconciliation_match" 
                        class="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-red-700"
                        title="This transaction is matched/locked for reconciliation purposes"
                      >
                        Matched
                      </span>
                    </div>
                    <div class="lg:hidden mt-1.5 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span>{{ transaction.category_name || 'Uncategorized' }}</span>
                        <span class="text-gray-300 dark:text-gray-600">•</span>
                        <span>{{ transaction.account_name || 'Unknown Account' }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span 
                          v-if="transaction.has_reconciliation_match" 
                          class="inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700"
                          title="This transaction is matched/locked for reconciliation purposes"
                        >
                          🔒 LOCKED
                        </span>
                        <span 
                          v-if="transaction.is_reconciled" 
                          class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        >
                          ✓ Reconciled
                        </span>
                        <span 
                          v-else-if="!transaction.has_reconciliation_match" 
                          class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        >
                          Unreconciled
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                {{ transaction.category_name || 'Uncategorized' }}
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                {{ transaction.account_name || 'Unknown Account' }}
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-center hidden lg:table-cell">
                <div class="flex items-center justify-center gap-1.5">
                  <span 
                    v-if="transaction.has_reconciliation_match" 
                    class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700"
                    title="This transaction is matched/locked for reconciliation purposes"
                  >
                    🔒
                  </span>
                  <span 
                    v-if="transaction.is_reconciled" 
                    class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                    :title="transaction.reconciled_at ? `Reconciled on ${formatDate(transaction.reconciled_at)}` : 'Reconciled'"
                  >
                    ✓
                  </span>
                  <span 
                    v-else-if="!transaction.has_reconciliation_match" 
                    class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"
                  >
                    —
                  </span>
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-right font-medium" :class="transaction.signed_amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ transaction.signed_amount >= 0 ? '+' : '' }}{{ formatCurrency(Math.abs(parseFloat(transaction.signed_amount) || 0)) }}
              </td>
            </tr>
          </tbody>
          <tbody v-else class="bg-white dark:bg-gray-800">
            <tr>
              <td colspan="7" class="px-3 py-3 md:px-6 md:py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                <span v-if="transactions.length === 0">
                  No transactions found
                </span>
                <span v-else>
                  No transactions match the current filters
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-between items-center bg-gray-50 dark:bg-gray-800/50">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          <span v-if="selectedTransactionIds.length > 0">
            {{ selectedTransactionIds.length }} selected
          </span>
          <span v-else class="text-gray-400 dark:text-gray-500">
            Select transactions to perform bulk actions
          </span>
        </div>
        <div class="flex gap-2 items-center">
          <div class="flex items-center gap-2">
            <select 
              v-model="bulkCategoryId" 
              :disabled="selectedTransactionIds.length === 0"
              @change="handleBulkCategoryChange"
              class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select category...</option>
              <option value="__uncategorized__">Uncategorized</option>
              <option value="__add__">+ Add new category…</option>
              <option v-for="category in categories" :key="category.category_id" :value="category.category_id">
                {{ getCategoryOptionLabel(category) }}
              </option>
            </select>
            <button 
              :disabled="selectedTransactionIds.length === 0 || !bulkCategoryId" 
              @click="assignCategoryToSelected" 
              class="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 transition-colors"
            >
              Assign Category
            </button>
          </div>
          <button 
            :disabled="selectedTransactionIds.length === 0" 
            @click="confirmBulkDelete" 
            class="px-4 py-2 text-sm rounded-md border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          >
            Delete Selected
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <div v-if="showTransactionModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ isEditing ? 'Edit Transaction' : 'New Transaction' }}</h3>
          </div>
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
          <select v-model="modalForm.category_id" @change="handleModalCategoryChange" class="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700">
            <option value="">Uncategorized</option>
            <option value="__add__">+ Add new category…</option>
            <option v-for="c in categories" :key="c.category_id" :value="c.category_id">{{ c.category_name }}</option>
          </select>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">Status</label>
              <select v-model="modalForm.posted_status" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="posted">Posted</option>
              </select>
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" v-model="modalForm.is_transfer" class="rounded border-gray-300 dark:border-gray-600">
                <span>Is Transfer</span>
              </label>
            </div>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2">
          <button 
            @click="closeTransactionModal" 
            class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button 
            @click="submitTransactionModal" 
            class="px-3 py-2 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            {{ isEditing ? 'Save Changes' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Category Modal -->
    <div v-if="showCategoryModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ categoryEditId ? 'Edit Category' : 'Add Category' }}</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input v-model="categoryForm.category_name" type="text" class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Parent</label>
            <select v-model="categoryForm.parent_category_id" class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white">
              <option value="">None</option>
              <option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">{{ cat.category_name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Budgeted Amount</label>
            <input v-model.number="categoryForm.budgeted_amount" type="number" step="0.01" class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white" />
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button @click="closeCategoryModal" class="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancel</button>
          <button @click="saveCategory" class="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
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
    
    <div v-if="showReconciliationConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-4">
        <h3 class="text-lg font-medium text-yellow-600 dark:text-yellow-400 mb-3">⚠️ Reconciliation Matches Found</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          The selected transaction(s) have reconciliation matches. To delete them, you must first delete the reconciliation matches.
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium">
          This will permanently remove the reconciliation matches and then delete the transaction(s). This action cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
          <button @click="showReconciliationConfirm = false" class="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancel</button>
          <button @click="performBulkDeleteWithMatches" class="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">Delete Matches & Transactions</button>
        </div>
      </div>
    </div>
    
    <!-- GEM Transaction Modal -->
    <GemTransactionModal :show="showGemModal" @close="closeGemModal" />
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Transactions" 
      :components="[]"
      :script-blocks="[
        { name: 'useTransactionStore', type: 'store', functions: ['fetchTransactions', 'updateTransaction', 'createTransaction', 'deleteTransaction', 'batchDeleteTransactions', 'batchUpdateTransactions', 'getTransactionTotalByDateRange', 'getExpenseTotalByDateRange', 'getIncomeTotalByDateRange'] },
        { name: 'useAccountStore', type: 'store', functions: ['fetchAccounts'] },
        { name: 'useCategoryStore', type: 'store', functions: ['fetchCategories', 'createCategory', 'updateCategory'] }
      ]"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useTransactionStore } from '../stores/transaction';
import { useAccountStore } from '../stores/account';
import { useCategoryStore } from '../stores/category';
import ViewInfo from '../components/ViewInfo.vue';
import GemTransactionModal from '../components/GemTransactionModal.vue';
import { formatDate, normalizeAppDateClient, daysDifference, compareDates } from '../utils/dateUtils';
const transactionStore = useTransactionStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();

const accounts = computed(() => accountStore.accounts);
const categories = computed(() => categoryStore.categories);
const transactions = computed(() => transactionStore.transactions);

const isLoading = computed(() => transactionStore.loading || accountStore.loading || categoryStore.loading);
const error = computed(() => transactionStore.error || accountStore.error || categoryStore.error);

const selectedCategory = ref('');
const selectedAccount = ref('');
const startDate = ref('');
const endDate = ref('');
const searchQuery = ref('');
const sortBy = ref('transaction_date');
const sortDir = ref('desc');
const bulkCategoryId = ref('');
const activeTransactionIndex = ref(-1);
const lastSelectedIndex = ref(-1);

// Filter state

const filteredTransactions = computed(() => {
  const filtered = transactions.value.filter(transaction => {
    // Handle category filter including uncategorized option
    let categoryMatch = true;
    if (selectedCategory.value) {
      if (selectedCategory.value === '__uncategorized__') {
        // Match transactions with null or empty category_id
        categoryMatch = !transaction.category_id || transaction.category_id === null || transaction.category_id === '';
      } else {
        // Match transactions with the selected category (including parent/child logic)
        categoryMatch = getCategoryIdsToMatch.value && getCategoryIdsToMatch.value.has(String(transaction.category_id));
      }
    }
    const accountMatch = !selectedAccount.value || String(transaction.account_id) === String(selectedAccount.value);
    
    // Use string comparison for dates (YYYY-MM-DD format) to avoid timezone issues
    const trxDate = normalizeAppDateClient(transaction.transaction_date, 'api-to-domain');
    const start = startDate.value ? normalizeAppDateClient(startDate.value, 'api-to-domain') : null;
    const end = endDate.value ? normalizeAppDateClient(endDate.value, 'api-to-domain') : null;
    
    const afterStart = !start || !trxDate || trxDate >= start;
    const beforeEnd = !end || !trxDate || trxDate <= end;
    const searchMatch = !searchQuery.value || (() => {
      try {
        const regex = new RegExp(searchQuery.value, 'i');
        return regex.test(transaction.description || '') ||
               regex.test(transaction.category_name || '') ||
               regex.test(transaction.account_name || '') ||
               regex.test(String(transaction.signed_amount || ''));
      } catch (e) {
        // If regex is invalid, fall back to simple string search
        const query = searchQuery.value.toLowerCase();
        return (transaction.description || '').toLowerCase().includes(query) ||
               (transaction.category_name || '').toLowerCase().includes(query) ||
               (transaction.account_name || '').toLowerCase().includes(query) ||
               String(transaction.signed_amount || '').includes(query);
      }
    })();
    return categoryMatch && accountMatch && afterStart && beforeEnd && searchMatch;
  });
  const multiplier = sortDir.value === 'asc' ? 1 : -1;
  return filtered.slice().sort((a, b) => {
    const key = sortBy.value;
    if (key === 'signed_amount') {
      const av = parseFloat(a.signed_amount) || 0;
      const bv = parseFloat(b.signed_amount) || 0;
      return (av - bv) * multiplier;
    }
    if (key === 'transaction_date') {
      // Use date utils for comparison - dates are already in YYYY-MM-DD format
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

// Use store getters for all calculations (single source of truth)
const totalFilteredNet = computed(() => {
  return transactionStore.getTransactionTotalByDateRange(startDate.value || null, endDate.value || null);
});

const totalFilteredDebit = computed(() => {
  return transactionStore.getExpenseTotalByDateRange(startDate.value || null, endDate.value || null);
});

const totalFilteredCredit = computed(() => {
  return transactionStore.getIncomeTotalByDateRange(startDate.value || null, endDate.value || null);
});


const selectedSet = computed(() => new Set(selectedTransactionIds.value));
const totalSelectedNet = computed(() => {
  // Calculate total for selected transactions only
  const selectedTransactions = filteredTransactions.value.filter(t => selectedSet.value.has(t.transaction_id));
  return selectedTransactions.reduce((sum, t) => sum + (Number(t.signed_amount) || 0), 0);
});

const rangeDays = computed(() => {
  if (!startDate.value || !endDate.value) return 0;
  const diff = daysDifference(startDate.value, endDate.value);
  if (diff === null || diff < 0) return 0;
  return diff + 1; // +1 to include both start and end dates
});

const avgWeeklyNet = computed(() => {
  const days = rangeDays.value;
  if (!days) return 0;
  return (totalFilteredNet.value / days) * 7;
});

const avgMonthlyNet = computed(() => {
  const days = rangeDays.value;
  if (!days) return 0;
  // Approximate average month = days/30.44
  return (totalFilteredNet.value / days) * 30.44;
});

// Balance calculation logic - account-based
const transactionsWithBalances = computed(() => {
  // Group transactions by account
  const transactionsByAccount = {};
  
  transactions.value.forEach(transaction => {
    const accountId = transaction.account_id;
    if (!transactionsByAccount[accountId]) {
      transactionsByAccount[accountId] = [];
    }
    transactionsByAccount[accountId].push(transaction);
  });

  // Calculate running balances for each account
  const accountBalances = {};
  
  Object.keys(transactionsByAccount).forEach(accountId => {
    const account = accounts.value.find(acc => acc.account_id === accountId);
    if (!account) return;
    
    // Start with the account's current balance
    let runningBalance = Number(account.current_balance) || 0;
    
    // Sort transactions for this account by date (ascending) and then by transaction_id
    const sortedAccountTransactions = [...transactionsByAccount[accountId]].sort((a, b) => {
      const dateA = normalizeAppDateClient(a.transaction_date, 'api-to-domain') || '0000-00-00';
      const dateB = normalizeAppDateClient(b.transaction_date, 'api-to-domain') || '0000-00-00';
      const dateDiff = compareDates(dateA, dateB);
      if (dateDiff !== 0) return dateDiff;
      return (a.transaction_id || 0) - (b.transaction_id || 0);
    });
    
    // Calculate running balances backwards from current balance
    const transactionsWithAccountBalances = [];
    for (let i = sortedAccountTransactions.length - 1; i >= 0; i--) {
      const transaction = sortedAccountTransactions[i];
      const amount = Number(transaction.signed_amount) || 0;
      const balanceAfter = runningBalance;
      runningBalance -= amount; // Go backwards
      const balanceBefore = runningBalance;
      
      transactionsWithAccountBalances.unshift({
        ...transaction,
        balanceBefore,
        balanceAfter
      });
    }
    
    accountBalances[accountId] = transactionsWithAccountBalances;
  });

  // Flatten all transactions back into a single array, maintaining chronological order
  const allTransactions = [];
  Object.values(accountBalances).forEach(accountTransactions => {
    allTransactions.push(...accountTransactions);
  });
  
  // Sort all transactions by date (ascending) and then by transaction_id
  return allTransactions.sort((a, b) => {
    const dateA = normalizeAppDateClient(a.transaction_date, 'api-to-domain') || '0000-00-00';
    const dateB = normalizeAppDateClient(b.transaction_date, 'api-to-domain') || '0000-00-00';
    const dateDiff = compareDates(dateA, dateB);
    if (dateDiff !== 0) return dateDiff;
    return (a.transaction_id || 0) - (b.transaction_id || 0);
  });
});

const getBalanceBefore = (transaction) => {
  const transactionWithBalance = transactionsWithBalances.value.find(t => t.transaction_id === transaction.transaction_id);
  return transactionWithBalance ? transactionWithBalance.balanceBefore : 0;
};

const getBalanceAfter = (transaction) => {
  const transactionWithBalance = transactionsWithBalances.value.find(t => t.transaction_id === transaction.transaction_id);
  return transactionWithBalance ? transactionWithBalance.balanceAfter : 0;
};

const clearDateRange = () => {
  startDate.value = '';
  endDate.value = '';
};

const clearSearch = () => {
  searchQuery.value = '';
};

const hasActiveFilters = computed(() => {
  return selectedCategory.value || selectedAccount.value || startDate.value || endDate.value || searchQuery.value;
});

const clearAllFilters = () => {
  selectedCategory.value = '';
  selectedAccount.value = '';
  startDate.value = '';
  endDate.value = '';
  searchQuery.value = '';
};

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

// Category helpers (to mirror dashboard behavior)
const isParentCategory = (categoryId) => {
  const idStr = String(categoryId);
  const list = categories.value || [];
  return list.some(cat => String(cat.parent_category_id) === idStr);
};

const getCategoryOptionLabel = (category) => {
  const parentIcon = '🅿';
  const isParent = isParentCategory(category.category_id);
  return isParent ? `${parentIcon} ${category.category_name}` : category.category_name;
};

// Get all child category IDs for a given parent category ID
const getChildCategoryIds = (parentCategoryId) => {
  const parentIdStr = String(parentCategoryId);
  const list = categories.value || [];
  return list
    .filter(cat => String(cat.parent_category_id) === parentIdStr)
    .map(cat => String(cat.category_id));
};

// Get category IDs to match (includes parent and all children if parent is selected)
const getCategoryIdsToMatch = computed(() => {
  if (!selectedCategory.value || selectedCategory.value === '__uncategorized__') return null;
  
  const selectedIdStr = String(selectedCategory.value);
  const idsToMatch = [selectedIdStr];
  
  // If the selected category is a parent, include all its children
  if (isParentCategory(selectedCategory.value)) {
    const childIds = getChildCategoryIds(selectedCategory.value);
    idsToMatch.push(...childIds);
  }
  
  return new Set(idsToMatch);
});

const selectedTransactionIds = ref([]);
const showTransactionModal = ref(false);
const showGemModal = ref(false);
const isEditing = ref(false);
const modalForm = ref({
  transaction_id: null,
  transaction_date: '',
  description: '',
  amount: 0,
  transaction_type: 'D',
  account_id: '',
  category_id: '',
  posted_status: 'posted',
  is_transfer: false
});

// Original form values for change tracking
const originalModalForm = ref({});
const showConfirmDelete = ref(false);
const showReconciliationConfirm = ref(false);
const pendingDeleteIds = ref([]);

// Category modal state
const showCategoryModal = ref(false);
const categoryEditId = ref(null);
const categoryForm = ref({ category_name: '', parent_category_id: '', budgeted_amount: 0 });
const pendingCategoryTarget = ref(null); // 'bulk' or 'modal'

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
    category_id: '',
    posted_status: 'posted',
    is_transfer: false
  };
  
  // Store original values
  originalModalForm.value = { ...modalForm.value };
  
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
    category_id: transaction.category_id || '',
    posted_status: transaction.posted_status || 'posted',
    is_transfer: transaction.is_transfer || false
  };
  
  // Store original values
  originalModalForm.value = { ...modalForm.value };
  
  showTransactionModal.value = true;
};

const closeTransactionModal = () => {
  showTransactionModal.value = false;
};

const submitTransactionModal = async () => {
  try {
    const payload = { ...modalForm.value };
    
    // Ensure transaction_date is in YYYY-MM-DD format
    if (payload.transaction_date) {
      // Normalize date using date utils (handles ISO timestamps, YYYY-MM-DD, etc.)
      const normalized = normalizeAppDateClient(String(payload.transaction_date), 'api-to-domain');
      payload.transaction_date = normalized || String(payload.transaction_date).split('T')[0];
    }
    
    // Ensure amount is a number
    if (payload.amount !== null && payload.amount !== undefined) {
      payload.amount = Number(payload.amount);
    }
    
    // Ensure category_id is null if empty string
    if (payload.category_id === '') {
      payload.category_id = null;
    }
    
    if (isEditing.value) {
      const id = payload.transaction_id;
      delete payload.transaction_id;
      await transactionStore.updateTransaction(id, payload);
      // Refresh transactions to show updated data
      await transactionStore.fetchTransactions();
    } else {
      await transactionStore.createTransaction(payload);
      // Refresh transactions to show new transaction
      await transactionStore.fetchTransactions();
    }
    
    showTransactionModal.value = false;
  } catch (error) {
    console.error('Failed to save transaction:', error);
    console.error('Error details:', error.response?.data || error.message);
    alert(`Failed to save transaction: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    // Don't close modal if save failed
  }
};

const confirmBulkDelete = () => {
  showConfirmDelete.value = true;
};

const performBulkDelete = async () => {
  const ids = [...selectedTransactionIds.value];
  pendingDeleteIds.value = ids;
  showConfirmDelete.value = false;
  
  try {
    if (ids.length === 1) {
      await transactionStore.deleteTransaction(ids[0]);
    } else if (ids.length > 1) {
      await transactionStore.batchDeleteTransactions(ids);
    }
    selectedTransactionIds.value = [];
  } catch (error) {
    // Check if error is due to reconciliation matches
    if (error.response?.status === 409 && error.response?.data?.code === 'RECONCILIATION_MATCHES_EXIST') {
      showReconciliationConfirm.value = true;
    } else {
      // Re-show the confirmation dialog if it was a different error
      showConfirmDelete.value = true;
      throw error;
    }
  }
};

const performBulkDeleteWithMatches = async () => {
  const ids = [...pendingDeleteIds.value];
  showReconciliationConfirm.value = false;
  
  try {
    // Use batchDeleteTransactions for both single and multiple transactions when deleting matches
    await transactionStore.batchDeleteTransactions(ids, true); // Pass deleteMatches = true
    selectedTransactionIds.value = [];
    pendingDeleteIds.value = [];
  } catch (error) {
    // Re-show the confirmation dialog if there's an error
    showReconciliationConfirm.value = true;
    throw error;
  }
};

const handleBulkCategoryChange = (event) => {
  if (bulkCategoryId.value === '__add__') {
    pendingCategoryTarget.value = 'bulk';
    bulkCategoryId.value = '';
    openAddCategoryModal();
  }
};

const handleModalCategoryChange = (event) => {
  if (modalForm.value.category_id === '__add__') {
    pendingCategoryTarget.value = 'modal';
    modalForm.value.category_id = '';
    openAddCategoryModal();
  }
};

const openAddCategoryModal = () => {
  categoryEditId.value = null;
  categoryForm.value = { category_name: '', parent_category_id: '', budgeted_amount: 0 };
  showCategoryModal.value = true;
};

const closeCategoryModal = () => {
  showCategoryModal.value = false;
  pendingCategoryTarget.value = null;
};

const saveCategory = async () => {
  try {
    if (!categoryForm.value.category_name) return;
    
    if (categoryEditId.value) {
      await categoryStore.updateCategory(categoryEditId.value, categoryForm.value);
    } else {
      const res = await categoryStore.createCategory(categoryForm.value);
      // Refresh categories list
      await categoryStore.fetchCategories();
      const createdId = res?.category_id;
      
      // Assign the new category to the pending target
      if (createdId && pendingCategoryTarget.value) {
        if (pendingCategoryTarget.value === 'bulk') {
          bulkCategoryId.value = createdId;
        } else if (pendingCategoryTarget.value === 'modal') {
          modalForm.value.category_id = createdId;
        }
      }
    }
  } catch (error) {
    console.error('Failed to save category:', error);
    alert(`Failed to save category: ${error.response?.data?.error || error.message || 'Unknown error'}`);
  } finally {
    closeCategoryModal();
  }
};

const assignCategoryToSelected = async () => {
  if (selectedTransactionIds.value.length === 0 || !bulkCategoryId.value) {
    return;
  }

  try {
    const categoryId = bulkCategoryId.value === '__uncategorized__' ? null : bulkCategoryId.value;
    const count = selectedTransactionIds.value.length;
    
    await transactionStore.batchUpdateTransactions(selectedTransactionIds.value, {
      category_id: categoryId
    });
    
    // Clear selection and reset category dropdown
    selectedTransactionIds.value = [];
    bulkCategoryId.value = '';
    
    // Show success message
  } catch (error) {
    console.error('Failed to assign category:', error);
    alert(`Failed to assign category: ${error.response?.data?.error || error.message || 'Unknown error'}`);
  }
};

const toggleSort = (key) => {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortDir.value = key === 'transaction_date' ? 'desc' : 'asc';
  }
};

const openGemModal = () => {
  showGemModal.value = true;
};

const closeGemModal = () => {
  showGemModal.value = false;
  // Refresh transactions after closing
  transactionStore.fetchTransactions();
};

// Keyboard shortcuts for transaction selection
const handleKeydown = (event) => {
  // Don't handle shortcuts if user is typing in an input field
  const target = event.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
    return;
  }

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;
  const shiftKey = event.shiftKey;

  // Cmd/Ctrl + A: Select all visible transactions
  if (cmdOrCtrl && (event.key === 'a' || event.key === 'A')) {
    event.preventDefault();
    const ids = filteredTransactions.value.map(t => t.transaction_id);
    selectedTransactionIds.value = [...new Set([...selectedTransactionIds.value, ...ids])];
    return;
  }

  // Escape: Clear selection
  if (event.key === 'Escape') {
    event.preventDefault();
    selectedTransactionIds.value = [];
    activeTransactionIndex.value = -1;
    lastSelectedIndex.value = -1;
    return;
  }

  // Arrow keys: Navigate and select
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    
    if (filteredTransactions.value.length === 0) return;

    // Initialize active index if not set
    if (activeTransactionIndex.value === -1) {
      activeTransactionIndex.value = direction === 1 ? 0 : filteredTransactions.value.length - 1;
    } else {
      // Move active index
      activeTransactionIndex.value = Math.max(0, Math.min(filteredTransactions.value.length - 1, activeTransactionIndex.value + direction));
    }

    const activeTransaction = filteredTransactions.value[activeTransactionIndex.value];
    if (!activeTransaction) return;

    // Cmd/Ctrl + Arrow: Toggle selection of active transaction
    if (cmdOrCtrl) {
      const transactionId = activeTransaction.transaction_id;
      const index = selectedTransactionIds.value.indexOf(transactionId);
      if (index === -1) {
        selectedTransactionIds.value.push(transactionId);
      } else {
        selectedTransactionIds.value.splice(index, 1);
      }
      lastSelectedIndex.value = activeTransactionIndex.value;
    }
    // Shift + Arrow: Range selection
    else if (shiftKey) {
      if (lastSelectedIndex.value === -1) {
        lastSelectedIndex.value = activeTransactionIndex.value;
        // If starting a new range selection, select the starting transaction
        const startTransaction = filteredTransactions.value[lastSelectedIndex.value];
        if (startTransaction && !selectedTransactionIds.value.includes(startTransaction.transaction_id)) {
          selectedTransactionIds.value.push(startTransaction.transaction_id);
        }
      }
      const start = Math.min(lastSelectedIndex.value, activeTransactionIndex.value);
      const end = Math.max(lastSelectedIndex.value, activeTransactionIndex.value);
      const rangeIds = filteredTransactions.value.slice(start, end + 1).map(t => t.transaction_id);
      // Replace selection with range (or add to existing if Cmd/Ctrl is also held)
      if (cmdOrCtrl) {
        // Add range to existing selection
        selectedTransactionIds.value = [...new Set([...selectedTransactionIds.value, ...rangeIds])];
      } else {
        // Replace selection with range
        selectedTransactionIds.value = rangeIds;
      }
    }
    // Just Arrow: Move focus only (selection already handled above)
    
    // Scroll into view
    setTimeout(() => {
      const tableBody = document.querySelector('.overflow-auto tbody');
      if (tableBody) {
        const rows = tableBody.querySelectorAll('tr');
        if (rows[activeTransactionIndex.value]) {
          rows[activeTransactionIndex.value].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, 0);
  }
};

const isTransactionSelected = (transactionId) => {
  return selectedTransactionIds.value.includes(transactionId);
};

const setActiveTransaction = (index) => {
  activeTransactionIndex.value = index;
  lastSelectedIndex.value = index;
};

onMounted(async () => {
  await Promise.all([
    accountStore.fetchAccounts(),
    categoryStore.fetchCategories()
  ]);
  await transactionStore.fetchTransactions();
});
</script>


