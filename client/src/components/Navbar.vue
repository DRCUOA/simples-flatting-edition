<template>
  <nav class="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- Logo and main navigation -->
        <div class="flex items-center">
          <!-- Logo/Brand -->
          <router-link to="/" class="flex-shrink-0 flex items-center mr-6">
            <span class="text-xl font-bold text-gray-900 dark:text-white">
              Simples
            </span>
          </router-link>

          <!-- Core navigation links - Only most essential -->
          <div class="hidden lg:flex lg:space-x-4">
            <router-link
              to="/"
              class="nav-link"
              :class="{ 'nav-link-active': $route.name === 'dashboard' }"
            >
              Dashboard
            </router-link>
            <router-link
              to="/transactions"
              class="nav-link"
              :class="{ 'nav-link-active': $route.name === 'transactions' }"
            >
              Transactions
            </router-link>
            <router-link
              to="/accounts"
              class="nav-link"
              :class="{ 'nav-link-active': $route.name === 'accounts' }"
            >
              Accounts
            </router-link>

            <!-- More menu dropdown -->
            <div class="relative">
              <button
                @click="toggleMoreMenu"
                class="nav-link"
                :class="{ 'nav-link-active': isMoreMenuActive }"
              >
                More
                <svg class="ml-1 h-4 w-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              <!-- More dropdown menu -->
              <div
                v-if="showMoreMenu"
                class="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
              >
                <router-link
                  to="/categories"
                  class="dropdown-link"
                  :class="{ 'bg-gray-100 dark:bg-gray-700': $route.name === 'categories' }"
                  @click="closeMoreMenu"
                >
                  Categories
                </router-link>
                <router-link
                  to="/keyword-rules"
                  class="dropdown-link"
                  :class="{ 'bg-gray-100 dark:bg-gray-700': $route.name === 'keyword-rules' }"
                  @click="closeMoreMenu"
                >
                  Keyword Rules
                </router-link>
                <router-link
                  to="/reports"
                  class="dropdown-link"
                  :class="{ 'bg-gray-100 dark:bg-gray-700': $route.name === 'reports' }"
                  @click="closeMoreMenu"
                >
                  Reports
                </router-link>
                <router-link
                  to="/flow"
                  class="dropdown-link"
                  :class="{ 'bg-gray-100 dark:bg-gray-700': $route.name === 'flow' }"
                  @click="closeMoreMenu"
                >
                  Flow Chart
                </router-link>
                <router-link
                  to="/reconciliation"
                  class="dropdown-link"
                  :class="{ 'bg-gray-100 dark:bg-gray-700': $route.name === 'reconciliation' }"
                  @click="closeMoreMenu"
                >
                  Reconciliation
                </router-link>
                <router-link
                  to="/import"
                  class="dropdown-link"
                  :class="{ 'bg-gray-100 dark:bg-gray-700': $route.name === 'import' }"
                  @click="closeMoreMenu"
                >
                  Import
                </router-link>
                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <router-link
                  to="/helpers"
                  class="dropdown-link"
                  :class="{ 'bg-gray-100 dark:bg-gray-700': $route.name === 'helpers' }"
                  @click="closeMoreMenu"
                >
                  Helpers
                </router-link>
                <router-link
                  to="/audit"
                  class="dropdown-link"
                  :class="{ 'bg-gray-100 dark:bg-gray-700': $route.name === 'audit' }"
                  @click="closeMoreMenu"
                >
                  Audit
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Right side - Actions and user menu -->
        <div class="flex items-center space-x-2">
          <!-- Theme toggle button -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="themeLabel"
          >
            <span class="text-lg">{{ themeIcon }}</span>
          </button>

          <!-- User dropdown menu -->
          <div class="relative" v-if="authStore.isAuthenticated">
            <button
              @click="toggleUserMenu"
              class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <div class="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ userInitials }}
                </span>
              </div>
              <span class="ml-2 text-gray-700 dark:text-gray-300 hidden lg:block">
                {{ authStore.userName }}
              </span>
              <svg class="ml-1 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            <!-- User dropdown menu -->
            <div
              v-if="showUserMenu"
              class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
            >
              <router-link
                to="/profile"
                class="dropdown-link"
                @click="closeUserMenu"
              >
                Profile
              </router-link>
              
              <!-- Admin section -->
              <div v-if="authStore.isAdmin">
                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <div class="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Admin
                </div>
                <router-link
                  to="/admin"
                  class="dropdown-link"
                  @click="closeUserMenu"
                >
                  Database Admin
                </router-link>
                <router-link
                  to="/users"
                  class="dropdown-link"
                  @click="closeUserMenu"
                >
                  User Management
                </router-link>
              </div>
              
              <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                @click="handleLogout"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>

          <!-- Mobile menu button -->
          <div class="lg:hidden relative">
            <button
              @click="toggleMobileMenu"
              class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              type="button"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="!showMobileMenu" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="showMobileMenu" class="lg:hidden">
        <div class="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200 dark:border-gray-700">
          <!-- Core Navigation -->
          <div class="mb-4">
            <router-link
              to="/"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'dashboard' }"
              @click="closeMobileMenu"
            >
              📊 Dashboard
            </router-link>
            <router-link
              to="/transactions"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'transactions' }"
              @click="closeMobileMenu"
            >
              💳 Transactions
            </router-link>
            <router-link
              to="/accounts"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'accounts' }"
              @click="closeMobileMenu"
            >
              🏦 Accounts
            </router-link>
            <router-link
              to="/categories"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'categories' }"
              @click="closeMobileMenu"
            >
              🏷️ Categories
            </router-link>
            <router-link
              to="/keyword-rules"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'keyword-rules' }"
              @click="closeMobileMenu"
            >
              🔑 Keyword Rules
            </router-link>
            <router-link
              to="/reports"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'reports' }"
              @click="closeMobileMenu"
            >
              📈 Reports
            </router-link>
            <router-link
              to="/flow"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'flow' }"
              @click="closeMobileMenu"
            >
              🌊 Flow Chart
            </router-link>
            <router-link
              to="/reconciliation"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'reconciliation' }"
              @click="closeMobileMenu"
            >
              ✅ Reconciliation
            </router-link>
            <router-link
              to="/import"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'import' }"
              @click="closeMobileMenu"
            >
              📤 Import
            </router-link>
            <router-link
              to="/helpers"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'helpers' }"
              @click="closeMobileMenu"
            >
              🛠️ Helpers
            </router-link>
            <router-link
              to="/audit"
              class="mobile-nav-link"
              :class="{ 'mobile-nav-link-active': $route.name === 'audit' }"
              @click="closeMobileMenu"
            >
              📋 Audit
            </router-link>
          </div>

          <!-- Settings -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
            <button
              @click="toggleTheme"
              class="mobile-nav-link flex items-center justify-between w-full"
            >
              <span>{{ themeLabel }}</span>
              <span class="text-lg">{{ themeIcon }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useAuth } from '../composables/useAuth';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { logout } = useAuth();
