<script setup>
import { computed, ref, watch } from "vue";
import { useGardenTaskStore, useAlertStore, instructionStore } from '@/stores';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';
import FormToggle from '@/components/Toggle.vue';
import MediaSelector from '@/components/form/MediaSelector.vue';
import {
  taskStatusOptions,
  getTaskStatusOption,
  DEFAULT_TASK_STATUS,
  recurringSchedulerTypes,
  weekStartDayOptions
} from '@/_config/GardenConfig';

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
  },
  /** True when editing a recurring-task template (not a one-off garden task). */
  isRecurringTemplate: {
    type: Boolean,
    default: false
  },
  scheduler_type: String,
  week_start_date: String,
  instruction: [Object, Array]
});

const gardenTaskStore = useGardenTaskStore();
const alertStore = useAlertStore();

const show = ref(false);
const copy = ref(false);
const error = ref(false);

// Multi-step state (only used when creating a new task on a mobile-friendly flow)
const currentStep = ref(1);
const totalSteps = 5;
const showTemplatePicker = ref(false);
const saveAsTemplate = ref(false);

const taskTypes = ['General', 'Water', 'Weeding', 'Planting', 'Harvest'];

// Validation errors for required fields (when creating)
const validationErrors = ref({
  title: false,
  type: false,
  overview: false,
  scheduler_type: false
});

function clearValidationError(field) {
  if (validationErrors.value[field]) {
    validationErrors.value = { ...validationErrors.value, [field]: false };
  }
}

function validateForm() {
  if (props.isRecurringTemplate) {
    const titleValid = !!String(form.value.title || '').trim();
    const typeValid = !!String(form.value.type || '').trim();
    const overviewValid = !!String(form.value.overview || '').trim();
    const schedValid = !!String(form.value.scheduler_type || '').trim();
    validationErrors.value = {
      title: !titleValid,
      type: !typeValid,
      overview: !overviewValid,
      scheduler_type: !schedValid
    };
    return titleValid && typeValid && overviewValid && schedValid;
  }
  const titleValid = !!String(form.value.title || '').trim();
  const typeValid = !!String(form.value.type || '').trim();
  const overviewValid = !!String(form.value.overview || '').trim();
  validationErrors.value = {
    title: !titleValid,
    type: !typeValid,
    overview: !overviewValid,
    scheduler_type: false
  };
  return titleValid && typeValid && overviewValid;
}

const form = ref({
  title: props.title || '',
  type: props.type || '',
  overview: props.overview || '',
  max_volunteers: props.max_volunteers || null,
  status: (props.status && getTaskStatusOption(props.status).value) || DEFAULT_TASK_STATUS,
  primary_image: props.primary_image || null,
  recurring_task: props.recurring_task || null,
  is_group_task: false,
  complete_once: false,
});

// Reset step state whenever the modal opens for creation
watch(show, (isVisible) => {
  if (isVisible && !props.id) {
    currentStep.value = 1;
    showTemplatePicker.value = false;
    saveAsTemplate.value = false;
  }
});

function canAdvance(step) {
  if (step === 2) return !!String(form.value.title || '').trim();
  if (step === 3) return !!String(form.value.type || '').trim();
  if (step === 4) return !!String(form.value.overview || '').trim();
  return true;
}

function goNext() {
  if (!canAdvance(currentStep.value)) {
    if (currentStep.value === 2) validationErrors.value = { ...validationErrors.value, title: true };
    if (currentStep.value === 3) validationErrors.value = { ...validationErrors.value, type: true };
    if (currentStep.value === 4) validationErrors.value = { ...validationErrors.value, overview: true };
    return;
  }
  if (currentStep.value < totalSteps) {
    currentStep.value += 1;
  }
}

function goBack() {
  if (currentStep.value > 1) currentStep.value -= 1;
}

function pickTemplate(task) {
  prepopulateFromRecurring(task);
  showTemplatePicker.value = false;
}

function selectType(type) {
  form.value.type = type;
  clearValidationError('type');
}

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
    validationErrors.value = { title: false, type: false, overview: false, scheduler_type: false };
  }
});

const topic = computed(() => {
  if (props.id && props.isRecurringTemplate) return 'Title';
  return (props.id) ? "Edit Title:" : "Garden Task Title:";
});

const submitText = computed(() => {
  if (props.id && props.isRecurringTemplate) return 'Save recurring task';
  return (props.id) ? "Update Task" : "Create Task";
});

const instructionInstStore = instructionStore();
const instructionOptions = ref([]);

/** Map Strapi instruction relation prop → `{ id }` for the payload. */
function instructionRelationToForm(rel) {
  if (rel == null) return null;
  const wrapped = rel.data != null ? rel.data : rel;
  const raw = wrapped?.id != null ? wrapped.id : wrapped;
  const id = typeof raw === 'object' && raw?.id != null ? raw.id : raw;
  if (id == null || id === '') return null;
  const n = Number(id);
  return Number.isFinite(n) ? { id: n } : null;
}

function normalizeMediaFromProps(media) {
  // v5 media is already a flat object.
  return media || null;
}

async function loadInstructionOptions() {
  const gid = props.garden;
  if (!gid || !props.isRecurringTemplate) return;
  instructionOptions.value = await instructionInstStore.findByGarden(gid);
}

