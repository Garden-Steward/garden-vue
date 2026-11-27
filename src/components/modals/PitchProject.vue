<script setup>
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useProjectsStore, useAuthStore, useAlertStore } from '@/stores';
import ProjectWizard from '@/components/form/ProjectWizard.vue';

const props = defineProps({
  // v-model: controls visibility
  modelValue: {
    type: Boolean,
    default: false
  },
  // Gardens the user can associate a pitch with (manage or volunteer).
  gardens: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'created']);

const projectsStore = useProjectsStore();
const authStore = useAuthStore();
const alertStore = useAlertStore();
const { user } = storeToRefs(authStore);

const blankForm = () => ({
  title: '',
  short_description: '',
  category: 'Community',
  garden: '',
  featured_gallery: [],
  location: null,
  goal: '',
  volunteer_goal: null,
  time_commitment: '',
  physical_wellness: 'none'
});

const form = ref(blankForm());
const errors = ref({ title: false });
const isSubmitting = ref(false);
const showFinish = ref(false);
const submitterEmail = ref('');

// ── Draft auto-save (per user, in localStorage) ──
const draftKey = computed(() => (user.value?.id ? `pitch-draft-${user.value.id}` : null));

let draftTimer = null;
watch(
  form,
  (val) => {
    if (!draftKey.value) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey.value, JSON.stringify(val));
      } catch (e) {
        /* ignore quota / private-mode errors */
      }
    }, 400);
  },
  { deep: true }
);

const close = () => {
  emit('update:modelValue', false);
};

// Reset (or restore a saved draft) each time the modal opens.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      let draft = null;
      if (draftKey.value) {
        try {
          const raw = localStorage.getItem(draftKey.value);
          if (raw) draft = JSON.parse(raw);
        } catch (e) {
          /* ignore malformed draft */
        }
      }
      form.value = draft ? { ...blankForm(), ...draft } : blankForm();
      errors.value = { title: false };
      showFinish.value = false;
      submitterEmail.value = user.value?.email || '';
    }
  }
);

const submit = async () => {
  const valid = !!form.value.title.trim();
  errors.value = { title: !valid };
  if (!valid) return;
  isSubmitting.value = true;
  try {
    const gallery = form.value.featured_gallery;
    const payload = {
      title: form.value.title.trim(),
      short_description: form.value.short_description?.trim() || '',
      category: form.value.category,
      garden: form.value.garden || null,
      created_by: user.value?.id ?? null,
      featured_gallery: gallery,
      hero_image: gallery[0] || null,
      // Map the picker's { latitude, longitude } to the schema's flat fields.
      latitude: form.value.location?.latitude ?? null,
      longitude: form.value.location?.longitude ?? null,
      // What-to-expect fields
      goal: form.value.goal || null,
      volunteer_goal: form.value.volunteer_goal ?? null,
      time_commitment: form.value.time_commitment || null,
      physical_wellness: form.value.physical_wellness || 'none',
      submitter_email: submitterEmail.value || null
    };
    const created = await projectsStore.register(payload);
    // Success — clear the saved draft.
    if (draftKey.value) {
      try {
        localStorage.removeItem(draftKey.value);
      } catch (e) {
        /* ignore */
      }
    }
    alertStore.success('Your project pitch was submitted!');
    emit('created', created);
    close();
  } catch (err) {
    alertStore.error('Could not submit your pitch. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Teleport to="#modals">
    <div v-if="modelValue">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black opacity-75" @click="close"></div>

      <!-- Modal -->
      <div class="fixed inset-0 flex items-center justify-center overflow-y-auto py-6" @click="close">
        <div
          class="pitch-panel relative w-[95%] lg:w-[80%] max-w-[1100px] max-h-[92vh] overflow-y-auto rounded-2xl p-6 md:p-10"
          @click.stop
        >
          <button
            type="button"
            class="absolute top-3 right-3 text-[#4a5c42] hover:text-[#1a2617] dark:text-[#d0d7cc] dark:hover:text-white focus:outline-none"
            @click="close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 class="pitch-title mb-6">Pitch a Project</h2>

          <form @submit.prevent="submit">
            <!-- Wizard: one question at a time, kept mounted so "Back" retains the step -->
            <div v-show="!showFinish">
              <ProjectWizard v-model="form" :gardens="gardens" @complete="showFinish = true" />
            </div>

            <!-- Finalize: email + submit -->
            <div v-if="showFinish">
              <button type="button" class="pitch-cancel" @click="showFinish = false">← Back to your idea</button>

              <p v-if="form.title" class="text-lg font-bold mt-4">“{{ form.title }}”</p>

              <div class="mb-4 mt-6">
                <label class="block text-sm font-semibold mb-1">Your email (for project verification)</label>
                <input
                  v-model="submitterEmail"
                  type="email"
                  placeholder="you@example.com"
                  class="w-full px-3 py-3 rounded-lg border border-[#a8c49a] bg-white text-[#1a2617] outline-none dark:bg-[#1a1a1a]/40 dark:border-white/25 dark:text-[#f4f1e4]"
                />
              </div>

              <div class="flex items-center justify-between mt-8">
                <button type="button" class="pitch-cancel" @click="close">Cancel</button>
                <button type="submit" class="pitch-submit" :disabled="isSubmitting">
                  {{ isSubmitting ? 'Submitting…' : 'Submit Pitch' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pitch-panel {
  background-color: #d2e4c8;
  color: #1a2617;
  border: 1px solid #5a6f50;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
}

.pitch-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  color: #1a2617;
  line-height: 1.1;
}

.pitch-cancel {
  background: none;
  border: none;
  color: #2f4a2a;
  text-decoration: underline;
  cursor: pointer;
  font-size: 1rem;
}

.pitch-cancel:hover {
  color: #1a2617;
}

.pitch-submit {
  background-color: #86b153;
  color: #1f2a14;
  font-weight: 700;
  padding: 0.7rem 1.6rem;
  border-radius: 0.6rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.pitch-submit:hover:not(:disabled) {
  background-color: #97c264;
  transform: translateY(-1px);
}

.pitch-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<style>
html.dark .pitch-panel {
  background-color: #3c4a2c;
  color: #f4f1e4;
  border-color: #56663b;
}

html.dark .pitch-title,
html.dark .pitch-cancel {
  color: #f4f1e4;
}

html.dark .pitch-cancel:hover {
  color: #ffffff;
}
</style>