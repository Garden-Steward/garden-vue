<script setup>
import { computed, watch, ref } from 'vue';
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
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-[#f5f5f5]">Event:</label>
        <select 
          v-model="selectedEvent"
          class="px-3 py-1.5 border border-[#3d4d36]/50 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-custom-green"
        >
          <option value="all" class="bg-[rgba(26,26,26,0.8)]">All Events</option>
          <option v-for="event in availableEvents" :key="event.id" :value="event.id" class="bg-[rgba(26,26,26,0.8)]">
            {{ event.title || event.attributes?.title || 'Untitled Event' }}
          </option>
        </select>
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