function syncRecurringFormFromProps() {
  form.value = {
    title: props.title || '',
    type: props.type || '',
    overview: props.overview || '',
    max_volunteers: props.max_volunteers != null && props.max_volunteers !== '' ? Number(props.max_volunteers) : null,
    primary_image: normalizeMediaFromProps(props.primary_image),
    complete_once: !!props.complete_once,
    scheduler_type: props.scheduler_type || '',
    week_start_date: props.week_start_date || 'Sunday',
    instruction: instructionRelationToForm(props.instruction)
  };
  initialForm.value = JSON.parse(JSON.stringify(form.value));
}

watch(show, (visible) => {
  if (visible && props.id && props.isRecurringTemplate) {
    syncRecurringFormFromProps();
    loadInstructionOptions();
  }
});

const instructionSelectId = computed({
  get() {
    return form.value.instruction?.id ?? '';
  },
  set(v) {
    if (v === '' || v == null) {
      form.value.instruction = null;
    } else {
      form.value.instruction = { id: Number(v) };
    }
  }
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
  if (props.isRecurringTemplate) return;
  form.value.volunteers = newVal;
});

watch(() => props.status, (newVal) => {
  if (props.isRecurringTemplate) return;
  form.value.status = (newVal && getTaskStatusOption(newVal).value) || DEFAULT_TASK_STATUS;
});

watch(() => props.primary_image, (newVal) => {
  if (newVal) {
    form.value.primary_image = newVal;
  }
});

// Watch for changes to props.task and update initialForm
watch(() => props.task, (newVal) => {
  if (props.isRecurringTemplate) return;
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
  // v5: volunteers is a flat array of user objects.
  return Array.isArray(props.volunteers) ? props.volunteers.filter(v => v?.id) : [];
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
    .map(task => task?.title)
    .filter(Boolean);
});

// Track the selected recurring task for instruction display
const selectedRecurringTask = ref(null);

