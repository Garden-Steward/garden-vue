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
    await gardenTaskStore.assignTaskViaSMS(props.task.id, cleanPhone);
    emit('success');
    close();
  } catch (err) {
    error.value = err.message || 'Failed to send assignment request';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Teleport to="#modals">
    <div v-if="show" class="phone-modal-wrapper">
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-70 transition-opacity"
        @click="close"
      ></div>

      <!-- Modal -->
      <div class="fixed inset-0 flex items-center justify-center p-4" @click="close">
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative transform transition-all"
          @click.stop
        >
          <!-- Close button -->
          <button
            type="button"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            @click="close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Header -->
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
              Sign Up for Task
            </h2>
            <p class="text-gray-600 dark:text-gray-300 mt-2">
              Enter your phone number to sign up for <strong class="text-green-600 dark:text-green-400">{{ taskTitle }}</strong>
            </p>
          </div>

          <!-- Form -->
          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                :value="phoneNumber"
                @input="handlePhoneInput"
                placeholder="(555) 555-5555"
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-lg"
                :class="{ 'border-red-500 focus:ring-red-500': error }"
                autocomplete="tel"
              />
              <p v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">
                {{ error }}
              </p>
            </div>

            <p class="text-sm text-gray-500 dark:text-gray-400">
              You'll receive a text message to confirm your task assignment. Standard messaging rates may apply.
            </p>

            <button
              type="submit"
              :disabled="!isValidPhone || isSubmitting"
              class="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :class="{
                'bg-green-600 hover:bg-green-700': isValidPhone && !isSubmitting,
                'bg-gray-400': !isValidPhone || isSubmitting
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
          <p class="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
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
</style>
