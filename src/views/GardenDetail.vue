<script setup>
import { onMounted, ref, computed, defineOptions, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore, useGardensStore, useEventStore, useSMSCampaignStore, useUGInterestsStore, useAlertStore, useGardenTaskStore, useMessagesStore, useLocationTrackingStore } from '@/stores';
import VolunteerDayModal from '@/components/modals/VolunteerDayModal.vue';
import SmsCampaignModal from '@/components/modals/SmsCampaignModal.vue';
import Volunteer from '@/components/VolunteerDetail.vue';
import GardenTaskList from '@/components/GardenTaskList.vue';
import ProjectsList from '@/components/ProjectsList.vue';
import Project from '@/components/modals/Project.vue';
import GardenSidebar from '@/components/GardenSidebar.vue';
import GardenGeneral from '@/components/GardenGeneral.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import PlantsCatalog from '@/components/PlantsCatalog.vue';
import GardenVolunteerInterestsSection from '@/components/GardenVolunteerInterestsSection.vue';

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
const { recurringTasks, gardenTasks } = storeToRefs(gardenTaskStore);
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
    const validSections = ['general', 'events', 'volunteers', 'projects', 'tasks', 'plants', 'sms', 'messages'];
    if (validSections.includes(hash)) {
      activeSection.value = hash;
    }
  }
};

// Set active section and update URL hash
const setActiveSection = (section) => {
  activeSection.value = section;
  // Keep Vue Router's reactive hash in sync with section changes.
  router.replace({ path: route.path, hash: `#${section}` });
};

