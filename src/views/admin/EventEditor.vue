<script setup>
import { storeToRefs } from 'pinia';
import { ref, watch, computed, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from "vue-router";
import { useEventStore, useAlertStore, useProjectsStore, useGardenTaskStore } from '@/stores';
import { relationKey } from '@/helpers';
import Tiptap from '@/components/Tiptap.vue'
import UserProfileDisplay from '@/components/UserProfileDisplay.vue'
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'
import { format } from 'date-fns';
import Switch from '@/components/form/Switch.vue';
import TextInput from '@/components/form/TextInput.vue';
import HeroImageCard from '@/components/form/HeroImageCard.vue';
import ImageGalleryUpload from '@/components/form/ImageGalleryUpload.vue';
import DropDown from '@/components/form/DropDown.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import EventProjectCard from '@/components/EventProjectCard.vue';
import { PrintDaySheetModal } from '@/components/modals';
import BriefEditor from '@/components/form/BriefEditor.vue';
import { briefToState, briefToPayload, briefEquals, briefHasContent, fetchBriefStarters } from '@/helpers/event-brief';

const eventStore = useEventStore();
const alertStore = useAlertStore();
const projectsStore = useProjectsStore();
const gardenTaskStore = useGardenTaskStore();
const route = useRoute()
const router = useRouter()

// Strapi v5 re-creates an event's published row on every save, so its numeric
// id changes. Writes and post-save reads go by documentId, which is stable
// (the by-id route accepts either), and the URL switches to it.
const eventKey = () => event.value?.documentId || route.params.id;

const { event } = storeToRefs(eventStore);
const isLoading = ref(true);
const hasChanges = ref(false);
const originalEventData = ref(null);
const isEditingTitle = ref(false);
const autoSaveTimeout = ref(null);
const isAutoSaving = ref(false);
const showMediaFields = ref(false);
const showPrintDaySheet = ref(false);
const showCancelConfirm = ref(false);
const isCanceling = ref(false);
// Gate the image/gallery auto-save watchers so they don't fire on initial load
// (the values change from undefined → loaded during the first flush).
const autoSaveReady = ref(false);

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

// --- Linked projects ---
// Pending + active projects in this event's garden, newest first (sorted server-side).
const linkableProjects = ref([]);
const projectsLoading = ref(true);
const selectedProjectId = ref('');

watch(() => event.value?.garden?.id, (gardenId) => {
  if (!gardenId) return;
  projectsLoading.value = true;
  projectsStore.getLinkableProjects(gardenId)
    .then((list) => { linkableProjects.value = list || []; })
    .catch(() => { linkableProjects.value = []; })
    .finally(() => { projectsLoading.value = false; });
}, { immediate: true });

const linkedProjects = computed(() =>
  Array.isArray(event.value?.projects) ? event.value.projects : []
);

// The backend only knows the event↔project relation once it returns
// `projects` on load. Judge that from the event AS LOADED — picking a project
// creates the array locally, which must not be mistaken for backend support
// (an older backend 400s on `projects` in the populate and the payload).
const projectsSupported = computed(() => Array.isArray(originalEventData.value?.projects));

const projectOptions = computed(() => {
  const linked = new Set(linkedProjects.value.map(relationKey));
  return linkableProjects.value.filter((p) => !linked.has(relationKey(p)));
});

const projectOptionLabel = (p) => {
  const label = p.title;
  return p.review_status === 'CREATED' ? `${label} (pending)` : label;
};

const addProject = () => {
  const project = linkableProjects.value.find((p) => String(p.id) === String(selectedProjectId.value));
  selectedProjectId.value = '';
  if (!project || !event.value) return;
  event.value.projects = [...linkedProjects.value, project];
};

const removeProject = (project) => {
  if (!event.value) return;
  const key = relationKey(project);
  event.value.projects = linkedProjects.value.filter((p) => relationKey(p) !== key);
};

// --- Event page details ---
// Kept outside `event`: the core PUT response that replaces/merges into
// `event` doesn't carry these by-id-only fields, so they live in their own
// refs, seeded from the event as loaded.
const briefState = ref(briefToState(null));
const briefSaved = ref(briefToState(null));
const seriesBrief = ref(null);
const briefLoaded = ref(false);
const starters = ref({});
const dayTasks = ref([]);
const newPlanting = ref('');
const taskToLink = ref('');
const taskBusy = ref(false);

fetchBriefStarters().then((s) => { starters.value = s; });

const initDetails = (ev) => {
  // Only a backend that knows about briefs returns `resolved_brief`.
  briefLoaded.value = 'resolved_brief' in ev;
  briefState.value = briefToState(ev.brief);
  briefSaved.value = briefToState(ev.brief);
  const tb = ev.recurring_template?.brief;
  seriesBrief.value = briefHasContent(tb) ? briefToState(tb) : null;
  dayTasks.value = Array.isArray(ev.event_tasks) ? [...ev.event_tasks] : [];
};

const briefDirty = computed(() => briefLoaded.value && !briefEquals(briefState.value, briefSaved.value));
const canSave = computed(() => hasChanges.value || briefDirty.value);

const inheritedBrief = computed(() => seriesBrief.value || starters.value[event.value?.type || 'general'] || null);
const inheritedLabel = computed(() => (seriesBrief.value ? 'the series' : 'the Garden Steward starter'));
const gardenSlug = computed(() => event.value?.garden?.slug || null);

// Plantings: stored on the event itself (planting component), so they ride
// the normal change detection and save.
const plantingSupported = computed(() => Array.isArray(originalEventData.value?.planting));
const addPlanting = () => {
  const name = newPlanting.value.trim();
  if (!name || !event.value) return;
  event.value.planting = [...(event.value.planting || []), { plant_name: name }];
  newPlanting.value = '';
};
const removePlanting = (index) => {
  event.value.planting = (event.value.planting || []).filter((_, i) => i !== index);
};

// Tasks for this day: garden tasks whose volunteer_day is this event. Linking
// and unlinking save immediately on the task, not with the event.
watch(() => event.value?.garden?.id, (gardenId) => {
  if (gardenId) gardenTaskStore.getGardenTasks(gardenId).catch(() => {});
}, { immediate: true });

const HIDDEN_TASK_STATUSES = ['ABANDONED', 'SKIPPED', 'FINISHED'];
const linkableTasks = computed(() => {
  const linked = new Set(dayTasks.value.map((t) => t.documentId || t.id));
  const all = Array.isArray(gardenTaskStore.gardenTasks) ? gardenTaskStore.gardenTasks : [];
  return all.filter((t) => !t.recurring_task
    && !HIDDEN_TASK_STATUSES.includes(t.task_status)
    && !linked.has(t.documentId || t.id));
});

const linkTask = async () => {
  const task = linkableTasks.value.find((t) => String(t.id) === String(taskToLink.value));
  taskToLink.value = '';
  if (!task || !event.value?.documentId) return;
  taskBusy.value = true;
  try {
    await gardenTaskStore.update(task.documentId || task.id, { volunteer_day: event.value.documentId });
    dayTasks.value = [...dayTasks.value, {
      id: task.id, documentId: task.documentId, title: task.title, overview: task.overview, type: task.type, task_status: task.task_status,
    }];
    alertStore.success(`"${task.title}" is on the list for this day.`);
  } catch (e) {
    console.error('Error linking task:', e);
    alertStore.error("Couldn't add that task. Try again in a moment.");
  } finally {
    taskBusy.value = false;
  }
};

const unlinkTask = async (task) => {
  taskBusy.value = true;
  try {
    await gardenTaskStore.update(task.documentId || task.id, { volunteer_day: null });
    dayTasks.value = dayTasks.value.filter((t) => (t.documentId || t.id) !== (task.documentId || task.id));
  } catch (e) {
    console.error('Error unlinking task:', e);
    alertStore.error("Couldn't remove that task. Try again in a moment.");
  } finally {
    taskBusy.value = false;
  }
};

const prettyDay = computed(() => {
  return format(new Date(event.value.startDatetime), 'PPP');
});

const templateInfo = computed(() => {
  // v5: recurring_template is a flat relation object (no .data/.attributes).
  const t = event.value?.recurring_template;
  if (!t) return null;
  return { name: t.title_template ?? 'Unknown' };
});

watch(event, async (newEvent) => {
  // v5 entries are flat; skip the loading/empty states.
  if (!newEvent || !newEvent.id) return;

  if (!newEvent.accessibility) {
    newEvent.accessibility = 'Public';
  }
  // Initialize featured_gallery as empty array if it doesn't exist
  if (!newEvent.featured_gallery) {
    newEvent.featured_gallery = [];
  }

  isLoading.value = false;

  // Store original data for comparison when event loads (only once)
  if (!originalEventData.value) {
    // Deep clone to prevent mutations
    originalEventData.value = JSON.parse(JSON.stringify(newEvent));
    hasChanges.value = false;
    initDetails(newEvent);
    // Enable auto-save only AFTER this load flush settles, so the initial
    // population of hero_image/featured_gallery doesn't trigger a PUT.
    nextTick(() => { autoSaveReady.value = true; });
  }
}, { deep: true });

// Watch for changes to detect modifications
watch(() => event.value, (newEvent) => {
  if (!originalEventData.value || isLoading.value || !newEvent?.id) return;

  // Use the helper function for consistent change detection
  checkForChanges();
}, { deep: true, immediate: false });

// Also watch featured_gallery specifically to catch reordering
watch(
  () => {
    const gallery = event.value?.featured_gallery;
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
    const heroImage = event.value?.hero_image;
    return heroImage?.id || heroImage?.data?.id || null;
  },
  (newId, oldId) => {
    if (!autoSaveReady.value || !originalEventData.value || isLoading.value || isAutoSaving.value) return;
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
    const gallery = event.value?.featured_gallery;
    if (!gallery) return '';
    const ids = getGalleryIds(gallery);
    return JSON.stringify(ids);
  },
  (newIds, oldIds) => {
    if (!autoSaveReady.value || !originalEventData.value || isLoading.value || isAutoSaving.value) return;
    // Only auto-save if gallery was modified (not initial load). An empty
    // string means the event is mid-reload (no gallery at all), not that the
    // gallery was emptied — ignore both sides of that transition.
    if (oldIds && newIds && newIds !== oldIds) {
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
  if (!originalEventData.value || isLoading.value || !event.value) {
    hasChanges.value = false;
    return;
  }
  
  // Get normalized gallery arrays for comparison - use consistent extraction
  const currentGalleryIds = getGalleryIds(event.value.featured_gallery);
  const originalGalleryIds = getGalleryIds(originalEventData.value.featured_gallery);
  
  // Compare gallery order - arrays must match exactly in same order
  const galleryChanged = JSON.stringify(currentGalleryIds) !== JSON.stringify(originalGalleryIds);
  
  // Compare rest of the data (excluding gallery which we already checked)
  const currentAttrs = { ...event.value };
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
    // Send ONLY the editable fields. The event object is a flat v5 entry, so
    // spreading it would include id/documentId/timestamps and relation objects
    // (garden, recurring_template, confirmed) — Strapi rejects those on a PUT
    // (e.g. "Invalid key id"). Build an explicit payload instead.
    const src = event.value || {};
    const eventData = {
          title: src.title,
          blurb: src.blurb,
          endText: src.endText,
          startDatetime: src.startDatetime,
          content: src.content,
          accessibility: src.accessibility,
          smsLink: src.smsLink,
          partiful_link: src.partiful_link,
        };

    // hero_image → { id } | null
    const heroImageId = src.hero_image?.id || src.hero_image?.data?.id;
    eventData.hero_image = heroImageId ? { id: heroImageId } : null;

    // featured_gallery → [{ id }]
    eventData.featured_gallery = getGalleryIds(src.featured_gallery).map((id) => ({ id }));

    // Event page details. Each only when the backend sent it on load, so an
    // older backend can't be asked to write fields it doesn't have.
    if (briefDirty.value) {
      eventData.brief = briefToPayload(briefState.value);
    }
    if (plantingSupported.value && Array.isArray(src.planting)) {
      eventData.planting = src.planting
        .filter((p) => p?.plant_name?.trim())
        .map((p) => ({ plant_name: p.plant_name.trim() }));
    }
    if (!src.garden && 'location_name' in (originalEventData.value || {})) {
      eventData.location_name = src.location_name || null;
      eventData.location_address = src.location_address || null;
    }

    // projects → { set: [documentId] }. Skipped when the load didn't include
    // the relation, so an older backend can't wipe the links.
    if (projectsSupported.value && Array.isArray(src.projects)) {
      eventData.projects = { set: src.projects.map(relationKey) };
    }

    await eventStore.update(eventKey(), eventData)
    if (briefDirty.value) briefSaved.value = JSON.parse(JSON.stringify(briefState.value));
    
    if (isAutoSave) {
      // For auto-save, just update originalEventData without refreshing to avoid interrupting uploads
      if (event.value && event.value) {
        originalEventData.value = JSON.parse(JSON.stringify(event.value));
        hasChanges.value = false;
      }
    } else {
      // For manual save, refresh event data from store and reset change tracking
      // Reload by documentId and put it in the URL: the numeric id just
      // changed and will change again on the next save.
      const stableId = event.value?.documentId || route.params.id
      if (String(stableId) !== String(route.params.id)) {
        router.replace({ path: `/manage/events/${stableId}/edit` })
      }
      await eventStore.findById(stableId)
      await nextTick()
      
      if (event.value && event.value) {
        originalEventData.value = JSON.parse(JSON.stringify(event.value));
        hasChanges.value = false;
        initDetails(event.value);
      }
      
      alertStore.success('Event saved successfully!')
      window.scrollTo(0, 0)
    }
  } catch (error) {
    console.error('Error saving event:', error)
    alertStore.error('Failed to save event. Please try again.')
  }
}

const openCancelConfirm = () => {
  showCancelConfirm.value = true;
};

const closeCancelConfirm = () => {
  showCancelConfirm.value = false;
};

const confirmCancelEvent = async () => {
  if (!event.value?.id) return;
  isCanceling.value = true;
  try {
    await eventStore.cancel(eventKey());
    showCancelConfirm.value = false;
    alertStore.success('Event canceled. It will no longer send SMS reminders or appear in upcoming events.');
  } catch (error) {
    console.error('Error canceling event:', error);
    alertStore.error('Failed to cancel event. Please try again.');
  } finally {
      isCanceling.value = false;
    }
  };

  const uncancelEvent = async () => {
    if (!event.value?.id) return;
    try {
      await eventStore.update(eventKey(), { canceled: false });
      if (event.value) event.value.canceled = false;
      alertStore.success('Event restored. SMS reminders and listings will resume.');
    } catch (error) {
      console.error('Error uncanceling event:', error);
      alertStore.error('Failed to restore event.');
    }
  };

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
  <div class="event-editor bg-[#f7f1e3] dark:bg-[#344a34] mx-auto min-h-screen">
    <!-- Event Title Header -->
    <div class="bg-gradient-to-r from-forest-hero to-forest-hero-end text-white py-6 px-0 sm:px-6 lg:px-8 shadow-md relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-0">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <!-- Back link -->
            <router-link 
              :to="`/manage/gardens/${event?.garden?.slug}#events`"
              class="inline-flex items-center text-white/90 hover:text-white mb-2"
            >
              <i class="fas fa-arrow-left mr-2"></i>
              Back to Garden
            </router-link>
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">Event Manager</h1>
            <p v-if="event?.title" class="text-white/90 text-lg mt-2 flex items-center gap-2">
              {{ event.title }}
              <span v-if="event.canceled" class="inline-block px-2 py-0.5 text-sm font-semibold bg-red-700 text-white rounded">
                Canceled
              </span>
            </p>
          </div>
          
          <!-- Header buttons and access controls -->
          <div v-if="event?.id" class="flex items-start gap-4">
            <!-- Accessibility dropdown -->
            <div class="flex flex-col">
              <span class="text-sm font-semibold mb-1 text-white/90">Event Access:</span>
              <div class="w-48">
                <DropDown
                  v-model="event.accessibility"
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
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col font-roboto max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div class="flex-1">
        <div class="px-2 py-2 md:px-2 md:py-4">
          <!-- Loading spinner -->
          <div v-if="isLoading" class="flex justify-center items-center py-8">
            <LoadingSpinner size="lg" />
          </div>

          <!-- Rest of the content -->
          <div v-else>
          <!-- Main Layout: Editor on left, RSVPs on right (desktop) or bottom (mobile) -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <!-- Main Editor Content (Left side on desktop, full width on mobile) -->
            <div class="lg:col-span-2">
              <div class="rounded-lg shadow-md">
            <!-- Title: Display as h1 with edit link, or show input when editing -->
            <div class="mb-4">
              <div v-if="!isEditingTitle" class="flex items-center gap-3">
                <h1 class="text-3xl font-bold font-roboto mb-0 text-[#376451] dark:text-[#1a2617] dark:text-[#f5f5f5]">{{ event?.title || 'Untitled Event' }}</h1>
                <button
                  @click="startEditingTitle"
                  class="text-[#5a6f50] hover:text-[#376451] dark:text-custom-green dark:hover:text-darker-green underline text-sm"
                >
                  Edit
                </button>
              </div>
              <div v-else class="flex items-center gap-2">
                <div class="flex-1 title-input-wrapper">
                  <TextInput
                    v-model="event.title" 
                    placeholder="Volunteer Day!" 
                    class="flex-1"
                    size="md"
                    @blur="isEditingTitle = false"
                    @keyup.enter="isEditingTitle = false"
                  />
                </div>
                <button
                  @click="isEditingTitle = false"
                  class="text-[#6b7280] hover:text-[#1a2617] dark:text-[#6b7280] dark:text-[#d0d0d0] dark:hover:text-[#f5f5f5] text-sm"
                >
                  Done
                </button>
              </div>
              <!-- Template indicator -->
              <div v-if="templateInfo" class="mt-2">
                <span class="text-sm text-[#6b7280] dark:text-[#d0d0d0]">Template: </span>
                <span class="inline-block px-2 py-1 text-sm font-medium text-white bg-darker-green rounded">
                  {{ templateInfo.name }}
                </span>
              </div>
            </div>
            
            <!-- Two-column layout for date/time and ending time -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block mb-2 text-[#1a2617] dark:text-[#f5f5f5]">Start Date & Time:</label>
                <VueDatePicker v-model="event.startDatetime" class="mb-2" week-start="0"></VueDatePicker>
                <p class="text-sm text-[#6b7280] dark:text-[#d0d0d0]">{{ prettyDay }}</p>
                <p class="text-sm text-[#6b7280] dark:text-[#d0d0d0]">{{ new Date(event.startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</p>
              </div>
              
              <div>
                <label for="endText" class="block mb-2 text-[#1a2617] dark:text-[#f5f5f5]">Ending Time:</label>
                <TextInput
                  v-model="event.endText" 
                  size="md"
                  placeholder="e.g., around noon" 
                  class="w-full md:w-1/2 ending-time-input"
                />
              </div>
            </div>

                        <div class="mb-3">
                          <label for="partifulLink" class="block mb-2 text-[#1a2617] dark:text-[#f5f5f5]">Partiful Link:</label>
                          <TextInput
                            v-model="event.partiful_link"
                            size="md"
                            placeholder="https://partiful.com/e/..."
                            class="w-full md:w-1/2"
                          />
                        </div>

            <!-- Linked project(s) -->
            <div v-if="projectsSupported" class="mb-4">
              <label for="eventProject" class="text-[#1a2617] dark:text-[#f5f5f5]">Project</label>
              <p class="text-sm text-[#6b7280] dark:text-[#d0d0d0] mb-2">
                Link this day to the project it moves forward. It shows on the public event page.
              </p>

              <div v-if="linkedProjects.length" class="space-y-3 mb-3">
                <EventProjectCard
                  v-for="project in linkedProjects"
                  :key="project.documentId || project.id"
                  :project="project"
                  manage
                  @remove="removeProject"
                />
              </div>

              <select
                id="eventProject"
                v-model="selectedProjectId"
                class="project-select"
                :disabled="projectsLoading || !projectOptions.length"
                @change="addProject"
              >
                <option value="" disabled>
                  {{
                    projectsLoading
                      ? 'Loading projects…'
                      : projectOptions.length
                        ? (linkedProjects.length ? 'Link another project…' : 'Choose a project…')
                        : 'No other pending or active projects'
                  }}
                </option>
                <option v-for="p in projectOptions" :key="p.id" :value="p.id">
                  {{ projectOptionLabel(p) }}
                </option>
              </select>
            </div>

                        <div class="flex items-center mb-2 relative">
              <label for="blurb" class="mr-2 text-[#1a2617] dark:text-[#f5f5f5]">Blurb</label>
              <div class="group relative">
                <span class="tooltip-icon cursor-pointer">ⓘ</span>
                <div class="tooltip-text">
                  The short description that will be sent in the SMS and displayed as the blurb on the public event page.
                </div>
              </div>
              
              <!-- SMS toggle moved here -->
              <div class="ml-auto flex items-center">
                
                <Switch v-model="event.smsLink" >
                  <span class="text-sm font-medium text-[#1a2617] dark:text-[#f5f5f5] mr-2">SMS sends with link</span>
                </Switch>
              </div>
            </div>

            <textarea
              id="blurb"
              v-model="event.blurb"
              rows="3"
              class="w-full p-2 border rounded mb-4 bg-white border-[#a8c49a] text-[#1a2617] focus:outline-none focus:border-[#8aa37c] dark:!bg-[rgba(26,26,26,0.6)] dark:border-[#3d4d36] dark:text-[#f5f5f5]"
            ></textarea>
            
            <label for="content" class="text-[#1a2617] dark:text-[#f5f5f5]">Content</label>
            <div class="w-full tiptap-wrapper -mx-6 border-l-4 border-custom-green pl-4">
              <Tiptap 
                v-model="event.content" 
                :editable="true"
                :content="event.content"
                @update:content="(newContent) => event.content = newContent"
              />
            </div>
            
            <!-- Manage Media button/link -->
            <div class="mb-4 mt-[10px] -mx-6 px-6 flex">
              <button
                v-if="!showMediaFields"
                @click="showMediaFields = true"
                type="button"
                class="px-4 py-2 bg-custom-green text-white font-medium rounded shadow-md hover:bg-darker-green transition duration-150 ease-in-out"
              >
                Manage Media
              </button>
              <button
                v-else
                @click="showMediaFields = false"
                type="button"
                class="text-[#5a6f50] hover:text-[#376451] dark:text-custom-green dark:hover:text-darker-green underline font-medium"
              >
                Hide Media
              </button>
            </div>

            <!-- Media fields (hidden by default) -->
            <div v-if="showMediaFields" class="border-2 border-custom-green rounded-lg p-4 mt-4 bg-white/60 dark:bg-[rgba(26,26,26,0.4)]">
              <HeroImageCard
                v-model="event.hero_image"
                :gardenId="event?.garden?.id"
              />

              <!-- Featured Gallery Section -->
              <div class="mb-4">
                <label for="featuredGallery" class="block mb-2 font-semibold text-[#1a2617] dark:text-[#f5f5f5]">
                  Featured Gallery
                </label>
                <p class="text-sm text-[#6b7280] dark:text-[#d0d0d0] mb-2">
                  Add 3-8 photos from the event. These will appear in the event gallery. Drag to reorder.
                </p>
                <ImageGalleryUpload 
                  v-model="event.featured_gallery"
                  :event-id="event.id"
                  :garden-id="event?.garden?.id"
                  :max-images="8"
                />
              </div>
            </div>

            <!-- Event page details: everything else the public event page shows -->
            <section class="ep-panel" aria-labelledby="ep-title">
              <div class="ep-head">
                <h2 id="ep-title" class="ep-title">On the event page</h2>
                <router-link :to="`/d/${event.id}`" class="ep-link">Preview</router-link>
              </div>

              <!-- What we'll work on -->
              <div class="ep-block">
                <h3 class="ep-h3">What we'll work on</h3>
                <p class="ep-help">Garden tasks scheduled for this day. They also print on the day sheet.</p>
                <ul v-if="dayTasks.length" class="ep-tasks">
                  <li v-for="t in dayTasks" :key="t.documentId || t.id" class="ep-task">
                    <span class="ep-task-text">
                      <span class="ep-task-title">{{ t.title }}</span>
                      <span v-if="t.type" class="ep-task-meta">{{ t.type }}<template v-if="t.task_status === 'FINISHED'"> · done</template></span>
                    </span>
                    <button type="button" class="ep-remove" :disabled="taskBusy" :aria-label="`Take ${t.title} off this day`" @click="unlinkTask(t)">Remove</button>
                  </li>
                </ul>
                <p v-else class="ep-empty">No tasks on the list yet.</p>
                <div class="ep-row">
                  <label for="ep-task-pick" class="sr-only">Add a garden task to this day</label>
                  <select id="ep-task-pick" v-model="taskToLink" class="ep-select" :disabled="taskBusy || !linkableTasks.length" @change="linkTask">
                    <option value="" disabled>{{ linkableTasks.length ? 'Add a garden task…' : 'No open garden tasks to add' }}</option>
                    <option v-for="t in linkableTasks" :key="t.id" :value="t.id">{{ t.title }}</option>
                  </select>
                  <router-link v-if="gardenSlug" :to="`/manage/gardens/${gardenSlug}#tasks`" class="ep-link">New task</router-link>
                </div>

                <template v-if="plantingSupported">
                  <h4 class="ep-h4">Going in the ground</h4>
                  <div class="ep-chips">
                    <span v-for="(p, i) in event.planting" :key="`${p.plant_name}-${i}`" class="ep-chip">
                      {{ p.plant_name }}
                      <button type="button" class="ep-chip-x" :aria-label="`Remove ${p.plant_name}`" @click="removePlanting(i)">×</button>
                    </span>
                  </div>
                  <form class="ep-row" @submit.prevent="addPlanting">
                    <label for="ep-planting" class="sr-only">Add a plant</label>
                    <input id="ep-planting" v-model="newPlanting" type="text" class="ep-input" placeholder="e.g. Fava beans" />
                    <button type="submit" class="ep-btn" :disabled="!newPlanting.trim()">Add plant</button>
                  </form>
                </template>
              </div>

              <!-- Brief override -->
              <div v-if="briefLoaded" class="ep-block">
                <h3 class="ep-h3">How the day goes &amp; what to bring</h3>
                <p class="ep-help">
                  <template v-if="seriesBrief">
                    Comes from the series<template v-if="templateInfo"> “{{ templateInfo.name }}”</template>.
                    Fill in a field only to change it for this one event.
                    <router-link v-if="gardenSlug" :to="`/manage/gardens/${gardenSlug}/event-templates`" class="ep-link">Edit the series</router-link>
                  </template>
                  <template v-else-if="templateInfo">
                    The series “{{ templateInfo.name }}” has no brief yet, so this event shows the Garden Steward starter.
                    <router-link v-if="gardenSlug" :to="`/manage/gardens/${gardenSlug}/event-templates`" class="ep-link">Write one for the series</router-link>
                    or change it just here.
                  </template>
                  <template v-else>
                    Shows the Garden Steward starter until you change it here.
                  </template>
                </p>
                <BriefEditor
                  v-model="briefState"
                  :inherited="inheritedBrief"
                  :inherited-label="inheritedLabel"
                  id-prefix="event-brief"
                />
              </div>

              <!-- Garden logistics (read-only here) -->
              <div v-if="event.garden" class="ep-block">
                <h3 class="ep-h3">Getting there</h3>
                <p class="ep-help">
                  Meeting spot, parking, restroom and accessibility come from the garden and show on all its events.
                  <router-link v-if="gardenSlug" :to="`/manage/gardens/${gardenSlug}#events`" class="ep-link">Edit garden visit info</router-link>
                </p>
              </div>
              <div v-else-if="'location_name' in event" class="ep-block">
                <h3 class="ep-h3">Where</h3>
                <p class="ep-help">This event isn't at a garden, so tell people where to go.</p>
                <div class="ep-grid2">
                  <div>
                    <label for="ep-loc-name" class="ep-label">Place</label>
                    <input id="ep-loc-name" v-model="event.location_name" type="text" class="ep-input" placeholder="e.g. Main Library" />
                  </div>
                  <div>
                    <label for="ep-loc-addr" class="ep-label">Address</label>
                    <input id="ep-loc-addr" v-model="event.location_address" type="text" class="ep-input" placeholder="e.g. 125 14th St, Oakland" />
                  </div>
                </div>
              </div>
            </section>
              </div>
            </div>
            
            <!-- RSVPs Section (Right side on desktop, bottom on mobile) -->
            <div class="lg:col-span-1">
              <div class="stew lg:sticky lg:top-4">
                <!-- Save Event Button -->
                <button 
                  @click="saveEvent()" 
                  :disabled="!canSave"
                  class="w-full bg-custom-green hover:bg-darker-green text-white font-bold py-2 px-4 rounded-md mb-4 transition-all disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 dark:disabled:hover:bg-gray-600"
                >
                  Save Event
                </button>
                
                <h2 class="text-xl font-bold mb-3 text-[#1a2617] dark:text-[#f5f5f5]">
                  Volunteers RSVP'd 
                  <span class="text-lg font-normal text-[#6b7280] dark:text-white/80">({{ event.confirmed?.length || 0 }})</span>
                </h2>
                
                <div>
                  <div v-if="!event.confirmed?.length" class="text-[#6b7280] dark:text-[#d0d0d0]">
                    No one has RSVP'd to this event yet
                  </div>
                  <ul v-else class="space-y-3">
                    <li v-for="volunteer in event.confirmed" :key="volunteer.id">
                      <UserProfileDisplay :volunteer="volunteer" :showName="true" />
                    </li>
                  </ul>
                </div>
                
                <!-- Public Event Page Link -->
                <button
                  @click="$router.push(`/d/${event.id}`)"
                  class="w-full bg-custom-green hover:bg-darker-green text-white font-bold py-2 px-4 rounded mt-4"
                >
                  Public Event Page
                </button>

                <!-- Print the task day sheet for this event -->
                <button
                  type="button"
                  @click="showPrintDaySheet = true"
                  class="w-full border-2 border-custom-green text-custom-green hover:bg-custom-green hover:text-white dark:text-[#e8e8e8] font-bold py-2 px-4 rounded mt-3 transition-colors"
                >
                  Print day sheet
                </button>

                <!-- Cancel / Uncancel Event -->
                                <div v-if="event.canceled" class="mt-4 text-center">
                                  <p class="text-sm text-red-700 dark:text-red-400 mb-2">This event has been canceled.</p>
                                  <button
                                    class="px-4 py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded"
                                    @click="uncancelEvent"
                                  >
                                    Restore Event (Uncancel)
                                  </button>
                                </div>
                                <a
                                  v-else
                                  href="#"
                                  class="block text-center text-sm text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:underline mt-4"
                                  @click.prevent="openCancelConfirm"
                >
                  Cancel Event
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Cancel Confirmation Modal -->
    <div
      v-if="showCancelConfirm"
      class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-gray-900/70"
      @click.self="closeCancelConfirm"
    >
      <div class="w-full max-w-md rounded-lg shadow-xl bg-white text-[#1a2617] border-[#e2dccb] dark:!bg-[#2d3e26] dark:text-[#f5f5f5] dark:border-[#3d4d36] p-4 border" @click.stop>
        <p class="text-sm mb-4">
          Are you sure you want to cancel this event? It will stop sending SMS reminders and will no longer appear in upcoming events. This cannot be undone here.
        </p>
        <div class="flex justify-end gap-2">
          <button class="px-3 py-2 text-sm text-[#1a2617] dark:text-[#f5f5f5] hover:underline" @click="closeCancelConfirm">
            Keep Event
          </button>
          <button
            :disabled="isCanceling"
            class="px-3 py-2 text-sm bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
            @click="confirmCancelEvent"
          >
            Cancel Event
          </button>
        </div>
      </div>
    </div>

    <PrintDaySheetModal
      v-if="event?.id"
      v-model="showPrintDaySheet"
      :event-id="event.id"
      :is-manager="true"
    />
  </div>
</template>

<style scoped>
.stew {
  background-color: #ffffff;
  border: 1px solid #e2dccb;
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
  color: #1a2617;
}

/* VueDatePicker: light by default; the global html.dark .dp__theme_light
   vars in base.css handle dark mode. */
:deep(.dp__input) {
  border-color: #a8c49a;
  color: #1a2617;
}

select {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #a8c49a;
  border-radius: 4px;
  font-size: 1.2em;
  background-color: #ffffff;
  color: #1a2617;
}

.tooltip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: #e2dccb;
  color: #4a5c42;
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

/* Make Tiptap editor full width and align with Manage Media button */
.tiptap-wrapper {
  width: calc(100% + 3rem) !important;
  margin-left: -1.5rem !important;
  margin-right: -1.5rem !important;
}

.tiptap-wrapper .container {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
}
</style>

<!--
  Dark overrides need a literal html.dark selector — `:global(.dark) .foo`
  does not survive this project's scoped-style compilation. Namespaced under
  .event-editor so nothing leaks.
-->
<style>
html.dark .event-editor .stew {
  background-color: #2d3e26;
  border-color: #3d4d36;
}

html.dark .event-editor label {
  color: #f5f5f5;
}

html.dark .event-editor .dp__input {
  border-color: #3d4d36;
  color: #f5f5f5;
}

html.dark .event-editor select {
  background-color: rgba(26, 26, 26, 0.6);
  border-color: #3d4d36;
  color: #f5f5f5;
}

html.dark .event-editor .tooltip-icon {
  background-color: rgba(26, 26, 26, 0.6);
  color: #d0d0d0;
}
</style>

<style>
/* "On the event page" section */
.event-editor .ep-panel {
  font-family: Roboto, system-ui, sans-serif;
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #e2dccb;
  border-radius: 10px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.event-editor .ep-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.event-editor .ep-title {
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #376451;
}

.event-editor .ep-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 20px;
  border-top: 1px solid #e2dccb;
}

.event-editor .ep-h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1a2617;
}

.event-editor .ep-h4 {
  margin: 12px 0 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1a2617;
}

.event-editor .ep-help,
.event-editor .ep-empty {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #4b5563;
}

.event-editor .ep-link {
  color: #376451;
  font-weight: 700;
  font-size: 0.875rem;
  text-decoration: underline;
}

.event-editor .ep-tasks {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-editor .ep-task {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e2dccb;
  border-radius: 8px;
}

.event-editor .ep-task-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.event-editor .ep-task-title {
  font-weight: 700;
}

.event-editor .ep-task-meta {
  font-size: 0.8125rem;
  color: #6b7280;
}

.event-editor .ep-remove {
  flex: none;
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  background: none;
  color: #9a3412;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
}

.event-editor .ep-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
}

.event-editor .ep-row > .ep-select,
.event-editor .ep-row > .ep-input {
  flex: 1 1 240px;
  margin: 0;
}

.event-editor .ep-select,
.event-editor .ep-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid #a8c49a;
  border-radius: 6px;
  background-color: #ffffff;
  color: #1a2617;
  font-size: 0.9375rem;
}

.event-editor .ep-btn {
  min-height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 6px;
  background-color: #8aa37c;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.event-editor .ep-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.event-editor .ep-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.event-editor .ep-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 4px 4px 12px;
  border-radius: 9999px;
  background-color: #f3ece0;
  color: #376451;
  font-size: 0.875rem;
  font-weight: 700;
}

.event-editor .ep-chip-x {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: inherit;
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
}

.event-editor .ep-chip-x:hover {
  background-color: #e2dccb;
}

.event-editor .ep-grid2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.event-editor .ep-label {
  font-size: 0.875rem;
}

html.dark .event-editor .ep-panel {
  background-color: #2d3e26;
  border-color: #3d4d36;
}

html.dark .event-editor .ep-title,
html.dark .event-editor .ep-h3,
html.dark .event-editor .ep-h4 {
  color: #f5f5f5;
}

html.dark .event-editor .ep-block,
html.dark .event-editor .ep-task {
  border-color: #3d4d36;
}

html.dark .event-editor .ep-help,
html.dark .event-editor .ep-empty,
html.dark .event-editor .ep-task-meta {
  color: #c5d4b8;
}

html.dark .event-editor .ep-link {
  color: #c5d4b8;
}

html.dark .event-editor .ep-remove {
  color: #fca5a5;
}

html.dark .event-editor .ep-select,
html.dark .event-editor .ep-input {
  background-color: rgba(26, 26, 26, 0.6);
  border-color: #3d4d36;
  color: #f5f5f5;
}

html.dark .event-editor .ep-chip {
  background-color: #344a34;
  color: #c5d4b8;
}

html.dark .event-editor .ep-chip-x:hover {
  background-color: #3d4d36;
}
</style>
