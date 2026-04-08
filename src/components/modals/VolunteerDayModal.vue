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
        Quick Edit
      </button>
    </div>
  </div>

  <!-- Table row: only action buttons (used inside Events table); Quick Edit opens VolunteerDayModal -->
  <div v-else-if="title && tableRow" class="flex items-center gap-2 flex-wrap">
    <button
      v-if="smsLink"
      @click.stop="$router.push(`/d/${id}`)"
      class="bg-custom-green hover:bg-custom-green/80 text-white text-xs py-1 px-3 rounded"
    >
      Public Page
    </button>
    <button
      @click.stop="showExisting(id)"
      class="bg-[rgba(138,163,124,0.3)] hover:bg-[rgba(138,163,124,0.5)] text-[#f5f5f5] font-bold py-1 px-3 rounded text-xs"
    >
      Quick Edit
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
          class="grid grid-cols-1 gap-2 p-4 w-full md:w-1/2 sm:m-1 m-3 rounded-lg border border-[#5a6f50] shadow-2xl bg-[#d2e4c8] text-[#1a2617]"
        >
          <slot></slot>

          <label class="pb-1 block">{{ topic }}</label>
          <input type="hidden" v-model="form.id" />
          <input class="w-full p-2 mb-3 rounded-md border border-[#3d4d36] bg-[#2d3e26] text-[#f5f5f5] placeholder-[#a8b89e] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#8aa37c]/35 focus:border-[#8aa37c] hover:bg-[#2d3e26] focus:bg-[#2d3e26] active:bg-[#2d3e26] disabled:opacity-60" type="text" v-model="form.title" :disabled="!props.editor"/>
          <div>
            <label class="pb-1 block">Send to group: </label>
            <select v-model="form.interest" class="rounded-md border border-[#3d4d36] bg-[#2d3e26] text-[#f5f5f5] p-2 ml-1 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#8aa37c]/35 focus:border-[#8aa37c] hover:bg-[#2d3e26] focus:bg-[#2d3e26] active:bg-[#2d3e26] disabled:opacity-60" :disabled="!props.editor">
              <option>Everyone</option>
              <option v-for="interest in interests" :key="interest.id" :value="interest.tag">{{ interest.tag }}</option>
            </select>
          </div>
          
          <label class="p-1">Event Information:</label>
          <textarea v-model="form.blurb" class="volunteer-day-textarea w-full p-2 m-r-4 mb-1 rounded-md border border-[#3d4d36] bg-[#2d3e26] text-[#f5f5f5] shadow-inner caret-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#8aa37c]/35 focus:border-[#8aa37c] hover:bg-[#2d3e26] focus:bg-[#2d3e26] active:bg-[#2d3e26] disabled:opacity-60 resize-y min-h-[5rem]" :disabled="!props.editor"></textarea>
          
          <label class="p-1">Start Date & Time:</label>
          <VueDatePicker v-model="form.startDatetime" class="mb-2" week-start="0" :disabled="!props.editor"></VueDatePicker>

          <p class="p-1">Ending Time ("around noon"):</p>
          <input class="w-full p-2 mb-3 rounded-md border border-[#3d4d36] bg-[#2d3e26] text-[#f5f5f5] placeholder-[#a8b89e] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#8aa37c]/35 focus:border-[#8aa37c] hover:bg-[#2d3e26] focus:bg-[#2d3e26] active:bg-[#2d3e26] disabled:opacity-60" type="text" v-model="form.endText" placeholder="around..." :disabled="!props.editor"/>
          <br />
          <label class="relative inline-flex items-center mb-3 cursor-pointer">
            <input type="checkbox" value="" class="sr-only peer" v-model="form.disabled" :disabled="!props.editor">
            <div class="w-11 h-6 bg-[#8aa37c] rounded-full peer peer-focus:ring-4 peer-focus:ring-custom-green/40 peer-checked:bg-[#4a5c42] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-[#6d8262] after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            <span class="ml-3 text-sm font-medium text-[#1a2617]">{{ form.disabled ? 'Auto-Send Disabled' : 'Auto-Send Enabled' }}</span>
          </label>


          <div
            class="modal-footer flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-[#5a6f50]/50 rounded-b-md" v-if="props.editor">
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

          <article v-if="copy">
            <p class="p-1 mb-2 mt-2 text-sm bg-yellow-200">{{ notification }}</p>

            <div class="mb-3">{{ copy }}</div>
            <div class="mb-3 font-bold">This will be sent to {{ numVolunteers }} people </div>
            <div>
              <button class="px-6
              py-2.5
              bg-slate-200
              text-black
              font-medium
              text-xs
              leading-tight
              uppercase
              rounded
              shadow-md
              hover:bg-slate-400 hover:shadow-lg
              focus:bg-slate-500 focus:shadow-lg focus:outline-none focus:ring-0
              active:bg-slate-600 active:shadow-lg
              transition
              cursor-pointer
              duration-150
              ease-in-out" @click="sendSms()">Send Upcoming SMS NOW, knowing auto-send is setup</button>
            </div>
          </article>
          <div v-if="error" class="text-danger">Error loading volunteer days: {{error}}</div>
          <div class="pr-4 justify-end flex flex-shrink-0 flex-wrap items-center">
            <button type="button" class="px-6
                py-2.5
                text-red
                font-medium
                text-xs
                leading-tight
                uppercase
                rounded
                border-0
                hover:hover:shadow-lg
                focus:focus:shadow-lg focus:outline-none focus:ring-0
                active:shadow-lg
                transition
                duration-150
                ease-in-out" @click="closeUp()">Close</button>
          </div>
        </div>
      </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.volunteer-day-textarea:-webkit-autofill,
.volunteer-day-textarea:-webkit-autofill:hover,
.volunteer-day-textarea:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #2d3e26 inset;
  -webkit-text-fill-color: #f5f5f5;
  caret-color: #f5f5f5;
}
</style>