// v5: instruction is a flat relation object on the recurring task.
const taskInstruction = computed(() => {
    return selectedRecurringTask.value?.instruction || null;
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

// Status pill color classes for the editor's status dropdown
const statusPillClass = computed(
  () => {
    const option = getTaskStatusOption(form.value.status);
    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    return isDarkMode && option.darkPillClass
      ? `${option.pillClass} ${option.darkPillClass}`
      : option.pillClass;
  }
);

// Methods
// Prepopulate form with recurring task data
function prepopulateFromRecurring(recurringTask) {
  if (!recurringTask) return;
  const attrs = recurringTask;
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

/** Clear all create-modal state after a successful POST so the next open starts empty. */
function resetFormAfterSuccessfulCreate() {
  form.value = {
    title: '',
    type: '',
    overview: '',
    max_volunteers: null,
    status: DEFAULT_TASK_STATUS,
    primary_image: null,
    recurring_task: null,
    is_group_task: false,
    complete_once: false
  };
  initialForm.value = { ...form.value };
  currentStep.value = 1;
  showTemplatePicker.value = false;
  saveAsTemplate.value = false;
  selectedRecurringTask.value = null;
  validationErrors.value = { title: false, type: false, overview: false, scheduler_type: false };
}

const submit = async () => {
  if (!validateForm()) {
    return;
  }
  let message;
  copy.value = false;
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
      if (props.isRecurringTemplate) {
        const recurringPayload = {
          title: form.value.title,
          overview: form.value.overview,
          type: form.value.type,
          complete_once: form.value.complete_once,
          max_volunteers: form.value.max_volunteers,
          scheduler_type: form.value.scheduler_type,
          week_start_date: form.value.week_start_date,
          garden: props.garden
        };
        if (form.value.primary_image?.id || form.value.primary_image?.data?.id) {
          recurringPayload.primary_image = {
            id: form.value.primary_image?.id || form.value.primary_image?.data?.id
          };
        }
        recurringPayload.instruction = form.value.instruction?.id ?? null;

        const updatedAttrs = await gardenTaskStore.updateRecurring(props.id, recurringPayload);
        message = 'Recurring task updated';
        if (updatedAttrs) {
          form.value = {
            title: updatedAttrs.title || '',
            type: updatedAttrs.type || '',
            overview: updatedAttrs.overview || '',
            max_volunteers: updatedAttrs.max_volunteers != null && updatedAttrs.max_volunteers !== '' ? Number(updatedAttrs.max_volunteers) : null,
            primary_image: normalizeMediaFromProps(updatedAttrs.primary_image),
            complete_once: !!updatedAttrs.complete_once,
            scheduler_type: updatedAttrs.scheduler_type || '',
            week_start_date: updatedAttrs.week_start_date || 'Sunday',
            instruction: instructionRelationToForm(updatedAttrs.instruction)
          };
          initialForm.value = JSON.parse(JSON.stringify(form.value));
        }
      } else {
        const updatedTask = await gardenTaskStore.update(props.id, form.value);
        message = 'Garden Task updated';
        if (updatedTask) {
          form.value = { ...form.value, ...updatedTask };
        }
      }
    } else {
      form.value.status = 'INITIALIZED';
      const newTask = await gardenTaskStore.register(form.value);
      message = 'Garden Task added';
      if (newTask) {
        form.value = { ...form.value, ...newTask };
      }
      // Optionally also save this task as a recurring template
      if (saveAsTemplate.value) {
        try {
          const templatePayload = {
            title: form.value.title,
            type: form.value.type,
            overview: form.value.overview,
            max_volunteers: form.value.max_volunteers,
            complete_once: form.value.complete_once,
            primary_image: form.value.primary_image,
            garden: props.garden
          };
          await gardenTaskStore.registerRecurring(templatePayload);
          alertStore.success('Saved as new template');
        } catch (templateErr) {
          console.error('Error saving template:', templateErr);
          alertStore.error('Task created, but failed to save as template');
        }
      }
    }

    show.value = false;
    alertStore.success(message);
    if (!props.id) {
      resetFormAfterSuccessfulCreate();
    } else if (!props.isRecurringTemplate) {
      initialForm.value = { ...form.value };
    }
  } catch (error) {
    console.error('Error submitting task:', error);
    alertStore.error('Failed to save task');
  }
};

const handleDelete = async () => {
    if (!props.id) return;
    if (props.isRecurringTemplate) return;

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

// Expose so parent can open modal programmatically (e.g. GardenTaskList)
function openModal() {
  show.value = true;
}
defineExpose({ openModal });

</script>

<template>
  <div v-if="id" class="bg-purple-50 hover:bg-purple-100 cursor-pointer rounded-lg p-2 pr-0 mb-3 border border-purple-100" data-garden-task-trigger @click="show = true">
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
              :volunteer="volunteer"
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
              :volunteer="volunteer"
            />
          </div>
        </div>
      </div>
    </a>
  </div>
  
  <div v-else-if="showCreateButton" class="inline-flex shrink-0">
    <button
      type="button"
      class="gt-create-trigger px-5 py-2.5 font-semibold text-sm rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out"
      @click="show = true"
    >
      + Create
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
        <div class="garden-task-modal-content grid grid-cols-1 md:w-1/2 w-[90%] gap-2 p-3 md:p-8 mx-auto max-w-[95vw] max-h-[90vh] overflow-y-auto my-auto relative rounded-lg shadow-xl" @click.stop>
          <!-- Close X button -->
          <button
            type="button"
            class="gt-close-btn absolute top-2 right-2 focus:outline-none"
            @click="()=> {show = false;copy= false}"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <slot></slot>

          <!-- ============================================ -->
          <!-- MULTI-STEP CREATE FLOW (mobile-first)         -->
          <!-- ============================================ -->
          <template v-if="!props.id">
            <h2 class="gt-text text-xl font-semibold text-center mb-2 pr-6">Create a Task</h2>

            <!-- Progress indicator -->
            <div class="flex items-center justify-center gap-1.5 mb-4 select-none">
              <template v-for="n in totalSteps" :key="`progress-${n}`">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
                  :class="n <= currentStep ? 'gt-step-active' : 'gt-step-inactive'"
                >{{ n }}</div>
                <div
                  v-if="n < totalSteps"
                  class="w-6 h-0.5 transition-colors"
                  :class="n < currentStep ? 'gt-step-bar-active' : 'gt-step-bar-inactive'"
                ></div>
              </template>
            </div>

            <!-- Step 1: Photo + Create from Template -->
            <div v-if="currentStep === 1" class="gt-step space-y-4">
              <p class="gt-text font-semibold text-center">Add a photo</p>

              <div v-if="garden" class="flex justify-center">
                <MediaSelector
                  v-model="form.primary_image"
                  :garden-id="garden"
                  :multiple="false"
                  placeholder="Take or upload a photo"
                />
              </div>

              <!-- Create from Template -->
              <div v-if="recurringTaskTitles.length" class="gt-subsection p-3 rounded-lg">
                <button
                  type="button"
                  class="w-full flex items-center justify-between gt-text font-medium"
                  @click="showTemplatePicker = !showTemplatePicker"
                >
                  <span>Create from Template</span>
                  <svg
                    class="w-5 h-5 transition-transform"
                    :class="{ 'rotate-180': showTemplatePicker }"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div v-if="showTemplatePicker" class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-for="task in gardenTaskStore.recurringTasks"
                    :key="task.id"
                    class="gt-template-chip rounded-full px-3 py-1 text-sm font-medium cursor-pointer shadow-sm transition"
                    tabindex="0"
                    @click="pickTemplate(task)"
                  >
                    {{ task.title }}
                  </span>
                </div>
              </div>

              <div v-if="taskInstruction" class="text-sm">
                <span class="gt-accent font-semibold">Task has an instruction </span>
                <a class="gt-accent underline hover:opacity-80" :href="'/i/' + taskInstruction.slug" target="_blank">
                  {{ taskInstruction.title }}
                </a>
              </div>
            </div>

            <!-- Step 2: Title -->
            <div v-else-if="currentStep === 2" class="gt-step space-y-3">
              <p class="gt-text font-semibold text-center">What's this task called?</p>
              <input
                v-model="form.title"
                type="text"
                placeholder="e.g. Water the tomatoes"
                :class="[
                  'garden-task-input gt-input w-full px-4 py-3 text-lg md:text-base rounded-md border focus:outline-none focus:ring-1',
                  validationErrors.title ? 'border-2 !border-red-500' : ''
                ]"
                @input="clearValidationError('title')"
                @keydown.enter.prevent="goNext"
                autofocus
              />
            </div>

            <!-- Step 3: Type -->
            <div v-else-if="currentStep === 3" class="gt-step space-y-3">
              <p class="gt-text font-semibold text-center">What kind of task?</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="type in taskTypes"
                  :key="type"
                  type="button"
                  class="gt-type-btn px-4 py-3 rounded-lg border-2 text-base font-medium transition"
                  :class="form.type === type ? 'gt-type-btn-active' : ''"
                  @click="selectType(type)"
                >
                  {{ type }}
                </button>
              </div>
              <p v-if="validationErrors.type" class="text-red-500 text-sm text-center">Please pick a type.</p>
            </div>

            <!-- Step 4: Overview -->
            <div v-else-if="currentStep === 4" class="gt-step space-y-3">
              <p class="gt-text font-semibold text-center">Explain the task</p>
              <textarea
                v-model="form.overview"
                placeholder="Describe what needs to be done..."
                rows="5"
                :class="[
                  'garden-task-input gt-input w-full px-4 py-3 text-lg md:text-base rounded-md border focus:outline-none focus:ring-1',
                  validationErrors.overview ? 'border-2 !border-red-500' : ''
                ]"
                @input="clearValidationError('overview')"
                autofocus
              ></textarea>
            </div>

            <!-- Step 5: Group settings + Save as template + Submit -->
            <div v-else-if="currentStep === 5" class="gt-step space-y-4">
              <p class="gt-text font-semibold text-center">Almost done</p>

              <FormToggle
                v-model="form.is_group_task"
                label="This is a group task"
              />

              <div v-if="form.is_group_task" class="gt-subsection p-4 rounded-lg space-y-4">
                <div class="flex items-center gap-3">
                  <span class="gt-text font-medium">Max Volunteers:</span>
                  <select v-model="form.max_volunteers" class="garden-task-input gt-input rounded-md border p-1 w-20">
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                    <option>5</option>
                    <option>99</option>
                  </select>
                </div>
                <FormToggle
                  v-model="form.complete_once"
                  label="Complete Once: when complete, it's done for everyone."
                />
              </div>

              <FormToggle
                v-model="saveAsTemplate"
                label="Save this task as a new template"
                description="Reuse it later from the Templates list."
              />
            </div>

            <!-- Footer: back / next / submit -->
            <div class="modal-footer gt-footer flex flex-col gap-3 pt-4 mt-2 border-t rounded-b-md">
              <div v-if="error" class="w-full text-red-600 text-sm">Error: {{ error }}</div>
              <div class="flex items-center justify-between gap-3">
                <button
                  v-if="currentStep > 1"
                  type="button"
                  class="gt-back-btn px-4 py-2 rounded-md text-sm font-medium"
                  @click="goBack"
                >
                  ← Back
                </button>
                <span v-else class="text-sm gt-text opacity-60">Step {{ currentStep }} of {{ totalSteps }}</span>

                <button
                  v-if="currentStep < totalSteps"
                  type="button"
                  class="gt-submit-btn px-6 py-2.5 font-medium text-sm rounded shadow-md transition"
                  :class="{ 'opacity-50 cursor-not-allowed': !canAdvance(currentStep) }"
                  :disabled="!canAdvance(currentStep)"
                  @click="goNext"
                >
                  Continue
                </button>
                <button
                  v-else
                  type="submit"
                  class="gt-submit-btn px-6 py-2.5 font-medium text-sm rounded shadow-md transition"
                >
                  Create Task
                </button>
              </div>
            </div>
          </template>

          <!-- ============================================ -->
          <!-- EDIT: RECURRING TASK (template)                 -->
          <!-- ============================================ -->
          <template v-else-if="id && isRecurringTemplate">
            <h2 class="gt-text text-lg font-semibold text-center mb-3 pr-6">Edit recurring task</h2>
            <p class="gt-text text-sm text-center opacity-80 mb-4 pr-6">
              Schedule and instruction options apply to this template. One-off task status is not used here.
            </p>

            <div class="flex items-center gap-4 mb-3">
              <div class="flex-1">
                <p class="gt-text pb-1 text-xl md:text-base font-semibold">{{ topic }} <span class="text-red-500">*</span></p>
                <input
                  :class="[
                    'garden-task-input gt-input p-2 md:p-1 rounded-md border w-full leading-tight text-2xl md:text-lg focus:outline-none focus:ring-1',
                    validationErrors.title ? 'border-2 !border-red-500' : ''
                  ]"
                  type="text"
                  v-model="form.title"
                  @input="clearValidationError('title')"
                />
              </div>
            </div>

            <p class="gt-text p-1 pb-0 mb-0 mt-0 text-xl md:text-base font-semibold">Overview: <span class="text-red-500">*</span></p>
            <textarea
              v-model="form.overview"
              :class="[
                'garden-task-input gt-input form-control px-3 py-3 md:py-2 m-r-4 mb-1 w-full rounded-md border text-xl md:text-base focus:outline-none focus:ring-1',
                validationErrors.overview ? 'border-2 !border-red-500' : ''
              ]"
              rows="5"
              @input="clearValidationError('overview')"
            ></textarea>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-4">
              <div>
                <p class="gt-text p-1 pb-0 text-md mb-1">Scheduler type: <span class="text-red-500">*</span></p>
                <select
                  v-model="form.scheduler_type"
                  :class="[
                    'garden-task-input gt-input rounded-md border p-2 w-full text-lg focus:outline-none focus:ring-1',
                    validationErrors.scheduler_type ? 'border-2 !border-red-500' : ''
                  ]"
                  @change="clearValidationError('scheduler_type')"
                >
                  <option value="" disabled class="text-lg py-1">Select…</option>
                  <option
                    v-for="opt in recurringSchedulerTypes"
                    :key="opt"
                    :value="opt"
                    class="text-lg py-1"
                  >
                    {{ opt }}
                  </option>
                </select>
              </div>
              <div>
                <p class="gt-text p-1 pb-0 text-md mb-1">Week starts on</p>
                <select
                  v-model="form.week_start_date"
                  class="garden-task-input gt-input rounded-md border p-2 w-full text-lg focus:outline-none focus:ring-1"
                >
                  <option
                    v-for="d in weekStartDayOptions"
                    :key="d"
                    :value="d"
                    class="text-lg py-1"
                  >
                    {{ d }}
                  </option>
                </select>
              </div>
            </div>

            <div class="mb-4">
              <p class="gt-text p-1 pb-0 text-md mb-1">Instruction (optional)</p>
              <select
                v-model="instructionSelectId"
                class="garden-task-input gt-input rounded-md border p-2 w-full text-base focus:outline-none focus:ring-1"
              >
                <option value="">No instruction linked</option>
                <option
                  v-for="inst in instructionOptions"
                  :key="inst.id"
                  :value="inst.id"
                >
                  {{ inst.title || `Instruction #${inst.id}` }}
                </option>
              </select>
            </div>

            <div class="mb-4">
              <FormToggle
                v-model="form.complete_once"
                label="Complete once (for all volunteers when done)"
              />
            </div>

            <p class="gt-text p-1 pb-0 text-md mb-0">What kind of task?: <span class="text-red-500">*</span></p>
            <select
              v-model="form.type"
              :class="[
                'garden-task-input gt-input rounded-md border p-1 ml-1 text-lg focus:outline-none focus:ring-1',
                validationErrors.type ? 'border-2 !border-red-500' : ''
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

            <div class="flex flex-col space-y-2 mb-4 mt-4">
              <label class="gt-text text-sm font-medium">Photo</label>
              <div v-if="garden" class="mt-2">
                <MediaSelector
                  v-model="form.primary_image"
                  :garden-id="garden"
                  :multiple="false"
                  placeholder="Select or upload image"
                />
              </div>
            </div>

            <div class="gt-subsection p-4 rounded-lg mb-4 space-y-3">
              <div class="flex items-center gap-4 flex-wrap">
                <span class="gt-text font-medium">Max volunteers</span>
                <select v-model="form.max_volunteers" class="garden-task-input gt-input rounded-md border p-1 w-24">
                  <option :value="null">—</option>
                  <option v-for="n in [1,2,3,4,5,99]" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>
            </div>

            <div class="modal-footer gt-footer flex flex-shrink-0 flex-col gap-3 p-4 border-t rounded-b-md">
              <div
                v-if="validationErrors.title || validationErrors.type || validationErrors.overview || validationErrors.scheduler_type"
                class="w-full text-red-600 text-sm"
              >
                Please fill in title, overview, task type, and scheduler type.
              </div>
              <div v-if="error" class="w-full text-red-600 text-sm">Error: {{ error }}</div>
              <div class="flex justify-end w-full">
                <button
                  v-if="isDirty"
                  class="gt-submit-btn px-6 py-2.5 font-medium text-xs leading-tight uppercase rounded shadow-md hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-0 active:shadow-lg transition duration-150 ease-in-out"
                  type="submit"
                >
                  {{ submitText }}
                </button>
              </div>
            </div>
          </template>

          <!-- ============================================ -->
          <!-- EDIT FLOW: ONE-OFF GARDEN TASK               -->
          <!-- ============================================ -->
          <template v-else>
            <!-- Status pill (prominent, top of form) -->
            <div class="mb-4 pr-8">
              <label class="gt-text gt-status-label block mb-1.5">
                Status:
              </label>
              <div class="gt-status-pill" :class="statusPillClass">
                <select v-model="form.status" class="gt-status-select">
                  <option
                    v-for="opt in taskStatusOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <svg class="gt-status-caret" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <!-- Show instruction link -->
            <div v-if="taskInstruction" class="mb-2">
              <span class="gt-accent font-semibold">Task has an instruction </span>
              <a
                class="gt-accent underline hover:opacity-80"
                :href="'/i/' + taskInstruction.slug"
                target="_blank"
              >
                {{ taskInstruction.title }}
              </a>
            </div>

            <div class="flex items-center gap-4 mb-3">
              <div class="flex-1">
                <p class="gt-text pb-1 text-xl md:text-base font-semibold">{{ topic }} <span class="text-red-500">*</span></p>
                <input
                  :class="[
                    'garden-task-input gt-input p-2 md:p-1 rounded-md border w-full leading-tight text-2xl md:text-lg focus:outline-none focus:ring-1',
                    validationErrors.title ? 'border-2 !border-red-500' : ''
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
              />
            </div>

            <!-- Group Task Options -->
            <div v-if="form.is_group_task" class="gt-subsection p-4 rounded-lg mb-4 space-y-4">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1">
                  <svg class="gt-accent w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                  </svg>
                  <span class="gt-text font-medium">Max Volunteers:</span>
                </div>
                <select v-model="form.max_volunteers" class="garden-task-input gt-input rounded-md border p-1 w-20">
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5</option>
                  <option>99</option>
                </select>
              </div>

              <div>
                <FormToggle
                  v-model="form.complete_once"
                  label="Complete Once: Once complete, it's complete for everyone."
                />
              </div>
            </div>

            <p class="gt-text p-1 pb-0 mb-0 mt-0 text-xl md:text-base font-semibold">Explain the task more: <span class="text-red-500">*</span></p>
            <textarea
              v-model="form.overview"
              :class="[
                'garden-task-input gt-input form-control px-3 py-3 md:py-2 m-r-4 mb-1 w-full rounded-md border text-xl md:text-base focus:outline-none focus:ring-1',
                validationErrors.overview ? 'border-2 !border-red-500' : ''
              ]"
              rows="5"
              @input="clearValidationError('overview')"
            ></textarea>

            <div class="flex flex-col space-y-2 mb-4">
              <label class="gt-text text-sm font-medium">Add Photo</label>

              <div v-if="garden" class="mt-2">
                <MediaSelector
                  v-model="form.primary_image"
                  :garden-id="garden"
                  :multiple="false"
                  placeholder="Select or upload image"
                />
              </div>
            </div>

            <p class="gt-text p-1 pb-0 text-md mb-0">What kind of task?: <span class="text-red-500">*</span></p>
            <select
              v-model="form.type"
              :class="[
                'garden-task-input gt-input rounded-md border p-1 ml-1 text-lg focus:outline-none focus:ring-1',
                validationErrors.type ? 'border-2 !border-red-500' : ''
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

            <div class="modal-footer gt-footer flex flex-shrink-0 flex-col gap-3 p-4 border-t rounded-b-md">
              <div v-if="validationErrors.title || validationErrors.type || validationErrors.overview" class="w-full text-red-600 text-sm">
                Please fill in all required fields: Title, What kind of task, and Explain the task more.
              </div>
              <div v-if="error" class="w-full text-red-600 text-sm">Error loading garden task: {{error}}</div>
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
                  class="gt-submit-btn px-6 py-2.5 font-medium text-xs leading-tight uppercase rounded shadow-md hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-0 active:shadow-lg transition duration-150 ease-in-out"
                  type="submit"
                >
                  {{ submitText }}
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── + Create trigger button (light by default) ─── */
.gt-create-trigger {
  background-color: #8aa37c;
  color: #ffffff;
  border: 2px solid #8aa37c;
}
.gt-create-trigger:hover,
.gt-create-trigger:focus {
  background-color: #6c8a6a;
  border-color: #6c8a6a;
}
.gt-create-trigger:active {
  background-color: #376451;
  border-color: #376451;
}
.gt-create-trigger:focus {
  --tw-ring-color: rgba(138, 163, 124, 0.5);
}

