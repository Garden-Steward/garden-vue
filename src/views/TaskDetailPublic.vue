<script setup>
import { storeToRefs } from 'pinia';
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGardenTaskStore } from '@/stores';
import { StrapiBlocks } from 'vue-strapi-blocks-renderer';
import { ArticleUtils } from '@/helpers/article-utils';
import PhoneLoginModal from '@/components/modals/PhoneLoginModal.vue';
import SunIcon from '@/components/icons/Sun.svg?raw';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const route = useRoute();
const router = useRouter();
const gardenTaskStore = useGardenTaskStore();

const { gardenTask } = storeToRefs(gardenTaskStore);

// Dark mode
const getSystemPreference = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

const isDarkMode = ref(false);

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
};

// Fetch task
gardenTaskStore.findById(route.params.taskId);

// Task helpers
const task = computed(() => gardenTask.value);
const attrs = computed(() => task.value?.attributes);

// Instruction data is already populated in the task response
const taskInstruction = computed(() => gardenTask.value?.attributes?.instruction?.data?.attributes);

// Process images when instruction content loads
watch(taskInstruction, async (instr) => {
  if (instr?.content) {
    await ArticleUtils.processImages();
  }
}, { deep: true });

onMounted(async () => {
  await ArticleUtils.processImages();
});

