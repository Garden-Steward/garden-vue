<script>
import { computed } from "vue";
import { useSMSCampaignStore, useAlertStore, useProjectsStore } from '@/stores';
import { format } from 'date-fns'
import UserProfileDisplay from "../UserProfileDisplay.vue";
import { getCampaignBadgeClasses, getCampaignTypeLabel } from '@/_config/GardenConfig';

const POLL_LABELS = ['A', 'B', 'C', 'D'];

function sevenDaysFromNow() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    // Return "YYYY-MM-DDTHH:mm" for datetime-local binding
    return d.toISOString().slice(0, 16);
}

function emptyOption(idx) {
    return {
        label: POLL_LABELS[idx],
        date: '',
        time: '',
        textType: 'custom',   // 'custom' | 'project'
        textCustom: '',
        textProjectId: null,
    };
}

function cloneOption(src, idx) {
    return {
        label: POLL_LABELS[idx],
        date: src.date,
        time: src.time,
        textType: src.textType,
        textCustom: src.textCustom,
        textProjectId: src.textProjectId,
    };
}

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
        // poll-specific
        poll_options: Array,
        closes_at: String,
        option_a: Array,
        option_b: Array,
        option_c: Array,
        option_d: Array,
    },
    setup(props) {
        const smsCampaignStore = useSMSCampaignStore();
        const alertStore = useAlertStore();
        const projectsStore = useProjectsStore();

        const sentCount = computed(() => (props.sent?.length) || 0);
        const confirmedCount = computed(() => Array.isArray(props.confirmed) ? props.confirmed.length : 0);
        const totalVotes = computed(() =>
            [props.option_a, props.option_b, props.option_c, props.option_d]
                .filter(Array.isArray)
                .reduce((sum, arr) => sum + arr.length, 0)
        );
        const pollVoteCounts = computed(() => {
            const map = { A: 0, B: 0, C: 0, D: 0 };
            if (Array.isArray(props.option_a)) map.A = props.option_a.length;
            if (Array.isArray(props.option_b)) map.B = props.option_b.length;
            if (Array.isArray(props.option_c)) map.C = props.option_c.length;
            if (Array.isArray(props.option_d)) map.D = props.option_d.length;
            return map;
        });
        const pollWinnerLabel = computed(() => {
            const counts = pollVoteCounts.value;
            const max = Math.max(...Object.values(counts));
            if (max === 0) return null;
            return Object.keys(counts).find(k => counts[k] === max);
        });
        const isPollClosed = computed(() => props.closes_at ? new Date(props.closes_at) < new Date() : false);
        const showConfirmedOnListing = computed(() =>
            (props.type || '').toLowerCase() === 'rsvp' || confirmedCount.value > 0
        );
        const showVotesOnListing = computed(() => (props.type || '').toLowerCase() === 'poll');
        const prettyDay = computed(() => format(new Date(props.createdAt), 'PPP'));
        const protect = computed(() => props.id ? 1 : 0);
        const bodyExcerpt = computed(() => props.body?.slice(0, 50));
        const typeLabel = computed(() => getCampaignTypeLabel(props.type));
        const typeBadgeClass = computed(() => getCampaignBadgeClasses(props.type));
        const prettyClosesAt = computed(() => props.closes_at ? format(new Date(props.closes_at), 'PPP p') : null);

        const pollVoters = computed(() => ({
            A: Array.isArray(props.option_a) ? props.option_a : [],
            B: Array.isArray(props.option_b) ? props.option_b : [],
            C: Array.isArray(props.option_c) ? props.option_c : [],
            D: Array.isArray(props.option_d) ? props.option_d : [],
        }));

        const copyRSVPNumbers = async () => {
            const phoneNumbers = props.confirmed.map(conf => conf.phoneNumber).join(',');
            try {
                if (phoneNumbers.length > 0) {
                    await navigator.clipboard.writeText(phoneNumbers);
                    alert('RSVP phone numbers copied to clipboard!');
                }
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        };

        return {
            alertStore, smsCampaignStore, projectsStore,
            prettyDay, bodyExcerpt, typeLabel, typeBadgeClass,
            sentCount, confirmedCount, showConfirmedOnListing, showVotesOnListing, protect,
            copyRSVPNumbers, totalVotes, pollVoteCounts, pollVoters, pollWinnerLabel, isPollClosed, prettyClosesAt
        };
    },
    data() {
        return {
            show: false,
            copy: false,
            preview_sms: null,
            error: false,
            campaignTypes: [
                {
                    value: 'basic',
                    label: 'Basic',
                    desc: 'One-way broadcast. No reply tracking.',
                },
                {
                    value: 'rsvp',
                    label: 'RSVP',
                    desc: 'Members reply YES to confirm attendance.',
                    badge: null,
                },
                {
                    value: 'poll',
                    label: 'Poll',
                    desc: 'Members vote A – D across up to 4 options.',
                    badge: 'New',
                },
            ],
            form: {
                id: this.id,
                garden: this.garden,
                interest: 'Everyone',
                body: this.body,
                type: this.type || 'basic',
                alert: this.alert || false,
                poll_options: [emptyOption(0)],
                closes_at: '',
            },
            pollToggles: {
                showDate: false,
                showTime: false,
                showText: false,
            },
        };
    },
    computed: {
        isPollType() { return this.form.type === 'poll'; },
        canAddPollOption() { return this.form.poll_options.length < 4; },
        closesAtForInput() {
            if (!this.form.closes_at) return '';
            const d = new Date(this.form.closes_at);
            return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
        },
        pollBarMax() {
            return Math.max(1, ...Object.values(this.pollVoteCounts));
        },
        availableProjects() {
            return Array.isArray(this.projectsStore.projects) ? this.projectsStore.projects : [];
        },
        anyPollFieldEnabled() {
            return this.pollToggles.showDate || this.pollToggles.showTime || this.pollToggles.showText;
        },
    },
    watch: {
        'form.type'(newValue) {
            if (newValue === 'basic') this.form.alert = false;
            if (newValue !== 'poll') {
                this.form.poll_options = [emptyOption(0)];
                this.form.closes_at = '';
                this.pollToggles = { showDate: false, showTime: false, showText: false };
            } else if (!this.form.closes_at) {
                this.form.closes_at = sevenDaysFromNow();
            }
        },
        'pollToggles.showText'(on) {
            if (on) this.ensureProjectsLoaded();
        },
    },
    methods: {
        addPollOption() {
            if (this.form.poll_options.length < 4) {
                const first = this.form.poll_options[0];
                this.form.poll_options.push(cloneOption(first, this.form.poll_options.length));
            }
        },
        removePollOption(idx) {
            this.form.poll_options.splice(idx, 1);
            this.form.poll_options.forEach((opt, i) => { opt.label = POLL_LABELS[i]; });
        },
        onTextTypeChange(opt) {
            if (opt.textType === 'project') this.ensureProjectsLoaded();
        },
        async ensureProjectsLoaded() {
            if (!Array.isArray(this.projectsStore.projects) || this.projectsStore.projects.length === 0) {
                await this.projectsStore.getProjects(this.form.garden);
            }
        },
        resolveTextOption(opt) {
            if (!this.pollToggles.showText) return undefined;
            if (opt.textType === 'project' && opt.textProjectId) {
                const proj = this.availableProjects.find(p => p.id === opt.textProjectId);
                return proj?.title || undefined;
            }
            return opt.textCustom || undefined;
        },
        buildPayload() {
            const payload = { ...this.form };
            if (this.isPollType) {
                payload.poll_options = this.form.poll_options.map(opt => {
                    const o = { label: opt.label };
                    if (this.pollToggles.showDate && opt.date) o.date = opt.date;
                    if (this.pollToggles.showTime && opt.time) o.time = opt.time;
                    const textOpt = this.resolveTextOption(opt);
                    if (textOpt) o.text_option = textOpt;
                    return o;
                });
                if (this.form.closes_at) {
                    payload.closes_at = new Date(this.form.closes_at).toISOString();
                } else {
                    delete payload.closes_at;
                }
                // strip UI-only fields from form spread
                delete payload.pollToggles;
            } else {
                delete payload.poll_options;
                delete payload.closes_at;
            }
            return payload;
        },
        async testCampaign() {
            this.smsCampaignStore.testSms(this.buildPayload()).then((smsTest) => {
                if (smsTest.copy) {
                    this.copy = smsTest.copy;
                    this.preview_sms = smsTest.preview_sms || null;
                    this.numVolunteers = smsTest.numVolunteers;
                } else {
                    this.error = smsTest.error;
                }
            });
        },
        async sendSms() {
            this.show = false;
            this.copy = false;
            this.preview_sms = null;
            this.alertStore.clear();
            window.scrollTo(0, 0);
            this.smsCampaignStore.sendSms(this.buildPayload()).then((smsTest) => {
                this.alertStore.success(`SMS Sent to ${smsTest.length} volunteers`);
            });
        },
        async closeUp() {
            this.smsCampaignStore.closeUpdate(this.id);
            this.show = false;
            this.copy = false;
            this.preview_sms = null;
            this.alertStore.clear();
        },
        openNewCampaign() {
            this.form.closes_at = sevenDaysFromNow();
            this.show = true;
        },
        async showExisting(id) {
            this.show = true;
            this.form.id = id;
        },
        setClosesAt(e) { this.form.closes_at = e.target.value; },
    },
    components: { UserProfileDisplay }
}
</script>

