<script setup>
import { computed, ref, watch } from 'vue';
import { useEventStore, useAlertStore } from '@/stores';
import { format } from 'date-fns';
import { defineProps, defineEmits } from 'vue';

const emit = defineEmits(['update:show']);

const props = defineProps({
  title: String,
  blurb: String,
  endText: String,
  startDatetime: String,
  createdAt: String,
  updatedAt: String,
  publishedAt: String,
  content: String,
  id: Number,
  garden: Number,
  garden_tasks: Array,
  disabled: Boolean,
  interests: Array,
  interest: String,
  editor: Boolean,
  smsLink: Boolean,
  tableRow: Boolean,
  show: {
    type: Boolean,
    default: false
  },
  slug: String,
  accessibility: String
});

const eventStore = useEventStore();  
const alertStore = useAlertStore();  

const topic = computed(() => {
  return props.id ? "Title:" : "New Volunteer Day Title:";
});

const notification = computed(() => {
  if (new Date(`${props.startDatetime}`) < new Date()) {
    return "This Volunteer Day has already happened, no SMS will be auto-sent.";
  } else {
    return "SMS sends out 1 week prior and 1 day prior to the event. Disabling stops SMS";
  }
});

const prettyDay = computed(() => {
  return format(new Date(props.startDatetime), 'PPP');
});

const isVisible = ref(props.show);
const copy = ref(false);
// const volunteers = ref(false);
const error = ref(false);
const numVolunteers = ref(0);
const form = ref({
  id: props.id,
  interest: props.interest,
  title: props.title,
  disabled: props.disabled,
  blurb: props.blurb,
  endText: props.endText,
  startDatetime: props.startDatetime
});

// Watch for changes to the show prop
watch(() => props.show, (newVal) => {
  isVisible.value = newVal;
});

// Watch for changes to isVisible and emit updates
watch(isVisible, (newVal) => {
  emit('update:show', newVal);
});

async function saveDay() {
  alertStore.clear();
  copy.value = false;
  form.value.garden = props.garden;
  if (form.value.id) {
    await eventStore.update(props.id, form.value);
    alertStore.success('Volunteer Day updated');
  } else {
    await eventStore.register(form.value);
    alertStore.success('Volunteer Day added');
    isVisible.value = false;
  }
  window.scrollTo(0,0);
}
const testDay = async() => {
  console.log('saveDay');
  // await volunteerDaysStore.testSms(form.value.id);
  eventStore.testSms(form.value.id).then((smsTest)=>{
        if (smsTest.copy) {
          copy.value = smsTest.copy;
          numVolunteers.value = smsTest.numVolunteers;
        } else {
          error.value = smsTest.error;
        }
      });
}
const sendSms = async() => {
  console.log('sending sms')
  eventStore.sendSms(form.value.id).then((smsResp)=>{
      console.log('smsResp: ', smsResp);
      alertStore.success('SMS sent to ' + smsResp.length + ' people');
      isVisible.value = false;
      window.scrollTo(0,0);
  });
}

const closeUp = () => {isVisible.value = false;}
const showExisting = (id) => {
            isVisible.value = true;
            form.value.id = id;
            console.log(id);
        };

</script>

