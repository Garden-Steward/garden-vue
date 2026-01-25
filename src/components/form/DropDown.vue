<script setup>
import { computed, reactive, useSlots } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  options: {
    type: Array,
    required: true,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'Select an option',
  },
  size: {
    type: String,
    default: 'md',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['update:modelValue'])
const slots = useSlots()

// styles
const paddingStyles = reactive({
  xs: 'px-1 py-0.5',
  sm: 'px-2 py-1.5',
  md: 'px-3 py-2',
  lg: 'px-5 py-3',
})

const fontSizeStyles = reactive({
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
})

// computed
const modelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const havePreEl = computed(() =>
  typeof slots.prefix !== 'undefined' ||
  typeof slots['prefix-disabled'] !== 'undefined'
)

const haveSuEl = computed(() => 
  typeof slots.suffix !== 'undefined'
)

const selectedBorderStyle = computed(() => 
  'border-gray-900/10 dark:border-green-50/[0.2]'
)

const selectedOnHoverBorderStyle = computed(() => 
  'dark:focus:border-white focus:border-green-900'
)

const selectedPaddingStyle = computed(() => 
  paddingStyles[props.size] || paddingStyles.md
)

const selectedFontSizeStyle = computed(() => 
  fontSizeStyles[props.size] || fontSizeStyles.md
)
</script>

<template>
  <div :class="`dropdown-container relative flex mb-4`">
    <div
      v-if="slots['prefix-disabled']"
      :class="`duration-300 transition-colors flex rounded-l bg-green-100 dark:bg-gray-800 text-gray-500 border ${selectedBorderStyle}`"
    >
      <slot name="prefix-disabled" />
    </div>
    <div
      v-if="slots.prefix"
      :class="`flex rounded-l border ${selectedBorderStyle}`"
    >
      <slot name="prefix" />
    </div>
    <div class="dropdown-wrapper relative flex flex-1">
      <select
        v-model="modelValue"
        :disabled="disabled"
        :class="[
          'duration-300 transition-colors dropdown w-full bg-white dark:!bg-[rgba(26,26,26,0.6)] dark:!text-[#f5f5f5] dark:!border-[#3d4d36] outline-none border appearance-none',
          havePreEl ? '' : 'rounded-l',
          haveSuEl ? '' : 'rounded-r',
          selectedBorderStyle,
          selectedOnHoverBorderStyle,
          selectedPaddingStyle,
          selectedFontSizeStyle,
          disabled ? 'bg-green-100 dark:!bg-gray-800 cursor-not-allowed' : ''
        ]"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <option 
          v-for="option in options" 
          :key="option.value" 
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-[#f5f5f5] select-none p-3">
        <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
    <div
      v-if="slots.suffix"
      :class="`flex rounded-r border ${selectedBorderStyle}`"
    >
      <slot name="suffix" />
    </div>
  </div>
</template>

<style scoped>
.dropdown-wrapper {
  position: relative;
}

select {
  -webkit-appearance: none;
  -moz-appearance: none;
  text-indent: 1px;
  text-overflow: '';
}

select option {
  background-color: rgba(26, 26, 26, 0.95);
  color: #f5f5f5;
}
</style>