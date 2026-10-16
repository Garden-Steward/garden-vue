<script setup>
/**
 * Editor for an event brief: what to expect, how long / who for / food,
 * the day's steps, and what to bring.
 *
 * Two modes:
 * - Series (no `inherited`): edits a recurring template's brief. When it's
 *   empty and a `starter` is given, offers to start from it.
 * - Override (`inherited` given): edits one event's changes. Empty fields
 *   fall back to `inherited`, which is shown as placeholders / read-only rows.
 *
 * State shape is `briefToState()` from helpers/event-brief. Every change emits
 * a new object; the prop is never mutated.
 */
import { computed } from 'vue';
import { briefHasContent, briefToState } from '@/helpers/event-brief';

const props = defineProps({
  modelValue: { type: Object, required: true },
  inherited: { type: Object, default: null },
  inheritedLabel: { type: String, default: 'the series' },
  starter: { type: Object, default: null },
  starterLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  idPrefix: { type: String, default: 'brief' },
});

const emit = defineEmits(['update:modelValue']);

const b = computed(() => props.modelValue);
const isOverride = computed(() => !!props.inherited);
const inh = computed(() => props.inherited || null);

const update = (patch) => emit('update:modelValue', { ...props.modelValue, ...patch });
const setField = (field, value) => update({ [field]: value });

/* ---- lists ---- */
const setRow = (list, index, patch) => {
  const rows = props.modelValue[list].map((r, i) => (i === index ? { ...r, ...patch } : r));
  update({ [list]: rows });
};
const removeRow = (list, index) => update({ [list]: props.modelValue[list].filter((_, i) => i !== index) });
const moveRow = (list, index, dir) => {
  const rows = [...props.modelValue[list]];
  const to = index + dir;
  if (to < 0 || to >= rows.length) return;
  [rows[index], rows[to]] = [rows[to], rows[index]];
  update({ [list]: rows });
};
const addStep = () => update({ agenda: [...props.modelValue.agenda, { time_text: '', label: '', detail: '' }] });
const addItem = (providedBy = 'volunteer') => update({ bring_items: [...props.modelValue.bring_items, { label: '', provided_by: providedBy }] });

// Override mode: lists start empty (= use the series). "Change for this
// event" copies the series list in to edit; "Use the series" clears it.
const copyInherited = (list) => update({ [list]: briefToState(inh.value)[list] });
const clearList = (list) => update({ [list]: [] });

const showInheritedList = (list) => isOverride.value && b.value[list].length === 0 && (inh.value?.[list]?.length > 0);

const canStartFromStarter = computed(() => !isOverride.value && !!props.starter && !briefHasContent(props.modelValue));
const startFromStarter = () => emit('update:modelValue', briefToState(props.starter));

// A real inherited value shows as-is; a generic example is marked as one so
// it can't be mistaken for something already set.
const placeholderFor = (field, example) => (isOverride.value && inh.value?.[field]) || `e.g. ${example}`;
const inheritedHint = (field) => (isOverride.value && !b.value[field] && inh.value?.[field] ? `Same as ${props.inheritedLabel}` : '');

const fid = (name) => `${props.idPrefix}-${name}`;
</script>

