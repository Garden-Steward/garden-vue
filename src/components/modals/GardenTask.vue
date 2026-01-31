<script setup>
import { computed, ref, watch } from "vue";
import { useGardenTaskStore, useAlertStore } from '@/stores';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';
import FormToggle from '@/components/Toggle.vue';
import MediaSelector from '@/components/form/MediaSelector.vue';

const props = defineProps({
  title: String,
  blurb: String,
  endText: String,
  startDatetime: String,
  createdAt: String,
  updatedAt: String,
  started_at: String,
  completed_at: String,
  publishedAt: String,
  max_volunteers: Number,
  volunteers: Array,
  id: Number,
  garden: Number,
  dayId: Number,
  interests: Array,
  interest: String,
  task: Object,
  status: String,
  overview: String,
  type: String,
  primary_image: Object,
  recurring_task: Object,
  complete_once: {
    type: Boolean,
    default: false
  },
  editor: {
    type: Boolean,
    default: false
  }
});

const gardenTaskStore = useGardenTaskStore();
const alertStore = useAlertStore();

const show = ref(false);
const copy = ref(false);
const error = ref(false);

// Validation errors for required fields (when creating)
const validationErrors = ref({
  title: false,
  type: false,
  overview: false
});

function clearValidationError(field) {
  if (validationErrors.value[field]) {
    validationErrors.value = { ...validationErrors.value, [field]: false };
  }
}

function validateForm() {
  const titleValid = !!String(form.value.title || '').trim();
  const typeValid = !!String(form.value.type || '').trim();
  const overviewValid = !!String(form.value.overview || '').trim();
  validationErrors.value = {
    title: !titleValid,
    type: !typeValid,
    overview: !overviewValid
  };
  return titleValid && typeValid && overviewValid;
}

const form = ref({
  title: props.title || '',
  type: props.type || '',
  overview: props.overview || '',
  max_volunteers: props.max_volunteers || null,
  status: props.status || '',
  primary_image: props.primary_image || null,
  recurring_task: props.recurring_task || null,
  is_group_task: false,
  complete_once: false,
});

// Store the initial form state for dirty checking
const initialForm = ref({ ...form.value });

const showCreateButton = computed(() => {
  console.log('Editor status:', props.editor);
  console.log('Has ID:', !!props.id);
  return props.editor === true && !props.id;
});

watch(() => props.editor, (newVal) => {
  console.log('Editor prop changed:', newVal);
});

watch(show, (isVisible) => {
  if (!isVisible) {
    validationErrors.value = { title: false, type: false, overview: false };
  }
});

const topic = computed(() => {
  return (props.id) ? "Edit Title:" : "Garden Task Title:";
});

const submitText = computed(() => {
  return (props.id) ? "Update Task" : "Create Task";
});

// Watch handlers
watch(() => props.title, (newVal) => {
  form.value.title = newVal;
});

watch(() => props.type, (newVal) => {
  form.value.type = newVal;
});

watch(() => props.overview, (newVal) => {
  form.value.overview = newVal;
});

watch(() => props.max_volunteers, (newVal) => {
  form.value.max_volunteers = newVal;
});

watch(() => props.volunteers, (newVal) => {
  form.value.volunteers = newVal;
});

watch(() => props.status, (newVal) => {
  form.value.status = newVal;
});

watch(() => props.primary_image, (newVal) => {
  if (newVal) {
    form.value.primary_image = newVal;
  }
});

// Watch for changes to props.task and update initialForm
watch(() => props.task, (newVal) => {
  if (newVal) {
    form.value = {
      ...form.value,
      primary_image: newVal.primary_image || null,
    };
    initialForm.value = { ...form.value };
  }
}, { deep: true });

// Add computed property for filtered volunteers
const filteredVolunteers = computed(() => {
  // If volunteers is an array, return it as-is (legacy support)
  if (Array.isArray(props.volunteers)) {
    return props.volunteers.filter(volunteer => volunteer?.attributes);
  }
  // If volunteers is an object with a data array, return that
  if (props.volunteers?.data && Array.isArray(props.volunteers.data)) {
    return props.volunteers.data.filter(volunteer => volunteer?.attributes);
  }
  return [];
});

