<script setup>
import { onMounted, ref, computed, defineOptions, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore, useGardensStore, useEventStore, useSMSCampaignStore, useUGInterestsStore, useAlertStore, useGardenTaskStore } from '@/stores';
import VolunteerDayModal from '@/components/modals/VolunteerDayModal.vue';
import SmsCampaignModal from '@/components/modals/SmsCampaignModal.vue';
import Volunteer from '@/components/VolunteerDetail.vue';
import ScheduleDays from '@/components/ScheduleDays.vue';
import GardenTaskList from '@/components/GardenTaskList.vue';

const authStore = useAuthStore();
const gardensStore = useGardensStore();
const eventStore = useEventStore();
const campaignStore = useSMSCampaignStore();
const interestStore = useUGInterestsStore();
const alertStore = useAlertStore();
const route = useRoute();
const gardenTaskStore = useGardenTaskStore();

const { user } = storeToRefs(authStore);
const { garden } = storeToRefs(gardensStore);
const { volunteerDays } = storeToRefs(eventStore);
const { smsCampaigns } = storeToRefs(campaignStore);

gardensStore.getSlug(route.params.slug);
eventStore.getByGarden(route.params.slug);
campaignStore.getByGarden(route.params.slug);
defineOptions({ inheritAttrs: false })

// Sidebar navigation state
const activeSection = ref('overview');

// Navigation items
const navItems = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'volunteers', label: 'Volunteers', icon: '👥' },
  { id: 'projects', label: 'Projects', icon: '🌱' },
  { id: 'schedule', label: 'Weekly Schedule', icon: '📆' },
  { id: 'events', label: 'Events', icon: '📅' },
  { id: 'sms', label: 'SMS Campaigns', icon: '💬' },
  { id: 'messages', label: 'Task Messages', icon: '📨' },
];

const setActiveSection = (section) => {
  activeSection.value = section;
};

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

onMounted(() => {
  editor.value = garden.value.loading !== true && garden.value.attributes.managers.data.some(manager => manager.id === user?.value?.id);
  console.log('editor mounted, ', editor.value);
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
</script>

<template>
  <div class="bg-custom-light rounded-lg mx-auto p-1 sm:p-5 min-h-screen" v-if="garden.attributes">
    <!-- Header -->
    <div class="mb-6 text-center">
      <h1 class="font-medium leading-tight text-4xl mt-0 mb-2 text-white-600">{{ garden.attributes.title }}</h1>
    </div>

    <!-- Main Layout with Sidebar -->
    <div class="flex flex-col lg:flex-row gap-6 px-2 sm:px-4 lg:px-6">
      <!-- Sidebar Navigation -->
      <aside class="w-full lg:w-64 flex-shrink-0">
        <nav class="bg-white rounded-lg shadow-md p-2 sticky top-4">
          <ul class="sidebar-nav">
            <li v-for="item in navItems" :key="item.id" class="sidebar-nav-item">
              <button
                @click="setActiveSection(item.id)"
                :class="[
                  'sidebar-nav-link',
                  activeSection === item.id ? 'active' : ''
                ]"
              >
                <span class="sidebar-nav-icon">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 min-w-0">
        <!-- Overview Section -->
        <div v-if="activeSection === 'overview'" class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-bold mb-4">Overview</h2>
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

          </div>
        </div>

        <!-- Weekly Schedule Section -->
        <div v-if="activeSection === 'schedule'" class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-bold mb-4">Weekly Schedule</h2>
          <ScheduleDays :garden="garden" :volunteers="garden.attributes.volunteers.data" :editor="editor"/>
        </div>

        <!-- Task Messages Section -->
        <div v-if="activeSection === 'messages'" class="bg-white rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Task Messages</h2>
          </div>
          <div class="text-center py-8">
            <router-link 
              :to="`/admin/gardens/${garden.id}/messages`" 
              class="text-blue-600 hover:text-blue-800 font-medium text-lg"
            >
              View Task Messages
            </router-link>
          </div>
        </div>

        <!-- Volunteers Section -->
        <div v-if="activeSection === 'volunteers'" class="bg-white rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Volunteers ({{ garden.attributes.volunteers?.data?.length || 0 }})</h2>
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
          <h2 class="text-2xl font-bold mb-4">Garden Tasks</h2>
          <GardenTaskList :garden="garden" :editor="editor" />
        </div>

        <!-- Events Section -->
        <div v-if="activeSection === 'events'" class="bg-white rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Events ({{ volunteerDays.days?.length || 0 }})</h2>
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
            <h2 class="text-2xl font-bold">SMS Campaigns ({{ smsCampaigns.length || 0 }})</h2>
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
    ScheduleDays,
    GardenTaskList
  }
};
</script>

<style scoped>
  .tr-class {
    @apply flex flex-col mb-4 sm:table-row
  }

  .sidebar-nav {
    list-style: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .sidebar-nav-item {
    margin-bottom: 0.5rem;
    margin-left: 0 !important;
    padding-left: 0 !important;
    list-style-type: none !important;
  }

  .sidebar-nav-link {
    width: 100%;
    text-align: left;
    padding: 0.75rem 1rem;
    border: none;
    background: #f5f5f5;
    color: #333;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-radius: 4px;
    transition: background-color 0.2s ease;
    font-size: 1rem;
  }

  .sidebar-nav-link:hover {
    background-color: #e8e8e8;
  }

  .sidebar-nav-link.active {
    background-color: #8aa37c;
    color: #fff;
    font-weight: 600;
  }

  .sidebar-nav-icon {
    font-size: 1.25rem;
    display: inline-block;
  }
</style>