<script setup>
import { storeToRefs } from 'pinia';
import { ref, watch, computed, nextTick, onBeforeUnmount } from 'vue';
import { useRoute } from "vue-router";
import { useEventStore, useAlertStore } from '@/stores';
import Tiptap from '@/components/Tiptap.vue'
import UserProfileDisplay from '@/components/UserProfileDisplay.vue'
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'
import { format } from 'date-fns';
import Switch from '@/components/form/Switch.vue';
import TextInput from '@/components/form/TextInput.vue';
import MediaSelector from '@/components/form/MediaSelector.vue';
import ImageGalleryUpload from '@/components/form/ImageGalleryUpload.vue';
import DropDown from '@/components/form/DropDown.vue';

const eventStore = useEventStore();
const alertStore = useAlertStore();
const route = useRoute()

const { event } = storeToRefs(eventStore);
const isLoading = ref(true);
const hasChanges = ref(false);
const originalEventData = ref(null);
const isEditingTitle = ref(false);
const autoSaveTimeout = ref(null);
const isAutoSaving = ref(false);

const startEditingTitle = async () => {
  isEditingTitle.value = true;
  await nextTick();
  // Focus the input field after it's rendered
  setTimeout(() => {
    const input = document.querySelector('.title-input-wrapper input');
    if (input) {
      input.focus();
      input.select();
    }
  }, 10);
};

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
  // Initialize featured_gallery as empty array if it doesn't exist
  if (!newEvent.attributes.featured_gallery) {
    newEvent.attributes.featured_gallery = [];
  }
  
  isLoading.value = false;
  
  // Store original data for comparison when event loads (only once)
  if (newEvent && newEvent.attributes && !originalEventData.value && newEvent.id) {
    // Deep clone to prevent mutations
    originalEventData.value = JSON.parse(JSON.stringify(newEvent.attributes));
    hasChanges.value = false;
  }
}, { deep: true });

// Watch for changes to detect modifications
watch(() => event.value?.attributes, (newAttributes) => {
  if (!originalEventData.value || isLoading.value || !newAttributes) return;
  
  // Use the helper function for consistent change detection
  checkForChanges();
}, { deep: true, immediate: false });

// Also watch featured_gallery specifically to catch reordering
watch(
  () => {
    const gallery = event.value?.attributes?.featured_gallery;
    // Return a string representation of the array order for reliable change detection
    if (!gallery) return '';
    const ids = getGalleryIds(gallery);
    return JSON.stringify(ids);
  },
  () => {
    if (!originalEventData.value || isLoading.value) return;
    // Check immediately, the watcher already has the updated value
    checkForChanges();
  },
  { flush: 'post' }
);

// Auto-save when hero_image changes (after upload)
watch(
  () => {
    const heroImage = event.value?.attributes?.hero_image;
    return heroImage?.id || heroImage?.data?.id || null;
  },
  (newId, oldId) => {
    if (!originalEventData.value || isLoading.value || isAutoSaving.value) return;
    // Only auto-save if image was added/changed (not removed or initial load)
    if (newId && newId !== oldId) {
      // Clear any existing timeout
      if (autoSaveTimeout.value) {
        clearTimeout(autoSaveTimeout.value);
      }
      // Auto-save after a delay to debounce rapid changes and allow multiple uploads
      autoSaveTimeout.value = setTimeout(() => {
        autoSaveEvent();
      }, 1500);
    }
  }
);

// Auto-save when featured_gallery changes (after upload)
watch(
  () => {
    const gallery = event.value?.attributes?.featured_gallery;
    if (!gallery) return '';
    const ids = getGalleryIds(gallery);
    return JSON.stringify(ids);
  },
  (newIds, oldIds) => {
    if (!originalEventData.value || isLoading.value || isAutoSaving.value) return;
    // Only auto-save if gallery was modified (not initial load)
    if (oldIds && newIds !== oldIds) {
      // Clear any existing timeout
      if (autoSaveTimeout.value) {
        clearTimeout(autoSaveTimeout.value);
      }
      // Auto-save after a delay to debounce rapid changes and allow multiple uploads
      autoSaveTimeout.value = setTimeout(() => {
        autoSaveEvent();
      }, 1500);
    }
  }
);