:global(.dark) .gt-create-trigger {
  background-color: #c2410c;
  border-color: #c2410c;
}
:global(.dark) .gt-create-trigger:hover,
:global(.dark) .gt-create-trigger:focus {
  background-color: #9a3209;
  border-color: #9a3209;
}
:global(.dark) .gt-create-trigger:active {
  background-color: #7a2807;
  border-color: #7a2807;
}

/* ── Light mode (default) ──────────────────────────── */
.garden-task-modal-content {
  background-color: #f7f1e3;
  color: #344a34;
  border: 1px solid #e2dccb;
}

.gt-text {
  color: #344a34;
}

.gt-accent {
  color: #6c8a6a;
}

.gt-close-btn {
  color: #6b7280;
}
.gt-close-btn:hover {
  color: #344a34;
}

/* Form inputs */
.garden-task-modal-content .gt-input {
  background-color: #ffffff !important;
  color: #344a34 !important;
  border-color: #d6cfb8 !important;
}

.garden-task-modal-content .gt-input::placeholder {
  color: #9ca3af;
}

.garden-task-modal-content .gt-input:focus {
  background-color: #ffffff !important;
  border-color: #8aa37c !important;
  box-shadow: 0 0 0 1px rgba(138, 163, 124, 0.5) !important;
}

