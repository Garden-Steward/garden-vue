<script setup>
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore, useProjectAlertsStore } from '@/stores';

/**
 * "Tell me about new projects near me" — sits at the top of /projects for
 * everyone. Signed-in visitors skip the email field; the API uses theirs.
 */
const authStore = useAuthStore();
const alertsStore = useProjectAlertsStore();
const { user } = storeToRefs(authStore);

const scope = ref('zip');
const place = ref('');
const email = ref('');
const submitting = ref(false);
const error = ref('');
const doneLabel = ref('');

const signedInEmail = computed(() => user.value?.email || '');
const placeLabel = computed(() => (scope.value === 'zip' ? 'Zip code' : 'City'));

function setScope(next) {
  scope.value = next;
  place.value = '';
  error.value = '';
}

async function submit() {
  error.value = '';
  const value = place.value.trim();
  if (scope.value === 'zip' && !/^\d{5}$/.test(value)) {
    error.value = 'Enter a 5-digit zip code.';
    return;
  }
  if (scope.value === 'city' && !value) {
    error.value = 'Enter your city.';
    return;
  }
  if (!signedInEmail.value && !email.value.trim()) {
    error.value = 'Enter your email.';
    return;
  }

  submitting.value = true;
  try {
    const body = { [scope.value]: value };
    if (!signedInEmail.value) body.email = email.value.trim();
    const res = await alertsStore.subscribe(body);
    doneLabel.value = res?.label || value;
  } catch (e) {
    error.value = e?.message || (typeof e === 'string' ? e : 'Something went wrong. Please try again.');
  } finally {
    submitting.value = false;
  }
}

function again() {
  doneLabel.value = '';
  place.value = '';
}
</script>

<template>
  <section class="palert" aria-labelledby="palert-title">
    <div v-if="doneLabel" class="palert-done" role="status">
      <p class="palert-title" id="palert-title">You're on the list for {{ doneLabel }}.</p>
      <p class="palert-body">
        We'll email {{ signedInEmail || 'you' }} when a new project is approved there.
        <template v-if="!signedInEmail">Check your inbox for a welcome note.</template>
      </p>
      <button type="button" class="palert-link" @click="again">Add another place</button>
    </div>

    <form v-else class="palert-form" novalidate @submit.prevent="submit">
      <p class="palert-title" id="palert-title">Hear about new projects near you</p>
      <p class="palert-body">We'll email you when a new project is approved in your zip code or city.</p>

      <div class="palert-scope" role="radiogroup" aria-label="Notify me about">
        <button
          type="button"
          role="radio"
          :aria-checked="scope === 'zip'"
          class="palert-seg"
          :class="{ 'is-selected': scope === 'zip' }"
          @click="setScope('zip')"
        >My zip</button>
        <button
          type="button"
          role="radio"
          :aria-checked="scope === 'city'"
          class="palert-seg"
          :class="{ 'is-selected': scope === 'city' }"
          @click="setScope('city')"
        >Whole city</button>
      </div>

      <div class="palert-fields">
        <label class="palert-field">
          <span class="sr-only">{{ placeLabel }}</span>
          <input
            v-if="scope === 'zip'"
            v-model="place"
            class="palert-input palert-input--zip"
            type="text"
            inputmode="numeric"
            autocomplete="postal-code"
            maxlength="5"
            placeholder="Zip code"
          />
          <input
            v-else
            v-model="place"
            class="palert-input"
            type="text"
            autocomplete="address-level2"
            maxlength="80"
            placeholder="City, e.g. Oakland"
          />
        </label>
        <label v-if="!signedInEmail" class="palert-field palert-field--grow">
          <span class="sr-only">Email</span>
          <input
            v-model="email"
            class="palert-input"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          />
        </label>
        <button type="submit" class="palert-btn" :disabled="submitting">
          {{ submitting ? 'Signing up…' : 'Notify me' }}
        </button>
      </div>

      <p v-if="signedInEmail" class="palert-note">Alerts go to {{ signedInEmail }}.</p>
      <p v-if="error" class="palert-error" role="alert">{{ error }}</p>
    </form>
  </section>
</template>

<style scoped>
.palert {
  margin: 16px 16px 0;
  padding: 14px 14px 12px;
  background: #fff;
  border: 1px solid #dcd3c0;
  border-left: 4px solid #064e3b;
  border-radius: 14px;
}

html.dark .palert {
  background: #1f2d1a;
  border-color: #3d4d36;
  border-left-color: #8aa37c;
}

.palert-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.25;
  color: #064e3b;
  margin: 0 0 4px;
}

html.dark .palert-title {
  color: #c8dbbf;
}

.palert-body,
.palert-note {
  font-size: 13px;
  line-height: 1.5;
  color: #4b5563;
  margin: 0 0 10px;
}

.palert-note {
  margin: 8px 0 0;
  font-size: 12px;
}

html.dark .palert-body,
html.dark .palert-note {
  color: #cfd8c8;
}

.palert-scope {
  display: inline-flex;
  border: 1px solid #c3cdb8;
  border-radius: 9999px;
  padding: 2px;
  margin-bottom: 10px;
}

html.dark .palert-scope {
  border-color: #3d4d36;
}

.palert-seg {
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 12.5px;
  font-weight: 700;
  color: #376451;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.palert-seg.is-selected {
  background: #064e3b;
  color: #fff;
}

html.dark .palert-seg {
  color: #c8dbbf;
}

html.dark .palert-seg.is-selected {
  background: #8aa37c;
  color: #14281a;
}

.palert-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.palert-field {
  display: flex;
  flex: 1 1 140px;
  margin: 0;
}

.palert-field--grow {
  flex: 2 1 200px;
}

.palert-input {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  font-size: 15px;
  color: #1f2937;
  background: #fbf8f1;
  border: 1px solid #c3cdb8;
  border-radius: 10px;
}

.palert-input:focus {
  outline: 2px solid #064e3b;
  outline-offset: 1px;
}

html.dark .palert-input {
  color: #f5f5f5;
  background: #2a3826;
  border-color: #3d4d36;
}

html.dark .palert-input::placeholder {
  color: #a3b89e;
}

html.dark .palert-input:focus {
  outline-color: #8aa37c;
}

.palert-btn {
  flex: 1 1 120px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 9999px;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  background: #064e3b;
  color: #fff;
  border: 1px solid #064e3b;
}

.palert-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

html.dark .palert-btn {
  background: #8aa37c;
  color: #14281a;
  border-color: #8aa37c;
}

.palert-error {
  margin: 8px 0 0;
  font-size: 13px;
  color: #b91c1c;
}

html.dark .palert-error {
  color: #fca5a5;
}

.palert-link {
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  color: #064e3b;
  background: none;
  border: 0;
  text-decoration: underline;
  cursor: pointer;
}

html.dark .palert-link {
  color: #8aa37c;
}

.palert-done .palert-body {
  margin-bottom: 6px;
}

@media (min-width: 700px) {
  .palert {
    max-width: 1032px;
    margin: 20px auto 0;
    padding: 16px 18px 14px;
  }

  .palert-btn {
    flex: 0 0 auto;
  }
}
</style>
