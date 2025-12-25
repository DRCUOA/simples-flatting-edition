// client/src/composables/useToast.js

import { ref } from 'vue';

const toasts = ref([]);
let toastId = 0;

export function useToast() {
  const addToast = (message, type = 'info', duration = 5000) => {
    const id = ++toastId;
    const toast = {
      id,
      message,
      type, // 'info', 'success', 'warning', 'error'
      duration,
      visible: true
    };
    
    toasts.value.push(toast);
    
    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  };
  
  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };
  
  const success = (message, duration) => addToast(message, 'success', duration);
  const error = (message, duration) => addToast(message, 'error', duration);
  const warning = (message, duration) => addToast(message, 'warning', duration);
  const info = (message, duration) => addToast(message, 'info', duration);
  
  const clear = () => {
    toasts.value = [];
  };
  
  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clear
  };
}
