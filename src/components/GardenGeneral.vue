<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGardensStore, useAlertStore } from '@/stores';
import HeroImageCard from '@/components/form/HeroImageCard.vue';

const props = defineProps({
  garden: {
    type: Object,
    required: true
  },
  editor: {
    type: Boolean,
    required: true
  },
  volunteerDays: {
    type: Object,
    required: true
  },
  smsCampaigns: {
    type: Array,
    required: true
  }
});

const route = useRoute();
const router = useRouter();
const gardensStore = useGardensStore();
const alertStore = useAlertStore();

// Get latest 3 events, sorted from soonest to happen to longest
const latestEvents = computed(() => {
  if (!props.volunteerDays?.days || !Array.isArray(props.volunteerDays.days)) {
    return [];
  }
  
  // Normalize events (handle both Strapi format and normalized format)
  const normalizedEvents = props.volunteerDays.days.map(event => {
    // Handle Strapi format: { id, attributes: { title, startDatetime, ... } }
    if (event.attributes) {
      return { ...event.attributes, id: event.id };
    }
    // Already normalized format
    return event;
  });
  
  // Filter out events without startDatetime and sort by startDatetime (soonest first)
  const sortedEvents = normalizedEvents
    .filter(event => event.startDatetime)
    .sort((a, b) => {
      const dateA = new Date(a.startDatetime);
      const dateB = new Date(b.startDatetime);
      return dateA - dateB; // Soonest first
    });
  
  // Return the first 3 events
  return sortedEvents.slice(0, 3);
});

// Format event date helper
const formatEventDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Hero image handling
const heroImage = ref(null);
const isSavingHeroImage = ref(false);
const isInitialLoad = ref(true);

// Initialize hero_image from garden (for HeroImageCard v-model)
watch(() => props.garden?.attributes?.hero_image, (newVal) => {
  if (newVal) {
    // Handle Strapi format: { data: { id, attributes: { ... } } }
    if (newVal.data) {
      heroImage.value = newVal.data;
    } else {
      // Already in the format we need
      heroImage.value = newVal;
    }
  } else {
    heroImage.value = null;
  }
  // Mark initial load as complete after first watch
  if (isInitialLoad.value) {
    isInitialLoad.value = false;
  }
}, { immediate: true, deep: true });

// Save hero image when it changes (watch for HeroImageCard v-model updates)
watch(() => heroImage.value, async (newImage, oldImage) => {
  if (!props.editor || !props.garden?.id) return;
  
  // Don't save on initial load
  if (isInitialLoad.value) return;
  
  // Don't save if the value hasn't actually changed
  const newId = newImage?.id || newImage?.data?.id;
  const oldId = oldImage?.id || oldImage?.data?.id;
  if (newId === oldId) return;
  
  try {
    isSavingHeroImage.value = true;
    
    // Format the data for Strapi
    const imageId = newImage?.id || newImage?.data?.id;
    const updateData = {
      hero_image: imageId ? { id: imageId } : null
    };
    
    await gardensStore.update(props.garden.id, updateData);
    
    // Refresh garden data to get the updated hero_image
    await gardensStore.getSlug(route.params.slug);
    
    alertStore.success('Hero image updated successfully');
  } catch (error) {
    console.error('Error saving hero image:', error);
    alertStore.error('Failed to save hero image. Please try again.');
  } finally {
    isSavingHeroImage.value = false;
  }
}, { deep: true });

// Editable text fields
const editingWelcomeText = ref(false);
const editingBlurb = ref(false);
const editingDescription = ref(false);
const welcomeTextValue = ref('');
const blurbValue = ref('');
const descriptionValue = ref('');
const isSavingText = ref(false);

// Initialize text values from garden
watch(() => props.garden?.attributes?.welcome_text, (newVal) => {
  if (!editingWelcomeText.value) {
    welcomeTextValue.value = newVal || '';
  }
}, { immediate: true });

watch(() => props.garden?.attributes?.blurb, (newVal) => {
  if (!editingBlurb.value) {
    blurbValue.value = newVal || '';
  }
}, { immediate: true });

watch(() => props.garden?.attributes?.description, (newVal) => {
  if (!editingDescription.value) {
    descriptionValue.value = newVal || '';
  }
}, { immediate: true });

// Start editing functions
const startEditingWelcomeText = () => {
  welcomeTextValue.value = props.garden?.attributes?.welcome_text || '';
  editingWelcomeText.value = true;
};

const startEditingBlurb = () => {
  blurbValue.value = props.garden?.attributes?.blurb || '';
  editingBlurb.value = true;
};

const startEditingDescription = () => {
  descriptionValue.value = props.garden?.attributes?.description || '';
  editingDescription.value = true;
};

// Cancel editing functions
const cancelEditingWelcomeText = () => {
  welcomeTextValue.value = props.garden?.attributes?.welcome_text || '';
  editingWelcomeText.value = false;
};

