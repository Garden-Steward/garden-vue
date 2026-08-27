<script setup>
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEventStore } from '@/stores';

// The sheet has two anchors. Pass `eventId` for one volunteer day's tasks, or
// `gardenSlug` for every task the garden currently has open. The payload shape
// is identical either way, so everything below this line is anchor-agnostic.
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  eventId: { type: [Number, String], default: null },
  gardenSlug: { type: String, default: null },
  isManager: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue']);

const eventStore = useEventStore();
const { daySheet } = storeToRefs(eventStore);

// Ephemeral step-through state — never persisted anywhere.
const step = ref(1);                 // 1 = Review, 2 = Print
const skippedKeys = ref([]);         // standing keys skipped on THIS sheet
const hiddenTaskIds = ref([]);       // numeric task ids hidden from THIS sheet
const extras = ref([]);              // one-off lines for today
const extraDraft = ref('');
const loading = ref(false);

// Manager-only "Edit list" mode — persistent and global, gated on isManager.
// Never confuse this with the ephemeral skip/hide controls above.
const editMode = ref(false);
const draftList = ref([]);           // working copy of the standing list while editing
const saveError = ref('');           // inline client-side validation message
const pendingEmptyConfirm = ref(false); // AC47 — confirm before saving an empty list
const skipsClearedNote = ref(false); // shown once after a successful save
const saving = ref(false);

const close = () => {
  emit('update:modelValue', false);
};

const resetEphemeral = () => {
  step.value = 1;
  skippedKeys.value = [];
  hiddenTaskIds.value = [];
  extras.value = [];
  extraDraft.value = '';
  editMode.value = false;
  draftList.value = [];
  saveError.value = '';
  pendingEmptyConfirm.value = false;
  skipsClearedNote.value = false;
};

// Load exactly once per open — no onMounted fetch.
watch(() => props.modelValue, async (open) => {
  if (!open) {
    resetEphemeral();
    return;
  }
  resetEphemeral();
  loading.value = true;
  try {
    await (props.gardenSlug
      ? eventStore.fetchGardenDaySheet(props.gardenSlug)
      : eventStore.fetchDaySheet(props.eventId));
  } catch (e) {
    // store already alerted via handleError, which rethrows
  } finally {
    loading.value = false;
  }
});

const toggleSkip = (key) => {
  const idx = skippedKeys.value.indexOf(key);
  if (idx === -1) {
    skippedKeys.value = [...skippedKeys.value, key];
  } else {
    skippedKeys.value = skippedKeys.value.filter(k => k !== key);
  }
};

const toggleHidden = (id) => {
  const idx = hiddenTaskIds.value.indexOf(id);
  if (idx === -1) {
    hiddenTaskIds.value = [...hiddenTaskIds.value, id];
  } else {
    hiddenTaskIds.value = hiddenTaskIds.value.filter(i => i !== id);
  }
};

// -- Edit-list mode (persistent, global, manager-only) ----------------------

const enterEditMode = () => {
  // Never mutate daySheet.standing in place — copy into a working draft.
  draftList.value = (daySheet.value.standing || []).map(i => ({ title: i.title, note: i.note ?? '' }));
  saveError.value = '';
  pendingEmptyConfirm.value = false;
  editMode.value = true;
};

const cancelEditMode = () => {
  // Discard the draft — nothing saved, no request issued.
  editMode.value = false;
  draftList.value = [];
  saveError.value = '';
  pendingEmptyConfirm.value = false;
};

const moveDraftRow = (index, direction) => {
  const target = index + direction;
  if (target < 0 || target >= draftList.value.length) return;
  const copy = [...draftList.value];
  const [row] = copy.splice(index, 1);
  copy.splice(target, 0, row);
  draftList.value = copy;
};

const removeDraftRow = (index) => {
  draftList.value = draftList.value.filter((_, i) => i !== index);
};

const addDraftRow = () => {
  draftList.value = [...draftList.value, { title: '', note: '' }];
};

const validateDraftList = () => {
  if (draftList.value.length > 30) return 'The list may contain at most 30 items.';
  for (let i = 0; i < draftList.value.length; i++) {
    const title = (draftList.value[i].title || '').trim();
    if (!title) return `Item ${i + 1}: title is required.`;
    if (title.length > 120) return `Item ${i + 1}: title must be 120 characters or fewer.`;
    const note = draftList.value[i].note || '';
    if (note.length > 500) return `Item ${i + 1}: note must be 500 characters or fewer.`;
  }
  return '';
};

