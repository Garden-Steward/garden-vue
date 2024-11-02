
<script setup>
import { ref, onMounted, computed } from 'vue';

// compiler macro
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  on: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    default: undefined,
  },
})
const emit = defineEmits(['update:modelValue'])

// random
const randomId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15)

// state
const id = ref(props.id || randomId())
const input = ref()

// funcs
const checked = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const onInputChange = (e) => {
  const target = e.target
  checked.value = target.checked
}

// lifecycle
onMounted(() => {
  if (props.on) {
    checked.value = true
    emit('update:modelValue', true)
    if (input.value) input.value.checked = true
  }
})
</script>

<template>
  <label :for="id" class="flex cursor-pointer">
    <label
      :for="id"
      class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in"
    >
      <input
        :id="id"
        ref="input"
        type="checkbox"
        class="switch-checkbox absolute block w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 appearance-none cursor-pointer"
        :checked="checked"
        @change="onInputChange"
      />
      <label
        :for="id"
        class="switch-label block overflow-hidden h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer border border-gray-300 dark:border-gray-500"
      />
    </label>
    <slot />
  </label>
</template>

<style>
.switch-checkbox:checked {
  right: 0;
}
.switch-checkbox:checked + .switch-label {
  @apply bg-custom-green;
}
</style>
