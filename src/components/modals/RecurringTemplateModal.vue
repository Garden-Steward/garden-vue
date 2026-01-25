<script setup>
import { computed, ref, watch } from 'vue';
import { useRecurringTemplateStore, useAlertStore } from '@/stores';
import { format, parseISO, addMonths, startOfMonth, getDay, addDays, addWeeks } from 'date-fns';
import TextInput from '@/components/form/TextInput.vue';
import Switch from '@/components/form/Switch.vue';
import DropDown from '@/components/form/DropDown.vue';

const emit = defineEmits(['update:show', 'saved', 'deleted']);

const props = defineProps({
  id: Number,
  template_name: String,
  title_template: String,
  event_title_template: String,
  naming_convention: String,
  recurrence_type: String,
  day_of_month: Number,
  nth_occurrence: Number,
  day_of_week: Number,
  default_start_time: String,
  default_end_text: String,
  default_blurb: String,
  is_active: { type: Boolean, default: true },
  max_future_instances: { type: Number, default: 3 },
  garden: Number,
  editor: Boolean,
  show: { type: Boolean, default: false },
  /** When true, do not render the card or create button; modal is opened via :show only */
  hideTrigger: { type: Boolean, default: false }
});

const templateStore = useRecurringTemplateStore();
const alertStore = useAlertStore();

const isVisible = ref(props.show);
const isLoading = ref(false);
const showPreview = ref(false);
const modalErrors = ref([]);
const showDeleteConfirm = ref(false);

