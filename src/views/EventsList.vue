<script setup>
import { storeToRefs } from 'pinia';
import { ref, watch, computed } from 'vue';

import { useEventStore } from '@/stores';
import { getImageOrDefault } from '@/helpers/image-utils';

const eventStore = useEventStore();
const baseUrl = `${import.meta.env.VITE_API_URL}`;

const { events, eventsPagination } = storeToRefs(eventStore);
const isLoading = ref(true);
const isLoadingMore = ref(false);
const error = ref(null);

eventStore.fetchPublic();

watch(events, (newEvents) => {
  console.log("newEvents", events)
  // Check if events is loading
  if (newEvents && newEvents.loading) {
    isLoading.value = true;
    return;
  }
  
  // Check if events is an array with data
  if (Array.isArray(newEvents)) {
    if (newEvents.length > 0) {
      isLoading.value = false;
      error.value = null;
    } else if (!isLoading.value) {
      isLoading.value = false;
      error.value = "No events found";
    }
  } else if (newEvents && !newEvents.loading) {
    // Events loaded but might be empty or in different format
    isLoading.value = false;
  }
}, { immediate: true });

const hasMoreEvents = computed(() => {
  return eventsPagination.value.page < eventsPagination.value.pageCount;
});

const loadMore = async () => {
  isLoadingMore.value = true;
  try {
    await eventStore.loadMoreEvents();
  } catch (err) {
    error.value = "Failed to load more events";
    console.error("Error loading more events:", err);
  } finally {
    isLoadingMore.value = false;
  }
};
const displayDate = (date) => {
    let cleanDate = new Date(date).toLocaleDateString();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    const formattedDate = new Date(date).toLocaleString('en-US', options);
    
    // Add ordinal suffix to the day
    const day = new Date(date).getDate();
    const ordinalSuffix = ['th', 'st', 'nd', 'rd'][(day % 10 > 3) ? 0 : (day % 100 - day % 10 != 10) * (day % 10)];
    
    cleanDate = formattedDate.replace(/(\d+)/, `$1${ordinalSuffix}`);
    return cleanDate;
}
const volunteerDayClick = (id) => {
    window.location=`/d/${id}`
}

const currentDate = new Date();

const upcomingEvents = computed(() => {
  if (!events.value || !Array.isArray(events.value)) return [];
  return events.value.filter(event => new Date(event.startDatetime) >= currentDate);
});

const pastEvents = computed(() => {
  if (!events.value || !Array.isArray(events.value)) return [];
  return events.value.filter(event => new Date(event.startDatetime) < currentDate);
});

// Get event hero image thumbnail URL (prefer event's hero_image over garden's)
const getGardenImageThumbnail = (event) => {
  // First, try to get hero_image from the event itself
  let heroImage = event?.hero_image || event?.attributes?.hero_image || event?.data?.attributes?.hero_image;
  
  // If event doesn't have hero_image, fall back to garden's hero_image
  if (!heroImage && event?.garden) {
    const garden = event.garden;
    heroImage = garden?.data?.attributes?.hero_image || garden?.attributes?.hero_image || garden?.hero_image;
  }
  
  if (!heroImage) return getImageOrDefault(null);
  
  // Handle different Strapi formats
  let imageUrl = null;
  
  // Check for thumbnail format first
  if (heroImage?.data?.attributes?.formats?.thumbnail?.url) {
    imageUrl = heroImage.data.attributes.formats.thumbnail.url;
  } else if (heroImage?.formats?.thumbnail?.url) {
    imageUrl = heroImage.formats.thumbnail.url;
  } else if (heroImage?.data?.attributes?.formats?.small?.url) {
    imageUrl = heroImage.data.attributes.formats.small.url;
  } else if (heroImage?.formats?.small?.url) {
    imageUrl = heroImage.formats.small.url;
  } else if (heroImage?.data?.attributes?.url) {
    imageUrl = heroImage.data.attributes.url;
  } else if (heroImage?.url) {
    imageUrl = heroImage.url;
  }
  
  // Handle localhost URLs
  if (imageUrl && import.meta.env.VITE_API_URL === 'http://localhost:1337' && !imageUrl.includes('googleapis.com') && imageUrl.startsWith('/')) {
    imageUrl = `${baseUrl}${imageUrl}`;
  }
  
  return getImageOrDefault(imageUrl);
};

// Get garden name
const getGardenName = (event) => {
  if (!event?.garden) return '';
  const garden = event.garden;
  return garden?.data?.attributes?.title || garden?.attributes?.title || garden?.title || '';
};
</script>

