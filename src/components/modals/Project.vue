<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useProjectsStore, useAlertStore, useEventStore } from '@/stores';
import { storeToRefs } from 'pinia';
import TextInput from '@/components/form/TextInput.vue';
import DropDown from '@/components/form/DropDown.vue';
import Tiptap from '@/components/Tiptap.vue';
import FormToggle from '@/components/Toggle.vue';
import MediaSelector from '@/components/form/MediaSelector.vue';

const props = defineProps({
  title: String,
  slug: String,
  date_start: String,
  date_end: String,
  short_description: String,
  description: String,
  hero_image: Object,
  featured_gallery: Array,
  category: String,
  volunteer_count: Number,
  hours_contributed: Number,
  partiful_link: String,
  featured: Boolean,
  impact_metrics: Array,
  related_events: Array,
  id: Number,
  garden: Number,
  gardenSlug: String,
  editor: {
    type: Boolean,
    default: false
  }
});

const projectsStore = useProjectsStore();
const alertStore = useAlertStore();
const eventStore = useEventStore();
const { volunteerDays } = storeToRefs(eventStore);

const show = ref(false);
const showViewModal = ref(false);
const error = ref(false);
const showDateFields = ref(false);
const showMediaFields = ref(false);
const availableEvents = ref([]);
const showEventSelector = ref(false);
const isSubmitting = ref(false);

const categoryOptions = [
  { value: 'Infrastructure', label: 'Infrastructure' },
  { value: 'Art', label: 'Art' },
  { value: 'Event', label: 'Event' },
  { value: 'Education', label: 'Education' },
  { value: 'Planting', label: 'Planting' },
  { value: 'Community', label: 'Community' }
];

const form = ref({
  title: props.title || '',
  slug: props.slug || '',
  date_start: props.date_start || '',
  date_end: props.date_end || '',
  short_description: props.short_description || '',
  description: props.description || '',
  hero_image: props.hero_image || null,
  featured_gallery: props.featured_gallery || [],
  category: props.category || 'Community',
  volunteer_count: props.volunteer_count || null,
  hours_contributed: props.hours_contributed || null,
  partiful_link: props.partiful_link || '',
  featured: props.featured || false,
  impact_metrics: props.impact_metrics ? [...props.impact_metrics] : [],
  related_events: props.related_events ? (Array.isArray(props.related_events) ? props.related_events : props.related_events.data || []) : [],
  garden: props.garden || null
});

// Show date fields if dates are already set
if (props.date_start || props.date_end) {
  showDateFields.value = true;
}

// Helper to deep clone form data
const deepCloneForm = (formData) => {
  return JSON.parse(JSON.stringify(formData));
};

// Store the original form state for dirty checking (similar to EventEditor.vue)
const originalFormData = ref(null);
const hasChanges = ref(false);

// Watch for show value to reset originalFormData when form opens (similar to EventEditor.vue)
watch(show, async (isShowing) => {
  if (isShowing) {
    // Wait for next tick to ensure all reactive updates are complete
    await nextTick();
    // Store original data for comparison when form opens (only once per open)
    if (props.id && form.value) {
      originalFormData.value = deepCloneForm(form.value);
      hasChanges.value = false;
    } else if (!props.id) {
      // For new projects, set original to empty form
      originalFormData.value = deepCloneForm(form.value);
      hasChanges.value = false;
    }
  }
});