<template>
  <div class="brief-editor">
    <div v-if="canStartFromStarter" class="be-starter">
      <div>
        <p class="be-starter-title">Nothing here yet</p>
        <p class="be-help">
          Events in this series show the Garden Steward starter{{ starterLabel ? ` for ${starterLabel}` : '' }} until you write your own.
          Start from it and make it yours.
        </p>
      </div>
      <button type="button" class="be-btn be-btn-primary" :disabled="disabled" @click="startFromStarter">Start from the starter</button>
    </div>

    <!-- What to expect -->
    <div class="be-field">
      <label :for="fid('expect')" class="be-label">What to expect</label>
      <p class="be-help">A few sentences for someone who has never been. What happens, and does experience matter?</p>
      <textarea
        :id="fid('expect')"
        class="be-input"
        rows="3"
        :disabled="disabled"
        :value="b.what_to_expect"
        :placeholder="placeholderFor('what_to_expect', 'No experience needed. We start together, split into small crews, and finish together.')"
        @input="setField('what_to_expect', $event.target.value)"
      ></textarea>
      <p v-if="inheritedHint('what_to_expect')" class="be-inherit">{{ inheritedHint('what_to_expect') }}</p>
    </div>

    <!-- Quick facts -->
    <div class="be-grid3">
      <div class="be-field">
        <label :for="fid('duration')" class="be-label">How long</label>
        <input :id="fid('duration')" class="be-input" type="text" :disabled="disabled" :value="b.duration_text"
          :placeholder="placeholderFor('duration_text', 'About 2.5 hours')" @input="setField('duration_text', $event.target.value)" />
        <p v-if="inheritedHint('duration_text')" class="be-inherit">{{ inheritedHint('duration_text') }}</p>
      </div>
      <div class="be-field">
        <label :for="fid('goodfor')" class="be-label">Good for</label>
        <input :id="fid('goodfor')" class="be-input" type="text" :disabled="disabled" :value="b.good_for"
          :placeholder="placeholderFor('good_for', 'First-timers, kids with a grown-up')" @input="setField('good_for', $event.target.value)" />
        <p v-if="inheritedHint('good_for')" class="be-inherit">{{ inheritedHint('good_for') }}</p>
      </div>
      <div class="be-field">
        <label :for="fid('food')" class="be-label">Food</label>
        <input :id="fid('food')" class="be-input" type="text" :disabled="disabled" :value="b.food"
          :placeholder="placeholderFor('food', 'Shared lunch at noon')" @input="setField('food', $event.target.value)" />
        <p v-if="inheritedHint('food')" class="be-inherit">{{ inheritedHint('food') }}</p>
      </div>
    </div>

    <!-- How the day goes -->
    <fieldset class="be-fieldset">
      <legend class="be-label">How the day goes</legend>
      <p class="be-help">The steps of the day, in order. Times are optional.</p>

      <template v-if="showInheritedList('agenda')">
        <ol class="be-readonly">
          <li v-for="(s, i) in inh.agenda" :key="i"><span v-if="s.time_text" class="be-time">{{ s.time_text }}</span>{{ s.label }}</li>
        </ol>
        <p class="be-inherit">Same as {{ inheritedLabel }}.
          <button type="button" class="be-link" :disabled="disabled" @click="copyInherited('agenda')">Change for this event</button>
        </p>
      </template>
      <template v-else>
        <div v-for="(s, i) in b.agenda" :key="i" class="be-row be-row--step">
          <input class="be-input be-input--time" type="text" :disabled="disabled" :value="s.time_text" placeholder="Time"
            :aria-label="`Step ${i + 1} time`" @input="setRow('agenda', i, { time_text: $event.target.value })" />
          <input class="be-input" type="text" :disabled="disabled" :value="s.label" placeholder="Arrive, coffee, opening circle"
            :aria-label="`Step ${i + 1}`" @input="setRow('agenda', i, { label: $event.target.value })" />
          <input class="be-input be-input--detail" type="text" :disabled="disabled" :value="s.detail" placeholder="Details (optional)"
            :aria-label="`Step ${i + 1} details`" @input="setRow('agenda', i, { detail: $event.target.value })" />
          <span class="be-row-actions">
            <button type="button" class="be-icon" :disabled="disabled || i === 0" :aria-label="`Move step ${i + 1} up`" @click="moveRow('agenda', i, -1)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
            </button>
            <button type="button" class="be-icon" :disabled="disabled || i === b.agenda.length - 1" :aria-label="`Move step ${i + 1} down`" @click="moveRow('agenda', i, 1)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <button type="button" class="be-icon be-icon--remove" :disabled="disabled" :aria-label="`Remove step ${i + 1}`" @click="removeRow('agenda', i)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </span>
        </div>
        <div class="be-list-actions">
          <button type="button" class="be-btn" :disabled="disabled" @click="addStep">+ Add a step</button>
          <button v-if="isOverride && inh?.agenda?.length" type="button" class="be-link" :disabled="disabled" @click="clearList('agenda')">Use {{ inheritedLabel }} instead</button>
        </div>
      </template>
    </fieldset>

    <!-- What to bring -->
    <fieldset class="be-fieldset">
      <legend class="be-label">What to bring</legend>
      <p class="be-help">Mark each one as something volunteers bring, or something the garden has for them.</p>

      <template v-if="showInheritedList('bring_items')">
        <ul class="be-readonly">
          <li v-for="(it, i) in inh.bring_items" :key="i">{{ it.label }} <span class="be-tag">{{ it.provided_by === 'garden' ? 'we provide' : 'they bring' }}</span></li>
        </ul>
        <p class="be-inherit">Same as {{ inheritedLabel }}.
          <button type="button" class="be-link" :disabled="disabled" @click="copyInherited('bring_items')">Change for this event</button>
        </p>
      </template>
      <template v-else>
        <div v-for="(it, i) in b.bring_items" :key="i" class="be-row">
          <input class="be-input" type="text" :disabled="disabled" :value="it.label" placeholder="Water bottle"
            :aria-label="`Item ${i + 1}`" @input="setRow('bring_items', i, { label: $event.target.value })" />
          <span class="be-seg" role="group" :aria-label="`Who brings item ${i + 1}`">
            <button type="button" :aria-pressed="it.provided_by !== 'garden'" :class="{ 'be-seg--on': it.provided_by !== 'garden' }"
              :disabled="disabled" @click="setRow('bring_items', i, { provided_by: 'volunteer' })">They bring</button>
            <button type="button" :aria-pressed="it.provided_by === 'garden'" :class="{ 'be-seg--on': it.provided_by === 'garden' }"
              :disabled="disabled" @click="setRow('bring_items', i, { provided_by: 'garden' })">We provide</button>
          </span>
          <button type="button" class="be-icon be-icon--remove" :disabled="disabled" :aria-label="`Remove item ${i + 1}`" @click="removeRow('bring_items', i)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div class="be-list-actions">
          <button type="button" class="be-btn" :disabled="disabled" @click="addItem('volunteer')">+ Something to bring</button>
          <button type="button" class="be-btn" :disabled="disabled" @click="addItem('garden')">+ Something we provide</button>
          <button v-if="isOverride && inh?.bring_items?.length" type="button" class="be-link" :disabled="disabled" @click="clearList('bring_items')">Use {{ inheritedLabel }} instead</button>
        </div>
      </template>
    </fieldset>
  </div>