/* Override autofill background to stay light */
.garden-task-modal-content .gt-input:-webkit-autofill,
.garden-task-modal-content .gt-input:-webkit-autofill:focus {
  -webkit-text-fill-color: #344a34;
  -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
  transition: background-color 5000s ease-in-out 0s;
}

/* Subsection panel (group task options) */
.gt-subsection {
  background-color: rgba(138, 163, 124, 0.12);
  border: 1px solid #d6cfb8;
}

/* Recurring task template chips */
.gt-template-chip {
  background-color: rgba(138, 163, 124, 0.15);
  color: #376451;
  border: 1px solid #c7d4bf;
}
.gt-template-chip:hover {
  background-color: rgba(138, 163, 124, 0.28);
}

/* Step indicator (multi-step create flow) */
.gt-step-active {
  background-color: #8aa37c;
  color: #ffffff;
}
.gt-step-inactive {
  background-color: #d6cfb8;
  color: #6b7280;
}
.gt-step-bar-active {
  background-color: #8aa37c;
}
.gt-step-bar-inactive {
  background-color: #d6cfb8;
}

/* Type selection buttons */
.gt-type-btn {
  background-color: #ffffff;
  border-color: #d6cfb8;
  color: #344a34;
}
.gt-type-btn:hover {
  border-color: #8aa37c;
  background-color: #f3ece0;
}
.gt-type-btn-active {
  border-color: #8aa37c;
  background-color: rgba(138, 163, 124, 0.18);
  color: #376451;
}

