<script setup>
import { computed, watch, ref, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useGardenTaskStore, useWeekSchedulerStore } from '@/stores';
import GardenTask from '@/components/modals/GardenTask.vue';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';

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

const gardenTaskStore = useGardenTaskStore();
const weekSchedulerStore = useWeekSchedulerStore();
const { gardenTasks, recurringTasks: storeRecurringTasks } = storeToRefs(gardenTaskStore);
const { weekscheduler } = storeToRefs(weekSchedulerStore);

// Selected task and day for showing volunteers
const selectedTaskId = ref(null);
const selectedDay = ref(null);
const showAddUserDropdown = ref(false);
const searchQuery = ref('');
const focusSchedule = ref(null);

// Fetch tasks and scheduler when garden changes
watch(() => props.garden?.id, (newId) => {
  if (newId) {
    console.log("Fetching tasks for garden:", newId);
    gardenTaskStore.getGardenTasks(newId);
    gardenTaskStore.getRecurringTasks(newId);
    weekSchedulerStore.find(newId);
  }
}, { immediate: true });

// Recurring tasks from the store (separate API endpoint)
// Normalize the structure to handle both Strapi formats
const recurringTasks = computed(() => {
  if (!storeRecurringTasks.value) return [];
  try {
    const tasks = Array.isArray(storeRecurringTasks.value) ? storeRecurringTasks.value : [storeRecurringTasks.value];
    // Normalize to ensure consistent structure
    return tasks.map(task => {
      // If it's already in {id, attributes} format, return as is
      if (task && task.id && task.attributes) return task;
      // If it's in {data: {id, attributes}} format, extract it
      if (task && task.data) return task.data;
      // Otherwise return as is
      return task;
    }).filter(Boolean);
  } catch (error) {
    console.error('Error processing recurring tasks:', error);
    return [];
  }
});

// Regular garden tasks (filtered)
const regularTasks = computed(() => {
  console.log("gardenTasks value:", gardenTasks.value);
  if (!gardenTasks.value) return [];
  try {
    const allTasks = Array.isArray(gardenTasks.value) ? gardenTasks.value : [];
    return allTasks.filter(task => {
      if (!task || !task.attributes) return false;
      const status = task.attributes?.status;
      return status !== 'ABANDONED' && status !== 'SKIPPED';
    });
  } catch (error) {
    console.error('Error processing regular tasks:', error);
    return [];
  }
});

// Get recurring task ID from a recurring task
const getRecurringTaskId = (recurringTask) => {
  // Recurring tasks should be in {id, attributes} format after normalization
  return recurringTask?.id;
};

// Get instruction for a recurring task (Strapi: instruction.data or instruction with attributes)
const getRecurringTaskInstruction = (recurringTask) => {
  const instr = recurringTask?.attributes?.instruction;
  if (!instr) return null;
  const data = instr?.data ?? instr;
  const attrs = data?.attributes ?? data;
  const slug = attrs?.slug;
  const title = attrs?.title;
  return slug && title ? { title, slug } : null;
};

// Get instruction for a regular garden task
const getTaskInstruction = (task) => {
  const instr = task?.attributes?.instruction?.data;
  if (!instr) return null;
  const attrs = instr.attributes || instr;
  return (attrs?.slug && attrs?.title) ? { title: attrs.title, slug: attrs.slug } : null;
};

// Get scheduler entries for a specific recurring task
const getSchedulerEntriesForTask = (recurringTask) => {
  if (!weekscheduler.value || typeof weekscheduler.value !== 'object') return [];
  const recurringTaskId = getRecurringTaskId(recurringTask);
  if (!recurringTaskId) return [];
  
  const entries = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  days.forEach(day => {
    const dayEntries = weekscheduler.value[day] || [];
    dayEntries.forEach(sched => {
      const schedRecurringTaskId = sched.recurring_task?.data?.id || sched.recurring_task?.id;
      if (schedRecurringTaskId === recurringTaskId && sched.recurring_task?.data?.attributes?.scheduler_type !== 'No Schedule') {
        entries.push({ ...sched, day });
      }
    });
  });
  
  return entries;
};

