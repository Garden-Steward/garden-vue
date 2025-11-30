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

// Open edit modal for a task
const openEditModal = (taskId) => {
  openTaskModals.value[taskId] = true;
  // Use nextTick to ensure the component is rendered, then find and click the card
  nextTick(() => {
    setTimeout(() => {
      // Find the hidden GardenTask card and click it
      const hiddenContainer = document.querySelector(`[data-task-id="${taskId}"]`);
      if (hiddenContainer) {
        const card = hiddenContainer.querySelector('.bg-purple-50, .cursor-pointer');
        if (card) {
          card.click();
        }
      }
    }, 100);
  });
};
</script>

<template>
  <div class="bg-white p-1 md:p-6 rounded-lg shadow-md mb-4">
    
    <!-- Recurring Tasks Section (with scheduling) -->
    <div v-if="recurringTasks.length > 0" class="mb-8">
      <h3 class="text-xl font-bold mb-4">Recurring Tasks</h3>
      
      <div class="space-y-4">
        <div v-for="recurringTask in recurringTasks" :key="recurringTask.id" class="ml-3">
          <!-- Display recurring task info -->
          <div class="bg-gray-50 rounded-lg border border-gray-200 mb-2 overflow-hidden">
            <!-- Always visible header -->
            <div 
              class="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
              @click="toggleDrawer(recurringTask.id)"
            >
              <div class="flex items-center justify-between">
                <div class="text-lg font-medium text-gray-800">
                  {{ recurringTask.attributes?.title }}
                </div>
                <div class="flex gap-2 items-center">
                  <span 
                    class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                  >
                    {{ recurringTask.attributes?.type || 'General' }}
                  </span>
                  <svg 
                    class="w-5 h-5 text-gray-500 transition-transform"
                    :class="{ 'rotate-180': openDrawers[recurringTask.id] }"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Drawer content (description, last updated, Edit button, Add Day) -->
            <div 
              v-if="openDrawers[recurringTask.id]"
              class="px-4 pb-4 border-t border-gray-200 pt-4 space-y-3"
            >
              <div v-if="recurringTask.attributes?.overview" class="text-sm text-gray-600">
                {{ recurringTask.attributes.overview }}
              </div>
              <div v-if="recurringTask.attributes?.updatedAt" class="text-xs text-gray-500">
                Last updated: {{ formatDate(recurringTask.attributes.updatedAt) }}
              </div>
              
              <div v-if="editor" class="pt-2">
                <button
                  @click.stop="openEditModal(recurringTask.id)"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
          
          <!-- Edit modal for recurring task - always render but hide the card -->
          <div :data-task-id="recurringTask.id" style="position: absolute; left: -9999px; opacity: 0; pointer-events: none;">
            <GardenTask
              v-bind="recurringTask.attributes"
              :id="recurringTask.id"
              :garden="garden.id"
              :editor="editor"
            />
          </div>
          
          <!-- Day tags and volunteer management for recurring tasks -->
          <div class="mt-3 ml-0 bg-white rounded-lg p-4 border border-gray-200">
            <!-- Day tags with Edit option -->
            <div class="mb-3">
              <div class="flex items-center justify-between mb-2">
                <div class="flex flex-wrap gap-2 items-center">
                  <button
                    v-for="day in getDaysForTask(recurringTask)"
                    :key="day"
                    @click="!dayEditMode[recurringTask.id] && handleDayClick(recurringTask, day)"
                    :class="[
                      'px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1',
                      selectedTaskId === recurringTask.id && selectedDay === day
                        ? 'bg-purple-600 text-white'
                        : dayHasVolunteers(recurringTask, day)
                          ? 'bg-purple-200 text-purple-800 hover:bg-purple-300'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300',
                      dayEditMode[recurringTask.id] ? 'cursor-default' : 'cursor-pointer'
                    ]"
                  >
                    {{ day }}
                    <button
                      v-if="dayEditMode[recurringTask.id] && editor"
                      @click.stop="removeDay(recurringTask, day)"
                      class="ml-1 text-red-500 hover:text-red-700"
                      title="Remove day"
                    >
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                      </svg>
                    </button>
                  </button>
                  
                  <!-- Add Day button (+) -->
                  <button
                    v-if="editor && !dayEditMode[recurringTask.id]"
                    @click.stop="toggleAddDayForm(recurringTask.id)"
                    class="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors flex items-center justify-center w-8 h-8"
                    title="Add day"
                  >
                    <span class="text-lg font-bold leading-none">+</span>
                  </button>
                </div>
                <button
                  v-if="editor"
                  @click="toggleDayEditMode(recurringTask.id)"
                  class="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {{ dayEditMode[recurringTask.id] ? 'Done' : 'Edit' }}
                </button>
              </div>
              
              <!-- Add Day form (shown when + is clicked) -->
              <div v-if="showAddDayForm[recurringTask.id] && editor" class="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div class="flex items-start gap-2">
                  <select
                    v-model="newDaySelection[recurringTask.id]"
                    class="w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a day...</option>
                    <option 
                      v-for="day in getAvailableDaysForTask(recurringTask)"
                      :key="day"
                      :value="day"
                    >
                      {{ day }}
                    </option>
                  </select>
                  <div class="flex gap-2">
                    <button
                      @click.stop="createNewScheduler(recurringTask)"
                      :disabled="!newDaySelection[recurringTask.id]"
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <button
                      @click.stop="toggleAddDayForm(recurringTask.id)"
                      class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Selected day volunteers display -->
            <div v-if="selectedTaskId === recurringTask.id && selectedDay" class="mt-4 border-t border-gray-200 pt-4">
              <div class="relative">
                <!-- Volunteers list -->
                <div class="flex flex-wrap items-center gap-3 mb-3">
                  <div v-for="volunteer in selectedVolunteers" :key="volunteer.id" class="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <UserProfileDisplay :volunteer="volunteer.attributes" />
                    <span class="text-sm font-medium">{{ volunteer.attributes.firstName }} {{ volunteer.attributes.lastName }}</span>
                    <button
                      v-if="editor"
                      @click="deleteUser(volunteer.id)"
                      class="ml-2 text-red-500 hover:text-red-700"
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
                    class="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
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
                  class="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-64 max-h-64 overflow-y-auto"
                >
                  <input
                    v-model="searchQuery"
                    placeholder="Search volunteer..."
                    class="w-full border border-gray-300 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <ul v-if="filteredVolunteers.length > 0" class="space-y-1">
                    <li
                      v-for="volunteer in filteredVolunteers"
                      :key="volunteer.id"
                      @click="addUserToSchedule(volunteer)"
                      class="px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-md"
                    >
                      {{ volunteer.attributes.firstName }} {{ volunteer.attributes.lastName }}
                    </li>
                  </ul>
                  <p v-else class="px-3 py-2 text-gray-500 text-sm">No matching volunteers</p>
                </div>
                
                <div v-if="selectedVolunteers.length === 0 && !editor" class="text-gray-500 text-sm italic">
                  No volunteers assigned for this day
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Regular Tasks Section (simple list) -->
    <div v-if="regularTasks.length > 0" class="mt-8">
      <h3 class="text-xl font-bold mb-4">Tasks</h3>
      
      <!-- Headers for desktop -->
      <div class="hidden md:grid md:grid-cols-12 md:gap-4 mb-2">
        <div class="col-span-4"></div>
        <div class="col-span-4"></div>
        <div class="col-span-4 flex justify-between text-sm text-gray-600">
          <span>Status</span>
          <span>Category</span>
        </div>
      </div>
      
      <div class="space-y-4">
        <div v-for="task in regularTasks" :key="task.id" class="ml-3">
          <!-- Task info card -->
          <div class="bg-gray-50 rounded-lg border border-gray-200 mb-2 overflow-hidden">
            <!-- Always visible header -->
            <div 
              class="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
              @click="toggleDrawer(task.id)"
            >
              <div class="flex items-center justify-between">
                <div class="text-lg font-medium text-gray-800">
                  {{ task.attributes?.title }}
                </div>
                <div class="flex gap-2 items-center">
                  <span 
                    class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                  >
                    {{ task.attributes?.type || 'General' }}
                  </span>
                  <svg 
                    class="w-5 h-5 text-gray-500 transition-transform"
                    :class="{ 'rotate-180': openDrawers[task.id] }"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Drawer content (description, last updated, Edit button) -->
            <div 
              v-if="openDrawers[task.id]"
              class="px-4 pb-4 border-t border-gray-200 pt-4 space-y-3"
            >
              <div v-if="task.attributes?.overview" class="text-sm text-gray-600">
                {{ task.attributes.overview }}
              </div>
              <div v-if="task.attributes?.updatedAt" class="text-xs text-gray-500">
                Last updated: {{ formatDate(task.attributes.updatedAt) }}
              </div>
              <div v-if="editor" class="pt-2">
                <button
                  @click.stop="openEditModal(task.id)"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
          
          <!-- Edit modal for regular task - always render but hide the card -->
          <div :data-task-id="task.id" style="position: absolute; left: -9999px; opacity: 0; pointer-events: none;">
            <GardenTask
              v-bind="task.attributes" 
              :id="task.id"
              :garden="garden.id"
              :editor="editor"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-if="recurringTasks.length === 0 && regularTasks.length === 0" class="text-gray-500 italic">
      No tasks available at this time
    </div>

    <!-- Create new task button for editors -->
    <div v-if="editor" class="mt-4">
      <GardenTask 
        :garden="garden.id"
        :editor="editor"
      />
    </div>
    
    <!-- Confirmation modal for removing day -->
    <Teleport to="#modals">
      <div v-if="dayToDelete.taskId && dayToDelete.day" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-900 opacity-40" @click="cancelRemoveDay"></div>
        
        <!-- Modal -->
        <div class="relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4" @click.stop>
          <h3 class="text-lg font-semibold mb-4">Remove Day</h3>
          <p class="text-gray-700 mb-6">
            Are you sure? You will have to re-setup all the volunteers for this day if you remove this day.
          </p>
          <div class="flex justify-end gap-3">
            <button
              @click="cancelRemoveDay"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
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