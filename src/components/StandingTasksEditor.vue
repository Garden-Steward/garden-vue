<script setup>
import { ref, computed, watch } from 'vue';
import { useEventStore } from '@/stores';

/**
 * The every-volunteer-day checklist for one garden — the block that prints at
 * the top of its day sheet, above the tasks scheduled for that particular day.
 *
 * The list belongs to this garden alone. Until a manager saves here the garden
 * inherits a shared list, so the first save is also what takes ownership; the
 * banner says so rather than letting that happen invisibly.
 */
const props = defineProps({
  gardenSlug: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
});

const eventStore = useEventStore();

const items = ref([]);
const source = ref('default');
const loading = ref(false);
const saving = ref(false);
const editing = ref(false);
const draft = ref([]);
const error = ref('');
const savedNote = ref('');

const MAX_ITEMS = 30;
const MAX_TITLE = 120;
const MAX_NOTE = 500;

const inherited = computed(() => source.value !== 'garden');
const atLimit = computed(() => draft.value.length >= MAX_ITEMS);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await eventStore.fetchGardenStandingTasks(props.gardenSlug);
    items.value = Array.isArray(data?.standing) ? data.standing : [];
    source.value = data?.meta?.source || 'default';
  } catch (e) {
    // the store alerts and rethrows
  } finally {
    loading.value = false;
  }
}

watch(() => props.gardenSlug, (slug) => { if (slug) load(); }, { immediate: true });

function startEditing() {
  // Copy, so cancelling leaves what is on screen untouched.
  draft.value = items.value.map((i) => ({ title: i.title, note: i.note || '' }));
  savedNote.value = '';
  error.value = '';
  editing.value = true;
}

function cancelEditing() {
  draft.value = [];
  error.value = '';
  editing.value = false;
}

function addRow() {
  if (atLimit.value) return;
  draft.value.push({ title: '', note: '' });
}

function removeRow(index) {
  draft.value.splice(index, 1);
}

function moveRow(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= draft.value.length) return;
  const [row] = draft.value.splice(index, 1);
  draft.value.splice(target, 0, row);
}

/** Mirrors the server's rules so a bad row is caught before a round trip. */
function validate() {
  if (draft.value.length > MAX_ITEMS) return `Keep it to ${MAX_ITEMS} tasks or fewer.`;
  for (let i = 0; i < draft.value.length; i += 1) {
    const title = String(draft.value[i].title || '').trim();
    if (title === '') return `Task ${i + 1} needs a title.`;
    if (title.length > MAX_TITLE) return `Task ${i + 1}: title must be ${MAX_TITLE} characters or fewer.`;
    if (String(draft.value[i].note || '').length > MAX_NOTE) {
      return `Task ${i + 1}: note must be ${MAX_NOTE} characters or fewer.`;
    }
  }
  return '';
}