</template>

<style>
.brief-editor {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: #1a2617;
  font-family: Roboto, system-ui, sans-serif;
}

.brief-editor .be-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.brief-editor .be-label {
  display: block;
  margin: 0;
  padding: 0;
  font-weight: 700;
  font-size: 0.9375rem;
  color: inherit;
}

.brief-editor .be-help {
  margin: 0 0 4px;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #4b5563;
}

.brief-editor .be-inherit {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: #6c8a6a;
}

.brief-editor .be-input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid #a8c49a;
  border-radius: 6px;
  background-color: #ffffff;
  color: #1a2617;
  font: inherit;
  font-size: 0.9375rem;
}

.brief-editor textarea.be-input {
  resize: vertical;
}

.brief-editor .be-input::placeholder {
  color: #9ca3af;
}

.brief-editor .be-input:focus {
  outline: 2px solid #8aa37c;
  outline-offset: 0;
  border-color: #8aa37c;
}

.brief-editor .be-grid3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.brief-editor .be-fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.brief-editor .be-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.brief-editor .be-row > .be-input {
  flex: 1 1 200px;
}

/* A step: [time] [what happens] [move/remove] on one line, details below */
.brief-editor .be-row--step {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 6px 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ede7da;
}

.brief-editor .be-row--step > .be-input--time {
  grid-column: 1;
}

.brief-editor .be-row--step > .be-row-actions {
  grid-column: 3;
  grid-row: 1;
}

.brief-editor .be-row--step > .be-input--detail {
  grid-column: 2 / 4;
  grid-row: 2;
  min-height: 36px;
  font-size: 0.875rem;
}

