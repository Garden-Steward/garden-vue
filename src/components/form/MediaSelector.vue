<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useMediaStore, useAlertStore } from '@/stores'
import { fetchWrapper } from '@/helpers'
import { useImageCompression } from '@/composables/useImageCompression'

const emit = defineEmits(['update:modelValue'])
const props = defineProps({
  modelValue: {
    type: [Object, Array],
    default: null
  },
  gardenId: {
    type: Number,
    required: true
  },
  multiple: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: 'Select media'
  },
  dark: {
    type: Boolean,
    default: false
  }
})

const mediaStore = useMediaStore()
const alertStore = useAlertStore()
const { compressImageWithDefaults, createCompressionStatus } = useImageCompression()
const activeTab = ref('upload') // 'upload' (default) or 'existing'
const fileInput = ref(null)
const cameraInput = ref(null)
const dragActive = ref(false)
const isUploading = ref(false)
const isCompressing = ref(false)
const compressionStatus = ref(null)
const baseUrl = `${import.meta.env.VITE_API_URL}`

// Pagination for hero images (single selection)
const itemsPerPage = 4
const visibleItemsCount = ref(itemsPerPage)

// Normalize selected media for comparison
const selectedMedia = computed(() => {
  if (!props.modelValue) return props.multiple ? [] : null
  
  if (props.multiple) {
    // Handle array format
    if (!Array.isArray(props.modelValue)) return []
    return props.modelValue.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item.id || item.data?.id || item
      }
      return item
    })
  } else {
    // Handle single object format
    if (typeof props.modelValue === 'object' && props.modelValue !== null) {
      return props.modelValue.id || props.modelValue.data?.id || props.modelValue
    }
    return props.modelValue
  }
})

// Get displayed media with pagination for hero images
const displayedMedia = computed(() => {
  const allMedia = mediaStore.mediaLibrary
  
  // For hero images (single selection), apply pagination and sort by latest first
  if (!props.multiple) {
    // Sort by createdAt descending (latest first), fallback to id if createdAt not available
    const sorted = [...allMedia].sort((a, b) => {
      const aDate = a?.attributes?.createdAt || a?.data?.attributes?.createdAt || a?.createdAt || a?.id || 0
      const bDate = b?.attributes?.createdAt || b?.data?.attributes?.createdAt || b?.createdAt || b?.id || 0
      return new Date(bDate) - new Date(aDate)
    })
    
    // Return only visible items
    return sorted.slice(0, visibleItemsCount.value)
  }
  
  // For multiple selection (gallery), show all
  return allMedia
})

// Check if there are more items to load (for hero images)
const hasMoreItems = computed(() => {
  if (props.multiple) return false
  return mediaStore.mediaLibrary.length > visibleItemsCount.value
})

// Load more items
const loadMore = () => {
  visibleItemsCount.value += itemsPerPage
}

// Check if a media item is selected
const isSelected = (mediaItem) => {
  // Handle Strapi format: could be { id, attributes: {...} } or { data: { id, attributes: {...} } }
  const mediaId = mediaItem.id || mediaItem.data?.id || mediaItem.attributes?.id
  if (!mediaId) return false
  
  if (props.multiple) {
    return selectedMedia.value.some(selectedId => {
      if (typeof selectedId === 'object' && selectedId !== null) {
        return selectedId.id === mediaId || selectedId.data?.id === mediaId
      }
      return selectedId === mediaId
    })
  } else {
    if (typeof selectedMedia.value === 'object' && selectedMedia.value !== null) {
      return selectedMedia.value.id === mediaId || selectedMedia.value.data?.id === mediaId
    }
    return selectedMedia.value === mediaId
  }
}

// Handle media selection
const selectMedia = (mediaItem) => {
  // Handle Strapi format
  const mediaId = mediaItem.id || mediaItem.data?.id || mediaItem.attributes?.id
  const mediaData = {
    id: mediaId,
    url: getImageUrl(mediaItem)
  }

  if (props.multiple) {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const index = current.findIndex(item => {
      const itemId = typeof item === 'object' ? (item.id || item.data?.id) : item
      return itemId === mediaId
    })

    if (index >= 0) {
      // Deselect
      current.splice(index, 1)
    } else {
      // Select
      current.push(mediaData)
    }
    emit('update:modelValue', current)
  } else {
    // Single selection - toggle
    if (selectedMedia.value === mediaId) {
      emit('update:modelValue', null)
    } else {
      emit('update:modelValue', mediaData)
    }
  }
}

