<!-- client/src/components/ToastNotification.vue -->

<template>
  <teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <transition-group
        name="toast"
        tag="div"
        class="space-y-2"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'max-w-sm rounded-lg shadow-lg p-4 flex items-center gap-3',
            'transform transition-all duration-300 ease-in-out',
            toastStyles[toast.type]
          ]"
        >
          <div :class="iconStyles[toast.type]">
            {{ toastIcons[toast.type] }}
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium">{{ toast.message }}</p>
          </div>
          <button
            @click="removeToast(toast.id)"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast';

const { toasts, removeToast } = useToast();

const toastStyles = {
  info: 'bg-blue-50 border border-blue-200 text-blue-800',
  success: 'bg-green-50 border border-green-200 text-green-800',
  warning: 'bg-orange-50 border border-orange-200 text-orange-800',
  error: 'bg-red-50 border border-red-200 text-red-800'
};

const iconStyles = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-orange-500',
  error: 'text-red-500'
};

const toastIcons = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌'
};
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
