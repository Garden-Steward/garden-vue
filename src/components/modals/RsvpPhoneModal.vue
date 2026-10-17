<script setup>
import { ref, watch } from 'vue';
import { useEventStore } from '@/stores';

// Phone-number RSVP for visitors who aren't signed in. The RSVP endpoint signs
// the number up for the garden's SMS list, which is why the copy says so.
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  eventId: { type: [String, Number], default: null },
  gardenTitle: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'rsvped']);

const eventStore = useEventStore();
const phoneNumber = ref('');
const phoneError = ref('');

watch(() => props.modelValue, (open) => { if (open) phoneError.value = ''; });

const close = () => emit('update:modelValue', false);

const submit = async () => {
  phoneError.value = '';
  const digitsOnly = phoneNumber.value.replace(/\D/g, '');
  if (!/^\d{10}$/.test(digitsOnly)) {
    phoneError.value = 'Please enter a valid 10-digit phone number';
    return;
  }
  try {
    await eventStore.rsvpEvent({ phoneNumber: digitsOnly, id: props.eventId });
    emit('rsvped', props.eventId);
    close();
  } catch (error) {
    console.error('Error RSVPing to event:', error);
    phoneError.value = "Couldn't save your RSVP. Try again in a moment.";
  }
};

const formatPhoneNumber = (value) => {
  if (!value) return value;
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};
const handlePhoneInput = (e) => { phoneNumber.value = formatPhoneNumber(e.target.value); };
const handleKeyPress = (e) => { if (e.key === 'Enter') submit(); };
</script>

<template>
  <Teleport to="body">
  <div v-if="modelValue" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="close">
    <div class="bg-white dark:!bg-[#2d3e26] p-6 rounded-lg shadow-lg w-[90%] max-w-md" role="dialog" aria-modal="true" aria-labelledby="rsvp-modal-title">
      <h3 id="rsvp-modal-title" class="md:text-xl mb-4 text-lg text-gray-900 dark:text-[#e8e8e8]">Garden Steward manages events through SMS. You will be asked to sign up for SMS updates for {{ gardenTitle }} as part of RSVPing for this event.</h3>
      <label for="rsvp-phone" class="sr-only">Phone number</label>
      <input
        id="rsvp-phone"
        :value="phoneNumber"
        type="tel"
        placeholder="(123) 456-7890"
        class="w-full p-2 border border-gray-300 dark:border-[#3d4d36] dark:bg-[#1a1a1a] dark:text-[#e8e8e8] rounded mb-2"
        maxlength="14"
        @input="handlePhoneInput"
        @keypress="handleKeyPress"
      >
      <p class="text-sm mb-4 text-gray-600 dark:text-[#b8b8b8]">You can STOP SMS at any point by replying with STOP.</p>
      <p v-if="phoneError" class="text-red-600 text-sm mb-2">{{ phoneError }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="px-4 py-2 bg-gray-200 dark:bg-[#3d4d36] dark:text-[#e8e8e8] rounded" @click="close">Cancel</button>
        <button type="button" class="px-4 py-2 bg-[#064e3b] text-white rounded font-bold" @click="submit">Submit</button>
      </div>
    </div>
  </div>
  </Teleport>
</template>