// Computed property to check if the form is dirty
const isDirty = computed(() => {
  return Object.keys(form.value).some(key => {
    if (typeof form.value[key] === 'object') {
      return JSON.stringify(form.value[key]) !== JSON.stringify(initialForm.value[key]);
    }
    return form.value[key] !== initialForm.value[key];
  });
});

// Computed property for recurring task titles
const recurringTaskTitles = computed(() => {
  return (gardenTaskStore.recurringTasks || [])
    .map(task => task?.attributes?.title)
    .filter(Boolean);
});

// Track the selected recurring task for instruction display
const selectedRecurringTask = ref(null);

// Add this computed property
const taskInstruction = computed(() => {
    return selectedRecurringTask.value?.attributes?.instruction?.data || 
           form.value.recurring_task?.data?.attributes?.instruction?.data;
});

// Add this computed property
const typeBadgeClasses = computed(() => {
    switch (form.value.type?.toLowerCase()) {
        case 'water':
            return 'bg-blue-100 text-blue-800';
        case 'general':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-green-100 text-green-800';
    }
});

// Methods
// Prepopulate form with recurring task data
function prepopulateFromRecurring(recurringTask) {
  if (!recurringTask?.attributes) return;
  const attrs = recurringTask.attributes;
  // Only update fields that exist in both
  form.value.title = attrs.title || '';
  form.value.type = attrs.type || '';
  form.value.overview = attrs.overview || '';
  form.value.max_volunteers = attrs.max_volunteers || null;
  form.value.recurring_task = recurringTask.id;
  form.value.complete_once = attrs.complete_once || false;
  form.value.primary_image = attrs.primary_image || null;
  selectedRecurringTask.value = recurringTask;
  // You can add more fields if needed
}

const submit = async () => {
  if (!validateForm()) {
    return;
  }
  let message;
  copy.value = false;
  show.value = false;
  form.value.garden = props.garden;
  form.value.volunteer_day = props.dayId;
  try {
    // Ensure primary_image is properly formatted for API (MediaSelector uploads/selects handle image beforehand)
    if (form.value.primary_image?.id || form.value.primary_image?.data?.id) {
      form.value.primary_image = {
        id: form.value.primary_image?.id || form.value.primary_image.data?.id
      };
    }
    // Then proceed with task creation/update
    if (props.id) {
      const updatedTask = await gardenTaskStore.update(props.id, form.value);
      message = 'Garden Task updated';
      if (updatedTask) {
        form.value = { ...form.value, ...updatedTask };
      }
    } else {
      form.value.status = 'INITIALIZED';
      const newTask = await gardenTaskStore.register(form.value);
      message = 'Garden Task added';
      if (newTask) {
        form.value = { ...form.value, ...newTask };
      }
    }
    
    show.value = false;
    alertStore.success(message);
    // Update initialForm after successful submit
    initialForm.value = { ...form.value };
  } catch (error) {
    console.error('Error submitting task:', error);
    alertStore.error('Failed to save task');
  }
};

const primaryImageUrl = computed(() => {
  // MediaSelector format { id, url }
  if (form.value.primary_image?.url) {
    const url = form.value.primary_image.url;
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
  }
  // Strapi formats.medium
  if (form.value.primary_image?.formats?.medium?.url) {
    return form.value.primary_image.formats.medium.url;
  }
  // Strapi data.attributes format
  if (form.value.primary_image?.data?.attributes?.formats?.medium?.url) {
    return form.value.primary_image.data.attributes.formats.medium.url;
  }
  if (form.value.primary_image?.data?.attributes?.url) {
    return form.value.primary_image.data.attributes.url;
  }
  return null;
});

const handleDelete = async () => {
    if (!props.id) return;
    
    // Add confirmation dialog
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        return;
    }
    
    try {
        await gardenTaskStore.delete(props.id);
        alertStore.success('Task deleted successfully');
        show.value = false;
    } catch (error) {
        alertStore.error(error.message || 'Failed to delete task');
    }
};

</script>