<template>

  <div
    v-if="bodyExcerpt"
    class="sms-campaign-card rounded-lg border border-[#6b8a5c]/70 p-3 bg-[#c4d9b0] hover:bg-[#b5cf9e] cursor-pointer transition-colors shadow-sm"
    @click="() => {showExisting(id)}"
  >
    <div class="flex justify-between items-start gap-2">
      <span class="underline text-lg text-[#1a2617]">{{ prettyDay }}</span>
      <div class="flex items-center gap-1.5 flex-wrap justify-end">
        <span
          v-if="isPollClosed && type === 'poll'"
          class="inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 border border-red-300/60"
        >Closed</span>
        <span
          v-if="typeLabel"
          :class="typeBadgeClass"
        >{{ typeLabel }}</span>
      </div>
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
      <div v-if="showVotesOnListing" class="italic text-[#3d4d36]">
        Votes:
        <span
          class="inline-flex items-center justify-center h-7 min-w-7 px-2 mx-1 rounded-full bg-[#9db892] text-[#1a2617] not-italic font-semibold text-sm tabular-nums shadow-sm border border-[#7f9a72]/50 align-middle"
        >{{ totalVotes }}</span>
        <span v-if="pollWinnerLabel" class="text-xs text-[#3d4d36] not-italic ml-1">· Option {{ pollWinnerLabel }} leading</span>
      </div>
    </div>
  </div>

  <button
    v-else-if="this.editor"
    type="button"
    class="px-4 py-2 bg-custom-green text-white font-medium text-sm rounded shadow-md hover:bg-darker-green focus:bg-darker-green focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
    @click="openNewCampaign"
  >
    Create a new Group SMS
  </button>

  <!-- Render inside our `<div id="modals"></div>` in index.html -->
  <Teleport to="#modals">
    <div v-if="show" class="w-xl">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/60 dark:bg-black/75"></div>

      <form>
      <div class="fixed inset-0 flex items-center justify-center z-30">
        <div class="sms-modal-panel grid grid-cols-1 gap-2 p-4 w-full md:w-1/2 sm:m-1 m-3 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">

          <!-- Header (new campaign only) -->
          <div v-if="!id" class="sms-modal-header rounded-t-lg -mx-4 -mt-4 px-4 py-3 mb-2">
            <h2 class="text-lg font-semibold">Create a new Group SMS</h2>
          </div>

          <input type="hidden" v-model="form.id" />
          <input type="hidden" v-model="form.garden" />

          <!-- ── NEW CAMPAIGN FIELDS ── -->
          <div v-if="!id">
            <label class="pb-1 block font-medium">Send to group:</label>
            <select v-model="form.interest" class="sms-modal-input rounded-md p-2 ml-1 mb-3 w-auto focus:outline-none focus:ring-2 focus:ring-custom-green/40">
              <option>Everyone</option>
              <option v-for="interest in interests" :key="interest.id" :value="interest.tag">{{ interest.tag }}</option>
            </select>

            <label class="pb-1 block font-medium">Campaign Type:</label>
            <div class="grid grid-cols-3 gap-2 mb-3">
              <button
                v-for="t in campaignTypes"
                :key="t.value"
                type="button"
                :class="['sms-type-btn rounded-lg p-3 text-left transition-colors relative', form.type === t.value ? 'sms-type-btn--active' : '']"
                @click="form.type = t.value"
              >
                <span
                  v-if="t.badge"
                  class="absolute top-1.5 right-1.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 leading-none"
                >{{ t.badge }}</span>
                <div class="font-semibold text-sm">{{ t.label }}</div>
                <div class="text-xs mt-1 leading-snug sms-type-btn-desc">{{ t.desc }}</div>
              </button>
            </div>

            <!-- Poll options builder -->
            <div v-if="isPollType" class="mb-3">
              <div class="flex items-center justify-between mb-2">
                <label class="font-medium">Poll Options <span class="text-xs font-normal sms-modal-muted">(up to 4)</span></label>
              </div>

              <!-- Field toggles -->
              <div class="sms-modal-toggle-row flex flex-wrap gap-x-4 gap-y-1 mb-3 pb-2">
                <label class="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input type="checkbox" v-model="pollToggles.showDate" class="sms-modal-toggle-check"> Date
                </label>
                <label class="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input type="checkbox" v-model="pollToggles.showTime" class="sms-modal-toggle-check"> Time
                </label>
                <label class="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input type="checkbox" v-model="pollToggles.showText" class="sms-modal-toggle-check"> Text Option
                </label>
              </div>

              <!-- Option rows -->
              <div
                v-for="(opt, idx) in form.poll_options"
                :key="idx"
                class="sms-modal-option-row flex flex-wrap gap-2 items-center mb-2 p-2 rounded-md"
              >
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-darkest-green text-white font-bold text-sm shrink-0">{{ opt.label }}</span>

                <input v-if="pollToggles.showDate" type="text" v-model="opt.date" placeholder="Date (e.g. Jun 1)"
                  class="sms-modal-input flex-1 min-w-[90px] rounded p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-custom-green/50" />

                <input v-if="pollToggles.showTime" type="text" v-model="opt.time" placeholder="Time (e.g. 10am)"
                  class="sms-modal-input w-28 rounded p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-custom-green/50" />

                <template v-if="pollToggles.showText">
                  <select v-model="opt.textType" @change="onTextTypeChange(opt)"
                    class="sms-modal-input rounded p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-custom-green/50 w-auto">
                    <option value="custom">Custom</option>
                    <option value="project">Project</option>
                  </select>
                  <input v-if="opt.textType === 'custom'" type="text" v-model="opt.textCustom" placeholder="Enter text…"
                    class="sms-modal-input flex-1 min-w-[90px] rounded p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-custom-green/50" />
                  <select v-else-if="opt.textType === 'project'" v-model="opt.textProjectId"
                    class="sms-modal-input flex-1 min-w-[90px] rounded p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-custom-green/50">
                    <option :value="null">— select project —</option>
                    <option v-for="p in availableProjects" :key="p.id" :value="p.id">{{ p.title }}</option>
                  </select>
                  <span v-if="opt.textType === 'project' && availableProjects.length === 0"
                    class="text-xs sms-modal-muted italic">No projects loaded</span>
                </template>

                <!-- spacer when no toggles are on so remove button stays right -->
                <span v-if="!anyPollFieldEnabled" class="flex-1 sms-modal-muted text-xs italic">No fields selected above</span>

                <button v-if="form.poll_options.length > 1" type="button" @click="removePollOption(idx)"
                  class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-lg leading-none shrink-0 ml-auto" title="Remove option">×</button>
              </div>

              <button v-if="canAddPollOption" type="button" @click="addPollOption"
                class="mt-1 text-sm text-darkest-green dark:text-custom-green hover:underline font-medium">+ Add Option</button>

              <div class="mt-3">
                <label class="pb-1 block font-medium">
                  Closes At
                  <span class="text-xs font-normal sms-modal-muted">(optional — defaults to 30 days)</span>
                </label>
                <input type="datetime-local" :value="closesAtForInput" @change="setClosesAt"
                  class="sms-modal-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-custom-green/40" />
              </div>
            </div>

            <!-- Alert opt-in -->
            <div v-if="form.type === 'rsvp'" class="mb-2">
              <label for="alert-switch" class="font-medium">Sign up for alerts?</label>
              <input type="checkbox" id="alert-switch" v-model="form.alert" class="ml-2 align-middle">
              <span class="text-sm ml-1">Yes</span>
            </div>
          </div>

          <!-- ── EXISTING CAMPAIGN SUMMARY ── -->
          <div v-if="id" class="mb-2">
            <p>Type: <strong>{{ type }}</strong></p>
            <p>Reached: {{ sentCount }} people</p>
            <p v-if="type === 'poll' && prettyClosesAt" class="text-sm mt-0.5">
              <span v-if="isPollClosed" class="text-red-600 dark:text-red-400 font-medium">Poll closed {{ prettyClosesAt }}</span>
              <span v-else class="text-darkest-green dark:text-custom-green">Poll closes {{ prettyClosesAt }}</span>
            </p>
          </div>

          <!-- SMS body -->
          <label class="p-1 block font-medium">SMS Body:</label>
          <textarea
            v-model="form.body"
            rows="5"
            class="sms-modal-input p-2 mb-2 w-full min-h-[8rem] rounded-md shadow-inner resize-y focus:outline-none focus:ring-2 focus:ring-custom-green/40 disabled:opacity-60"
            placeholder="SMS message text…"
            :disabled="protect == 1"
          ></textarea>

          <!-- ── POLL RESULTS (existing poll campaign) ── -->
          <div v-if="type === 'poll' && id && poll_options?.length" class="mb-3">
            <h3 class="font-semibold mb-3">Poll Results ({{ totalVotes }} vote{{ totalVotes !== 1 ? 's' : '' }})</h3>
            <div v-for="opt in poll_options" :key="opt.label" class="mb-4">
              <!-- Label + description + count -->
              <div class="flex items-center gap-2 mb-1">
                <span :class="[
                  'inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs shrink-0 text-white',
                  pollWinnerLabel === opt.label && totalVotes > 0 ? 'bg-amber-500' : 'bg-darkest-green'
                ]">{{ opt.label }}</span>
                <span class="text-sm flex-1">
                  {{ [opt.date, opt.time ? `at ${opt.time}` : '', opt.text_option || ''].filter(Boolean).join(' ') || `Option ${opt.label}` }}
                </span>
                <span class="text-sm font-semibold tabular-nums">
                  {{ pollVoteCounts[opt.label] }} vote{{ pollVoteCounts[opt.label] !== 1 ? 's' : '' }}
                </span>
              </div>
              <!-- Progress bar -->
              <div class="h-2 rounded-full sms-modal-progress overflow-hidden mb-2">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="pollWinnerLabel === opt.label && totalVotes > 0 ? 'bg-amber-500' : 'bg-darkest-green dark:bg-custom-green'"
                  :style="{ width: totalVotes === 0 ? '0%' : `${(pollVoteCounts[opt.label] / pollBarMax) * 100}%` }"
                ></div>
              </div>
              <!-- Voter avatars -->
              <div v-if="pollVoters[opt.label]?.length" class="flex flex-wrap items-center pl-8">
                <UserProfileDisplay
                  v-for="voter in pollVoters[opt.label]"
                  :key="voter.id"
                  :volunteer="voter"
                />
              </div>
              <p v-else class="pl-8 text-xs sms-modal-muted italic">No votes yet</p>
            </div>
          </div>

          <!-- ── RSVP list ── -->
          <div v-if="confirmed?.length" class="mt-3">
            <h3 class="font-semibold mb-2">The following people confirmed to your RSVP request:</h3>
            <div v-for="conf in confirmed" :key="conf.id" class="flex items-center">
              <UserProfileDisplay :volunteer="conf" />
            </div>
            <button type="button" @click="copyRSVPNumbers"
              class="mt-2 px-4 py-2 bg-custom-green text-white rounded shadow-md hover:bg-darker-green">Copy RSVPs #</button>
          </div>

          <!-- ── TEST button ── -->
          <div v-if="!id" class="sms-modal-footer flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t rounded-b-md">
            <span class="px-6 py-2.5 bg-custom-green text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-darker-green hover:shadow-lg cursor-pointer ml-1"
              @click="testCampaign()">Test SMS</span>
          </div>

          <!-- ── PREVIEW + SEND ── -->
          <article v-if="copy">
            <div class="mb-3 overflow-x-auto sms-modal-pre rounded p-2">
              <p class="text-xs sms-modal-muted mb-1 font-medium uppercase tracking-wide">SMS Preview</p>
              <pre class="text-sm font-sans whitespace-pre-wrap">{{ preview_sms || copy }}</pre>
            </div>
            <div class="mb-3 font-bold">This will be sent to {{ numVolunteers }} people</div>
            <button type="button"
              class="px-6 py-2.5 bg-darkest-green text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-forest-panel hover:shadow-lg transition cursor-pointer duration-150"
              @click="(e) => {sendSms(e)}">Send SMS NOW</button>
          </article>

          <div v-if="error" class="text-red-600 dark:text-red-400 font-medium mt-1">Error: {{ error }}</div>

          <div class="pr-4 justify-end flex flex-shrink-0 flex-wrap items-center mt-2">
            <button type="button"
              class="px-6 py-2.5 sms-modal-muted font-medium text-xs leading-tight uppercase rounded border-0 hover:underline focus:outline-none focus:ring-0 transition duration-150"
              @click="closeUp()">Close</button>
          </div>
        </div>
      </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Light mode ── */