const buildDraftPayload = () => draftList.value.map(r => ({
  title: r.title.trim(),
  note: r.note?.trim() ? r.note : null
}));

const doSaveStandingTasks = async (payload) => {
  saving.value = true;
  try {
    await eventStore.saveStandingTasks(payload);
    // Content-derived keys shift under a rename, so any ephemeral skips no
    // longer necessarily refer to the same rows — clear them.
    skippedKeys.value = [];
    skipsClearedNote.value = true;
    editMode.value = false;
    draftList.value = [];
    saveError.value = '';
    pendingEmptyConfirm.value = false;
  } catch (e) {
    // store already alerted via handleError, which rethrows — stay in edit
    // mode so the manager's edits are not lost.
  } finally {
    saving.value = false;
  }
};

const attemptSaveStandingTasks = () => {
  saveError.value = '';
  const validationMessage = validateDraftList();
  if (validationMessage) {
    saveError.value = validationMessage;
    return;
  }
  const payload = buildDraftPayload();
  if (payload.length === 0) {
    // AC47 — clearing the list falls back to the five built-in defaults;
    // require explicit confirmation before the request goes out.
    pendingEmptyConfirm.value = true;
    return;
  }
  doSaveStandingTasks(payload);
};

const confirmEmptySave = () => {
  pendingEmptyConfirm.value = false;
  doSaveStandingTasks([]);
};

const cancelEmptySave = () => {
  pendingEmptyConfirm.value = false;
};

const extrasAtLimit = computed(() => extras.value.length >= 5);

const addExtraLine = () => {
  const trimmed = extraDraft.value.trim();
  if (!trimmed) return;
  if (extrasAtLimit.value) return;
  if (trimmed.length > 120) return;
  extras.value = [...extras.value, trimmed];
  extraDraft.value = '';
};

const removeExtraLine = (index) => {
  extras.value = extras.value.filter((_, i) => i !== index);
};

const goToPrintStep = () => {
  step.value = 2;
};

const goBackToReview = () => {
  step.value = 1;
};

const printedStandingCount = computed(() => (daySheet.value.standing || []).length - skippedKeys.value.length);
const printedTasksCount = computed(() => (daySheet.value.tasks || []).length - hiddenTaskIds.value.length);
const totalTasksCount = computed(() => (daySheet.value.tasks || []).length);

const printUrl = computed(() => {
  const opts = {
    excludeKeys: skippedKeys.value,
    hiddenTaskIds: hiddenTaskIds.value,
    extras: extras.value
  };
  return props.gardenSlug
    ? eventStore.gardenDaySheetPrintUrl(props.gardenSlug, opts)
    : eventStore.daySheetPrintUrl(props.eventId, opts);
});

const openPrintSheet = () => {
  window.open(printUrl.value, '_blank', 'noopener');
};
</script>

