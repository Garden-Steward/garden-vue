<script setup>
import VolunteerInterest from '@/components/VolunteerInterest.vue'
import { ref, computed, defineOptions } from 'vue';
import { format } from 'date-fns'
import { vOnClickOutside } from '@vueuse/components'
import { backendHelper } from '@/helpers';
import { useAlertStore } from '@/stores';

// const dropDown = ref(0);
// let root = ref(null);

const props = defineProps({
  id: Number,
  garden: Number,
  firstName: String,
  email: String,
  lastName: String,
  phoneNumber: String,
  createdAt: String,
  updatedAt: String,
  publishedAt: String,
  provider: String,
  bio: String,
  color: String,
  paused: Boolean,
  interests: Array,
  u_g_interests: Object,
  editor: Boolean,
  managerIds: {
    type: Array,
    default: () => []
  },
  role: {
    type: Object,
    default: null
  },
  welcomeEmailSubject: {
    type: String,
    default: ''
  },
  welcomeEmailBody: {
    type: String,
    default: ''
  },
})
defineOptions({ inheritAttrs: false })


let ugArr, basicUgArr
if (props.u_g_interests.data) {
  ugArr = props.u_g_interests.data.filter((ugi)=> ugi.attributes.interest && ugi.attributes.garden.data.id == props.garden)
  basicUgArr = ugArr.map((ugi)=> {
      return ugi.attributes.interest.data.id
  })
  ugArr = ugArr.map((ugi)=> {
      return {interest: ugi.attributes.interest.data.id, id: ugi.id}
  })
  console.log(ugArr)
}
const prettyDay = format(new Date(props.createdAt), 'yyyy-MM-dd');
const displayName = computed(() => (props.firstName || props.lastName) ? `${props.firstName} ${props.lastName}` : props.phoneNumber);
const isManager = computed(() => props.managerIds.includes(props.id));
const roleName = computed(() => {
  if (!props.role) return null;
  // Handle Strapi nested format: { data: { attributes: { name } } }
  if (props.role.data?.attributes?.name) return props.role.data.attributes.name;
  // Handle flat format: { name }
  if (props.role.name) return props.role.name;
  return null;
});
const isAuthenticated = computed(() => roleName.value === 'Authenticated');

const interestTags = computed(() => {
  return props.interests
    .filter(interest => basicUgArr && basicUgArr.find(ug => ug == interest.id))
    .map(interest => interest.tag)
    .join(', ');
});

const isExpanded = ref(false);
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const ignoreElRef = ref()
const onClickOutsideHandler = [
  (ev) => {
    if (ev.target.nodeName != 'LABEL' && ev.target.nodeName != 'INPUT') {
      // isExpanded.value = false;
    }
  },
  { ignore: [ignoreElRef] },
]

const requestRegistration = (id) => {
  backendHelper.requestRegistration(id).then((res)=> {
    console.log("vd resp: ", res);
  });
}

// ── Welcome Email modal ──
const alertStore = useAlertStore();
const showWelcomeEmailModal = ref(false);
const isCustomizing = ref(false);
const emailSubject = ref('');
const emailBody = ref('');
const isSendingEmail = ref(false);
const emailError = ref('');
const emailAlreadySent = ref(false);
const alreadySentMessage = ref('');

const buildPayload = () => {
  const payload = {};
  if (props.garden) payload.gardenId = props.garden;
  if (isCustomizing.value) {
    payload.subject = emailSubject.value;
    payload.body = emailBody.value;
  }
  return payload;
};

const openWelcomeEmail = () => {
  emailSubject.value = props.welcomeEmailSubject || '';
  emailBody.value = props.welcomeEmailBody || '';
  isCustomizing.value = false;
  isSendingEmail.value = false;
  emailError.value = '';
  emailAlreadySent.value = false;
  alreadySentMessage.value = '';
  showWelcomeEmailModal.value = true;
};

const closeWelcomeEmail = () => {
  showWelcomeEmailModal.value = false;
  isCustomizing.value = false;
  emailError.value = '';
  emailAlreadySent.value = false;
  alreadySentMessage.value = '';
};