/* Back button */
.gt-back-btn {
  background-color: transparent;
  color: #6b7280;
  border: 1px solid #d6cfb8;
}
.gt-back-btn:hover {
  background-color: rgba(138, 163, 124, 0.12);
  color: #344a34;
}

.gt-step {
  animation: gt-step-fade 0.25s ease-out;
}
@keyframes gt-step-fade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Status pill dropdown (edit flow) ──────────────── */
.gt-status-label {
  font-size: 1rem;
  font-weight: 600;
}
@media (max-width: 768px) {
  .gt-status-label {
    font-size: 1.125rem;
  }
}

.gt-status-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  max-width: 22rem;
  border-radius: 9999px;
  padding: 0.7rem 1.25rem;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  font-weight: 600;
  font-size: 1.125rem;
  letter-spacing: 0.01em;
  cursor: pointer;
}
@media (max-width: 768px) {
  .gt-status-pill {
    font-size: 1.25rem;
    padding: 0.85rem 1.4rem;
  }
}
.gt-status-pill:hover {
  filter: brightness(0.97);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
.gt-status-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding-right: 1.75rem;
}
.gt-status-select option {
  color: #1f2937;
  background: #ffffff;
  font-weight: 500;
}
.gt-status-caret {
  position: absolute;
  right: 1rem;
  width: 1.1rem;
  height: 1.1rem;
  pointer-events: none;
}

