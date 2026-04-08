<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMessagesStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { Vue3SlideUpDown } from "vue3-slide-up-down";

const route = useRoute();
const messagesStore = useMessagesStore();
const { taskMessages, loading } = storeToRefs(messagesStore);
const openTasks = ref({}); // Track open/closed state of each task

onMounted(async () => {
  const gardenId = route.params.id;
  await messagesStore.fetchByGarden(gardenId);
});

const groupedMessages = computed(() => {
  if (!taskMessages.value) return [];

  // First, group messages by task
  const groups = new Map();
  taskMessages.value.forEach(message => {
    const taskId = message.garden_task?.id || 'no-task';
    
    if (!groups.has(taskId)) {
      groups.set(taskId, {
        taskId,
        taskTitle: message.garden_task?.title || 'Messages without task',
        user: message.garden_task?.volunteers[0]?.username || 'Anonymous volunteer',
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

  console.log('Sorted group IDs:', sortedGroups.map(g => g.taskId));
  
  return sortedGroups;
});

const toggleTask = (taskId) => {
  openTasks.value[taskId] = !openTasks.value[taskId];
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

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
</script>

<template>
  <div class="bg-custom-light rounded-lg mx-auto md:p-5 ">
    <h1 class="text-3xl font-bold mb-5">Task Messages</h1>

    <div v-if="loading" class="flex justify-center">
      <div class="spinner-border spinner-border-sm"></div>
    </div>

    <div v-else-if="Object.keys(groupedMessages).length === 0" class="text-center py-3">
      <p class="text-gray-500">No messages found</p>
    </div>

    <div v-else class="space-y-6">
      <div v-for="group in groupedMessages" :key="group.taskId" class="rounded-lg shadow p-4 border border-[#c4d4b8] bg-[#eef4e8]">
        <div 
          class="flex items-center gap-2 cursor-pointer hover:bg-[#e2eadc] p-1 rounded-lg transition-colors"
          @click="toggleTask(group.taskId)"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-semibold">{{ group.taskTitle }}</h2>
              <span v-if="group.taskId !== 'no-task'" 
                    :class="[getStatusColor(group.messages[0]?.garden_task?.status), 'px-2 py-1 rounded-full text-xs']">
                {{ group.messages[0]?.garden_task?.status || 'UNKNOWN' }}
              </span>
              <span class="text-sm text-gray-500">
                ({{ group.messages.length }} message{{ group.messages.length === 1 ? '' : 's' }})
              </span>
            </div>
            <div class="text-sm text-gray-500 mt-1 space-y-1">
              <div>To: {{ group.user }}</div>
              <div>First message: {{ formatDate(group.messages[group.messages.length - 1]?.createdAt) }}</div>
            </div>
          </div>
          <svg
            class="w-6 h-6 fill-current"
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20"
          >
            <path v-if="!openTasks[group.taskId]" d="M10 3l-7 9h14l-7-9z" />
            <path v-else d="M10 17l-7-9h14z" />
          </svg>
        </div>
        
        <Vue3SlideUpDown v-model="openTasks[group.taskId]">
          <div class="space-y-3 mt-3">
            <div
              v-for="message in group.messages"
              :key="message.id"
              class="rounded-lg border border-[#a8c49a]/80 bg-[#e8f2e0] p-3 shadow-sm hover:bg-[#dff0d4] transition-colors border-l-4 border-l-[#7a9b68]"
            >
              <div class="flex justify-between items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span class="font-semibold text-[#1a2617]">
                      {{ message.user?.username || 'Anonymous volunteer' }}
                    </span>
                    <span :class="[getTypeColor(message.type), 'px-2 py-1 rounded-full text-xs font-medium border border-black/10']">
                      {{ message.type }}
                    </span>
                  </div>
                  <p class="text-[#2d3e26]">{{ message.body }}</p>
                  <p v-if="message.previous" class="text-[#3d4d36] text-sm mt-2 italic">
                    Response to use message: {{ message.previous }}
                  </p>
                </div>
                <span class="text-sm text-[#3d4d36] shrink-0">{{ formatDate(message.createdAt) }}</span>
              </div>

              <!-- Related Event (if exists) -->
              <div v-if="message.event" class="mt-2 text-sm text-[#2d3e26]">
                Related Event: {{ message.event.title }}
              </div>

              <!-- Meta Data (if exists) -->
              <div v-if="message.meta_data" class="mt-2 text-xs text-[#3d4d36]">
                <pre class="whitespace-pre-wrap">{{ JSON.stringify(message.meta_data, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </Vue3SlideUpDown>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spinner-border {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border: 0.25em solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-border .75s linear infinite;
}

@keyframes spinner-border {
  to { transform: rotate(360deg); }
}
</style>
