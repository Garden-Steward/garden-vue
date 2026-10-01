<script setup>
import { ref } from 'vue';
import { projectDenyReasons } from '@/_config/GardenConfig';

/*
 * Approve / Request changes / Deny for a pending pitch, with the note and
 * reason forms (design boards 1d–1f, 1h, 1i). Used by the review drawer and by
 * the admin bar on a pending project's full page. Emits `decide(action,
 * { reasonCode, note })`; the parent calls the API. Re-key it per project to
 * reset the form.
 */
const props = defineProps({
  pitcherFirst: { type: String, default: 'the pitcher' },
  busy: { type: Boolean, default: false },
  // 'drawer': Deny on the left, actions on the right, stacks on mobile.
  // 'page': the #lead slot fills the left, all three actions on the right.
  variant: { type: String, default: 'drawer' },
  approveLabel: { type: String, default: 'Approve & next' }
});

const emit = defineEmits(['decide']);

const mode = ref('preview'); // 'preview' | 'changes' | 'deny'
const note = ref('');
const reason = ref(null);

const changePrompts = [
  { label: 'Add a photo', text: 'Could you add a photo or sketch?' },
  { label: 'Estimate the cost', text: 'Could you estimate what it would cost?' },
  { label: 'Confirm the location', text: 'Where exactly in the garden would this go?' }
];

function addPrompt(text) {
  note.value = note.value.trim() ? `${note.value.trim()} ${text}` : text;
}

function back() {
  mode.value = 'preview';
  note.value = '';
  reason.value = null;
}

function send(action) {
  if (props.busy) return;
  if (action === 'deny' && !reason.value) return;
  if (action === 'request_changes' && !note.value.trim()) return;
  emit('decide', action, { reasonCode: reason.value || undefined, note: note.value.trim() || undefined });
}

defineExpose({ mode, back });
</script>

<template>
  <div class="db" :class="`db--${variant}`">
    <!-- Request changes (1e) -->
    <div v-if="mode === 'changes'" class="db-form">
      <label for="db-note" class="db-form__label">Note to {{ pitcherFirst }}</label>
      <div class="db-prompts">
        <button v-for="p in changePrompts" :key="p.label" type="button" class="db-prompt" @click="addPrompt(p.text)">+ {{ p.label }}</button>
      </div>
      <textarea
        id="db-note"
        v-model="note"
        class="db-textarea db-textarea--tall"
        placeholder="What should they add or change before you approve it?"
      ></textarea>
      <span class="db-hint">{{ pitcherFirst }} gets this by email. The pitch stays pending under Waiting on pitcher until they resubmit.</span>
      <div class="db-row db-row--end">
        <button type="button" class="db-btn db-btn--text" @click="back">Back</button>
        <button type="button" class="db-btn db-btn--primary" :disabled="busy || !note.trim()" @click="send('request_changes')">Send request</button>
      </div>
    </div>

    <!-- Deny (1f) -->
    <div v-else-if="mode === 'deny'" class="db-form">
      <span class="db-form__label">Why are you denying this? <span class="db-form__sub">Required. {{ pitcherFirst }} sees this reason.</span></span>
      <div class="db-reasons" role="radiogroup">
        <button
          v-for="r in projectDenyReasons"
          :key="r.value"
          type="button"
          role="radio"
          :aria-checked="reason === r.value"
          class="db-reason"
          :class="{ 'is-on': reason === r.value }"
          @click="reason = r.value"
        ><span class="db-reason__dot"></span>{{ r.label }}</button>
      </div>
      <textarea v-model="note" class="db-textarea" placeholder="Add a note (optional)"></textarea>
      <div class="db-row db-row--end">
        <span class="db-hint db-grow">Denial is final. To try again, {{ pitcherFirst }} starts a new pitch.</span>
        <button type="button" class="db-btn db-btn--text" @click="back">Back</button>
        <button type="button" class="db-btn db-btn--deny" :disabled="busy || !reason" @click="send('deny')">Deny pitch</button>
      </div>
    </div>

    <!-- Decision row -->
    <div v-else class="db-decide">
      <div v-if="$slots.lead" class="db-lead"><slot name="lead" /></div>
      <button type="button" class="db-btn db-btn--text db-decide__deny" :disabled="busy" @click="mode = 'deny'">Deny</button>
      <span v-if="!$slots.lead" class="db-grow db-decide__spacer"></span>
      <button type="button" class="db-btn db-btn--outline db-decide__changes" :disabled="busy" @click="mode = 'changes'">Request changes</button>
      <button type="button" class="db-btn db-btn--primary db-decide__approve" :disabled="busy" @click="send('approve')">{{ approveLabel }}</button>
    </div>
  </div>