.sms-modal-panel { background-color: #ffffff; color: #344a34; border: 1px solid #e2dccb; }
.sms-modal-header { background-color: #376451; color: #f5f5f5; border-bottom: 1px solid #2d5240; }
.sms-modal-input { background-color: #f7f1e3; color: #344a34; border: 1px solid #d6cfb8; }
.sms-modal-input::placeholder { color: #9ca3af; }
.sms-modal-input:focus { border-color: #8aa37c; }
.sms-modal-option-row { background-color: #f3ece0; border: 1px solid #d6cfb8; }
.sms-modal-muted { color: #6b7280; }
.sms-modal-footer { border-color: #e2dccb; }
.sms-modal-progress { background-color: #e2dccb; }
.sms-modal-pre { background-color: #f3ece0; color: #344a34; }
.sms-modal-toggle-row { border-bottom: 1px solid #e2dccb; }
.sms-modal-toggle-check { accent-color: #376451; width: 1rem; height: 1rem; cursor: pointer; }

/* Campaign type card selector — light mode */
.sms-type-btn {
  background-color: #f7f1e3;
  border: 1px solid #d6cfb8;
  color: #344a34;
  cursor: pointer;
}
.sms-type-btn:hover:not(.sms-type-btn--active) {
  background-color: #ece6d4;
  border-color: #b8b09a;
}
.sms-type-btn--active {
  background-color: #376451;
  border-color: #376451;
  color: #f5f5f5;
}
.sms-type-btn-desc { color: #6b7280; }
.sms-type-btn--active .sms-type-btn-desc { color: rgba(245,245,245,0.75); }
</style>

<style>
/* ── Dark mode — non-scoped so html.dark wins over scoped specificity (same pattern as GardenDetail) ── */
html.dark .sms-modal-panel { background-color: #2d3e26 !important; color: #f5f5f5 !important; border-color: rgba(247,241,227,0.35) !important; }
html.dark .sms-modal-header { background-color: #4a5c42 !important; border-bottom-color: #3d4d36 !important; }
html.dark .sms-modal-input { background-color: rgba(26,26,26,0.6) !important; color: #f5f5f5 !important; border-color: #3d4d36 !important; }
html.dark .sms-modal-input::placeholder { color: #a8b89e !important; }
html.dark .sms-modal-input:focus { border-color: #8aa37c !important; }
html.dark .sms-modal-option-row { background-color: rgba(138,163,124,0.1) !important; border-color: rgba(127,154,114,0.3) !important; }
html.dark .sms-modal-muted { color: #a8b89e !important; }
html.dark .sms-modal-footer { border-color: rgba(90,111,80,0.5) !important; }
html.dark .sms-modal-progress { background-color: rgba(184,212,164,0.15) !important; }
html.dark .sms-modal-pre { background-color: rgba(26,26,26,0.4) !important; color: #f5f5f5 !important; }
html.dark .sms-modal-toggle-row { border-bottom-color: rgba(90,111,80,0.4) !important; }
html.dark .sms-modal-input:-webkit-autofill,
html.dark .sms-modal-input:-webkit-autofill:hover,
html.dark .sms-modal-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px rgba(26,26,26,0.7) inset !important;
  -webkit-text-fill-color: #f5f5f5 !important;
  caret-color: #f5f5f5;
}
html.dark input[type="datetime-local"].sms-modal-input { color-scheme: dark; }

/* Campaign type card selector — dark mode */
html.dark .sms-type-btn { background-color: rgba(26,26,26,0.4) !important; border-color: #3d4d36 !important; color: #c5d4b8 !important; }
html.dark .sms-type-btn:hover:not(.sms-type-btn--active) { background-color: rgba(26,26,26,0.6) !important; border-color: #4a5c42 !important; }
html.dark .sms-type-btn--active { background-color: #376451 !important; border-color: #8aa37c !important; color: #f5f5f5 !important; }
html.dark .sms-type-btn-desc { color: #8aa37c !important; }
html.dark .sms-type-btn--active .sms-type-btn-desc { color: rgba(245,245,245,0.7) !important; }

/* ── Campaign listing cards — dark mode ── */
html.dark .sms-campaign-card {
  background-color: #2d3e26 !important;
  border-color: #4a6040 !important;
}
html.dark .sms-campaign-card:hover {
  background-color: #354830 !important;
}
/* Date heading */
html.dark .sms-campaign-card .text-\[\#1a2617\] {
  color: #f0f5ec !important;
}
/* Body excerpt */
html.dark .sms-campaign-card .text-\[\#2d3e26\] {
  color: #d0ddc8 !important;
}
/* Italic label text: "Sent Audience:", "Confirmed:", etc. */
html.dark .sms-campaign-card .text-\[\#3d4d36\] {
  color: #9db892 !important;
}
/* Count & vote bubbles */
html.dark .sms-campaign-card .bg-\[\#9db892\] {
  background-color: #4a5c42 !important;
  color: #f0f5ec !important;
}
html.dark .sms-campaign-card .border-\[\#7f9a72\]\/50 {
  border-color: rgba(90, 120, 76, 0.5) !important;
}
/* Divider line */
html.dark .sms-campaign-card .bg-\[\#8aa37c\]\/90 {
  background-color: rgba(90, 111, 80, 0.35) !important;
}
</style>
