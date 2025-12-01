<script setup>
import { onMounted, ref, computed, defineOptions, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore, useGardensStore, useEventStore, useSMSCampaignStore, useUGInterestsStore, useAlertStore, useGardenTaskStore, useMessagesStore } from '@/stores';
import VolunteerDayModal from '@/components/modals/VolunteerDayModal.vue';
import SmsCampaignModal from '@/components/modals/SmsCampaignModal.vue';
import Volunteer from '@/components/VolunteerDetail.vue';
import GardenTaskList from '@/components/GardenTaskList.vue';
import ProjectsList from '@/components/ProjectsList.vue';
import GardenSidebar from '@/components/GardenSidebar.vue';

const authStore = useAuthStore();
const gardensStore = useGardensStore();
const eventStore = useEventStore();
const campaignStore = useSMSCampaignStore();
const interestStore = useUGInterestsStore();
const alertStore = useAlertStore();
const route = useRoute();
const gardenTaskStore = useGardenTaskStore();
const messagesStore = useMessagesStore();

const { user } = storeToRefs(authStore);
const { garden } = storeToRefs(gardensStore);
const { volunteerDays } = storeToRefs(eventStore);
const { smsCampaigns } = storeToRefs(campaignStore);
const { taskMessages, loading: messagesLoading } = storeToRefs(messagesStore);

gardensStore.getSlug(route.params.slug);
eventStore.getByGarden(route.params.slug);
campaignStore.getByGarden(route.params.slug);
defineOptions({ inheritAttrs: false })

// Sidebar navigation state
const activeSection = ref('overview');

