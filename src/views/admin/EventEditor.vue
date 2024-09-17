<script setup>
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';
import { useRoute } from "vue-router";
import { useEventStore } from '@/stores';
import Tiptap from '@/components/Tiptap.vue'
import UserProfileDisplay from '@/components/UserProfileDisplay.vue'
const eventStore = useEventStore();
const route = useRoute()
// const baseUrl = `${import.meta.env.VITE_API_URL}`;

const { event } = storeToRefs(eventStore);
const isLoading = ref(true);

eventStore.findById(route.params.id);

watch(event, async (newEvent) => {
  console.log('newEvent: ', newEvent);
  if (newEvent?.attributes?.content) {
    // await ArticleUtils.processImages();
  }
  isLoading.value = false;
}, { deep: true });

// const truncateExcerpt = (excerpt) => {
//     return `${excerpt?.substring(0, 150)}...`;
// };

const saveEvent = async () => {
  try {
    console.log('event: ', event.value.attributes.content);
    await eventStore.update(route.params.id, event.value.attributes);
    // alert('Event saved successfully!');
  } catch (error) {
    console.error('Error saving event:', error);
    alert('Failed to save event. Please try again.');
  }
};
</script>

<template>
  <div class="flex flex-col md:flex-row font-roboto bg-custom-light">
    <div class="flex-1">
      <div class="px-2 py-2 md:px-8 md:py-4"> <!-- Adjusted padding for mobile -->
        <h1 class="text-2xl font-bold mb-4 font-roboto sm:text-3xl">Event Manager</h1>
        <div v-if="isLoading">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
        <div v-else>
          <div class="stew">
            <h2 class="text-xl font-bold mb-3">
              {{ event.attributes.confirmed.data && event.attributes.confirmed.data.length > 0 ? 'Volunteers RSVPd' : 'No one has RSVP\'d to this event yet' }}
            </h2>
            <ul v-if="event.attributes.confirmed.data && event.attributes.confirmed.data.length > 0" class="list-disc pl-5">
              <div v-for="volunteer in event.attributes.confirmed.data" :key="volunteer.id" class="mb-2">
                <UserProfileDisplay :volunteer="volunteer.attributes" :showName="true" />
              </div>
            </ul>
          </div>
          <button @click="$router.push(`/d/${event.id}`)" class="bg-custom-green hover:bg-custom-green-dark text-white font-bold py-2 px-4 rounded">
            View Volunteer Page
          </button>
          <hr class="my-4" />
          <p class="text-md mb-4 font-roboto">Customize your Event Page.</p>

          <div>
            <label for="title">Title</label>
            <input type="text" id="title" v-model="event.attributes.title" />
            <label for="content">Content</label>
            <Tiptap 
              v-model="event.attributes.content" 
              :editable="true"
              :content="event.attributes.content"
              @update:content="(newContent) => event.attributes.content = newContent"
            />
            <button @click="saveEvent" class="bg-custom-green hover:bg-custom-green-dark text-white font-bold py-2 px-4 rounded">Save Event</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stew {
  background-color: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px; /* Reduced padding for mobile */
  margin: 10px; /* Reduced margin for mobile */
}
label {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 5px;
  margin-right: 10px;
  display: block;
}
input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1.2em;
}

.save-button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1em;
  margin-top: 15px;
}

.save-button:hover {
  background-color: #45a049;
}
</style>