// Watch for prop changes
watch(() => props.title, (newVal) => { form.value.title = newVal || ''; });
watch(() => props.slug, (newVal) => { form.value.slug = newVal || ''; });
watch(() => props.date_start, (newVal) => { 
  form.value.date_start = newVal || '';
  if (newVal) showDateFields.value = true;
});
watch(() => props.date_end, (newVal) => { 
  form.value.date_end = newVal || '';
  if (newVal) showDateFields.value = true;
});
watch(() => props.short_description, (newVal) => { form.value.short_description = newVal || ''; });
watch(() => props.description, (newVal) => { form.value.description = newVal || ''; });
watch(() => props.category, (newVal) => { form.value.category = newVal || 'Community'; });
watch(() => props.volunteer_count, (newVal) => { form.value.volunteer_count = newVal || null; });
watch(() => props.hours_contributed, (newVal) => { form.value.hours_contributed = newVal || null; });
watch(() => props.partiful_link, (newVal) => { form.value.partiful_link = newVal || ''; });
watch(() => props.featured, (newVal) => { form.value.featured = newVal || false; });
watch(() => props.hero_image, (newVal) => {
  if (newVal) {
    form.value.hero_image = newVal;
  } else {
    form.value.hero_image = null;
  }
});
watch(() => props.featured_gallery, (newVal) => {
  // Ensure it's always an array
  if (Array.isArray(newVal)) {
    form.value.featured_gallery = newVal;
  } else if (newVal?.data && Array.isArray(newVal.data)) {
    form.value.featured_gallery = newVal.data;
  } else {
    form.value.featured_gallery = [];
  }
}, { deep: true });
watch(() => props.impact_metrics, (newVal) => {
  form.value.impact_metrics = newVal ? [...newVal] : [];
}, { deep: true });
watch(() => props.related_events, (newVal) => {
  if (newVal) {
    form.value.related_events = Array.isArray(newVal) ? newVal : (newVal.data || []);
  } else {
    form.value.related_events = [];
  }
}, { deep: true });

// Watch for changes to detect modifications (similar to EventEditor.vue)
watch(() => form.value, () => {
  if (!originalFormData.value || !show.value) return;
  checkForChanges();
}, { deep: true });

const showCreateButton = computed(() => {
  return props.editor === true && !props.id;
});

const topic = computed(() => {
  return (props.id) ? "Edit Project:" : "New Project";
});

const submitText = computed(() => {
  return (props.id) ? "Update Project" : "Create Project";
});

// Helper function to normalize form data for comparison (similar to EventEditor.vue)
const normalizeFormData = (formData) => {
  if (!formData) return null;
  
  const normalized = { ...formData };
  
  // Normalize hero_image
  if (normalized.hero_image) {
    normalized.hero_image = normalized.hero_image?.id || null;
  } else {
    normalized.hero_image = null;
  }
  
  // Normalize featured_gallery - extract IDs preserving order
  if (normalized.featured_gallery) {
    let galleryArray = [];
    if (normalized.featured_gallery?.data && Array.isArray(normalized.featured_gallery.data)) {
      galleryArray = normalized.featured_gallery.data;
    } else if (Array.isArray(normalized.featured_gallery)) {
      galleryArray = normalized.featured_gallery;
    }
    
    normalized.featured_gallery = galleryArray
      .map(img => {
        if (typeof img === 'object' && img !== null) {
          return img.id || img.data?.id || null;
        }
        return typeof img === 'number' || typeof img === 'string' ? img : null;
      })
      .filter(id => id !== null && id !== undefined);
  } else {
    normalized.featured_gallery = [];
  }
  
  // Normalize related_events - extract IDs
  if (normalized.related_events) {
    let eventsArray = [];
    if (normalized.related_events?.data && Array.isArray(normalized.related_events.data)) {
      eventsArray = normalized.related_events.data;
    } else if (Array.isArray(normalized.related_events)) {
      eventsArray = normalized.related_events;
    }
    
    normalized.related_events = eventsArray
      .map(e => {
        if (typeof e === 'object' && e !== null) {
          return e.id || e.data?.id || null;
        }
        return typeof e === 'number' || typeof e === 'string' ? e : null;
      })
      .filter(id => id !== null && id !== undefined)
      .sort((a, b) => a - b);
  } else {
    normalized.related_events = [];
  }
  
  // Normalize impact_metrics
  if (!normalized.impact_metrics) {
    normalized.impact_metrics = [];
  }
  
  // Normalize dates - convert empty strings to null
  if (normalized.date_start === '') normalized.date_start = null;
  if (normalized.date_end === '') normalized.date_end = null;
  
  // Normalize numbers - convert null to undefined for comparison
  if (normalized.volunteer_count === null) normalized.volunteer_count = undefined;
  if (normalized.hours_contributed === null) normalized.hours_contributed = undefined;
  
  return normalized;
};

