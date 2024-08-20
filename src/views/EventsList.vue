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
  }
});
const displayDate = (date) => {
    return new Date(date).toLocaleDateString();
}
const volunteerDayClick = (id) => {
    window.location=`/d/${id}`
}

const currentDate = new Date();

const upcomingEvents = computed(() => {
  return events.value.filter(event => new Date(event.startDatetime) >= currentDate);
});

const pastEvents = computed(() => {
  return events.value.filter(event => new Date(event.startDatetime) < currentDate);
});

// let heroImage = function(event) {
//   if (import.meta.env.VITE_API_URL == 'http://localhost:1337' && !event.attributes.hero.data.attributes?.url.includes('googleapis.com')) {
//     return `${baseUrl}${event.attributes.hero.data.attributes?.url}`;
//   } else {
//     return event.attributes.hero.data.attributes?.url;
//   }
// }

// const truncateExcerpt = (excerpt) => {
//     return `${excerpt?.substring(0, 150)}...`;
// };
</script>

<template>
  <div class="flex flex-col md:flex-row stew font-roboto">
    <div class="flex-1">
      <div class="px-4 py-2 md:px-8 md:py-4"> <!-- Conditional padding for non-mobile screens -->
        <h1 class="text-2xl font-bold mb-4 font-roboto sm:text-3xl">Garden Steward Events</h1>
        <p class="text-md mb-4 font-roboto">Hub to local, group harvesting, land restoration, garden events.</p>
      </div>
      <div class="flex justify-center items-center">
        <!-- Loading spinner -->
        <div v-if="isLoading" class="flex justify-center items-center">
          <span class="loader"></span> <!-- Add your spinner element here -->
        </div>
        <!-- Events list -->
        <div v-else class="space-y-8 w-full px-4 md:px-8">
          <div v-if="upcomingEvents.length">
            <h3 class="text-2xl font-bold mb-2 mt-2">Upcoming Events:</h3>
            <div class="space-y-2">
              <div v-for="day in upcomingEvents" :key="day.id" 
                   class="border-r-4 border rounded p-3 bg-white hover:opacity-70 cursor-pointer hover:bg-yellow-300"  
                   @click="volunteerDayClick(day.id)">
                <span class="text-xl font-bold">{{ day.title }}</span>
                <p class="text-m mb-2">{{ day.blurb }}</p>
                <p class="text-m">{{ displayDate(day.startDatetime) }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="pastEvents.length">
            <h3 class="text-2xl font-bold mb-2 mt-2">Recent Events:</h3>
            <div class="space-y-2">
              <div v-for="day in pastEvents" :key="day.id" 
                   class="border-r-4 border rounded p-3 bg-white hover:opacity-70 cursor-pointer hover:bg-yellow-300"  
                   @click="volunteerDayClick(day.id)">
                <span class="text-xl font-bold">{{ day.title }}</span>
                <p class="text-m mb-2">{{ day.blurb }}</p>
                <p class="text-m">{{ displayDate(day.startDatetime) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Additional styles if needed */
.loader {
  border: 13px solid #f3f3f3;
  border-radius: 50%;
  border-top: 13px solid #0bb365;
  width: 75px;
  height: 75px;
  animation: spin 1.5s linear infinite;
  margin-bottom: 100px;
}

.blog-content p {
  margin-top: 0.25rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>