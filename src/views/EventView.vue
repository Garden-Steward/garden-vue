<script setup>
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useRoute } from "vue-router";
import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';

import { useEventStore  } from '@/stores';
const md = new MarkdownIt().use(markdownItAttrs);


import { watch } from 'vue';

const eventStore = useEventStore();
const route = useRoute()
const { event } = storeToRefs(eventStore);
let renderedContent = '';
const isApproved = ref(false);


watch(event, (newVal) => {
  if (newVal.attributes) {
    renderedContent = md.render(newVal.attributes?.content);
  }
});

const rsvpEvent = (e) => {
  console.log(e);
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get('u')

  if (user) {
    eventStore.approveTask({userId:user, slug:route.params.slug})
    isApproved.value = true;
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
    <div>
      <div class="max-w-4xl mx-auto px-6 py-12 bg-custom-light rounded-lg font-roboto">
        <h1 class="text-3xl font-bold mb-6">{{ event?.attributes?.title }}</h1>
        <h4 class="text-lg font-bold mb-6">{{ processDate(event?.attributes?.startDatetime) }}</h4>
        <div v-if="event?.attributes?.blurb" class="text-left">
            <div v-html="event?.attributes?.blurb"></div>
        </div>
        <div class="text-left" v-if="event?.attributes?.content">
            <div v-html="renderedContent"></div>
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
