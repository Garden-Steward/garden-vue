<script setup>
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEventStore } from '@/stores';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  eventId: { type: [Number, String], required: true },
  isManager: { type: Boolean, default: false } // used by Task 9; accepted now
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

const close = () => {
  emit('update:modelValue', false);
};

const resetEphemeral = () => {
  step.value = 1;
  skippedKeys.value = [];
  hiddenTaskIds.value = [];
  extras.value = [];
  extraDraft.value = '';
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
    await eventStore.fetchDaySheet(props.eventId);
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

const printUrl = computed(() => eventStore.daySheetPrintUrl(props.eventId, {
  excludeKeys: skippedKeys.value,
  hiddenTaskIds: hiddenTaskIds.value,
  extras: extras.value
}));

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
                <h3 class="text-lg font-semibold mb-2 text-darkest-green dark:text-white">Every workday</h3>
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
                      class="shrink-0 text-white text-xs font-semibold py-1 px-3 rounded bg-primary"
                      @click="toggleSkip(item.key)"
                    >
                      {{ skippedKeys.includes(item.key) ? 'Undo skip' : 'Skip on this sheet' }}
                    </button>
                  </li>
                </ul>

                <div class="mt-4">
                  <div class="flex flex-wrap gap-2 items-center">
                    <input
                      v-model="extraDraft"
                      type="text"
                      maxlength="120"
                      placeholder="Add an extra line for today"
                      class="flex-1 min-w-[200px] p-2 rounded border border-forest-border bg-custom-light dark:bg-forest-page text-darkest-green dark:text-white"
                      @keyup.enter="addExtraLine"
                    />
                    <button
                      type="button"
                      class="text-white text-xs font-semibold py-2 px-3 rounded bg-primary disabled:opacity-50"
                      :disabled="extrasAtLimit"
                      @click="addExtraLine"
                    >
                      Add line
                    </button>
                  </div>
                  <p v-if="extrasAtLimit" class="text-xs mt-1">Five extra lines is the limit.</p>
                  <ul class="mt-2 space-y-1">
                    <li v-for="(line, index) in extras" :key="index" class="flex items-center justify-between gap-2 text-sm">
                      <span>{{ line }}</span>
                      <button type="button" class="text-darkest-green dark:text-white underline text-xs" @click="removeExtraLine(index)">Remove</button>
                    </li>
                  </ul>
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
                      class="shrink-0 text-white text-xs font-semibold py-1 px-3 rounded bg-primary"
                      @click="toggleHidden(task.id)"
                    >
                      {{ hiddenTaskIds.includes(task.id) ? 'Show on sheet' : 'Hide from sheet' }}
                    </button>
                  </li>
                </ul>
              </section>

              <div class="flex justify-end">
                <button
                  type="button"
                  class="text-white font-bold py-2 px-4 rounded bg-dark-orange"
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
                  class="text-darkest-green dark:text-white font-medium py-2 px-4 rounded bg-primary/30 border border-forest-border"
                  @click="goBackToReview"
                >
                  Back
                </button>
                <a
                  :href="printUrl"
                  target="_blank"
                  rel="noopener"
                  class="text-white font-bold py-2 px-4 rounded bg-dark-orange no-underline"
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
