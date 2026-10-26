<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useAuthStore } from '@/stores';
import { blankJoinDraft, browserSecret, isConfirmedJoin, participationRequest } from '@/helpers/participation';

const props = defineProps({ modelValue: Boolean, eventId: { type: [String, Number], default: null }, eventTitle: { type: String, default: '' }, gardenTitle: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue', 'rsvped']);
const auth = useAuthStore();
const dialog = ref(null);
const heading = ref(null);
const draft = reactive(blankJoinDraft());
const flow = ref({ kind: 'details' });
const options = ref(null);
const savedProfile = ref(null);
const event = ref(null);
const error = ref('');
const fields = ref({});
const busy = ref(false);
const code = ref('');
const loginEmail = ref('');
const loginProof = ref(null);
const notice = ref('');
const resendAt = ref(0);
const now = ref(Date.now());
let timer = null;
let opener = null;
let generation = 0;
let operations = new Map();
let secret = browserSecret();
const baseUrl = import.meta.env.VITE_API_URL;
const groupLabels = {
    gardenDocumentIds: 'Gardens I’m drawn to', interestIds: 'What interests me', offeredSkillIds: 'Skills I can share',
    learningSkillIds: 'Things I’d like to learn', availabilityIds: 'When I could join', taskPreferenceIds: 'Ways I’d like to help',
};
const page = computed(() => {
    if (flow.value.kind === 'details') return 1;
    if (flow.value.kind === 'garden') return 2;
    return 3;
});
const title = computed(() => ({ details: 'Let’s get to know you.', garden: 'Find your place in the garden.', review: 'Ready to join?', proof: 'One last step.', legacy: 'Welcome back.', confirmed: 'You’re going.', email: 'Welcome back.', email_code: 'Check your email.' })[flow.value.kind]);
const remaining = computed(() => Math.max(0, Math.ceil((resendAt.value - now.value) / 1000)));
const request = (path, body, method = 'POST') => participationRequest(baseUrl, path, { token: auth.auth.accessToken, body, method });
const storageKey = () => `garden-join:${event.value?.documentId}`;
const focusHeading = async () => { await nextTick(); heading.value?.focus(); dialog.value?.scrollTo(0, 0); };
const close = () => { emit('update:modelValue', false); };
function operation(key, input) {
    const serialized = JSON.stringify(input);
    const previous = operations.get(key);
    if (previous?.input === serialized) return previous.requestId;
    const requestId = crypto.randomUUID();
    operations.set(key, { input: serialized, requestId });
    return requestId;
}
function remember() {
    try { sessionStorage.setItem(storageKey(), JSON.stringify({ version: 1, secret, flow: flow.value })); } catch { return; }
}
function forget() {
    try { sessionStorage.removeItem(storageKey()); } catch { return; }
}
async function act(action) {
    if (busy.value) return;
    busy.value = true; error.value = ''; fields.value = {};
    const current = generation;
    try { await action(current); }
    catch (failure) {
        if (current === generation) {
            error.value = failure.message; fields.value = failure.fieldErrors || {};
            if (['preferredNameRaw', 'emailRaw', 'phoneRaw'].some(key => fields.value[key])) { flow.value = { kind: 'details' }; focusHeading(); }
        }
    } finally { if (current === generation) busy.value = false; }
}
async function loadProfile() {
    savedProfile.value = null;
    if (!auth.user) return;
    const current = generation;
    try {
        const result = await request('/participation/me/profile', undefined, 'GET');
        if (current === generation) savedProfile.value = result.data;
    } catch { if (current === generation) notice.value = 'Saved details are unavailable. You can still enter them here.'; }
}
function reuseProfile() {
    const profile = savedProfile.value;
    if (!profile || !auth.user) return;
    draft.preferredNameRaw = profile.preferredNameRaw;
    draft.emailRaw = profile.emailRaw;
    draft.phoneRaw = profile.phoneRaw;
    draft.preferences = JSON.parse(JSON.stringify(profile.preferences));
    draft.profileVersion = profile.version;
    notice.value = 'Saved details loaded. Review or edit them before joining.';
}
function next() {
    error.value = ''; fields.value = {};
    if (flow.value.kind === 'details') {
        for (const key of ['preferredNameRaw', 'emailRaw', 'phoneRaw']) {
            if (!draft[key] || !/\S/.test(draft[key])) fields.value[key] = 'Please fill in this field.';
        }
        if (Object.keys(fields.value).length) { error.value = 'Please add your name, email and phone.'; return; }
        flow.value = { kind: 'garden' };
    } else flow.value = { kind: 'review' };
    focusHeading();
}
function accept(join, session) {
    if (session) auth.setSession(session.jwt, session.user);
    if (isConfirmedJoin(join)) {
        flow.value = { kind: 'confirmed', join };
        forget(); emit('rsvped', props.eventId, join.receipt);
    } else if (join?.kind === 'pending_verification') {
        flow.value = { kind: 'proof', intentId: join.intentId, verification: join.verification };
        resendAt.value = Date.now() + 60000; remember();
    } else if (join?.kind === 'sign_in_required') {
        flow.value = { kind: 'legacy', intentId: join.intentId }; remember();
    } else throw new Error('Your place is not confirmed yet. Please try again.');
    focusHeading();
}
const submit = () => act(async current => {
    const values = JSON.parse(JSON.stringify(draft));
    const body = { requestId: operation('submit', values), browserSecret: secret, draft: values };
    const result = await request(`/volunteer-days/${event.value.documentId}/joins`, body);
    if (current === generation) accept(result.data);
});
const verify = () => act(async current => {
    if (!/^\d{8}$/.test(code.value)) throw new Error('Enter the 8-digit code from your email.');
    const body = { requestId: operation('verify', { intentId: flow.value.intentId, code: code.value }), browserSecret: secret, code: code.value };
    const result = await request(`/join-intents/${flow.value.intentId}/verify`, body);
    if (current === generation) accept(result.data.join || result.data, result.data.session);
});
const resend = () => act(async current => {
    if (remaining.value) return;
    const body = { requestId: operation('resend', flow.value.intentId), browserSecret: secret };
    const result = await request(`/join-intents/${flow.value.intentId}/resend`, body);
    if (current === generation) { operations.delete('resend'); code.value = ''; accept(result.data); }
});
const resume = () => act(async current => {
    const body = { requestId: operation('resume', flow.value.intentId), browserSecret: secret };
    const result = await request(`/join-intents/${flow.value.intentId}/resume`, body);
    if (current === generation) accept(result.data.join || result.data, result.data.session);
});
const requestLogin = () => act(async current => {
    const body = { requestId: operation('email-login', loginEmail.value), emailRaw: loginEmail.value, browserSecret: secret };
    const result = await request('/auth/email-login/request', body);
    if (current === generation) { loginProof.value = result.data; flow.value = { ...flow.value, kind: 'email_code' }; code.value = ''; focusHeading(); }
});
const verifyLogin = () => act(async current => {
    const body = { requestId: operation('email-login-verify', { proofId: loginProof.value.proofId, code: code.value }), proofId: loginProof.value.proofId, code: code.value, browserSecret: secret };
    const result = await request('/auth/email-login/verify', body);
    if (current !== generation) return;
    const session = result.data.session;
    const intentId = flow.value.intentId;
    auth.setSession(session.jwt, session.user);
    const receipt = await request(`/volunteer-days/${event.value.documentId}/joins/me`, undefined, 'GET');
    if (auth.auth.accessToken !== session.jwt) return;
    if (receipt.data?.rsvp === 'confirmed') {
        accept({ kind: 'already_confirmed', receipt: receipt.data });
    } else if (intentId) flow.value = { kind: 'legacy', intentId };
    else flow.value = { kind: 'details' };
    code.value = ''; await loadProfile(); focusHeading();
});
function startAgain() {
    forget(); secret = browserSecret(); operations = new Map(); code.value = '';
    flow.value = { kind: 'details' }; focusHeading();
}
function submitPage() {
    if (['details', 'garden'].includes(flow.value.kind)) next();
    else if (flow.value.kind === 'review') submit();
    else if (flow.value.kind === 'proof') verify();
    else if (flow.value.kind === 'email') requestLogin();
    else if (flow.value.kind === 'email_code') verifyLogin();
    else if (flow.value.kind === 'legacy' && auth.user) resume();
}
watch(() => auth.user?.id, () => {
    if (!props.modelValue) return;
    generation++; busy.value = false;
    loadProfile();
});
watch(() => auth.loginModalOpen, async open => {
    if (!props.modelValue) return;
    if (open) dialog.value?.close();
    else { await nextTick(); if (!dialog.value?.open) dialog.value?.showModal(); focusHeading(); }
});
watch([() => props.modelValue, () => props.eventId], async ([open]) => {
    if (!open) { generation++; busy.value = false; dialog.value?.close(); opener?.focus(); return; }
    opener = document.activeElement;
    await nextTick();
    if (!dialog.value?.open) dialog.value?.showModal();
    const current = ++generation;
    busy.value = true; error.value = ''; notice.value = ''; options.value = null;
    Object.assign(draft, blankJoinDraft()); flow.value = { kind: 'details' }; operations = new Map(); code.value = ''; secret = browserSecret();
    try {
        let documentId = props.eventId;
        if (/^\d+$/.test(String(documentId))) {
            const selected = await request(`/volunteer-days/by-id/${documentId}`, undefined, 'GET');
            documentId = selected.data.documentId;
        }
        const catalog = await request('/participation/options', undefined, 'GET');
        if (current !== generation) return;
        event.value = { documentId, title: props.eventTitle };
        options.value = catalog.data;
        try {
            const pending = JSON.parse(sessionStorage.getItem(storageKey()));
            if (pending?.version === 1 && /^[a-f0-9]{64}$/.test(pending.secret) && ['proof', 'legacy'].includes(pending.flow?.kind) && /^[a-f0-9]{64}$/.test(pending.flow.intentId)) { secret = pending.secret; flow.value = pending.flow; }
        } catch { flow.value = { kind: 'details' }; }
        await loadProfile();
    } catch (failure) { if (current === generation) error.value = failure.message; }
    finally { if (current === generation) { busy.value = false; focusHeading(); } }
}, { immediate: true });
timer = setInterval(() => { now.value = Date.now(); }, 1000);
onBeforeUnmount(() => { generation++; clearInterval(timer); dialog.value?.close(); });
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="join-dialog" aria-labelledby="join-heading" @cancel.prevent="close">
      <button type="button" class="join-close" aria-label="Close registration" @click="close">×</button>
      <p class="join-context">Join an event <span v-if="eventTitle">· {{ eventTitle }}</span><span v-else-if="gardenTitle">· {{ gardenTitle }}</span></p>
      <ol class="join-steps" aria-label="Registration pages"><li v-for="(label, index) in ['Your details', 'Your garden life', 'Review & updates']" :key="label" :aria-current="page === index + 1 && 'step'"><span>{{ index + 1 }}</span>{{ label }}</li></ol>
      <h1 id="join-heading" ref="heading" tabindex="-1">{{ title }}</h1>
      <p v-if="busy && !options" role="status">Getting the garden ready…</p>
      <p v-if="notice" class="join-note" role="status">{{ notice }}</p>
      <form v-if="options" novalidate @submit.prevent="submitPage">
        <section v-if="flow.kind === 'details'">
          <p>Your name, email and phone are required. You can add interests on the next page.</p>
          <div class="join-returning"><span>Coming back?</span><button v-if="savedProfile" type="button" @click="reuseProfile">Use my saved details</button><button v-else-if="!auth.user" type="button" @click="flow = { kind: 'email' }; focusHeading()">Sign in to reuse my details</button></div>
          <label>Preferred name<input v-model="draft.preferredNameRaw" type="text" autocomplete="given-name" maxlength="120" required :aria-invalid="!!fields.preferredNameRaw" :aria-describedby="fields.preferredNameRaw && 'join-error-preferredNameRaw'"></label><small v-if="fields.preferredNameRaw" :id="'join-error-preferredNameRaw'">{{ fields.preferredNameRaw }}</small>
          <label>Email<input v-model="draft.emailRaw" type="text" inputmode="email" autocomplete="email" maxlength="320" required :aria-invalid="!!fields.emailRaw" :aria-describedby="fields.emailRaw && 'join-error-emailRaw'"></label><small v-if="fields.emailRaw" :id="'join-error-emailRaw'">{{ fields.emailRaw }}</small>
          <label>Phone number<input v-model="draft.phoneRaw" type="text" inputmode="tel" autocomplete="tel" maxlength="80" required :aria-invalid="!!fields.phoneRaw" :aria-describedby="fields.phoneRaw && 'join-error-phoneRaw'"></label><small v-if="fields.phoneRaw" :id="'join-error-phoneRaw'">{{ fields.phoneRaw }}</small>
          <p class="join-note">Joining an event does not subscribe you to texts.</p>
          <div class="join-actions"><button type="submit" class="join-primary" :disabled="busy">Your garden life →</button></div>
        </section>
        <section v-else-if="flow.kind === 'garden'">
          <p>Everything here is optional. Add what feels useful, or continue to review.</p>
          <fieldset v-for="key in ['gardenDocumentIds', 'interestIds']" :key="key"><legend>{{ groupLabels[key] }}</legend><div class="join-choices"><label v-for="choice in options.preferences[key]" :key="choice.id"><input v-model="draft.preferences[key]" type="checkbox" :value="choice.id">{{ choice.label }}</label></div></fieldset>
          <details><summary>Skills to share & things to learn</summary><fieldset v-for="key in ['offeredSkillIds', 'learningSkillIds']" :key="key"><legend>{{ groupLabels[key] }}</legend><div class="join-choices"><label v-for="choice in options.preferences[key]" :key="choice.id"><input v-model="draft.preferences[key]" type="checkbox" :value="choice.id">{{ choice.label }}</label></div></fieldset></details>
          <details><summary>Experience, availability & task preferences</summary><label>Garden experience<select v-model="draft.preferences.experience"><option :value="null">Choose or leave blank</option><option v-for="choice in options.preferences.experience" :key="choice.id" :value="choice.id">{{ choice.label }}</option></select></label><fieldset v-for="key in ['availabilityIds', 'taskPreferenceIds']" :key="key"><legend>{{ groupLabels[key] }}</legend><div class="join-choices"><label v-for="choice in options.preferences[key]" :key="choice.id"><input v-model="draft.preferences[key]" type="checkbox" :value="choice.id">{{ choice.label }}</label></div></fieldset></details>
          <details><summary>Private access request</summary><label>Anything that would help you take part?<textarea v-model="draft.accessRequestRaw" maxlength="2000" rows="3"></textarea></label><p class="join-note">Shared only with authorized organizers for this event.</p></details>
          <div class="join-actions"><button type="button" @click="flow = { kind: 'details' }; focusHeading()">← Back</button><button type="submit" class="join-primary">Review →</button></div>
        </section>
        <section v-else-if="flow.kind === 'review'">
          <p>Check your details before joining.</p>
          <dl class="join-review"><div v-for="(label, key) in { preferredNameRaw: 'Preferred name', emailRaw: 'Email', phoneRaw: 'Phone' }" :key="key"><dt>{{ label }}</dt><dd>{{ draft[key] }}</dd></div><template v-for="(label, key) in groupLabels" :key="key"><div v-if="draft.preferences[key].length"><dt>{{ label }}</dt><dd>{{ options.preferences[key].filter(choice => draft.preferences[key].includes(choice.id)).map(choice => choice.label).join(', ') }}</dd></div></template><div v-if="draft.accessRequestRaw"><dt>Private access request</dt><dd>{{ draft.accessRequestRaw }}</dd></div></dl>
          <div class="join-actions"><button type="button" @click="flow = { kind: 'details' }; focusHeading()">Edit details</button><button type="button" @click="flow = { kind: 'garden' }; focusHeading()">Edit interests & preferences</button></div>
          <h2>A little garden news.</h2><p>{{ options.newsletter.text }} Existing opt-outs stay in place.</p>
          <label class="join-check"><input v-model="draft.saveReusableProfile" type="checkbox">Save these details for next time</label>
          <div class="join-actions"><button type="button" class="join-primary" :disabled="busy" @click="submit">Join this event ↗</button></div>
        </section>
        <section v-else-if="flow.kind === 'proof'">
          <p>Enter the 8-digit code sent to your email to confirm your place.</p>
          <p v-if="flow.verification === 'simulated'" class="join-note">This local preview simulates email delivery. No email was sent.</p>
          <label>Email code<input v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></label>
          <div class="join-actions"><button type="button" class="join-primary" :disabled="busy" @click="verify">Confirm my place</button><button type="button" :disabled="busy || remaining > 0" @click="resend">Resend code<span v-if="remaining"> ({{ remaining }}s)</span></button></div>
          <button type="button" :disabled="busy" @click="startAgain">Change my details</button>
          <button type="button" :disabled="busy" @click="flow = { ...flow, kind: 'email' }; focusHeading()">Sign in with my verified email</button>
        </section>
        <section v-else-if="flow.kind === 'legacy'">
          <p>Sign in to your existing account to finish this registration.</p>
          <div class="join-actions"><button v-if="auth.user" type="button" class="join-primary" :disabled="busy" @click="resume">Continue registration</button><button v-else type="button" class="join-primary" @click="auth.openLoginModal()">Sign in to my existing account</button><button type="button" @click="flow = { ...flow, kind: 'email' }; focusHeading()">Use an email code</button></div>
        </section>
        <section v-else-if="flow.kind === 'email'">
          <p>We’ll send a code if this email belongs to a verified Garden Steward account.</p><label>Email<input v-model="loginEmail" type="text" inputmode="email" autocomplete="email" maxlength="320"></label><div class="join-actions"><button type="button" class="join-primary" :disabled="busy" @click="requestLogin">Email me a code</button><button type="button" @click="startAgain">Back to registration</button></div>
        </section>
        <section v-else-if="flow.kind === 'email_code'">
          <p>If this address has a verified account, use the 8-digit code from your email.</p><label>Email code<input v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></label><div class="join-actions"><button type="button" class="join-primary" :disabled="busy" @click="verifyLogin">Sign in</button><button type="button" @click="flow = { ...flow, kind: 'email' }; focusHeading()">Change email</button></div>
        </section>
        <section v-else-if="flow.kind === 'confirmed'">
          <p>Your place is confirmed. We’re glad you’ll be there.</p><p v-if="flow.join.profileSave === 'conflict'" class="join-note">Your event registration is saved. Your reusable details changed elsewhere, so those were kept.</p><p v-if="!auth.user">To see this RSVP on another visit, sign in with your verified email.</p><div class="join-actions"><button type="button" class="join-primary" @click="close">Done</button><button v-if="!auth.user" type="button" @click="flow = { kind: 'email' }; focusHeading()">Sign in with email</button></div>
        </section>
      </form>
      <p v-if="error" class="join-error" role="alert">{{ error }}</p>
    </dialog>
  </Teleport>
</template>

<style scoped>
.join-dialog { box-sizing: border-box; width: min(780px, calc(100% - 28px)); max-height: calc(100dvh - 28px); margin: auto; padding: clamp(24px, 5vw, 56px); overflow: auto; background: #f1f2d5; color: #024023; border: 1px solid #a4b08c; font: 20px/1.5 'Gill Sans Local', 'Gill Sans', sans-serif; }
.join-dialog::backdrop { background: rgb(18 36 22 / 55%); }
.join-dialog h1 { margin: 24px 0 16px; font: 400 clamp(34px, 5vw, 56px)/1.08 Georgia, serif; outline: none; }
.join-dialog h2 { font: 400 32px/1.2 Georgia, serif; margin: 28px 0 12px; }
.join-dialog p { margin: 16px 0; }
.join-context { font-size: 16px; max-width: calc(100% - 40px); }
.join-dialog .join-close { position: sticky; top: 0; float: right; z-index: 2; margin: -8px -8px 0 16px; min-width: 44px; min-height: 44px; font-size: 30px; padding: 0; background: #f1f2d5; }
.join-steps { list-style: none; padding: 0 0 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; border-bottom: 1px solid #b9c3a0; font-size: 15px; }
.join-steps li { list-style: none; color: #53664c; }
.join-steps li[aria-current='step'] { color: #024023; font-weight: 700; }
.join-steps span { display: block; font-size: 18px; }
.join-dialog label { display: block; margin: 20px 0; }
.join-dialog input:not([type='checkbox']), .join-dialog select, .join-dialog textarea { box-sizing: border-box; width: 100%; display: block; margin-top: 7px; padding: 12px; border: 1px solid #8f9f7c; border-radius: 0; color: inherit; background: #f8f8e9; font: inherit; }
.join-dialog input[aria-invalid='true'] { border-color: #b62e31; }
.join-dialog small, .join-error { color: #962f28; }
.join-note { color: #53664c; font-size: 17px; }
.join-dialog button { border: 1px solid #7f9270; color: inherit; background: transparent; padding: 10px 16px; font: inherit; cursor: pointer; }
.join-dialog button:disabled { opacity: .55; cursor: wait; }
.join-dialog button.join-primary { background: #024023; color: #f1f2d5; border-color: #024023; }
.join-actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0; }
.join-returning { border-block: 1px solid #b9c3a0; padding: 14px 0; display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 17px; }
.join-dialog fieldset { border: 0; padding: 12px 0; margin: 12px 0; min-width: 0; }
.join-dialog legend { font-weight: 600; }
.join-choices { display: flex; flex-wrap: wrap; gap: 10px; }
.join-choices label { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #a9b594; margin: 0; font-size: 18px; }
.join-dialog input[type='checkbox'] { width: 18px; height: 18px; flex: none; accent-color: #024023; }
.join-dialog details { border-top: 1px solid #b9c3a0; padding: 16px 0; }
.join-dialog summary { cursor: pointer; }
.join-dialog .join-check { display: flex; align-items: center; gap: 12px; }
.join-review { margin: 24px 0; }
.join-review div { padding: 14px 0; border-bottom: 1px solid #b9c3a0; }
.join-review dt { font-size: 16px; color: #53664c; }
.join-review dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 480px) { .join-dialog { font-size: 18px; padding: 22px; } .join-steps { font-size: 13px; gap: 10px; } .join-actions > button { width: 100%; } }
</style>
