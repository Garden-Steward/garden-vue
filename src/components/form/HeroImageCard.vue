<script setup>
import { ref, computed } from 'vue'
import MediaSelector from './MediaSelector.vue'

const props = defineProps({
  modelValue: {
    type: [Object, Array],
    default: null
  },
  gardenId: {
    type: Number,
    required: false,
    default: null
  },
  label: {
    type: String,
    default: 'Hero Image'
  },
  placeholder: {
    type: String,
    default: 'Select or upload hero image'
  },
  loadingMessage: {
    type: String,
    default: 'Loading garden information...'
  },
  noGardenMessage: {
    type: String,
    default: 'Garden must be set before selecting media'
  }
})

const emit = defineEmits(['update:modelValue'])

const showSelector = ref(false)
const baseUrl = `${import.meta.env.VITE_API_URL}`

// Helper to normalize image URL
const normalizeImageUrl = (url) => {
  if (!url) return ''
  // If it's already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // If it's a relative URL and we're on localhost, prepend base URL
  if (url.startsWith('/') && import.meta.env.VITE_API_URL === 'http://localhost:1337') {
    return `${baseUrl}${url}`
  }
  return url
}

// Get the current hero image URL for display
const currentImageUrl = computed(() => {
  if (!props.modelValue) return null
  
  // Handle Strapi format - prefer medium or large format for display
  const attrs = props.modelValue.data?.attributes || props.modelValue.attributes || props.modelValue
  
  // Try medium format first (good balance)
  if (attrs.formats?.medium?.url) {
    return normalizeImageUrl(attrs.formats.medium.url)
  }
  if (props.modelValue.formats?.medium?.url) {
    return normalizeImageUrl(props.modelValue.formats.medium.url)
  }
  
  // Fallback to large format
  if (attrs.formats?.large?.url) {
    return normalizeImageUrl(attrs.formats.large.url)
  }
  if (props.modelValue.formats?.large?.url) {
    return normalizeImageUrl(props.modelValue.formats.large.url)
  }
  
  // Fallback to small format
  if (attrs.formats?.small?.url) {
    return normalizeImageUrl(attrs.formats.small.url)
  }
  if (props.modelValue.formats?.small?.url) {
    return normalizeImageUrl(props.modelValue.formats.small.url)
  }
  
  // Fallback to main URL
  if (attrs.url) {
    return normalizeImageUrl(attrs.url)
  }
  if (props.modelValue.url) {
    return normalizeImageUrl(props.modelValue.url)
  }
  
  return null
})

// Check if there's a current image
const hasCurrentImage = computed(() => {
  return !!currentImageUrl.value
})

const handleUpdate = (value) => {
  emit('update:modelValue', value)
  // Auto-hide selector after a new image is selected
  if (value) {
    showSelector.value = false
  }
}

const toggleSelector = () => {
  showSelector.value = !showSelector.value
}
</script>

<template>
  <div class="hero-image-card mb-4">
    <label :for="`heroImage-${gardenId || 'default'}`" class="block text-sm font-medium mb-1">
      {{ label }}
    </label>
    
    <!-- Show current image if it exists and selector is not shown -->
    <div v-if="hasCurrentImage && !showSelector" class="current-image-container">
      <div class="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
        <img 
          :src="currentImageUrl" 
          :alt="label"
          class="w-full h-auto max-h-96 object-cover"
        />
      </div>
      <button
        v-if="gardenId"
        @click="toggleSelector"
        type="button"
        class="replace-hero-button"
      >
        Replace Hero Image
      </button>
    </div>
    
    <!-- Show selector when toggled or when no image exists -->
    <div v-if="showSelector || !hasCurrentImage">
      <MediaSelector 
        v-if="gardenId"
        :id="`heroImage-${gardenId}`"
        :model-value="modelValue"
        @update:model-value="handleUpdate"
        :gardenId="gardenId"
        :multiple="false"
        :placeholder="placeholder"
      />
      
      <div v-else class="text-gray-500 text-sm">
        {{ noGardenMessage }}
      </div>
      
      <!-- Show "Keep Current Image" button when selector is shown and image exists -->
      <button
        v-if="hasCurrentImage && showSelector && gardenId"
        @click="toggleSelector"
        type="button"
        class="replace-hero-button"
      >
        Keep Current Image
      </button>
    </div>
  </div>
</template>

<style scoped>
.hero-image-card {
  width: 100%;
}

.current-image-container {
  width: 100%;
}

.current-image-container img {
  display: block;
  width: 100%;
}

.replace-hero-button {
  margin-top: 0.5rem;
  color: #8aa37c;
  text-decoration: underline;
  font-size: 0.875rem;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s ease;
  opacity: 1;
}

.replace-hero-button:hover {
  color: #6b8e5a;
  text-decoration: underline;
  opacity: 0.9;
}

.replace-hero-button:focus {
  outline: 2px solid #8aa37c;
  outline-offset: 2px;
}
</style>