// Helper to normalize image URL
const normalizeImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  if (url.startsWith('/') && import.meta.env.VITE_API_URL === 'http://localhost:1337') {
    return `${baseUrl}${url}`
  }
  return url
}

// Get thumbnail URL from media item (prioritizes thumbnail format for grid display)
const getThumbnailUrl = (mediaItem) => {
  if (!mediaItem) return ''
  
  // Handle Strapi format - prioritize thumbnail format
  const attrs = mediaItem.data?.attributes || mediaItem.attributes || mediaItem
  
  // First try thumbnail format (best for grid display)
  if (attrs.formats?.thumbnail?.url) {
    return normalizeImageUrl(attrs.formats.thumbnail.url)
  }
  if (mediaItem.formats?.thumbnail?.url) {
    return normalizeImageUrl(mediaItem.formats.thumbnail.url)
  }
  
  // Fallback to small format
  if (attrs.formats?.small?.url) {
    return normalizeImageUrl(attrs.formats.small.url)
  }
  if (mediaItem.formats?.small?.url) {
    return normalizeImageUrl(mediaItem.formats.small.url)
  }
  
  // Fallback to medium format
  if (attrs.formats?.medium?.url) {
    return normalizeImageUrl(attrs.formats.medium.url)
  }
  if (mediaItem.formats?.medium?.url) {
    return normalizeImageUrl(mediaItem.formats.medium.url)
  }
  
  // Fallback to main URL
  if (attrs.url) {
    return normalizeImageUrl(attrs.url)
  }
  if (mediaItem.url) {
    return normalizeImageUrl(mediaItem.url)
  }
  
  return ''
}

// Get full image URL from media item (for saving/selection)
const getImageUrl = (mediaItem) => {
  if (!mediaItem) return ''
  
  // Handle Strapi format - prefer full-size URL
  const attrs = mediaItem.data?.attributes || mediaItem.attributes || mediaItem
  
  // Try main URL first (full size)
  if (attrs.url) {
    return normalizeImageUrl(attrs.url)
  }
  if (mediaItem.url) {
    return normalizeImageUrl(mediaItem.url)
  }
  
  // Fallback to large format
  if (attrs.formats?.large?.url) {
    return normalizeImageUrl(attrs.formats.large.url)
  }
  if (mediaItem.formats?.large?.url) {
    return normalizeImageUrl(mediaItem.formats.large.url)
  }
  
  // Fallback to medium format
  if (attrs.formats?.medium?.url) {
    return normalizeImageUrl(attrs.formats.medium.url)
  }
  if (mediaItem.formats?.medium?.url) {
    return normalizeImageUrl(mediaItem.formats.medium.url)
  }
  
  // Fallback to small format
  if (attrs.formats?.small?.url) {
    return normalizeImageUrl(attrs.formats.small.url)
  }
  if (mediaItem.formats?.small?.url) {
    return normalizeImageUrl(mediaItem.formats.small.url)
  }
  
  // Last resort: thumbnail
  if (attrs.formats?.thumbnail?.url) {
    return normalizeImageUrl(attrs.formats.thumbnail.url)
  }
  if (mediaItem.formats?.thumbnail?.url) {
    return normalizeImageUrl(mediaItem.formats.thumbnail.url)
  }
  
  return ''
}

// Get media name/title
const getMediaName = (mediaItem) => {
  if (!mediaItem) return 'Untitled'
  
  // Handle Strapi format
  const attrs = mediaItem.data?.attributes || mediaItem.attributes || mediaItem
  
  return attrs.name || 
         attrs.filename || 
         attrs.title ||
         attrs.alternativeText ||
         mediaItem.name ||
         mediaItem.filename ||
         'Untitled'
}

// Upload functionality
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
  // Reset inputs
  e.target.value = ''
}

