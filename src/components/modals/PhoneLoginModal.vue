<script setup>
import { ref, computed } from 'vue';
import { useGardenTaskStore, useAlertStore } from '@/stores';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  task: {
    type: Object,
    default: null
  },
  darkMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'success']);

const gardenTaskStore = useGardenTaskStore();
const alertStore = useAlertStore();

const phoneNumber = ref('');
const isSubmitting = ref(false);
const error = ref('');

// Format phone number as user types
const formatPhoneNumber = (value) => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

const handlePhoneInput = (event) => {
  const formatted = formatPhoneNumber(event.target.value);
  phoneNumber.value = formatted;
};

// Validate phone number (10 digits for US)
const isValidPhone = computed(() => {
  const digits = phoneNumber.value.replace(/\D/g, '');
  return digits.length === 10;
});

const taskTitle = computed(() => {
  return props.task?.attributes?.title || 'this task';
});

const close = () => {
  phoneNumber.value = '';
  error.value = '';
  isSubmitting.value = false;
  emit('close');
};

const submit = async () => {
  if (!isValidPhone.value) {
    error.value = 'Please enter a valid 10-digit phone number';
    return;
  }

  if (!props.task?.id) {
    error.value = 'No task selected';
    return;
  }

  isSubmitting.value = true;
  error.value = '';

  try {
    // Extract just digits for the API
    const cleanPhone = phoneNumber.value.replace(/\D/g, '');
    const response = await gardenTaskStore.assignTaskViaSMS(props.task.id, cleanPhone);

    // Close modal first
    emit('success');
    close();

    // Then show alert after modal is closed
    setTimeout(() => {
      if (response.success === true) {
        alertStore.success('Found your account! Look forward to a message');
      } else {
        alertStore.success('Task assignment request sent! Check your phone for confirmation.');
      }
    }, 100);
  } catch (err) {
    error.value = err.message || 'Failed to send assignment request';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Teleport to="#modals">
    <div v-if="show" class="phone-modal-wrapper" :class="{ 'phone-modal-dark': darkMode }">
      <!-- Backdrop -->
      <div
        class="phone-modal-backdrop"
        @click="close"
      ></div>

      <!-- Modal -->
      <div class="fixed inset-0 flex items-center justify-center p-4" @click="close">
        <div
          class="phone-modal-content"
          @click.stop
        >
          <!-- Close button -->
          <button
            type="button"
            class="phone-modal-close"
            @click="close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Header -->
          <div class="text-center mb-6">
            <div class="phone-modal-icon">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h2 class="phone-modal-title">Sign Up for Task</h2>
            <p class="phone-modal-subtitle">
              Enter your phone number to sign up for <strong class="phone-modal-task">{{ taskTitle }}</strong>
            </p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label for="phone" class="phone-modal-label">Phone Number</label>
              <input
                id="phone"
                type="tel"
                :value="phoneNumber"
                @input="handlePhoneInput"
                placeholder="(555) 555-5555"
                class="phone-modal-input"
                :class="{ 'phone-modal-input-error': error }"
                autocomplete="tel"
              />
              <p v-if="error" class="phone-modal-error">
                {{ error }}
              </p>
            </div>

            <p class="phone-modal-info">
              You'll receive a text message to confirm your task assignment. Standard messaging rates may apply.
            </p>

            <button
              type="submit"
              :disabled="!isValidPhone || isSubmitting"
              class="phone-modal-btn"
              :class="{
                'phone-modal-btn-active': isValidPhone && !isSubmitting,
                'phone-modal-btn-disabled': !isValidPhone || isSubmitting
              }"
            >
              <span v-if="isSubmitting" class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
              <span v-else>Sign Me Up</span>
            </button>
          </form>

          <!-- Footer info -->
          <p class="phone-modal-footer">
            By signing up, you agree to receive SMS messages about this task.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.phone-modal-wrapper {
  z-index: 10001;
}

/* Light mode (default) */
.phone-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(17, 24, 39, 0.5);
  transition: background-color 0.3s ease;
}

.phone-modal-content {
  background-color: #ffffff;
  color: #111827;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 28rem;
  width: 100%;
  padding: 1.5rem;
  position: relative;
  transition: all 0.3s ease;
}

.phone-modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: #9ca3af;
  transition: color 0.2s;
}
.phone-modal-close:hover {
  color: #4b5563;
}

.phone-modal-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 9999px;
  background-color: #dcfce7;
  color: #16a34a;
  margin-bottom: 1rem;
}

.phone-modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.phone-modal-subtitle {
  color: #4b5563;
  margin-top: 0.5rem;
}

.phone-modal-task {
  color: #16a34a;
}

.phone-modal-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.phone-modal-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background-color: #ffffff;
  color: #111827;
  font-size: 1.125rem;
  transition: all 0.2s;
}
.phone-modal-input::placeholder {
  color: #9ca3af;
}
.phone-modal-input:focus {
  outline: none;
  border-color: transparent;
  box-shadow: 0 0 0 2px #22c55e;
}
.phone-modal-input-error {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5) !important;
}

.phone-modal-info {
  font-size: 0.875rem;
  color: #6b7280;
}

.phone-modal-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  color: #ffffff;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}
.phone-modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.phone-modal-btn-active {
  background-color: #16a34a;
}
.phone-modal-btn-active:hover:not(:disabled) {
  background-color: #15803d;
}
.phone-modal-btn-disabled {
  background-color: #9ca3af;
}

.phone-modal-footer {
  text-align: center;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 1rem;
}

.phone-modal-error {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #dc2626;
}

/* Dark mode */
.phone-modal-dark .phone-modal-backdrop {
  background-color: rgba(0, 0, 0, 0.8);
}

.phone-modal-dark .phone-modal-content {
  background-color: #2d3e26;
  color: #f5f5f5;
  border: 1px solid #3d4d36;
}

.phone-modal-dark .phone-modal-close {
  color: #9ca3af;
}
.phone-modal-dark .phone-modal-close:hover {
  color: #f5f5f5;
}

.phone-modal-dark .phone-modal-icon {
  background-color: rgba(34, 197, 94, 0.2);
  border: 1px solid #3d4d36;
  color: #8aa37c;
}

.phone-modal-dark .phone-modal-title {
  color: #f5f5f5;
}

.phone-modal-dark .phone-modal-subtitle {
  color: #d0d0d0;
}

.phone-modal-dark .phone-modal-task {
  color: #8aa37c;
}

.phone-modal-dark .phone-modal-label {
  color: #f5f5f5;
}

.phone-modal-dark .phone-modal-input {
  background-color: rgba(26, 26, 26, 0.6);
  border-color: #3d4d36;
  color: #f5f5f5;
}
.phone-modal-dark .phone-modal-input::placeholder {
  color: #6b7280;
}
.phone-modal-dark .phone-modal-input:focus {
  box-shadow: 0 0 0 2px #8aa37c;
}

.phone-modal-dark .phone-modal-info {
  color: #d0d0d0;
}

.phone-modal-dark .phone-modal-btn-active {
  background-color: #8aa37c;
}
.phone-modal-dark .phone-modal-btn-active:hover:not(:disabled) {
  background-color: #6b8560;
}
.phone-modal-dark .phone-modal-btn-disabled {
  background-color: #4b5563;
}

.phone-modal-dark .phone-modal-footer {
  color: rgba(208, 208, 208, 0.8);
}

.phone-modal-dark .phone-modal-error {
  color: #f87171;
}
</style>
