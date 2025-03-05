<template>
  <div class="flex items-center border p-2">
    <div class="flex flex-col items-center">
      <img :src="location.small_image" alt="Plant Image" class="h-50 border rounded-md mb-4">
      <div class="text-center">
        <!-- Additional content can be added here -->
        <p>{{ location.label }}</p>
        <p>Last Verified: {{ location.last_verified }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  location: Object
});
</script>

<style scoped>
/* Add any additional styles here */
</style> 