const takePicture = () => {
  if (cameraInput.value) {
    cameraInput.value.click()
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
    
    // Step 2: Upload compressed image
    isUploading.value = true
    compressionStatus.value = {
      ...compressionStatus.value,
      message: 'Uploading...'
    }
    
    const formData = new FormData()
    formData.append('files', compressionResult.file)
    
    // Upload to media endpoint
    const response = await fetchWrapper.post(`${import.meta.env.VITE_API_URL}/api/upload`, formData)
    const uploadedFile = Array.isArray(response) ? response[0] : response
    
    // Refresh media library to include new upload
    await mediaStore.fetchGardenMedia(props.gardenId)
    
    // Select the newly uploaded media
    const newMedia = {
      id: uploadedFile.id,
      url: uploadedFile.url
    }
    
    if (props.multiple) {
      const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
      current.push(newMedia)
      emit('update:modelValue', current)
    } else {
      emit('update:modelValue', newMedia)
    }
    
    // Clear compression status after a brief delay
    setTimeout(() => {
      compressionStatus.value = null
    }, 2000)
    
    // Switch to existing tab to show the new upload
    activeTab.value = 'existing'
  } catch (error) {
    console.error('Upload failed:', error)
    alertStore.error('Failed to upload image. Please try again.')
    compressionStatus.value = null
  } finally {
    isUploading.value = false
    isCompressing.value = false
  }
}

// Fetch media on mount and when gardenId changes
onMounted(async () => {
  if (props.gardenId) {
    await mediaStore.fetchGardenMedia(props.gardenId)
    visibleItemsCount.value = itemsPerPage
  }
})

watch(() => props.gardenId, async (newId) => {
  if (newId) {
    await mediaStore.fetchGardenMedia(newId)
    visibleItemsCount.value = itemsPerPage
  }
})

// Reset pagination when switching tabs
watch(activeTab, () => {
  visibleItemsCount.value = itemsPerPage
})
</script>