// Get days that have scheduler entries for a recurring task
const getDaysForTask = (recurringTask) => {
  const entries = getSchedulerEntriesForTask(recurringTask);
  const days = new Set();
  entries.forEach(entry => {
    if (entry.day) days.add(entry.day);
  });
  return Array.from(days).sort((a, b) => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return dayOrder.indexOf(a) - dayOrder.indexOf(b);
  });
};

// Get scheduler entry for a specific recurring task and day
const getSchedulerForTaskAndDay = (recurringTask, day) => {
  const entries = getSchedulerEntriesForTask(recurringTask);
  return entries.find(entry => entry.day === day);
};

// Check if a day has volunteers
const dayHasVolunteers = (recurringTask, day) => {
  const sched = getSchedulerForTaskAndDay(recurringTask, day);
  const volunteers = sched?.backup_volunteers?.data || [];
  return volunteers.length > 0;
};

// Handle day tag click
const handleDayClick = (recurringTask, day) => {
  const taskId = recurringTask.id || recurringTask.data?.id;
  if (selectedTaskId.value === taskId && selectedDay.value === day) {
    // Deselect if clicking the same day
    selectedTaskId.value = null;
    selectedDay.value = null;
    selectedTask.value = null;
  } else {
    selectedTaskId.value = taskId;
    selectedDay.value = day;
    selectedTask.value = recurringTask;
    showAddUserDropdown.value = false;
  }
};

// Store selected recurring task object
const selectedTask = ref(null);

// Get volunteers for selected task/day
const selectedVolunteers = computed(() => {
  if (!selectedTask.value || !selectedDay.value) return [];
  const sched = getSchedulerForTaskAndDay(selectedTask.value, selectedDay.value);
  return sched?.backup_volunteers?.data || [];
});

