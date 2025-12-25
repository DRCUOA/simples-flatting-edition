import { ref, computed } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';

export function useAuth() {
  const authStore = useAuthStore();

  // Local reactive state
  const loginForm = ref({
    username: '',
    password: ''
  });

  const registerForm = ref({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const profileForm = ref({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Validation rules
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    return password && password.length >= 8 && passwordRegex.test(password);
  };

  const validateUsername = (username) => {
    // Alphanumeric and underscore only, 3-50 characters
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    return usernameRegex.test(username);
  };

  // API calls
  const login = async (credentials) => {
    try {
      authStore.setLoading(true);
      authStore.clearError();

      // Use the new secure authentication endpoint
      const response = await axios.post('/auth/login', {
        username: credentials.username,
        password: credentials.password
      });

      if (response.data.accessToken && response.data.user) {
        authStore.login(response.data.user, response.data.accessToken);
        return { success: true, message: 'Login successful' };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      authStore.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      authStore.setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      authStore.setLoading(true);
      authStore.clearError();

      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registrationData } = userData;

      const response = await axios.post('/users', registrationData);

      return { success: true, message: response.data.message, userId: response.data.user_id };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      authStore.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      authStore.setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Use the new secure logout endpoint
      await axios.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      authStore.logout();
    }
  };

  const getProfile = async () => {
    try {
      authStore.setLoading(true);
      authStore.clearError();

      // Use the new secure profile endpoint
      const response = await axios.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      });

      if (response.data.user) {
        authStore.setUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch profile';
      authStore.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      authStore.setLoading(false);
    }
  };

  const updateProfile = async (userData) => {
    try {
      authStore.setLoading(true);
      authStore.clearError();

      // Remove confirmPassword before sending to API
      const { confirmPassword, ...updateData } = userData;

      const response = await axios.put('/users/profile', updateData, {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      });

      authStore.updateProfile(updateData);
      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Profile update failed';
      authStore.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      authStore.setLoading(false);
    }
  };

  const getAllUsers = async () => {
    try {
      authStore.setLoading(true);
      authStore.clearError();

      const response = await axios.get('/users', {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      });

      return { success: true, users: response.data };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch users';
      authStore.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      authStore.setLoading(false);
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      authStore.setLoading(true);
      authStore.clearError();

      const response = await axios.put(`/users/${userId}`, userData, {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      });

      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'User update failed';
      authStore.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      authStore.setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    try {
      authStore.setLoading(true);
      authStore.clearError();

      const response = await axios.delete(`/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      });

      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'User deletion failed';
      authStore.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      authStore.setLoading(false);
    }
  };

  // Form validation helpers
  const validateLoginForm = () => {
    const errors = [];

    if (!loginForm.value.username.trim()) {
      errors.push('Username is required');
    }

    if (!loginForm.value.password) {
      errors.push('Password is required');
    }

    return errors;
  };

  const validateRegisterForm = () => {
    const errors = [];
    const form = registerForm.value;

    if (!form.username.trim()) {
      errors.push('Username is required');
    } else if (!validateUsername(form.username)) {
      errors.push('Username must be 3-50 characters and contain only letters, numbers, and underscores');
    }

    if (!form.email.trim()) {
      errors.push('Email is required');
    } else if (!validateEmail(form.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!form.password) {
      errors.push('Password is required');
    } else if (!validatePassword(form.password)) {
      errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
    }

    if (form.password !== form.confirmPassword) {
      errors.push('Passwords do not match');
    }

    return errors;
  };

  const validateProfileForm = () => {
    const errors = [];
    const form = profileForm.value;

    // Only validate if fields are provided (for partial updates)
    if (form.username && !validateUsername(form.username)) {
      errors.push('Username must be 3-50 characters and contain only letters, numbers, and underscores');
    }

    if (form.email && !validateEmail(form.email)) {
      errors.push('Please enter a valid email address');
    }

    if (form.password) {
      if (!validatePassword(form.password)) {
        errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
      }

      if (form.password !== form.confirmPassword) {
        errors.push('Passwords do not match');
      }
    }

    return errors;
  };

  // Initialize auth state
  const initializeAuth = () => {
    authStore.initializeAuth();
  };

  // Reset forms
  const resetLoginForm = () => {
    loginForm.value = { username: '', password: '' };
  };

  const resetRegisterForm = () => {
    registerForm.value = {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    };
  };

  const resetProfileForm = () => {
    profileForm.value = {
      username: authStore.userName,
      email: authStore.userEmail,
      password: '',
      confirmPassword: ''
    };
  };

  return {
    // Store state
    user: computed(() => authStore.user),
    token: computed(() => authStore.token),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    isAdmin: computed(() => authStore.isAdmin),
    isLoading: computed(() => authStore.isLoading),
    error: computed(() => authStore.error),
    userName: computed(() => authStore.userName),
    userEmail: computed(() => authStore.userEmail),

    // Forms
    loginForm,
    registerForm,
    profileForm,

    // API methods
    login,
    register,
    logout,
    getProfile,
    updateProfile,
    getAllUsers,
    updateUser,
    deleteUser,

    // Validation
    validateLoginForm,
    validateRegisterForm,
    validateProfileForm,

    // Helpers
    initializeAuth,
    resetLoginForm,
    resetRegisterForm,
    resetProfileForm
  };
}