<template>

  <!-- Card view (default) -->
  <div v-if="title && !tableRow" class="border-r-3 border rounded p-2 bg-[rgba(26,26,26,0.6)] border-[#3d4d36]/50 hover:bg-[rgba(26,26,26,0.8)] cursor-pointer transition-colors">
    <a @click.stop="$router.push(`/manage/events/${id}/edit`)" class="block no-underline hover:no-underline">
      <span class="text-md font-semibold text-[#f5f5f5]">{{ title }}</span>
      <br />
      <span class="text-sm text-[#d0d0d0]">{{ prettyDay }}</span>
      <br />
      <span class="text-sm text-[#d0d0d0]">{{ new Date(startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
    </a>
    <div class="flex justify-end mt-2">
      <button
        v-if="smsLink"
        @click.stop="$router.push(`/d/${id}`)"
        class="bg-custom-green hover:bg-custom-green/80 text-white text-xs py-1 px-3 rounded mr-2"
      >
        Public Page
      </button>
      <button
        @click.stop="showExisting(id)"
        class="bg-[rgba(138,163,124,0.3)] hover:bg-[rgba(138,163,124,0.5)] text-[#f5f5f5] font-bold py-1 px-3 rounded mr-2 text-xs"
      >
        SMS Manager
      </button>
    </div>
  </div>

  <!-- Table row: only action buttons (used inside Events table); SMS Manager opens VolunteerDayModal -->
  <div v-else-if="title && tableRow" class="flex items-center gap-2 flex-wrap">
    <button
      v-if="smsLink"
      @click.stop="$router.push(`/d/${id}`)"
      class="bg-custom-green hover:bg-custom-green/80 text-white text-xs py-2 px-3 sm:py-1 rounded font-medium"
    >
      Public Page
    </button>
    <button
      @click.stop="showExisting(id)"
      type="button"
      class="bg-emerald-100/90 text-emerald-950 border border-emerald-800/20 hover:bg-emerald-200/95 font-semibold py-2 px-3 sm:py-1 rounded text-xs dark:bg-[rgba(138,163,124,0.35)] dark:text-[#f5f5f5] dark:border-[#3d4d36] dark:hover:bg-[rgba(138,163,124,0.55)]"
    >
      SMS Manager
    </button>
  </div>

  <!-- Render inside our `<div id="modals"></div>` in index.html -->
  <Teleport to="#modals">
    <!-- Show / hide the modal -->
    <div v-if="isVisible" class="w-xl">
      <!-- The backdrop -->
      <div class="fixed inset-0 bg-gray-900 opacity-40"></div>
      <!-- *** START FORM *** -->


      <form>

      <div class="fixed inset-0 flex items-center justify-center z-30">
        <div
          class="vday-modal grid grid-cols-1 gap-2 p-4 w-full md:w-1/2 sm:m-1 m-3 rounded-lg border shadow-2xl border-[#5a6f50] bg-[#d2e4c8] text-[#1a2617] dark:border-[#3d4d36] dark:bg-[#2d3e26] dark:text-[#f5f5f5]"
        >
          <slot></slot>

          <label class="vday-label pb-1 block text-base font-medium text-[#1a2617] dark:text-[#e8eee4]">{{ topic }}</label>
          <input type="hidden" v-model="form.id" />
          <input class="vd-input w-full p-2 mb-3 rounded-md border shadow-inner focus:outline-none focus:ring-2 disabled:opacity-60 text-base" type="text" v-model="form.title" :disabled="!props.editor"/>
          <div>
            <label class="vday-label pb-1 block text-base font-medium text-[#1a2617] dark:text-[#e8eee4]">Send to group: </label>
            <select v-model="form.interest" class="vd-input w-full max-w-full rounded-md border p-2 shadow-inner focus:outline-none focus:ring-2 disabled:opacity-60 text-base" :disabled="!props.editor">
              <option>Everyone</option>
              <option v-for="interest in interests" :key="interest.id" :value="interest.tag">{{ interest.tag }}</option>
            </select>
          </div>

          <label class="vday-label p-1 block text-base font-medium text-[#1a2617] dark:text-[#e8eee4]">Event Information:</label>
          <textarea v-model="form.blurb" class="vd-input vd-textarea w-full p-2 m-r-4 mb-1 rounded-md border shadow-inner focus:outline-none focus:ring-2 disabled:opacity-60 resize-y min-h-[5rem] text-base" :disabled="!props.editor"></textarea>

          <label class="vday-label p-1 block text-base font-medium text-[#1a2617] dark:text-[#e8eee4]">Start Date & Time:</label>
          <div class="vday-datepicker mb-2">
            <VueDatePicker v-model="form.startDatetime" week-start="0" :disabled="!props.editor"></VueDatePicker>
          </div>

          <p class="vday-label p-1 text-base font-medium text-[#1a2617] dark:text-[#e8eee4]">Ending Time ("around noon"):</p>
          <input class="vd-input w-full p-2 mb-3 rounded-md border shadow-inner focus:outline-none focus:ring-2 disabled:opacity-60 text-base" type="text" v-model="form.endText" placeholder="around..." :disabled="!props.editor"/>
          <br />
          <label class="relative inline-flex items-center mb-3 cursor-pointer">
            <input type="checkbox" value="" class="sr-only peer" v-model="form.disabled" :disabled="!props.editor">
            <div class="w-11 h-6 bg-[#8aa37c] rounded-full peer peer-focus:ring-4 peer-focus:ring-custom-green/40 peer-checked:bg-[#4a5c42] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-[#6d8262] after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:peer-checked:bg-[#5a6f50]"></div>
            <span class="ml-3 text-sm font-medium text-[#1a2617] dark:text-[#e8eee4]">{{ form.disabled ? 'Auto-Send Disabled' : 'Auto-Send Enabled' }}</span>
          </label>


          <div
            class="modal-footer flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-[#5a6f50]/50 dark:border-[#3d4d36] rounded-b-md" v-if="props.editor">
            <span class="px-6
              py-2.5
              bg-orange-700
              text-white
              font-medium
              text-xs
              leading-tight
              uppercase
              rounded
              shadow-md
              hover:bg-orange-800 hover:shadow-lg
              focus:bg-orange-800 focus:shadow-lg focus:outline-none focus:ring-0
              active:bg-orange-900 active:shadow-lg
              transition
              duration-150
              cursor-pointer
              ease-in-out
              ml-1" @click="saveDay()">Save changes</span>

              <span class="px-6
              py-2.5
              bg-slate-600
              text-white
              font-medium
              text-xs
              leading-tight
              uppercase
              rounded
              shadow-md
              transition
              duration-150
              active:bg-slate-800 active:shadow-lg
              cursor-pointer
              ease-in-out
              ml-1" @click="testDay()">Test SMS</span>
          </div>

          <article v-if="copy" class="text-[#1a2617] dark:text-[#e8eee4]">
            <p class="p-1 mb-2 mt-2 text-sm rounded border border-yellow-600/30 bg-yellow-100 text-yellow-950 dark:border-yellow-700/50 dark:bg-yellow-950/40 dark:text-yellow-100">{{ notification }}</p>

            <div class="mb-3 text-sm">{{ copy }}</div>
            <div class="mb-3 font-bold">This will be sent to {{ numVolunteers }} people </div>
            <div>
              <button type="button" class="px-6 py-2.5 bg-slate-200 text-slate-900 font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-slate-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-400 active:bg-slate-400 transition cursor-pointer duration-150 ease-in-out dark:bg-slate-600 dark:text-white dark:hover:bg-slate-500 dark:focus:ring-slate-500" @click="sendSms()">Send Upcoming SMS NOW, knowing auto-send is setup</button>
            </div>
          </article>
          <div v-if="error" class="text-red-700 dark:text-red-400 text-sm">Error loading volunteer days: {{error}}</div>
          <div class="pr-4 justify-end flex flex-shrink-0 flex-wrap items-center">
            <button type="button" class="px-6 py-2.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-xs leading-tight uppercase rounded border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-400/40 transition duration-150 ease-in-out" @click="closeUp()">Close</button>
          </div>
        </div>
      </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Light mode (default) ──────────────────────────── */
.vd-input {
  background-color: #ffffff;
  color: #1a2617;
  border-color: #a8c49a;
  caret-color: #1a2617;
}

.vd-input::placeholder {
  color: #6b7d6e;
}

.vd-input:hover:not(:disabled),
.vd-input:focus,
.vd-input:active {
  background-color: #ffffff;
}

.vd-input:focus {
  border-color: #8aa37c;
  --tw-ring-color: rgba(138, 163, 124, 0.35);
}

.vd-input:-webkit-autofill,
.vd-input:-webkit-autofill:hover,
.vd-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
  -webkit-text-fill-color: #1a2617;
  caret-color: #1a2617;
}

/* ── Dark mode overrides ───────────────────────────── */
:global(.dark) .vd-input {
  background-color: #2d3e26;
  color: #f5f5f5;
  border-color: #3d4d36;
  caret-color: #f5f5f5;
}

:global(.dark) .vd-input::placeholder {
  color: #a8b89e;
}

:global(.dark) .vd-input:hover:not(:disabled),
:global(.dark) .vd-input:focus,
:global(.dark) .vd-input:active {
  background-color: #2d3e26;
}

:global(.dark) .vd-input:focus {
  border-color: #8aa37c;
}

:global(.dark) .vd-input:-webkit-autofill,
:global(.dark) .vd-input:-webkit-autofill:hover,
:global(.dark) .vd-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #2d3e26 inset;
  -webkit-text-fill-color: #f5f5f5;
  caret-color: #f5f5f5;
}
</style>

<style>
/* Teleported modal: enforce dark palette when html.dark (labels + shell can lose to global inherit). */
html.dark .vday-modal {
  background-color: #2d3e26 !important;
  color: #f5f5f5 !important;
  border-color: #3d4d36 !important;
}

html.dark .vday-modal .vday-label,
html.dark .vday-modal label.vday-label {
  color: #e8eee4 !important;
}

html.dark .vday-modal .vd-input,
html.dark .vday-modal select.vd-input {
  background-color: rgba(26, 26, 26, 0.55) !important;
  color: #f5f5f5 !important;
  border-color: #3d4d36 !important;
}

html.dark .vday-modal select.vd-input option {
  background-color: #2d3e26;
  color: #f5f5f5;
}

/* VueDatePicker inside SMS Manager modal (input is in modal; menu may teleport to body — see below). */
html.dark .vday-modal .dp__input_wrap {
  background-color: rgba(26, 26, 26, 0.55) !important;
  border-color: #3d4d36 !important;
}

html.dark .vday-modal .dp__input {
  background-color: rgba(26, 26, 26, 0.55) !important;
  color: #f5f5f5 !important;
  border-color: #3d4d36 !important;
}

html.dark .vday-modal .dp__input::placeholder {
  color: #a8b89e !important;
}

html.dark .vday-modal .dp__input_icon,
html.dark .vday-modal .dp__clear_icon,
html.dark .vday-modal .dp__icon {
  color: #d0d0d0 !important;
}

/* Picker popover (often rendered on document body) */
html.dark .dp__menu {
  background-color: rgba(26, 26, 26, 0.96) !important;
  border-color: #3d4d36 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45) !important;
}

html.dark .dp__calendar_header_item,
html.dark .dp__month_year_wrap,
html.dark .dp__inner_nav {
  color: #f5f5f5 !important;
}

html.dark .dp__cell_inner {
  color: #e8eee4 !important;
}

html.dark .dp__cell_inner:hover {
  background-color: rgba(138, 163, 124, 0.22) !important;
}

html.dark .dp__active_date,
html.dark .dp__range_start,
html.dark .dp__range_end {
  background-color: #8aa37c !important;
  color: #fff !important;
}

html.dark .dp__today {
  border-color: #8aa37c !important;
}

html.dark .dp__time_display,
html.dark .dp__time_input {
  color: #f5f5f5 !important;
}

html.dark .dp__time_input {
  background-color: rgba(26, 26, 26, 0.75) !important;
  border-color: #3d4d36 !important;
}
</style>