const taskImageUrl = computed(() => {
  const img = attrs.value?.primary_image;
  if (!img) return null;
  const url = img.url || img.formats?.medium?.url || img.data?.attributes?.url || img.data?.attributes?.formats?.medium?.url;
  if (!url) return null;
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || ''}${url}`;
});

const volunteerCount = computed(() => {
  const v = attrs.value?.volunteers;
  if (Array.isArray(v)) return v.length;
  if (v?.data && Array.isArray(v.data)) return v.data.length;
  return 0;
});

const formatStatus = (status) => {
  if (status === 'INITIALIZED') return 'Ready';
  if (status === 'IN_PROGRESS') return 'In Progress';
  return status || '';
};

// Sign up modal
const showPhoneModal = ref(false);
const userHasSignedUp = ref(false);

const hasAvailableSpots = computed(() => {
  const max = attrs.value?.max_volunteers || 1;
  return volunteerCount.value < max;
});

const handleSignUp = () => {
  showPhoneModal.value = true;
};

const closePhoneModal = () => {
  showPhoneModal.value = false;
};

const handleSignUpSuccess = () => {
  userHasSignedUp.value = true;
  // Delay refetch to allow backend to update volunteer count
  setTimeout(() => {
    gardenTaskStore.findById(route.params.taskId);
  }, 500);
};

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="task-detail-container">
    <!-- Dark Mode Toggle -->
    <button
      @click="toggleDarkMode"
      class="dark-mode-toggle"
      :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <span v-if="isDarkMode" class="sun-icon" v-html="SunIcon"></span>
      <i v-else class="fas fa-moon"></i>
    </button>

    <div class="task-detail-content">
      <!-- Back Button -->
      <button @click="goBack" class="back-button">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </button>

      <!-- Loading -->
      <div v-if="task?.loading" class="loading-container">
        <LoadingSpinner />
        <p class="loading-text">Loading task...</p>
      </div>

      <!-- Error -->
      <div v-else-if="task?.error" class="error-text">
        Error loading task.
      </div>

      <!-- Task Detail -->
      <div v-else-if="attrs" class="task-detail-card">
        <!-- Hero Image -->
        <div v-if="taskImageUrl" class="task-detail-image">
          <img :src="taskImageUrl" :alt="attrs.title || 'Task'" />
        </div>

        <div class="task-detail-body">
          <!-- Badges -->
          <div class="task-detail-badges">
            <span v-if="attrs.status" class="badge badge-status">{{ formatStatus(attrs.status) }}</span>
            <span v-if="attrs.type" class="badge badge-type">{{ attrs.type }}</span>
          </div>

          <!-- Title -->
          <h1 class="task-detail-title">{{ attrs.title }}</h1>

          <!-- Overview -->
          <p v-if="attrs.overview" class="task-detail-overview">{{ attrs.overview }}</p>

          <!-- Volunteer Info -->
          <div class="task-detail-volunteers">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
            </svg>
            <span>{{ volunteerCount }} / {{ attrs.max_volunteers ?? 1 }} volunteers</span>
          </div>

          <!-- Instruction Section -->
          <div v-if="taskInstruction" class="task-detail-instruction">
            <h2 class="instruction-title">Task Instructions:</h2>
            <StrapiBlocks
              v-if="taskInstruction.content"
              :content="taskInstruction.content"
              class="instruction-content text-left"
            />
          </div>

          <!-- Sign Up Button -->
          <button
            v-if="hasAvailableSpots && !userHasSignedUp"
            @click="handleSignUp"
            class="signup-button"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Sign Up for This Task
          </button>
          <div v-else-if="userHasSignedUp" class="task-signed-up-badge">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            You're Signed Up!
          </div>
          <div v-else class="task-full-badge">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Task is Full
          </div>
        </div>
      </div>
    </div>

    <!-- Phone Modal -->
    <PhoneLoginModal
      :show="showPhoneModal"
      :task="task"
      :dark-mode="isDarkMode"
      @close="closePhoneModal"
      @success="handleSignUpSuccess"
    />
  </div>
</template>

<style>
.task-detail-container {
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

.dark .task-detail-container {
  background-color: #1f2d1a;
  color: #f5f5f5;
}

.task-detail-content {
  min-height: 100vh;
  padding: 80px 30px 40px;
  max-width: 800px;
  margin: 0 auto;
}

.task-detail-container .back-button {
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

.task-detail-container .back-button:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

.task-detail-container .loading-container {
  text-align: center;
  padding: 60px 20px;
}

.task-detail-container .loading-text {
  margin-top: 16px;
  color: #6b7280;
}

.dark .task-detail-container .loading-text {
  color: #9ca3af;
}

.task-detail-container .error-text {
  color: #ef4444;
  text-align: center;
  padding: 40px;
}

.task-detail-card {
  background-color: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.dark .task-detail-card {
  background-color: #2d3e26;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.task-detail-image {
  width: 100%;
  max-height: 400px;
  overflow: hidden;
}

.task-detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.task-detail-body {
  padding: 32px;
}

.task-detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.task-detail-badges .badge {
  display: inline-block;
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.task-detail-badges .badge-status {
  background-color: #f3e8ff;
  color: #6b21a8;
}

.dark .task-detail-badges .badge-status {
  background-color: rgba(107, 33, 168, 0.3);
  color: #c4b5fd;
}

.task-detail-badges .badge-type {
  background-color: #dcfce7;
  color: #166534;
}

.dark .task-detail-badges .badge-type {
  background-color: rgba(138, 163, 124, 0.3);
  color: #8aa37c;
}

.task-detail-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 16px;
  line-height: 1.3;
  color: #1a1a1a;
}

.dark .task-detail-title {
  color: #f5f5f5;
}

.task-detail-overview {
  font-size: 1.1rem;
  line-height: 1.7;
  color: #4b5563;
  margin-bottom: 24px;
}

.dark .task-detail-overview {
  color: #d0d0d0;
}

.task-detail-volunteers {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background-color: #f9fafb;
  border-radius: 10px;
  margin-bottom: 32px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #4b5563;
}

.task-detail-volunteers svg {
  color: #8aa37c;
  flex-shrink: 0;
}

.dark .task-detail-volunteers {
  background-color: rgba(0, 0, 0, 0.2);
  color: #d1d5db;
}

/* Sign Up Button */
.task-detail-body .signup-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  margin-bottom: 32px;
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  background-color: #8aa37c;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.task-detail-body .signup-button:hover {
  background-color: #6c8a6a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
}

.task-detail-body .task-signed-up-badge {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  margin-bottom: 32px;
  font-size: 1rem;
  font-weight: 600;
  color: #16a34a;
  background-color: #dcfce7;
  border-radius: 10px;
}

.dark .task-detail-body .task-signed-up-badge {
  color: #8aa37c;
  background-color: rgba(138, 163, 124, 0.2);
}

.task-detail-body .task-full-badge {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  margin-bottom: 32px;
  font-size: 1rem;
  font-weight: 600;
  color: #6b7280;
  background-color: #e5e7eb;
  border-radius: 10px;
}

.dark .task-detail-body .task-full-badge {
  color: #9ca3af;
  background-color: #374151;
}

/* Instruction section */
.task-detail-instruction {
  border-top: 1px solid #e5e7eb;
  padding-top: 32px;
}

.dark .task-detail-instruction {
  border-top-color: #3d4d36;
}

.instruction-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #1a1a1a;
}

.dark .instruction-title {
  color: #f5f5f5;
}

.instruction-content {
  font-size: 1rem;
  line-height: 1.8;
  color: #374151;
}

.dark .instruction-content {
  color: #d0d0d0;
}

/* Dark mode toggle (reused pattern) */
.task-detail-container .dark-mode-toggle {
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

.task-detail-container .dark-mode-toggle:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

.dark .task-detail-container .dark-mode-toggle {
  background-color: #1a1a1a;
  border-color: #8aa37c;
  color: #8aa37c;
}

.dark .task-detail-container .dark-mode-toggle:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

.task-detail-container .sun-icon {
  width: 24px;
  height: 24px;
  color: #4a4a4a;
}

.dark .task-detail-container .sun-icon {
  color: #8aa37c;
}

@media (max-width: 768px) {
  .task-detail-content {
    padding: 60px 15px 30px;
  }

  .task-detail-container .dark-mode-toggle,
  .dark .task-detail-container .dark-mode-toggle {
    display: none !important;
  }

  .task-detail-title {
    font-size: 1.5rem;
  }

  .task-detail-body {
    padding: 20px;
  }
}
</style>
