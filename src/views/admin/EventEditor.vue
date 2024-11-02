<script setup>
import { storeToRefs } from 'pinia';
import { ref, watch, computed } from 'vue';
import { useRoute } from "vue-router";
import { useEventStore, useAlertStore } from '@/stores';
import Tiptap from '@/components/Tiptap.vue'
import UserProfileDisplay from '@/components/UserProfileDisplay.vue'
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'
import { format } from 'date-fns';
import Switch from '@/components/form/Switch.vue';
import TextInput from '@/components/form/TextInput.vue';
import ImageUpload from '@/components/form/ImageUpload.vue';
import DropDown from '@/components/form/DropDown.vue';

const eventStore = useEventStore();
const alertStore = useAlertStore();
const route = useRoute()

const { event } = storeToRefs(eventStore);
const isLoading = ref(true);

eventStore.findById(route.params.id);

const prettyDay = computed(() => {
  return format(new Date(event.value.attributes.startDatetime), 'PPP');
});

watch(event, async (newEvent) => {
  console.log('newEvent: ', newEvent);
  if (newEvent?.attributes?.content) {
    // await ArticleUtils.processImages();
  }
  if (!newEvent.attributes.accessibility) {
    newEvent.attributes.accessibility = 'Public';
  }
  isLoading.value = false;
}, { deep: true });

const saveEvent = async () => {
  try {
    // Create a copy of the attributes to modify
    const eventData = { ...event.value.attributes }
    
    // Format hero_image correctly if it exists
    if (eventData.hero_image?.id) {
      eventData.hero_image = {
        id: eventData.hero_image.id
      }
    }
    
    await eventStore.update(route.params.id, eventData)
    alertStore.success('Event saved successfully!')
    window.scrollTo(0, 0)
  } catch (error) {
    console.error('Error saving event:', error)
    alertStore.error('Failed to save event. Please try again.')
  }
}

</script>

<template>
  <div class="flex flex-col font-roboto bg-custom-light max-w-screen-xl mx-auto px-4 sm:px-6 md:px-8 lg:px-16">
    <div class="flex-1">
      <div class="px-2 py-2 md:px-8 md:py-4">
        <!-- Header section -->
        <div class="flex justify-between items-start mb-4">
          <h1 class="text-2xl font-bold font-roboto sm:text-3xl">Event Manager</h1>
          
          <!-- Accessibility dropdown -->
          <div class="flex flex-col">
            <span class="text-sm font-semibold mb-1">Event Access:</span>
            <div class="w-48">
              <DropDown
                v-model="event.attributes.accessibility"
                :options="[ 
                  { value: 'Public', label: 'Public' },
                  { value: 'Garden Members', label: 'Garden Members' },
                  { value: 'Invite Only', label: 'Invite Only' }
                ]"
                placeholder="Select accessibility"
                size="sm"
                :disabled="true"
              >
                <template #prefix-disabled>
                  <div class="px-2 flex items-center">
                    <i class="fas fa-lock"></i>
                  </div>
                </template>
              </DropDown>
            </div>
          </div>
        </div>

        <!-- Loading spinner -->
        <div v-if="isLoading">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <!-- Rest of the content -->
        <div v-else>
          <!-- Add this line to display the alert messages -->
          <div v-if="alertStore.alert" :class="['alert', `alert-${alertStore.alert.type}`]">
            {{ alertStore.alert.message }}
          </div>
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
          <button @click="$router.push(`/d/${event.id}`)" class="bg-custom-green hover:bg-custom-green-dark text-white font-bold py-2 px-4 rounded mx-auto">
            Public Event Page
          </button>
          <h1 class="text-md mb-4 mt-20 font-roboto">Event Editor.</h1>
          <hr class="my-4" />
          <div>
            <div class="flex items-left mb-2 relative">
              <label for="title" class="block align-left">Title</label>
              <TextInput
                v-model="event.attributes.title" 
                placeholder="Volunteer Day!" 
                class="w-1/2"
                size="lg"
              />
            </div>
            <label for="heroImage">Hero Image</label>
            <ImageUpload v-model="event.attributes.hero_image" placeholder="Upload hero image" :eventId="event.id" />

            
            <!-- Two-column layout for date/time and ending time -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block mb-2">Start Date & Time:</label>
                <VueDatePicker v-model="event.attributes.startDatetime" class="mb-2" week-start="0"></VueDatePicker>
                <p class="text-sm">{{ prettyDay }}</p>
                <p class="text-sm">{{ new Date(event.attributes.startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</p>
              </div>
              
              <div>
                <label for="endText" class="block mb-2">Ending Time:</label>
                <TextInput
                  v-model="event.attributes.endText" 
                  size="md"
                  placeholder="e.g., around noon" 
                  class="w-full md:w-1/2"
                />
              </div>
            </div>
            
            <div class="flex items-center mb-2 relative">
              <label for="blurb" class="mr-2">Blurb</label>
              <div class="group relative">
                <span class="tooltip-icon cursor-pointer">ⓘ</span>
                <div class="tooltip-text">
                  The short description that will be sent in the SMS and displayed as the blurb on the public event page.
                </div>
              </div>
              <!-- SMS toggle moved here -->
              <div class="ml-auto flex items-center">
                
                <Switch v-model="event.attributes.smsLink" >
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-300 mr-2">SMS sends with link</span>
                </Switch>
              </div>
            </div>

            <div class="brief-box mb-4">
              <textarea
                id="blurb"
                v-model="event.attributes.blurb"
                rows="3"
                class="w-full p-2 border border-gray-300 rounded"
              ></textarea>
            </div>
            
            <label for="content">Content</label>
            <Tiptap 
              v-model="event.attributes.content" 
              :editable="true"
              :content="event.attributes.content"
              @update:content="(newContent) => event.attributes.content = newContent"
            />
            
            <button @click="saveEvent" class="bg-custom-peach hover:bg-custom-green-dark text-black font-bold py-2 px-4 border-2 border-black m-4 rounded-md">Save Event</button>
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

/* Add this CSS for the brief box */
.brief-box {
  background-color: #FFDAB9; /* Peach color */
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

select {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1.2em;
  background-color: white;
}

.tooltip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: #f0f0f0;
  color: #666;
  font-size: 12px;
}

.tooltip-text {
  visibility: hidden;
  width: 200px;
  background-color: #555;
  color: #fff;
  text-align: left;
  border-radius: 6px;
  padding: 5px 8px;
  position: absolute;
  z-index: 1;
  top: -5px;
  left: 100%;
  margin-left: 10px;
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip-text::before {
  content: "";
  position: absolute;
  top: 50%;
  right: 100%;
  margin-top: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: transparent #555 transparent transparent;
}

.group:hover .tooltip-text,
.group:focus .tooltip-text,
.group:active .tooltip-text {
  visibility: visible;
  opacity: 1;
}

/* Add this new style at the end of the <style> section */
@media (min-width: 768px) {
  .max-w-screen-xl {
    max-width: 75%;
  }
}
</style>
