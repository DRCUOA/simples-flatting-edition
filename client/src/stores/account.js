import { defineStore } from 'pinia';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { parseMoney, addMoney, sumMoney } from '../utils/money';

const API_URL = '/accounts';

export const useAccountStore = defineStore('account', {
  state: () => ({
    accounts: [],
    loading: false,
    error: null
  }),

  getters: {
    // Get total balance across all accounts
    getTotalBalance: (state) => {
      return sumMoney(state.accounts.map(account => account.current_balance || 0));
    },

    // Get account by ID
    getAccountById: (state) => (accountId) => {
      return state.accounts.find(a => a.account_id === accountId);
    },

    // Get accounts by type
    getAccountsByType: (state) => (type) => {
      return state.accounts.filter(a => a.account_type === type);
    },

    // Get formatted account summaries for dashboard
    getAccountSummaries: (state) => {
      if (!Array.isArray(state.accounts)) {
        return [];
      }
      return state.accounts.map(account => {
        const balance = parseMoney(account.current_balance) || 0;
        return {
          ...account,
          balance: balance,
          formatted_balance: balance.toFixed(2)
        };
      });
    },

    // Get accounts count
    getAccountsCount: (state) => state.accounts.length,

    // Get active accounts (could filter by a status field if added later)
    getActiveAccounts: (state) => {
      return state.accounts.filter(a => !a.is_closed);
    },

    // Check if account exists
    accountExists: (state) => (accountId) => {
      return state.accounts.some(a => a.account_id === accountId);
    },

    // Get account name by ID (useful for display)
    getAccountName: (state) => (accountId) => {
      const account = state.accounts.find(a => a.account_id === accountId);
      return account ? account.account_name : null;
    },

    // Get accounts sorted by balance (descending)
    getAccountsByBalance: (state) => {
      return [...state.accounts].sort((a, b) => {
        const balanceA = parseMoney(a.current_balance) || 0;
        const balanceB = parseMoney(b.current_balance) || 0;
        return balanceB - balanceA;
      });
    },

    // Get accounts sorted by name
    getAccountsByName: (state) => {
      return [...state.accounts].sort((a, b) => {
        const nameA = (a.account_name || '').toLowerCase();
        const nameB = (b.account_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
  },

  actions: {
    async fetchAccounts() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(API_URL);
        if (!response.data) {
          throw new Error('No data received from accounts endpoint');
        }
        this.accounts = response.data;
      } catch (error) {
        this.error = error.response?.data?.error || error.message || 'Failed to fetch accounts';
        const toast = useToast();
        toast.error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },


    async getAccountById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to fetch account';
        const toast = useToast();
        toast.error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createAccount(account) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(API_URL, account);
        const toast = useToast();
        toast.success('Account created successfully');
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to create account';
        const toast = useToast();
        toast.error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateAccount(id, account) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.put(`${API_URL}/${id}`, account);
        const toast = useToast();
        toast.success('Account updated successfully');
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to update account';
        const toast = useToast();
        toast.error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteAccount(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to delete account';
        const toast = useToast();
        toast.error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateAccountBalance(id, signed_amount) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.patch(`${API_URL}/${id}/balance`, { signed_amount });
        const toast = useToast();
        toast.success('Account balance updated successfully');
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to update account balance';
        const toast = useToast();
        toast.error(this.error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Clear all account data (for logout)
    clearAllData() {
      this.accounts = [];
      this.loading = false;
      this.error = null;
    }
  }
}); 