const sendWelcomeEmail = async () => {
  isSendingEmail.value = true;
  emailError.value = '';
  emailAlreadySent.value = false;
  try {
    const res = await backendHelper.sendWelcomeEmail(props.id, buildPayload());
    if (res?.alreadySent) {
      emailAlreadySent.value = true;
      alreadySentMessage.value = res.message || 'Welcome email already sent.';
    } else {
      showWelcomeEmailModal.value = false;
      alertStore.success(`Welcome email sent to ${displayName.value}`);
    }
  } catch (err) {
    emailError.value = err?.message || 'Failed to send welcome email.';
  } finally {
    isSendingEmail.value = false;
  }
};

const forceSendWelcomeEmail = async () => {
  isSendingEmail.value = true;
  emailError.value = '';
  try {
    await backendHelper.sendWelcomeEmail(props.id, { ...buildPayload(), force: true });
    showWelcomeEmailModal.value = false;
    alertStore.success(`Welcome email re-sent to ${displayName.value}`);
  } catch (err) {
    emailError.value = err?.message || 'Failed to force-send welcome email.';
  } finally {
    isSendingEmail.value = false;
  }
};

const hasTemplate = computed(() => !!(props.welcomeEmailSubject || props.welcomeEmailBody));

</script>

<template>

    <tr 
      class="tr-class"
      @click="toggleExpand"
    >
      <td class="td-class text-[#f5f5f5]">{{ displayName }} <span v-if="isManager" class="manager-badge">Manager</span><span v-if="isAuthenticated" class="auth-badge">Authenticated</span></td>
      <td class="td-class text-[#f5f5f5]">{{ prettyDay }}</td>
      <td class="td-class text-[#f5f5f5]">{{ interestTags }}</td>
