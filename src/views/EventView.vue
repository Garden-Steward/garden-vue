<script setup>
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useRoute } from "vue-router";
import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';

import { useEventStore, useAuthStore  } from '@/stores';
import { getImageOrDefault } from '@/helpers/image-utils';
import Gallery from '@/components/Gallery.vue';
const md = new MarkdownIt().use(markdownItAttrs);


import { watch, computed } from 'vue';

const eventStore = useEventStore();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const showModal = ref(false);
const phoneNumber = ref('');
const phoneError = ref('');
const isRSVPed = ref(false);

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

// Check if user is a manager of the event's garden
const isManager = computed(() => {
  if (!event.value?.attributes?.garden?.data?.attributes?.managers?.data || !user.value) return false;
  return event.value.attributes.garden.data.attributes.managers.data.some(manager => manager.id === user.value.id);
});

// Get hero image or use default
const heroImage = computed(() => {
  const heroImageUrl = event.value?.attributes?.hero_image?.data?.attributes?.url;
  return getImageOrDefault(heroImageUrl);
});

watch(event, (newVal) => {
  if (newVal.attributes?.content) {
    renderedContent = md.render(newVal.attributes?.content);
  }
  if (newVal.attributes?.confirmed) {
    isRSVPed.value = newVal.attributes?.confirmed.data.some(item => item.id === user.value?.id);
  }
});

const rsvpEvent = async (e) => {
  console.log(e);

  if (isEventPast.value) {
    return;
  }

  if (user.value) {
    await eventStore.rsvpEvent({ userId: user.value.id, id: route.params.id })
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

</script>

<template>
    <div id="event-view" class="min-h-screen bg-[#344a34]">
      <div class="max-w-4xl mx-auto px-6 py-12 bg-custom-light dark:bg-[#344a34] rounded-lg font-roboto">

        <div class="w-full h-[350px] overflow-hidden rounded-lg mb-6">
          <img id="heroImage" alt="Hero Image" class="w-full h-full object-cover object-center" :src="heroImage">
        </div>
        <div class="flex justify-between items-start mb-6">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-[#c9d966]">{{ event?.attributes?.title }}</h1>
          <router-link 
            v-if="user && isManager && event?.id"
            :to="`/manage/events/${event.id}/edit`"
            class="bg-custom-green hover:bg-custom-green-dark text-white font-bold py-2 px-4 rounded no-underline"
          >
            Edit Event
          </router-link>
        </div>
        <h4 class="text-lg font-bold mb-6 text-gray-700 dark:text-[#e8e8e8]">{{ processDate(event?.attributes?.startDatetime) }}</h4>
        <div v-if="event?.attributes?.blurb" class="text-left brief-box dark:bg-[#2d3e26] dark:text-[#e8e8e8]">
            <div v-html="event?.attributes?.blurb"></div>
        </div>
        <div class="text-left text-gray-800 dark:text-[#e8e8e8]" v-if="event?.attributes?.content">
            <div v-html="renderedContent"></div>
        </div>
        
        <!-- Featured Gallery -->
        <Gallery 
          :gallery="event?.attributes?.featured_gallery"
          title="Event Gallery"
          :photo-album-url="event?.attributes?.photo_album_url"
        />
        
        <div v-if="user?.id" class="text-left mt-5 dark:text-[#e8e8e8]">
            <div v-if="!isRSVPed && !isEventPast" style="font-size: 1.2rem; font-weight: bold;" class="mb-2">Hello {{ user?.firstName }} {{ user?.lastName }}
              <p>Would you like to RSVP for this event?</p>
            </div>
            <p v-if="isEventPast" class="text-gray-600 dark:text-[#b8b8b8] font-medium mb-2">This event has already passed. RSVP is no longer available.</p>
            <a v-if="event?.attributes?.partiful_link && !isEventPast" :href="event.attributes.partiful_link" :class="{ 'bg-gray-500': isRSVPed || isEventPast, 'bg-green-700 hover:bg-green-900': !isRSVPed && !isEventPast }" class="inline-block hover:bg-green-900 text-white font-bold py-2 px-4 rounded pointer text-center no-underline" :style="{ pointerEvents: (isRSVPed || isEventPast) ? 'none' : 'auto', cursor: (isRSVPed || isEventPast) ? 'not-allowed' : 'pointer' }">
              {{ isRSVPed ? 'RSVP Initiated' : 'RSVP via Partiful' }}
            </a>
            <button v-else-if="!isEventPast" :class="{ 'bg-gray-500': isRSVPed, 'bg-green-700 hover:bg-green-900': !isRSVPed }" class="hover:bg-green-900 text-white font-bold py-2 px-4 rounded pointer no-underline" @click="rsvpEvent" :disabled="isRSVPed">
              {{ isRSVPed ? 'RSVP Initiated' : 'RSVP' }}
            </button>
            <p v-if="isRSVPed">Thank you for RSVPing {{ user?.firstName }} {{ user?.lastName }}!</p>
        </div>


        <!-- Conditional rendering of the agreement button -->
        <div v-else class="mt-6 dark:text-[#e8e8e8]">
          <p v-if="isEventPast" class="text-gray-600 dark:text-[#b8b8b8] font-medium mb-2">This event has already passed. RSVP is no longer available.</p>
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
        This event is brought to you by 
        <router-link 
          v-if="event?.attributes?.garden?.data?.attributes?.slug"
          :to="{ name: 'garden-public', params: { slug: event?.attributes?.garden?.data?.attributes?.slug } }"
          class="font-bold underline hover:text-custom-peach"
        >
          {{ event?.attributes?.garden?.data?.attributes?.title }}
        </router-link>
        <strong v-else>{{ event?.attributes?.garden?.data?.attributes?.title }}</strong>
      </div>
    </div>
      <!-- Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:!bg-[#2d3e26] p-6 rounded-lg shadow-lg w-3/4 md:w-1/4">
          <h3 class="md:text-xl mb-4 text-lg text-gray-900 dark:text-[#e8e8e8]">Garden Steward manages events through SMS. You will be asked to sign up for SMS Updates for {{ event?.attributes?.garden?.data.attributes?.title }} as a part of RSVPing for this event. </h3>
          
          <input 
            :value="phoneNumber"
            @input="handlePhoneInput"
            @keypress="handleKeyPress"
            type="tel" 
            placeholder="(123) 456-7890" 
            class="w-full p-2 border border-gray-300 dark:border-[#3d4d36] dark:bg-[#1a1a1a] dark:text-[#e8e8e8] rounded mb-2"
            maxlength="14"
          >
          <p class="text-sm mb-4 text-gray-600 dark:text-[#b8b8b8]">You can STOP SMS at any point by replying with STOP.</p>
          <p v-if="phoneError" class="text-red-500 text-sm mb-2">{{ phoneError }}</p>
          <div class="flex justify-end">
            <button @click="closeModal" class="mr-2 px-4 py-2 bg-gray-200 dark:bg-[#3d4d36] dark:text-[#e8e8e8] rounded">Cancel</button>
            <button @click="submitPhoneNumber" class="px-4 py-2 bg-green-700 text-white rounded">Submit</button>
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
</style>
