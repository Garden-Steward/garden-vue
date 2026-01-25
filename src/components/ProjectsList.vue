<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useProjectsStore, useEventStore } from '@/stores';
import Project from '@/components/modals/Project.vue';

const props = defineProps({
  garden: {
    type: Object,
    required: true
  },
  editor: {
    type: Boolean,
    default: false
  }
});

const projectsStore = useProjectsStore();
const eventStore = useEventStore();
const { projects } = storeToRefs(projectsStore);
const { volunteerDays } = storeToRefs(eventStore);

// Filter and sort state
const selectedCategory = ref('all');
const selectedEvent = ref('all');
const sortOrder = ref('desc'); // 'asc' or 'desc'

// Custom dropdown state for Event filter
const isEventDropdownOpen = ref(false);
const eventDropdownRef = ref(null);
const eventButtonRef = ref(null);

// Fetch projects when garden changes
watch(() => props.garden?.id, (newId) => {
  if (newId) {
    console.log("Fetching projects for garden:", newId);
    projectsStore.getProjects(newId);
  }
}, { immediate: true });

// Fetch events when garden changes
watch(() => props.garden?.attributes?.slug, (slug) => {
  if (slug) {
    eventStore.getByGarden(slug);
  }
}, { immediate: true });

// Get all projects
const allProjects = computed(() => {
  console.log("projects value:", projects.value);
  if (!projects.value) return [];
  return Array.isArray(projects.value) ? projects.value : [];
});

// Get unique categories from projects
const availableCategories = computed(() => {
  const categories = new Set();
  allProjects.value.forEach(project => {
    if (project.attributes?.category) {
      categories.add(project.attributes.category);
    }
  });
  return Array.from(categories).sort();
});

// Get available events for filtering
const availableEvents = computed(() => {
  if (!volunteerDays.value?.days || !Array.isArray(volunteerDays.value.days)) {
    return [];
  }
  return volunteerDays.value.days;
});

// Filter and sort projects
const projectsList = computed(() => {
  let filtered = [...allProjects.value];

  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(project => 
      project.attributes?.category === selectedCategory.value
    );
  }

  // Filter by related event
  if (selectedEvent.value !== 'all') {
    filtered = filtered.filter(project => {
      const relatedEvents = project.attributes?.related_events;
      if (!relatedEvents) return false;
      
      // Handle both Strapi format and normalized format
      const eventsArray = relatedEvents?.data || relatedEvents;
      if (!Array.isArray(eventsArray)) return false;
      
      return eventsArray.some(event => {
        const eventId = typeof event === 'object' ? (event.id || event) : event;
        return eventId === parseInt(selectedEvent.value);
      });
    });
  }

  // Sort by createdAt (newest first by default)
  filtered.sort((a, b) => {
    const dateA = a.attributes?.createdAt ? new Date(a.attributes.createdAt) : new Date(0);
    const dateB = b.attributes?.createdAt ? new Date(b.attributes.createdAt) : new Date(0);
    
    if (sortOrder.value === 'asc') {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });

  return filtered;
});

// Get selected event display text
const selectedEventText = computed(() => {
  if (selectedEvent.value === 'all') {
    return 'All Events';
  }
  const event = availableEvents.value.find(e => e.id === parseInt(selectedEvent.value));
  return event ? (event.title || event.attributes?.title || 'Untitled Event') : 'All Events';
});

// Toggle event dropdown
const toggleEventDropdown = () => {
  isEventDropdownOpen.value = !isEventDropdownOpen.value;
};

// Select event
const selectEvent = (eventId) => {
  selectedEvent.value = eventId === 'all' ? 'all' : eventId.toString();
  isEventDropdownOpen.value = false;
};

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  const dropdown = event.target.closest('.event-dropdown-container');
  const button = event.target.closest('.event-dropdown-button');
  
  if (!dropdown && !button && isEventDropdownOpen.value) {
    isEventDropdownOpen.value = false;
  }
};

// Handle Escape key
const handleEscape = (e) => {
  if (e.key === 'Escape' && isEventDropdownOpen.value) {
    isEventDropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('keydown', handleEscape);
});
</script>