const cancelEditingBlurb = () => {
  blurbValue.value = props.garden?.attributes?.blurb || '';
  editingBlurb.value = false;
};

const cancelEditingDescription = () => {
  descriptionValue.value = props.garden?.attributes?.description || '';
  editingDescription.value = false;
};

// Save text fields
const saveWelcomeText = async () => {
  if (!props.editor || !props.garden?.id) return;
  
  try {
    isSavingText.value = true;
    const updateData = {
      welcome_text: welcomeTextValue.value
    };
    
    await gardensStore.update(props.garden.id, updateData);
    await gardensStore.getSlug(route.params.slug);
    
    editingWelcomeText.value = false;
    alertStore.success('Welcome text updated successfully');
  } catch (error) {
    console.error('Error saving welcome text:', error);
    alertStore.error('Failed to save welcome text. Please try again.');
  } finally {
    isSavingText.value = false;
  }
};

const saveBlurb = async () => {
  if (!props.editor || !props.garden?.id) return;
  
  try {
    isSavingText.value = true;
    const updateData = {
      blurb: blurbValue.value
    };
    
    await gardensStore.update(props.garden.id, updateData);
    await gardensStore.getSlug(route.params.slug);
    
    editingBlurb.value = false;
    alertStore.success('Blurb updated successfully');
  } catch (error) {
    console.error('Error saving blurb:', error);
    alertStore.error('Failed to save blurb. Please try again.');
  } finally {
    isSavingText.value = false;
  }
};

const saveDescription = async () => {
  if (!props.editor || !props.garden?.id) return;
  
  try {
    isSavingText.value = true;
    const updateData = {
      description: descriptionValue.value
    };
    
    await gardensStore.update(props.garden.id, updateData);
    await gardensStore.getSlug(route.params.slug);
    
    editingDescription.value = false;
    alertStore.success('Description updated successfully');
  } catch (error) {
    console.error('Error saving description:', error);
    alertStore.error('Failed to save description. Please try again.');
  } finally {
    isSavingText.value = false;
  }
};
</script>