// Filter volunteers for add dropdown
const filteredVolunteers = computed(() => {
  if (!props.garden?.attributes?.volunteers?.data) return [];
  const volunteers = Array.isArray(props.garden.attributes.volunteers.data) 
    ? props.garden.attributes.volunteers.data 
    : [];
  
  if (!searchQuery.value) return volunteers;
  
  return volunteers.filter(volunteer =>
    volunteer?.attributes?.firstName?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    volunteer?.attributes?.lastName?.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Add volunteer to schedule
const addUserToSchedule = (volunteer) => {
  if (!selectedTask.value || !selectedDay.value) return;
  const sched = getSchedulerForTaskAndDay(selectedTask.value, selectedDay.value);
  if (!sched?.id) return;
  
  const addData = { "backup_volunteers": { "connect": [volunteer.id] } };
  weekSchedulerStore.update(sched.id, addData);
  showAddUserDropdown.value = false;
  searchQuery.value = '';
};

// Remove volunteer from schedule
const deleteUser = (userId) => {
  if (!selectedTask.value || !selectedDay.value) return;
  const sched = getSchedulerForTaskAndDay(selectedTask.value, selectedDay.value);
  if (!sched?.id) return;
  
  const addData = { "backup_volunteers": { "disconnect": [userId] } };
  weekSchedulerStore.update(sched.id, addData);
};

// Toggle add user dropdown
const toggleAddUserDropdown = () => {
  if (showAddUserDropdown.value) {
    showAddUserDropdown.value = false;
  } else {
    showAddUserDropdown.value = true;
    if (selectedTask.value && selectedDay.value) {
      const sched = getSchedulerForTaskAndDay(selectedTask.value, selectedDay.value);
      focusSchedule.value = sched?.id;
    }
    searchQuery.value = '';
  }
};

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

// Track which task modals are open
const openTaskModals = ref({});

// Track edit mode for day tags (per recurring task)
const dayEditMode = ref({});

// Track which day is being deleted (for confirmation modal)
const dayToDelete = ref({ taskId: null, day: null });

// Track whether the recurring tasks section drawer is open (collapsed by default)
const recurringDrawerOpen = ref(false);

// Track which tasks have their drawer open
const openDrawers = ref({});

// Toggle drawer for a task
const toggleDrawer = (taskId) => {
  openDrawers.value[taskId] = !openDrawers.value[taskId];
  // Close add day form when closing drawer
  if (!openDrawers.value[taskId]) {
    showAddDayForm.value[taskId] = false;
    newDaySelection.value[taskId] = '';
  }
};

// Track which recurring tasks are showing the "Add Day" form
const showAddDayForm = ref({});

// Track selected day for new scheduler entry
const newDaySelection = ref({});

// Available days
const availableDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Get available days for a recurring task (days that don't already have a schedule)
const getAvailableDaysForTask = (recurringTask) => {
  const existingDays = getDaysForTask(recurringTask);
  return availableDays.filter(day => !existingDays.includes(day));
};

// Toggle add day form
const toggleAddDayForm = (taskId) => {
  showAddDayForm.value[taskId] = !showAddDayForm.value[taskId];
  if (!showAddDayForm.value[taskId]) {
    newDaySelection.value[taskId] = '';
  }
};

// Create new scheduler entry
const createNewScheduler = async (recurringTask) => {
  const taskId = recurringTask.id;
  const selectedDay = newDaySelection.value[taskId];
  
  if (!selectedDay || !props.garden?.id) return;
  
  try {
    const schedulerData = {
      day: selectedDay,
      garden: props.garden.id,
      recurring_task: taskId
    };
    
    await weekSchedulerStore.register(schedulerData);
    
    // Refresh scheduler data
    await weekSchedulerStore.find(props.garden.id);
    
    // Reset form
    showAddDayForm.value[taskId] = false;
    newDaySelection.value[taskId] = '';
  } catch (error) {
    console.error('Error creating scheduler:', error);
  }
};

// Toggle edit mode for day tags
const toggleDayEditMode = (taskId) => {
  dayEditMode.value[taskId] = !dayEditMode.value[taskId];
};

// Remove a day from the schedule
const removeDay = (recurringTask, day) => {
  const sched = getSchedulerForTaskAndDay(recurringTask, day);
  if (!sched?.id) return;
  
  // Set up confirmation
  dayToDelete.value = {
    taskId: recurringTask.id,
    day: day,
    schedId: sched.id
  };
};

// Confirm day removal
const confirmRemoveDay = async () => {
  if (!dayToDelete.value.schedId) return;
  
  const day = dayToDelete.value.day;
  const taskId = dayToDelete.value.taskId;
  
  try {
    await weekSchedulerStore.delete(dayToDelete.value.schedId);
    
    // Clear selection if the removed day was selected
    if (selectedTaskId.value === taskId && selectedDay.value === day) {
      selectedTaskId.value = null;
      selectedDay.value = null;
      selectedTask.value = null;
    }
    
    // Exit edit mode
    dayEditMode.value[taskId] = false;
    
    // Close confirmation
    dayToDelete.value = { taskId: null, day: null, schedId: null };
  } catch (error) {
    console.error('Error removing day:', error);
  }
};

// Cancel day removal
const cancelRemoveDay = () => {
  dayToDelete.value = { taskId: null, day: null, schedId: null };
};

// Regular task card helpers (same style as public tasks page)
const getTaskImage = (task) => {
  const primaryImage = task?.attributes?.primary_image;
  if (!primaryImage) return null;
  const url = primaryImage.url
    || primaryImage.formats?.medium?.url
    || primaryImage.data?.attributes?.url
    || primaryImage.data?.attributes?.formats?.medium?.url;
  if (!url) return null;
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || ''}${url}`;
};

const getVolunteerCount = (task) => {
  const volunteers = task?.attributes?.volunteers;
  if (Array.isArray(volunteers)) return volunteers.length;
  if (volunteers?.data && Array.isArray(volunteers.data)) return volunteers.data.length;
  return 0;
};

const formatTaskStatus = (status) => {
  if (status === 'INITIALIZED') return 'Ready';
  if (status === 'IN_PROGRESS') return 'In Progress';
  return status || '';
};

const getTypeBadgeClasses = (type) => {
  switch (type?.toLowerCase()) {
    case 'water':
      return 'bg-blue-900/40 text-blue-200';
    case 'weeding':
      return 'bg-yellow-900/40 text-yellow-200';
    case 'planting':
      return 'bg-green-900/40 text-green-200';
    case 'harvest':
      return 'bg-orange-900/40 text-orange-200';
    default:
      return 'bg-[rgba(138,163,124,0.3)] text-[#8aa37c]';
  }
};

const getStatusBadgeClasses = (status) => {
  switch (String(status).toUpperCase()) {
    case 'INITIALIZED':
      return 'bg-purple-900/40 text-purple-200';
    case 'IN_PROGRESS':
      return 'bg-blue-900/40 text-blue-200';
    default:
      return 'bg-[rgba(26,26,26,0.8)] text-[#d0d0d0] border border-[#3d4d36]/50';
  }
};

// Refs to GardenTask modal instances (regular tasks) for opening programmatically
const regularTaskModalRefs = ref({});

// Open edit modal for a regular task (call exposed openModal on the component)
const openEditModal = (taskId) => {
  const modalRef = regularTaskModalRefs.value[taskId];
  if (modalRef?.openModal) {
    modalRef.openModal();
    return;
  }
  // Fallback: trigger click on hidden card (e.g. for recurring tasks)
  openTaskModals.value[taskId] = true;
  nextTick(() => {
    const container = document.querySelector(`[data-task-id="${taskId}"]`);
    const trigger = container?.querySelector('[data-garden-task-trigger]');
    if (trigger) trigger.click();
  });
};

// Recurring task modal: open by clicking hidden trigger (no refs in this list)
const openRecurringEditModal = (taskId) => {
  openTaskModals.value[taskId] = true;
  nextTick(() => {
    const container = document.querySelector(`[data-recurring-task-id="${taskId}"]`);
    const trigger = container?.querySelector('[data-garden-task-trigger]');
    if (trigger) trigger.click();
  });
};
</script>

<template>
  <div class="bg-[#2d3e26] p-1 md:p-6 rounded-lg shadow-md mb-4">
    
    <!-- Recurring Tasks Section (one outer container, lighter green; tasks inside, no borders) -->
    <div v-if="recurringTasks.length > 0" class="mb-8 rounded-lg border border-[#3d4d36]/50 overflow-hidden bg-[#2d3e26]">
      <div
        class="flex flex-wrap items-center justify-between gap-4 p-4 cursor-pointer hover:bg-[rgba(0,0,0,0.08)] transition-colors"
        @click="recurringDrawerOpen = !recurringDrawerOpen"
      >
        <h3 class="text-xl font-bold text-[#f5f5f5]">
          Recurring Tasks
          <span class="font-normal text-base text-[#8aa37c] ml-2">({{ recurringTasks.length }} active)</span>
        </h3>
        <div class="flex items-center gap-2">
          <span class="text-sm text-[#d0d0d0]">{{ recurringDrawerOpen ? 'Hide' : 'Show' }}</span>
          <svg
            class="w-5 h-5 text-[#d0d0d0] transition-transform"
            :class="{ 'rotate-180': recurringDrawerOpen }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div v-show="recurringDrawerOpen" class="px-4 pb-4 pt-0 space-y-3">
        <div v-for="recurringTask in recurringTasks" :key="recurringTask.id">
          <!-- Recurring task row (no border, sits inside outer container) -->
          <div class="bg-[rgba(26,26,26,0.35)] rounded-lg overflow-hidden">
            <!-- Always visible header -->
            <div 
              class="p-4 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] transition-colors"
              @click="toggleDrawer(recurringTask.id)"
            >
              <div class="flex items-center justify-between">
                <div class="text-lg font-medium text-[#f5f5f5]">
                  {{ recurringTask.attributes?.title }}
                </div>
                <div class="flex gap-2 items-center">
                  <span 
                    class="px-3 py-1 rounded-full text-sm font-medium bg-[rgba(138,163,124,0.3)] text-[#8aa37c]"
                  >
                    {{ recurringTask.attributes?.type || 'General' }}
                  </span>
                  <svg 
                    class="w-5 h-5 text-[#d0d0d0] transition-transform"
                    :class="{ 'rotate-180': openDrawers[recurringTask.id] }"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <!-- Day badges in same container as title -->
              <div class="flex flex-wrap gap-2 items-center mt-3" @click.stop>
                <button
                  v-for="day in getDaysForTask(recurringTask)"
                  :key="day"
                  @click="!dayEditMode[recurringTask.id] && handleDayClick(recurringTask, day)"
                  :class="[
                    'px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1',
                    selectedTaskId === recurringTask.id && selectedDay === day
                      ? 'bg-[rgba(138,163,124,0.5)] text-white'
                      : dayHasVolunteers(recurringTask, day)
                        ? 'bg-[rgba(138,163,124,0.3)] text-[#8aa37c] hover:bg-[rgba(138,163,124,0.4)]'
                        : 'bg-[rgba(26,26,26,0.8)] text-[#d0d0d0] hover:bg-[rgba(26,26,26,1)] border border-[#3d4d36]/50',
                    dayEditMode[recurringTask.id] ? 'cursor-default' : 'cursor-pointer'
                  ]"
                >
                  {{ day }}
                  <button
                    v-if="dayEditMode[recurringTask.id] && editor"
                    @click.stop="removeDay(recurringTask, day)"
                    class="ml-1 text-red-400 hover:text-red-300"
                    title="Remove day"
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </button>
                <button
                  v-if="editor && !dayEditMode[recurringTask.id]"
                  @click.stop="toggleAddDayForm(recurringTask.id)"
                  class="px-3 py-1 rounded-full text-sm font-medium bg-[rgba(26,26,26,0.8)] text-[#f5f5f5] hover:bg-[rgba(26,26,26,1)] border border-[#3d4d36]/50 transition-colors flex items-center justify-center w-8 h-8"
                  title="Add day"
                >
                  <span class="text-lg font-bold leading-none">+</span>
                </button>
                <button
                  v-if="editor"
                  @click="toggleDayEditMode(recurringTask.id)"
                  class="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  {{ dayEditMode[recurringTask.id] ? 'Done' : 'Edit' }}
                </button>
              </div>
            </div>
            
            <!-- Drawer content (description, instruction link, last updated, Edit button) -->
            <div 
              v-if="openDrawers[recurringTask.id]"
              class="px-4 pb-4 border-t border-[#3d4d36]/50 pt-4 space-y-3"
            >
              <div v-if="recurringTask.attributes?.overview" class="text-sm text-[#d0d0d0]">
                {{ recurringTask.attributes.overview }}
              </div>
              <div v-if="getRecurringTaskInstruction(recurringTask)" class="text-sm">
                <span class="text-[#d0d0d0]">Instructions: </span>
                <a
                  :href="'/i/' + getRecurringTaskInstruction(recurringTask).slug"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[#8aa37c] underline hover:text-[#6b8560]"
                >
                  {{ getRecurringTaskInstruction(recurringTask).title }}
                </a>
              </div>
              <div v-if="recurringTask.attributes?.updatedAt" class="text-xs text-[#999]">
                Last updated: {{ formatDate(recurringTask.attributes.updatedAt) }}
              </div>
              
              <div v-if="editor" class="pt-2">
                <button
                  @click.stop="openRecurringEditModal(recurringTask.id)"
                  class="px-4 py-2 bg-custom-green text-white rounded-lg hover:bg-darker-green transition-colors text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
          
          <!-- Edit modal for recurring task - always render but hide the card -->
          <div :data-recurring-task-id="recurringTask.id" style="position: absolute; left: -9999px; opacity: 0; pointer-events: none;">
            <GardenTask
              v-bind="recurringTask.attributes"
              :id="recurringTask.id"
              :garden="garden.id"
              :editor="editor"
            />
          </div>
          
          <!-- Add Day form and volunteer management - only show when there's content -->
          <div
            v-if="showAddDayForm[recurringTask.id] || (selectedTaskId === recurringTask.id && selectedDay)"
            class="mt-3 ml-0 bg-[rgba(26,26,26,0.35)] rounded-lg p-4"
          >
            <!-- Add Day form (shown when + is clicked) -->
              <div v-if="showAddDayForm[recurringTask.id] && editor" class="mb-4 p-3 bg-[rgba(26,26,26,0.8)] rounded-lg border border-[#3d4d36]/50">
                <div class="flex items-start gap-2">
                  <select
                    v-model="newDaySelection[recurringTask.id]"
                    class="w-1/2 border border-[#3d4d36]/50 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-green"
                  >
                    <option value="" class="bg-[rgba(26,26,26,0.8)]">Select a day...</option>
                    <option 
                      v-for="day in getAvailableDaysForTask(recurringTask)"
                      :key="day"
                      :value="day"
                      class="bg-[rgba(26,26,26,0.8)]"
                    >
                      {{ day }}
                    </option>
                  </select>
                  <div class="flex gap-2">
                    <button
                      @click.stop="createNewScheduler(recurringTask)"
                      :disabled="!newDaySelection[recurringTask.id]"
                      class="px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition-colors text-sm font-medium disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <button
                      @click.stop="toggleAddDayForm(recurringTask.id)"
                      class="px-4 py-2 bg-[rgba(26,26,26,0.8)] text-[#f5f5f5] rounded-lg hover:bg-[rgba(26,26,26,1)] transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            
            <!-- Selected day volunteers display -->
            <div v-if="selectedTaskId === recurringTask.id && selectedDay" class="mt-4 border-t border-[#3d4d36]/50 pt-4">
              <div class="relative">
                <!-- Volunteers list -->
                <div class="flex flex-wrap items-center gap-3 mb-3">
                  <div v-for="volunteer in selectedVolunteers" :key="volunteer.id" class="flex items-center gap-2 bg-[rgba(26,26,26,0.8)] rounded-lg p-2 border border-[#3d4d36]/50">
                    <UserProfileDisplay :volunteer="volunteer.attributes" />
                    <span class="text-sm font-medium text-[#f5f5f5]">{{ volunteer.attributes.firstName }} {{ volunteer.attributes.lastName }}</span>
                    <button
                      v-if="editor"
                      @click="deleteUser(volunteer.id)"
                      class="ml-2 text-red-400 hover:text-red-300"
                      title="Remove volunteer"
                    >
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                  
                  <!-- Add volunteer button -->
                  <button
                    v-if="editor"
                    @click="toggleAddUserDropdown()"
                    class="flex items-center gap-2 px-3 py-2 bg-custom-green text-white rounded-lg hover:bg-darker-green transition-colors"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a1 1 0 0 1-1-1v-6H3a1 1 0 1 1 0-2h6V3a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 0 1-1 1z"/>
                    </svg>
                    Add Volunteer
                  </button>
                </div>
                
                <!-- Add user dropdown -->
                <div
                  v-if="showAddUserDropdown && selectedTaskId === recurringTask.id && selectedDay"
                  class="absolute z-10 bg-[rgba(26,26,26,0.95)] border border-[#3d4d36]/50 rounded-lg shadow-lg p-3 w-64 max-h-64 overflow-y-auto"
                >
                  <input
                    v-model="searchQuery"
                    placeholder="Search volunteer..."
                    class="w-full border border-[#3d4d36]/50 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-custom-green"
                  />
                  
                  <ul v-if="filteredVolunteers.length > 0" class="space-y-1">
                    <li
                      v-for="volunteer in filteredVolunteers"
                      :key="volunteer.id"
                      @click="addUserToSchedule(volunteer)"
                      class="px-3 py-2 cursor-pointer hover:bg-[rgba(26,26,26,0.8)] rounded-md text-[#f5f5f5]"
                    >
                      {{ volunteer.attributes.firstName }} {{ volunteer.attributes.lastName }}
                    </li>
                  </ul>
                  <p v-else class="px-3 py-2 text-[#d0d0d0] text-sm">No matching volunteers</p>
                </div>
                
                <div v-if="selectedVolunteers.length === 0 && !editor" class="text-[#d0d0d0] text-sm italic">
                  No volunteers assigned for this day
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Regular Tasks Section (card grid, same style as public tasks page) -->
    <div v-if="editor || regularTasks.length > 0" class="mt-8">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 class="text-xl font-bold text-[#f5f5f5]">Tasks</h3>
        <GardenTask v-if="editor" :garden="garden.id" :editor="editor" />
      </div>
      
      <div v-if="regularTasks.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 ml-3">
        <div
          v-for="task in regularTasks"
          :key="task.id"
          role="button"
          tabindex="0"
          class="bg-[rgba(26,26,26,0.6)] rounded-xl border border-[#3d4d36]/50 overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-custom-green focus:ring-offset-2 focus:ring-offset-[#2d3e26]"
          :class="{ 'hover:border-[#8aa37c]/50': editor }"
          @click="editor && openEditModal(task.id)"
          @keydown.enter="editor && openEditModal(task.id)"
          @keydown.space.prevent="editor && openEditModal(task.id)"
        >
          <!-- Task image -->
          <div class="m-4 rounded-xl aspect-[4/3] overflow-hidden bg-[#1f2d1a]">
            <img
              v-if="getTaskImage(task)"
              :src="getTaskImage(task)"
              :alt="task.attributes?.title || 'Task'"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-12 h-12 text-[#3d4d36]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <!-- Task content -->
          <div class="p-4 space-y-3">
            <!-- Badges -->
            <div class="flex flex-wrap gap-2">
              <span :class="getStatusBadgeClasses(task.attributes?.status)" class="px-3 py-1 rounded-full text-xs font-semibold">
                {{ formatTaskStatus(task.attributes?.status) }}
              </span>
              <span v-if="task.attributes?.type" :class="getTypeBadgeClasses(task.attributes?.type)" class="px-3 py-1 rounded-full text-xs font-semibold">
                {{ task.attributes?.type }}
              </span>
            </div>

            <!-- Title -->
            <h3 class="text-lg font-semibold text-[#f5f5f5] leading-tight">
              {{ task.attributes?.title }}
            </h3>

            <!-- Overview -->
            <p v-if="task.attributes?.overview" class="text-sm text-[#d0d0d0] line-clamp-3">
              {{ task.attributes.overview.length > 120 ? task.attributes.overview.substring(0, 120) + '...' : task.attributes.overview }}
            </p>

            <!-- Instruction link -->
            <div v-if="getTaskInstruction(task)" class="text-sm" @click.stop>
              <a
                :href="'/i/' + getTaskInstruction(task).slug"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#8aa37c] underline hover:text-[#6b8560]"
              >
                {{ getTaskInstruction(task).title }}
              </a>
            </div>

            <!-- Volunteer count -->
            <div class="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(0,0,0,0.2)]">
              <svg class="w-5 h-5 text-[#8aa37c] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
              </svg>
              <span class="text-sm font-medium text-[#d0d0d0]">
                {{ getVolunteerCount(task) }} / {{ task.attributes?.max_volunteers ?? 1 }} volunteers
              </span>
            </div>

            <!-- Edit button (opens GardenTask modal) -->
            <button
              v-if="editor"
              type="button"
              class="w-full flex items-center justify-center gap-2 py-3 px-4 text-base font-semibold text-white bg-custom-green hover:bg-darker-green rounded-lg transition-colors"
              @click.stop="openEditModal(task.id)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          </div>
        </div>
      </div>

      <!-- GardenTask modals for editing (opened via ref.openModal()) -->
      <div
        v-for="task in regularTasks"
        :key="'modal-' + task.id"
        :data-regular-task-id="task.id"
        class="absolute left-[-9999px] opacity-0 pointer-events-none w-0 h-0 overflow-hidden"
        aria-hidden="true"
      >
        <GardenTask
          :ref="(el) => { if (el) regularTaskModalRefs[task.id] = el }"
          v-bind="task.attributes"
          :id="task.id"
          :garden="garden.id"
          :editor="editor"
        />
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-if="recurringTasks.length === 0 && regularTasks.length === 0 && !editor" class="text-[#d0d0d0] italic">
      No tasks available at this time
    </div>
    
    <!-- Confirmation modal for removing day -->
    <Teleport to="#modals">
      <div v-if="dayToDelete.taskId && dayToDelete.day" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-900 opacity-40" @click="cancelRemoveDay"></div>
        
        <!-- Modal -->
        <div class="relative bg-[#2d3e26] rounded-lg shadow-lg p-6 max-w-md w-full mx-4" @click.stop>
          <h3 class="text-lg font-semibold mb-4 text-[#f5f5f5]">Remove Day</h3>
          <p class="text-[#d0d0d0] mb-6">
            Are you sure? You will have to re-setup all the volunteers for this day if you remove this day.
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="cancelRemoveDay"
              class="px-4 py-2 bg-[rgba(26,26,26,0.8)] text-[#f5f5f5] rounded-lg hover:bg-[rgba(26,26,26,1)] transition-colors"
            >
              Cancel
            </button>
            <button
              @click="confirmRemoveDay"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Remove {{ dayToDelete.day }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template> 