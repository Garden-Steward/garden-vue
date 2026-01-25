<script>
export default { inheritAttrs: false };
</script>
<script setup>
import { computed, reactive, useSlots, useAttrs } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
  },
  type: {
    type: String,
    default: 'default',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  inputClass: {
    type: String,
    default: '',
  },
})
const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()
const slots = useSlots()

// styles
const paddingStyles = reactive({
  xs: 'px-1 py-0.5',
  sm: 'px-2 py-1.5',
  md: 'px-3 py-2',
  lg: 'px-3 py-3',
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

const inputClasses = computed(() => {
  const base = [
    'duration-300 transition-colors text-input w-full flex-1 bg-white dark:!bg-[rgba(26,26,26,0.6)] dark:!text-[#f5f5f5] dark:!border-[#3d4d36] outline-none border',
    havePreEl.value ? '' : 'rounded-l',
    haveSuEl.value ? '' : 'rounded-r',
    selectedBorderStyle.value,
    selectedOnHoverBorderStyle.value,
    selectedPaddingStyle.value,
    selectedFontSizeStyle.value,
    props.inputClass || '',
    (typeof attrs.class === 'string' && attrs.class) || ''
  ];
  return base.filter(Boolean);
})

const inputAttrs = computed(() => {
  const { class: _c, ...rest } = { ...attrs };
  return rest;
})
</script>

<template>
  <div :class="`text-input-container relative flex mb-1`">
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
    <div class="text-input-wrapper relative flex flex-1">
      <input
        v-model="modelValue"
        v-bind="inputAttrs"
        :disabled="disabled"
        :class="inputClasses"
        :type="type"
        :placeholder="placeholder"
      />
    </div>
    <div
      v-if="slots.suffix"
      :class="`flex rounded-r border ${selectedBorderStyle}`"
    >
      <slot name="suffix" />
    </div>
  </div>
</template>