<template>
  <div class="media-selector" :class="{ 'media-selector-dark': dark }" @click.stop>
    <!-- Tabs -->
    <div
      class="flex border-b mb-4"
      :class="dark ? 'border-[#3d4d36]' : 'border-gray-300'"
      @click.stop
    >
      <button
        type="button"
        @click.stop="activeTab = 'upload'"
        :class="[
          'px-4 py-2 font-medium text-sm transition-colors',
          activeTab === 'upload'
            ? dark ? 'border-b-2 border-[#8aa37c] text-[#8aa37c]' : 'border-b-2 border-green-600 text-green-600'
            : dark ? 'text-[#d0d0d0] hover:text-[#f5f5f5]' : 'text-gray-600 hover:text-gray-900'
        ]"
      >
        Upload New
      </button>
      <button
        type="button"
        @click.stop="activeTab = 'existing'"
        :class="[
          'px-4 py-2 font-medium text-sm transition-colors',
          activeTab === 'existing'
            ? dark ? 'border-b-2 border-[#8aa37c] text-[#8aa37c]' : 'border-b-2 border-green-600 text-green-600'
            : dark ? 'text-[#d0d0d0] hover:text-[#f5f5f5]' : 'text-gray-600 hover:text-gray-900'
        ]"
      >
        Choose Existing
      </button>
    </div>

    <!-- Existing Media Tab -->
    <div v-if="activeTab === 'existing'" class="existing-media-tab">
      <!-- Loading State -->
      <div v-if="mediaStore.loading" class="text-center py-8 text-gray-600">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
        <p>Loading media...</p>
      </div>

      <!-- Media Grid -->
      <div 
        v-else-if="displayedMedia.length > 0" 
        :class="[
          'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4',
          !multiple && 'hero-image-grid'
        ]"
      >
        <div
          v-for="(mediaItem, index) in displayedMedia"
          :key="mediaItem.id || mediaItem.data?.id || `media-${index}`"
          class="relative group cursor-pointer"
          @click.stop="selectMedia(mediaItem)"
        >
          <div
            class="aspect-square rounded-lg overflow-hidden border-2 transition-all"
            :class="{
              'border-green-500 ring-2 ring-green-200': isSelected(mediaItem),
              'border-gray-300 hover:border-green-400': !isSelected(mediaItem)
            }"
          >
            <img
              :src="getThumbnailUrl(mediaItem)"
              :alt="getMediaName(mediaItem)"
              class="w-full h-full object-cover"
            />
            
            <!-- Selection Indicator -->
            <div
              v-if="isSelected(mediaItem)"
              class="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          
          <!-- Media Name on Hover -->
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <p class="text-white text-sm font-medium px-2 text-center">
              {{ multiple ? getMediaName(mediaItem) : 'Select as Hero' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Load More Button (only for hero images) -->
      <div v-if="!multiple && hasMoreItems" class="mt-4 text-center">
        <button
          @click.stop="loadMore"
          type="button"
          class="px-4 py-2 bg-custom-green text-white font-medium rounded shadow-md hover:bg-darker-green transition duration-150 ease-in-out"
        >
          Load More
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="displayedMedia.length === 0" class="text-center py-8 text-gray-500">
        <p>No media available for this garden</p>
      </div>
    </div>

    <!-- Upload Tab -->
    <div v-if="activeTab === 'upload'" class="upload-tab">
      <input
        ref="cameraInput"
        type="file"
        class="hidden"
        accept="image/*"
        capture="environment"
        @change="handleChange"
      />
      <div
        class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4 transition-colors"
        :class="[
          dark
            ? dragActive ? 'border-[#8aa37c] bg-[rgba(138,163,124,0.15)]' : 'border-[#3d4d36] bg-[rgba(26,26,26,0.4)]'
            : dragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
        ]"
        @dragenter.stop="handleDrag"
        @dragleave.stop="handleDrag"
        @dragover.stop="handleDrag"
        @drop.stop="handleDrop"
        @click.stop="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept="image/*"
          @change="handleChange"
        />
        
        <!-- Compression Status -->
        <div v-if="isCompressing || compressionStatus" :class="dark ? 'text-[#d0d0d0]' : 'text-gray-600'" class="space-y-2">
          <div v-if="isCompressing" class="text-center">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
            <p class="text-sm">{{ compressionStatus?.message || 'Compressing image...' }}</p>
            <div v-if="compressionStatus?.progress !== undefined" class="mt-2 max-w-xs mx-auto">
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                  :style="{ width: compressionStatus.progress + '%' }"
                ></div>
              </div>
              <div class="text-xs text-gray-500 mt-1">{{ compressionStatus.progress }}%</div>
            </div>
          </div>
          <div v-else-if="compressionStatus && !isUploading" class="text-sm text-center">
            <div 
              class="px-3 py-2 rounded inline-block"
              :class="[
                compressionStatus.error
                  ? dark ? 'bg-yellow-900/30 text-yellow-200 border border-yellow-700' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  : dark ? 'bg-green-900/30 text-green-200 border border-green-700' : 'bg-green-50 text-green-800 border border-green-200'
              ]"
            >
              <div class="font-medium">{{ compressionStatus.message }}</div>
            </div>
          </div>
        </div>
        
        <!-- Upload Status -->
        <div v-if="isUploading && !isCompressing" :class="dark ? 'text-[#d0d0d0]' : 'text-gray-600'">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
          <p>Uploading...</p>
        </div>
        
        <!-- Placeholder -->
        <div v-else-if="!isCompressing && !isUploading && !compressionStatus" :class="dark ? 'text-[#d0d0d0]' : 'text-gray-600'">
          <svg class="mx-auto h-12 w-12 mb-2" :class="dark ? 'text-[#6b7c5e]' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-sm font-medium">{{ placeholder }}</p>
          <p class="text-xs mt-1" :class="dark ? 'text-[#9ca3af]' : 'text-gray-500'">Click or drag to upload</p>
        </div>
      </div>
      
      <!-- Take Photo Button -->
      <button
        type="button"
        @click.stop="takePicture"
        :disabled="isCompressing || isUploading"
        :class="[
          'inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          dark
            ? 'border border-[#6b8560] bg-[#dcfce7] text-gray-800 hover:bg-[#bbf7d0] focus:ring-[#8aa37c]'
            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-green-500'
        ]"
      >
        <svg class="h-5 w-5 mr-2" :class="dark ? 'text-gray-600' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Take Photo
      </button>
    </div>
  </div>
</template>

<style scoped>
.media-selector {
  width: 100%;
}

/* Hero image grid - limit height on desktop */
@media (min-width: 768px) {
  .hero-image-grid {
    max-height: 400px;
    overflow-y: auto;
    padding-right: 8px;
  }
  
  /* Custom scrollbar styling */
  .hero-image-grid::-webkit-scrollbar {
    width: 8px;
  }
  
  .hero-image-grid::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .hero-image-grid::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  .hero-image-grid::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
}
</style>



