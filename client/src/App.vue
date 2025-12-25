<template>
  <div class="min-h-screen flex flex-col">
    <!-- Only show navbar on non-authentication pages -->
    <Navbar v-if="!isAuthPage" />

    <main 
      class="flex-1"
      :class="isAuthPage ? 'w-full' : 'max-w-7xl mx-auto w-full py-6 sm:px-6 lg:px-8'"
    >
      <router-view></router-view>
    </main>
    
    <!-- Footer (appears on all views) -->
    <Footer />
    
    <!-- Toast notifications -->
    <ToastNotification />
    
    <!-- Calculator -->
    <Calculator />
    
    <!-- Calculator Icon (always visible) -->
    <CalculatorIcon />
  </div>
</template>

<script setup>
import { onMounted, nextTick, computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import ToastNotification from './components/ToastNotification.vue';
import Calculator from './components/Calculator.vue';
import CalculatorIcon from './components/CalculatorIcon.vue';
import { useAuthStore } from './stores/auth';
// Theme is initialized in main.js, no need to import here

const route = useRoute();

const authStore = useAuthStore();

// Computed property to determine if current page is an authentication page
const isAuthPage = computed(() => {
  return ['login', 'register'].includes(route.name);
});
</script>

<style>
@tailwind base;
@tailwind components;
@tailwind utilities;

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Ensure dark mode applies to html and body */
:root {
  color-scheme: light dark;
}

html {
  @apply bg-white dark:bg-gray-900;
}

body {
  @apply bg-white dark:bg-gray-900 text-gray-900 dark:text-white;
}

/* Ensure proper dark mode for form elements */
input, select, textarea {
  @apply bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600;
}

/* Ensure proper dark mode for buttons */
button {
  @apply text-gray-900 dark:text-white;
}
</style> 