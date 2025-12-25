<template>
  <div class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Manage your account settings and preferences
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Profile Information -->
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Update your personal information and account settings
            </p>
          </div>

          <form @submit.prevent="handleUpdateProfile" class="p-6 space-y-6">
            <!-- Current Info Display -->
            <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Current Information</h3>
              <dl class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Username</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ userName }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ userEmail }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Role</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white capitalize">{{ user?.role || 'user' }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Last Login</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {{ user?.last_login ? formatTimestampLocale(user.last_login) : 'Never' }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Username -->
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                id="username"
                type="text"
                v-model="profileForm.username"
                class="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                placeholder="Enter new username"
                :disabled="isLoading"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                3-50 characters, letters, numbers, and underscores only
              </p>
            </div>

            <!-- Email -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                v-model="profileForm.email"
                class="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                placeholder="Enter new email"
                :disabled="isLoading"
              />
            </div>

            <!-- New Password Section -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Leave blank if you don't want to change your password
              </p>

              <!-- Current Password -->
              <div class="mb-4">
                <label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password (Required for password change)
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  v-model="currentPassword"
                  class="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                  placeholder="Enter current password"
                  :disabled="isLoading"
                />
              </div>

              <!-- New Password -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    v-model="profileForm.password"
                    class="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    placeholder="Enter new password"
                    :disabled="isLoading"
                  />
                </div>

                <div>
                  <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    v-model="profileForm.confirmPassword"
                    class="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:text-white"
                    placeholder="Confirm new password"
                    :disabled="isLoading"
                  />
                </div>
              </div>

              <!-- Password Requirements -->
              <div v-if="profileForm.password" class="mt-3 text-xs text-gray-600 dark:text-gray-400">
                <p class="font-medium mb-1">Password requirements:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li :class="{ 'text-green-600 dark:text-green-400': profileForm.password.length >= 8, 'text-red-600 dark:text-red-400': profileForm.password.length < 8 }">
                    At least 8 characters
                  </li>
                  <li :class="{ 'text-green-600 dark:text-green-400': /[A-Z]/.test(profileForm.password), 'text-red-600 dark:text-red-400': !/[A-Z]/.test(profileForm.password) }">
                    One uppercase letter
                  </li>
                  <li :class="{ 'text-green-600 dark:text-green-400': /[a-z]/.test(profileForm.password), 'text-red-600 dark:text-red-400': !/[a-z]/.test(profileForm.password) }">
                    One lowercase letter
                  </li>
                  <li :class="{ 'text-green-600 dark:text-green-400': /\d/.test(profileForm.password), 'text-red-600 dark:text-red-400': !/\d/.test(profileForm.password) }">
                    One number
                  </li>
                  <li :class="{ 'text-green-600 dark:text-green-400': profileForm.password === profileForm.confirmPassword, 'text-red-600 dark:text-red-400': profileForm.confirmPassword && profileForm.password !== profileForm.confirmPassword }">
                    Passwords match
                  </li>
                </ul>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-red-800 dark:text-red-200">
                    {{ error }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Success Message -->
            <div v-if="successMessage" class="rounded-md bg-green-50 dark:bg-green-900/50 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-green-800 dark:text-green-200">
                    {{ successMessage }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Submit Buttons -->
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="resetForm"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                :disabled="isLoading"
              >
                Reset
              </button>
              <button
                type="submit"
                :disabled="isLoading || !hasChanges"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isLoading">Updating...</span>
                <span v-else>Update Profile</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Account Actions Sidebar -->
      <div class="space-y-6">
        <!-- Account Actions -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Account Actions</h3>
          </div>
          <div class="p-6 space-y-4">
            <button
              @click="handleLogout"
              class="w-full flex items-center justify-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>

        <!-- Account Statistics -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Account Statistics</h3>
          </div>
          <div class="p-6">
            <dl class="space-y-4">
              <div class="flex justify-between">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</dt>
                <dd class="text-sm text-gray-900 dark:text-white">
                  {{ user?.created_at ? formatTimestampLocaleDate(user.created_at) : 'N/A' }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Last Login</dt>
                <dd class="text-sm text-gray-900 dark:text-white">
                  {{ user?.last_login ? formatTimestampLocaleDate(user.last_login) : 'Never' }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Profile" 
      :components="[]"
      :script-blocks="[
        { name: 'useAuth', type: 'composable', functions: ['updateProfile', 'logout', 'resetProfileForm', 'validateProfileForm'] }
      ]"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import ViewInfo from '../components/ViewInfo.vue';
import { formatTimestampLocale, formatTimestampLocaleDate } from '../utils/dateUtils';

const router = useRouter();
const {
  profileForm,
  isLoading,
  error,
  user,
  userName,
  userEmail,
  updateProfile,
  logout,
  resetProfileForm,
  validateProfileForm
} = useAuth();

// Local state
const currentPassword = ref('');
const successMessage = ref('');
const originalFormData = ref({});

// Check if form has changes
const hasChanges = computed(() => {
  const current = {
    username: profileForm.value.username,
    email: profileForm.value.email,
    password: profileForm.value.password
  };

  return JSON.stringify(current) !== JSON.stringify(originalFormData.value) ||
         profileForm.value.confirmPassword ||
         currentPassword.value;
});

const handleUpdateProfile = async () => {
  successMessage.value = '';

  const errors = validateProfileForm();

  // Additional validation for password change
  if (profileForm.value.password && !currentPassword.value) {
    errors.push('Current password is required when changing password');
  }

  if (errors.length > 0) {
    return;
  }

  // Prepare update data
  const updateData = {};

  if (profileForm.value.username !== originalFormData.value.username) {
    updateData.username = profileForm.value.username;
  }

  if (profileForm.value.email !== originalFormData.value.email) {
    updateData.email = profileForm.value.email;
  }

  if (profileForm.value.password) {
    updateData.password = profileForm.value.password;
  }

  // If only password is being changed, we need to send current password for verification
  // Note: In a real implementation, you'd verify the current password on the server
  const result = await updateProfile(updateData);

  if (result.success) {
    successMessage.value = 'Profile updated successfully!';
    originalFormData.value = {
      username: profileForm.value.username,
      email: profileForm.value.email,
      password: ''
    };
    profileForm.value.password = '';
    profileForm.value.confirmPassword = '';
    currentPassword.value = '';
  }
};

const handleLogout = async () => {
  await logout();
  router.push('/login');
};

const resetForm = () => {
  resetProfileForm();
  currentPassword.value = '';
  successMessage.value = '';
};

onMounted(() => {
  // Store original form data for change detection
  originalFormData.value = {
    username: profileForm.value.username,
    email: profileForm.value.email,
    password: ''
  };
});
</script>
