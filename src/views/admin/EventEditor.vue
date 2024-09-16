<script setup>
import { storeToRefs } from 'pinia';
import { ref, watch, computed } from 'vue';

import { useEventStore } from '@/stores';

const eventStore = useEventStore();
// const baseUrl = `${import.meta.env.VITE_API_URL}`;

const { events } = storeToRefs(eventStore);
const isLoading = ref(true);

eventStore.fetchPublic();

watch(events, (newEvents) => {
  console.log("newEvents", events)
  if (newEvents.length > 0) {
    isLoading.value = false;
  } else {
    isLoading.value = false;
    this.error = "No events found"
  }
});

// const truncateExcerpt = (excerpt) => {
//     return `${excerpt?.substring(0, 150)}...`;
// };
</script>

<template>
  <div class="flex flex-col md:flex-row stew font-roboto">
    <div class="flex-1">
      <div class="px-4 py-2 md:px-8 md:py-4"> <!-- Conditional padding for non-mobile screens -->
        <h1 class="text-2xl font-bold mb-4 font-roboto sm:text-3xl">Event Editor</h1>
        <p class="text-md mb-4 font-roboto">Customize your Event Page.</p>
      </div>
    </div>
  </div>
</template>