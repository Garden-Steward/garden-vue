<script setup>
import { storeToRefs } from 'pinia';
import { ref, watch, computed } from 'vue';

import { useEventStore } from '@/stores';
import { getImageOrDefault } from '@/helpers/image-utils';
import { getGardenColor } from '@/helpers/color-utils';

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

// Calculate date 45 days from now
const futureDateThreshold = computed(() => {
  const date = new Date();
  date.setDate(date.getDate() + 45);
  return date;
});

// Upcoming events (within 45 days), sorted by date (soonest first)
const upcomingEvents = computed(() => {
  if (!events.value || !Array.isArray(events.value)) return [];
  const upcoming = events.value
    .filter(event => {
      const eventDate = new Date(event.startDatetime);
      return eventDate >= currentDate && eventDate <= futureDateThreshold.value;
    })
    .sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
  return upcoming;
});

// Future events (more than 45 days away), sorted by date (soonest first)
const futureEvents = computed(() => {
  if (!events.value || !Array.isArray(events.value)) return [];
  const future = events.value
    .filter(event => {
      const eventDate = new Date(event.startDatetime);
      return eventDate > futureDateThreshold.value;
    })
    .sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
  return future;
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

// Get garden object from event
const getGardenFromEvent = (event) => {
  if (!event?.garden) return null;
  return event.garden?.data || event.garden;
};

// Get garden color for event banner
const getGardenBannerColor = (event) => {
  const garden = getGardenFromEvent(event);
  return getGardenColor(garden);
};

// Get rgba color values for banner overlay (opacity 0.9)
const getBannerOverlayColor = (colorName) => {
  const colorMap = {
    red: 'rgba(239, 68, 68, 0.9)',      // red-500
    green: 'rgba(34, 197, 94, 0.9)',    // green-500
    blue: 'rgba(59, 130, 246, 0.9)',    // blue-500
    orange: 'rgba(249, 115, 22, 0.9)',  // orange-500
    purple: 'rgba(168, 85, 247, 0.9)',  // purple-500
    fuchsia: 'rgba(217, 70, 239, 0.9)', // fuchsia-500
    emerald: 'rgba(16, 185, 129, 0.9)', // emerald-500
    violet: 'rgba(139, 92, 246, 0.9)',  // violet-500
    indigo: 'rgba(99, 102, 241, 0.9)',  // indigo-500
    yellow: 'rgba(234, 179, 8, 0.9)',   // yellow-500
    lime: 'rgba(132, 204, 22, 0.9)',    // lime-500
    slate: 'rgba(100, 116, 139, 0.9)'   // slate-500
  };
  return colorMap[colorName] || 'rgba(138, 163, 124, 0.9)'; // fallback to custom-green
};

// Get rgba color values for date badge (opacity 0.3)
const getBadgeColor = (colorName) => {
  const colorMap = {
    red: 'rgba(239, 68, 68, 0.3)',      // red-500
    green: 'rgba(34, 197, 94, 0.3)',    // green-500
    blue: 'rgba(59, 130, 246, 0.3)',    // blue-500
    orange: 'rgba(249, 115, 22, 0.3)',  // orange-500
    purple: 'rgba(168, 85, 247, 0.3)',  // purple-500
    fuchsia: 'rgba(217, 70, 239, 0.3)', // fuchsia-500
    emerald: 'rgba(16, 185, 129, 0.3)', // emerald-500
    violet: 'rgba(139, 92, 246, 0.3)',  // violet-500
    indigo: 'rgba(99, 102, 241, 0.3)',  // indigo-500
    yellow: 'rgba(234, 179, 8, 0.3)',   // yellow-500
    lime: 'rgba(132, 204, 22, 0.3)',    // lime-500
    slate: 'rgba(100, 116, 139, 0.3)'   // slate-500
  };
  return colorMap[colorName] || 'rgba(138, 163, 124, 0.3)'; // fallback to custom-green
};

// Get bright text color for badge (100% opacity)
const getBadgeTextColor = (colorName) => {
  const colorMap = {
    red: 'rgba(255, 100, 100, 1)',      // bright red
    green: 'rgba(74, 222, 128, 1)',      // bright green (green-400)
    blue: 'rgba(96, 165, 250, 1)',      // bright blue (blue-400)
    orange: 'rgba(251, 146, 60, 1)',    // bright orange (orange-400)
    purple: 'rgba(192, 132, 252, 1)',   // bright purple (purple-400)
    fuchsia: 'rgba(240, 171, 252, 1)',  // bright fuchsia (fuchsia-300)
    emerald: 'rgba(52, 211, 153, 1)',   // bright emerald (emerald-400)
    violet: 'rgba(167, 139, 250, 1)',   // bright violet (violet-400)
    indigo: 'rgba(129, 140, 248, 1)',   // bright indigo (indigo-400)
    yellow: 'rgba(250, 204, 21, 1)',    // bright yellow (yellow-400)
    lime: 'rgba(163, 230, 53, 1)',      // bright lime (lime-400)
    slate: 'rgba(148, 163, 184, 1)'     // bright slate (slate-400)
  };
  return colorMap[colorName] || 'rgba(138, 163, 124, 1)'; // fallback to custom-green at 100% opacity
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
                   class="flex flex-col border-r-4 border rounded bg-[rgba(26,26,26,0.6)] border-[#3d4d36]/50 hover:opacity-70 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] transition-colors"  
                   @click="volunteerDayClick(day.id)">
                <!-- Garden Name Banner at Top -->
                <div 
                  class="w-full px-4 py-2 rounded-t"
                  :style="{ backgroundColor: getBannerOverlayColor(getGardenBannerColor(day)) }"
                >
                  <p class="text-lg font-semibold text-white text-right">{{ getGardenName(day) }}</p>
                </div>
                <!-- Event Content Row -->
                <div class="flex gap-3 p-3">
                  <!-- Garden Image Square -->
                  <div class="flex-shrink-0 w-32 h-32 relative">
                    <img 
                      :src="getGardenImageThumbnail(day)" 
                      :alt="getGardenName(day)"
                      class="w-full h-full object-cover rounded"
                    />
                  </div>
                  <!-- Event Content -->
                  <div class="flex-1 min-w-0">
                    <span class="text-xl font-bold text-[#f5f5f5]">{{ day.title }}</span>
                    <p class="text-m mb-2 text-[#d0d0d0]">{{ day.blurb }}</p>
                    <p 
                      class="text-lg font-medium inline-block rounded-md px-3 py-1"
                      :style="{ 
                        backgroundColor: getBadgeColor(getGardenBannerColor(day)),
                        color: getBadgeTextColor(getGardenBannerColor(day))
                      }"
                    >{{ displayDate(day.startDatetime) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="futureEvents.length">
            <h3 class="text-2xl font-bold mb-2 mt-2 text-[#f5f5f5]">Future Events:</h3>
            <div class="space-y-2">
              <div v-for="day in futureEvents" :key="day.id" 
                   class="flex flex-col border-r-4 border rounded bg-[rgba(26,26,26,0.6)] border-[#3d4d36]/50 hover:opacity-70 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] transition-colors"  
                   @click="volunteerDayClick(day.id)">
                <!-- Garden Name Banner at Top -->
                <div 
                  class="w-full px-4 py-2 rounded-t"
                  :style="{ backgroundColor: getBannerOverlayColor(getGardenBannerColor(day)) }"
                >
                  <p class="text-lg font-semibold text-white text-right">{{ getGardenName(day) }}</p>
                </div>
                <!-- Event Content Row -->
                <div class="flex gap-3 p-3">
                  <!-- Garden Image Square -->
                  <div class="flex-shrink-0 w-32 h-32 relative">
                    <img 
                      :src="getGardenImageThumbnail(day)" 
                      :alt="getGardenName(day)"
                      class="w-full h-full object-cover rounded"
                    />
                  </div>
                  <!-- Event Content -->
                  <div class="flex-1 min-w-0">
                    <span class="text-xl font-bold text-[#f5f5f5]">{{ day.title }}</span>
                    <p class="text-m mb-2 text-[#d0d0d0]">{{ day.blurb }}</p>
                    <p 
                      class="text-lg font-medium inline-block rounded-md px-3 py-1"
                      :style="{ 
                        backgroundColor: getBadgeColor(getGardenBannerColor(day)),
                        color: getBadgeTextColor(getGardenBannerColor(day))
                      }"
                    >{{ displayDate(day.startDatetime) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="pastEvents.length">
            <h3 class="text-2xl font-bold mb-2 mt-2 text-[#f5f5f5]">Recent Events:</h3>
            <div class="space-y-2">
              <div v-for="day in pastEvents" :key="day.id" 
                   class="flex flex-col border-r-4 border rounded bg-[rgba(26,26,26,0.6)] border-[#3d4d36]/50 hover:opacity-70 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] transition-colors"  
                   @click="volunteerDayClick(day.id)">
                <!-- Garden Name Banner at Top -->
                <div 
                  class="w-full px-4 py-2 rounded-t"
                  :style="{ backgroundColor: getBannerOverlayColor(getGardenBannerColor(day)) }"
                >
                  <p class="text-lg font-semibold text-white text-right">{{ getGardenName(day) }}</p>
                </div>
                <!-- Event Content Row -->
                <div class="flex gap-3 p-3">
                  <!-- Garden Image Square -->
                  <div class="flex-shrink-0 w-32 h-32 relative">
                    <img 
                      :src="getGardenImageThumbnail(day)" 
                      :alt="getGardenName(day)"
                      class="w-full h-full object-cover rounded"
                    />
                  </div>
                  <!-- Event Content -->
                  <div class="flex-1 min-w-0">
                    <span class="text-xl font-bold text-[#f5f5f5]">{{ day.title }}</span>
                    <p class="text-m mb-2 text-[#d0d0d0]">{{ day.blurb }}</p>
                    <p 
                      class="text-lg font-medium inline-block rounded-md px-3 py-1"
                      :style="{ 
                        backgroundColor: getBadgeColor(getGardenBannerColor(day)),
                        color: getBadgeTextColor(getGardenBannerColor(day))
                      }"
                    >{{ displayDate(day.startDatetime) }}</p>
                  </div>
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