// Helper function to check for changes (similar to EventEditor.vue)
const checkForChanges = () => {
  if (!originalFormData.value || !show.value) {
    hasChanges.value = false;
    return;
  }
  
  const currentNormalized = normalizeFormData(form.value);
  const originalNormalized = normalizeFormData(originalFormData.value);
  
  const changed = JSON.stringify(currentNormalized) !== JSON.stringify(originalNormalized);
  hasChanges.value = changed;
};

// Filtered gallery images to exclude null/undefined entries
const validGalleryImages = computed(() => {
  if (!form.value.featured_gallery || !Array.isArray(form.value.featured_gallery)) {
    return [];
  }
  return form.value.featured_gallery.filter(img => img && (img.url || img.formats?.medium?.url));
});

// Get thumbnail URL from hero_image
const heroThumbnailUrl = computed(() => {
  const heroImage = form.value.hero_image;
  if (!heroImage) return null;
  
  // Handle API response format: hero_image.data.attributes.formats.thumbnail.url
  if (heroImage.data?.attributes?.formats?.thumbnail?.url) {
    return heroImage.data.attributes.formats.thumbnail.url;
  }
  
  // Handle normalized format: hero_image.formats.thumbnail.url
  if (heroImage.formats?.thumbnail?.url) {
    return heroImage.formats.thumbnail.url;
  }
  
  // Fallback to small or medium if thumbnail not available
  if (heroImage.data?.attributes?.formats?.small?.url) {
    return heroImage.data.attributes.formats.small.url;
  }
  if (heroImage.formats?.small?.url) {
    return heroImage.formats.small.url;
  }
  if (heroImage.data?.attributes?.formats?.medium?.url) {
    return heroImage.data.attributes.formats.medium.url;
  }
  if (heroImage.formats?.medium?.url) {
    return heroImage.formats.medium.url;
  }
  
  // Last resort: use main URL
  if (heroImage.data?.attributes?.url) {
    return heroImage.data.attributes.url;
  }
  if (heroImage.url) {
    return heroImage.url;
  }
  
  return null;
});

// Normalize related events for display
const normalizedRelatedEvents = computed(() => {
  if (!form.value.related_events || !Array.isArray(form.value.related_events)) {
    return [];
  }
  return form.value.related_events.map(event => {
    if (typeof event === 'object' && event !== null) {
      // Handle Strapi format: { id, attributes: { title, ... } }
      if (event.attributes) {
        return { ...event.attributes, id: event.id };
      }
      // Handle already normalized format: { id, title, ... }
      return event;
    }
    return event;
  }).filter(Boolean);
});

// Fetch available events when component mounts or garden changes
onMounted(async () => {
  await fetchAvailableEvents();
});

watch(() => props.gardenSlug, async () => {
  await fetchAvailableEvents();
});