// Helper to extract gallery IDs in order (consistent format)
const getGalleryIds = (gallery) => {
  if (!gallery) return [];
  
  let galleryArray = [];
  if (gallery?.data && Array.isArray(gallery.data)) {
    // Strapi format: { data: [{ id, attributes: {...} }] }
    galleryArray = gallery.data;
  } else if (Array.isArray(gallery)) {
    // Component format: [{ id, url }, { id, url }]
    galleryArray = gallery;
  } else {
    return [];
  }
  
  // Extract IDs preserving order - be consistent with extraction
  return galleryArray.map(img => {
    if (typeof img === 'object' && img !== null) {
      // Try to get ID from various possible locations
      if (img.id) return img.id;
      if (img.data?.id) return img.data.id;
      // If it's already just a number, return it
      if (typeof img === 'number') return img;
      return null;
    }
    // If it's already a number/ID, return it directly
    if (typeof img === 'number' || typeof img === 'string') return img;
    return null;
  }).filter(id => id !== null && id !== undefined);
};

// Helper function to check for changes
const checkForChanges = () => {
  if (!originalEventData.value || isLoading.value || !event.value?.attributes) {
    hasChanges.value = false;
    return;
  }
  
  // Get normalized gallery arrays for comparison - use consistent extraction
  const currentGalleryIds = getGalleryIds(event.value.attributes.featured_gallery);
  const originalGalleryIds = getGalleryIds(originalEventData.value.featured_gallery);
  
  // Compare gallery order - arrays must match exactly in same order
  const galleryChanged = JSON.stringify(currentGalleryIds) !== JSON.stringify(originalGalleryIds);
  
  // Compare rest of the data (excluding gallery which we already checked)
  const currentAttrs = { ...event.value.attributes };
  const originalAttrs = { ...originalEventData.value };
  
  // Remove gallery from comparison since we checked it separately
  delete currentAttrs.featured_gallery;
  delete originalAttrs.featured_gallery;
  
  // Normalize and compare other attributes
  const currentNormalized = normalizeEventData(currentAttrs);
  const originalNormalized = normalizeEventData(originalAttrs);
  
  const otherDataChanged = JSON.stringify(currentNormalized) !== JSON.stringify(originalNormalized);
  
  const changed = galleryChanged || otherDataChanged;
  hasChanges.value = changed;
  
  // Debug logging (can remove later)
  if (galleryChanged) {
    console.log('Gallery changed:', {
      current: currentGalleryIds,
      original: originalGalleryIds
    });
  }
};

// Helper function to normalize event data for comparison
const normalizeEventData = (attributes) => {
  if (!attributes) return null;
  
  const normalized = { ...attributes };
  
  // Normalize hero_image
  if (normalized.hero_image) {
    normalized.hero_image = normalized.hero_image?.id || normalized.hero_image?.data?.id || null;
  }
  
  // Normalize featured_gallery (preserve order to detect reordering)
  if (normalized.featured_gallery) {
    let galleryArray = []
    if (normalized.featured_gallery?.data && Array.isArray(normalized.featured_gallery.data)) {
      // Strapi format: { data: [{ id, attributes: {...} }] }
      galleryArray = normalized.featured_gallery.data.map(img => {
        if (typeof img === 'object' && img !== null) {
          return img.id || img.data?.id || null;
        }
        return img;
      }).filter(Boolean);
    } else if (Array.isArray(normalized.featured_gallery)) {
      // Component format: [{ id, url }, { id, url }] or Strapi format: [{ id, attributes: {...} }]
      galleryArray = normalized.featured_gallery.map(img => {
        if (typeof img === 'object' && img !== null) {
          // Handle both { id, url } and { id, data: {...} } formats
          return img.id || img.data?.id || null;
        }
        // Handle numeric IDs directly
        return img;
      }).filter(Boolean);
    }
    // Don't sort - preserve order to detect reordering changes
    normalized.featured_gallery = galleryArray;
  }
  
  return normalized;
};