const daysOfWeek = [
  { value: 0, label: 'Sunday' }, { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' }, { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const nthOptions = [
  { value: 1, label: 'First' }, { value: 2, label: 'Second' }, { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' }, { value: -1, label: 'Last' }
];

const namingOptions = [
  { value: 'title_only', label: 'Title Only (e.g., "Volunteer Day")' },
  { value: 'title_month', label: 'Month (e.g., "Volunteer Day - January")' },
  { value: 'title_day_of_month', label: 'Day of Month (e.g., "Volunteer Day - June 15")' },
  { value: 'title_nth_weekday', label: 'Nth Weekday (e.g., "Volunteer Day - 3rd Sunday of January")' },
];

/** UI → API: map form values to backend enum values */
const NAMING_TO_API = { month_year: 'title_month', full_date: 'title_day_of_month', ordinal: 'title_nth_weekday' };
const NTH_TO_API = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', [-1]: 'last' };
const WEEKDAY_TO_API = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Calculate the first occurrence date based on recurrence pattern
 */
function calculateFirstOccurrenceDate(recurrenceType, dayOfMonth, nthOccurrence, dayOfWeek) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Validate inputs
  if (dayOfMonth == null || nthOccurrence == null || dayOfWeek == null) {
    return format(today, 'yyyy-MM-dd');
  }
  
  if (recurrenceType === 'day_of_month') {
    // Find next occurrence of this day of month
    const targetDay = Number(dayOfMonth);
    if (isNaN(targetDay) || targetDay < 1 || targetDay > 31) {
      return format(today, 'yyyy-MM-dd');
    }
    
    let candidate = new Date(today.getFullYear(), today.getMonth(), targetDay);
    
    // If the day has passed this month, move to next month
    if (candidate < today) {
      candidate = addMonths(candidate, 1);
    }
    
    // Validate the resulting date
    if (isNaN(candidate.getTime())) {
      return format(today, 'yyyy-MM-dd');
    }
    
    return format(candidate, 'yyyy-MM-dd');
  } else if (recurrenceType === 'nth_weekday') {
    // Find next occurrence of nth weekday (e.g., 2nd Saturday)
    const targetWeekday = Number(dayOfWeek); // 0-6
    const nth = Number(nthOccurrence); // 1-4 or -1 for last
    
    // Validate inputs
    if (isNaN(targetWeekday) || targetWeekday < 0 || targetWeekday > 6) {
      return format(today, 'yyyy-MM-dd');
    }
    if (isNaN(nth) || (nth < 1 && nth !== -1) || nth > 4) {
      return format(today, 'yyyy-MM-dd');
    }
    
    // Start from the first day of current month
    let monthStart = startOfMonth(today);
    let candidate = new Date(monthStart);
    
    // Find first occurrence of target weekday in this month
    const firstWeekday = getDay(monthStart);
    const daysToAdd = (targetWeekday - firstWeekday + 7) % 7;
    candidate = addDays(monthStart, daysToAdd);
    
    if (nth === -1) {
      // Last occurrence: find last occurrence of weekday in month
      // Get last day of month, then work backwards
      const nextMonth = addMonths(monthStart, 1);
      candidate = addDays(nextMonth, -1); // Last day of current month
      const lastDayWeekday = getDay(candidate);
      let daysToSubtract = (lastDayWeekday - targetWeekday + 7) % 7;
      if (daysToSubtract === 0) {
        daysToSubtract = 7;
      }
      candidate = addDays(candidate, -daysToSubtract);
    } else {
      // Nth occurrence: add (nth - 1) weeks
      candidate = addWeeks(candidate, nth - 1);
    }
    
    // If this occurrence has passed, move to next month
    if (candidate < today) {
      monthStart = addMonths(monthStart, 1);
      candidate = new Date(monthStart);
      const firstWeekday = getDay(monthStart);
      const daysToAdd = (targetWeekday - firstWeekday + 7) % 7;
      candidate = addDays(monthStart, daysToAdd);
      
      if (nth === -1) {
        // Last occurrence of next month
        const nextMonth = addMonths(monthStart, 1);
        candidate = addDays(nextMonth, -1);
        const lastDayWeekday = getDay(candidate);
        let daysToSubtract = (lastDayWeekday - targetWeekday + 7) % 7;
        if (daysToSubtract === 0) {
          daysToSubtract = 7;
        }
        candidate = addDays(candidate, -daysToSubtract);
      } else {
        candidate = addWeeks(candidate, nth - 1);
      }
    }
    
    // Validate the resulting date
    if (isNaN(candidate.getTime())) {
      return format(today, 'yyyy-MM-dd');
    }
    
    return format(candidate, 'yyyy-MM-dd');
  }
  
  // Fallback: use today's date
  return format(today, 'yyyy-MM-dd');
}

const dayOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`
}));

const maxInstancesOptions = [
  { value: 1, label: '1 event' }, { value: 2, label: '2 events' }, { value: 3, label: '3 events' },
  { value: 4, label: '4 events' }, { value: 5, label: '5 events' }, { value: 6, label: '6 events' }
];

const form = ref({
  id: props.id,
  template_name: props.template_name || props.title_template || '',
  event_title_template: props.event_title_template || props.title_template || 'Volunteer Day - {date}',
  naming_convention: props.naming_convention || 'month_year',
  recurrence_type: props.recurrence_type || 'nth_weekday',
  day_of_month: props.day_of_month ?? 1,
  nth_occurrence: props.nth_occurrence ?? 2,
  day_of_week: props.day_of_week ?? 6,
  default_start_time: props.default_start_time || '09:00',
  default_end_text: props.default_end_text || 'around noon',
  default_blurb: props.default_blurb || '',
  is_active: props.is_active ?? true,
  max_future_instances: props.max_future_instances ?? 3
});

const isEditing = computed(() => !!form.value.id);
const topic = computed(() => (isEditing.value ? 'Edit Recurring Template' : 'Create Recurring Template'));

const recurrenceDescription = computed(() => {
  if (form.value.recurrence_type === 'day_of_month') {
    const day = form.value.day_of_month;
    return `Events will be created on the ${day}${getOrdinalSuffix(day)} of each month`;
  }
  const nth = nthOptions.find(o => o.value === form.value.nth_occurrence)?.label || '';
  const day = daysOfWeek.find(d => d.value === form.value.day_of_week)?.label || '';
  return `Events will be created on the ${nth} ${day} of each month`;
});

function parseValidationErrors(err) {
  const list = err?.details?.errors;
  if (!Array.isArray(list) || list.length === 0) {
    const msg = typeof err === 'object' && err?.message ? err.message : (err || 'Save failed.');
    return [msg];
  }
  return list.map((e) => {
    const path = Array.isArray(e.path) ? e.path.join('.') : (e.path || '');
    return path ? `${path}: ${e.message || ''}`.trim() : (e.message || '').trim();
  }).filter(Boolean);
}

watch(() => props.show, (newVal) => {
  isVisible.value = newVal;
  if (newVal) modalErrors.value = [];
  if (newVal && props.id) loadPreview();
});

watch(isVisible, (newVal) => {
  emit('update:show', newVal);
  if (!newVal) {
    showPreview.value = false;
    modalErrors.value = [];
    templateStore.clearPreview();
  }
});

watch(() => [props.id, props.template_name, props.title_template, props.event_title_template, props.naming_convention, props.recurrence_type, props.day_of_month, props.nth_occurrence, props.day_of_week, props.default_start_time, props.default_end_text, props.default_blurb, props.is_active, props.max_future_instances], () => {
  form.value = {
    id: props.id,
    template_name: props.template_name || props.title_template || '',
    event_title_template: props.event_title_template || props.title_template || 'Volunteer Day - {date}',
    naming_convention: props.naming_convention || 'month_year',
    recurrence_type: props.recurrence_type || 'nth_weekday',
    day_of_month: props.day_of_month ?? 1,
    nth_occurrence: props.nth_occurrence ?? 2,
    day_of_week: props.day_of_week ?? 6,
    default_start_time: props.default_start_time || '09:00',
    default_end_text: props.default_end_text || 'around noon',
    default_blurb: props.default_blurb || '',
    is_active: props.is_active ?? true,
    max_future_instances: props.max_future_instances ?? 3
  };
}, { deep: true });

async function loadPreview() {
  if (form.value.id) {
    showPreview.value = true;
    await templateStore.preview(form.value.id);
  }
}

async function saveTemplate() {
  alertStore.clear();
  modalErrors.value = [];
  isLoading.value = true;

  try {
    const data = { ...form.value, garden: props.garden };
    delete data.id;
    
    // Map template_name to title_template for API
    data.title_template = data.template_name;
    delete data.template_name;
    
    // Map naming convention
    data.naming_convention = NAMING_TO_API[data.naming_convention] ?? data.naming_convention;
    
    // Map nth_occurrence
    data.nth_occurrence = NTH_TO_API[data.nth_occurrence] ?? data.nth_occurrence;
    
    // Calculate first_occurrence_date for new templates (before mapping values)
    if (!isEditing.value) {
      data.first_occurrence_date = calculateFirstOccurrenceDate(
        data.recurrence_type,
        data.day_of_month,
        form.value.nth_occurrence, // Use original numeric value
        form.value.day_of_week // Use original numeric value
      );
    }
    
    // Map weekday (after calculating first_occurrence_date)
    data.weekday = WEEKDAY_TO_API[data.day_of_week];

    if (isEditing.value) {
      await templateStore.update(form.value.id, data);
      alertStore.success('Recurring template updated');
    } else {
      const result = await templateStore.create(data);
      form.value.id = result.id;
      alertStore.success('Recurring template created');
      emit('saved');
      closeUp();
      return;
    }

    emit('saved');
    if (form.value.id) await loadPreview();
  } catch (err) {
    modalErrors.value = parseValidationErrors(err);
    console.error('Error saving template:', err);
  } finally {
    isLoading.value = false;
  }
}

async function deleteTemplate() {
  showDeleteConfirm.value = false;
  alertStore.clear();
  modalErrors.value = [];
  isLoading.value = true;
  try {
    await templateStore.delete(form.value.id);
    alertStore.success('Recurring template deleted');
    emit('deleted');
    closeUp();
  } catch (e) {
    modalErrors.value = parseValidationErrors(e);
    console.error('Error deleting template:', e);
  } finally {
    isLoading.value = false;
  }
}

function openDeleteConfirm() {
  showDeleteConfirm.value = true;
}

function cancelDeleteConfirm() {
  showDeleteConfirm.value = false;
}

async function processNow() {
  alertStore.clear();
  modalErrors.value = [];
  isLoading.value = true;
  try {
    const result = await templateStore.process(form.value.id);
    if (result?.created?.length) {
      alertStore.success(`Created ${result.created.length} event(s)`);
      await loadPreview();
    } else {
      alertStore.success('No new events needed - all future instances already exist');
    }
  } catch (e) {
    modalErrors.value = parseValidationErrors(e);
    console.error('Error processing template:', e);
  } finally {
    isLoading.value = false;
  }
}

function closeUp() {
  isVisible.value = false;
  showPreview.value = false;
  showDeleteConfirm.value = false;
  modalErrors.value = [];
  templateStore.clearPreview();
}

function openModal() {
  isVisible.value = true;
  modalErrors.value = [];
  if (form.value.id) loadPreview();
}

function formatPreviewDate(dateStr) {
  try {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

const cardTitle = computed(() => props.template_name || props.title_template || '');
const showCard = computed(() => !!cardTitle.value);
</script>

<template>
  <div
    v-if="showCard"
    class="border-r-4 border rounded p-3 bg-[rgba(26,26,26,0.6)] border-[#3d4d36]/50 hover:bg-[rgba(26,26,26,0.8)] cursor-pointer transition-colors"
    @click="openModal"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <span class="text-md font-semibold text-[#f5f5f5]">{{ cardTitle }}</span>
        <br />
        <span class="text-sm text-[#d0d0d0]">{{ recurrenceDescription }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="is_active" class="px-2 py-1 bg-green-600/30 text-green-300 text-xs rounded">Active</span>
        <span v-else class="px-2 py-1 bg-gray-600/30 text-gray-400 text-xs rounded">Inactive</span>
      </div>
    </div>
    <div class="mt-2 text-xs text-[#999]">
      <span>{{ max_future_instances }} upcoming events maintained</span>
      <span v-if="default_start_time" class="ml-3">Starts at {{ default_start_time }}</span>
    </div>
  </div>

  <button
    v-else-if="editor && !hideTrigger"
    type="button"
    class="px-4 py-2 bg-orange-700 text-white font-medium text-sm rounded shadow-md hover:bg-orange-800 focus:bg-orange-800 focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
    @click="openModal"
  >
    Create Recurring Template
  </button>

  <Teleport to="#modals">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-30 flex items-center justify-center p-4 overflow-y-auto bg-gray-900/60"
      @click.self="closeUp"
    >
      <div
        class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl bg-[#2d3e26] text-[#f5f5f5] grid grid-cols-1 gap-3 p-4"
        @click.stop
      >
        <h2 class="text-xl font-bold mb-2">{{ topic }}</h2>

        <div
          v-if="modalErrors.length > 0"
          class="rounded-lg p-3 bg-red-900/30 border border-red-500/50 text-red-200 text-sm"
        >
          <p class="font-medium mb-2">Validation errors:</p>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="(msg, idx) in modalErrors" :key="idx">{{ msg }}</li>
          </ul>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Template Name *</label>
          <TextInput
            v-model="form.template_name"
            placeholder="e.g., Monthly Volunteer Day"
            size="md"
            input-class="w-full p-2 bg-[rgba(26,26,26,0.6)] dark:!bg-[rgba(26,26,26,0.6)] border border-[#3d4d36] rounded text-[#f5f5f5] disabled:opacity-60"
            :disabled="!editor"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Event Title Template</label>
          <TextInput
            v-model="form.event_title_template"
            placeholder="e.g., Volunteer Day - {date}"
            size="md"
            :disabled="!editor"
          />
          <p class="text-xs text-[#999] mt-1">Use {date} as placeholder for the formatted date</p>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Event Naming Format</label>
          <DropDown
            v-model="form.naming_convention"
            :options="namingOptions"
            placeholder="Select date format"
            size="md"
            :disabled="!editor"
          />
        </div>

        <div class="border border-[#3d4d36] rounded-lg p-3 mt-2">
          <label class="block text-sm font-medium mb-2">Recurrence Pattern</label>
          <div class="flex flex-wrap gap-4 mb-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.recurrence_type"
                type="radio"
                value="nth_weekday"
                :disabled="!editor"
                class="w-4 h-4 text-custom-green"
              />
              <span>Nth Weekday (e.g., 2nd Saturday)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.recurrence_type"
                type="radio"
                value="day_of_month"
                :disabled="!editor"
                class="w-4 h-4 text-custom-green"
              />
              <span>Day of Month (e.g., 15th)</span>
            </label>
          </div>
          <div v-if="form.recurrence_type === 'nth_weekday'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-[#999] mb-1">Which occurrence</label>
              <DropDown v-model="form.nth_occurrence" :options="nthOptions" size="md" :disabled="!editor" />
            </div>
            <div>
              <label class="block text-xs text-[#999] mb-1">Day of week</label>
              <DropDown v-model="form.day_of_week" :options="daysOfWeek" size="md" :disabled="!editor" />
            </div>
          </div>
          <div v-if="form.recurrence_type === 'day_of_month'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-[#999] mb-1">Day of month</label>
              <DropDown v-model="form.day_of_month" :options="dayOfMonthOptions" size="md" :disabled="!editor" />
            </div>
          </div>
          <p class="text-sm text-custom-green mt-3">{{ recurrenceDescription }}</p>
        </div>

        <div class="border border-[#3d4d36] rounded-lg p-3">
          <label class="block text-sm font-medium mb-2">Default Event Settings</label>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs text-[#999] mb-1">Start Time</label>
              <input
                v-model="form.default_start_time"
                type="time"
                :disabled="!editor"
                class="w-full p-2 bg-[rgba(26,26,26,0.6)] dark:!bg-[rgba(26,26,26,0.6)] border border-[#3d4d36] rounded text-[#f5f5f5] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label class="block text-xs text-[#999] mb-1">End Time Text</label>
              <TextInput
                v-model="form.default_end_text"
                placeholder="e.g., around noon"
                size="md"
                :disabled="!editor"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs text-[#999] mb-1">Default Blurb/Description</label>
            <textarea
              v-model="form.default_blurb"
              :disabled="!editor"
              rows="2"
              class="w-full p-2 bg-[rgba(26,26,26,0.6)] border border-[#3d4d36] rounded text-[#f5f5f5] disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Default description for generated events"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1">Max Future Events</label>
            <DropDown
              v-model="form.max_future_instances"
              :options="maxInstancesOptions"
              size="md"
              :disabled="!editor"
            />
          </div>
          <div class="flex items-center pt-6">
            <Switch v-model="form.is_active" :disabled="!editor">
              <span class="text-sm font-medium mr-2">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
            </Switch>
          </div>
        </div>

        <div v-if="isEditing && showPreview" class="border border-[#3d4d36] rounded-lg p-3 mt-2">
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium">Upcoming Occurrences Preview</label>
            <button
              type="button"
              :disabled="templateStore.previewLoading"
              class="text-xs text-custom-green hover:underline disabled:opacity-50"
              @click="loadPreview"
            >
              Refresh
            </button>
          </div>
          <div v-if="templateStore.previewLoading" class="text-center py-3 text-[#999]">Loading preview...</div>
          <div v-else-if="templateStore.preview?.length" class="space-y-2">
            <div
              v-for="(item, idx) in templateStore.preview"
              :key="idx"
              class="flex items-center gap-3 p-2 bg-[rgba(26,26,26,0.4)] rounded"
            >
              <span class="text-custom-green font-mono text-sm">{{ idx + 1 }}.</span>
              <div class="flex-1">
                <div class="text-sm">{{ item.title }}</div>
                <div class="text-xs text-[#999]">{{ formatPreviewDate(item.date) }}</div>
              </div>
              <span v-if="item.exists" class="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded">Exists</span>
              <span v-else class="px-2 py-1 bg-yellow-600/30 text-yellow-300 text-xs rounded">Pending</span>
            </div>
          </div>
          <div v-else class="text-center py-3 text-[#999]">No upcoming occurrences found</div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#3d4d36]">
          <div class="flex flex-col gap-1">
            <div class="flex gap-2">
              <button
                v-if="editor"
                type="button"
                :disabled="isLoading || !form.template_name"
                class="px-4 py-2 bg-orange-700 text-white font-medium text-sm rounded shadow-md hover:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                @click="saveTemplate"
              >
                {{ isLoading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Template') }}
              </button>
              <button
                v-if="editor && isEditing"
                type="button"
                :disabled="isLoading"
                class="px-4 py-2 bg-custom-green text-white font-medium text-sm rounded shadow-md hover:bg-darker-green disabled:opacity-50 transition"
                @click="processNow"
              >
                Process Now
              </button>
            </div>
            <div v-if="editor && isEditing" class="mt-1">
              <a
                href="#"
                class="text-sm text-red-400 hover:text-red-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                :class="{ 'pointer-events-none opacity-50': isLoading }"
                @click.prevent="openDeleteConfirm"
              >
                Delete
              </a>
            </div>
          </div>
          <button
            type="button"
            class="px-4 py-2 text-[#f5f5f5] font-medium text-sm hover:underline"
            @click="closeUp"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-gray-900/70"
      @click.self="cancelDeleteConfirm"
    >
      <div
        class="w-full max-w-md rounded-lg shadow-xl bg-[#2d3e26] text-[#f5f5f5] p-4 border border-[#3d4d36]"
        @click.stop
      >
        <p class="text-sm mb-4">
          Are you sure you want to delete this recurring template? This will not delete any events that have already been created.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-2 text-sm text-[#f5f5f5] hover:underline"
            @click="cancelDeleteConfirm"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isLoading"
            class="px-3 py-2 text-sm bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
            @click="deleteTemplate"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
input[type="time"] { color-scheme: dark; }
input[type="radio"] { accent-color: #8aa37c; }
</style>