<template>
  <div class="bg-[#2d3e26] rounded-lg shadow-md p-6">
    <div class="mb-4">
      <h2 class="text-2xl font-light font-serif mb-4 text-[#f5f5f5]">General</h2>
      <router-link 
        :to="`/gardens/${garden.attributes.slug}`"
        target="_blank"
        class="btn-view-public inline-flex items-center px-4 py-2 bg-custom-green text-white font-medium rounded hover:bg-darker-green transition-colors"
      >
        <i class="fas fa-external-link-alt mr-2"></i>
        View Public Garden Page
      </router-link>
    </div>
    <div class="space-y-6">
      <!-- Summary Numbers -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          class="bg-[rgba(26,26,26,0.6)] p-4 rounded-lg border border-[#3d4d36]/50 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] transition-colors"
          @click="router.push({ path: route.path, hash: '#volunteers' })"
        >
          <div class="text-2xl font-bold text-blue-300">{{ garden.attributes.volunteers?.data?.length || 0 }}</div>
          <div class="text-sm text-[#d0d0d0] mt-1">Volunteers</div>
        </div>
        <div 
          class="bg-[rgba(26,26,26,0.6)] p-4 rounded-lg border border-[#3d4d36]/50 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] transition-colors"
          @click="router.push({ path: route.path, hash: '#events' })"
        >
          <div class="text-2xl font-bold text-purple-300">{{ volunteerDays.days?.length || 0 }}</div>
          <div class="text-sm text-[#d0d0d0] mt-1">Events</div>
        </div>
        <div 
          class="bg-[rgba(26,26,26,0.6)] p-4 rounded-lg border border-[#3d4d36]/50 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] transition-colors"
          @click="router.push({ path: route.path, hash: '#sms' })"
        >
          <div class="text-2xl font-bold text-green-300">{{ smsCampaigns.length || 0 }}</div>
          <div class="text-sm text-[#d0d0d0] mt-1">SMS Campaigns</div>
        </div>
      </div>

      <!-- Latest Events Section -->
      <div>
        <h3 class="text-lg font-semibold mb-2 text-[#f5f5f5]">Upcoming Events</h3>
        <div v-if="latestEvents.length === 0" class="text-[#d0d0d0] text-sm">
          No upcoming events scheduled.
        </div>
        <div v-else class="space-y-2">
          <div 
            v-for="event in latestEvents" 
            :key="event.id || event.startDatetime"
            class="bg-[rgba(26,26,26,0.6)] py-2 px-3 rounded border border-[#3d4d36]/50 hover:bg-[rgba(26,26,26,0.8)] transition-colors"
            :class="{ 'cursor-pointer': event.id }"
            @click="event.id && $router.push(`/manage/events/${event.id}/edit`)"
          >
            <div class="flex items-center gap-2">
              <i class="fas fa-calendar-alt text-[#d0d0d0] text-sm"></i>
              <span class="text-sm font-medium text-[#f5f5f5]">{{ event.title || 'Untitled Event' }}</span>
              <span class="text-sm text-[#d0d0d0]">- {{ formatEventDate(event.startDatetime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Blurb Section -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold text-[#f5f5f5]">Garden Blurb</h3>
          <button 
            v-if="editor && !editingBlurb" 
            @click="startEditingBlurb"
            class="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Edit
          </button>
        </div>
        <div v-if="!editingBlurb">
          <p class="text-[#d0d0d0]">{{ garden.attributes.blurb || 'No blurb available.' }}</p>
        </div>
        <div v-else class="space-y-2">
          <textarea
            v-model="blurbValue"
            rows="3"
            class="w-full px-3 py-2 border border-[#3d4d36]/50 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] rounded-md focus:outline-none focus:ring-2 focus:ring-custom-green focus:border-transparent"
            placeholder="Enter garden blurb..."
          ></textarea>
          <div class="flex gap-2">
            <button
              @click="saveBlurb"
              :disabled="isSavingText"
              class="px-4 py-2 bg-custom-green text-white rounded hover:bg-darker-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSavingText ? 'Saving...' : 'Save' }}
            </button>
            <button
              @click="cancelEditingBlurb"
              :disabled="isSavingText"
              class="px-4 py-2 bg-[rgba(26,26,26,0.8)] text-[#f5f5f5] rounded hover:bg-[rgba(26,26,26,1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Description Section (About This Garden) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div>
            <h3 class="text-lg font-semibold text-[#f5f5f5]">Description</h3>
            <p class="text-sm text-[#d0d0d0] italic">This text appears in the "About This Garden" section on the public page</p>
          </div>
          <button 
            v-if="editor && !editingDescription" 
            @click="startEditingDescription"
            class="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Edit
          </button>
        </div>
        <div v-if="!editingDescription">
          <p class="text-[#d0d0d0] whitespace-pre-wrap">{{ garden.attributes.description || 'No description available.' }}</p>
        </div>
        <div v-else class="space-y-2">
          <textarea
            v-model="descriptionValue"
            rows="6"
            class="w-full px-3 py-2 border border-[#3d4d36]/50 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] rounded-md focus:outline-none focus:ring-2 focus:ring-custom-green focus:border-transparent"
            placeholder="Enter garden description for the About This Garden section..."
          ></textarea>
          <div class="flex gap-2">
            <button
              @click="saveDescription"
              :disabled="isSavingText"
              class="px-4 py-2 bg-custom-green text-white rounded hover:bg-darker-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSavingText ? 'Saving...' : 'Save' }}
            </button>
            <button
              @click="cancelEditingDescription"
              :disabled="isSavingText"
              class="px-4 py-2 bg-[rgba(26,26,26,0.8)] text-[#f5f5f5] rounded hover:bg-[rgba(26,26,26,1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Welcome Text Section (for SMS list signup) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <div>
            <h3 class="text-lg font-semibold text-[#f5f5f5]">Welcome Text</h3>
            <p class="text-sm text-[#d0d0d0] italic">This text is shown to people when they join the SMS list</p>
          </div>
          <button 
            v-if="editor && !editingWelcomeText" 
            @click="startEditingWelcomeText"
            class="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Edit
          </button>
        </div>
        <div v-if="!editingWelcomeText">
          <p class="text-[#d0d0d0]">{{ garden.attributes.welcome_text || 'No welcome text available.' }}</p>
        </div>
        <div v-else class="space-y-2">
          <textarea
            v-model="welcomeTextValue"
            rows="4"
            class="w-full px-3 py-2 border border-[#3d4d36]/50 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] rounded-md focus:outline-none focus:ring-2 focus:ring-custom-green focus:border-transparent"
            placeholder="Enter welcome text for SMS list signup..."
          ></textarea>
          <div class="flex gap-2">
            <button
              @click="saveWelcomeText"
              :disabled="isSavingText"
              class="px-4 py-2 bg-custom-green text-white rounded hover:bg-darker-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSavingText ? 'Saving...' : 'Save' }}
            </button>
            <button
              @click="cancelEditingWelcomeText"
              :disabled="isSavingText"
              class="px-4 py-2 bg-[rgba(26,26,26,0.8)] text-[#f5f5f5] rounded hover:bg-[rgba(26,26,26,1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      
      <!-- Hero Image Section (Editor Only) -->
      <div v-if="editor" class="mt-6">
        <HeroImageCard
          v-model="heroImage"
          :gardenId="garden?.id"
        />
        <p v-if="isSavingHeroImage" class="text-sm text-[#d0d0d0] mt-2">Saving...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Make "View Public Garden Page" button full width on mobile */
@media (max-width: 768px) {
  .btn-view-public {
    display: flex;
    width: 100%;
    justify-content: center;
  }
}

/* Make button full width on all screen sizes */
.btn-view-public {
  display: flex;
  width: 100%;
  justify-content: center;
}
</style>