const saveEvent = async (isAutoSave = false) => {
  try {
    // Create a copy of the attributes to modify
    const eventData = { ...event.value.attributes }
    
    // Format hero_image correctly if it exists
    if (eventData.hero_image) {
      // Handle MediaSelector format: { id, url } or Strapi format: { id, data: {...} }
      const heroImageId = eventData.hero_image.id || eventData.hero_image.data?.id
      if (heroImageId) {
        eventData.hero_image = {
          id: heroImageId
        }
      } else {
        // If no valid ID, set to null
        eventData.hero_image = null
      }
    }
    
    // Format featured_gallery correctly if it exists
    if (eventData.featured_gallery) {
      // Handle Strapi format: { data: [...] } or direct array
      let galleryArray = []
      if (eventData.featured_gallery?.data && Array.isArray(eventData.featured_gallery.data)) {
        galleryArray = eventData.featured_gallery.data
      } else if (Array.isArray(eventData.featured_gallery)) {
        galleryArray = eventData.featured_gallery
      }
      
      if (galleryArray.length > 0) {
        eventData.featured_gallery = galleryArray
          .map(img => {
            // Extract ID from different formats
            const id = img?.id || img?.data?.id
            return id ? { id } : null
          })
          .filter(img => img !== null)
      } else {
        eventData.featured_gallery = []
      }
    }
    
    await eventStore.update(route.params.id, eventData)
    
    if (isAutoSave) {
      // For auto-save, just update originalEventData without refreshing to avoid interrupting uploads
      if (event.value && event.value.attributes) {
        originalEventData.value = JSON.parse(JSON.stringify(event.value.attributes));
        hasChanges.value = false;
      }
    } else {
      // For manual save, refresh event data from store and reset change tracking
      await eventStore.findById(route.params.id)
      await nextTick()
      
      if (event.value && event.value.attributes) {
        originalEventData.value = JSON.parse(JSON.stringify(event.value.attributes));
        hasChanges.value = false;
      }
      
      alertStore.success('Event saved successfully!')
      window.scrollTo(0, 0)
    }
  } catch (error) {
    console.error('Error saving event:', error)
    alertStore.error('Failed to save event. Please try again.')
  }
}

// Auto-save function for image uploads
const autoSaveEvent = async () => {
  if (isAutoSaving.value) return;
  isAutoSaving.value = true;
  try {
    await saveEvent(true);
  } finally {
    isAutoSaving.value = false;
  }
}

// Cleanup timeout on unmount
onBeforeUnmount(() => {
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value);
  }
});

</script>

