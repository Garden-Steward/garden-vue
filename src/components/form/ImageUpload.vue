<script setup>
import { ref, computed } from 'vue'
import { useEventStore, useAlertStore } from '@/stores'
import { useImageCompression } from '@/composables/useImageCompression'

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
const alertStore = useAlertStore()
const { compressImageWithDefaults, createCompressionStatus } = useImageCompression()
const fileInput = ref(null)
const dragActive = ref(false)
const isUploading = ref(false)
const isCompressing = ref(false)
const compressionStatus = ref(null)
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
    // Step 1: Compress image
    isCompressing.value = true
    compressionStatus.value = {
      message: 'Compressing image...',
      originalSize: file.size
    }
    
    const compressionResult = await compressImageWithDefaults(file, (progress) => {
      compressionStatus.value = {
        ...compressionStatus.value,
        progress: Math.round(progress)
      }
    })
    
    isCompressing.value = false
    
    // Show compression feedback
    compressionStatus.value = createCompressionStatus(compressionResult)
    
    if (compressionResult.error) {
      console.warn('Compression failed, uploading original:', compressionResult.error)
    }
    
    // Step 2: Upload compressed image
    isUploading.value = true
    compressionStatus.value = {
      ...compressionStatus.value,
      message: 'Uploading...'
    }
    
    const formData = new FormData()
    formData.append('files', compressionResult.file)
    
    let response
    if (props.uploadFn) {
      // Use custom upload function if provided
      response = await props.uploadFn(formData)
    } else {
      // Use default eventStore upload
      response = await eventStore.uploadImage(formData, props.eventId)
    }
    
    // Clear compression status after a brief delay to show success
    setTimeout(() => {
      compressionStatus.value = null
    }, 2000)
    
    // Emit the full image object instead of just the URL
    emit('update:modelValue', {
      id: response.id,
      url: response.url
    })
  } catch (error) {
    console.error('Upload failed:', error)
    alertStore.error('Failed to upload image. Please try again.')
    compressionStatus.value = null
  } finally {
    isUploading.value = false
    isCompressing.value = false
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
    
    <!-- Compression Status -->
    <div v-if="isCompressing || compressionStatus" class="space-y-2">
      <div v-if="isCompressing" class="text-gray-600">
        <div class="flex items-center justify-center gap-2">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
          <span>{{ compressionStatus?.message || 'Compressing image...' }}</span>
        </div>
        <div v-if="compressionStatus?.progress !== undefined" class="mt-2">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              :style="{ width: compressionStatus.progress + '%' }"
            ></div>
          </div>
          <div class="text-xs text-gray-500 mt-1">{{ compressionStatus.progress }}%</div>
        </div>
      </div>
      <div v-else-if="compressionStatus && !isUploading" class="text-sm">
        <div 
          class="px-3 py-2 rounded"
          :class="compressionStatus.error 
            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' 
            : 'bg-green-50 text-green-800 border border-green-200'"
        >
          <div class="font-medium">{{ compressionStatus.message }}</div>
        </div>
      </div>
    </div>
    
    <!-- Upload Status -->
    <div v-if="isUploading && !isCompressing" class="text-gray-600">
      <div class="flex items-center justify-center gap-2">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
        <span>Uploading...</span>
      </div>
    </div>
    
    <!-- Image Preview -->
    <div v-else-if="getImageUrl && !isCompressing && !isUploading" class="space-y-2">
      <img :src="getImageUrl" alt="Uploaded image" class="max-h-40 mx-auto" />
      <div class="text-sm text-gray-600">Click or drag to replace image</div>
    </div>
    
    <!-- Placeholder -->
    <div v-else-if="!isCompressing && !isUploading && !compressionStatus" class="text-gray-600">
      {{ props.placeholder }}
    </div>
  </div>
</template>