<template>
  <div class="bg-[#405a40] p-1 md:p-6 rounded-lg shadow-md mb-4">
    <!-- Header with Filters -->
    <div v-if="allProjects.length > 0" class="flex flex-wrap gap-3 items-center mb-4">
      <!-- Category Filter -->
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-[#f5f5f5]">Category:</label>
        <select 
          v-model="selectedCategory"
          class="px-3 py-1.5 border border-[#3d4d36]/50 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-custom-green"
        >
          <option value="all" class="bg-[rgba(26,26,26,0.8)]">All Categories</option>
          <option v-for="category in availableCategories" :key="category" :value="category" class="bg-[rgba(26,26,26,0.8)]">
            {{ category }}
          </option>
        </select>
      </div>

      <!-- Event Filter -->
      <div class="flex items-center gap-2 relative">
        <label class="text-sm font-medium text-[#f5f5f5]">Event:</label>
        <div class="relative event-dropdown-container">
          <button
            ref="eventButtonRef"
            @click="toggleEventDropdown"
            class="event-dropdown-button px-3 py-1.5 border border-[#3d4d36]/50 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-custom-green min-w-[180px] text-left flex items-center justify-between"
          >
            <span>{{ selectedEventText }}</span>
            <svg 
              class="w-4 h-4 ml-2 transition-transform duration-200"
              :class="{ 'rotate-180': isEventDropdownOpen }"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <!-- Dropdown Menu -->
          <transition name="dropdown">
            <div
              v-if="isEventDropdownOpen"
              ref="eventDropdownRef"
              class="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-[rgba(26,26,26,0.95)] border border-[#3d4d36]/50 rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto"
            >
              <button
                @click="selectEvent('all')"
                :class="[
                  'w-full px-3 py-2 text-sm text-left text-[#f5f5f5] hover:bg-[rgba(138,163,124,0.3)] transition-colors flex items-center',
                  selectedEvent === 'all' ? 'bg-[rgba(138,163,124,0.2)]' : ''
                ]"
              >
                <span v-if="selectedEvent === 'all'" class="mr-2 text-custom-green">✓</span>
                <span>All Events</span>
              </button>
              <button
                v-for="event in availableEvents"
                :key="event.id"
                @click="selectEvent(event.id)"
                :class="[
                  'w-full px-3 py-2 text-sm text-left text-[#f5f5f5] hover:bg-[rgba(138,163,124,0.3)] transition-colors flex items-center',
                  selectedEvent === 'all' || parseInt(selectedEvent) === event.id ? 'bg-[rgba(138,163,124,0.2)]' : ''
                ]"
              >
                <span v-if="selectedEvent !== 'all' && parseInt(selectedEvent) === event.id" class="mr-2 text-custom-green">✓</span>
                <span>{{ event.title || event.attributes?.title || 'Untitled Event' }}</span>
              </button>
            </div>
          </transition>
        </div>
      </div>

      <!-- Sort Order -->
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-[#f5f5f5]">Sort:</label>
        <select 
          v-model="sortOrder"
          class="px-3 py-1.5 border border-[#3d4d36]/50 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-custom-green"
        >
          <option value="desc" class="bg-[rgba(26,26,26,0.8)]">Newest First</option>
          <option value="asc" class="bg-[rgba(26,26,26,0.8)]">Oldest First</option>
        </select>
      </div>

      <!-- Results count -->
      <div class="text-sm text-[#d0d0d0] ml-auto">
        Showing {{ projectsList.length }} of {{ allProjects.length }} projects
      </div>
    </div>
    
    <template v-if="projectsList.length > 0">
      <div v-for="project in projectsList" :key="project.id" class="ml-3 mb-2">
        <Project 
          v-if="project.attributes"
          v-bind="project.attributes" 
          :id="project.id"
          :garden="garden?.id"
          :garden-slug="garden?.attributes?.slug"
          :editor="editor"
        />
      </div>
    </template>
    
    <div v-else-if="!editor" class="text-[#d0d0d0] italic">
      No projects available at this time
    </div>

    <div v-else-if="projectsList.length === 0 && allProjects.length > 0" class="text-[#d0d0d0] italic">
      No projects match the selected filters.
    </div>
  </div>
</template>

<style scoped>
/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
  transform-origin: top;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* Ensure dropdown doesn't overflow container */
.event-dropdown-container {
  position: relative;
  display: inline-block;
}

/* Custom scrollbar for dropdown */
.event-dropdown-container div::-webkit-scrollbar {
  width: 6px;
}

.event-dropdown-container div::-webkit-scrollbar-track {
  background: rgba(26, 26, 26, 0.5);
  border-radius: 3px;
}

.event-dropdown-container div::-webkit-scrollbar-thumb {
  background: rgba(138, 163, 124, 0.5);
  border-radius: 3px;
}

.event-dropdown-container div::-webkit-scrollbar-thumb:hover {
  background: rgba(138, 163, 124, 0.7);
}
</style>