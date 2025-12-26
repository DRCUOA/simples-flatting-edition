import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { readFileSync } from 'fs'

export default defineConfig(({ mode }) => {
  // Load .env vars from root directory
  // Use __dirname to get reliable path regardless of where command is run from
  const rootDir = path.resolve(__dirname, '..')
  const env = loadEnv(mode, rootDir, '')
 
  // Read package.json to get version
  const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))
  const appVersion = packageJson.version || 'unknown'
  
  // Read explicitly set values from .env
  // Support both VITE_API_BASE_URL (new standard) and VITE_API_URL (backward compatibility)
  const apiBaseUrl = env.VITE_API_BASE_URL || env.VITE_API_URL || 'http://localhost:3050/api'
  // Also check process.env as fallback since loadEnv might not load non-prefixed vars
  const frontendPort = parseInt(env.FRONTEND_PORT || process.env.FRONTEND_PORT || '8085', 10)
  
  // Extract backend URL from API base URL for proxy
  // Default to localhost:3050 if no API URL is configured
  const backendUrl = apiBaseUrl ? apiBaseUrl.replace('/api', '') : 'http://localhost:3050'

  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
    },
    plugins: [
      vue()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Tell Vite to look for .env files in the root directory
    // This allows loading existing variables alongside new ones
    envDir: rootDir,
    server: {
      port: frontendPort,
      strictPort: true, // Prevent Vite from auto-selecting a different port
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
 