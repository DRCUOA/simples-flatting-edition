<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="handleClose">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">GEM Account Transaction Entry</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter transactions from your GEM statement</p>
        </div>
        <button 
          @click="handleClose" 
          class="text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:dark:text-gray-100 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <!-- Account Selection -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Account
          </label>
          <select 
            v-model="selectedAccountId" 
            class="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select GEM Account</option>
            <option v-for="account in gemAccounts" :key="account.account_id" :value="account.account_id">
              {{ account.account_name }}
            </option>
          </select>
        </div>

        <!-- Transaction Entry Form -->
        <div class="space-y-4">
          <div 
            v-for="(transaction, index) in transactions" 
            :key="index"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction {{ index + 1 }}</h4>
              <button 
                v-if="transactions.length > 1"
                @click="removeTransaction(index)"
                class="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Date -->
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Date (DD/MM/YYYY) <span class="text-red-500">*</span>
                </label>
                <input 
                  v-model="transaction.date" 
                  type="text" 
                  placeholder="10/06/2025"
                  pattern="\d{2}/\d{2}/\d{4}"
                  :class="[
                    'w-full px-3 py-2 text-sm rounded-md border dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                    !transaction.date || String(transaction.date).trim() === '' ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  ]"
                  @blur="formatDate(transaction, 'date')"
                />
              </div>

              <!-- Card Number -->
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Card (optional)
                </label>
                <input 
                  v-model="transaction.card" 
                  type="text" 
                  placeholder="1384"
                  class="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <!-- Description -->
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Description <span class="text-red-500">*</span>
                </label>
                <input 
                  v-model="transaction.description" 
                  type="text" 
                  placeholder="Payment Received - Thank You"
                  :class="[
                    'w-full px-3 py-2 text-sm rounded-md border dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                    !transaction.description || String(transaction.description).trim() === '' ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  ]"
                />
              </div>

              <!-- Debit Amount -->
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Debit Amount <span class="text-red-500">*</span>
                </label>
                <input 
                  v-model.number="transaction.debit" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  min="0"
                  :class="[
                    'w-full px-3 py-2 text-sm rounded-md border dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                    (!transaction.debit || parseFloat(transaction.debit) <= 0) && (!transaction.credit || parseFloat(transaction.credit) <= 0) ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  ]"
                  @input="clearOtherAmount(transaction, 'debit')"
                />
              </div>

              <!-- Credit Amount -->
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Credit Amount <span class="text-red-500">*</span>
                </label>
                <input 
                  v-model.number="transaction.credit" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  min="0"
                  :class="[
                    'w-full px-3 py-2 text-sm rounded-md border dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
                    (!transaction.debit || parseFloat(transaction.debit) <= 0) && (!transaction.credit || parseFloat(transaction.credit) <= 0) ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  ]"
                  @input="clearOtherAmount(transaction, 'credit')"
                />
              </div>

              <!-- Category -->
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Category (optional)
                </label>
                <select 
                  v-model="transaction.category_id" 
                  class="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Uncategorized</option>
                  <option v-for="category in categories" :key="category.category_id" :value="category.category_id">
                    {{ category.category_name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Another Transaction Button -->
        <button 
          @click="addTransaction"
          class="mt-4 w-full px-4 py-2 text-sm rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors"
        >
          + Add Another Transaction
        </button>

        <!-- Summary -->
        <div v-if="transactions.length > 0" class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 class="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Summary</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-blue-700 dark:text-blue-400">Total Debits:</span>
              <span class="ml-2 font-medium text-red-600 dark:text-red-400">{{ formatCurrency(totalDebits) }}</span>
            </div>
            <div>
              <span class="text-blue-700 dark:text-blue-400">Total Credits:</span>
              <span class="ml-2 font-medium text-green-600 dark:text-green-400">{{ formatCurrency(totalCredits) }}</span>
            </div>
            <div class="col-span-2 pt-2 border-t border-blue-200 dark:border-blue-700">
              <span class="text-blue-700 dark:text-blue-400">Net Amount:</span>
              <span class="ml-2 font-semibold" :class="netAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ formatCurrency(Math.abs(netAmount)) }} {{ netAmount >= 0 ? '(Credit)' : '(Debit)' }}
              </span>
            </div>
            <div class="col-span-2 text-xs text-blue-600 dark:text-blue-400">
              {{ transactions.length }} transaction(s) ready to save
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <button 
          @click="handleClose" 
          class="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button 
          @click="saveTransactions" 
          :disabled="!canSave"
          class="px-4 py-2 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :title="!canSave ? 'Please fill in all required fields (Date, Description, and Amount) for all transactions' : ''"
        >
          Save {{ transactions.length }} Transaction(s)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useTransactionStore } from '../stores/transaction';
import { useAccountStore } from '../stores/account';
import { useCategoryStore } from '../stores/category';
import { useToast } from 'vue-toastification';
import { normalizeAppDateClient } from '../utils/dateUtils';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const transactionStore = useTransactionStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const toast = useToast();

const selectedAccountId = ref('');
const transactions = ref([{
  date: '',
  card: '',
  description: '',
  debit: null,
  credit: null,
  category_id: ''
}]);

// Computed properties
const accounts = computed(() => accountStore.accounts);
const categories = computed(() => categoryStore.categories);

const gemAccounts = computed(() => {
  return accounts.value.filter(acc => 
    acc.account_name.toLowerCase().includes('gem')
  );
});

const totalDebits = computed(() => {
  return transactions.value.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0);
});