.gt-status-initialized {
  background-color: #ede9fe;
  color: #6b21a8;
  border-color: #d8b4fe;
}
.gt-status-started {
  background-color: #dbeafe;
  color: #1e40af;
  border-color: #93c5fd;
}
.gt-status-finished {
  background-color: #dcfce7;
  color: #166534;
  border-color: #86efac;
}
.gt-status-issue {
  background-color: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}
.gt-status-pending {
  background-color: #fef9c3;
  color: #854d0e;
  border-color: #fde68a;
}
.gt-status-skipped {
  background-color: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

:global(.dark) .gt-status-pending {
  background-color: rgba(234, 179, 8, 0.18);
  color: #fef08a;
  border-color: rgba(234, 179, 8, 0.4);
}
:global(.dark) .gt-status-skipped {
  background-color: rgba(148, 163, 184, 0.18);
  color: #e5e7eb;
  border-color: rgba(148, 163, 184, 0.4);
}

:global(.dark) .gt-status-initialized {
  background-color: rgba(168, 85, 247, 0.18);
  color: #e9d5ff;
  border-color: rgba(168, 85, 247, 0.4);
}
:global(.dark) .gt-status-started {
  background-color: rgba(59, 130, 246, 0.18);
  color: #bfdbfe;
  border-color: rgba(59, 130, 246, 0.4);
}
:global(.dark) .gt-status-finished {
  background-color: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
  border-color: rgba(34, 197, 94, 0.4);
}
:global(.dark) .gt-status-issue {
  background-color: rgba(239, 68, 68, 0.18);
  color: #fecaca;
  border-color: rgba(239, 68, 68, 0.4);
}
:global(.dark) .gt-status-select option {
  color: #f5f5f5;
  background: #2d3e26;
}

/* Footer separator */
.gt-footer {
  border-color: #e2dccb;
}

/* Submit button (homepage primary palette) */
.gt-submit-btn {
  background-color: #8aa37c;
  color: #ffffff;
}
.gt-submit-btn:hover,
.gt-submit-btn:focus {
  background-color: #6c8a6a;
}
.gt-submit-btn:active {
  background-color: #376451;
}

/* ── Dark mode overrides ───────────────────────────── */
:global(.dark) .garden-task-modal-content {
  background-color: #2d3e26;
  color: #f5f5f5;
  border-color: #3d4d36;
}

:global(.dark) .gt-text {
  color: #f5f5f5;
}

:global(.dark) .gt-accent {
  color: #8aa37c;
}

:global(.dark) .gt-close-btn {
  color: #d0d0d0;
}
:global(.dark) .gt-close-btn:hover {
  color: #f5f5f5;
}

:global(.dark) .garden-task-modal-content .gt-input {
  background-color: rgba(26, 26, 26, 0.6) !important;
  color: #f5f5f5 !important;
  border-color: #3d4d36 !important;
}

:global(.dark) .garden-task-modal-content .gt-input::placeholder {
  color: #9ca3af;
}

:global(.dark) .garden-task-modal-content .gt-input:focus {
  background-color: rgba(40, 50, 35, 0.9) !important;
  border-color: #8aa37c !important;
}

:global(.dark) .garden-task-modal-content .gt-input:-webkit-autofill,
:global(.dark) .garden-task-modal-content .gt-input:-webkit-autofill:focus {
  -webkit-text-fill-color: #f5f5f5;
  -webkit-box-shadow: 0 0 0 1000px rgba(40, 50, 35, 0.95) inset;
}

:global(.dark) .gt-subsection {
  background-color: rgba(26, 26, 26, 0.6);
  border-color: #3d4d36;
}

:global(.dark) .gt-template-chip {
  background-color: rgba(26, 26, 26, 0.6);
  color: #8aa37c;
  border-color: #3d4d36;
}
:global(.dark) .gt-template-chip:hover {
  background-color: rgba(26, 26, 26, 0.8);
}

:global(.dark) .gt-footer {
  border-color: #3d4d36;
}

:global(.dark) .gt-submit-btn {
  background-color: #c2410c;
  color: #ffffff;
}
:global(.dark) .gt-submit-btn:hover,
:global(.dark) .gt-submit-btn:focus {
  background-color: #9a3209;
}
:global(.dark) .gt-submit-btn:active {
  background-color: #7a2807;
}

/* ── Dark overrides for multi-step UI ──────────────── */
:global(.dark) .gt-step-active {
  background-color: #8aa37c;
  color: #ffffff;
}
:global(.dark) .gt-step-inactive {
  background-color: #f0ebe0;
  color: #111111;
}
:global(.dark) .gt-step-bar-active {
  background-color: #8aa37c;
}
:global(.dark) .gt-step-bar-inactive {
  background-color: #c9c3b5;
}

:global(.dark) .gt-type-btn {
  background-color: rgba(26, 26, 26, 0.6);
  border-color: #3d4d36;
  color: #f5f5f5;
}
:global(.dark) .gt-type-btn:hover {
  border-color: #8aa37c;
  background-color: rgba(138, 163, 124, 0.18);
}
:global(.dark) .gt-type-btn-active {
  border-color: #8aa37c;
  background-color: rgba(138, 163, 124, 0.28);
  color: #f5f5f5;
}

:global(.dark) .gt-back-btn {
  color: #d0d0d0;
  border-color: #3d4d36;
}
:global(.dark) .gt-back-btn:hover {
  background-color: rgba(26, 26, 26, 0.6);
  color: #f5f5f5;
}

/* ── Type badge color helpers (used in card preview) ── */
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

<style>
/* Hard-enforce dark palette for teleported GardenTask modal surfaces/controls. */
html.dark .garden-task-modal-content {
  background-color: #2d3e26 !important;
  color: #f5f5f5 !important;
  border-color: #3d4d36 !important;
}

html.dark .garden-task-modal-content .gt-input {
  background-color: rgba(26, 26, 26, 0.6) !important;
  color: #f5f5f5 !important;
  border-color: #3d4d36 !important;
}

html.dark .garden-task-modal-content .gt-input:focus {
  background-color: rgba(40, 50, 35, 0.9) !important;
  border-color: #8aa37c !important;
  box-shadow: 0 0 0 1px rgba(138, 163, 124, 0.5) !important;
}

html.dark .garden-task-modal-content .gt-status-select option,
html.dark .garden-task-modal-content select option {
  color: #f5f5f5 !important;
  background: #2d3e26 !important;
}

html.dark .garden-task-modal-content .gt-subsection {
  background-color: rgba(26, 26, 26, 0.6) !important;
  border-color: #3d4d36 !important;
}

/* Step indicator: black numerals on light inactive circles (modal forces light text otherwise) */
html.dark .garden-task-modal-content .gt-step-inactive {
  background-color: #f0ebe0 !important;
  color: #111111 !important;
}
html.dark .garden-task-modal-content .gt-step-bar-inactive {
  background-color: #c9c3b5 !important;
}
html.dark .garden-task-modal-content .gt-step-active {
  color: #ffffff !important;
}

/* Config-driven force-dark status pill colors (used from GardenConfig darkPillClass). */
html.dark .gt-status-initialized-darkforce {
  background-color: rgba(168, 85, 247, 0.18) !important;
  color: #e9d5ff !important;
  border-color: rgba(168, 85, 247, 0.4) !important;
}
html.dark .gt-status-pending-darkforce {
  background-color: rgba(234, 179, 8, 0.18) !important;
  color: #fef08a !important;
  border-color: rgba(234, 179, 8, 0.4) !important;
}
html.dark .gt-status-started-darkforce {
  background-color: rgba(59, 130, 246, 0.18) !important;
  color: #bfdbfe !important;
  border-color: rgba(59, 130, 246, 0.4) !important;
}
html.dark .gt-status-finished-darkforce {
  background-color: rgba(34, 197, 94, 0.18) !important;
  color: #bbf7d0 !important;
  border-color: rgba(34, 197, 94, 0.4) !important;
}
html.dark .gt-status-issue-darkforce {
  background-color: rgba(239, 68, 68, 0.18) !important;
  color: #fecaca !important;
  border-color: rgba(239, 68, 68, 0.4) !important;
}
html.dark .gt-status-skipped-darkforce {
  background-color: rgba(148, 163, 184, 0.18) !important;
  color: #e5e7eb !important;
  border-color: rgba(148, 163, 184, 0.4) !important;
}
</style>