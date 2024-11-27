<script setup>
import { computed, ref, watch } from 'vue';
import { useEventStore, useAlertStore } from '@/stores';
import { format } from 'date-fns';
import { defineProps } from 'vue';

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
  editor: Boolean
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

const show = ref(false);
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
    show.value = false;
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
      show.value = false;
      window.scrollTo(0,0);
  });
}

const closeUp = () => {show.value = false;}
const showExisting = (id) => {
            show.value = true;
            form.value.id = id;
            console.log(id);
        };

let showCreateButton;

watch(() => props.editor, (newVal, oldVal) => {
  showCreateButton = computed(() => !props.title && newVal);
});

</script>

<template>

  <div v-if="title" class="border-r-3 border rounded p-3 bg-slate-100 cursor-pointer">
    <a>
      <span class="underline text-lg">{{ title }}</span>
      <br />
      <span class="text-sm">{{ prettyDay }}</span>
      <br />
      <span class="text-sm">{{ new Date(startDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
    </a>
    <div class="flex justify-end mt-2">
      <button
        @click.stop="showExisting(id)"
        class="bg-custom-peach hover:bg-custom-peach/80 text-black font-bold py-1 px-3 rounded mr-2 text-xs"
      >
        {{ new Date(startDatetime) < new Date() ? 'View SMS' : 'Edit SMS' }}
      </button>
      <button
        @click.stop="$router.push(`/event/edit/${id}`)"
        class="bg-custom-green hover:bg-custom-green/80 text-white font-bold py-1 px-3 rounded text-xs"
      >
        Manage Event
      </button>
    </div>
    <div class="mt-2 text-right">
      <a :href="`/d/${id}`" class="text-blue-600 hover:underline text-xs">View Page</a>
    </div>
  </div>

  <button v-if="showCreateButton" type="button" class="px-5
              py-1.5
              bg-blue-600
              text-white
              font-medium
              text-xs
              leading-tight
              uppercase
              rounded
              shadow-md
              hover:bg-blue-700 hover:shadow-lg
              focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0
              active:bg-blue-800 active:shadow-lg
              transition
              duration-150
              ease-in-out" 

              @click="show = true">
              Create Volunteer Day
            </button>

  <!-- Render inside our `<div id="modals"></div>` in index.html -->
  <Teleport to="#modals">
    <!-- Show / hide the modal -->
    <div v-if="show" class="w-xl">
      <!-- The backdrop -->
      <div class="fixed inset-0 bg-gray-900 opacity-40"></div>
      <!-- *** START FORM *** -->


      <form>

      <div class="fixed inset-0 flex items-center justify-center">
        <div class="dark:bg-[#d2bc9b] bg-white text-black grid grid-cols-1 gap-2 p-3 w-full md:w-1/2 sm:m-1 m-3 rounded-md">
          <slot></slot>

          <label class="pb-1 block">{{ topic }}</label>
          <input type="hidden" v-model="form.id" />
          <input class="p-1 mb-3 rounded-md border" type="text" v-model="form.title" :disabled="!props.editor"/>
          <div>
            <label class="pb-1 block">Send to group: </label>
            <select v-model="form.interest" class="rounded-md border p-1 ml-1" :disabled="!props.editor">
              <option>Everyone</option>
              <option v-for="interest in interests" :key="interest.id" :value="interest.tag">{{ interest.tag }}</option>
            </select>
          </div>
          
          <label class="p-1">Event Information:</label>
          <textarea v-model="form.blurb" class="form-control p-1 m-r-4 mb-1" :disabled="!props.editor"></textarea>
          
          <label class="p-1">Start Date & Time:</label>
          <VueDatePicker v-model="form.startDatetime" class="mb-2" week-start="0" :disabled="!props.editor"></VueDatePicker>

          <p class="p-1">Ending Time ("around noon"):</p>
          <input class="p-1 mb-3 rounded-md border" type="text" v-model="form.endText" placeholder="around..." :disabled="!props.editor"/>
          <br />
          <label class="relative inline-flex items-center mb-3 cursor-pointer">
            <input type="checkbox" value="" class="sr-only peer" v-model="form.disabled" :disabled="!props.editor">
            <div class="w-11 h-6 bg-blue-600 dark:bg-blue-300 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:bg-gray-800 dark:peer-checked:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"></div>
            <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-200">{{ form.disabled ? 'Auto-Send Disabled' : 'Auto-Send Enabled' }}</span>
          </label>


          <div
            class="modal-footer flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-gray-200 rounded-b-md" v-if="props.editor">
            <span class="px-6
              py-2.5
              bg-blue-600
              text-white
              font-medium
              text-xs
              leading-tight
              uppercase
              rounded
              shadow-md
              hover:bg-blue-700 hover:shadow-lg
              focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0
              active:bg-blue-800 active:shadow-lg
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
