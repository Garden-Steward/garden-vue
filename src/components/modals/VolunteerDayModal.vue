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
   id: Number,
   garden: Number
 },
 setup(props) {
  const volunteerDaysStore = useVolunteerDaysStore();  
  const alertStore = useAlertStore();  
  
  const topic = computed(()=> {
    return (props.id) ? "Title:" : "Volunteer Day Title:"
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
        title: this.title,
        disabled: this.disabled,
        blurb: this.blurb,
        endText: this.endText,
        startDatetime: this.startDatetime
      }
    }
  },
  methods: {
    async submit() {
      let message;
      this.copy = false;
      // let date = this.form.startDatetimeTime.toISOString();
      // this.form.startDatetime = format(new Date(date), 'yyyy-MM-dd')
      // this.form.startTime = format (new Date(date), 'HH:mm:ss.SSS');
      console.log('submitted', this.id)
      this.show = false;
      this.form.garden = this.garden
      if (this.id) {
          await this.volunteerDaysStore.update(this.id, this.form);
          message = 'Volunteer Day updated';
          this.show=false;
          this.alertStore.success(message);
      } else {
          await this.volunteerDaysStore.register(this.form);
          message = 'Volunteer Day added';
      }
    },
    async testDay() {
      this.volunteerDaysStore.testSms(this.id).then((smsTest)=>{
        console.log("testDay: ", smsTest)
        if (smsTest.copy) {
          this.copy = smsTest.copy;
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
    }
  }
}
</script>

<template>

  <div v-if="title" class="border-r-4 border rounded p-4 bg-slate-100 hover:opacity-75 cursor-pointer"  @click="show = true">
    <a class="hover:text-blue ">
      <span class="underline text-xl">{{ title }}</span>
      <br />
      {{ prettyDay }}
    </a>
  </div>

  <button v-else type="button" class="px-6
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


      <form @submit.prevent="submit">

      <div class="fixed inset-0 flex items-center justify-center">
        <div class="bg-white text-black p-6 w-50">
          <slot></slot>

          <p class="pb-1">{{ topic }}</p>
          <input class="p-1 mb-3 rounded-md border" type="text" v-model="form.title" />
          
          <p class="p-1">Event Information:</p>
          <textarea v-model="form.blurb" class="form-control p-1 m-r-4 mb-1"></textarea>
          
          <p class="p-1">Start Date & Time:</p>
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
            <button class="px-6
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
              ease-in-out
              ml-1" type="submit">Save changes</button>

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
            <div>
              <span class="px-6
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
              ease-in-out" @click="sendSms()">Send Upcoming SMS NOW, knowing auto-send is setup</span>
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
                ease-in-out" @click="()=> {show = false;copy= false}">Close</button>
          </div>
        </div>
      </div>
      </form>
    </div>
  </Teleport>
</template>