</tr>

    <div 
      v-show="isExpanded"
      v-on-click-outside="onClickOutsideHandler"
      class="p-4 bg-[rgba(26,26,26,0.6)] border-t border-[#3d4d36]/50"
    >
      <p class="text-[#f5f5f5]"><span class="font-semibold">Email:</span> <span class="text-[#d0d0d0]">{{ email }}</span></p>
      <p class="text-[#f5f5f5]"><span class="font-semibold">Phone:</span> <span class="text-[#d0d0d0]">{{ phoneNumber }}</span></p>
      <p class="text-[#f5f5f5]"><span class="font-semibold">Interests:</span></p>
      <div v-for="interest in interests" :key="interest.id">
        <VolunteerInterest 
          v-bind="interest" 
          :ugArr="ugArr" 
          :garden="props.garden" 
          :user="props.id" 
          :editor="editor"
          ref="ignoreElRef"
        ></VolunteerInterest>
      </div>
      <div v-if="email =='test@test.com'">
        <button @click="requestRegistration({id})" class="bg-transparent hover:bg-orange-600 text-orange-600 font-semibold hover:text-white py-1 px-3 border border-orange-600 hover:border-transparent rounded">
          Request Complete Registration
        </button>
      </div>

      <!-- Send Welcome Email -->
      <div v-if="editor" class="mt-3">
        <button
          @click.stop="openWelcomeEmail"
          class="inline-flex items-center gap-1.5 bg-transparent hover:bg-emerald-700/20 text-emerald-400 font-semibold hover:text-emerald-300 py-1 px-3 border border-emerald-600/60 hover:border-emerald-500 rounded transition-colors text-sm"
        >
          <i class="fas fa-envelope text-xs"></i>
          Send Welcome Email
        </button>
      </div>
    </div>

  <!-- ── Welcome Email Modal ── -->
  <Teleport to="#modals">
    <div v-if="showWelcomeEmailModal">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-900/50 z-40" @click="closeWelcomeEmail"></div>
      <!-- Panel -->
      <div class="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div class="we-modal-panel w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">

          <!-- Header -->
          <div class="we-modal-header flex items-center justify-between px-5 py-4">
            <div>
              <h3 class="text-base font-semibold text-white leading-tight">Send Welcome Email</h3>
              <p class="text-xs text-white/70 mt-0.5">To: {{ displayName }}</p>
            </div>
            <button @click="closeWelcomeEmail" class="text-white/60 hover:text-white transition-colors text-xl leading-none">&times;</button>
          </div>

          <!-- Mode toggle tabs -->
          <div class="we-modal-tabs flex items-stretch">
            <button
              @click="isCustomizing = false"
              :class="['we-modal-tab flex-1 py-2.5 text-sm font-medium transition-colors', !isCustomizing ? 'we-modal-tab--template' : 'we-modal-tab--inactive']"
            >
              <i class="fas fa-file-alt text-xs mr-1.5"></i>Use Template
            </button>
            <div class="we-modal-tab-divider w-px self-stretch"></div>
            <button
              @click="isCustomizing = true"
              :class="['we-modal-tab flex-1 py-2.5 text-sm font-medium transition-colors', isCustomizing ? 'we-modal-tab--customize' : 'we-modal-tab--inactive']"
            >
              <i class="fas fa-pencil-alt text-xs mr-1.5"></i>Customize
            </button>
          </div>

          <!-- Content -->
          <div class="we-modal-content p-5 space-y-4 max-h-[60vh] overflow-y-auto">

            <!-- Template mode: read-only preview -->
            <template v-if="!isCustomizing">
              <div v-if="hasTemplate" class="space-y-3">
                <div class="we-modal-preview-card rounded-lg border border-dashed p-3">
                  <p class="we-modal-preview-label text-[10px] font-semibold uppercase tracking-widest mb-1">Subject</p>
                  <p class="we-modal-preview-text text-sm">{{ emailSubject || '(no subject — will use garden default)' }}</p>
                </div>
                <div class="we-modal-preview-card rounded-lg border border-dashed p-3">
                  <p class="we-modal-preview-label text-[10px] font-semibold uppercase tracking-widest mb-1">Body</p>
                  <p class="we-modal-preview-text text-sm whitespace-pre-wrap">{{ emailBody || '(no body — will use garden default)' }}</p>
                </div>
                <p class="we-modal-muted text-xs italic">
                  <i class="fas fa-info-circle mr-1"></i>This will be sent exactly as shown — subject &amp; body come from the garden template.
                </p>
              </div>
              <div v-else class="we-modal-empty rounded-lg border border-dashed p-4 text-center">
                <p class="we-modal-muted text-sm">No garden template found.</p>
                <p class="we-modal-muted text-xs mt-1">Switch to Customize to write your own.</p>
              </div>
            </template>

            <!-- Customize mode: editable inputs -->
            <template v-else>
              <div class="space-y-3">
                <div>
                  <label class="we-modal-customize-label block text-xs font-semibold uppercase tracking-widest mb-1">Subject</label>
                  <input
                    v-model="emailSubject"
                    type="text"
                    placeholder="e.g. Hey {{firstName}}, welcome to {{gardenName}}!"
                    class="we-modal-input we-modal-input--customize w-full px-3 py-2 text-sm rounded-md focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label class="we-modal-customize-label block text-xs font-semibold uppercase tracking-widest mb-1">
                    Body
                    <span class="we-modal-muted font-normal normal-case tracking-normal ml-1">Markdown supported</span>
                  </label>
                  <textarea
                    v-model="emailBody"
                    rows="8"
                    placeholder="Hi {{firstName}},&#10;&#10;Welcome to {{gardenName}}!..."
                    class="we-modal-input we-modal-input--customize w-full px-3 py-2 text-sm rounded-md focus:outline-none focus:ring-2 font-mono resize-y"
                  ></textarea>
                </div>
                <p class="we-modal-muted text-xs italic">
                  <i class="fas fa-info-circle mr-1"></i>Placeholders:
                  <code class="we-modal-code px-1 rounded">&#123;&#123;firstName&#125;&#125;</code>
                  <code class="we-modal-code px-1 rounded">&#123;&#123;gardenName&#125;&#125;</code>
                  <code class="we-modal-code px-1 rounded">&#123;&#123;senderName&#125;&#125;</code>
                </p>
              </div>
            </template>

            <!-- Already sent banner -->
            <div v-if="emailAlreadySent" class="we-modal-already-sent rounded-lg p-3 flex items-start gap-2">
              <i class="fas fa-exclamation-triangle mt-0.5 shrink-0"></i>
              <div>
                <p class="text-sm font-medium">Already sent</p>
                <p class="text-xs mt-0.5 we-modal-muted">{{ alreadySentMessage }}</p>
              </div>
            </div>

            <!-- Error -->
            <p v-if="emailError" class="text-sm text-red-600 font-medium">
              <i class="fas fa-exclamation-circle mr-1"></i>{{ emailError }}
            </p>
          </div>

          <!-- Footer -->
          <div class="we-modal-footer flex items-center justify-between px-5 py-4">
            <span class="text-xs italic" :class="isCustomizing ? 'we-modal-footer-note--customize' : 'we-modal-footer-note--template'">
              <template v-if="isCustomizing">
                <i class="fas fa-pencil-alt mr-1"></i>Will send your customized version
              </template>
              <template v-else>
                <i class="fas fa-file-alt mr-1"></i>Will send garden template as-is
              </template>
            </span>
            <div class="flex gap-2">
              <button
                @click="closeWelcomeEmail"
                :disabled="isSendingEmail"
                class="we-modal-cancel-btn px-4 py-2 text-sm rounded-md border transition-colors disabled:opacity-50"
              >Cancel</button>

              <!-- Normal send — hidden once alreadySent is shown -->
              <button
                v-if="!emailAlreadySent"
                @click="sendWelcomeEmail"
                :disabled="isSendingEmail || (!hasTemplate && !isCustomizing)"
                :class="['we-modal-send-btn px-4 py-2 text-sm font-medium rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed', isCustomizing ? 'we-modal-send-btn--customize' : 'we-modal-send-btn--template']"
              >
                <i v-if="isSendingEmail" class="fas fa-spinner fa-spin mr-1.5"></i>
                {{ isSendingEmail ? 'Sending…' : 'Send Welcome Email' }}
              </button>

              <!-- Force send — only shown after alreadySent response -->
              <button
                v-if="emailAlreadySent"
                @click="forceSendWelcomeEmail"
                :disabled="isSendingEmail"
                class="we-modal-send-btn we-modal-send-btn--force px-4 py-2 text-sm font-medium rounded-md text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i v-if="isSendingEmail" class="fas fa-spinner fa-spin mr-1.5"></i>
                <i v-else class="fas fa-redo text-xs mr-1.5"></i>
                {{ isSendingEmail ? 'Sending…' : 'Force Send' }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .td-class {
    @apply px-4 py-3 bg-[rgba(26,26,26,0.6)] border-[#3d4d36]/50 first:rounded-t-lg last:rounded-b-lg sm:first:rounded-t-none sm:last:rounded-b-none sm:first:rounded-tl-lg sm:first:rounded-bl-lg sm:last:rounded-tr-lg sm:last:rounded-br-lg cursor-pointer border-b hover:bg-[rgba(26,26,26,0.8)] transition-colors
  }
  .tr-class {
    @apply flex flex-col mb-4 sm:table-row
  }
  .manager-badge {
    @apply text-xs font-semibold px-2 py-0.5 rounded ml-2;
    background-color: #3d4d36;
    color: #fde047;
  }
  .auth-badge {
    @apply text-xs font-semibold px-2 py-0.5 rounded ml-2;
    background-color: #9a3412;
    color: #fff;
  }
</style>

<style>
/* ── Welcome Email Modal — light mode ── */
.we-modal-panel { background-color: #ffffff; color: #344a34; border: 1px solid #d4e0cc; }
.we-modal-header { background-color: #376451; border-bottom: 1px solid #2d5240; }
.we-modal-tabs { border-bottom: 1px solid #d4e0cc; }
.we-modal-tab { color: #6b7280; background: transparent; }
.we-modal-tab--template { background-color: #edf3e8; color: #376451; }
.we-modal-tab--customize { background-color: #eff6ff; color: #1d4ed8; }
.we-modal-tab--inactive:hover { color: #344a34; background-color: #f4f9f1; }
.we-modal-tab-divider { background-color: #d4e0cc; }
.we-modal-content { background-color: #ffffff; }
.we-modal-preview-card { background-color: #f4f9f1; border-color: #a8c89a; }
.we-modal-preview-label { color: #6b9a5a; }
.we-modal-preview-text { color: #344a34; }
.we-modal-empty { border-color: #d6cfb8; }
.we-modal-muted { color: #6b7280; }
.we-modal-customize-label { color: #1d4ed8; }
.we-modal-input { background-color: #ffffff; color: #344a34; border: 1px solid #93c5fd; }
.we-modal-input::placeholder { color: #9ca3af; }
.we-modal-input:focus { border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96,165,250,0.25); }
.we-modal-code { background-color: #f3ece0; color: #344a34; }
.we-modal-footer { background-color: #f4f9f1; border-top: 1px solid #d4e0cc; }
.we-modal-footer-note--template { color: #6b9a5a; }
.we-modal-footer-note--customize { color: #2563eb; }
.we-modal-cancel-btn { color: #6b7280; border-color: #d4e0cc; }
.we-modal-cancel-btn:hover { background-color: #e8f0e4; }
.we-modal-send-btn--template { background-color: #376451; }
.we-modal-send-btn--template:hover { background-color: #2d5240; }
.we-modal-send-btn--customize { background-color: #2563eb; }
.we-modal-send-btn--customize:hover { background-color: #1d4ed8; }
.we-modal-send-btn--force { background-color: #b45309; }
.we-modal-send-btn--force:hover { background-color: #92400e; }
.we-modal-already-sent { background-color: #fef3c7; border: 1px solid #f59e0b; color: #92400e; }

/* ── Welcome Email Modal — dark mode ── */
html.dark .we-modal-panel { background-color: #2d3e26 !important; color: #f5f5f5 !important; border-color: rgba(247,241,227,0.35) !important; }
html.dark .we-modal-tabs { border-bottom-color: #3d4d36 !important; }
html.dark .we-modal-tab { color: #7a9a72 !important; }
html.dark .we-modal-tab--template { background-color: #344a34 !important; color: #a8d4a0 !important; }
html.dark .we-modal-tab--customize { background-color: rgba(37,99,235,0.2) !important; color: #93c5fd !important; }
html.dark .we-modal-tab--inactive:hover { color: #c8dfc0 !important; background-color: rgba(255,255,255,0.04) !important; }
html.dark .we-modal-tab-divider { background-color: #3d4d36 !important; }
html.dark .we-modal-content { background-color: #2d3e26 !important; }
html.dark .we-modal-preview-card { background-color: rgba(255,255,255,0.04) !important; border-color: #4a6040 !important; }
html.dark .we-modal-preview-label { color: #7aad68 !important; }
html.dark .we-modal-preview-text { color: #d0ddc8 !important; }
html.dark .we-modal-empty { border-color: #3d4d36 !important; }
html.dark .we-modal-muted { color: #7a9a72 !important; }
html.dark .we-modal-customize-label { color: #93c5fd !important; }
html.dark .we-modal-input { background-color: rgba(26,26,26,0.6) !important; color: #f5f5f5 !important; border-color: rgba(96,165,250,0.4) !important; }
html.dark .we-modal-input::placeholder { color: #a8b89e !important; }
html.dark .we-modal-input:focus { border-color: #60a5fa !important; box-shadow: 0 0 0 2px rgba(96,165,250,0.2) !important; }
html.dark .we-modal-code { background-color: rgba(255,255,255,0.08) !important; color: #d0ddc8 !important; }
html.dark .we-modal-footer { background-color: rgba(0,0,0,0.2) !important; border-top-color: #3d4d36 !important; }
html.dark .we-modal-footer-note--template { color: #7aad68 !important; }
html.dark .we-modal-footer-note--customize { color: #93c5fd !important; }
html.dark .we-modal-cancel-btn { color: #a8b89e !important; border-color: #3d4d36 !important; }
html.dark .we-modal-cancel-btn:hover { background-color: rgba(255,255,255,0.06) !important; }
html.dark .we-modal-send-btn--template { background-color: #4a6040 !important; }
html.dark .we-modal-send-btn--template:hover { background-color: #376451 !important; }
html.dark .we-modal-send-btn--customize { background-color: #1d4ed8 !important; }
html.dark .we-modal-send-btn--customize:hover { background-color: #2563eb !important; }
html.dark .we-modal-send-btn--force { background-color: #92400e !important; }
html.dark .we-modal-send-btn--force:hover { background-color: #b45309 !important; }
html.dark .we-modal-already-sent { background-color: rgba(251,191,36,0.12) !important; border-color: rgba(251,191,36,0.4) !important; color: #fcd34d !important; }
</style>