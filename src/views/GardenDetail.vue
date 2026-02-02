<script setup>
import { onMounted, ref, computed, defineOptions, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore, useGardensStore, useEventStore, useSMSCampaignStore, useUGInterestsStore, useAlertStore, useGardenTaskStore, useMessagesStore } from '@/stores';
import VolunteerDayModal from '@/components/modals/VolunteerDayModal.vue';
import SmsCampaignModal from '@/components/modals/SmsCampaignModal.vue';
import Volunteer from '@/components/VolunteerDetail.vue';
import GardenTaskList from '@/components/GardenTaskList.vue';
import ProjectsList from '@/components/ProjectsList.vue';
import Project from '@/components/modals/Project.vue';
import GardenSidebar from '@/components/GardenSidebar.vue';
import GardenGeneral from '@/components/GardenGeneral.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const authStore = useAuthStore();
const gardensStore = useGardensStore();
const eventStore = useEventStore();
const campaignStore = useSMSCampaignStore();
const interestStore = useUGInterestsStore();
const alertStore = useAlertStore();
const route = useRoute();
const router = useRouter();
const gardenTaskStore = useGardenTaskStore();
const messagesStore = useMessagesStore();

const { user } = storeToRefs(authStore);
const { garden } = storeToRefs(gardensStore);
const { volunteerDays, volunteerDaysPagination } = storeToRefs(eventStore);
const { smsCampaigns } = storeToRefs(campaignStore);
const { taskMessages, loading: messagesLoading } = storeToRefs(messagesStore);

const eventsPage = ref(1);
const eventsPageSize = ref(15);
const isLoadingMoreEvents = ref(false);
const hasMoreEvents = computed(() => {
  // Use pagination metadata from the API response
  return volunteerDaysPagination.value.page < volunteerDaysPagination.value.pageCount;
});

const loadMoreEvents = async () => {
  isLoadingMoreEvents.value = true;
  try {
    eventsPage.value += 1;
    await eventStore.getByGarden(route.params.slug, eventsPage.value, eventsPageSize.value, true);
  } catch (error) {
    console.error('Error loading more events:', error);
  } finally {
    isLoadingMoreEvents.value = false;
  }
};

gardensStore.getSlug(route.params.slug);
eventStore.getByGarden(route.params.slug, eventsPage.value, eventsPageSize.value);
campaignStore.getByGarden(route.params.slug);
defineOptions({ inheritAttrs: false })

// Sidebar navigation state
const activeSection = ref('general');

// Initialize activeSection from URL hash if present
const initializeFromHash = () => {
  const hash = route.hash.replace('#', '');
  if (hash) {
    const validSections = ['general', 'events', 'volunteers', 'projects', 'tasks', 'sms', 'messages'];
    if (validSections.includes(hash)) {
      activeSection.value = hash;
    }
  }
};

// Set active section and update URL hash
const setActiveSection = (section) => {
  activeSection.value = section;
  // Update URL hash without triggering navigation
  if (window.history.replaceState) {
    window.history.replaceState(null, '', `${route.path}#${section}`);
  }
};

// Watch for hash changes in the URL
watch(() => route.hash, (newHash) => {
  const hash = newHash.replace('#', '');
  if (hash) {
    const validSections = ['general', 'events', 'volunteers', 'projects', 'tasks', 'sms', 'messages'];
    if (validSections.includes(hash) && activeSection.value !== hash) {
      activeSection.value = hash;
    }
  }
});

let editor = ref(false);

const isEditor = computed(() => {
  console.log('is editor garden', garden.value)
  if (!garden.value?.attributes?.managers?.data || !user.value) return false;
  
  return !garden.value.loading && garden.value.attributes.managers.data.some(manager => manager.id === user.value.id);
});

watch(isEditor, (newValue) => {
  editor.value = newValue;
  console.log('editor status updated:', editor.value);
});

watch(() => garden.value, (newGarden) => {
  if (!newGarden.loading && newGarden.id) {
    gardenTaskStore.getRecurringTasks(newGarden.id);
  }
}, { immediate: true });

// Watch for activeSection to fetch messages when messages section is active
watch(() => activeSection.value, (section) => {
  if (section === 'messages' && garden.value?.id) {
    messagesStore.fetchByGarden(garden.value.id);
  }
});