<template>
  <div v-if="id" class="bg-purple-50 hover:bg-purple-100 cursor-pointer rounded-lg p-2 pr-0 mb-3 border border-purple-100" @click="show = true">
    <a class="hover:text-purple-700">
      <div class="flex flex-col md:grid md:grid-cols-12 md:gap-4 items-center w-full">
        <!-- Header: Title -->
        <div class="flex w-full items-center md:col-span-4 md:block">
          <div class="text-lg font-medium w-full text-purple-800">{{ form.title }}</div>
        </div>
        <!-- User Profiles: Desktop only -->
        <div class="hidden md:block md:col-span-4">
          <div v-if="filteredVolunteers.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <UserProfileDisplay 
              v-for="volunteer in filteredVolunteers" 
              :key="volunteer.id"
              :volunteer="volunteer.attributes"
            />
          </div>
        </div>
        <!-- Status and Category -->
        <div class="md:col-span-4">
          <!-- Badges -->
          <div class="flex justify-between items-center">
            <span 
              :class="{
                'bg-purple-100 text-purple-800': form.status === 'INITIALIZED',
                'bg-gray-100 text-gray-800': form.status !== 'INITIALIZED'
              }"
              class="px-3 py-1 rounded-full text-sm font-medium"
            >
              {{ form.status === 'INITIALIZED' ? 'Ready' : form.status }}
            </span>
            <span 
              class="px-3 py-1 rounded-full text-sm font-medium"
              :class="typeBadgeClasses"
            >
              {{ form.type }}
            </span>
          </div>
        </div>
        <!-- User Profiles: Mobile only, at bottom -->
        <div class="block md:hidden w-full mt-2">
          <div v-if="filteredVolunteers.length" class="flex flex-wrap gap-2">
            <UserProfileDisplay 
              v-for="volunteer in filteredVolunteers" 
              :key="volunteer.id"
              :volunteer="volunteer.attributes"
            />
          </div>
        </div>
      </div>
    </a>
  </div>
  
  <div v-else-if="showCreateButton">
    <button type="button" class="px-6
                p-2.5
                bg-slate-600
                text-white
                font-medium
                text-xs
                leading-tight
                uppercase
                rounded
                shadow-md
                hover:bg-slate-700 hover:shadow-lg
                focus:bg-slate-700 focus:shadow-lg focus:outline-none focus:ring-0
                active:bg-slate-800 active:shadow-lg
                transition
                duration-150
                ease-in-out
                float-right
                text-sm" @click="show = true">
                Create Task
              </button>
  </div>

  <!-- Render inside our `<div id="modals"></div>` in index.html -->
  <Teleport to="#modals">
    <!-- Show / hide the modal -->
    <div v-if="show" class="w-xl">
      <!-- The backdrop -->
      <div class="fixed inset-0 bg-black/60" @click="()=> {show = false;copy= false}"></div>

      <!-- *** START FORM *** -->
      <form @submit.prevent="submit">
      <div class="fixed inset-0 flex items-center justify-start overflow-x-hidden overflow-y-auto py-6" @click="()=> {show = false;copy= false}">
        <div class="garden-task-modal-content grid grid-cols-1 md:w-1/2 w-[90%] gap-2 p-3 md:p-8 mx-auto max-w-[95vw] max-h-[90vh] overflow-y-auto my-auto relative rounded-lg border border-[#3d4d36] shadow-xl" @click.stop>
          <!-- Close X button -->
          <button 
            type="button" 
            class="absolute top-2 right-2 text-[#d0d0d0] hover:text-[#f5f5f5] focus:outline-none"
            @click="()=> {show = false;copy= false}"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <slot></slot>

          <!-- Recurring Tasks Titles - only show when creating new task -->
          <div v-if="!props.id && recurringTaskTitles.length" class="mb-2">
            <div class="font-semibold text-[#f5f5f5] mb-1">Available Templates:</div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="task in gardenTaskStore.recurringTasks"
                :key="task.id"
                class="bg-[rgba(26,26,26,0.6)] text-[#8aa37c] rounded-full px-3 py-1 text-sm font-medium cursor-pointer shadow-sm border border-[#3d4d36] hover:bg-[rgba(26,26,26,0.8)] transition"
                tabindex="0"
                @click="prepopulateFromRecurring(task)"
              >
                {{ task.attributes.title }}
              </span>
            </div>
          </div>

          <!-- Show instruction link -->
          <div v-if="taskInstruction" class="mb-2">
              <span class="text-[#8aa37c] font-semibold">Task has an instruction </span>
              <a
                class="text-[#8aa37c] underline hover:text-[#6b8560]"
                :href="'/i/' + taskInstruction.attributes.slug"
                target="_blank"
              >
                {{ taskInstruction.attributes.title }}
              </a>
          </div>

          <div class="flex items-center gap-4 mb-3">
            <div class="flex-1">
              <p class="pb-1 text-[#f5f5f5]">{{ topic }} <span class="text-red-400">*</span></p>
              <input 
                :class="[
                  'garden-task-input p-1 rounded-md border w-full leading-tight bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] border-[#3d4d36] placeholder-[#9ca3af] focus:bg-[rgba(40,50,35,0.9)] focus:border-[#8aa37c] focus:outline-none focus:ring-1 focus:ring-[#8aa37c]/50',
                  validationErrors.title ? 'border-2 border-red-500' : ''
                ]"
                type="text"
                v-model="form.title"
                @input="clearValidationError('title')"
              />
            </div>
          </div>

          <!-- Group Task Toggle -->
          <div class="mb-4">
            <FormToggle
              v-model="form.is_group_task"
              label="Show Group Task Settings"
              :dark="true"
            />
          </div>

          <!-- Group Task Options -->
          <div v-if="form.is_group_task" class="bg-[rgba(26,26,26,0.6)] p-4 rounded-lg mb-4 space-y-4 border border-[#3d4d36]">
            <!-- Max Users -->
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-1">
                <svg class="w-5 h-5 text-[#8aa37c]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                </svg>
                <span class="text-[#f5f5f5] font-medium">Max Volunteers:</span>
              </div>
              <select v-model="form.max_volunteers" class="garden-task-input rounded-md border border-[#3d4d36] p-1 w-20 bg-[rgba(26,26,26,0.6)] text-[#f5f5f5]">
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
                <option>99</option>
              </select>
            </div>

            <!-- Complete Once Toggle -->
            <div>
              <FormToggle
                v-model="form.complete_once"
                label="Complete Once: Once complete, it's complete for everyone."
                :dark="true"
              />
            </div>
          </div>

          <p class="p-1 pb-0 mb-0 mt-0 text-[#f5f5f5]">Explain the task more: <span class="text-red-400">*</span></p>
          <textarea
            v-model="form.overview"
            :class="[
              'garden-task-input form-control px-3 py-2 m-r-4 mb-1 w-full rounded-md border bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] border-[#3d4d36] placeholder-[#9ca3af] focus:bg-[rgba(40,50,35,0.9)] focus:border-[#8aa37c] focus:outline-none focus:ring-1 focus:ring-[#8aa37c]/50',
              validationErrors.overview ? 'border-2 border-red-500' : ''
            ]"
            rows="5"
            @input="clearValidationError('overview')"
          ></textarea>

          <div class="flex flex-col space-y-2 mb-4">
            <label class="text-sm font-medium text-[#f5f5f5]">Add Photo</label>
            
            <!-- Show selected/current image preview -->
            <img 
              v-if="primaryImageUrl" 
              :src="primaryImageUrl" 
              class="mt-2 max-w-xs rounded-lg shadow-md" 
              alt="Task image"
            />
            
            <!-- MediaSelector: Choose existing or upload new (with compression) -->
            <div v-if="garden" class="mt-2">
              <MediaSelector
                v-model="form.primary_image"
                :garden-id="garden"
                :multiple="false"
                :dark="true"
                placeholder="Select or upload image"
              />
            </div>
          </div>

          <p class="p-1 pb-0 text-md text-[#f5f5f5] mb-0">What kind of task?: <span class="text-red-400">*</span></p>
          <select
            v-model="form.type"
            :class="[
              'garden-task-input rounded-md border p-1 ml-1 text-lg bg-[rgba(26,26,26,0.6)] text-[#f5f5f5] border-[#3d4d36] focus:bg-[rgba(40,50,35,0.9)] focus:border-[#8aa37c] focus:outline-none focus:ring-1 focus:ring-[#8aa37c]/50',
              validationErrors.type ? 'border-2 border-red-500' : ''
            ]"
            @change="clearValidationError('type')"
          >
            <option value="" class="text-lg py-1">Select task type...</option>
            <option class="text-lg py-1" value="General">General</option>
            <option class="text-lg py-1" value="Water">Water</option>
            <option class="text-lg py-1" value="Weeding">Weeding</option>
            <option class="text-lg py-1" value="Planting">Planting</option>
            <option class="text-lg py-1" value="Harvest">Harvest</option>
          </select>

          <div class="modal-footer flex flex-shrink-0 flex-col gap-3 p-4 border-t border-[#3d4d36] rounded-b-md">
            <div v-if="validationErrors.title || validationErrors.type || validationErrors.overview" class="w-full text-red-400 text-sm">
              Please fill in all required fields: Title, What kind of task, and Explain the task more.
            </div>
            <div v-if="error" class="w-full text-red-400 text-sm">Error loading garden task: {{error}}</div>
            <div class="flex items-center justify-between w-full">
              <div class="flex-1 min-w-0">
                <button
                  v-if="props.id && props.status === 'INITIALIZED'"
                  type="button"
                  class="text-red-400 hover:text-red-300 underline text-sm focus:outline-none"
                  @click="handleDelete"
                >
                  Delete Task
                </button>
              </div>
              <button
                v-if="isDirty"
                class="px-6 py-2.5 bg-orange-700 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-orange-800 hover:shadow-lg focus:bg-orange-800 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-orange-900 active:shadow-lg transition duration-150 ease-in-out"
                type="submit"
              >
                {{ submitText }}
              </button>
            </div>
          </div>
        </div>
      </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.garden-task-modal-content {
  background-color: #2d3e26;
  color: #f5f5f5;
}

