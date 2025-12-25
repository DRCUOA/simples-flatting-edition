import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import CategoriesView from '../views/CategoriesView.vue';
import AccountsView from '../views/AccountsView.vue';
import TransactionImport from '../views/TransactionImport.vue';
import ReportsView from '../views/ReportsView.vue';
import CategoryReportView from '../views/CategoryReportView.vue';
import TransactionsView from '../views/TransactionsView.vue';
import ReconciliationView from '../views/ReconciliationView.vue';
import HelpersView from '../views/HelpersView.vue';
import AuditView from '../views/AuditView.vue';
import FlowView from '../views/FlowView.vue';
import KeywordRulesView from '../views/KeywordRulesView.vue';

// Authentication views
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';

// Components
import ProtectedRoute from '../components/ProtectedRoute.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public authentication routes
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },

    // Protected routes wrapped in ProtectedRoute component
    {
      path: '/',
      component: ProtectedRoute,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView
        },
        {
          path: '/profile',
          name: 'profile',
          component: ProfileView
        },
        {
          path: '/categories',
          name: 'categories',
          component: CategoriesView
        },
        {
          path: '/keyword-rules',
          name: 'keyword-rules',
          component: KeywordRulesView
        },
        {
          path: '/accounts',
          name: 'accounts',
          component: AccountsView
        },
        {
          path: '/accounts/:id',
          name: 'account-detail',
          component: () => import('../views/AccountDetailView.vue')
        },
        {
          path: '/import',
          name: 'import',
          component: TransactionImport
        },
        {
          path: '/transactions',
          name: 'transactions',
          component: TransactionsView
        },
        {
          path: '/reports',
          name: 'reports',
          component: ReportsView
        },
        {
          path: '/reports/categories',
          name: 'category-report',
          component: CategoryReportView
        },
        {
          path: '/flow',
          name: 'flow',
          component: FlowView
        },
        {
          path: '/reconciliation',
          name: 'reconciliation',
          component: ReconciliationView
        },
        {
          path: '/helpers',
          name: 'helpers',
          component: HelpersView
        },
        {
          path: '/audit',
          name: 'audit',
          component: AuditView
        },
        {
          path: '/audit/category-verification-files',
          name: 'category-verification-files',
          component: () => import('../views/CategoryVerificationFilesView.vue')
        }
      ]
    }
  ]
});

// Navigation guard for authentication and authorization
router.beforeEach(async (to, from, next) => {
  const authStore = (await import('../stores/auth')).useAuthStore();

  // Auth is already initialized in main.js before mounting
  // No need to call initializeAuth() here
  
  // Check if route requires authentication
  const isPublicRoute = ['login', 'register'].includes(to.name);

  if (isPublicRoute) {
    // If user is already authenticated and trying to access login/register, redirect to dashboard
    if (authStore.isAuthenticated) {
      next('/');
      return;
    }
    next();
    return;
  }

  // For protected routes, check if user is authenticated
  if (!authStore.isAuthenticated) {
    // Redirect to login with return path
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    });
    return;
  }

  // Check if route requires admin role
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    // User is authenticated but not admin, redirect to dashboard
    next('/');
    return;
  }

  next();
});

export default router; 