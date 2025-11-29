<script setup>
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useRoute } from "vue-router";
import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';

import { useEventStore, useAuthStore  } from '@/stores';
const md = new MarkdownIt().use(markdownItAttrs);


import { watch, onMounted, onUnmounted, computed } from 'vue';

const eventStore = useEventStore();
const { user } = useAuthStore();
const showModal = ref(false);
const phoneNumber = ref('');
const phoneError = ref('');
const isRSVPed = ref(false);
const showLightbox = ref(false);
const lightboxImageIndex = ref(0);

const closeModal = () => {
  showModal.value = false;
};


const route = useRoute()
const { event } = storeToRefs(eventStore);
let renderedContent = '';

const isEventPast = computed(() => {
  if (!event.value?.attributes?.startDatetime) return false;
  const eventDate = new Date(event.value.attributes.startDatetime);
  const now = new Date();
  return eventDate < now;
});


const images = [
  "https://storage.googleapis.com/steward_upload/uploads/20240818_101336_dd55c7a910/20240818_101336_dd55c7a910.jpg",
  "https://storage.googleapis.com/steward_upload/uploads/garden_volunteers_feb24_2c9697c88b/garden_volunteers_feb24_2c9697c88b.jpg",
  "https://storage.googleapis.com/steward_upload/uploads/Screenshot_2024_08_20_at_7_23_46_AM_82aa7ed2a6/Screenshot_2024_08_20_at_7_23_46_AM_82aa7ed2a6.png"
];
const randomImage = images[Math.floor(Math.random() * images.length)];

watch(event, (newVal) => {
  if (newVal.attributes?.content) {
    renderedContent = md.render(newVal.attributes?.content);
  }
  if (newVal.attributes?.confirmed) {
    isRSVPed.value = newVal.attributes?.confirmed.data.some(item => item.id === user?.id);
  }
});

const rsvpEvent = async (e) => {
  console.log(e);

  if (isEventPast.value) {
    return;
  }

  if (user) {
    await eventStore.rsvpEvent({userId:user.id, id:route.params.id})
  } else {
    showModal.value = true;
  }
}

const submitPhoneNumber = async () => {
  if (isEventPast.value) {
    phoneError.value = 'This event has already passed. RSVP is no longer available.';
    return;
  }
  
  phoneError.value = ''
  const digitsOnly = phoneNumber.value.replace(/\D/g, '');
  if (digitsOnly && /^\d{10}$/.test(digitsOnly)) {
    try {
      await eventStore.rsvpEvent({phoneNumber: digitsOnly, id: route.params.id});
      closeModal();
      isRSVPed.value = true;
    } catch (error) {
      console.error('Error RSVPing to event:', error);
      phoneError.value = 'Error RSVPing to event';
    }
  } else {
    phoneError.value = 'Please enter a valid 10-digit phone number';
  }
};

const processDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

console.log("event: ", event);

eventStore.findById(route.params.id);

const formatPhoneNumber = (value) => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

const handlePhoneInput = (event) => {
  const formattedNumber = formatPhoneNumber(event.target.value);
  phoneNumber.value = formattedNumber;
};

const handleKeyPress = (event) => {
  if (event.key === 'Enter') {
    submitPhoneNumber();
  }
};

const getGalleryImages = () => {
  const gallery = event.value?.attributes?.featured_gallery
  if (!gallery) return []
  
  // Handle Strapi format: { data: [...] } or direct array
  let imagesArray = []
  if (gallery?.data && Array.isArray(gallery.data)) {
    imagesArray = gallery.data
  } else if (Array.isArray(gallery)) {
    imagesArray = gallery
  } else {
    return []
  }
  
  return imagesArray.map(img => {
    // Handle different Strapi formats
    if (typeof img === 'object' && img !== null) {
      return {
        id: img.id || img.data?.id,
        url: img.url || img.data?.attributes?.url || img.attributes?.url || ''
      }
    }
    return { id: null, url: img }
  }).filter(img => img.url)
}

const openLightbox = (index) => {
  lightboxImageIndex.value = index
  showLightbox.value = true
}

const closeLightbox = () => {
  showLightbox.value = false
}

const nextImage = () => {
  const images = getGalleryImages()
  if (lightboxImageIndex.value < images.length - 1) {
    lightboxImageIndex.value++
  } else {
    lightboxImageIndex.value = 0
  }
}

