<script>
import { computed } from "vue";
import { useVolunteerDaysStore, useAlertStore } from '@/stores';
import { format } from 'date-fns'

export default {
  props: {
   title: String,
   blurb: String,
   endText: String,
   startDatetime: String,
   createdAt: String,
   updatedAt: String,
   publishedAt: String,
   daysJournal: String,
   id: Number,
   garden: Number,
   garden_tasks: Array,
   disabled: Boolean,
   interests: Array,
   interest: String
 },
 setup(props) {
  const volunteerDaysStore = useVolunteerDaysStore();  
  const alertStore = useAlertStore();  
  
  const topic = computed(()=> {
    return (props.id) ? "Title:" : "New Volunteer Day Title:"
  })
  const notification = computed(() => {
    if (new Date(`${props.startDatetime}`) < new Date()) {
      return "This Volunteer Day has already happened, no SMS will be auto-sent.";
    } else {
      return "SMS sends out 3 days before, and day of. Disabling stops SMS"
    }
  })
  const prettyDay = computed(() => {
    return format(new Date(props.startDatetime), 'PPP');
  })
  return {alertStore, volunteerDaysStore, topic, notification, prettyDay};
 },
  data() {
    return {
      show: false,
      copy: false,
      volunteers: false,
      error: false,
      form : {
        id: this.id,
        interest: this.interest,
        title: this.title,
        disabled: this.disabled,
        blurb: this.blurb,
        endText: this.endText,
        startDatetime: this.startDatetime
      }
    }
  },
  methods: {
    async saveDay() {
      this.alertStore.clear();
      this.copy = false;
      this.form.garden = this.garden
      if (this.form.id) {
          await this.volunteerDaysStore.update(this.id, this.form);
          this.alertStore.success('Volunteer Day updated');
      } else {
          await this.volunteerDaysStore.register(this.form);
          this.alertStore.success('Volunteer Day added');
          this.show = false;
      }
      window.scrollTo(0,0);
    },
    async testDay() {
      this.volunteerDaysStore.testSms(this.id).then((smsTest)=>{
        if (smsTest.copy) {
          this.copy = smsTest.copy;
          this.numVolunteers = smsTest.numVolunteers;
        } else {
          this.error = smsTest.error;
        }
      });
    },
    async sendSms() {
      this.volunteerDaysStore.sendSms(this.id).then((smsTest)=>{
        this.alertStore.success(`SMS Sent to ${smsTest.length} volunteers`);
        this.show = false;
      });
    },
    async closeUp() {
      this.volunteerDaysStore.closeUpdate(this.id);
      this.show = false;
      this.copy= false;
      this.alertStore.clear()
    },
    async showExisting(id) {
      this.show = true;
      this.form.id = id;
      console.log(id);
    }
  }
}
</script>

<template>

  <div v-if="title" class="border-r-3 border rounded p-3 bg-slate-100 hover:opacity-75 cursor-pointer"  @click="() => {showExisting(id)}">
    <a class="hover:text-blue ">
      <span class="underline text-xl">{{ title }}</span>
      <br />
      {{ prettyDay }}
    </a>
  </div>

  <button v-else type="button" class="px-5
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
              ease-in-out" @click="show = true">
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
        <div class="bg-white text-black grid grid-cols-1 md:grid-cols-1 gap-2 p-3 md:w-1/2">
          <slot></slot>

          <label class="pb-1 block">{{ topic }}</label>
          <input type="hidden" v-model="form.id" />
          <input class="p-1 mb-3 rounded-md border" type="text" v-model="form.title" />
          <div>
            <label class="pb-1 block">Send to group: </label>
            <select v-model="form.interest" class="rounded-md border p-1 ml-1">
              <option>Everyone</option>
              <option v-for="interest in interests" :key="interest.id" :value="interest.tag">{{ interest.tag }}</option>
            </select>
          </div>
          
          <label class="p-1">Event Information:</label>
          <textarea v-model="form.blurb" class="form-control p-1 m-r-4 mb-1"></textarea>
          
          <label class="p-1">Start Date & Time:</label>
          <VueDatePicker v-model="form.startDatetime" class="mb-2"></VueDatePicker>

          <p class="p-1">Ending Time ("around noon"):</p>
          <input class="p-1 mb-3 rounded-md border" type="text" v-model="form.endText" placeholder="around..."/>
          <br />
          <label class="relative inline-flex items-center mb-3 cursor-pointer">
            <input type="checkbox" value="" class="sr-only peer" v-model="form.disabled">
            <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Disabled</span>
          </label>


          <div
            class="modal-footer flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-gray-200 rounded-b-md">
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