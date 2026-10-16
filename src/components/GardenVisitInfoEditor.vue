<script setup>
/**
 * "Visiting the garden": logistics shown on every event page for this garden
 * (meeting spot, parking, restroom, accessibility, kids & pets).
 * Saves `garden.visit_info` through the core garden update route.
 */
import { computed, ref, watch } from 'vue';
import { useGardensStore, useAlertStore } from '@/stores';
import { VISIT_FIELDS, visitToState, visitToPayload } from '@/helpers/event-brief';

const props = defineProps({
  garden: { type: Object, required: true },
  editor: { type: Boolean, default: false },
});

const gardensStore = useGardensStore();
const alertStore = useAlertStore();

const form = ref(visitToState(props.garden.visit_info));
const saved = ref(visitToState(props.garden.visit_info));
const saving = ref(false);
const open = ref(false);

watch(() => props.garden.visit_info, (v) => {
  form.value = visitToState(v);
  saved.value = visitToState(v);
});

const dirty = computed(() => JSON.stringify(visitToPayload(form.value)) !== JSON.stringify(visitToPayload(saved.value)));
const filledCount = computed(() => VISIT_FIELDS.filter((f) => saved.value[f.key]?.trim()).length);

const save = async () => {
  if (!props.garden.documentId) return;
  saving.value = true;
  try {
    // documentId: v5's core update keys on it, not the numeric id.
    await gardensStore.update(props.garden.documentId, { visit_info: visitToPayload(form.value) });
    saved.value = { ...form.value };
    alertStore.success('Visit info saved. It shows on every event page for this garden.');
  } catch (e) {
    console.error('Error saving visit info:', e);
    alertStore.error("Couldn't save visit info. Try again in a moment.");
  } finally {
    saving.value = false;
  }
};

const reset = () => { form.value = { ...saved.value }; };
</script>

<template>
  <section class="visit-editor" aria-labelledby="visit-editor-title">
    <div class="vi-head">
      <div>
        <h3 id="visit-editor-title" class="vi-title">Visiting the garden</h3>
        <p class="vi-help">
          Shown on every event page for {{ garden.title }}: where to meet, parking, restroom, access.
          <template v-if="!open">{{ filledCount ? `${filledCount} of ${VISIT_FIELDS.length} filled in.` : 'Nothing filled in yet.' }}</template>
        </p>
      </div>
      <button type="button" class="vi-toggle" :aria-expanded="open" aria-controls="visit-editor-body" @click="open = !open">
        {{ open ? 'Close' : (editor ? 'Edit' : 'View') }}
      </button>
    </div>

    <div v-show="open" id="visit-editor-body" class="vi-body">
      <div class="vi-grid">
        <div v-for="f in VISIT_FIELDS" :key="f.key" class="vi-field" :class="{ 'vi-field--short': f.short }">
          <label :for="`visit-${f.key}`" class="vi-label">{{ f.label }}</label>
          <input
            v-if="f.short"
            :id="`visit-${f.key}`"
            v-model="form[f.key]"
            type="text"
            class="vi-input"
            :placeholder="f.placeholder"
            :disabled="!editor"
          />
          <textarea
            v-else
            :id="`visit-${f.key}`"
            v-model="form[f.key]"
            rows="3"
            class="vi-input"
            :placeholder="f.placeholder"
            :disabled="!editor"
          ></textarea>
        </div>
      </div>
      <div v-if="editor" class="vi-actions">
        <button type="button" class="vi-save" :disabled="!dirty || saving" @click="save">{{ saving ? 'Saving…' : 'Save visit info' }}</button>
        <button v-if="dirty" type="button" class="vi-link" @click="reset">Discard changes</button>
        <router-link v-if="garden.slug" :to="`/gardens/${garden.slug}#events`" class="vi-link">See an event page</router-link>
      </div>
    </div>
  </section>
</template>

<style>
.visit-editor {
  margin-bottom: 20px;
  padding: 16px 18px;
  border: 1px solid #e2dccb;
  border-radius: 10px;
  background-color: #f7f1e3;
  color: #1a2617;
}

.visit-editor .vi-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.visit-editor .vi-title {
  margin: 0 0 2px;
  font-size: 1.0625rem;
  font-weight: 700;
  color: #376451;
}

.visit-editor .vi-help {
  margin: 0;
  font-size: 0.875rem;
  color: #4b5563;
}

.visit-editor .vi-toggle {
  flex: none;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #c7d4bf;
  border-radius: 6px;
  background-color: #ffffff;
  color: #376451;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
}

.visit-editor .vi-body {
  margin-top: 14px;
}

.visit-editor .vi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px 16px;
}

.visit-editor .vi-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.visit-editor .vi-label {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: inherit;
}

.visit-editor .vi-input {
  box-sizing: border-box;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #a8c49a;
  border-radius: 6px;
  background-color: #ffffff;
  color: #1a2617;
  font: inherit;
  font-size: 0.9375rem;
}

.visit-editor .vi-input::placeholder {
  color: #9ca3af;
}

.visit-editor .vi-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-top: 14px;
}

.visit-editor .vi-save {
  min-height: 40px;
  padding: 0 18px;
  border: 0;
  border-radius: 6px;
  background-color: #8aa37c;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.visit-editor .vi-save:hover:not(:disabled) {
  background-color: #6c8a6a;
}

.visit-editor .vi-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.visit-editor .vi-link {
  padding: 0;
  border: 0;
  background: none;
  color: #376451;
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

html.dark .visit-editor {
  background-color: #344a34;
  border-color: #3d4d36;
  color: #f5f5f5;
}

html.dark .visit-editor .vi-title {
  color: #f5f5f5;
}

html.dark .visit-editor .vi-help {
  color: #c5d4b8;
}

html.dark .visit-editor .vi-toggle {
  background-color: #2d3e26;
  border-color: #3d4d36;
  color: #c5d4b8;
}

html.dark .visit-editor .vi-input {
  background-color: rgba(26, 26, 26, 0.6);
  border-color: #3d4d36;
  color: #f5f5f5;
}

html.dark .visit-editor .vi-input::placeholder {
  color: #7d8a77;
}

html.dark .visit-editor .vi-link {
  color: #c5d4b8;
}
</style>
