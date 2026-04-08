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
        editor: Boolean,
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
            return (props.sent && props.sent.length) ? props.sent.length : 0;
        });
        const confirmedCount = computed(() => {
            const c = props.confirmed;
            return Array.isArray(c) ? c.length : 0;
        });
        /** RSVP: always show count (including 0). Other types: only when count > 0. */
        const showConfirmedOnListing = computed(() => {
            return (props.type || '').toLowerCase() === 'rsvp' || confirmedCount.value > 0;
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
        /** e.g. recurring-task → "Recurring Task", marketing_blast → "Marketing Blast" */
        const typeLabel = computed(() => {
            const raw = props.type;
            if (!raw || typeof raw !== 'string') return '';
            return raw
                .replace(/[_-]+/g, ' ')
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
        });
        const normalizedCampaignType = computed(() =>
            (props.type || '').toLowerCase().replace(/_/g, '-')
        );
        const typeBadgeClass = computed(() => {
            const base =
                'inline-block shrink-0 rounded-full uppercase tracking-wide px-2.5 py-2 text-sm font-semibold leading-tight shadow-sm ';
            const t = normalizedCampaignType.value;
            if (t === 'rsvp') {
                return base + 'bg-violet-700 text-violet-50 border border-violet-900/40';
            }
            if (t === 'recurring-task') {
                return base + 'bg-[#2a4030] text-[#f5f5f5] border border-[#1f3024]';
            }
            return base + 'bg-darker-green text-white border border-[#5a6f50]/60';
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
        return { alertStore, smsCampaignStore, prettyDay, bodyExcerpt, typeLabel, typeBadgeClass, sentCount, confirmedCount, showConfirmedOnListing, protect, copyRSVPNumbers };
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

  <div
    v-if="bodyExcerpt"
    class="rounded-lg border border-[#6b8a5c]/70 p-3 bg-[#c4d9b0] hover:bg-[#b5cf9e] cursor-pointer transition-colors shadow-sm"
    @click="() => {showExisting(id)}"
  >
    <div class="flex justify-between items-start gap-2">
      <span class="underline text-lg text-[#1a2617]">{{ prettyDay }}</span>
      <span
        v-if="typeLabel"
        :class="typeBadgeClass"
      >{{ typeLabel }}</span>
    </div>
    <div class="mt-1">
      <span class="text-[#2d3e26]">{{ bodyExcerpt }}</span>
    </div>
    <div
      class="mt-3 mb-0.5 h-px w-[calc(100%-1rem)] max-w-full mx-auto bg-[#8aa37c]/90"
      role="presentation"
      aria-hidden="true"
    />
    <div class="mt-2 flex flex-wrap items-center gap-[15px]">
      <div class="italic text-[#3d4d36]">
        Sent Audience:
        <span
          class="inline-flex items-center justify-center h-7 min-w-7 px-2 mx-1 rounded-full bg-[#9db892] text-[#1a2617] not-italic font-semibold text-sm tabular-nums shadow-sm border border-[#7f9a72]/50 align-middle"
        >{{ sentCount }}</span>
      </div>
      <div v-if="showConfirmedOnListing" class="italic text-[#3d4d36]">
        Confirmed:
        <span
          class="inline-flex items-center justify-center h-7 min-w-7 px-2 mx-1 rounded-full bg-[#9db892] text-[#1a2617] not-italic font-semibold text-sm tabular-nums shadow-sm border border-[#7f9a72]/50 align-middle"
        >{{ confirmedCount }}</span>
      </div>
    </div>
  </div>

  <button
    v-else-if="this.editor"
    type="button"
    class="px-4 py-2 bg-custom-green text-white font-medium text-sm rounded shadow-md hover:bg-darker-green focus:bg-darker-green focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
    @click="show = true"
  >
    Create a new Group SMS
  </button>

  <!-- Render inside our `<div id="modals"></div>` in index.html -->
  <Teleport to="#modals">
    <!-- Show / hide the modal -->
    <div v-if="show" class="w-xl">
      <!-- The backdrop -->
      <div class="fixed inset-0 bg-gray-900 opacity-40"></div>
      <!-- *** START FORM *** -->


      <form>

      <div class="fixed inset-0 flex items-center justify-center z-30">
        <div
          class="grid grid-cols-1 gap-2 p-4 w-full md:w-1/2 sm:m-1 m-3 rounded-lg border border-[#5a6f50] shadow-2xl bg-[#d2e4c8] text-[#1a2617] max-h-[90vh] overflow-y-auto"
        >
          <div
            v-if="!id"
            class="rounded-t-lg bg-[#5d7254] -mx-4 -mt-4 px-4 py-3 mb-2 text-[#f5f5f5] border-b border-[#4a5c42]"
          >
            <h2 class="text-lg font-semibold">Create a new Group SMS</h2>
          </div>

          <input type="hidden" v-model="form.id" />
          <input type="hidden" v-model="form.garden" />
          <div>
            <div v-if="!id">
              <label class="pb-1 block font-medium">Send to group: </label>
              <select v-model="form.interest" class="rounded-md border border-[#3d4d36] bg-[#2d3e26] text-[#f5f5f5] p-2 ml-1 mb-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#8aa37c]/35 focus:border-[#8aa37c] hover:bg-[#2d3e26] focus:bg-[#2d3e26] active:bg-[#2d3e26]">
                <option>Everyone</option>
                <option 
                v-for="interest in interests" 
                :key="interest.id"
                :value="interest.tag">{{ interest.tag }}</option>
              </select>
              <label class="pb-1 block font-medium">Campaign Type: </label>
              <select v-model="form.type" class="rounded-md border border-[#3d4d36] bg-[#2d3e26] text-[#f5f5f5] p-2 ml-1 mb-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#8aa37c]/35 focus:border-[#8aa37c] hover:bg-[#2d3e26] focus:bg-[#2d3e26] active:bg-[#2d3e26]">
                <option value="basic">Basic</option>
                <option value="rsvp">RSVP</option>
              </select>
            </div>
            <div v-if="id" class="mb-2 text-[#1a2617]">
              <p>Type: <strong>{{ type }}</strong></p>
              <p>Reached: {{ sentCount }} people</p>
            </div>
            <label class="p-1 block font-medium">SMS Body:</label>
            <textarea
              v-model="form.body"
              rows="5"
              class="sms-body-input p-2 mb-2 w-full min-h-[8rem] rounded-md border border-[#3d4d36] bg-[#2d3e26] text-[#f5f5f5] placeholder-[#a8b89e] shadow-inner caret-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#8aa37c]/35 focus:border-[#8aa37c] hover:bg-[#2d3e26] focus:bg-[#2d3e26] active:bg-[#2d3e26] disabled:opacity-60 resize-y"
              placeholder="SMS message text…"
              :disabled="protect == 1"
            ></textarea>

            <div v-if="form.type === 'rsvp' && !id" class="mb-2">
                <label for="alert-switch" class="font-medium">Sign up for alerts? </label>
                <input type="checkbox" id="alert-switch" v-model="form.alert" class="ml-2 align-middle"> <span class="text-sm">Yes</span>
            </div>

            <div v-if="confirmed?.length" class="mt-3">
            <h3 class="font-semibold text-[#1a2617] mb-2">The following people confirmed to your RSVP request:</h3>
                <div v-for="conf in confirmed"
                :key="conf.id"
                class="flex items-center">
                  <UserProfileDisplay :volunteer="conf" />
                </div> 
                <button type="button" @click="copyRSVPNumbers" class="mt-2 px-4 py-2 bg-custom-green text-white rounded shadow-md hover:bg-darker-green">Copy RSVPs #</button>
            </div>
            
            <div v-if="!id"
              class="modal-footer flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-[#5a6f50]/50 rounded-b-md">
              <span class="px-6
                py-2.5
                bg-custom-green
                text-white
                font-medium
                text-xs
                leading-tight
                uppercase
                rounded
                shadow-md
                hover:bg-darker-green hover:shadow-lg
                focus:bg-darker-green focus:shadow-lg focus:outline-none focus:ring-0
                active:shadow-lg
                cursor-pointer
                ease-in-out
                ml-1" @click="testCampaign()">Test SMS</span>
            </div>
          </div>

          <article v-if="copy">
            <div v-if="notification">
              <p class="p-2 mb-2 mt-2 text-sm rounded-md border border-[#b89a2e]/60 bg-[#f5ebc4] text-[#1a2617]">{{ notification }}</p>
            </div>

            <div class="mb-3 overflow-x-auto"><pre class="text-sm text-[#1a2617] font-sans whitespace-pre-wrap">{{ copy }}</pre></div>
            <div class="mb-3 font-bold text-[#1a2617]">This will be sent to {{ numVolunteers }} people </div>
            <div>
              <button type="button" class="px-6
              py-2.5
              bg-[#5a6f50]
              text-[#f5f5f5]
              font-medium
              text-xs
              leading-tight
              uppercase
              rounded
              shadow-md
              hover:bg-[#4a5c42] hover:shadow-lg
              focus:outline-none focus:ring-0
              active:shadow-lg
              transition
              cursor-pointer
              duration-150
              ease-in-out" @click="(e) => {sendSms(e)}">Send SMS NOW</button>
            </div>
          </article>
          <div v-if="error" class="text-red-700 font-medium">Error loading SMS Campaigns: {{error}}</div>
          <div class="pr-4 justify-end flex flex-shrink-0 flex-wrap items-center">
            <button type="button" class="px-6
                py-2.5
                text-[#4a5c42]
                font-medium
                text-xs
                leading-tight
                uppercase
                rounded
                border-0
                hover:text-[#1a2617] hover:underline
                focus:outline-none focus:ring-0
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
/* Keep dark green when focused; override Chrome autofill / UA defaults */
.sms-body-input:-webkit-autofill,
.sms-body-input:-webkit-autofill:hover,
.sms-body-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #2d3e26 inset;
  -webkit-text-fill-color: #f5f5f5;
  caret-color: #f5f5f5;
}
</style>