html.dark .brief-editor .be-row--step {
  border-bottom-color: #3d4d36;
}

.brief-editor .be-row-actions {
  display: inline-flex;
  gap: 2px;
}

.brief-editor .be-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #376451;
  cursor: pointer;
}

.brief-editor .be-icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.brief-editor .be-icon:hover:not(:disabled) {
  background-color: #f3ece0;
}

.brief-editor .be-icon--remove {
  color: #9a3412;
}

.brief-editor .be-icon:disabled {
  opacity: 0.35;
  cursor: default;
}

.brief-editor .be-seg {
  display: inline-flex;
  padding: 3px;
  border-radius: 9999px;
  background-color: #f3ece0;
}

.brief-editor .be-seg button {
  min-height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: #4b5563;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
}

.brief-editor .be-seg button.be-seg--on {
  background-color: #064e3b;
  color: #ffffff;
}

.brief-editor .be-list-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
}

.brief-editor .be-btn {
  min-height: 36px;
  padding: 0 14px;
  border: 1.5px solid #8aa37c;
  border-radius: 9999px;
  background: transparent;
  color: #376451;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
}

.brief-editor .be-btn:hover:not(:disabled) {
  background-color: #f3ece0;
}

.brief-editor .be-btn-primary {
  border-color: #064e3b;
  background-color: #064e3b;
  color: #ffffff;
}

.brief-editor .be-btn-primary:hover:not(:disabled) {
  background-color: #376451;
}

.brief-editor .be-link {
  padding: 0;
  border: 0;
  background: none;
  color: #064e3b;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.brief-editor .be-readonly {
  margin: 0;
  padding: 10px 12px;
  list-style: none;
  border: 1px dashed #c8d0c0;
  border-radius: 8px;
  color: #4b5563;
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brief-editor .be-time {
  display: inline-block;
  min-width: 52px;
  font-weight: 700;
}

.brief-editor .be-tag {
  margin-left: 6px;
  font-size: 0.75rem;
  color: #6c8a6a;
}

.brief-editor .be-starter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background-color: #F9E2D1;
}

.brief-editor .be-starter-title {
  margin: 0 0 2px;
  font-weight: 700;
}

.brief-editor .be-starter .be-help {
  color: #374151;
  margin: 0;
}

.brief-editor button:disabled {
  cursor: not-allowed;
}

/* Dark: the manage pages and the template modal use html.dark */
html.dark .brief-editor {
  color: #f5f5f5;
}

html.dark .brief-editor .be-help {
  color: #c5d4b8;
}

html.dark .brief-editor .be-inherit,
html.dark .brief-editor .be-tag {
  color: #a8b89e;
}

html.dark .brief-editor .be-input {
  background-color: rgba(26, 26, 26, 0.6);
  border-color: #3d4d36;
  color: #f5f5f5;
}

html.dark .brief-editor .be-input::placeholder {
  color: #7d8a77;
}

html.dark .brief-editor .be-icon {
  color: #c5d4b8;
}

html.dark .brief-editor .be-icon--remove {
  color: #fca5a5;
}

html.dark .brief-editor .be-icon:hover:not(:disabled),
html.dark .brief-editor .be-btn:hover:not(:disabled) {
  background-color: #344a34;
}

html.dark .brief-editor .be-seg {
  background-color: rgba(26, 26, 26, 0.6);
}

html.dark .brief-editor .be-seg button {
  color: #c5d4b8;
}

html.dark .brief-editor .be-seg button.be-seg--on {
  background-color: #8aa37c;
  color: #1a2617;
}

html.dark .brief-editor .be-btn {
  color: #c5d4b8;
}

html.dark .brief-editor .be-btn-primary {
  border-color: #8aa37c;
  background-color: #8aa37c;
  color: #1a2617;
}

html.dark .brief-editor .be-link {
  color: #c5d4b8;
}

html.dark .brief-editor .be-readonly {
  border-color: #3d4d36;
  color: #d0d0d0;
}

html.dark .brief-editor .be-starter {
  background-color: #344a34;
}

html.dark .brief-editor .be-starter .be-help {
  color: #d0d0d0;
}
</style>