<template>
  <div class="flex flex-col font-roboto bg-custom-light max-w-screen-xl mx-auto px-4 sm:px-6 md:px-8 lg:px-16">
    <div class="flex-1">
      <div class="px-2 py-2 md:px-8 md:py-4">
        <!-- Back link -->
        <router-link 
          :to="`/manage/gardens/${event?.attributes?.garden?.data?.attributes?.slug}`"
          class="inline-flex items-center text-custom-green hover:text-custom-green-dark mb-4"
        >
          <i class="fas fa-arrow-left mr-2"></i>
          Back to Garden
        </router-link>

        <!-- Header section -->
        <div class="flex justify-between items-start mb-4">
          <h1 class="text-2xl font-bold font-roboto sm:text-3xl">Event Manager</h1>
          
          <!-- Header buttons and access controls -->
          <div class="flex items-start gap-4">
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
        </div>

        <!-- Loading spinner -->
        <div v-if="isLoading">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <!-- Rest of the content -->
        <div v-else>
          <!-- Main Layout: Editor on left, RSVPs on right (desktop) or bottom (mobile) -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <!-- Main Editor Content (Left side on desktop, full width on mobile) -->
            <div class="lg:col-span-2">
              <div>
            <!-- Title: Display as h1 with edit link, or show input when editing -->
            <div class="mb-4">
              <div v-if="!isEditingTitle" class="flex items-center gap-3">
                <h1 class="text-3xl font-bold font-roboto mb-0">{{ event?.attributes?.title || 'Untitled Event' }}</h1>
                <button
                  @click="startEditingTitle"
                  class="text-custom-green hover:text-custom-green-dark underline text-sm"
                >
                  Edit
                </button>
              </div>
              <div v-else class="flex items-center gap-2">
                <div class="flex-1 title-input-wrapper">
                  <TextInput
                    v-model="event.attributes.title" 
                    placeholder="Volunteer Day!" 
                    class="flex-1"
                    size="md"
                    @blur="isEditingTitle = false"
                    @keyup.enter="isEditingTitle = false"
                  />
                </div>
                <button
                  @click="isEditingTitle = false"
                  class="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Done
                </button>
              </div>
            </div>
            
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
            
            <label for="heroImage">Hero Image</label>
            <MediaSelector 
              v-if="event?.attributes?.garden?.data?.id"
              v-model="event.attributes.hero_image" 
              :gardenId="event.attributes.garden.data.id"
              :multiple="false"
              placeholder="Select or upload hero image"
            />
            <div v-else class="text-gray-500 text-sm mb-4">
              Loading garden information...
            </div>

            <!-- Featured Gallery Section -->
            <div class="mb-4">
              <label for="featuredGallery" class="block mb-2 font-semibold">
                Featured Gallery
              </label>
              <p class="text-sm text-gray-600 mb-2">
                Add 3-8 photos from the event. These will appear in the event gallery. Drag to reorder.
              </p>
              <ImageGalleryUpload 
                v-model="event.attributes.featured_gallery"
                :event-id="event.id"
                :max-images="8"
              />
            </div>
              </div>
            </div>
            
            <!-- RSVPs Section (Right side on desktop, bottom on mobile) -->
            <div class="lg:col-span-1">
              <div class="stew lg:sticky lg:top-4">
                <!-- Save Event Button -->
                <button 
                  @click="saveEvent" 
                  :disabled="!hasChanges"
                  class="w-full bg-custom-peach hover:bg-custom-green-dark text-black font-bold py-2 px-4 border-2 border-black rounded-md mb-4 transition-all disabled:bg-gray-400 disabled:text-white disabled:cursor-not-allowed disabled:hover:bg-gray-400 disabled:border-gray-400"
                >
                  Save Event
                </button>
                
                <h2 class="text-xl font-bold mb-3">
                  Volunteers RSVP'd 
                  <span class="text-lg font-normal">({{ event.attributes.confirmed?.data?.length || 0 }})</span>
                </h2>
                
                <div>
                  <div v-if="!event.attributes.confirmed?.data?.length" class="text-gray-600">
                    No one has RSVP'd to this event yet
                  </div>
                  <ul v-else class="space-y-3">
                    <li v-for="volunteer in event.attributes.confirmed?.data" :key="volunteer.id">
                      <UserProfileDisplay :volunteer="volunteer.attributes" :showName="true" />
                    </li>
                  </ul>
                </div>
                
                <!-- Public Event Page Link -->
                <button 
                  @click="$router.push(`/d/${event.id}`)" 
                  class="w-full bg-custom-green hover:bg-custom-green-dark text-white font-bold py-2 px-4 rounded mt-4"
                >
                  Public Event Page
                </button>
              </div>
            </div>
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
  padding: 1.5rem;
  margin-bottom: 1rem;
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

/* Add these new styles */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.duration-300 {
  transition-duration: 300ms;
}
</style>
