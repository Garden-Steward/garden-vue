<script setup>
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useRoute } from "vue-router";
import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';

import { useEventStore, useAuthStore  } from '@/stores';
const md = new MarkdownIt().use(markdownItAttrs);


import { watch } from 'vue';

const eventStore = useEventStore();
const { user } = useAuthStore();

const route = useRoute()
const { event } = storeToRefs(eventStore);
let renderedContent = '';
const isRSVPed = ref(false);

const images = [
  "https://storage.googleapis.com/steward_upload/uploads/20240818_101336_dd55c7a910/20240818_101336_dd55c7a910.jpg",
  "https://storage.googleapis.com/steward_upload/uploads/garden_volunteers_feb24_2c9697c88b/garden_volunteers_feb24_2c9697c88b.jpg",
  "https://storage.googleapis.com/steward_upload/uploads/Screenshot_2024_08_20_at_7_23_46_AM_82aa7ed2a6/Screenshot_2024_08_20_at_7_23_46_AM_82aa7ed2a6.png"
];

watch(event, (newVal) => {
  if (newVal.attributes?.content) {
    renderedContent = md.render(newVal.attributes?.content);
  }
  if (newVal.attributes?.confirmed) {
    isRSVPed.value = newVal.attributes?.confirmed.data.some(item => item.id === user?.id);
  }
});

const rsvpEvent = (e) => {
  console.log(e);

  if (user) {
    eventStore.rsvpEvent({userId:user.id, id:route.params.id})
  }

}

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
</script>

<template>
    <div id="event-view">
      <div class="max-w-4xl mx-auto px-6 py-12 bg-custom-light rounded-lg font-roboto">
        <img id="randomImage" alt="Random Hero Image" class="w-full h-auto mb-6 rounded-lg" :src="images[Math.floor(Math.random() * images.length)]">
        <h1 class="text-3xl font-bold mb-6">{{ event?.attributes?.title }}</h1>
        <h4 class="text-lg font-bold mb-6">{{ processDate(event?.attributes?.startDatetime) }}</h4>
        <div v-if="event?.attributes?.blurb" class="text-left brief-box">
            <h4>Brief:</h4>
            <div v-html="event?.attributes?.blurb"></div>
        </div>
        <div class="text-left" v-if="event?.attributes?.content">
            <div v-html="renderedContent"></div>
        </div>
        <div v-if="user?.id" class="text-left mt-5">
            <div>Hello {{ user?.firstName }} {{ user?.lastName }}</div>
            <p>Would you like to RSVP for this event?</p>
            <button :class="{ 'bg-gray-500': isRSVPed, 'bg-green-700 hover:bg-green-900': !isRSVPed }" class="hover:bg-green-900 text-white font-bold py-2 px-4 rounded pointer" @click="rsvpEvent" :disabled="isRSVPed">
                RSVP
            </button>
            <p v-if="isRSVPed">Thank you for RSVPing!</p>
        </div>


        <!-- Conditional rendering of the agreement button -->
        <div v-if="event?.attributes?.accept_required" class="mt-6">
          <button :class="{ 'bg-gray-500': isApproved, 'bg-green-700 hover:bg-green-900': !isApproved }" class="text-white font-bold py-2 px-4 rounded" @click="rsvpEvent" :disabled="isApproved">
            {{ isApproved ? 'Submitted' : event?.attributes?.affirm_button_title }}
          </button>
          <p class="text-sm mt-2">
            {{ isApproved ? 
              'Alright! Thank you for being involved.'
              : event?.attributes?.affirm_explain }}
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
</template>

<style>
#event-view a {
  text-decoration: underline;
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