</template>

<style scoped>
/* Sits on the dark #1f2d1a band in both themes. */
.db-decide,
.db-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.db-row--end { justify-content: flex-end; }

.db-grow { flex: 1; }

.db-lead {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.db-btn {
  font-weight: 700;
  font-size: 15px;
  min-height: 48px;
  border-radius: 9999px;
  cursor: pointer;
  white-space: nowrap;
}

.db--page .db-btn { min-height: 44px; font-size: 14px; }

.db-btn:disabled { cursor: default; opacity: 0.6; }

.db-btn--text {
  background: transparent;
  border: none;
  color: #d0d0d0;
  padding: 0 14px;
}

.db-btn--text:hover:not(:disabled) { color: #f5f5f5; }

.db-btn--outline {
  background: transparent;
  border: 1px solid #8aa37c;
  color: #c8dbbf;
  padding: 0 20px;
}

.db-btn--primary {
  background: #8aa37c;
  border: none;
  color: #14281a;
  padding: 0 24px;
}

.db-btn--deny {
  background: #C2410C;
  border: none;
  color: #fff;
  padding: 0 22px;
}

.db-btn--deny:disabled {
  background: #3d4d36;
  color: #a0b8a0;
  opacity: 1;
}

.db-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.db-form__label {
  font-size: 14px;
  font-weight: 700;
  color: #f5f5f5;
  margin: 0;
}

.db-form__sub {
  color: #a0b8a0;
  font-weight: 400;
}

.db-prompts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.db-prompt {
  font-size: 13px;
  color: #c8dbbf;
  background: transparent;
  border: 1px solid #3d4d36;
  padding: 6px 12px;
  border-radius: 9999px;
  cursor: pointer;
}

.db-prompt:hover { border-color: #8aa37c; }

.db-textarea {
  min-height: 56px;
  background: #2a3826;
  border: 1px solid #3d4d36;
  border-radius: 10px;
  color: #f5f5f5;
  font-size: 15px;
  line-height: 1.5;
  padding: 10px 12px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.db-textarea--tall { min-height: 84px; }

.db-textarea:focus { border-color: #8aa37c; }

.db-textarea::placeholder { color: #a0b8a0; }

.db-hint {
  font-size: 13px;
  color: #a0b8a0;
}

.db-reasons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.db-reason {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  background: transparent;
  border: 1px solid #3d4d36;
  border-radius: 10px;
  padding: 10px 12px;
  min-height: 44px;
  color: #f5f5f5;
  font-size: 14px;
  cursor: pointer;
}

.db-reason.is-on {
  background: #2a3826;
  border-color: #8aa37c;
}

.db-reason__dot {
  width: 16px;
  height: 16px;
  flex: none;
  border-radius: 9999px;
  border: 2px solid #8aa37c;
  box-shadow: inset 0 0 0 2px #1f2d1a;
}

.db-reason.is-on .db-reason__dot { background: #8aa37c; }

/* Mobile: full-width Approve on top, the other two below (1h). */
@media (max-width: 767px) {
  .db-decide {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .db-lead { grid-column: 1 / -1; flex-wrap: wrap; order: -2; }
  .db-decide__spacer { display: none; }
  .db-decide__approve { grid-column: 1 / -1; order: -1; min-height: 50px; font-size: 16px; }
  .db-decide__changes { order: 1; }
  .db-decide__deny { order: 2; }
  .db-reasons { grid-template-columns: 1fr; }
  .db-row--end { flex-wrap: wrap; }
  .db-row--end .db-grow { flex-basis: 100%; }
}
</style>
