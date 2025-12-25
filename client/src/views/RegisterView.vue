<template>
  <div class="auth-container">
    <div class="auth-card animate-fade-in">
      <!-- Header -->
      <div class="auth-header">
        <router-link to="/" class="block">
          <h1 class="auth-logo">Simples</h1>
        </router-link>
        <h2 class="auth-title">
          Create your account
        </h2>
        <p class="auth-subtitle">
          Join us and start managing your finances
        </p>
      </div>

      <!-- Registration Form -->
      <form class="auth-form" @submit.prevent="handleRegister" role="form" aria-label="Registration form">
        <!-- Username -->
        <div class="auth-input-group">
          <label for="username" class="auth-label">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autocomplete="username"
            required
            v-model="registerForm.username"
            class="auth-input"
            :class="{ 'auth-input-error': validationErrors.username }"
            placeholder="Choose a username (3-50 characters)"
            :disabled="isLoading"
            :aria-invalid="validationErrors.username"
            :aria-describedby="validationErrors.username ? 'username-error' : undefined"
          />
          <p v-if="validationErrors.username" id="username-error" class="text-xs text-red-600 dark:text-red-400 mt-1">
            Username must be 3-50 characters, letters, numbers, and underscores only
          </p>
        </div>

        <!-- Email -->
        <div class="auth-input-group">
          <label for="email" class="auth-label">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            v-model="registerForm.email"
            class="auth-input"
            :class="{ 'auth-input-error': validationErrors.email }"
            placeholder="Enter your email address"
            :disabled="isLoading"
            :aria-invalid="validationErrors.email"
            :aria-describedby="validationErrors.email ? 'email-error' : undefined"
          />
          <p v-if="validationErrors.email" id="email-error" class="text-xs text-red-600 dark:text-red-400 mt-1">
            Please enter a valid email address
          </p>
        </div>

        <!-- Password -->
        <div class="auth-input-group">
          <label for="password" class="auth-label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            required
            v-model="registerForm.password"
            class="auth-input"
            :class="{ 'auth-input-error': validationErrors.password }"
            placeholder="Create a strong password"
            :disabled="isLoading"
            :aria-invalid="validationErrors.password"
            :aria-describedby="validationErrors.password ? 'password-error' : 'password-requirements'"
          />
          <p id="password-requirements" class="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Must be at least 8 characters with uppercase, lowercase, and number
          </p>
          <p v-if="validationErrors.password" id="password-error" class="text-xs text-red-600 dark:text-red-400 mt-1">
            Password must meet all requirements
          </p>
        </div>

        <!-- Confirm Password -->
        <div class="auth-input-group">
          <label for="confirmPassword" class="auth-label">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            v-model="registerForm.confirmPassword"
            class="auth-input"
            :class="{ 'auth-input-error': validationErrors.confirmPassword }"
            placeholder="Confirm your password"
            :disabled="isLoading"
            :aria-invalid="validationErrors.confirmPassword"
            :aria-describedby="validationErrors.confirmPassword ? 'confirm-password-error' : undefined"
          />
          <p v-if="validationErrors.confirmPassword" id="confirm-password-error" class="text-xs text-red-600 dark:text-red-400 mt-1">
            Passwords do not match
          </p>
        </div>

        <!-- Password Requirements -->
        <div class="text-xs text-gray-600 dark:text-gray-400">
          <p class="font-medium mb-1">Password requirements:</p>
          <ul class="list-disc list-inside space-y-1">
            <li :class="{ 'text-green-600 dark:text-green-400': registerForm.password.length >= 8, 'text-red-600 dark:text-red-400': registerForm.password && registerForm.password.length < 8 }">
              At least 8 characters
            </li>
            <li :class="{ 'text-green-600 dark:text-green-400': /[A-Z]/.test(registerForm.password), 'text-red-600 dark:text-red-400': registerForm.password && !/[A-Z]/.test(registerForm.password) }">
              One uppercase letter
            </li>
            <li :class="{ 'text-green-600 dark:text-green-400': /[a-z]/.test(registerForm.password), 'text-red-600 dark:text-red-400': registerForm.password && !/[a-z]/.test(registerForm.password) }">
              One lowercase letter
            </li>
            <li :class="{ 'text-green-600 dark:text-green-400': /\d/.test(registerForm.password), 'text-red-600 dark:text-red-400': registerForm.password && !/\d/.test(registerForm.password) }">
              One number
            </li>
            <li :class="{ 'text-green-600 dark:text-green-400': registerForm.password === registerForm.confirmPassword && registerForm.password, 'text-red-600 dark:text-red-400': registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword }">
              Passwords match
            </li>
          </ul>
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
          :disabled="isLoading || !isFormValid"
          class="auth-button"
          :class="{ 'auth-button-loading': isLoading }"
          :aria-describedby="isLoading ? 'loading-text' : undefined"
        >
          <span v-if="isLoading" class="flex items-center" id="loading-text">
            <svg class="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating account...
          </span>
          <span v-else>Create account</span>
        </button>

        <!-- Sign in link -->
        <div class="text-center">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?
            <router-link
              to="/login"
              class="auth-link"
            >
              Sign in here
            </router-link>
          </p>
        </div>
      </form>
    </div>
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Register" 
      :components="[]"
      :script-blocks="[
        { name: 'useAuth', type: 'composable', functions: ['register', 'resetRegisterForm', 'validateRegisterForm'] }
      ]"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import ViewInfo from '../components/ViewInfo.vue';

const router = useRouter();
const {
  registerForm,
  isLoading,
  error,
  register,
  isAuthenticated,
  resetRegisterForm,
  validateRegisterForm
} = useAuth();

// Validation errors
const validationErrors = ref({
  username: false,
  email: false,
  password: false,
  confirmPassword: false
});

// Form validation
const isFormValid = computed(() => {
  const errors = validateRegisterForm();
  return errors.length === 0 && registerForm.value.username && registerForm.value.email && registerForm.value.password && registerForm.value.confirmPassword;
});

const handleRegister = async () => {
  // Clear previous validation errors
  validationErrors.value = {
    username: false,
    email: false,
    password: false,
    confirmPassword: false
  };

  const errors = validateRegisterForm();

  if (errors.length > 0) {
    // Highlight fields with errors
    errors.forEach(error => {
      if (error.includes('Username')) validationErrors.value.username = true;
      if (error.includes('Email')) validationErrors.value.email = true;
      if (error.includes('Password') && error.includes('match')) validationErrors.value.confirmPassword = true;
      if (error.includes('Password') && !error.includes('match')) validationErrors.value.password = true;
    });
    return;
  }

  const result = await register(registerForm.value);

  if (result.success) {
    resetRegisterForm();
    // Redirect to login page with success message
    router.push('/login?message=Registration successful! Please sign in.');
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
  if (event.key === 'Enter' && isFormValid.value) {
    handleRegister();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>
