import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { useTheme } from './composables/useTheme'
import axios from 'axios'
import { useAuthStore } from './stores/auth'
import { setTokenProvider } from './lib/http'

const app = createApp(App)

// Create Pinia instance so we can access stores before mounting
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Configure axios early (before any store actions run)
// Prefer VITE_API_BASE_URL (new standard), fall back to VITE_API_URL (backward compatibility)
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3050/api'
axios.defaults.withCredentials = true

// Global axios interceptors for auth
const authStore = useAuthStore(pinia)

// SECURITY FIX: Set token provider for http.js to access in-memory tokens
// This allows http.js to access tokens without localStorage
setTokenProvider(() => authStore.token)

axios.interceptors.request.use(
  (config) => {
    // SECURITY FIX: Only use in-memory token from store (no localStorage)
    const token = authStore.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('[Axios Request Error]', error);
    return Promise.reject(error)
  }
)

axios.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    console.error('[Axios Error]', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : error.config?.url || 'unknown',
      message: error.message,
      response: error.response?.data
    });
    
    const status = error.response?.status
    const originalRequest = error.config || {}
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const newToken = await authStore.refreshToken()
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return axios(originalRequest)
      }
      authStore.logout()
      router.push('/login')
    }
    if (status === 401) {
      authStore.logout()
      router.push('/login')
    }
    return Promise.reject(error)
  }
)
app.use(Toast, {
  position: "top-right",
  timeout: 3000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false
})

// Initialize app with proper async sequence
async function initializeApp() {
  try {
    // Step 1: Initialize auth first (restore session if refresh token exists)
    await authStore.initializeAuth()
    
    // Step 2: Initialize theme (may need auth for user preferences)
    const { initializeTheme } = useTheme()
    await initializeTheme()
  } catch (error) {
    console.error('Failed to initialize app:', error)
    // Continue anyway with defaults
  } finally {
    // Step 3: Mount the app
    app.mount('#app')
  }
}

// Start initialization
initializeApp() 