<template>
  <div class="flex flex-col md:flex-row stew font-roboto bg-[#2d3e26] min-h-screen">
    <div class="flex-1">
      <div class="px-4 py-2 md:px-8 md:py-4"> <!-- Conditional padding for non-mobile screens -->
        <h1 class="text-2xl font-bold mb-4 font-roboto sm:text-3xl text-[#f5f5f5]">Garden Steward Events</h1>
        <p class="text-md mb-4 font-roboto text-[#d0d0d0]">Hub to local, group harvesting, land restoration, garden events.</p>
      </div>
      <div class="flex justify-center items-center">
        <!-- Loading spinner -->
        <div v-if="isLoading" class="flex justify-center items-center">
          <span class="loader"></span> <!-- Add your spinner element here -->
        </div>
        <!-- Events list -->
        <div v-else class="space-y-8 w-full px-4 md:px-8">
          <div v-if="upcomingEvents.length">
            <h3 class="text-2xl font-bold mb-2 mt-2 text-[#f5f5f5]">Upcoming Events:</h3>
            <div class="space-y-2">
              <div v-for="day in upcomingEvents" :key="day.id" 
                   class="flex gap-3 border-r-4 border rounded p-3 bg-[rgba(26,26,26,0.6)] border-[#3d4d36]/50 hover:opacity-70 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] transition-colors"  
                   @click="volunteerDayClick(day.id)">
                <!-- Garden Image Square -->
                <div class="flex-shrink-0 w-32 h-32 relative">
                  <img 
                    :src="getGardenImageThumbnail(day)" 
                    :alt="getGardenName(day)"
                    class="w-full h-full object-cover rounded"
                  />
                  <!-- Garden Name Overlay -->
                  <div class="absolute bottom-0 left-0 right-0 bg-[rgba(138,163,124,0.9)] px-2 py-1 rounded-b">
                    <p class="text-xs font-semibold text-white truncate">{{ getGardenName(day) }}</p>
                  </div>
                </div>
                <!-- Event Content -->
                <div class="flex-1 min-w-0">
                  <span class="text-xl font-bold text-[#f5f5f5]">{{ day.title }}</span>
                  <p class="text-m mb-2 text-[#d0d0d0]">{{ day.blurb }}</p>
                  <p class="text-m inline-block bg-[rgba(138,163,124,0.3)] text-[#8aa37c] rounded-md px-3 py-1">{{ displayDate(day.startDatetime) }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="pastEvents.length">
            <h3 class="text-2xl font-bold mb-2 mt-2 text-[#f5f5f5]">Recent Events:</h3>
            <div class="space-y-2">
              <div v-for="day in pastEvents" :key="day.id" 
                   class="flex gap-3 border-r-4 border rounded p-3 bg-[rgba(26,26,26,0.6)] border-[#3d4d36]/50 hover:opacity-70 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] transition-colors"  
                   @click="volunteerDayClick(day.id)">
                <!-- Garden Image Square -->
                <div class="flex-shrink-0 w-32 h-32 relative">
                  <img 
                    :src="getGardenImageThumbnail(day)" 
                    :alt="getGardenName(day)"
                    class="w-full h-full object-cover rounded"
                  />
                  <!-- Garden Name Overlay -->
                  <div class="absolute bottom-0 left-0 right-0 bg-[rgba(138,163,124,0.9)] px-2 py-1 rounded-b">
                    <p class="text-xs font-semibold text-white truncate">{{ getGardenName(day) }}</p>
                  </div>
                </div>
                <!-- Event Content -->
                <div class="flex-1 min-w-0">
                  <span class="text-xl font-bold text-[#f5f5f5]">{{ day.title }}</span>
                  <p class="text-m mb-2 text-[#d0d0d0]">{{ day.blurb }}</p>
                  <p class="text-m inline-block bg-[rgba(138,163,124,0.3)] text-[#8aa37c] rounded-md px-3 py-1">{{ displayDate(day.startDatetime) }}</p>
                </div>
              </div>
            </div>
          </div>
          <div v-if="error">
            <p class="text-m text-[#d0d0d0]">{{ error }}</p>
          </div>
          
          <!-- Load More Button -->
          <div v-if="hasMoreEvents" class="flex justify-center mt-8 mb-4">
            <button 
              @click="loadMore"
              :disabled="isLoadingMore"
              class="px-6 py-3 bg-custom-green text-white font-medium rounded-lg hover:bg-darker-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoadingMore">Loading...</span>
              <span v-else>Load More Events</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Additional styles if needed */
.loader {
  border: 13px solid rgba(26, 26, 26, 0.6);
  border-radius: 50%;
  border-top: 13px solid #8aa37c;
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

.bg-peach-100 {
  background-color: #FFDAB9;
}

.text-peach-800 {
  color: #8B4513;
}
</style>