onMounted(() => {
  editor.value = garden.value.loading !== true && garden.value.attributes.managers.data.some(manager => manager.id === user?.value?.id);
  console.log('editor mounted, ', editor.value);
  // Initialize active section from URL hash
  initializeFromHash();
});

const clearTemp = async () => {
  const gardenObject = garden.value;
  const resp = await interestStore.cleartemp(gardenObject.id);
  console.log(resp);
  alertStore.success('All Temporary Interests have been cleared.');
};

const showDayModal = ref(false);

const sortField = ref('createdAt');
const sortOrder = ref('desc');

const toggleSortOrder = (field) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
};

const sortedVolunteers = computed(() => {
  if (!garden.value.attributes.volunteers?.data) return [];
  return [...garden.value.attributes.volunteers.data].sort((a, b) => {
    if (sortField.value === 'name') {
      const nameA = `${a.attributes.firstName} ${a.attributes.lastName}`.toLowerCase();
      const nameB = `${b.attributes.firstName} ${b.attributes.lastName}`.toLowerCase();
      return sortOrder.value === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    } else {
      const dateA = new Date(a.attributes.createdAt);
      const dateB = new Date(b.attributes.createdAt);
      return sortOrder.value === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });
});

// Group messages by task (similar to TaskMessages.vue)
const groupedMessages = computed(() => {
  if (!taskMessages.value || !Array.isArray(taskMessages.value)) return [];

  // First, group messages by task
  const groups = new Map();
  taskMessages.value.forEach(message => {
    const taskId = message.garden_task?.id || 'no-task';
    
    if (!groups.has(taskId)) {
      groups.set(taskId, {
        taskId,
        taskTitle: message.garden_task?.title || 'Messages without task',
        user: message.garden_task?.volunteers?.[0]?.username || 'Anonymous',
        messages: []
      });
    }
    groups.get(taskId).messages.push(message);
  });

  // Convert to array and sort by task ID (highest to lowest)
  const sortedGroups = Array.from(groups.values())
    .sort((a, b) => {
      if (a.taskId === 'no-task') return 1;
      if (b.taskId === 'no-task') return -1;
      return parseInt(b.taskId) - parseInt(a.taskId);
    });
  
  return sortedGroups;
});

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get type color helper
const getTypeColor = (type) => {
  const colors = {
    question: 'bg-blue-100 text-blue-800',
    followup: 'bg-purple-100 text-purple-800',
    reply: 'bg-green-100 text-green-800',
    notification: 'bg-yellow-100 text-yellow-800',
    complete: 'bg-teal-100 text-teal-800',
    registration: 'bg-indigo-100 text-indigo-800',
    error: 'bg-red-100 text-red-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

// Get message border color helper
const getMessageBorderColor = (type) => {
  const colors = {
    question: 'border-blue-500',
    followup: 'border-purple-500',
    reply: 'border-green-500',
    notification: 'border-yellow-500',
    complete: 'border-teal-500',
    registration: 'border-indigo-500',
    error: 'border-red-500'
  };
  return colors[type] || 'border-gray-300';
};

// Get status color helper
const getStatusColor = (status) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    INTERESTED: 'bg-blue-100 text-blue-800',
    STARTED: 'bg-indigo-100 text-indigo-800',
    FINISHED: 'bg-green-100 text-green-800',
    ABANDONED: 'bg-red-100 text-red-800',
    ISSUE: 'bg-orange-100 text-orange-800',
    SKIPPED: 'bg-gray-100 text-gray-800',
    RESOLVED: 'bg-teal-100 text-teal-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Normalize event data (handle both Strapi format and normalized format)
const normalizeEvent = (day) => {
  // Handle Strapi format: { id, attributes: { title, startDatetime, ... } }
  if (day.attributes) {
    return { ...day.attributes, id: day.id };
  }
  // Already normalized format
  return day;
};

// Event table sort state — default: upcoming soonest first, then past (most recent first)
const eventSortField = ref('default');
const eventSortOrder = ref('asc');

const toggleEventSort = (field) => {
  if (eventSortField.value === field && field !== 'default') {
    eventSortOrder.value = eventSortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    eventSortField.value = field;
    eventSortOrder.value = field === 'title' ? 'asc' : 'desc';
  }
};

// All events (past + upcoming) for single table, sorted
const allEventsSorted = computed(() => {
  if (!volunteerDays.value?.days || !Array.isArray(volunteerDays.value.days)) return [];
  const list = volunteerDays.value.days.map(normalizeEvent).filter(day => day.startDatetime);
  const field = eventSortField.value;
  const order = eventSortOrder.value === 'asc' ? 1 : -1;
  const now = Date.now();

  if (field === 'default') {
    const upcoming = list.filter(d => new Date(d.startDatetime).getTime() >= now).sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
    const past = list.filter(d => new Date(d.startDatetime).getTime() < now).sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime());
    return [...upcoming, ...past];
  }

  return [...list].sort((a, b) => {
    if (field === 'title') {
      const ta = (a.title || '').toLowerCase();
      const tb = (b.title || '').toLowerCase();
      return order * ta.localeCompare(tb);
    }
    const da = new Date(a.startDatetime).getTime();
    const db = new Date(b.startDatetime).getTime();
    return order * (da - db);
  });
});

// Hero image thumbnail URL for event (event's hero_image or garden fallback); null if none
const getEventHeroThumbnail = (day) => {
  let heroImage = day?.hero_image || day?.attributes?.hero_image;
  if (!heroImage && garden.value?.attributes?.hero_image) {
    heroImage = garden.value.attributes.hero_image;
  }
  if (!heroImage) return null;
  let imageUrl = null;
  if (heroImage?.data?.attributes?.formats?.small?.url) {
    imageUrl = heroImage.data.attributes.formats.small.url;
  } else if (heroImage?.formats?.small?.url) {
    imageUrl = heroImage.formats.small.url;
  } else if (heroImage?.data?.attributes?.formats?.thumbnail?.url) {
    imageUrl = heroImage.data.attributes.formats.thumbnail.url;
  } else if (heroImage?.formats?.thumbnail?.url) {
    imageUrl = heroImage.formats.thumbnail.url;
  } else if (heroImage?.data?.attributes?.url) {
    imageUrl = heroImage.data.attributes.url;
  } else if (heroImage?.url) {
    imageUrl = heroImage.url;
  }
  if (!imageUrl) return null;
  const baseUrl = import.meta.env.VITE_API_URL || '';
  if (baseUrl === 'http://localhost:1337' && !imageUrl.includes('googleapis.com') && imageUrl.startsWith('/')) {
    imageUrl = `${baseUrl}${imageUrl}`;
  }
  return imageUrl;
};

const isPastEvent = (day) => {
  if (!day?.startDatetime) return false;
  return new Date(day.startDatetime) < new Date();
};

const formatEventDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// First 15 characters of recurring event template name (or empty if none)
const getRecurringEventPreview = (day) => {
  const rt = day?.recurring_template;
  if (!rt) return '';
  // API returns recurring_template as flat object with title_template, or Strapi format with data.attributes
  const name = rt.title_template ?? rt.data?.attributes?.title_template ?? rt.attributes?.title_template ?? rt.title ?? '';
  return String(name).slice(0, 15);
};

const openEventEditor = (day) => {
  if (day?.id) router.push(`/manage/events/${day.id}/edit`);
};

</script>

<template>
  <div class="bg-[#344a34] mx-auto min-h-screen">
    <!-- Garden Title Header -->
    <div class="bg-gradient-to-r from-darker-green to-custom-green text-white py-6 px-0 sm:px-6 lg:px-8 shadow-md relative" id="garden-header">
      <div class="max-w-7xl mx-auto px-4 sm:px-0">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h1 v-if="garden.attributes?.title" class="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight pr-12 lg:pr-0">{{ garden.attributes.title }}</h1>
            <div v-else class="h-12 bg-white/20 rounded animate-pulse"></div>
            <p v-if="garden.attributes?.blurb" class="text-white/90 text-lg mt-2">{{ garden.attributes.blurb.length > 150 ? garden.attributes.blurb.substring(0, 150) + '...' : garden.attributes.blurb }}</p>
            <div v-else-if="garden.loading || (!garden.attributes && !garden.error)" class="h-6 bg-white/20 rounded mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="garden.loading || (!garden.attributes && !garden.error)" class="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" :centered="true" />
    </div>

    <!-- Main Content -->
    <div v-else-if="garden.attributes">
      <!-- Main Layout with Sidebar -->
      <div class="flex flex-col lg:flex-row gap-6 px-2 sm:px-4 lg:px-6 p-1 sm:p-5">
        <!-- Sidebar Navigation -->
        <GardenSidebar 
          :active-section="activeSection" 
          @update:active-section="setActiveSection" 
        />

        <!-- Main Content Area -->
        <main class="flex-1 min-w-0" :key="activeSection">
          <!-- General Section -->
          <GardenGeneral 
            v-if="activeSection === 'general'"
            :garden="garden"
            :editor="editor"
            :volunteer-days="volunteerDays"
            :sms-campaigns="smsCampaigns"
          />

        <!-- Task Messages Section -->
        <div v-if="activeSection === 'messages'" class="bg-[#2d3e26] rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif text-[#f5f5f5]">Task Messages</h2>
          </div>

          <LoadingSpinner v-if="messagesLoading" size="sm" :centered="true" />

          <div v-else-if="!groupedMessages || groupedMessages.length === 0" class="text-center py-8">
            <p class="text-[#d0d0d0]">No task messages found</p>
          </div>

          <div v-else class="space-y-4">
            <div v-for="group in groupedMessages" :key="group.taskId" class="bg-[rgba(26,26,26,0.6)] rounded-lg p-4 border border-[#3d4d36]/50">
              <div class="flex items-center gap-2 mb-3">
                <h3 class="text-lg font-semibold text-[#f5f5f5]">{{ group.taskTitle }}</h3>
                <span v-if="group.taskId !== 'no-task'" 
                      :class="[getStatusColor(group.messages[0]?.garden_task?.status), 'px-2 py-1 rounded-full text-xs']">
                  {{ group.messages[0]?.garden_task?.status || 'UNKNOWN' }}
                </span>
                <span class="text-sm text-[#d0d0d0]">
                  ({{ group.messages.length }} message{{ group.messages.length === 1 ? '' : 's' }})
                </span>
              </div>
              <div class="text-sm text-[#d0d0d0] mb-3">
                <div>To: {{ group.user }}</div>
                <div>First message: {{ formatDate(group.messages[group.messages.length - 1]?.createdAt) }}</div>
              </div>
              
              <div class="space-y-3 mt-4">
                <div v-for="message in group.messages" :key="message.id" 
                     class="bg-[rgba(26,26,26,0.8)] rounded p-3 border-l-4" 
                     :class="getMessageBorderColor(message.type)">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm text-[#f5f5f5]">
                        {{ message.user?.username || 'Anonymous' }}
                      </span>
                      <span :class="[getTypeColor(message.type), 'px-2 py-1 rounded-full text-xs']">
                        {{ message.type }}
                      </span>
                    </div>
                    <span class="text-xs text-[#d0d0d0]">{{ formatDate(message.createdAt) }}</span>
                  </div>
                  <p class="text-[#d0d0d0] text-sm">{{ message.body }}</p>
                  <p v-if="message.previous" class="text-[#999] text-xs mt-2 italic">
                    Previous: {{ message.previous }}
                  </p>
                  
                  <!-- Related Event (if exists) -->
                  <div v-if="message.event" class="mt-2 text-xs text-[#d0d0d0]">
                    Related Event: {{ message.event.title }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Volunteers Section -->
        <div v-if="activeSection === 'volunteers'" class="bg-[#2d3e26] rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif text-[#f5f5f5]">Volunteers ({{ garden.attributes.volunteers?.data?.length || 0 }})</h2>
            <a v-if="editor" @click="clearTemp" class="text-sm text-blue-400 hover:text-blue-300 cursor-pointer">Clear Temps</a>
          </div>
          
          <div v-if="garden.attributes.volunteers?.data?.length" class="relative">
            <table class="w-full">
              <thead>
                <tr class="tr-class border-b-2 border-[#3d4d36]/50">
                  <th class="text-left py-3 px-4 text-[#f5f5f5]">
                    <button @click="toggleSortOrder('name')" class="cursor-pointer hover:text-blue-400 flex items-center gap-2">
                      Name {{ sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="text-left py-3 px-4 text-[#f5f5f5]">
                    <button @click="toggleSortOrder('createdAt')" class="cursor-pointer hover:text-blue-400 flex items-center gap-2">
                      Registered {{ sortField === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="text-left py-3 px-4 text-[#f5f5f5]">Interests</th>
                </tr>
              </thead>
              <tbody>
                <Volunteer 
                  v-for="volunteer in sortedVolunteers" 
                  :key="volunteer.id" 
                  v-bind="volunteer.attributes" 
                  :id="volunteer.id" 
                  :interests="garden.attributes.interests" 
                  :garden="garden.id" 
                  :editor="editor"
                />
              </tbody>
            </table>
          </div>
          <div v-else class="text-[#d0d0d0] text-center py-8">
            No volunteers yet.
          </div>
        </div>

        <!-- Projects Section -->
        <div v-if="activeSection === 'projects'" class="bg-[#2d3e26] rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-light font-serif mb-4 text-[#f5f5f5]">Projects</h2>
          <div v-if="editor && garden?.id" class="mb-4">
            <Project 
              :garden="garden.id"
              :garden-slug="garden?.attributes?.slug"
              :editor="editor"
            />
          </div>
          <ProjectsList :garden="garden" :editor="editor" />
        </div>

        <!-- Tasks Section -->
        <div v-if="activeSection === 'tasks'" class="bg-[#2d3e26] rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif text-[#f5f5f5]">Tasks</h2>
            <router-link
              v-if="garden.attributes?.slug"
              :to="`/gardens/${garden.attributes.slug}/tasks`"
              target="_blank"
              rel="noopener noreferrer"
              class="px-4 py-2 bg-[rgba(26,26,26,0.6)] border border-[#3d4d36]/50 text-[#f5f5f5] font-medium text-sm rounded shadow-md hover:bg-[rgba(26,26,26,0.8)] hover:border-[#3d4d36] focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
            >
              View Public Tasks Page
            </router-link>
          </div>
          <GardenTaskList :garden="garden" :editor="editor" />
        </div>

        <!-- Events Section -->
        <div v-if="activeSection === 'events'" id="events" class="bg-[#2d3e26] rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif text-[#f5f5f5]">Events ({{ volunteerDays.days?.length || 0 }})</h2>
            <div class="flex items-center gap-3">
              <router-link
                :to="`/manage/gardens/${garden.attributes?.slug}/event-templates`"
                class="px-4 py-2 bg-[rgba(26,26,26,0.6)] border border-[#3d4d36]/50 text-[#f5f5f5] font-medium text-sm rounded shadow-md hover:bg-[rgba(26,26,26,0.8)] hover:border-[#3d4d36] focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
              >
                Recurring Event Templates
              </router-link>
              <button 
                v-if="editor" 
                type="button" 
                class="px-4 py-2 bg-orange-700 text-white font-medium text-sm rounded shadow-md hover:bg-orange-800 focus:bg-orange-800 focus:outline-none focus:ring-0 transition duration-150 ease-in-out" 
                @click="showDayModal = true"
              >
                Create Volunteer Day
              </button>
            </div>
          </div>

          <VolunteerDayModal v-model:show="showDayModal" :garden="garden.id" :interests="garden.attributes.interests" :editor="editor" />

          <!-- Events table (past + upcoming, sortable) -->
          <div v-if="allEventsSorted.length > 0" class="relative overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b-2 border-[#3d4d36]/50">
                  <th class="w-14 py-3 px-2"></th>
                  <th class="text-left py-3 px-4 text-[#f5f5f5]">
                    <button @click="toggleEventSort('title')" class="cursor-pointer hover:text-blue-400 flex items-center gap-2 font-medium">
                      Title {{ eventSortField === 'title' ? (eventSortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="text-left py-3 px-4 text-[#f5f5f5]">
                    <button @click="toggleEventSort('startDatetime')" class="cursor-pointer hover:text-blue-400 flex items-center gap-2 font-medium">
                      Date {{ eventSortField === 'startDatetime' ? (eventSortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="text-left py-3 px-4 text-[#f5f5f5] font-medium">Recurring</th>
                  <th class="text-left py-3 px-4 text-[#f5f5f5] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="day in allEventsSorted"
                  :key="day.id"
                  :class="[
                    'border-b border-[#3d4d36]/30 cursor-pointer',
                    isPastEvent(day)
                      ? 'bg-[rgba(60,60,60,0.5)] text-[#b0b0b0]'
                      : 'bg-[rgba(26,26,26,0.4)] text-[#f5f5f5] hover:bg-[rgba(26,26,26,0.6)]'
                  ]"
                  @click="openEventEditor(day)"
                >
                  <td class="py-2 px-2 w-14 align-middle">
                    <img
                      v-if="getEventHeroThumbnail(day)"
                      :src="getEventHeroThumbnail(day)"
                      :alt="day.title"
                      class="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                    <span v-else class="inline-block w-12 h-12 rounded bg-[#3d4d36]/30" aria-hidden="true"></span>
                  </td>
                  <td class="py-3 px-4 font-medium">{{ day.title }}</td>
                  <td class="py-3 px-4">{{ formatEventDate(day.startDatetime) }}</td>
                  <td class="py-3 px-4">
                    <span class="recurring-preview">{{ getRecurringEventPreview(day) }}</span>
                  </td>
                  <td class="py-3 px-4" @click.stop>
                    <VolunteerDayModal
                      v-bind="day"
                      :garden="garden.id"
                      :interests="garden.attributes.interests"
                      :editor="editor"
                      :smsLink="true"
                      tableRow
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- No Events Message -->
          <div v-else-if="!volunteerDays.loading" class="text-[#d0d0d0] text-center py-8">
            No events scheduled yet.
          </div>

          <!-- Load More Button -->
          <div v-if="hasMoreEvents && !volunteerDays.loading" class="flex justify-center mt-8 mb-4">
            <button 
              @click="loadMoreEvents"
              :disabled="isLoadingMoreEvents"
              class="px-6 py-3 bg-custom-green text-white font-medium rounded-lg hover:bg-darker-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoadingMoreEvents">Loading...</span>
              <span v-else>Load More Events</span>
            </button>
          </div>

          <LoadingSpinner v-if="volunteerDays.loading" size="sm" />
          <div v-if="volunteerDays.error" class="text-danger">Error loading volunteer days: {{volunteerDays.error}}</div>
        </div>

        <!-- SMS Campaigns Section -->
        <div v-if="activeSection === 'sms'" class="bg-[#2d3e26] rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif text-[#f5f5f5]">SMS Campaigns ({{ smsCampaigns.length || 0 }})</h2>
            <SmsCampaignModal v-if="editor" :garden="garden.id" :interests="garden.attributes.interests" :editor="editor">
              <button class="px-4 py-2 bg-orange-700 text-white font-medium text-sm rounded shadow-md hover:bg-orange-800 focus:bg-orange-800 focus:outline-none focus:ring-0 transition duration-150 ease-in-out">
                Create a new Group SMS
              </button>
            </SmsCampaignModal>
          </div>

          <div v-if="smsCampaigns?.length" class="grid grid-cols-1 gap-4">
            <div v-for="campaign in smsCampaigns.slice(0, 20)" :key="campaign.id">
              <SmsCampaignModal v-bind="campaign" :garden="garden.id" :interests="garden.attributes.interests"/>
            </div>
          </div>
          <div v-else class="text-[#d0d0d0] text-center py-8">
            No SMS campaigns yet.
          </div>

          <LoadingSpinner v-if="smsCampaigns.loading" size="sm" />
          <div v-if="smsCampaigns.error" class="text-danger">Error loading sms campaigns: {{smsCampaigns.error}}</div>
        </div>
      </main>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="garden.error" class="text-danger p-6">Error loading gardens: {{garden.error}}</div>
  </div>
</template>

<script>
export default {
  components: {
    VolunteerDayModal,
    SmsCampaignModal,
    Volunteer,
    GardenTaskList,
    ProjectsList,
    GardenSidebar,
    GardenGeneral,
    LoadingSpinner
  }
};
</script>

<style scoped>
  .tr-class {
    @apply flex flex-col mb-4 sm:table-row
  }
  /* Fade out last ~2 characters of recurring template preview */
  .recurring-preview {
    display: inline-block;
    max-width: 100%;
    -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
    mask-image: linear-gradient(to right, black 85%, transparent 100%);
  }
</style>