<template>
  <Teleport to="#modals">
    <div v-if="modelValue">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black opacity-75" @click="close"></div>

      <!-- Modal -->
      <div class="fixed inset-0 flex items-center justify-center overflow-y-auto py-6 z-50" @click="close">
        <div
          class="relative w-[95%] lg:w-[70%] max-w-[900px] max-h-[92vh] overflow-y-auto rounded-2xl p-6 md:p-8 bg-custom-light dark:bg-forest-panel border border-forest-border text-darkest-green dark:text-white"
          @click.stop
        >
          <button
            type="button"
            class="absolute top-3 right-3 text-darkest-green dark:text-white hover:opacity-75 focus:outline-none"
            @click="close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 class="text-2xl font-bold mb-4 text-darkest-green dark:text-white">Print Day Sheet</h2>

          <div v-if="loading" class="py-6 text-center text-darkest-green dark:text-white">Loading…</div>

          <template v-else>
            <!-- Step 1: Review -->
            <div v-if="step === 1">
              <section class="mb-6">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-lg font-semibold text-darkest-green dark:text-white">Every workday</h3>
                  <button
                    v-if="isManager && !editMode"
                    type="button"
                    class="text-darkest-green dark:text-white text-xs font-semibold py-1 px-3 rounded border-2 border-forest-border bg-custom-green/30"
                    @click="enterEditMode"
                  >
                    Edit list
                  </button>
                </div>

                <p v-if="skipsClearedNote" class="text-xs italic mb-2">Skips cleared — review the list again</p>

                <div v-if="editMode" class="on-light mb-3 rounded p-3 bg-custom-peach text-darkest-green font-medium text-sm">
                  You're editing the shared standing list — changes apply to every garden and every future sheet
                </div>

                <ul class="space-y-2">
                  <li
                    v-for="item in daySheet.standing"
                    :key="item.key"
                    class="flex items-start justify-between gap-3 rounded border border-forest-border p-2"
                  >
                    <div :class="{ 'line-through opacity-60': skippedKeys.includes(item.key) }">
                      <div class="font-medium">{{ item.title }}</div>
                      <div v-if="item.note" class="text-sm">{{ item.note }}</div>
                    </div>
                    <button
                      type="button"
                      class="shrink-0 text-white text-xs font-semibold py-1 px-3 rounded bg-custom-green disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="editMode"
                      @click="toggleSkip(item.key)"
                    >
                      {{ skippedKeys.includes(item.key) ? 'Undo skip' : 'Skip on this sheet' }}
                    </button>
                  </li>
                </ul>

                <!-- Edit-list mode: persistent, global changes to the standing list. -->
                <div v-if="editMode" class="mt-4 border-t border-forest-border pt-4 space-y-2">
                  <div
                    v-for="(row, index) in draftList"
                    :key="index"
                    class="rounded border border-forest-border p-2 space-y-2"
                  >
                    <div class="flex items-start gap-2">
                      <div class="flex-1 space-y-1">
                        <input
                          v-model="row.title"
                          type="text"
                          maxlength="120"
                          placeholder="Title"
                          class="w-full p-2 rounded border border-forest-border bg-custom-light dark:bg-forest-page text-darkest-green dark:text-white"
                        />
                        <textarea
                          v-model="row.note"
                          rows="2"
                          maxlength="500"
                          placeholder="Note (optional)"
                          class="w-full p-2 rounded border border-forest-border bg-custom-light dark:bg-forest-page text-darkest-green dark:text-white"
                        ></textarea>
                      </div>
                      <div class="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          class="text-darkest-green dark:text-white text-xs py-1 px-2 rounded border border-forest-border disabled:opacity-50 disabled:cursor-not-allowed"
                          :disabled="index === 0"
                          aria-label="Move up"
                          @click="moveDraftRow(index, -1)"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          class="text-darkest-green dark:text-white text-xs py-1 px-2 rounded border border-forest-border disabled:opacity-50 disabled:cursor-not-allowed"
                          :disabled="index === draftList.length - 1"
                          aria-label="Move down"
                          @click="moveDraftRow(index, 1)"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          class="on-light text-darkest-green text-xs py-1 px-2 rounded bg-custom-peach border-2 border-darkest-green"
                          aria-label="Delete from the list"
                          title="Delete from the list"
                          @click="removeDraftRow(index)"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7h14z" />
                          </svg>
                          Delete from the list
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="text-darkest-green dark:text-white text-xs font-semibold py-1 px-3 rounded border-2 border-forest-border bg-custom-green/30"
                    @click="addDraftRow"
                  >
                    Add task
                  </button>

                  <p v-if="saveError" class="text-xs text-darkest-green dark:text-custom-peach">{{ saveError }}</p>

                  <div v-if="pendingEmptyConfirm" class="on-light rounded p-3 bg-custom-peach text-darkest-green text-sm space-y-2">
                    <p>This clears the list — sheets will fall back to the five built-in defaults.</p>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        class="text-white bg-darkest-green hover:bg-darker-green font-semibold py-1 px-3 rounded"
                        @click="confirmEmptySave"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        class="text-darkest-green border border-darkest-green font-semibold py-1 px-3 rounded"
                        @click="cancelEmptySave"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div class="flex gap-2 pt-2">
                    <button
                      type="button"
                      class="text-white font-bold py-2 px-4 rounded bg-darkest-green hover:bg-darker-green disabled:opacity-50"
                      :disabled="saving"
                      @click="attemptSaveStandingTasks"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      class="text-darkest-green dark:text-white font-medium py-2 px-4 rounded bg-custom-green/30 border-2 border-forest-border"
                      @click="cancelEditMode"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

              </section>

              <section class="mb-6">
                <h3 class="text-lg font-semibold mb-2 text-darkest-green dark:text-white">Today's tasks</h3>
                <ul class="space-y-2">
                  <li
                    v-for="task in daySheet.tasks"
                    :key="task.id"
                    class="flex items-start justify-between gap-3 rounded border border-forest-border p-2"
                  >
                    <div :class="{ 'line-through opacity-60': hiddenTaskIds.includes(task.id) }">
                      <div class="font-medium">{{ task.title }}</div>
                      <div class="text-sm">
                        {{ task.priority }} priority
                        <span v-if="task.type"> · {{ task.type }}</span>
                      </div>
                      <div v-if="task.overview" class="text-sm">{{ task.overview }}</div>
                      <div v-if="hiddenTaskIds.includes(task.id)" class="text-xs italic">Hidden from this sheet</div>
                    </div>
                    <button
                      type="button"
                      class="on-light shrink-0 text-darkest-green text-xs font-semibold py-1 px-3 rounded bg-custom-peach border-2 border-darkest-green"
                      @click="toggleHidden(task.id)"
                    >
                      {{ hiddenTaskIds.includes(task.id) ? 'Show on sheet' : 'Hide from sheet' }}
                    </button>
                  </li>
                </ul>
                <div class="mt-3">
                  <div class="flex flex-wrap gap-2 items-center">
                    <input
                      v-model="extraDraft"
                      type="text"
                      maxlength="120"
                      placeholder="Add a one-off task for today"
                      class="flex-1 min-w-[200px] p-2 rounded border border-forest-border bg-custom-light dark:bg-forest-page text-darkest-green dark:text-white"
                      @keyup.enter="addExtraLine"
                    />
                    <button
                      type="button"
                      class="text-white text-xs font-semibold py-2 px-3 rounded bg-darkest-green hover:bg-darker-green disabled:opacity-50"
                      :disabled="extrasAtLimit"
                      @click="addExtraLine"
                    >
                      Add task
                    </button>
                  </div>
                  <p class="text-xs mt-1 italic">Prints with today's tasks, on this sheet only.</p>
                  <p v-if="extrasAtLimit" class="text-xs mt-1">Five added tasks is the limit.</p>
                  <ul class="mt-2 space-y-1">
                    <li v-for="(line, index) in extras" :key="index" class="flex items-center justify-between gap-2 text-sm">
                      <span>{{ line }}</span>
                      <button type="button" class="text-darkest-green dark:text-white underline text-xs" @click="removeExtraLine(index)">Remove</button>
                    </li>
                  </ul>
                </div>
              </section>

              <div class="flex justify-end">
                <button
                  type="button"
                  class="text-white font-bold py-2 px-4 rounded bg-darkest-green hover:bg-darker-green"
                  @click="goToPrintStep"
                >
                  Continue to print
                </button>
              </div>
            </div>

            <!-- Step 2: Print -->
            <div v-else>
              <p class="mb-4">
                {{ printedStandingCount }} standing lines, {{ extras.length }} extra{{ extras.length === 1 ? '' : 's' }},
                {{ printedTasksCount }} of {{ totalTasksCount }} tasks
              </p>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="text-darkest-green dark:text-white font-medium py-2 px-4 rounded bg-custom-green/30 border-2 border-forest-border"
                  @click="goBackToReview"
                >
                  Back
                </button>
                <a
                  :href="printUrl"
                  target="_blank"
                  rel="noopener"
                  class="text-white font-bold py-2 px-4 rounded bg-darkest-green hover:bg-darker-green no-underline"
                  @click.prevent="openPrintSheet"
                >
                  Open print sheet
                </a>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* The app sets `-webkit-text-fill-color: #e8e8e8 !important` on `.dark`. That
   property is inherited and paints the glyphs, so it beats `color` outright —
   any light panel in dark mode renders near-invisible grey text unless it opts
   back out. `currentColor` hands painting back to whatever `color` says. */
.on-light,
.on-light * {
  -webkit-text-fill-color: currentColor;
}
</style>