// Initialize activeSection from URL hash if present
const initializeFromHash = () => {
  const hash = route.hash.replace('#', '');
  if (hash) {
    const validSections = ['overview', 'events', 'volunteers', 'projects', 'tasks', 'sms', 'messages'];
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
    const validSections = ['overview', 'events', 'volunteers', 'projects', 'tasks', 'sms', 'messages'];
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

// Get latest 3 events, sorted from soonest to happen to longest
const latestEvents = computed(() => {
  if (!volunteerDays.value?.days || !Array.isArray(volunteerDays.value.days)) {
    return [];
  }
  
  // Normalize events (handle both Strapi format and normalized format)
  const normalizedEvents = volunteerDays.value.days.map(event => {
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
</script>

<template>
  <div class="bg-custom-light mx-auto min-h-screen" v-if="garden.attributes">
    <!-- Garden Title Header -->
    <div class="bg-gradient-to-r from-darker-green to-custom-green text-white py-6 px-4 sm:px-6 lg:px-8 shadow-md">
      <div class="max-w-7xl mx-auto">
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">{{ garden.attributes.title }}</h1>
        <p v-if="garden.attributes.blurb" class="text-white/90 text-lg mt-2">{{ garden.attributes.blurb }}</p>
      </div>
    </div>

    <!-- Main Layout with Sidebar -->
    <div class="flex flex-col lg:flex-row gap-6 px-2 sm:px-4 lg:px-6 p-1 sm:p-5">
      <!-- Sidebar Navigation -->
      <GardenSidebar 
        :active-section="activeSection" 
        @update:active-section="setActiveSection" 
      />

      <!-- Main Content Area -->
      <main class="flex-1 min-w-0" :key="activeSection">
        <!-- Overview Section -->
        <div v-if="activeSection === 'overview'" class="bg-white rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif">Overview</h2>
            <router-link 
              :to="`/gardens/${garden.attributes.slug}`"
              target="_blank"
              class="inline-flex items-center px-4 py-2 bg-custom-green text-white font-medium rounded hover:bg-darker-green transition-colors"
            >
              <i class="fas fa-external-link-alt mr-2"></i>
              View Public Garden Page
            </router-link>
          </div>
          <div class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold mb-2">Welcome Text</h3>
              <p class="text-gray-700">{{ garden.attributes.welcome_text || 'No welcome text available.' }}</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div class="text-2xl font-bold text-blue-600">{{ garden.attributes.volunteers?.data?.length || 0 }}</div>
                <div class="text-sm text-gray-600 mt-1">Volunteers</div>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div class="text-2xl font-bold text-purple-600">{{ volunteerDays.days?.length || 0 }}</div>
                <div class="text-sm text-gray-600 mt-1">Events</div>
              </div>
              <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                <div class="text-2xl font-bold text-green-600">{{ smsCampaigns.length || 0 }}</div>
                <div class="text-sm text-gray-600 mt-1">SMS Campaigns</div>
              </div>
            </div>

            <!-- Latest Events Section -->
            <div class="mt-6">
              <h3 class="text-lg font-semibold mb-2">Upcoming Events</h3>
              <div v-if="latestEvents.length === 0" class="text-gray-500 text-sm">
                No upcoming events scheduled.
              </div>
              <div v-else class="space-y-2">
                <div 
                  v-for="event in latestEvents" 
                  :key="event.id || event.startDatetime"
                  class="bg-gray-50 py-2 px-3 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                  :class="{ 'cursor-pointer': event.id }"
                  @click="event.id && $router.push(`/manage/events/${event.id}/edit`)"
                >
                  <div class="flex items-center gap-2">
                    <i class="fas fa-calendar-alt text-gray-500 text-sm"></i>
                    <span class="text-sm font-medium text-gray-900">{{ event.title || 'Untitled Event' }}</span>
                    <span class="text-sm text-gray-600">- {{ formatEventDate(event.startDatetime) }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Task Messages Section -->
        <div v-if="activeSection === 'messages'" class="bg-white rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif">Task Messages</h2>
          </div>

          <div v-if="messagesLoading" class="flex justify-center py-8">
            <div class="spinner-border spinner-border-sm"></div>
          </div>

          <div v-else-if="!groupedMessages || groupedMessages.length === 0" class="text-center py-8">
            <p class="text-gray-500">No task messages found</p>
          </div>

          <div v-else class="space-y-4">
            <div v-for="group in groupedMessages" :key="group.taskId" class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div class="flex items-center gap-2 mb-3">
                <h3 class="text-lg font-semibold">{{ group.taskTitle }}</h3>
                <span v-if="group.taskId !== 'no-task'" 
                      :class="[getStatusColor(group.messages[0]?.garden_task?.status), 'px-2 py-1 rounded-full text-xs']">
                  {{ group.messages[0]?.garden_task?.status || 'UNKNOWN' }}
                </span>
                <span class="text-sm text-gray-500">
                  ({{ group.messages.length }} message{{ group.messages.length === 1 ? '' : 's' }})
                </span>
              </div>
              <div class="text-sm text-gray-600 mb-3">
                <div>To: {{ group.user }}</div>
                <div>First message: {{ formatDate(group.messages[group.messages.length - 1]?.createdAt) }}</div>
              </div>
              
              <div class="space-y-3 mt-4">
                <div v-for="message in group.messages" :key="message.id" 
                     class="bg-white rounded p-3 border-l-4" 
                     :class="getMessageBorderColor(message.type)">
                  <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm">
                        {{ message.user?.username || 'Anonymous' }}
                      </span>
                      <span :class="[getTypeColor(message.type), 'px-2 py-1 rounded-full text-xs']">
                        {{ message.type }}
                      </span>
                    </div>
                    <span class="text-xs text-gray-400">{{ formatDate(message.createdAt) }}</span>
                  </div>
                  <p class="text-gray-700 text-sm">{{ message.body }}</p>
                  <p v-if="message.previous" class="text-gray-400 text-xs mt-2 italic">
                    Previous: {{ message.previous }}
                  </p>
                  
                  <!-- Related Event (if exists) -->
                  <div v-if="message.event" class="mt-2 text-xs text-gray-500">
                    Related Event: {{ message.event.title }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Volunteers Section -->
        <div v-if="activeSection === 'volunteers'" class="bg-white rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif">Volunteers ({{ garden.attributes.volunteers?.data?.length || 0 }})</h2>
            <a v-if="editor" @click="clearTemp" class="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">Clear Temps</a>
          </div>
          
          <div v-if="garden.attributes.volunteers?.data?.length" class="relative">
            <table class="w-full">
              <thead>
                <tr class="tr-class border-b-2 border-gray-200">
                  <th class="text-left py-3 px-4">
                    <button @click="toggleSortOrder('name')" class="cursor-pointer hover:text-blue-600 flex items-center gap-2">
                      Name {{ sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="text-left py-3 px-4">
                    <button @click="toggleSortOrder('createdAt')" class="cursor-pointer hover:text-blue-600 flex items-center gap-2">
                      Registered {{ sortField === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="text-left py-3 px-4">Interests</th>
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
          <div v-else class="text-gray-500 text-center py-8">
            No volunteers yet.
          </div>
        </div>

        <!-- Projects Section -->
        <div v-if="activeSection === 'projects'" class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-light font-serif mb-4">Projects</h2>
          <ProjectsList :garden="garden" :editor="editor" />
        </div>

        <!-- Tasks Section -->
        <div v-if="activeSection === 'tasks'" class="bg-white rounded-lg shadow-md p-6">
          <GardenTaskList :garden="garden" :editor="editor" />
        </div>

        <!-- Events Section -->
        <div v-if="activeSection === 'events'" class="bg-white rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif">Events ({{ volunteerDays.days?.length || 0 }})</h2>
            <button 
              v-if="editor" 
              type="button" 
              class="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded shadow-md hover:bg-blue-700 focus:bg-blue-700 focus:outline-none focus:ring-0 transition duration-150 ease-in-out" 
              @click="showDayModal = true"
            >
              Create Volunteer Day
            </button>
          </div>

          <VolunteerDayModal v-model:show="showDayModal" :garden="garden.id" :interests="garden.attributes.interests" :editor="editor" />

          <div v-if="volunteerDays.days?.length" class="grid grid-cols-1 gap-4">
            <div v-for="day in volunteerDays.days" :key="day.id">
              <VolunteerDayModal v-bind="day" :garden="garden.id" :interests="garden.attributes.interests" :editor="editor" :key="garden.id"/>
            </div>
          </div>
          <div v-else class="text-gray-500 text-center py-8">
            No events scheduled yet.
          </div>

          <div v-if="volunteerDays.loading" class="spinner-border spinner-border-sm"></div>
          <div v-if="volunteerDays.error" class="text-danger">Error loading volunteer days: {{volunteerDays.error}}</div>
        </div>

        <!-- SMS Campaigns Section -->
        <div v-if="activeSection === 'sms'" class="bg-white rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-light font-serif">SMS Campaigns ({{ smsCampaigns.length || 0 }})</h2>
            <SmsCampaignModal v-if="editor" :garden="garden.id" :interests="garden.attributes.interests" :editor="editor">
              <button class="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded shadow-md hover:bg-blue-700 focus:bg-blue-700 focus:outline-none focus:ring-0 transition duration-150 ease-in-out">
                Create a new Group SMS
              </button>
            </SmsCampaignModal>
          </div>

          <div v-if="smsCampaigns?.length" class="grid grid-cols-1 gap-4">
            <div v-for="campaign in smsCampaigns.slice(0, 20)" :key="campaign.id">
              <SmsCampaignModal v-bind="campaign" :garden="garden.id" :interests="garden.attributes.interests"/>
            </div>
          </div>
          <div v-else class="text-gray-500 text-center py-8">
            No SMS campaigns yet.
          </div>

          <div v-if="smsCampaigns.loading" class="spinner-border spinner-border-sm"></div>
          <div v-if="smsCampaigns.error" class="text-danger">Error loading sms campaigns: {{smsCampaigns.error}}</div>
        </div>
      </main>
    </div>

    <!-- Loading and Error States -->
    <div v-if="garden.loading" class="spinner-border spinner-border-sm"></div>
    <div v-if="garden.error" class="text-danger">Error loading gardens: {{garden.error}}</div>
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
    GardenSidebar
  }
};
</script>

<style scoped>
  .tr-class {
    @apply flex flex-col mb-4 sm:table-row
  }
</style>