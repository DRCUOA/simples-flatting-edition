<template>
  <div class="auth-container">
    <div class="auth-card animate-fade-in">
      <!-- Header -->
      <div class="auth-header">
        <router-link to="/" class="block">
          <h1 class="auth-logo">Simples</h1>
        </router-link>
        <h2 class="auth-title">
          Welcome back
        </h2>
        <p class="auth-subtitle">
          Sign in to your account to continue
        </p>
      </div>

      <!-- Login Form -->
      <form class="auth-form" @submit.prevent="handleLogin" role="form" aria-label="Sign in form">
        <!-- Username -->
        <div class="auth-input-group">
          <label for="username" class="auth-label">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autocomplete="username"
            required
            v-model="loginForm.username"
            class="auth-input"
            placeholder="Enter your username"
            :disabled="isLoading"
            :aria-invalid="!!error"
            :aria-describedby="error ? 'error-message' : undefined"
          />
        </div>

        <!-- Password -->
        <div class="auth-input-group">
          <label for="password" class="auth-label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            v-model="loginForm.password"
            class="auth-input"
            placeholder="Enter your password"
            :disabled="isLoading"
            :aria-invalid="!!error"
            :aria-describedby="error ? 'error-message' : undefined"
          />
        </div>

        <!-- Error Message -->
        <div v-if="error" class="auth-error" role="alert" id="error-message">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-red-800 dark:text-red-200">
                {{ error }}
              </p>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="auth-button"
          :class="{ 'auth-button-loading': isLoading }"
          :aria-describedby="isLoading ? 'loading-text' : undefined"
        >
          <span v-if="isLoading" class="flex items-center" id="loading-text">
            <svg class="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          </span>
          <span v-else>Sign in</span>
        </button>

        <!-- Sign up link -->
        <div class="text-center">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?
            <router-link
              to="/register"
              class="auth-link"
            >
              Create one here
            </router-link>
          </p>
        </div>
      </form>
    </div>
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Login" 
      :components="[]"
      :script-blocks="[
        { name: 'useAuth', type: 'composable', functions: ['login', 'resetLoginForm'] }
      ]"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import ViewInfo from '../components/ViewInfo.vue';

const router = useRouter();
const {
  loginForm,
  isLoading,
  error,
  login,
  isAuthenticated,
  resetLoginForm
} = useAuth();

const handleLogin = async () => {
  const result = await login(loginForm.value);

  if (result.success) {
    resetLoginForm();
    // Redirect to dashboard or intended page
    const redirectTo = router.currentRoute.value.query.redirect || '/';
    router.push(redirectTo);
  }
};

// Redirect if already authenticated
onMounted(() => {
  if (isAuthenticated.value) {
    router.push('/');
  }
});

// Handle Enter key for form submission
const handleKeydown = (event) => {
  if (event.key === 'Enter') {
    handleLogin();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>