const prevImage = () => {
  const images = getGalleryImages()
  if (lightboxImageIndex.value > 0) {
    lightboxImageIndex.value--
  } else {
    lightboxImageIndex.value = images.length - 1
  }
}

const handleLightboxKeydown = (e) => {
  if (!showLightbox.value) return
  
  if (e.key === 'Escape') {
    closeLightbox()
  } else if (e.key === 'ArrowLeft') {
    prevImage()
  } else if (e.key === 'ArrowRight') {
    nextImage()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleLightboxKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleLightboxKeydown)
})

</script>

<template>
    <div id="event-view">
      <div class="max-w-4xl mx-auto px-6 py-12 bg-custom-light rounded-lg font-roboto">

        <div v-if="event?.attributes?.hero_image?.data?.attributes?.url">
          <img id="randomImage" alt="Hero Image" class="w-full h-auto mb-6 rounded-lg" :src="event?.attributes?.hero_image?.data?.attributes?.url">
        </div>
        <div v-else>
          <img id="randomImage" alt="Random Hero Image" class="w-full h-auto mb-6 rounded-lg" :src="randomImage">
        </div>
        <h1 class="text-3xl font-bold mb-6">{{ event?.attributes?.title }}</h1>
        <h4 class="text-lg font-bold mb-6">{{ processDate(event?.attributes?.startDatetime) }}</h4>
        <div v-if="event?.attributes?.blurb" class="text-left brief-box">
            <div v-html="event?.attributes?.blurb"></div>
        </div>
        <div class="text-left" v-if="event?.attributes?.content">
            <div v-html="renderedContent"></div>
        </div>
        
        <!-- Featured Gallery -->
        <div v-if="getGalleryImages().length > 0" class="mt-8 mb-6">
          <h2 class="text-2xl font-bold mb-4">Event Gallery</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div
              v-for="(image, index) in getGalleryImages()"
              :key="image.id || index"
              class="aspect-square cursor-pointer overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
              @click="openLightbox(index)"
            >
              <img
                :src="image.url"
                :alt="`Gallery image ${index + 1}`"
                class="w-full h-full object-cover"
              />
            </div>
          </div>
          <p v-if="event?.attributes?.photo_album_url" class="mt-4">
            <a 
              :href="event.attributes.photo_album_url" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-custom-green hover:underline font-medium"
            >
              View Full Album <i class="fas fa-external-link-alt"></i>
            </a>
          </p>
        </div>
        
        <div v-if="user?.id" class="text-left mt-5">
            <div v-if="!isRSVPed && !isEventPast" style="font-size: 1.2rem; font-weight: bold;" class="mb-2">Hello {{ user?.firstName }} {{ user?.lastName }}
              <p>Would you like to RSVP for this event?</p>
            </div>
            <p v-if="isEventPast" class="text-gray-600 font-medium mb-2">This event has already passed. RSVP is no longer available.</p>
            <a v-if="event?.attributes?.partiful_link && !isEventPast" :href="event.attributes.partiful_link" :class="{ 'bg-gray-500': isRSVPed || isEventPast, 'bg-green-700 hover:bg-green-900': !isRSVPed && !isEventPast }" class="inline-block hover:bg-green-900 text-white font-bold py-2 px-4 rounded pointer text-center no-underline" :style="{ pointerEvents: (isRSVPed || isEventPast) ? 'none' : 'auto', cursor: (isRSVPed || isEventPast) ? 'not-allowed' : 'pointer' }">
              {{ isRSVPed ? 'RSVP Initiated' : 'RSVP via Partiful' }}
            </a>
            <button v-else-if="!isEventPast" :class="{ 'bg-gray-500': isRSVPed, 'bg-green-700 hover:bg-green-900': !isRSVPed }" class="hover:bg-green-900 text-white font-bold py-2 px-4 rounded pointer no-underline" @click="rsvpEvent" :disabled="isRSVPed">
              {{ isRSVPed ? 'RSVP Initiated' : 'RSVP' }}
            </button>
            <p v-if="isRSVPed">Thank you for RSVPing {{ user?.firstName }} {{ user?.lastName }}!</p>
        </div>


        <!-- Conditional rendering of the agreement button -->
        <div v-else class="mt-6">
          <p v-if="isEventPast" class="text-gray-600 font-medium mb-2">This event has already passed. RSVP is no longer available.</p>
          <a v-if="event?.attributes?.partiful_link && !isEventPast" :href="event.attributes.partiful_link" :class="{ 'bg-gray-500': isRSVPed || isEventPast, 'bg-green-700 hover:bg-green-900': !isRSVPed && !isEventPast }" class="inline-block text-white font-bold py-2 px-4 rounded text-center no-underline" :style="{ pointerEvents: (isRSVPed || isEventPast) ? 'none' : 'auto', cursor: (isRSVPed || isEventPast) ? 'not-allowed' : 'pointer' }">
            {{ isRSVPed ? 'RSVP Initiated' : 'RSVP via Partiful' }}
          </a>
          <button v-else-if="!isEventPast" :class="{ 'bg-gray-500': isRSVPed, 'bg-green-700 hover:bg-green-900': !isRSVPed }" class="text-white font-bold py-2 px-4 rounded" @click="rsvpEvent" :disabled="isRSVPed">
            {{ isRSVPed ? 'RSVP Initiated' : 'RSVP' }}
          </button>
          <p class="text-sm mt-2">
            {{ isRSVPed ? 
              'Alright! Thank you for being involved.'
              : '' }}
          </p>
        </div>
      </div>
      <div v-if="event.loading" class="spinner-border spinner-border-sm"></div>
      <div v-if="event.error" class="text-danger">Error loading event: {{event.error}}</div>
      <!-- Add this at the bottom of your template -->
      <div class="text-center py-4 text-white">
        This event is brought to you by <strong>{{ event?.attributes?.garden?.data.attributes?.title }}</strong>
      </div>
    </div>
      <!-- Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-lg w-3/4 md:w-1/4">
          <h3 class="md:text-xl mb-4 text-lg">Garden Steward manages events through SMS. You will be asked to sign up for SMS Updates for {{ event?.attributes?.garden?.data.attributes?.title }} as a part of RSVPing for this event. </h3>
          
          <input 
            :value="phoneNumber"
            @input="handlePhoneInput"
            @keypress="handleKeyPress"
            type="tel" 
            placeholder="(123) 456-7890" 
            class="w-full p-2 border border-gray-300 rounded mb-2"
            maxlength="14"
          >
          <p class="text-sm mb-4">You can STOP SMS at any point by replying with STOP.</p>
          <p v-if="phoneError" class="text-red-500 text-sm mb-2">{{ phoneError }}</p>
          <div class="flex justify-end">
            <button @click="closeModal" class="mr-2 px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button @click="submitPhoneNumber" class="px-4 py-2 bg-green-700 text-white rounded">Submit</button>
          </div>
        </div>
      </div>
      
      <!-- Lightbox Modal -->
      <div 
        v-if="showLightbox && getGalleryImages().length > 0"
        class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
        @click="closeLightbox"
      >
        <div class="relative max-w-7xl max-h-full p-4">
          <button
            @click.stop="closeLightbox"
            class="absolute top-4 right-4 text-white hover:text-gray-300 text-3xl z-10"
            aria-label="Close"
          >
            <i class="fas fa-times"></i>
          </button>
          
          <button
            v-if="getGalleryImages().length > 1"
            @click.stop="prevImage"
            class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 text-3xl z-10"
            aria-label="Previous"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          
          <button
            v-if="getGalleryImages().length > 1"
            @click.stop="nextImage"
            class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 text-3xl z-10"
            aria-label="Next"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
          
          <img
            :src="getGalleryImages()[lightboxImageIndex]?.url"
            :alt="`Gallery image ${lightboxImageIndex + 1}`"
            class="max-w-full max-h-screen mx-auto rounded-lg"
            @click.stop
          />
          
          <div 
            v-if="getGalleryImages().length > 1"
            class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm"
          >
            {{ lightboxImageIndex + 1 }} / {{ getGalleryImages().length }}
          </div>
        </div>
      </div>

</template>

<style>
#event-view a {
  text-decoration: underline;
}

#event-view a.no-underline {
  text-decoration: none;
}

/* Add this CSS for the brief box */
.brief-box {
  background-color: #FFDAB9; /* Peach color */
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}
h4 {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

/* Lightbox styles */
.fixed {
  cursor: pointer;
}

.fixed img {
  cursor: default;
}
</style>