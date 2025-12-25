import { defineStore } from 'pinia';
import axios from 'axios';
import { normalizeAppDateClient, formatDateForAPI } from '../utils/dateUtils';
import { parseMoney, sumMoney } from '../utils/money';

const API_URL = '';

export const useTransactionStore = defineStore('transaction', {
  state: () => ({
    transactions: [],
    loading: false,
    lastFetchTime: null,
    lastFetchParams: null,
    error: null,
    uploadProgress: 0,
    csvPreview: [],
    csvHeaders: [],
    fieldMappings: {},
    requiredFields: [
      { 
        id: 'transaction_date', 
        label: 'Transaction Date',
        allowMultiple: false,
        description: 'The date of the transaction'
      },
      { 
        id: 'description', 
        label: 'Description',
        allowMultiple: true,
        description: 'Transaction description (can combine multiple fields)'
      },
      { 
        id: 'amount', 
        label: 'Amount',
        allowMultiple: false,
        description: 'The transaction amount'
      },
      { 
        id: 'transaction_type', 
        label: 'Transaction Type',
        allowMultiple: false,
        description: 'The type of transaction (e.g., income, expense)'
      }
    ],
    duplicates: [],
    totalRecords: 0,
    duplicateCount: 0,
    importedCount: 0,
    dateParseErrors: [],
  }),

  getters: {
    // Removed _parseDate - all date operations must use date utils

    // Get transactions by date range
    getTransactionsByDateRange: (state) => (startDate, endDate) => {
      if (!startDate && !endDate) return state.transactions;
      
      const start = startDate ? normalizeAppDateClient(startDate, 'api-to-domain') : null;
      const end = endDate ? normalizeAppDateClient(endDate, 'api-to-domain') : null;
      
      return state.transactions.filter(t => {
        if (!t.transaction_date) return false;
        const tDate = normalizeAppDateClient(t.transaction_date, 'api-to-domain');
        if (!tDate) return false;
        // Lexicographic comparison works for YYYY-MM-DD
        return (!start || tDate >= start) && (!end || tDate <= end);
      });
    },

    // Get transactions by account
    getTransactionsByAccount: (state) => (accountId, startDate = null, endDate = null) => {
      let filtered = state.transactions.filter(t => t.account_id === accountId);
      
      if (startDate || endDate) {
        const start = startDate ? normalizeAppDateClient(startDate, 'api-to-domain') : null;
        const end = endDate ? normalizeAppDateClient(endDate, 'api-to-domain') : null;
        filtered = filtered.filter(t => {
          const tDate = normalizeAppDateClient(t.transaction_date, 'api-to-domain');
          if (!tDate) return false;
          // Use string comparison for YYYY-MM-DD format
          return (!start || tDate >= start) && (!end || tDate <= end);
        });
      }
      
      return filtered;
    },

    // Get transactions by category
    getTransactionsByCategory: (state) => (categoryId, startDate = null, endDate = null) => {
      let filtered = state.transactions.filter(t => t.category_id === categoryId);
      
      if (startDate || endDate) {
        const start = startDate ? normalizeAppDateClient(startDate, 'api-to-domain') : null;
        const end = endDate ? normalizeAppDateClient(endDate, 'api-to-domain') : null;
        filtered = filtered.filter(t => {
          const tDate = normalizeAppDateClient(t.transaction_date, 'api-to-domain');
          if (!tDate) return false;
          // Use string comparison for YYYY-MM-DD format
          return (!start || tDate >= start) && (!end || tDate <= end);
        });
      }
      
      return filtered;
    },

    // Get total amount for date range
    getTransactionTotalByDateRange: (state) => (startDate, endDate) => {
      const filtered = startDate || endDate
        ? state.transactions.filter(t => {
            const tDate = normalizeAppDateClient(t.transaction_date, 'api-to-domain');
            if (!tDate) return false;
            const start = startDate ? normalizeAppDateClient(startDate, 'api-to-domain') : null;
            const end = endDate ? normalizeAppDateClient(endDate, 'api-to-domain') : null;
            // Use string comparison for YYYY-MM-DD format
            return (!start || tDate >= start) && (!end || tDate <= end);
          })
        : state.transactions;
      
      return sumMoney(filtered.map(t => t.signed_amount || 0));
    },

    // Get income total for date range
    getIncomeTotalByDateRange: (state) => (startDate, endDate) => {
      const filtered = startDate || endDate
        ? state.transactions.filter(t => {
            const tDate = normalizeAppDateClient(t.transaction_date, 'api-to-domain');
            if (!tDate) return false;
            const start = startDate ? normalizeAppDateClient(startDate, 'api-to-domain') : null;
            const end = endDate ? normalizeAppDateClient(endDate, 'api-to-domain') : null;
            // Use string comparison for YYYY-MM-DD format
            return (!start || tDate >= start) && (!end || tDate <= end);
          })
        : state.transactions;
      
      const positiveAmounts = filtered
        .filter(t => (parseMoney(t.signed_amount) || 0) > 0)
        .map(t => t.signed_amount || 0);
      return sumMoney(positiveAmounts);
    },

    // Get expense total for date range
    getExpenseTotalByDateRange: (state) => (startDate, endDate) => {
      const filtered = startDate || endDate
        ? state.transactions.filter(t => {
            const tDate = normalizeAppDateClient(t.transaction_date, 'api-to-domain');
            if (!tDate) return false;
            const start = startDate ? normalizeAppDateClient(startDate, 'api-to-domain') : null;
            const end = endDate ? normalizeAppDateClient(endDate, 'api-to-domain') : null;
            // Use string comparison for YYYY-MM-DD format
            return (!start || tDate >= start) && (!end || tDate <= end);
          })
        : state.transactions;
      
      const negativeAmounts = filtered
        .filter(t => (parseMoney(t.signed_amount) || 0) < 0)
        .map(t => t.signed_amount || 0);
      return Math.abs(sumMoney(negativeAmounts));
    },

    // Get category totals for date range
    getCategoryTotals: (state) => (startDate = null, endDate = null) => {
      const filtered = startDate || endDate
        ? state.transactions.filter(t => {
            const tDate = normalizeAppDateClient(t.transaction_date, 'api-to-domain');
            if (!tDate) return false;
            const start = startDate ? normalizeAppDateClient(startDate, 'api-to-domain') : null;
            const end = endDate ? normalizeAppDateClient(endDate, 'api-to-domain') : null;
            // Use string comparison for YYYY-MM-DD format
            return (!start || tDate >= start) && (!end || tDate <= end);
          })
        : state.transactions;
      
      const categoryMap = {};
      filtered.forEach(t => {
        const catId = t.category_id;
        if (!catId) return;
        if (!categoryMap[catId]) {
          categoryMap[catId] = {
            category_id: catId,
            category_name: t.category_name,
            total: 0,
            count: 0
          };
        }
        const amount = parseMoney(t.signed_amount) || 0;
        categoryMap[catId].total = sumMoney([categoryMap[catId].total, amount]);
        categoryMap[catId].count += 1;
      });
      
      return Object.values(categoryMap);
    },

    // Get account totals for date range
    getAccountTotals: (state) => (startDate = null, endDate = null) => {
      const filtered = startDate || endDate
        ? state.transactions.filter(t => {
            const tDate = normalizeAppDateClient(t.transaction_date, 'api-to-domain');
            if (!tDate) return false;
            const start = startDate ? normalizeAppDateClient(startDate, 'api-to-domain') : null;
            const end = endDate ? normalizeAppDateClient(endDate, 'api-to-domain') : null;
            // Use string comparison for YYYY-MM-DD format
            return (!start || tDate >= start) && (!end || tDate <= end);
          })
        : state.transactions;
      
      const accountMap = {};
      filtered.forEach(t => {
        const accId = t.account_id;
        if (!accId) return;
        if (!accountMap[accId]) {
          accountMap[accId] = {
            account_id: accId,
            account_name: t.account_name,
            total: 0,
            count: 0
          };
        }
        const amount = parseMoney(t.signed_amount) || 0;
        accountMap[accId].total = sumMoney([accountMap[accId].total, amount]);
        accountMap[accId].count += 1;
      });
      
      return Object.values(accountMap);
    },

    // Get recent transactions
    getRecentTransactions: (state) => (limit = 10) => {
      return [...state.transactions]
        .sort((a, b) => {
          const dateA = a.transaction_date ? normalizeAppDateClient(a.transaction_date, 'api-to-domain') : '0000-00-00';
          const dateB = b.transaction_date ? normalizeAppDateClient(b.transaction_date, 'api-to-domain') : '0000-00-00';
          // Lexicographic comparison works for YYYY-MM-DD (descending order)
          if (dateB > dateA) return 1;
          if (dateB < dateA) return -1;
          return 0;
        })
        .slice(0, limit);
    },

    // Get transaction by ID
    getTransactionById: (state) => (transactionId) => {
      return state.transactions.find(t => t.transaction_id === transactionId);
    },

    // Get transactions count
    getTransactionsCount: (state) => state.transactions.length,

    // Get transactions count by date range
    getTransactionsCountByDateRange: (state) => (startDate, endDate) => {
      if (!startDate && !endDate) return state.transactions.length;
      
      const start = startDate ? normalizeAppDateClient(startDate, 'api-to-domain') : null;
      const end = endDate ? normalizeAppDateClient(endDate, 'api-to-domain') : null;
      
      return state.transactions.filter(t => {
        const tDate = normalizeAppDateClient(t.transaction_date, 'api-to-domain');
        if (!tDate) return false;
        // Use string comparison for YYYY-MM-DD format
        return (!start || tDate >= start) && (!end || tDate <= end);
      }).length;
    }
  },

  actions: {
    async fetchTransactions(startDate, endDate, forceRefresh = false) {
      // Cache check - avoid duplicate requests within 30 seconds with same parameters
      const currentParams = JSON.stringify({ startDate, endDate });
      const now = Date.now();
      const cacheTimeout = 30000; // 30 seconds
      
      if (!forceRefresh && 
          this.lastFetchTime && 
          (now - this.lastFetchTime) < cacheTimeout && 
          this.lastFetchParams === currentParams &&
          this.transactions.length > 0) {
        return;
      }
      
      // Prevent multiple simultaneous requests (unless forcing refresh)
      if (this.loading && !forceRefresh) {
        return;
      }
      
      this.loading = true;
      this.error = null;
      try {
        // Format dates to YYYY-MM-DD for API
        const formattedStartDate = startDate ? formatDateForAPI(startDate) : null;
        const formattedEndDate = endDate ? formatDateForAPI(endDate) : null;
        
        let url = `${API_URL}/transactions`;
        const params = new URLSearchParams();
        if (formattedStartDate) params.append('startDate', formattedStartDate);
        if (formattedEndDate) params.append('endDate', formattedEndDate);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        const response = await axios.get(url);
        const data = response.data;
        
        // Update cache info
        this.lastFetchTime = now;
        this.lastFetchParams = currentParams;
        
        // Store transactions with dates in YYYY-MM-DD format (canonical domain date format)
        // Display formatting happens at the UI layer via dateUtils
        this.transactions = data.map(transaction => {
          // Normalize transaction_date to YYYY-MM-DD format
          const normalizedDate = normalizeAppDateClient(transaction.transaction_date, 'api-to-domain') || transaction.transaction_date;
            
          return {
            ...transaction,
            amount: parseMoney(transaction.amount) || 0,
            signed_amount: parseMoney(transaction.signed_amount) || 0,
            transaction_date: normalizedDate // Store as YYYY-MM-DD
          };
        });
      } catch (error) {
        
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async createTransaction(transaction) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(`${API_URL}/transactions`, transaction);
        await this.fetchTransactions(undefined, undefined, true);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to create transaction';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateTransaction(id, transaction) {
      this.loading = true;
      this.error = null;
      try {
        await axios.put(`${API_URL}/transactions/${id}`, transaction);
        await this.fetchTransactions(undefined, undefined, true);
        return { ok: true };
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to update transaction';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteTransaction(id) {
      this.loading = true;
      this.error = null;
      try {
        await axios.delete(`${API_URL}/transactions/${id}`);
        this.transactions = this.transactions.filter(t => t.transaction_id !== id);
        return { ok: true };
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to delete transaction';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async batchDeleteTransactions(transactionIds, deleteMatches = false) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post('/transactions/batch', {
          transactionIds,
          deleteMatches
        });

        // Remove deleted transactions from the store
        this.transactions = this.transactions.filter(
          t => !transactionIds.includes(t.transaction_id)
        );
        
        return response.data;
      } catch (error) {
        
        this.error = error.response?.data?.error || 'Failed to delete transactions';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async batchUpdateTransactions(transactionIds, updates) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.patch('/transactions/batch', {
          transactionIds,
          updates
        });

        // Refresh transactions to get updated data (force refresh to bypass cache and loading check)
        await this.fetchTransactions(undefined, undefined, true);
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to update transactions';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async previewCSV(file, accountId) {
      this.loading = true;
      this.error = null;
      this.dateParseErrors = [];
      
      try {
        const formData = new FormData();
        formData.append('csvFile', file);
        if (accountId) {
          formData.append('account_id', accountId);
        }
        // Send mappings only if initialized; backend supports missing mappings
        if (this.fieldMappings && Object.keys(this.fieldMappings).length > 0) {
          formData.append('mappings', JSON.stringify(this.fieldMappings));
        }

        const response = await axios.post(`${API_URL}/transactions/preview`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        // If no mappings were applied yet, just set headers so the mapping UI can render
        const headers = Array.isArray(response.data.headers) && response.data.headers.length > 0
          ? response.data.headers
          : (response.data.records && response.data.records[0] ? Object.keys(response.data.records[0]) : []);

        this.csvHeaders = headers;

        // For display, only format dates if mapping provided
        if (this.fieldMappings && this.fieldMappings.transaction_date) {
          this.csvPreview = response.data.records.map(record => ({
            ...record,
            transaction_date: normalizeAppDateClient(record.transaction_date, 'api-to-domain') || record.transaction_date
          }));
        } else {
          this.csvPreview = response.data.records;
        }

        this.duplicates = response.data.duplicates || [];
        this.totalRecords = response.data.totalRecords || (this.csvPreview ? this.csvPreview.length : 0);
        this.duplicateCount = response.data.duplicateCount || 0;

        return response.data;
      } catch (error) {
        
        this.error = error.response?.data?.error || error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async uploadTransactions(file, mappings, selectedAccountId, categoryAssignments, selectedIndices = [], transactionSplits = {}) {
      this.loading = true;
      this.error = null;
      this.uploadProgress = 0;
      
      try {
        const formData = new FormData();
        formData.append('csvFile', file);
        formData.append('mappings', JSON.stringify(mappings));
        formData.append('account_id', selectedAccountId);
        formData.append('categoryAssignments', JSON.stringify(categoryAssignments));
        if (Array.isArray(selectedIndices) && selectedIndices.length > 0) {
          formData.append('selected_indices', JSON.stringify(selectedIndices));
        }
        if (transactionSplits && Object.keys(transactionSplits).length > 0) {
          formData.append('transactionSplits', JSON.stringify(transactionSplits));
        }
        
        const response = await axios.post(`${API_URL}/transactions/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          }
        });
        
        this.importedCount = response.data.importedCount;
        this.duplicateCount = response.data.duplicateCount;
        
        // Refresh transactions after upload (force refresh to bypass cache)
        await this.fetchTransactions(undefined, undefined, true);
        
        return response.data;
      } catch (error) {
        
        this.error = error.response?.data?.error || error.message;
        throw error;
      } finally {
        this.loading = false;
        this.uploadProgress = 0;
      }
    },

    updateFieldMapping(fieldId, csvHeader, isAdd = true) {
      const field = this.requiredFields.find(f => f.id === fieldId);
      if (!field) return;

      if (field.allowMultiple) {
        if (isAdd) {
          if (!this.fieldMappings[fieldId].includes(csvHeader)) {
            this.fieldMappings[fieldId].push(csvHeader);
          }
        } else {
          this.fieldMappings[fieldId] = this.fieldMappings[fieldId].filter(h => h !== csvHeader);
        }
      } else {
        this.fieldMappings[fieldId] = csvHeader;
      }
    },

    resetCSVState() {
      this.csvPreview = [];
      this.csvHeaders = [];
      this.fieldMappings = {};
      this.uploadProgress = 0;
    },

    // Save field mappings for an account
    async saveFieldMappings(accountId, mappings) {
      this.loading = true;
      this.error = null;
      try {
        // Process mappings to handle multiple fields correctly
        const processedMappings = [];
        
        // Handle each field mapping
        Object.entries(mappings).forEach(([fieldName, csvHeader]) => {
          if (Array.isArray(csvHeader)) {
            // For fields that allow multiple mappings, create a separate mapping for each
            csvHeader.forEach(header => {
              if (header) { // Only add non-empty mappings
                processedMappings.push({
                  account_id: accountId,
                  field_name: fieldName,
                  csv_header: String(header) // Ensure header is a string
                });
              }
            });
          } else if (csvHeader) {
            // For single field mappings
            processedMappings.push({
              account_id: accountId,
              field_name: fieldName,
              csv_header: String(csvHeader) // Ensure header is a string
            });
          }
        });
        
        const response = await axios.post(`${API_URL}/account-field-mappings/account/${accountId}/batch`, processedMappings);
        return response.data;
      } catch (error) {
        
        this.error = error.response?.data?.error || 'Failed to save field mappings';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Get field mappings for an account
    async getFieldMappings(accountId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API_URL}/account-field-mappings/account/${accountId}`);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to get field mappings';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Clear all transaction data (for logout)
    clearAllData() {
      this.transactions = [];
      this.loading = false;
      this.error = null;
      this.uploadProgress = 0;
      this.csvPreview = [];
      this.csvHeaders = [];
      this.fieldMappings = {};
      this.duplicates = [];
      this.totalRecords = 0;
      this.duplicateCount = 0;
      this.importedCount = 0;
      this.dateParseErrors = [];
    }
  }
}); 