const totalCredits = computed(() => {
  return transactions.value.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
});

const netAmount = computed(() => {
  return totalCredits.value - totalDebits.value;
});

const canSave = computed(() => {
  if (!selectedAccountId.value) return false;
  if (transactions.value.length === 0) return false;
  
  return transactions.value.every(t => {
    const hasDate = t.date && String(t.date).trim() !== '';
    const hasDescription = t.description && String(t.description).trim() !== '';
    const debitAmount = t.debit ? parseFloat(t.debit) : 0;
    const creditAmount = t.credit ? parseFloat(t.credit) : 0;
    const hasAmount = debitAmount > 0 || creditAmount > 0;
    return hasDate && hasDescription && hasAmount;
  });
});

// Methods
const formatDate = (transaction, field) => {
  if (!transaction[field]) return;
  
  // Try to format DD/MM/YYYY
  const match = transaction[field].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    transaction[field] = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
};

const clearOtherAmount = (transaction, type) => {
  if (type === 'debit' && transaction.debit && parseFloat(transaction.debit) > 0) {
    transaction.credit = null;
  } else if (type === 'credit' && transaction.credit && parseFloat(transaction.credit) > 0) {
    transaction.debit = null;
  }
};

const addTransaction = () => {
  transactions.value.push({
    date: '',
    card: '',
    description: '',
    debit: null,
    credit: null,
    category_id: ''
  });
};

const removeTransaction = (index) => {
  if (transactions.value.length > 1) {
    transactions.value.splice(index, 1);
  }
};

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(num);
};

const convertDateToAPI = (dateStr) => {
  // Use date utils for all date conversion
  return normalizeAppDateClient(dateStr, 'display-to-domain');
};

const buildDescription = (transaction) => {
  let desc = transaction.description || '';
  if (transaction.card && transaction.card.trim() !== '') {
    desc = `[Card ${transaction.card}] ${desc}`;
  }
  return desc.trim();
};

const saveTransactions = async () => {
  if (!canSave.value) {
    toast.warning('Please fill in all required fields (Date, Description, and Amount)');
    return;
  }

  try {
    // Save transactions one by one to ensure proper error handling
    const savedCount = [];
    const errors = [];
    
    for (let i = 0; i < transactions.value.length; i++) {
      const t = transactions.value[i];
      try {
        const debitAmount = t.debit ? parseFloat(t.debit) : 0;
        const creditAmount = t.credit ? parseFloat(t.credit) : 0;
        const amount = debitAmount > 0 ? debitAmount : creditAmount;
        const transactionType = debitAmount > 0 ? 'D' : 'C';
        
        // Calculate signed_amount using the same logic as backend calculateSignedAmount:
        // Credit (C) => positive signed_amount (increases balance)
        // Debit (D) => negative signed_amount (decreases balance)
        const signedAmount = transactionType === 'C' ? amount : -amount;

        const apiDate = convertDateToAPI(t.date);
        if (!apiDate) {
          throw new Error(`Invalid date format: ${t.date}. Please use DD/MM/YYYY format.`);
        }

        const payload = {
          transaction_date: apiDate,
          description: buildDescription(t),
          amount: amount,
          transaction_type: transactionType,
          account_id: selectedAccountId.value,
          category_id: t.category_id || null,
          posted_status: 'posted',
          is_transfer: false,
          signed_amount: signedAmount
        };

        const result = await transactionStore.createTransaction(payload);
        savedCount.push(result);
      } catch (error) {
        console.error(`Failed to save transaction ${i + 1}:`, error);
        const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
        errors.push(`Transaction ${i + 1}: ${errorMsg}`);
        // Continue with next transaction instead of stopping
      }
    }
    
    // Final refresh to ensure all transactions are loaded
    await transactionStore.fetchTransactions();
    
    if (errors.length > 0) {
      toast.warning(`Saved ${savedCount.length} transaction(s), but ${errors.length} failed: ${errors.join('; ')}`);
    } else if (savedCount.length > 0) {
      toast.success(`Successfully saved ${savedCount.length} transaction(s)`);
    } else {
      toast.error('No transactions were saved. Please check the console for errors.');
    }
    
    // Reset form only if we saved at least one transaction
    if (savedCount.length > 0) {
      transactions.value = [{
        date: '',
        card: '',
        description: '',
        debit: null,
        credit: null,
        category_id: ''
      }];
      handleClose();
    }
  } catch (error) {
    console.error('Failed to save transactions:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to save transactions';
    toast.error(errorMessage);
  }
};

const handleClose = () => {
  emit('close');
};

// Watch for account changes and auto-select GEM account
watch(() => props.show, (newVal) => {
  if (newVal) {
    // Auto-select first GEM account if available
    if (gemAccounts.value.length > 0 && !selectedAccountId.value) {
      selectedAccountId.value = gemAccounts.value[0].account_id;
    }
    
    // Reset transactions
    transactions.value = [{
      date: '',
      card: '',
      description: '',
      debit: null,
      credit: null,
      category_id: ''
    }];
  }
});

// Load accounts and categories when component mounts
watch(() => props.show, async (newVal) => {
  if (newVal) {
    await Promise.all([
      accountStore.fetchAccounts(),
      categoryStore.fetchCategories()
    ]);
  }
}, { immediate: true });
</script>

