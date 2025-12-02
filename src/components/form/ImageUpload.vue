<script setup>
import { ref, computed } from 'vue'
import { useEventStore } from '@/stores'

const emit = defineEmits(['update:modelValue'])
const props = defineProps({
  modelValue: {
    type: [String, Object],
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Click or drag to upload image',
  },
  eventId: {
    type: Number,
    default: null,
  },
  uploadFn: {
    type: Function,
    default: null,
  },
})

const eventStore = useEventStore()
const fileInput = ref(null)
const dragActive = ref(false)
const isUploading = ref(false)
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

const getImageUrl = computed(() => {
  if (!props.modelValue) return ''
  const url = typeof props.modelValue === 'string' 
    ? props.modelValue 
    : props.modelValue.url || props.modelValue?.data?.attributes?.url || ''
  return normalizeImageUrl(url)
})

const handleDrag = (e) => {
  e.preventDefault()
  e.stopPropagation()
  if (e.type === "dragenter" || e.type === "dragover") {
    dragActive.value = true
  } else if (e.type === "dragleave") {
    dragActive.value = false
  }
}

const handleDrop = async (e) => {
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = false
  
  const files = e.dataTransfer.files
  if (files?.[0]) {
    await uploadFile(files[0])
  }
}

const handleChange = async (e) => {
  const files = e.target.files
  if (files?.[0]) {
    await uploadFile(files[0])
  }
}

const uploadFile = async (file) => {
  try {
    isUploading.value = true
    const formData = new FormData()
    formData.append('files', file)
    
    let response
    if (props.uploadFn) {
      // Use custom upload function if provided
      response = await props.uploadFn(formData)
    } else {
      // Use default eventStore upload
      response = await eventStore.uploadImage(formData, props.eventId)
    }
    
    // Emit the full image object instead of just the URL
    emit('update:modelValue', {
      id: response.id,
      url: response.url
    })
  } catch (error) {
    console.error('Upload failed:', error)
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <div
    class="image-upload-container border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4"
    :class="{ 'border-green-500 bg-green-50': dragActive }"
    @dragenter="handleDrag"
    @dragleave="handleDrag"
    @dragover="handleDrag"
    @drop="handleDrop"
    @click="fileInput.click()"
  >
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="image/*"
      @change="handleChange"
    />
    
    <div v-if="isUploading" class="text-gray-600">
      Uploading...
    </div>
    <div v-else-if="getImageUrl" class="space-y-2">
      <img :src="getImageUrl" alt="Uploaded image" class="max-h-40 mx-auto" />
      <div class="text-sm text-gray-600">Click or drag to replace image</div>
    </div>
    <div v-else class="text-gray-600">
      {{ props.placeholder }}
    </div>
  </div>
</template>