/* Keep form inputs dark on focus - override Bootstrap and browser defaults */
.garden-task-modal-content .garden-task-input:focus {
  background-color: rgba(40, 50, 35, 0.9) !important;
}

.garden-task-modal-content textarea.form-control:focus {
  background-color: rgba(40, 50, 35, 0.9) !important;
}

/* Override autofill light background */
.garden-task-modal-content .garden-task-input:-webkit-autofill,
.garden-task-modal-content .garden-task-input:-webkit-autofill:focus,
.garden-task-modal-content textarea:-webkit-autofill,
.garden-task-modal-content textarea:-webkit-autofill:focus {
  -webkit-text-fill-color: #f5f5f5;
  -webkit-box-shadow: 0 0 0 1000px rgba(40, 50, 35, 0.95) inset;
  transition: background-color 5000s ease-in-out 0s;
}

/* Remove white/light borders - keep dark borders only */
.garden-task-modal-content .garden-task-input,
.garden-task-modal-content input.garden-task-input,
.garden-task-modal-content select.garden-task-input,
.garden-task-modal-content textarea.garden-task-input {
  border-color: #3d4d36 !important;
}

.garden-task-modal-content .garden-task-input:focus,
.garden-task-modal-content input.garden-task-input:focus,
.garden-task-modal-content select.garden-task-input:focus,
.garden-task-modal-content textarea.garden-task-input:focus {
  border-color: #8aa37c !important;
  box-shadow: 0 0 0 1px rgba(138, 163, 124, 0.5) !important;
}

.text-peach-800 {
  color: #9B4E34;
}
.bg-peach-100 {
  background-color: #FFE5D9;
}
.bg-green-100 {
  background-color: #DCFCE7;
}
.text-green-800 {
  color: #166534;
}
.bg-blue-100 {
  background-color: #DBEAFE;
}
.text-blue-800 {
  color: #1E40AF;
}
.bg-gray-100 {
  background-color: #F3F4F6;
}
.text-gray-800 {
  color: #1F2937;
}
.bg-purple-100 {
  background-color: #F3E8FF;
}
.text-purple-800 {
  color: #6B21A8;
}
</style>