// Watch for hash changes in the URL
watch(() => route.hash, (newHash) => {
  const hash = newHash.replace('#', '');
  if (hash) {
    const validSections = ['general', 'events', 'volunteers', 'projects', 'tasks', 'plants', 'sms', 'messages'];
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
    gardenTaskStore.getGardenTasks(newGarden.id);
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

const deduplicateMessages = (messages) => {
  const seen = new Map();
  messages.forEach((msg) => {
    const key = `${msg.type}::${msg.body}`;
    const at = msg.createdAt || msg.attributes?.createdAt;
    if (seen.has(key)) {
      const entry = seen.get(key);
      entry.count++;
      if (at) entry.times.push(at);
    } else {
      seen.set(key, { message: msg, count: 1, times: at ? [at] : [] });
    }
  });
  return Array.from(seen.values()).map((entry) => ({
    message: entry.message,
    count: entry.count,
    times: [...entry.times].filter(Boolean).sort((a, b) => new Date(a) - new Date(b))
  }));
};

// Group messages by task (similar to TaskMessages.vue)
const groupedMessages = computed(() => {
  if (!taskMessages.value || !Array.isArray(taskMessages.value)) return [];

  const groups = new Map();
  taskMessages.value.forEach(message => {
    const taskId = message.garden_task?.id || 'no-task';

    if (!groups.has(taskId)) {
      const volunteers = message.garden_task?.volunteers;
      const resolvedUser = volunteers?.[0]?.username || 'Anonymous volunteer';
      console.log(`[GardenDetail] Task ${taskId} ("${message.garden_task?.title}") — volunteers raw:`, volunteers, '→ resolved name:', resolvedUser);
      groups.set(taskId, {
        taskId,
        taskTitle: message.garden_task?.title || 'Messages without task',
        user: resolvedUser,
        messages: []
      });
    }
    groups.get(taskId).messages.push(message);
  });

  const sortedGroups = Array.from(groups.values())
    .sort((a, b) => {
      if (a.taskId === 'no-task') return 1;
      if (b.taskId === 'no-task') return -1;
      return parseInt(b.taskId) - parseInt(a.taskId);
    })
    .map(group => ({
      ...group,
      deduplicatedMessages: deduplicateMessages(group.messages)
    }));

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

/** e.g. 8:18am — for stacked send times */
const formatTimeShort = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m.toString().padStart(2, '0');
  return `${h}:${mm}${ampm}`;
};

const formatTimesComma = (times) => {
  if (!times?.length) return '';
  return times.map(formatTimeShort).join(', ');
};

// Get type color helper (dark mode: opaque fills so chips stay readable on orange-brown message tiles)
const getTypeColor = (type) => {
  const colors = {
    question: 'bg-blue-100 text-blue-800 dark:bg-[#1e3a5f] dark:text-[#bfdbfe]',
    followup: 'bg-purple-100 text-purple-800 dark:bg-[#4c1d95] dark:text-[#f5f3ff]',
    reply: 'bg-green-100 text-green-800 dark:bg-[#14532d] dark:text-[#dcfce7]',
    notification: 'bg-yellow-100 text-yellow-800 dark:bg-[#713f12] dark:text-[#fef9c3]',
    complete: 'bg-teal-100 text-teal-800 dark:bg-[#134e4a] dark:text-[#ccfbf1]',
    registration: 'bg-indigo-100 text-indigo-800 dark:bg-[#312e81] dark:text-[#e0e7ff]',
    error: 'bg-red-100 text-red-800 dark:bg-[#7f1d1d] dark:text-[#fecaca]'
  };
  return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-[#1e293b] dark:text-[#e2e8f0]';
};

// Left accent on light message cards — muted greens (readable on pea-green tiles)
const getMessageBorderColor = (type) => {
  const colors = {
    question: 'border-l-[#6d8f78]',
    followup: 'border-l-[#7a8f6d]',
    reply: 'border-l-[#5d8a6a]',
    notification: 'border-l-[#8f9a6d]',
    complete: 'border-l-[#5d8f82]',
    registration: 'border-l-[#6d7d8f]',
    error: 'border-l-[#9a6d6d]'
  };
  return colors[type] || 'border-l-[#7a9b68]';
};

// Get status color helper (dark mode: opaque navy / purple / etc. — no translucent fills that read “light on light”)
const getStatusColor = (status) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-[#5c4a08] dark:text-[#fef9c3]',
    INTERESTED: 'bg-blue-100 text-blue-800 dark:bg-[#1e3a5f] dark:text-[#bfdbfe]',
    STARTED: 'bg-indigo-100 text-indigo-800 dark:bg-[#312e81] dark:text-[#e0e7ff]',
    FINISHED: 'bg-green-100 text-green-800 dark:bg-[#1e3a8a] dark:text-[#eff6ff]',
    ABANDONED: 'bg-red-100 text-red-800 dark:bg-[#7f1d1d] dark:text-[#fecaca]',
    ISSUE: 'bg-orange-100 text-orange-800 dark:bg-[#9a3412] dark:text-[#ffedd5]',
    SKIPPED: 'bg-gray-100 text-gray-800 dark:bg-[#4c1d95] dark:text-[#f5f3ff]',
    RESOLVED: 'bg-teal-100 text-teal-800 dark:bg-[#134e4a] dark:text-[#ccfbf1]'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-[#1e293b] dark:text-[#e2e8f0]';
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
  <div class="gm-page min-h-screen w-full max-w-none overflow-x-hidden md:-mx-4 md:w-[calc(100%+2rem)]">
    <!-- Garden Title Header -->
    <div class="bg-gradient-to-r from-darker-green to-custom-green text-white py-6 px-0 sm:px-6 lg:px-8 shadow-md relative" id="garden-header">
      <div class="max-w-7xl mx-auto px-4 sm:px-0">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h1
              v-if="garden.attributes?.title"
              class="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight pr-12 lg:pr-0 cursor-pointer hover:opacity-90 transition-opacity"
              role="button"
              tabindex="0"
              @click="setActiveSection('general')"
              @keydown.enter="setActiveSection('general')"
              @keydown.space.prevent="setActiveSection('general')"
            >{{ garden.attributes.title }}</h1>
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
      <div class="flex w-full flex-col gap-6 py-1 pl-1 pr-4 sm:py-5 sm:pr-5 lg:flex-row lg:pr-8">
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
            :recurring-tasks="recurringTasks"
            :garden-tasks="gardenTasks"
          />

        <!-- Task Messages Section -->
        <div v-if="activeSection === 'messages'" id="messages" class="gm-panel rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="gm-heading text-2xl font-light font-serif">Task Messages</h2>
          </div>

          <LoadingSpinner v-if="messagesLoading" size="sm" :centered="true" />

          <div v-else-if="!groupedMessages || groupedMessages.length === 0" class="text-center py-8">
            <p class="gm-text-muted">No task messages found</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="group in groupedMessages"
              :key="group.taskId"
              class="gm-msg-group rounded-lg p-4 border border-[#8aa37c]/50 bg-[#d2e4c8] shadow-sm dark:bg-[#1a2218] dark:border-[#3d4d36]/80 dark:shadow-black/25"
            >
              <div class="flex items-center gap-2 mb-3">
                <h3 class="text-lg font-semibold text-[#1a2617] dark:text-[#f5f5f5]">{{ group.taskTitle }}</h3>
                <span v-if="group.taskId !== 'no-task'" 
                      :class="[getStatusColor(group.messages[0]?.garden_task?.status), 'px-2 py-1 rounded-full text-xs border border-black/10 dark:border-white/10']">
                  {{ group.messages[0]?.garden_task?.status || 'UNKNOWN' }}
                </span>
                <span class="text-sm text-[#3d4d36] dark:text-[#c5d4b8]">
                  ({{ group.messages.length }} message{{ group.messages.length === 1 ? '' : 's' }})
                </span>
              </div>
              <div class="text-sm text-[#3d4d36] dark:text-[#b8c9b0] mb-3">
                <div>To: {{ group.user }}</div>
                <div>First message: {{ formatDate(group.messages[group.messages.length - 1]?.createdAt) }}</div>
              </div>
              
              <div class="space-y-3 mt-4">
                <div v-for="{ message, count, times } in group.deduplicatedMessages" :key="message.id"
                     class="gm-msg-item rounded-lg p-3 border border-[#a8c49a]/80 bg-[#e8f2e0] shadow-sm border-l-4 hover:bg-[#dff0d4] transition-colors dark:bg-[#3a2215] dark:border-[#c2410c]/35 dark:hover:bg-[#4a2c1a] dark:shadow-black/25"
                     :class="getMessageBorderColor(message.type)">
                  <div class="flex justify-between items-start mb-2 gap-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-semibold text-sm text-[#1a2617] dark:text-[#f5f5f5]">
                        {{ message.user?.username || 'Anonymous volunteer' }}
                      </span>
                      <span :class="[getTypeColor(message.type), 'px-2 py-1 rounded-full text-xs font-medium border border-black/10 dark:border-white/10']">
                        {{ message.type }}
                      </span>
                      <span
                        v-if="count > 1"
                        class="inline-flex items-center justify-center min-w-[2rem] h-8 px-1.5 rounded-full bg-[#C2410C] text-white text-sm font-bold shadow-md ring-2 ring-white/25 dark:ring-white/20"
                        :title="`Sent ${count} times`"
                      >
                        {{ count }}
                      </span>
                    </div>
                    <div class="text-right shrink-0 max-w-[58%] sm:max-w-[50%]">
                      <div class="text-xs text-[#3d4d36] dark:text-[#b8c9b0]">
                        {{ formatDate(message.createdAt || message.attributes?.createdAt) }}
                      </div>
                      <div
                        v-if="count > 1 && times?.length"
                        class="text-xs text-[#3d4d36] dark:text-[#b8c9b0] mt-1 leading-snug"
                      >
                        {{ formatTimesComma(times) }}
                      </div>
                    </div>
                  </div>
                  <p class="text-[#2d3e26] dark:text-[#e8eee4] text-sm">{{ message.body }}</p>
                  <p v-if="message.previous" class="text-[#3d4d36] dark:text-[#b8c9b0] text-xs mt-2 italic">
                    Response to use message: {{ message.previous }}
                  </p>

                  <!-- Related Event (if exists) -->
                  <div v-if="message.event" class="mt-2 text-xs text-[#2d3e26] dark:text-[#d0dccd]">
                    Related Event: {{ message.event.title }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Volunteers Section -->
        <div v-if="activeSection === 'volunteers'" class="gm-panel rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="gm-heading text-2xl font-light font-serif">Volunteers ({{ garden.attributes.volunteers?.data?.length || 0 }})</h2>
            <a v-if="editor" @click="clearTemp" class="text-sm text-blue-400 hover:text-blue-300 cursor-pointer">Clear Temps</a>
          </div>

          <GardenVolunteerInterestsSection
            v-if="garden?.id"
            :garden-id="garden.id"
            :current-interests="garden.attributes.interests || []"
            :editor="editor"
            :active="activeSection === 'volunteers'"
          />
          
          <div v-if="garden.attributes.volunteers?.data?.length" class="relative">
            <table class="w-full">
              <thead>
                <tr class="tr-class gm-border-b-strong border-b-2">
                  <th class="text-left py-3 px-4 gm-text">
                    <button @click="toggleSortOrder('name')" class="cursor-pointer hover:text-blue-400 flex items-center gap-2">
                      Name {{ sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="text-left py-3 px-4 gm-text">
                    <button @click="toggleSortOrder('createdAt')" class="cursor-pointer hover:text-blue-400 flex items-center gap-2">
                      Registered {{ sortField === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="text-left py-3 px-4 gm-text">Interests</th>
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
                  :managerIds="garden.attributes.managers?.data?.map(m => m.id) || []"
                />
              </tbody>
            </table>
          </div>
          <div v-else class="gm-text-muted text-center py-8">
            No volunteers yet.
          </div>
        </div>

        <!-- Projects Section -->
        <div v-if="activeSection === 'projects'" class="gm-panel rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-light font-serif mb-4 gm-text">Projects</h2>
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
        <div v-if="activeSection === 'tasks'" class="gm-panel rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="gm-heading text-2xl font-light font-serif">Tasks</h2>
            <router-link
              v-if="garden.attributes?.slug"
              :to="`/gardens/${garden.attributes.slug}/tasks`"
              target="_blank"
              rel="noopener noreferrer"
              class="gm-secondary-btn px-4 py-2 font-medium text-sm rounded shadow-md focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
            >
              View Public Tasks Page
            </router-link>
          </div>
          <GardenTaskList :garden="garden" :editor="editor" />
        </div>

        <!-- Plants Section -->
        <PlantsCatalog v-if="activeSection === 'plants'" :garden="garden" />

        <!-- Events Section -->
        <div v-if="activeSection === 'events'" id="events" class="gm-panel rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="gm-heading text-2xl font-light font-serif">Events ({{ volunteerDays.days?.length || 0 }})</h2>
            <div class="flex items-center gap-3">
              <router-link
                :to="`/manage/gardens/${garden.attributes?.slug}/event-templates`"
                class="gm-secondary-btn px-4 py-2 font-medium text-sm rounded shadow-md focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
              >
                Recurring Event Templates
              </router-link>
              <button
                v-if="editor"
                type="button"
                class="gm-primary-btn px-4 py-2 font-medium text-sm rounded shadow-md focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
                @click="showDayModal = true"
              >
                Create Volunteer Day
              </button>
            </div>
          </div>

          <VolunteerDayModal v-model:show="showDayModal" :garden="garden.id" :interests="garden.attributes.interests" :editor="editor" />

          <!-- Events table (past + upcoming, sortable) -->
          <div v-if="allEventsSorted.length > 0" class="relative sm:overflow-x-auto">
            <table class="w-full">
              <thead class="hidden sm:table-header-group">
                <tr class="gm-border-b-strong border-b-2">
                  <th class="w-14 py-3 px-2"></th>
                  <th class="text-left py-3 px-4 gm-text">
                    <button @click="toggleEventSort('title')" class="cursor-pointer hover:text-blue-400 flex items-center gap-2 font-medium">
                      Title {{ eventSortField === 'title' ? (eventSortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="text-left py-3 px-4 gm-text">
                    <button @click="toggleEventSort('startDatetime')" class="cursor-pointer hover:text-blue-400 flex items-center gap-2 font-medium">
                      Date {{ eventSortField === 'startDatetime' ? (eventSortOrder === 'asc' ? '▲' : '▼') : '' }}
                    </button>
                  </th>
                  <th class="hidden md:table-cell text-left py-3 px-4 gm-text font-medium">Recurring</th>
                  <th class="text-left py-3 px-4 gm-text font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="day in allEventsSorted"
                  :key="day.id"
                  :class="[
                    'gm-event-row block sm:table-row border-b cursor-pointer p-3 sm:p-0',
                    isPastEvent(day) ? 'gm-event-row-past' : 'gm-event-row-upcoming'
                  ]"
                  @click="openEventEditor(day)"
                >
                  <!-- Thumbnail (desktop only — mobile shows it inline beside title) -->
                  <td class="hidden sm:table-cell py-2 px-2 w-14 align-middle">
                    <img
                      v-if="getEventHeroThumbnail(day)"
                      :src="getEventHeroThumbnail(day)"
                      :alt="day.title"
                      class="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                    <span v-else class="gm-thumb-placeholder inline-block w-12 h-12 rounded" aria-hidden="true"></span>
                  </td>

                  <!-- Title (with inline mobile thumbnail) -->
                  <td class="block sm:table-cell sm:py-3 sm:px-4 font-medium">
                    <div class="flex items-center gap-3 sm:block">
                      <img
                        v-if="getEventHeroThumbnail(day)"
                        :src="getEventHeroThumbnail(day)"
                        :alt="day.title"
                        class="sm:hidden w-12 h-12 object-cover rounded flex-shrink-0"
                      />
                      <span class="font-semibold text-lg leading-snug sm:text-base sm:font-medium">{{ day.title }}</span>
                    </div>
                  </td>

                  <!-- Date -->
                  <td class="block sm:table-cell mt-1 sm:mt-0 sm:py-3 sm:px-4 text-lg sm:text-base gm-text-muted sm:gm-text">
                    {{ formatEventDate(day.startDatetime) }}
                  </td>

                  <!-- Recurring (hidden on mobile + tablet) -->
                  <td class="hidden md:table-cell py-3 px-4">
                    <span class="recurring-preview">{{ getRecurringEventPreview(day) }}</span>
                  </td>

                  <!-- Actions -->
                  <td class="block sm:table-cell mt-2 sm:mt-0 sm:py-3 sm:px-4" @click.stop>
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
          <div v-else-if="!volunteerDays.loading" class="gm-text-muted text-center py-8">
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
        <div v-if="activeSection === 'sms'" class="gm-panel rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="gm-heading text-2xl font-light font-serif">SMS Campaigns ({{ smsCampaigns.length || 0 }})</h2>
            <SmsCampaignModal
              v-if="editor"
              :garden="garden.id"
              :interests="garden.attributes.interests"
              :editor="editor"
            />
          </div>

          <div v-if="smsCampaigns?.length" class="grid grid-cols-1 gap-4">
            <div v-for="campaign in smsCampaigns.slice(0, 20)" :key="campaign.id">
              <SmsCampaignModal v-bind="campaign" :garden="garden.id" :interests="garden.attributes.interests"/>
            </div>
          </div>
          <div v-else class="gm-text-muted text-center py-8">
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
    LoadingSpinner,
    GardenVolunteerInterestsSection
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

  /* ── Light mode (default, homepage palette) ──────── */
  .gm-page {
    background-color: #f7f1e3;
    color: #344a34;
  }

  .gm-panel {
    background-color: #ffffff;
    color: #344a34;
    border: 1px solid #e2dccb;
  }

  .gm-heading {
    color: #376451;
  }

  .gm-text {
    color: #344a34;
  }

  .gm-text-muted {
    color: #6b7280;
  }

  .gm-border-b-strong {
    border-bottom-color: #e2dccb;
  }

  .gm-secondary-btn {
    background-color: #ffffff;
    color: #376451;
    border: 1px solid #c7d4bf;
  }
  .gm-secondary-btn:hover {
    background-color: #f3ece0;
    border-color: #8aa37c;
  }

  .gm-primary-btn {
    background-color: #8aa37c;
    color: #ffffff;
    border: 1px solid #8aa37c;
  }
  .gm-primary-btn:hover,
  .gm-primary-btn:focus {
    background-color: #6c8a6a;
    border-color: #6c8a6a;
  }
  .gm-primary-btn:active {
    background-color: #376451;
    border-color: #376451;
  }

  .gm-event-row {
    border-color: #e2dccb;
  }
  .gm-event-row-upcoming {
    background-color: #ffffff;
    color: #344a34;
  }
  .gm-event-row-upcoming:hover {
    background-color: #f3ece0;
  }
  .gm-event-row-past {
    background-color: #f7f1e3;
    color: #6b7280;
  }
  .gm-event-row-past:hover {
    background-color: #ece6d4;
  }

  .gm-thumb-placeholder {
    background-color: rgba(138, 163, 124, 0.2);
  }

  /* ── Dark mode overrides ─────────────────────────── */
  :global(.dark) .gm-page {
    background-color: #344a34;
    color: #f5f5f5;
  }

  :global(.dark) .gm-panel {
    background-color: #2d3e26;
    color: #f5f5f5;
    border-color: #3d4d36;
  }

  :global(.dark) .gm-heading,
  :global(.dark) .gm-text {
    color: #f5f5f5;
  }

  :global(.dark) .gm-text-muted {
    color: #d0d0d0;
  }

  :global(.dark) .gm-border-b-strong {
    border-bottom-color: rgba(61, 77, 54, 0.5);
  }

  :global(.dark) .gm-secondary-btn {
    background-color: rgba(26, 26, 26, 0.6);
    color: #f5f5f5;
    border-color: rgba(61, 77, 54, 0.5);
  }
  :global(.dark) .gm-secondary-btn:hover {
    background-color: rgba(26, 26, 26, 0.8);
    border-color: #3d4d36;
  }

  :global(.dark) .gm-primary-btn {
    background-color: #c2410c;
    border-color: #c2410c;
  }
  :global(.dark) .gm-primary-btn:hover,
  :global(.dark) .gm-primary-btn:focus {
    background-color: #9a3209;
    border-color: #9a3209;
  }
  :global(.dark) .gm-primary-btn:active {
    background-color: #7a2807;
    border-color: #7a2807;
  }

  :global(.dark) .gm-event-row {
    border-color: rgba(61, 77, 54, 0.3);
  }
  :global(.dark) .gm-event-row-upcoming {
    background-color: rgba(26, 26, 26, 0.4);
    color: #f5f5f5;
  }
  :global(.dark) .gm-event-row-upcoming:hover {
    background-color: rgba(26, 26, 26, 0.6);
  }
  :global(.dark) .gm-event-row-past {
    background-color: rgba(60, 60, 60, 0.5);
    color: #b0b0b0;
  }
  :global(.dark) .gm-event-row-past:hover {
    background-color: rgba(60, 60, 60, 0.65);
  }

  :global(.dark) .gm-thumb-placeholder {
    background-color: rgba(61, 77, 54, 0.3);
  }
</style>

<!--
  Light-mode overrides for child components that hardcode dark hex colors
  via Tailwind arbitrary classes (e.g. bg-[#2d3e26], text-[#f5f5f5]).
  Refactoring all of GardenTaskList / GardenGeneral / GardenSidebar /
  ProjectsList / PlantsCatalog / VolunteerDetail / GardenVolunteerInterestsSection
  to be theme-aware would be a much larger change; instead we re-paint those
  specific Tailwind arbitrary utilities to homepage-palette equivalents
  whenever this view is rendered AND the document is NOT in .dark mode.
-->
<style>
/* Enforce dark-mode panel palette in manage-garden sections (mobile + desktop). */
html.dark .gm-page .gm-panel {
  background-color: #2d3e26 !important;
  color: #f5f5f5 !important;
  border-color: #3d4d36 !important;
}
html.dark .gm-page .gm-heading,
html.dark .gm-page .gm-text {
  color: #f5f5f5 !important;
}
html.dark .gm-page .gm-text-muted {
  color: #d0d0d0 !important;
}
html.dark .gm-page .gm-secondary-btn {
  background-color: rgba(26, 26, 26, 0.6) !important;
  color: #f5f5f5 !important;
  border-color: rgba(61, 77, 54, 0.5) !important;
}
html.dark .gm-page .gm-secondary-btn:hover {
  background-color: rgba(26, 26, 26, 0.8) !important;
  border-color: #3d4d36 !important;
}

/* Events table rows: scoped :global(.dark) rules can lose to light row styles — force dark surfaces + text */
html.dark .gm-page .gm-event-row {
  border-color: rgba(61, 77, 54, 0.4) !important;
}
html.dark .gm-page .gm-event-row-upcoming {
  background-color: rgba(26, 26, 26, 0.5) !important;
  color: #f5f5f5 !important;
}
html.dark .gm-page .gm-event-row-upcoming:hover {
  background-color: rgba(26, 26, 26, 0.72) !important;
}
html.dark .gm-page .gm-event-row-past {
  background-color: rgba(40, 48, 38, 0.65) !important;
  color: #c5d0bf !important;
}
html.dark .gm-page .gm-event-row-past:hover {
  background-color: rgba(40, 48, 38, 0.82) !important;
}
html.dark .gm-page .gm-event-row .gm-text-muted {
  color: #d0d0d0 !important;
}
html.dark .gm-page .gm-event-row .recurring-preview {
  color: #b8c4b0 !important;
  -webkit-mask-image: linear-gradient(to right, black 82%, transparent 100%);
  mask-image: linear-gradient(to right, black 82%, transparent 100%);
}

html:not(.dark) .gm-page .bg-\[\#2d3e26\] {
  background-color: #ffffff !important;
  color: #344a34 !important;
}
html:not(.dark) .gm-page .bg-\[\#344a34\] {
  background-color: #f7f1e3 !important;
  color: #344a34 !important;
}
html:not(.dark) .gm-page .bg-\[\#1a1a1a\] {
  background-color: #ffffff !important;
}

html:not(.dark) .gm-page .text-\[\#f5f5f5\] {
  color: #344a34 !important;
}
html:not(.dark) .gm-page .text-\[\#d0d0d0\] {
  color: #6b7280 !important;
}
html:not(.dark) .gm-page .text-\[\#8aa37c\] {
  color: #6c8a6a !important;
}

html:not(.dark) .gm-page .border-\[\#3d4d36\],
html:not(.dark) .gm-page [class*="border-[#3d4d36]"] {
  border-color: #e2dccb !important;
}

/* Translucent dark backgrounds → soft sage tints */
html:not(.dark) .gm-page [class*="bg-[rgba(26,26,26"] {
  background-color: rgba(138, 163, 124, 0.08) !important;
}
html:not(.dark) .gm-page [class*="bg-[rgba(26,26,26,0.6)]"]:hover,
html:not(.dark) .gm-page [class*="hover:bg-[rgba(26,26,26,0.8)]"]:hover {
  background-color: rgba(138, 163, 124, 0.18) !important;
}

/* Inputs / form controls that hardcode dark backgrounds */
html:not(.dark) .gm-page input[class*="bg-[rgba(26,26,26"],
html:not(.dark) .gm-page select[class*="bg-[rgba(26,26,26"],
html:not(.dark) .gm-page textarea[class*="bg-[rgba(26,26,26"] {
  background-color: #ffffff !important;
  color: #344a34 !important;
  border-color: #d6cfb8 !important;
}
html:not(.dark) .gm-page input[class*="bg-[rgba(26,26,26"]::placeholder,
html:not(.dark) .gm-page textarea[class*="bg-[rgba(26,26,26"]::placeholder {
  color: #9ca3af !important;
}
</style>