const { themeIcon, themeLabel, toggleTheme } = useTheme();

// State
const showUserMenu = ref(false);
const showMobileMenu = ref(false);
const showMoreMenu = ref(false);

// Computed
const userInitials = computed(() => {
  if (!authStore.userName) return 'U';
  return authStore.userName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

const isMoreMenuActive = computed(() => {
  return ['categories', 'keyword-rules', 'reports', 'reconciliation', 'import', 'helpers', 'audit'].includes(route.name);
});

// Methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
  closeAllMenus(false, true, false);
};

const closeUserMenu = () => {
  showUserMenu.value = false;
};

const toggleMoreMenu = () => {
  showMoreMenu.value = !showMoreMenu.value;
  closeAllMenus(false, false, true);
};

const closeMoreMenu = () => {
  showMoreMenu.value = false;
};

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value;
  closeAllMenus(true, false, false);
};

const closeMobileMenu = () => {
  showMobileMenu.value = false;
};

const closeAllMenus = (keepMobile = false, keepUser = false, keepMore = false) => {
  if (!keepMobile) showMobileMenu.value = false;
  if (!keepUser) showUserMenu.value = false;
  if (!keepMore) showMoreMenu.value = false;
};

const handleLogout = async () => {
  closeUserMenu();
  await logout();
  router.push('/login');
};

// Close menus when clicking outside
const handleClickOutside = (event) => {
  // Check if click is outside all dropdown menus
  const isClickInDropdown = event.target.closest('.relative') || 
                           event.target.closest('[class*="dropdown"]');
  if (!isClickInDropdown) {
    closeAllMenus();
  }
};

// Lifecycle
onMounted(async () => {
  document.addEventListener('click', handleClickOutside);
  // Theme is already initialized in main.js, no need to initialize again
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.nav-link {
  @apply inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors;
}

.nav-link-active {
  @apply border-blue-500 text-gray-900 dark:text-white;
}

.dropdown-link {
  @apply block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}

.mobile-nav-link {
  @apply block px-3 py-2 rounded-md text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors;
}

.mobile-nav-link-active {
  @apply text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700;
}
</style>
