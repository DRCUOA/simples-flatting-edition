<template>
  <footer class="w-full border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 py-2 px-4 mt-auto">
    <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
      <!-- Build Info -->
      <div class="flex items-center gap-2">
        <span>Build Number: {{ buildVersion }}</span>
        <span>|</span>
        <span>Built By NZWEBAPPS Ltd © 2025</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue';
import packageJson from '../../package.json';

// Get build version directly from package.json (dynamic)
const buildVersion = computed(() => {
  return packageJson.version || '0.0.1';
});
</script>

