<template>
  <div v-if="isAuthenticated">
    <router-view />
  </div>
  <div v-else-if="!isLoading">
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 text-center">
        <div>
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            You need to sign in to access this page.
          </p>
        </div>

        <div class="mt-8">
          <router-link
            to="/login"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign In
          </router-link>
          <p class="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?
            <router-link
              to="/register"
              class="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Sign up
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="text-center">
      <svg class="animate-spin mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isAuthenticated = computed(() => authStore.isAuthenticated);
const isLoading = computed(() => authStore.isLoading);

// Initialize auth state
onMounted(() => {
  if (!isAuthenticated.value && !isLoading.value) {
    // Store the intended destination for redirect after login
    const currentPath = router.currentRoute.value.fullPath;
    if (currentPath !== '/login' && currentPath !== '/register') {
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    } else {
      router.push('/login');
    }
  }
});
</script>
