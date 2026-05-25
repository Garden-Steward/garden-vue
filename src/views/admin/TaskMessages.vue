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

const groupedMessages = computed(() => {
  if (!taskMessages.value) return [];

  const groups = new Map();
  taskMessages.value.forEach(message => {
    const taskId = message.garden_task?.id || 'no-task';

    if (!groups.has(taskId)) {
      const volunteers = message.garden_task?.volunteers;
      const resolvedUser = volunteers?.[0]?.username || 'Anonymous volunteer';
      console.log(`[TaskMessages] Task ${taskId} ("${message.garden_task?.title}") — volunteers raw:`, volunteers, '→ resolved name:', resolvedUser);
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

  console.log('[TaskMessages] Sorted group IDs:', sortedGroups.map(g => g.taskId));

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
</script>

<template>
  <div class="bg-custom-light dark:bg-[#2d3e26] rounded-lg mx-auto md:p-5 text-gray-900 dark:text-[#f5f5f5]">
    <h1 class="text-3xl font-bold mb-5">Task Messages</h1>

    <div v-if="loading" class="flex justify-center">
      <div class="spinner-border spinner-border-sm"></div>
    </div>

    <div v-else-if="Object.keys(groupedMessages).length === 0" class="text-center py-3">
      <p class="text-gray-500 dark:text-[#b8c9b0]">No messages found</p>
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="group in groupedMessages"
        :key="group.taskId"
        class="rounded-lg shadow p-4 border border-[#c4d4b8] bg-[#eef4e8] dark:bg-[#1a2218] dark:border-[#3d4d36]/80 dark:shadow-black/25"
      >
        <div 
          class="flex items-center gap-2 cursor-pointer hover:bg-[#e2eadc] p-1 rounded-lg transition-colors dark:hover:bg-[#243220]"
          @click="toggleTask(group.taskId)"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-[#f5f5f5]">{{ group.taskTitle }}</h2>
              <span v-if="group.taskId !== 'no-task'" 
                    :class="[getStatusColor(group.messages[0]?.garden_task?.status), 'px-2 py-1 rounded-full text-xs border border-black/10 dark:border-white/10']">
                {{ group.messages[0]?.garden_task?.status || 'UNKNOWN' }}
              </span>
              <span class="text-sm text-gray-500 dark:text-[#c5d4b8]">
                ({{ group.messages.length }} message{{ group.messages.length === 1 ? '' : 's' }})
              </span>
            </div>
            <div class="text-sm text-gray-500 dark:text-[#b8c9b0] mt-1 space-y-1">
              <div>To: {{ group.user }}</div>
              <div>First message: {{ formatDate(group.messages[group.messages.length - 1]?.createdAt) }}</div>
            </div>
          </div>
          <svg
            class="w-6 h-6 fill-current text-gray-700 dark:text-[#c5d4b8]"
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
              v-for="{ message, count, times } in group.deduplicatedMessages"
              :key="message.id"
              class="rounded-lg border border-[#a8c49a]/80 bg-[#e8f2e0] p-3 shadow-sm hover:bg-[#dff0d4] transition-colors border-l-4 dark:bg-[#3a2215] dark:border-[#c2410c]/35 dark:hover:bg-[#4a2c1a] dark:shadow-black/25"
              :class="getMessageBorderColor(message.type)"
            >
              <div class="flex justify-between items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-2">
                    <span class="font-semibold text-[#1a2617] dark:text-[#f5f5f5]">
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
                  <p class="text-[#2d3e26] dark:text-[#e8eee4]">{{ message.body }}</p>
                  <p v-if="message.previous" class="text-[#3d4d36] dark:text-[#b8c9b0] text-sm mt-2 italic">
                    Response to use message: {{ message.previous }}
                  </p>
                </div>
                <div class="text-right shrink-0 max-w-[58%] sm:max-w-[50%]">
                  <div class="text-sm text-[#3d4d36] dark:text-[#b8c9b0]">
                    {{ formatDate(message.createdAt || message.attributes?.createdAt) }}
                  </div>
                  <div
                    v-if="count > 1 && times?.length"
                    class="text-sm text-[#3d4d36] dark:text-[#b8c9b0] mt-1 leading-snug"
                  >
                    {{ formatTimesComma(times) }}
                  </div>
                </div>
              </div>

              <!-- Related Event (if exists) -->
              <div v-if="message.event" class="mt-2 text-sm text-[#2d3e26] dark:text-[#d0dccd]">
                Related Event: {{ message.event.title }}
              </div>

              <!-- Meta Data (if exists) -->
              <div v-if="message.meta_data" class="mt-2 text-xs text-[#3d4d36] dark:text-[#b8c9b0]">
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