async function save() {
  error.value = validate();
  if (error.value) return;

  saving.value = true;
  try {
    const payload = draft.value.map((r) => ({
      title: String(r.title).trim(),
      note: String(r.note || '').trim() === '' ? null : String(r.note).trim(),
    }));
    const data = await eventStore.saveGardenStandingTasks(props.gardenSlug, payload);
    items.value = Array.isArray(data?.standing) ? data.standing : [];
    source.value = data?.meta?.source || 'garden';
    editing.value = false;
    draft.value = [];
    savedNote.value = 'Saved — this is what this garden prints from now on.';
  } catch (e) {
    // the store alerts and rethrows; stay in edit mode so the work is not lost
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mt-8 pt-6 border-t-2 border-forest-border">
    <div class="flex flex-wrap justify-between items-center gap-2 mb-1">
      <h3 class="gm-heading text-xl font-light font-serif">Every volunteer day</h3>
      <button
        v-if="canEdit && !editing"
        type="button"
        class="gm-secondary-btn px-4 py-2 font-medium text-sm rounded shadow-md focus:outline-none focus:ring-0"
        @click="startEditing"
      >
        Edit checklist
      </button>
    </div>

    <p class="text-sm mb-3 opacity-80">
      Printed at the top of this garden's day sheet, above the tasks for that particular day.
    </p>

    <div v-if="loading" class="text-sm py-3">Loading…</div>

    <template v-else>
      <!-- Read-only view -->
      <div v-if="!editing">
        <div
          v-if="inherited"
          class="on-light mb-3 rounded p-3 bg-custom-peach text-darkest-green text-sm"
        >
          This garden hasn't set its own checklist yet, so it's using the shared one.
          Saving here gives {{ gardenSlug }} its own copy — other gardens keep theirs.
        </div>
        <p v-if="savedNote" class="text-sm mb-3 italic">{{ savedNote }}</p>

        <ul v-if="items.length" class="space-y-2">
          <li
            v-for="item in items"
            :key="item.key"
            class="rounded border-2 border-forest-border p-2"
          >
            <div class="font-medium">{{ item.title }}</div>
            <div v-if="item.note" class="text-sm opacity-80">{{ item.note }}</div>
          </li>
        </ul>
        <p v-else class="text-sm italic">No standing tasks — the sheet will print the day's tasks only.</p>
      </div>

      <!-- Edit view -->
      <div v-else>
        <div class="on-light mb-3 rounded p-3 bg-custom-peach text-darkest-green text-sm font-medium">
          Editing this garden's checklist. Saving changes what this garden prints on every future
          day sheet, and affects no other garden.
        </div>

        <ul class="space-y-3">
          <li
            v-for="(row, index) in draft"
            :key="index"
            class="rounded border-2 border-forest-border p-3"
          >
            <div class="flex flex-wrap gap-2 items-start">
              <div class="flex-1 min-w-[220px] space-y-2">
                <input
                  v-model="row.title"
                  type="text"
                  :maxlength="MAX_TITLE"
                  placeholder="Task"
                  class="w-full p-2 rounded border-2 border-forest-border bg-custom-light dark:bg-forest-page text-darkest-green dark:text-white"
                />
                <input
                  v-model="row.note"
                  type="text"
                  :maxlength="MAX_NOTE"
                  placeholder="Note (optional)"
                  class="w-full p-2 rounded border-2 border-forest-border bg-custom-light dark:bg-forest-page text-darkest-green dark:text-white"
                />
              </div>
              <div class="flex flex-col gap-1">
                <button
                  type="button"
                  class="text-xs py-1 px-3 rounded border-2 border-forest-border"
                  :disabled="index === 0"
                  aria-label="Move up"
                  @click="moveRow(index, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="text-xs py-1 px-3 rounded border-2 border-forest-border"
                  :disabled="index === draft.length - 1"
                  aria-label="Move down"
                  @click="moveRow(index, 1)"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="on-light text-xs py-1 px-3 rounded bg-custom-peach text-darkest-green border-2 border-darkest-green"
                  aria-label="Remove from checklist"
                  @click="removeRow(index)"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        </ul>

        <button
          type="button"
          class="mt-3 text-white text-sm font-semibold py-2 px-4 rounded bg-custom-green disabled:opacity-50"
          :disabled="atLimit"
          @click="addRow"
        >
          Add task
        </button>
        <p v-if="atLimit" class="text-xs mt-1">{{ MAX_ITEMS }} tasks is the limit.</p>

        <p v-if="draft.length === 0" class="text-sm italic mt-3">
          Saving an empty checklist means this garden's sheet prints the day's tasks only.
        </p>

        <p v-if="error" class="text-sm mt-3 font-medium">{{ error }}</p>

        <div class="flex gap-2 mt-4">
          <button
            type="button"
            class="text-white font-bold py-2 px-4 rounded bg-darkest-green hover:bg-darker-green disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? 'Saving…' : 'Save checklist' }}
          </button>
          <button
            type="button"
            class="font-medium py-2 px-4 rounded border-2 border-forest-border"
            :disabled="saving"
            @click="cancelEditing"
          >
            Cancel
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* The app sets `-webkit-text-fill-color: #e8e8e8 !important` on `.dark`. It is
   inherited and paints the glyphs, so it beats `color`: any light panel needs to
   hand painting back to `color` or its text is unreadable in dark mode. */
.on-light,
.on-light * {
  -webkit-text-fill-color: currentColor;
}
</style>
