<script>
import { computed } from "vue";
import { useSMSCampaignStore, useAlertStore } from '@/stores';
import { format } from 'date-fns'

export default {
  props: {
   body: String,
   createdAt: String,
   updatedAt: String,
   publishedAt: String,
   id: Number,
   garden: Number,
   sent: Array,
   interests: Array
 },
 setup(props) {
  const smsCampaignStore = useSMSCampaignStore();  
  const alertStore = useAlertStore();  
  console.log("interests: ", props.interests)
 
  const sentCount = computed(() => {
    return props.sent.length;
  })
 const prettyDay = computed(() => {
    return format(new Date(props.createdAt), 'PPP');
  })
 const protect = computed(()=> {
    return (props.id) ? 'disabled' : '';
 })
 const bodyExcerpt = computed(() => {
    return props.body?.slice(0,50);
  })
  return {alertStore, smsCampaignStore, prettyDay, bodyExcerpt, sentCount, protect};
 },
  data() {
    return {
      show: false,
      copy: false,
      volunteers: false,
      error: false,
      selected: 'Everyone',
      form : {
        id: this.id,
        garden: this.garden,
        body: this.body,
      }
    }
  },
  methods: {
    async testCampaign() {
      const testData = Object.assign(this.form, this.garden);
      this.smsCampaignStore.testSms(testData).then((smsTest)=>{
        if (smsTest.copy) {
          this.copy = smsTest.copy;
          this.numVolunteers = smsTest.numVolunteers;
        } else {
          this.error = smsTest.error;
        }
      });
    },
    async sendSms() {
      this.smsCampaignStore.sendSms(this.form).then((smsTest)=>{
        this.alertStore.success(`SMS Sent to ${smsTest.length} volunteers`);
        this.show = false;
      });
    },
    async closeUp() {
      this.smsCampaignStore.closeUpdate(this.id);
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

  <div v-if="bodyExcerpt" class="border-r-2 border rounded p-2 bg-slate-100 hover:opacity-75 cursor-pointer"  @click="() => {showExisting(id)}">
      <span class="underline text-lg">{{ prettyDay }}</span>
      <br />
      {{ bodyExcerpt }}
      <br />Sent to {{ sentCount }} people
  </div>

  <button v-else type="button" class="px-6
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
              Create New SMS Campaign
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
        <div class="bg-white text-black p-6 w-50">
          <slot></slot>

          <input type="hidden" v-model="form.id" />
          <input type="hidden" v-model="form.garden" />
          <div v-bind:class="{disabled: id}">
            <div>
              <label class="pb-1 block">Send to group: </label>
              <select v-model="form.interest" class="rounded-md border p-1 ml-1">
                <option>Everyone</option>
                <option 
                v-for="interest in interests" 
                :key="interest.id" 
                :selected="option == 'Volunteering'"
                :value="interest.tag">{{ interest.tag }}</option>
              </select>
            </div>
            
            <label class="p-1">SMS Body:</label>
            <textarea v-model="form.body" rows=5 class="form-control p-1 m-r-4 mb-1"></textarea>
            
            <div v-if="!id"
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
                active:bg-slate-800 active:shadow-lg
                cursor-pointer
                ease-in-out
                ml-1" @click="testCampaign()">Test SMS</span>
            </div>
          </div>

          <article v-if="copy">
            <p class="p-1 mb-2 mt-2 text-sm bg-yellow-200">{{ notification }}</p>

            <div class="mb-3">{{ copy }}</div>
            <div class="mb-3 font-bold">This will be sent to {{ numVolunteers }} people </div>
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
              ease-in-out" @click="sendSms()">Send SMS NOW</span>
            </div>
          </article>
          <div v-if="error" class="text-danger">Error loading SMS Campaigns: {{error}}</div>
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