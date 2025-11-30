<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { fetchWrapper } from '@/helpers';

const props = defineProps({
  gardenId: {
    type: Number,
    required: true
  }
});

const tasks = ref([]);
const isLoading = ref(false);
const error = ref(null);
const containerRef = ref(null);
const hasLoaded = ref(false);
let observer = null;

const fetchRecentTasks = async () => {
  try {
    isLoading.value = true;
    // Fetch garden tasks with volunteers populated
    const response = await fetchWrapper.get(
      `${import.meta.env.VITE_API_URL}/api/garden-tasks?filters[garden][id][$eq]=${props.gardenId}&filters[status][$in][0]=FINISHED&filters[status][$in][1]=STARTED&filters[status][$in][2]=PENDING&populate=volunteers&populate=recurring_task&sort[0]=updatedAt:desc&pagination[limit]=20`
    );
    
    // Handle Strapi response format
    const tasksArray = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
    tasks.value = tasksArray.map(task => {
      // Normalize task structure
      const normalizedTask = {
        id: task.id,
        ...task.attributes,
        // Ensure volunteers is in the right format
        volunteers: task.attributes?.volunteers?.data || task.attributes?.volunteers || []
      };
      return normalizedTask;
    });
  } catch (err) {
    error.value = err.message || 'Failed to load volunteer activity';
    console.error('Error fetching tasks:', err);
    tasks.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Get the most relevant activity timestamp for a task
const getActivityTimestamp = (task) => {
  // Prefer completed_at for finished tasks
  if (task.status === 'FINISHED' && task.completed_at) {
    return task.completed_at;
  }
  // Use started_at for started tasks
  if ((task.status === 'STARTED' || task.status === 'PENDING') && task.started_at) {
    return task.started_at;
  }
  // Fall back to completed_at if available
  if (task.completed_at) {
    return task.completed_at;
  }
  // Fall back to started_at if available
  if (task.started_at) {
    return task.started_at;
  }
  // Last resort: use updatedAt
  return task.updatedAt;
};

// Group activities by volunteer
const volunteerActivities = computed(() => {
  const activitiesMap = new Map();
  
  tasks.value.forEach(task => {
    const volunteers = task.volunteers || [];
    const activityTimestamp = getActivityTimestamp(task);
    
    volunteers.forEach(volunteer => {
      // Handle both direct volunteer objects and Strapi data structure
      const volunteerId = volunteer.id || volunteer.attributes?.id;
      const volunteerData = volunteer.attributes || volunteer;
      
      if (!volunteerId) return; // Skip if no valid ID
      
      const existingActivity = activitiesMap.get(volunteerId);
      
      // Use activity timestamp for comparison and storage
      if (!existingActivity || new Date(activityTimestamp) > new Date(existingActivity.lastActive)) {
        activitiesMap.set(volunteerId, {
          id: volunteerId,
          name: `${volunteerData.firstName || ''} ${volunteerData.lastName || ''}`.trim(),
          firstName: volunteerData.firstName,
          lastActive: activityTimestamp,
          taskTitle: task.title,
          taskType: task.type,
          status: task.status,
          recurringTaskTitle: task.recurring_task?.data?.attributes?.title || task.recurring_task?.attributes?.title
        });
      }
    });
  });
  
  // Convert to array and sort by most recent activity
  return Array.from(activitiesMap.values())
    .sort((a, b) => {
      const dateA = new Date(a.lastActive);
      const dateB = new Date(b.lastActive);
      // Handle invalid dates
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      return dateB - dateA;
    });
});

// Limit to most recent 5 activities
const recentActivities = computed(() => {
  return volunteerActivities.value.slice(0, 5);
});

const getTimeAgo = (dateString) => {
  if (!dateString) return 'recently';
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now - past;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  
  if (diffInDays === 0) {
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes} minutes ago`;
    }
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  const months = Math.floor(diffInDays / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

const getTaskTypeIcon = (type) => {
  const icons = {
    Water: '💧',
    Weeding: '🌿',
    Planting: '🌱',
    Harvest: '🍅',
    General: '🔧'
  };
  return icons[type] || '🔧';
};

// Set up Intersection Observer for lazy loading
onMounted(() => {
  if (!props.gardenId) return;
  
  // Use nextTick to ensure the ref is available
  nextTick(() => {
    if (!containerRef.value) return;
    
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded.value && props.gardenId) {
            hasLoaded.value = true;
            fetchRecentTasks();
            // Disconnect observer after first load
            if (observer && containerRef.value) {
              observer.unobserve(containerRef.value);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading slightly before it comes into view
        threshold: 0.1
      }
    );
    
    if (containerRef.value) {
      observer.observe(containerRef.value);
    }
  });
});

onUnmounted(() => {
  if (observer && containerRef.value) {
    observer.unobserve(containerRef.value);
    observer.disconnect();
  }
});

watch(() => props.gardenId, (newId) => {
  if (newId && hasLoaded.value) {
    // Reset and reload if garden ID changes
    hasLoaded.value = false;
    tasks.value = [];
    if (containerRef.value && observer) {
      observer.observe(containerRef.value);
    }
  }
});
</script>

<template>
  <div ref="containerRef" class="volunteer-activity">
    <!-- Loading state -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading activity...</p>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>
    
    <!-- No activity state -->
    <div v-else-if="hasLoaded && recentActivities.length === 0" class="activity-empty">
      <p>No recent volunteer activity</p>
    </div>
    
    <!-- Activity list -->
    <div v-else-if="hasLoaded && recentActivities.length > 0" class="activity-list">
      <div 
        v-for="(activity, index) in recentActivities" 
        :key="activity.id"
        class="activity-item"
        :style="{ animationDelay: `${index * 0.1}s` }"
      >
        <span class="task-icon">{{ getTaskTypeIcon(activity.taskType) }}</span>
        <span class="activity-text">
          <span class="volunteer-name">{{ activity.firstName }}</span>
          <span class="time-ago"> was active {{ getTimeAgo(activity.lastActive) }}.</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.volunteer-activity {
  color: #4a4a4a;
}

.dark .volunteer-activity {
  color: #d0d0d0;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(138, 163, 124, 0.3);
  border-top-color: #8aa37c;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  color: #dc2626;
  text-align: center;
  padding: 20px;
}

.dark .error-state {
  color: #fca5a5;
}

.activity-empty {
  text-align: center;
  padding: 40px 20px;
  font-style: italic;
  color: #888;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 0.95rem;
  line-height: 1.5;
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.activity-text {
  display: inline;
  color: #4a4a4a;
}

.dark .activity-text {
  color: #d0d0d0;
}

.volunteer-name {
  font-weight: 600;
  color: #1a1a1a;
}

.dark .volunteer-name {
  color: #f5f5f5;
}

.time-ago {
  color: #666;
}

.dark .time-ago {
  color: #999;
}


.activity-limit {
  text-align: center;
  font-size: 0.85rem;
  color: #888;
  padding-top: 8px;
}
</style>

