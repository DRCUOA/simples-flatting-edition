// client/src/composables/useTheme.js

import { ref, computed, watch } from 'vue';
import { useUserPreferences } from './useUserPreferences';

const THEME_KEY = 'ui_theme';
const DEFAULT_THEME = 'dark';

// Global theme state
const currentTheme = ref(DEFAULT_THEME);
const isInitialized = ref(false);

export function useTheme() {
  const { getPreference, setPreference } = useUserPreferences();

  // Computed properties
  const isDark = computed(() => currentTheme.value === 'dark');
  const isLight = computed(() => currentTheme.value === 'light');
  const themeIcon = computed(() => isDark.value ? '🌙' : '☀️');
  const themeLabel = computed(() => isDark.value ? 'Switch to Light' : 'Switch to Dark');

  // Apply theme to DOM
  const applyTheme = (theme) => {
    const html = document.documentElement;
    
    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
  };

  // Initialize theme from user preferences or system preference
  const initializeTheme = async () => {
    if (isInitialized.value) return;

    try {
      // Try to get user's saved preference
      const savedTheme = await getPreference(THEME_KEY, null);
      
      if (savedTheme) {
        currentTheme.value = savedTheme;
      } else {
        // Fallback to system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        currentTheme.value = prefersDark ? 'dark' : 'light';
        
        // Only save the detected preference if we don't already have one
        // This prevents infinite loops if the API call fails
        try {
          await setPreference(THEME_KEY, currentTheme.value);
        } catch (saveError) {
          console.warn('Failed to save theme preference, but continuing with theme application:', saveError);
        }
      }
      
      applyTheme(currentTheme.value);
      isInitialized.value = true;
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      // Fallback to default
      currentTheme.value = DEFAULT_THEME;
      applyTheme(currentTheme.value);
      isInitialized.value = true;
    }
  };

  // Toggle between light and dark themes
  const toggleTheme = async () => {
    const newTheme = isDark.value ? 'light' : 'dark';
    await setTheme(newTheme);
  };

  // Set specific theme
  const setTheme = async (theme) => {
    if (theme !== 'light' && theme !== 'dark') {
      console.error('Invalid theme:', theme);
      return;
    }

    try {
      currentTheme.value = theme;
      applyTheme(theme);
      
      // Save preference
      await setPreference(THEME_KEY, theme);
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  };

  // Watch for system theme changes
  const watchSystemTheme = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only update if user hasn't set a preference
      const savedTheme = getPreference(THEME_KEY, null);
      if (!savedTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    // Return cleanup function
    return () => mediaQuery.removeEventListener('change', handleChange);
  };

  return {
    // State
    currentTheme: computed(() => currentTheme.value),
    isDark,
    isLight,
    isInitialized: computed(() => isInitialized.value),
    
    // UI helpers
    themeIcon,
    themeLabel,
    
    // Methods
    initializeTheme,
    toggleTheme,
    setTheme,
    watchSystemTheme,
  };
}
