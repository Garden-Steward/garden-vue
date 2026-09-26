<script setup>
import { ref, watch } from 'vue';
import { useProjectsStore, useAlertStore } from '@/stores';
import { fetchWrapper } from '@/helpers';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  projectId: { type: [String, Number], required: true },
  projectTitle: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue', 'done']);

const projectsStore = useProjectsStore();
const alertStore = useAlertStore();

const name = ref('');
const email = ref('');
const phone = ref('');
const isSubmitting = ref(false);
const isDone = ref(false);

const close = () => {
  emit('update:modelValue', false);
};

watch(() => props.modelValue, (open) => {
  if (open) {
    name.value = '';
    email.value = '';
    phone.value = '';
    isDone.value = false;
  }
});

const submit = async () => {
  if (!email.value.trim()) return;
  isSubmitting.value = true;
  try {
    await fetchWrapper.post(
      `${import.meta.env.VITE_API_URL}/api/projects/${props.projectId}/express-interest`,
      {
        name: name.value.trim() || null,
        email: email.value.trim(),
        phone: phone.value.trim() || null
      }
    );
    isDone.value = true;
    await projectsStore.getAllProjects(); // refresh counts
    setTimeout(() => close(), 2000);
  } catch (err) {
    alertStore.error(err?.message || 'Something went wrong. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Teleport to="#modals">
    <div v-if="modelValue">
      <div class="fixed inset-0 bg-black/70 z-[10000]" @click="close"></div>
      <div class="fixed inset-0 flex items-center justify-center z-[10001]" @click="close">
        <div
          class="int-modal relative w-[95%] max-w-[420px] rounded-2xl p-6 bg-white dark:bg-[#2d3e26] text-gray-900 dark:text-[#f5f5f5] shadow-2xl"
          @click.stop
        >
          <button class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-white" @click="close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div v-if="isDone" class="text-center py-8">
            <div class="text-4xl mb-3">🌱</div>
            <h2 class="text-xl font-bold mb-2">You're in!</h2>
            <p class="text-sm opacity-80">We'll keep you posted on {{ projectTitle || 'this project' }}.</p>
          </div>

          <form v-else @submit.prevent="submit">
            <h2 class="text-lg font-bold mb-1">I'm interested</h2>
            <p class="text-sm opacity-70 mb-4">{{ projectTitle }}</p>

            <div class="space-y-3">
              <input v-model="name" type="text" placeholder="Your name" class="int-input" />
              <input v-model="email" type="email" placeholder="Email *" required class="int-input" />
              <input v-model="phone" type="tel" placeholder="Phone (optional, for SMS updates)" class="int-input" />
            </div>

            <button type="submit" :disabled="!email.trim() || isSubmitting" class="int-btn mt-5">
              {{ isSubmitting ? 'Submitting…' : 'Stay in the loop' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.int-modal {
  animation: intFadeIn 0.25s ease;
}
@keyframes intFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0);   }
}

.int-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 0.6rem;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #111827;
  outline: none;
  font-size: 0.95rem;
}
.dark .int-input {
  border-color: #4d5e44;
  background: rgba(26,26,26,0.6);
  color: #f5f5f5;
}
.int-input:focus {
  border-color: #8aa37c;
}

.int-btn {
  width: 100%;
  padding: 0.7rem;
  border-radius: 0.6rem;
  border: none;
  background: #86b153;
  color: #1f2a14;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.int-btn:hover:not(:disabled) { background: #97c264; }
.int-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>