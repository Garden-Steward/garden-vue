<script setup>
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useGardensStore, useGardenTaskStore } from '@/stores';
import { computed, ref, onMounted, watch } from 'vue';
import SunIcon from '@/components/icons/Sun.svg?raw';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const route = useRoute();
const router = useRouter();
const gardensStore = useGardensStore();
const gardenTaskStore = useGardenTaskStore();
const { garden } = storeToRefs(gardensStore);
const { gardenTasks } = storeToRefs(gardenTaskStore);

// Dark mode state
const getSystemPreference = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

const isDarkMode = ref(false);

// Loading state
const isLoading = ref(true);

// Initialize dark mode from system preference
onMounted(() => {
  const shouldBeDark = getSystemPreference();
  isDarkMode.value = shouldBeDark;
  applyDarkMode(shouldBeDark);
});

const applyDarkMode = (dark) => {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  applyDarkMode(isDarkMode.value);
  localStorage.setItem('garden-public-theme', isDarkMode.value ? 'dark' : 'light');
};

// Load garden and tasks data
gardensStore.getSlug(route.params.slug);

watch(() => garden.value?.id, async (gardenId) => {
  if (gardenId) {
    isLoading.value = true;
    await gardenTaskStore.getTasksByGardenSlug(route.params.slug);
    isLoading.value = false;
  }
}, { immediate: true });

// Filter tasks - only show active tasks (not finished, abandoned, or skipped)
const activeTasks = computed(() => {
  if (!gardenTasks.value || !Array.isArray(gardenTasks.value)) return [];

  return gardenTasks.value.filter(task => {
    const status = task.attributes?.status;
    return status && !['FINISHED', 'ABANDONED', 'SKIPPED'].includes(status.toUpperCase());
  });
});

// Get task image
const getTaskImage = (task) => {
  const primaryImage = task.attributes?.primary_image;
  if (!primaryImage) return null;

  // Handle different image formats from Strapi
  const imageUrl = primaryImage.url ||
                   primaryImage.formats?.medium?.url ||
                   primaryImage.data?.attributes?.url ||
                   primaryImage.data?.attributes?.formats?.medium?.url;

  return imageUrl || null;
};

