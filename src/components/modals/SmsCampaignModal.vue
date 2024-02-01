<script>
import { computed } from "vue";
import { useSMSCampaignStore, useAlertStore } from '@/stores';
import { format } from 'date-fns'
import UserProfileDisplay from "../UserProfileDisplay.vue";

export default {
    props: {
        body: String,
        createdAt: String,
        updatedAt: String,
        publishedAt: String,
        id: Number,
        garden: Number,
        sent: Array,
        type: String,
        confirmed: Array,
        denied: Array,
        interests: Array,
        alert: Boolean,
    },
    setup(props) {
        const smsCampaignStore = useSMSCampaignStore();
        const alertStore = useAlertStore();
        const sentCount = computed(() => {
            return props.sent.length;
        });
        const prettyDay = computed(() => {
            return format(new Date(props.createdAt), 'PPP');
        });
        const protect = computed(() => {
            return (props.id) ? 1 : 0;
        });
        const bodyExcerpt = computed(() => {
            return props.body?.slice(0, 50);
        });
        const copyRSVPNumbers = async () => {
            // Ensure there's no trailing comma by not adding a comma after the last phone number
            const phoneNumbers = props.confirmed.map(conf => conf.phoneNumber).join(',');
            try {
                if(phoneNumbers.length > 0) {
                    await navigator.clipboard.writeText(phoneNumbers);
                    alert('RSVP phone numbers copied to clipboard!');
                }
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        };
        return { alertStore, smsCampaignStore, prettyDay, bodyExcerpt, sentCount, protect, copyRSVPNumbers };
    },
    data() {
        return {
            show: false,
            copy: false,
            volunteers: false,
            error: false,
            selected: 'Everyone',
            form: {
                id: this.id,
                garden: this.garden,
                interest: 'Everyone',
                body: this.body,
                type: this.type || 'basic', // default value
                alert: this.alert || false, // default value
            }
        };
    },
    watch: {
        'form.type'(newValue) {
            if (newValue === 'basic') {
                this.form.alert = false;
            }
        },
    },
    methods: {
        async testCampaign() {
            const testData = Object.assign(this.form, this.garden);
            this.smsCampaignStore.testSms(testData).then((smsTest) => {
                if (smsTest.copy) {
                    this.copy = smsTest.copy;
                    this.numVolunteers = smsTest.numVolunteers;
                }
                else {
                    this.error = smsTest.error;
                }
            });
        },
        async sendSms() {
            // HTMLSelectElement(e.target).addAttribute('disabled');
            this.show = false;
            this.copy = false;
            this.alertStore.clear();
            window.scrollTo(0,0);

            this.smsCampaignStore.sendSms(this.form).then((smsTest) => {
                this.alertStore.success(`SMS Sent to ${smsTest.length} volunteers`);
                this.show = false;
            });
        },
        async closeUp() {
            this.smsCampaignStore.closeUpdate(this.id);
            this.show = false;
            this.copy = false;
            this.alertStore.clear();
        },
        async showExisting(id) {
            this.show = true;
            this.form.id = id;
            console.log(id);
        }
    },
    components: { UserProfileDisplay }
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
        <div class="bg-white text-black grid grid-cols-1 md:w-1/2 w-full gap-2 p-3 m-3">
          <slot></slot>

          <input type="hidden" v-model="form.id" />
          <input type="hidden" v-model="form.garden" />
          <div>
            <div v-if="!id">
              <label class="pb-1 block">Send to group: </label>
              <select v-model="form.interest" class="rounded-md border p-1 ml-1">
                <option>Everyone</option>
                <option 
                v-for="interest in interests" 
                :key="interest.id"
                :value="interest.tag">{{ interest.tag }}</option>
              </select>
              <label class="pb-1 block">Campaign Type: </label>
              <select v-model="form.type" class="rounded-md mt-2 border p-1 ml-1">
                <option value="basic">Basic</option>
                <option value="rsvp">RSVP</option>
              </select>
            </div>
            <div v-if="id">
              <p>Type: <strong>{{ type }}</strong></p>
              <p>Reached: {{ sentCount }} people</p>
            </div>
            <label class="p-1">SMS Body:</label>
            <textarea v-model="form.body" rows=5 class="form-control p-1 m-r-4 mb-1"  :disabled="protect == 1"></textarea>

            <div v-if="form.type === 'rsvp' && !id">
                <label for="alert-switch">Sign up for alerts? </label> &nbsp;
                <input type="checkbox" id="alert-switch" v-model="form.alert"> Yes
            </div>

            <div v-if="confirmed?.length">
            <h3>The following people confirmed to your RSVP request:</h3>
                <div v-for="conf in confirmed"
                :key="conf.id"
                class="flex items-center">
                  <UserProfileDisplay :volunteer="conf" />
                </div> 
                <button @click="copyRSVPNumbers" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">Copy RSVPs #</button>
            </div>
            
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
                active:bg-slate-800 active:shadow-lg
                cursor-pointer
                ease-in-out
                ml-1" @click="testCampaign()">Test SMS</span>
            </div>
          </div>

          <article v-if="copy">
            <div v-if="notification">
              <p class="p-1 mb-2 mt-2 text-sm bg-yellow-200">{{ notification }}</p>
            </div>

            <div class="mb-3"><pre style='font-family: "Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;'>{{ copy }}</pre></div>
            <div class="mb-3 font-bold">This will be sent to {{ numVolunteers }} people </div>
            <div>
              <button type="button" class="px-6
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
              ease-in-out" @click="(e) => {sendSms(e)}">Send SMS NOW</button>
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