const fetchAvailableEvents = async () => {
  const slug = props.gardenSlug;
  console.log('Fetching events for slug:', slug);
  if (slug) {
    try {
      await eventStore.getByGarden(slug);
      console.log('Volunteer days after fetch:', volunteerDays.value);
      if (volunteerDays.value?.days && Array.isArray(volunteerDays.value.days)) {
        availableEvents.value = volunteerDays.value.days;
        console.log('Available events set to:', availableEvents.value);
      } else {
        console.log('No days found in volunteerDays:', volunteerDays.value);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  } else {
    console.log('No garden slug provided');
  }
};

// Get available events that aren't already connected
const availableEventsToConnect = computed(() => {
  const connectedIds = normalizedRelatedEvents.value.map(e => e.id || e);
  return availableEvents.value.filter(e => !connectedIds.includes(e.id));
});

// Add event to related events
const addRelatedEvent = (eventId) => {
  const event = availableEvents.value.find(e => e.id === eventId);
  if (event && !form.value.related_events.some(e => {
    const eId = typeof e === 'object' ? (e.id || e) : e;
    return eId === eventId;
  })) {
    form.value.related_events.push(event);
  }
  showEventSelector.value = false;
};

// Remove event from related events
const removeRelatedEvent = (eventId) => {
  form.value.related_events = form.value.related_events.filter(e => {
    const eId = typeof e === 'object' ? (e.id || e) : e;
    return eId !== eventId;
  });
};

// Generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

watch(() => form.value.title, (newTitle) => {
  if (!props.id && newTitle) {
    form.value.slug = generateSlug(newTitle);
  }
});

// Impact metrics management
const addImpactMetric = () => {
  form.value.impact_metrics.push({
    label: '',
    value: '',
    icon: ''
  });
};

const removeImpactMetric = (index) => {
  form.value.impact_metrics.splice(index, 1);
};

const submit = async () => {
  // Prevent double submission
  if (isSubmitting.value) {
    return;
  }
  
  isSubmitting.value = true;
  error.value = false;
  
  if (!form.value.title || !form.value.slug || !form.value.short_description) {
    error.value = true;
    alertStore.error('Please fill in all required fields');
    alertStore.error('Please fill in all required fields');
    isSubmitting.value = false;
    return;
  }

  try {
    const data = {
      ...form.value,
      garden: props.garden
    };

    // Convert empty date strings to null
    if (data.date_start === '') {
      data.date_start = null;
    }
    if (data.date_end === '') {
      data.date_end = null;
    }
    
    // Format hero_image for Strapi
    if (data.hero_image) {
      // Handle MediaSelector format: { id, url } or Strapi format: { id, data: {...} }
      const heroImageId = data.hero_image.id || data.hero_image.data?.id
      if (heroImageId) {
        data.hero_image = {
          id: heroImageId
        }
      } else {
        // If no valid ID, set to null
        data.hero_image = null
      }
    }
    
    // Format featured_gallery for Strapi
    if (data.featured_gallery) {
      // Handle Strapi format: { data: [...] } or direct array
      let galleryArray = []
      if (data.featured_gallery?.data && Array.isArray(data.featured_gallery.data)) {
        galleryArray = data.featured_gallery.data
      } else if (Array.isArray(data.featured_gallery)) {
        galleryArray = data.featured_gallery
      }
      
      if (galleryArray.length > 0) {
        data.featured_gallery = galleryArray
          .map(img => {
            // Extract ID from different formats (MediaSelector: { id, url } or Strapi: { id, data: {...} })
            const id = img?.id || img?.data?.id
            return id ? { id } : null
          })
          .filter(img => img !== null)
      } else {
        data.featured_gallery = []
      }
    }
    
    // Format related_events for Strapi (many-to-many relation)
    if (data.related_events && Array.isArray(data.related_events)) {
      data.related_events = data.related_events
        .filter(event => event && (event.id || event))
        .map(event => ({
          id: typeof event === 'object' ? (event.id || event) : event
        }));
    }

    if (props.id) {
      await projectsStore.update(props.id, data);
      alertStore.success('Project updated successfully');
    } else {
      await projectsStore.register(data);
      alertStore.success('Project created successfully');
      // Reset form
      form.value = {
        title: '',
        slug: '',
        date_start: '',
        date_end: '',
        short_description: '',
        description: '',
        hero_image: null,
        featured_gallery: [],
        category: 'Community',
        volunteer_count: null,
        hours_contributed: null,
        partiful_link: '',
        featured: false,
        impact_metrics: [],
        related_events: [],
        garden: props.garden
      };
      showDateFields.value = false;
      originalFormData.value = deepCloneForm(form.value);
      hasChanges.value = false;
    }
    
    show.value = false;
  } catch (err) {
    error.value = true;
    console.error('Error submitting project:', err);
    
    // Extract error message from various possible error formats
    let errorMessage = 'An unknown error occurred';
    
    if (typeof err === 'string') {
      errorMessage = err;
    } else if (err?.error?.message) {
      // Handle Strapi error format: { error: { message: "..." } }
      errorMessage = err.error.message;
    } else if (err?.message) {
      // Handle standard error format: { message: "..." }
      errorMessage = err.message;
    } else if (err?.response?.data?.error?.message) {
      // Handle axios-style error format
      errorMessage = err.response.data.error.message;
    }
    
    const action = props.id ? 'update' : 'create';
    alertStore.error(`We were not able to ${action} this Project: ${errorMessage}`);
  } finally {
    isSubmitting.value = false;
  }
};

const toggleShow = () => {
  show.value = !show.value;
  if (show.value) {
    // Fetch events when form opens
    // Note: initialForm is set via watch(show) to ensure proper timing
    fetchAvailableEvents();
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  } else {
    // Restore body scroll when modal is closed
    document.body.style.overflow = '';
  }
};

const openViewModal = () => {
  if (props.editor) {
    // In editor mode, open edit modal
    toggleShow();
  } else {
    // In view mode, open full-screen modal
    showViewModal.value = true;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }
};

const closeViewModal = () => {
  showViewModal.value = false;
  // Restore body scroll when modal is closed
  document.body.style.overflow = '';
};

// Handle Escape key to close modal
const handleEscape = (e) => {
  if (e.key === 'Escape' && showViewModal.value) {
    closeViewModal();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape);
  // Restore body scroll if modal was open
  document.body.style.overflow = '';
});
</script>

<template>
  <div>
    <!-- Show create button if editor and no ID -->
    <div v-if="showCreateButton">
      <button
        @click="toggleShow"
        class="px-4 py-2 bg-custom-green text-white font-medium text-sm rounded shadow-md hover:bg-darker-green focus:bg-darker-green focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
      >
        {{ topic }}
      </button>
    </div>

    <!-- Show project title/header if ID exists -->
    <div v-else-if="!showCreateButton" @click="openViewModal" class="cursor-pointer bg-[rgba(26,26,26,0.6)] border border-[#3d4d36]/50 p-3 rounded-lg shadow-sm mb-1 hover:bg-[rgba(26,26,26,0.8)] transition-colors">
      <div class="flex flex-col md:flex-row gap-3">
        <!-- Thumbnail - full width on mobile, fixed size on desktop -->
        <div v-if="heroThumbnailUrl" class="w-full md:w-16 md:flex-shrink-0">
          <img 
            :src="heroThumbnailUrl" 
            :alt="form.title || 'Project thumbnail'"
            class="w-full h-48 md:w-16 md:h-16 object-cover rounded-lg"
          />
        </div>
        <div v-else class="w-full md:w-16 md:flex-shrink-0 h-48 md:h-16 bg-[rgba(26,26,26,0.8)] rounded-lg flex items-center justify-center">
          <span class="text-[#d0d0d0] text-xs">No Image</span>
        </div>
        
        <!-- Text content - full width on mobile, flex-1 on desktop -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-[#f5f5f5]">{{ form.title || 'Untitled Project' }}</h3>
            <span class="text-sm text-[#d0d0d0]">{{ form.category }}</span>
          </div>
          <p v-if="form.short_description" class="text-sm text-[#d0d0d0] mt-1">{{ form.short_description }}</p>
          <!-- Related Events Tags -->
          <div v-if="normalizedRelatedEvents.length > 0" class="flex flex-wrap gap-2 mt-2">
            <span 
              v-for="event in normalizedRelatedEvents" 
              :key="event.id || event"
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[rgba(138,163,124,0.3)] text-[#8aa37c]"
            >
              {{ event.title || event.attributes?.title || 'Untitled Event' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit/Create Modal (editor mode) -->
    <Teleport to="#modals">
      <div v-if="show && editor" class="w-xl">
        <!-- The backdrop with darker peach color -->
        <div class="fixed inset-0 bg-[#9A9084] opacity-90" @click="toggleShow"></div>

        <!-- Modal form -->
        <form @submit.prevent="submit">
          <div class="fixed inset-0 flex items-center justify-center overflow-x-hidden overflow-y-auto py-6" @click="toggleShow">
            <div class="bg-white text-black grid grid-cols-1 md:w-1/2 w-[90%] gap-2 p-6 md:p-10 mx-auto max-w-[95vw] max-h-[90vh] overflow-y-auto my-auto relative rounded-md" @click.stop>
              <!-- Close X button -->
              <button 
                type="button" 
                class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                @click="toggleShow"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div class="space-y-4">
        <!-- Title and Category row -->
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-medium mb-1">Title *</label>
            <TextInput v-model="form.title" placeholder="Project title" />
            <!-- Slug display right below title with Featured toggle -->
            <div class="flex items-center justify-between" style="margin-top: -6px;">
              <div class="flex items-center" style="gap: 2px;">
                <div style="transform: scale(0.7); transform-origin: left center; margin-right: -12px;">
                  <div class="flex items-center" style="padding-top: 0 !important; margin-left: -4px;">
                    <FormToggle v-model="form.featured" />
                  </div>
                </div>
                <span class="text-xs text-gray-600" style="margin-left: -4px;">Featured</span>
              </div>
              <p class="text-xs text-gray-600">
                slug: <span class="font-bold">{{ form.slug || 'slug-will-be-generated' }}</span>
              </p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Category</label>
            <DropDown v-model="form.category" :options="categoryOptions" />
          </div>
        </div>

        <!-- Date fields - only show if showDateFields is true or if dates exist -->
        <div v-if="showDateFields" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Start Date</label>
            <input
              v-model="form.date_start"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">End Date</label>
            <input
              v-model="form.date_end"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div v-else>
          <button
            @click="showDateFields = true"
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-700 font-medium text-sm rounded shadow-sm hover:bg-gray-300 transition duration-150 ease-in-out"
          >
            Add the Date
          </button>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Short Description * (max 350 chars)</label>
          <textarea
            v-model="form.short_description"
            maxlength="350"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Brief description of the project"
            required
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">{{ form.short_description?.length || 0 }}/350</p>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Description</label>
          <Tiptap v-model="form.description" :editor="true" />
        </div>

        <!-- Add Media button/link -->
        <div>
          <button
            v-if="!showMediaFields"
            @click="showMediaFields = true"
            type="button"
            class="px-4 py-2 bg-custom-green text-white font-medium rounded shadow-md hover:bg-darker-green transition duration-150 ease-in-out"
          >
            Add Media
          </button>
          <button
            v-else
            @click="showMediaFields = false"
            type="button"
            class="text-custom-green hover:text-darker-green underline font-medium"
          >
            Hide Media
          </button>
        </div>

        <!-- Media fields (hidden by default) -->
        <div v-if="showMediaFields">
          <div>
            <label class="block text-sm font-medium mb-1">Hero image</label>
            <MediaSelector 
              v-if="form.garden"
              v-model="form.hero_image" 
              :gardenId="form.garden"
              :multiple="false"
              placeholder="Select or upload hero image"
            />
            <div v-else class="text-gray-500 text-sm mb-4">
              Garden must be set before selecting media
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Featured Gallery</label>
            <MediaSelector 
              v-if="form.garden"
              v-model="form.featured_gallery" 
              :gardenId="form.garden"
              :multiple="true"
              placeholder="Select or upload gallery images"
            />
            <div v-else class="text-gray-500 text-sm mb-4">
              Garden must be set before selecting media
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Partiful Link</label>
            <TextInput v-model="form.partiful_link" placeholder="https://partiful.com/..." />
          </div>
        </div>


        <!-- Related Events -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium">Related Events</label>
            <button
              v-if="editor"
              @click="showEventSelector = !showEventSelector"
              type="button"
              class="px-3 py-1 bg-custom-green text-white text-sm rounded hover:bg-darker-green"
            >
              {{ showEventSelector ? 'Hide Events' : 'Attach Event' }}
            </button>
          </div>
          
          <!-- Event selector dropdown -->
          <div v-if="showEventSelector && editor" class="mb-3 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div v-if="!props.gardenSlug" class="text-sm text-gray-500 italic mb-2">
              Garden slug not available
            </div>
            <div v-else-if="volunteerDays.value?.loading || (availableEvents.length === 0 && !volunteerDays.value?.error)" class="text-sm text-gray-500 italic mb-2">
              Loading events...
            </div>
            <div v-else-if="volunteerDays.value?.error" class="text-sm text-red-500 italic mb-2">
              Error loading events. <button @click="fetchAvailableEvents" class="text-blue-600 underline">Retry</button>
            </div>
            <div v-else-if="availableEvents.length === 0" class="text-sm text-gray-500 italic mb-2">
              No events available for this garden.
            </div>
            <div v-else-if="availableEventsToConnect.length === 0" class="text-sm text-gray-500 italic mb-2">
              All available events are already connected
            </div>
            <div v-else class="max-h-60 overflow-y-auto space-y-1">
              <button
                v-for="event in availableEventsToConnect"
                :key="event.id"
                @click="addRelatedEvent(event.id)"
                class="w-full text-left px-3 py-2 text-sm bg-white hover:bg-blue-50 rounded border border-gray-200 transition-colors"
              >
                {{ event.title || event.attributes?.title || 'Untitled Event' }}
              </button>
            </div>
          </div>
          
          <!-- Connected events display -->
          <div v-if="normalizedRelatedEvents.length > 0" class="flex flex-wrap gap-2 mb-2">
            <span 
              v-for="event in normalizedRelatedEvents" 
              :key="event.id || event"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
            >
              {{ event.title || event.attributes?.title || 'Untitled Event' }}
              <button
                v-if="editor"
                @click="removeRelatedEvent(event.id || event)"
                class="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                type="button"
              >
                ×
              </button>
            </span>
          </div>
          <div v-else-if="!showEventSelector" class="text-sm text-gray-500 italic mb-2">
            No related events connected
          </div>
        </div>

        <!-- Impact Metrics -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium">Impact Metrics</label>
            <button
              @click="addImpactMetric"
              type="button"
              class="px-3 py-1 bg-custom-green text-white text-sm rounded hover:bg-darker-green"
            >
              Add Metric
            </button>
          </div>
          
          <!-- Volunteer Count and Hours Contributed -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-1">Volunteer Count</label>
              <input
                v-model.number="form.volunteer_count"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Hours Contributed</label>
              <input
                v-model.number="form.hours_contributed"
                type="number"
                step="0.1"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div v-if="form.impact_metrics.length === 0" class="text-sm text-gray-500 italic mb-2">
            No impact metrics added yet
          </div>
          
          <div v-for="(metric, index) in form.impact_metrics" :key="index" class="bg-gray-50 p-3 rounded-md mb-2">
            <div class="grid grid-cols-12 gap-2 items-end">
              <div class="col-span-3">
                <label class="block text-xs font-medium mb-1">Icon</label>
                <input
                  v-model="metric.icon"
                  type="text"
                  placeholder="🌱"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
              </div>
              <div class="col-span-4">
                <label class="block text-xs font-medium mb-1">Label</label>
                <input
                  v-model="metric.label"
                  type="text"
                  placeholder="Trees Planted"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div class="col-span-4">
                <label class="block text-xs font-medium mb-1">Value</label>
                <input
                  v-model="metric.value"
                  type="text"
                  placeholder="50"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div class="col-span-1">
                <button
                  @click="removeImpactMetric(index)"
                  type="button"
                  class="w-full px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
                </div>

                <div v-if="error" class="text-red-600 text-sm">
                  Please fill in all required fields
                </div>

                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="submit"
                    :disabled="!hasChanges || isSubmitting"
                    class="px-4 py-2 bg-green-800 text-white font-medium rounded shadow-md hover:bg-green-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {{ isSubmitting ? 'Saving...' : submitText }}
                  </button>
                  <button
                    v-if="props.id"
                    @click="toggleShow"
                    class="px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded shadow-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Teleport>

    <!-- Full-screen view modal (non-editor mode) -->
    <Teleport to="#modals">
      <!-- Full-screen content - no backdrop, just white background -->
      <div v-if="showViewModal" class="fixed inset-0 z-[10000] overflow-y-auto bg-white" @click.stop>
          <!-- Close button -->
          <button
            @click="closeViewModal"
            class="fixed top-4 right-4 w-12 h-12 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg z-[10001] transition-colors border border-gray-200"
            type="button"
            aria-label="Close"
          >
            <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Project content - centered with max width -->
          <div class="w-full flex justify-center px-4 py-8 md:px-8 md:py-12" @click.stop>
            <div class="w-full max-w-4xl">
              <!-- Hero Image -->
              <div v-if="form.hero_image?.url || form.hero_image?.formats?.medium?.url" class="mb-8">
                <img 
                  :src="form.hero_image.url || form.hero_image.formats?.medium?.url" 
                  :alt="form.title || 'Project hero image'"
                  class="w-full h-auto rounded-lg shadow-lg"
                />
              </div>

              <!-- Title and Category -->
              <div class="mb-6">
                <div class="flex items-center justify-between mb-2">
                  <h1 class="text-4xl md:text-5xl font-bold text-gray-900">{{ form.title || 'Untitled Project' }}</h1>
                  <span class="text-lg text-gray-600 bg-gray-100 px-4 py-2 rounded-full">{{ form.category }}</span>
                </div>
                <p v-if="form.short_description" class="text-xl text-gray-600 mt-4">{{ form.short_description }}</p>
              </div>

              <!-- Dates -->
              <div v-if="form.date_start || form.date_end" class="mb-6 text-gray-600">
                <span v-if="form.date_start">{{ new Date(form.date_start).toLocaleDateString() }}</span>
                <span v-if="form.date_start && form.date_end"> - </span>
                <span v-if="form.date_end">{{ new Date(form.date_end).toLocaleDateString() }}</span>
              </div>

              <!-- Related Events -->
              <div v-if="normalizedRelatedEvents.length > 0" class="mb-6">
                <h3 class="text-lg font-semibold mb-2">Related Events</h3>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="event in normalizedRelatedEvents" 
                    :key="event.id || event"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {{ event.title || event.attributes?.title || 'Untitled Event' }}
                  </span>
                </div>
              </div>

              <!-- Description -->
              <div v-if="form.description" class="mb-8 prose prose-lg max-w-none">
                <div v-html="form.description"></div>
              </div>

              <!-- Featured Gallery -->
              <div v-if="validGalleryImages.length > 0" class="mb-8">
                <h2 class="text-2xl font-bold mb-4">Gallery</h2>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div v-for="(img, idx) in validGalleryImages" :key="idx" class="relative">
                    <img 
                      :src="img.url || img.formats?.medium?.url" 
                      :alt="`Gallery image ${idx + 1}`"
                      class="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <!-- Impact Metrics -->
              <div v-if="form.volunteer_count || form.hours_contributed || form.impact_metrics?.length > 0" class="mb-8">
                <h2 class="text-2xl font-bold mb-4">Impact</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div v-if="form.volunteer_count" class="bg-gray-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-gray-900">{{ form.volunteer_count }}</div>
                    <div class="text-sm text-gray-600 mt-1">Volunteers</div>
                  </div>
                  <div v-if="form.hours_contributed" class="bg-gray-50 p-4 rounded-lg text-center">
                    <div class="text-3xl font-bold text-gray-900">{{ form.hours_contributed }}</div>
                    <div class="text-sm text-gray-600 mt-1">Hours</div>
                  </div>
                  <div 
                    v-for="(metric, index) in form.impact_metrics" 
                    :key="index"
                    class="bg-gray-50 p-4 rounded-lg text-center"
                  >
                    <div class="text-2xl mb-1">{{ metric.icon }}</div>
                    <div class="text-2xl font-bold text-gray-900">{{ metric.value }}</div>
                    <div class="text-sm text-gray-600 mt-1">{{ metric.label }}</div>
                  </div>
                </div>
              </div>

              <!-- Partiful Link -->
              <div v-if="form.partiful_link" class="mb-8">
                <a 
                  :href="form.partiful_link" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  RSVP via Partiful
                </a>
              </div>
            </div>
            </div>
      </div>
    </Teleport>
  </div>
</template>