// Get type badge classes
const getTypeBadgeClasses = (type) => {
  switch (type?.toLowerCase()) {
    case 'water':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'weeding':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'planting':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'harvest':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

// Get status badge classes
const getStatusBadgeClasses = (status) => {
  switch (status?.toUpperCase()) {
    case 'INITIALIZED':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

// Format status for display
const formatStatus = (status) => {
  if (status === 'INITIALIZED') return 'Ready';
  if (status === 'IN_PROGRESS') return 'In Progress';
  return status;
};

// Get volunteer count
const getVolunteerCount = (task) => {
  const volunteers = task.attributes?.volunteers;
  if (Array.isArray(volunteers)) return volunteers.length;
  if (volunteers?.data && Array.isArray(volunteers.data)) return volunteers.data.length;
  return 0;
};

// Navigate back to garden page
const goBackToGarden = () => {
  router.push(`/gardens/${route.params.slug}`);
};
</script>

<template>
  <div class="garden-tasks-container">
    <!-- Dark Mode Toggle Button -->
    <button
      @click="toggleDarkMode"
      class="dark-mode-toggle"
      :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <span v-if="isDarkMode" class="sun-icon" v-html="SunIcon"></span>
      <i v-else class="fas fa-moon"></i>
    </button>

    <!-- Content -->
    <div class="tasks-content">
      <!-- Back Button -->
      <button @click="goBackToGarden" class="back-button">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Garden
      </button>

      <!-- Header -->
      <div v-if="garden.attributes" class="tasks-header">
        <h1 class="tasks-title">{{ garden.attributes.title }} Tasks</h1>
        <p class="tasks-subtitle">Browse available volunteer opportunities and sign up to help</p>
      </div>
      <div v-else-if="garden.loading" class="tasks-header">
        <div class="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4 w-2/3 mx-auto"></div>
        <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2 mx-auto"></div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <LoadingSpinner />
        <p class="loading-text">Loading tasks...</p>
      </div>

      <!-- No Tasks Message -->
      <div v-else-if="activeTasks.length === 0" class="no-tasks">
        <div class="no-tasks-icon">
          <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h2 class="no-tasks-title">No Tasks Available</h2>
        <p class="no-tasks-text">Check back soon for new volunteer opportunities!</p>
      </div>

      <!-- Tasks Grid -->
      <div v-else class="tasks-grid">
        <a
          v-for="task in activeTasks"
          :key="task.id"
          :href="'/gardens/' + route.params.slug + '/tasks/' + task.id"
          class="task-card task-card--clickable"
        >
          <!-- Task Image -->
          <div class="task-image-container">
            <img
              v-if="getTaskImage(task)"
              :src="getTaskImage(task)"
              :alt="task.attributes?.title || 'Task image'"
              class="task-image"
            />
            <div v-else class="task-image-placeholder">
              <svg class="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <!-- Task Content -->
          <div class="task-content">
            <!-- Badges -->
            <div class="task-badges">
              <span :class="getStatusBadgeClasses(task.attributes?.status)" class="task-badge">
                {{ formatStatus(task.attributes?.status) }}
              </span>
              <span v-if="task.attributes?.type" :class="getTypeBadgeClasses(task.attributes?.type)" class="task-badge">
                {{ task.attributes?.type }}
              </span>
            </div>

            <!-- Title -->
            <h3 class="task-title">{{ task.attributes?.title }}</h3>

            <!-- Overview -->
            <p v-if="task.attributes?.overview" class="task-overview">
              {{ task.attributes.overview.length > 150 ? task.attributes.overview.substring(0, 150) + '...' : task.attributes.overview }}
            </p>

            <!-- Volunteer Info -->
            <div class="task-volunteers">
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
              </svg>
              <span class="volunteer-count">
                {{ getVolunteerCount(task) }} / {{ task.attributes?.max_volunteers || 1 }} volunteers
              </span>
            </div>

          </div>
        </a>
      </div>
    </div>

  </div>
</template>

<style>
/* Container */
.garden-tasks-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow-y: auto;
  background-color: #f9fafb;
  color: #1a1a1a;
  transition: background-color 0.3s ease, color 0.3s ease;
  z-index: 10000;
  margin: 0;
  padding: 0;
}

.dark .garden-tasks-container {
  background-color: #1f2d1a;
  color: #f5f5f5;
}

/* Dark mode toggle */
.dark-mode-toggle {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 100000;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #8aa37c;
  background-color: #ffffff;
  color: #8aa37c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark-mode-toggle:hover {
  background-color: #8aa37c;
  color: #ffffff;
  transform: scale(1.1);
}

.dark .dark-mode-toggle {
  background-color: #1a1a1a;
  border-color: #8aa37c;
  color: #8aa37c;
}

.dark .dark-mode-toggle:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

.sun-icon {
  width: 24px;
  height: 24px;
  transition: all 0.3s ease;
  color: #4a4a4a;
}

.dark-mode-toggle:hover .sun-icon {
  color: #ffffff;
}

.dark .dark-mode-toggle .sun-icon {
  color: #8aa37c;
}

.dark .dark-mode-toggle:hover .sun-icon {
  color: #ffffff;
}

/* Content */
.tasks-content {
  min-height: 100vh;
  padding: 80px 30px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Back button */
.back-button {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  margin-bottom: 30px;
  font-size: 1rem;
  font-weight: 500;
  color: #8aa37c;
  background-color: transparent;
  border: 2px solid #8aa37c;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

.dark .back-button {
  color: #8aa37c;
  border-color: #8aa37c;
}

.dark .back-button:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

/* Header */
.tasks-header {
  text-align: center;
  margin-bottom: 50px;
}

.tasks-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark .tasks-title {
  color: #f5f5f5;
}

.tasks-subtitle {
  font-size: 1.1rem;
  color: #6b7280;
  transition: color 0.3s ease;
}

.dark .tasks-subtitle {
  color: #9ca3af;
}

/* Loading */
.loading-container {
  text-align: center;
  padding: 60px 20px;
}

.loading-text {
  margin-top: 16px;
  color: #6b7280;
}

.dark .loading-text {
  color: #9ca3af;
}

/* No tasks */
.no-tasks {
  text-align: center;
  padding: 60px 20px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.dark .no-tasks {
  background-color: rgba(26, 26, 26, 0.5);
}

.no-tasks-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #e5e7eb;
  color: #9ca3af;
  margin-bottom: 20px;
}

.dark .no-tasks-icon {
  background-color: #374151;
  color: #6b7280;
}

.no-tasks-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.dark .no-tasks-title {
  color: #f5f5f5;
}

.no-tasks-text {
  color: #6b7280;
}

.dark .no-tasks-text {
  color: #9ca3af;
}

/* Tasks Grid */
.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 30px;
}

/* Task Card */
.task-card {
  background-color: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.dark .task-card {
  background-color: #2d3e26;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dark .task-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

/* Task Image */
.task-image-container {
  margin: 16px;
  border-radius: 12px;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background-color: #f3f4f6;
}

.dark .task-image-container {
  background-color: #1f2d1a;
}

.task-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.task-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e5e7eb;
}

.dark .task-image-placeholder {
  background-color: #374151;
}

/* Task Content */
.task-content {
  padding: 24px;
}

/* Badges */
.task-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.task-badge {
  display: inline-block;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Task Title */
.task-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
  line-height: 1.4;
}

.dark .task-title {
  color: #f5f5f5;
}

/* Task Overview */
.task-overview {
  font-size: 0.95rem;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 16px;
}

.dark .task-overview {
  color: #9ca3af;
}

/* Volunteer Info */
.task-volunteers {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.dark .task-volunteers {
  background-color: rgba(0, 0, 0, 0.2);
}

.volunteer-count {
  font-size: 0.9rem;
  font-weight: 500;
  color: #4b5563;
}

.dark .volunteer-count {
  color: #d1d5db;
}

/* Clickable card link reset */
a.task-card {
  text-decoration: none;
  color: inherit;
  display: block;
}

a.task-card--clickable {
  cursor: pointer;
}

/* Responsive */
@media (max-width: 768px) {
  .tasks-content {
    padding: 60px 15px 30px;
  }

  .dark-mode-toggle {
    display: none;
  }

  .tasks-title {
    font-size: 2rem;
  }

  .tasks-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
