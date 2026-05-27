<script setup>
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useProjectsStore, useAuthStore, useAlertStore } from '@/stores';
import ProjectForm from '@/components/form/ProjectForm.vue';

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
  location: null
});

const form = ref(blankForm());
const errors = ref({ title: false });
const isSubmitting = ref(false);
const projectForm = ref(null);

const close = () => {
  emit('update:modelValue', false);
};

// Reset the form each time the modal opens.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.value = blankForm();
      errors.value = { title: false };
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
      location: form.value.location || null
    };
    const created = await projectsStore.register(payload);
    alertStore.success('Your project pitch was submitted!');
    emit('created', created);
    close();
  } catch (err) {
    // store.register surfaces its own alert when it routes through handleError;
    // guard here in case the relation fields trip a validation error.
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
            class="absolute top-3 right-3 text-[#d0d7cc] hover:text-white focus:outline-none"
            @click="close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 class="pitch-title mb-6">Pitch a Project</h2>

          <form @submit.prevent="submit">
            <ProjectForm ref="projectForm" v-model="form" :gardens="gardens" :errors="errors" />

            <!-- Footer -->
            <div class="flex items-center justify-between mt-8">
              <button type="button" class="pitch-cancel" @click="close">Cancel</button>
              <button type="submit" class="pitch-submit" :disabled="isSubmitting || projectForm?.isUploading">
                {{ isSubmitting ? 'Submitting…' : 'Submit Pitch' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pitch-panel {
  background-color: #3c4a2c;
  color: #f4f1e4;
  border: 1px solid #56663b;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
}

.pitch-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  color: #f4f1e4;
  line-height: 1.1;
}

.pitch-cancel {
  background: none;
  border: none;
  color: #f4f1e4;
  text-decoration: underline;
  cursor: pointer;
  font-size: 1rem;
}

.pitch-cancel:hover {
  color: #ffffff;
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
