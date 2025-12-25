import { defineStore } from 'pinia';
import axios from 'axios';

export const useMessageStore = defineStore('messages', {
  state: () => ({
    messages: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchMessages() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get('/messages');
        this.messages = response.data;
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to fetch messages';
      } finally {
        this.loading = false;
      }
    },

    async createMessage(message) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post('/messages', { message });
        this.messages.push(response.data);
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to create message';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateMessage(id, message) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.put(`/messages/${id}`, { message });
        const index = this.messages.findIndex(m => m.id === id);
        if (index !== -1) {
          this.messages[index] = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to update message';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteMessage(id) {
      this.loading = true;
      this.error = null;
      try {
        await axios.delete(`/messages/${id}`);
        this.messages = this.messages.filter(m => m.id !== id);
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to delete message';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Clear all messages data (for logout)
    clearAllData() {
      this.messages = [];
      this.loading = false;
      this.error = null;
    }
  },
}); 