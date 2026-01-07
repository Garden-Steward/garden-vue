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
  }
})

const mediaStore = useMediaStore()
const alertStore = useAlertStore()
const { compressImageWithDefaults, createCompressionStatus } = useImageCompression()
const activeTab = ref('existing') // 'existing' or 'upload'
const fileInput = ref(null)
const dragActive = ref(false)
const isUploading = ref(false)
const isCompressing = ref(false)
const compressionStatus = ref(null)
const baseUrl = `${import.meta.env.VITE_API_URL}`

// Pagination for hero images (single selection)
const itemsPerPage = 8
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
  // Reset input
  if (fileInput.value) {
    fileInput.value.value = ''
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
  <div class="media-selector">
    <!-- Tabs -->
    <div class="flex border-b border-gray-300 mb-4">
      <button
        @click="activeTab = 'existing'"
        :class="[
          'px-4 py-2 font-medium text-sm transition-colors',
          activeTab === 'existing'
            ? 'border-b-2 border-green-600 text-green-600'
            : 'text-gray-600 hover:text-gray-900'
        ]"
      >
        Choose Existing
      </button>
      <button
        @click="activeTab = 'upload'"
        :class="[
          'px-4 py-2 font-medium text-sm transition-colors',
          activeTab === 'upload'
            ? 'border-b-2 border-green-600 text-green-600'
            : 'text-gray-600 hover:text-gray-900'
        ]"
      >
        Upload New
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
          @click="selectMedia(mediaItem)"
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
          @click="loadMore"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
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
      <div
        class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4 transition-colors"
        :class="{
          'border-green-500 bg-green-50': dragActive,
          'border-gray-300 bg-gray-50': !dragActive
        }"
        @dragenter="handleDrag"
        @dragleave="handleDrag"
        @dragover="handleDrag"
        @drop="handleDrop"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept="image/*"
          @change="handleChange"
        />
        
        <!-- Compression Status -->
        <div v-if="isCompressing || compressionStatus" class="text-gray-600 space-y-2">
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
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
          <p>Uploading...</p>
        </div>
        
        <!-- Placeholder -->
        <div v-else-if="!isCompressing && !isUploading && !compressionStatus" class="text-gray-600">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-sm font-medium">{{ placeholder }}</p>
          <p class="text-xs text-gray-500 mt-1">Click or drag to upload</p>
        </div>
      </div>
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



