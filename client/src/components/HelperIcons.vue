<template>
  <!-- Loan Repayment Icon -->
  <svg v-if="type === 'loan'" :class="className" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" :fill="primaryColor" opacity="0.2"/>
    <path d="M2 17L12 22L22 17" :stroke="primaryColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 12L12 17L22 12" :stroke="primaryColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 2V12" :stroke="primaryColor" stroke-width="2" stroke-linecap="round"/>
  </svg>

  <!-- Savings Goal Icon -->
  <svg v-else-if="type === 'savings'" :class="className" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" :fill="primaryColor" opacity="0.1"/>
    <circle cx="12" cy="12" r="6" :stroke="primaryColor" stroke-width="2"/>
    <circle cx="12" cy="12" r="2" :fill="primaryColor"/>
    <path d="M12 2V6M12 18V22M2 12H6M18 12H22" :stroke="primaryColor" stroke-width="2" stroke-linecap="round"/>
  </svg>

  <!-- Income Tax Icon -->
  <svg v-else-if="type === 'tax'" :class="className" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" :fill="primaryColor" opacity="0.1"/>
    <path d="M8 8H16M8 12H16M8 16H13" :stroke="primaryColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M3 7L7 3M21 7L17 3M3 17L7 21M21 17L17 21" :stroke="primaryColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>

  <!-- Buy Now Pay Later Icon -->
  <svg v-else-if="type === 'bnpl'" :class="className" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="20" height="14" rx="2" :fill="primaryColor" opacity="0.1"/>
    <rect x="2" y="6" width="20" height="14" rx="2" :stroke="primaryColor" stroke-width="2"/>
    <path d="M6 10H18M6 14H14" :stroke="primaryColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="8" cy="18" r="1.5" :fill="primaryColor"/>
    <circle cx="12" cy="18" r="1.5" :fill="primaryColor"/>
  </svg>

  <!-- Budget Breakdown Icon -->
  <svg v-else-if="type === 'budget'" :class="className" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" :fill="primaryColor" opacity="0.1"/>
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22" :stroke="primaryColor" stroke-width="2"/>
    <path d="M12 2C16.42 2 20 5.58 20 10C20 14.42 16.42 18 12 18" :stroke="primaryColor" stroke-width="2"/>
    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6" :stroke="primaryColor" stroke-width="2"/>
    <circle cx="12" cy="12" r="2" :fill="primaryColor"/>
  </svg>

  <!-- Emergency Fund Icon -->
  <svg v-else-if="type === 'emergency'" :class="className" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7V12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12V7L12 2Z" :fill="primaryColor" opacity="0.1"/>
    <path d="M12 2L3 7V12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12V7L12 2Z" :stroke="primaryColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 8V12M12 16H12.01" :stroke="primaryColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['loan', 'savings', 'tax', 'bnpl', 'budget', 'emergency'].includes(value)
  },
  primaryColor: {
    type: String,
    default: '#3B82F6' // Default blue
  },
  className: {
    type: String,
    default: 'w-8 h-8'
  }
});
</script>

