<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useEventStore, useAlertStore, useMediaStore } from '@/stores'
import { useImageCompression } from '@/composables/useImageCompression'

const emit = defineEmits(['update:modelValue'])
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxImages: {
    type: Number,
    default: 8
  },
  eventId: {
    type: Number,
    default: null
  },
  gardenId: {
    type: Number,
    default: null
  }
})

const eventStore = useEventStore()
const alertStore = useAlertStore()
const mediaStore = useMediaStore()
const { compressImageWithDefaults, createCompressionStatus } = useImageCompression()
const activeTab = ref('upload') // 'existing' or 'upload' - start with upload
const fileInput = ref(null)
const dragActive = ref(false)
const uploadingFiles = ref([])
const compressingFiles = ref([])
const draggedIndex = ref(null)
const dragOverIndex = ref(null)
const dragPreviewPosition = ref({ x: 0, y: 0 })
const draggedImageData = ref(null)
const visibleMediaCount = ref(4)
const visibleGalleryCount = ref(4)

// Normalize images array - handle Strapi format
const images = computed({
  get: () => {
    if (!props.modelValue) return []
    
    // Handle Strapi response format: { data: [...] }
    let imagesArray = props.modelValue
    if (props.modelValue?.data && Array.isArray(props.modelValue.data)) {
      imagesArray = props.modelValue.data
    } else if (!Array.isArray(props.modelValue)) {
      return []
    }
    
    return imagesArray.map(img => {
      // Handle different Strapi response formats
      if (typeof img === 'object' && img !== null) {
        return {
          id: img.id || img.data?.id,
          url: img.url || img.data?.attributes?.url || img.attributes?.url || ''
        }
      }
      return { id: null, url: img }
    }).filter(img => img.url)
  },
  set: (value) => {
    emit('update:modelValue', value)
  }
})

const handleDrag = (e) => {
  // Don't activate if dragging from within the gallery thumbnails
  if (e.target.closest('.gallery-thumbnail') || draggedIndex.value !== null) {
    dragActive.value = false
    return
  }
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
  
  const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
  if (files.length > 0) {
    await uploadFiles(files)
  }
}

const handleChange = async (e) => {
  const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'))
  if (files.length > 0) {
    await uploadFiles(files)
  }
  // Reset input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).' }
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit.' }
  }
  
  return { valid: true }
}

const uploadFiles = async (files) => {
  const remainingSlots = props.maxImages - images.value.length
  if (remainingSlots <= 0) {
    alert(`Maximum of ${props.maxImages} images allowed.`)
    return
  }
  
  const filesToUpload = files.slice(0, remainingSlots)
  if (files.length > remainingSlots) {
    alert(`Only ${remainingSlots} more image(s) can be uploaded.`)
  }
  
  // Validate all files first
  for (const file of filesToUpload) {
    const validation = validateFile(file)
    if (!validation.valid) {
      alert(`${file.name}: ${validation.error}`)
      return
    }
  }
  
  // Upload files in parallel
  const uploadPromises = filesToUpload.map(file => uploadFile(file))
  await Promise.all(uploadPromises)
}

const uploadFile = async (file) => {
  const uploadId = Date.now() + Math.random()
  const compressId = Date.now() + Math.random()
  
  try {
    // Step 1: Compress image
    compressingFiles.value.push({ 
      id: compressId, 
      name: file.name, 
      progress: 0,
      status: 'compressing'
    })
    
    const compressionResult = await compressImageWithDefaults(file, (progress) => {
      const compressFile = compressingFiles.value.find(f => f.id === compressId)
      if (compressFile) {
        compressFile.progress = Math.round(progress)
      }
    })
    
    // Update compression status
    const compressFile = compressingFiles.value.find(f => f.id === compressId)
    if (compressFile) {
      const status = createCompressionStatus(compressionResult)
      if (compressionResult.skipped) {
        compressFile.status = 'skipped'
        compressFile.message = status.message
      } else if (compressionResult.error) {
        compressFile.status = 'error'
        compressFile.message = status.message
      } else {
        compressFile.status = 'complete'
        // Extract just the size comparison part (before the percentage) for cleaner display
        compressFile.message = status.message.split(' (')[0]
        compressFile.savings = status.savings
      }
    }
    
    // Step 2: Upload compressed image
    uploadingFiles.value.push({ 
      id: uploadId, 
      name: file.name, 
      progress: 0,
      status: 'uploading',
      compressionInfo: compressFile
    })
    
    const formData = new FormData()
    formData.append('files', compressionResult.file)
    
    // Upload using the event store method
    const response = await eventStore.uploadImage(formData, null) // Don't auto-update event
    
    // Add to images array
    const newImage = {
      id: response.id,
      url: response.url
    }
    
    images.value = [...images.value, newImage]
    
    // Refresh media library if gardenId is provided and switch to existing tab
    if (props.gardenId) {
      await mediaStore.fetchGardenMedia(props.gardenId)
      activeTab.value = 'existing'
    }
  } catch (error) {
    console.error('Upload failed:', error)
    alertStore.error(`Failed to upload ${file.name}. Please try again.`)
  } finally {
    compressingFiles.value = compressingFiles.value.filter(f => f.id !== compressId)
    uploadingFiles.value = uploadingFiles.value.filter(f => f.id !== uploadId)
  }
}

const removeImage = (index) => {
  if (confirm('Are you sure you want to remove this image?')) {
    const newImages = [...images.value]
    newImages.splice(index, 1)
    images.value = newImages
  }
}

// Drag and drop for reordering
const handleDragStart = (e, index) => {
  draggedIndex.value = index
  draggedImageData.value = images.value[index]
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', index.toString())
  e.dataTransfer.setData('application/gallery-item', 'true')
  
  // Hide the default drag preview by using a transparent image
  const transparentImage = new Image()
  transparentImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  e.dataTransfer.setDragImage(transparentImage, 0, 0)
  
  // Add class to indicate dragging
  e.currentTarget.classList.add('dragging')
  
  // Update drag preview position on mouse move (global listener)
  // Use capture phase to ensure we get the event even if it's stopped
  document.addEventListener('dragover', updateDragPreview, { capture: true, passive: false })
}

const handleDragOver = (e, index) => {
  // Only handle if we're dragging a gallery item (not external files)
  const isGalleryItem = e.dataTransfer.types.includes('application/gallery-item')
  if (!isGalleryItem || draggedIndex.value === null) return
  
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer.dropEffect = 'move'
  
  // Update drag preview position
  updateDragPreview(e)
  
  if (draggedIndex.value !== index) {
    dragOverIndex.value = index
  }
}

const handleDragEnter = (e, index) => {
  // Only handle if we're dragging a gallery item (not external files)
  const isGalleryItem = e.dataTransfer.types.includes('application/gallery-item')
  if (!isGalleryItem || draggedIndex.value === null) return
  
  e.preventDefault()
  e.stopPropagation()
  
  // Update drag preview position
  updateDragPreview(e)
  
  if (draggedIndex.value !== index) {
    dragOverIndex.value = index
  }
}

const handleDragLeave = (e) => {
  // Only clear if we're actually leaving the thumbnail container
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    dragOverIndex.value = null
  }
}

const handleDropReorder = (e, dropIndex) => {
  // Only handle gallery item drops, not file drops
  const isGalleryItem = e.dataTransfer.types.includes('application/gallery-item')
  if (!isGalleryItem || draggedIndex.value === null) {
    draggedIndex.value = null
    dragOverIndex.value = null
    return
  }
  
  e.preventDefault()
  e.stopPropagation()
  
  if (draggedIndex.value === dropIndex) {
    draggedIndex.value = null
    dragOverIndex.value = null
    return
  }
  
  const newImages = [...images.value]
  const draggedImage = newImages[draggedIndex.value]
  
  // Remove from old position and insert at new position
  newImages.splice(draggedIndex.value, 1)
  
  // Adjust drop index if dragging from before the drop position
  const adjustedDropIndex = draggedIndex.value < dropIndex ? dropIndex - 1 : dropIndex
  newImages.splice(adjustedDropIndex, 0, draggedImage)
  
  // Create a new array reference to ensure Vue reactivity detects the change
  // This will trigger the setter which emits update:modelValue
  images.value = [...newImages]
  
  draggedIndex.value = null
  dragOverIndex.value = null
}

const handleDragEnd = (e) => {
  // Remove dragging class from all elements
  if (e.currentTarget) {
    e.currentTarget.classList.remove('dragging')
  }
  
  // Clean up drag preview
  document.removeEventListener('dragover', updateDragPreview, { capture: true })
  dragPreviewPosition.value = { x: 0, y: 0 }
  draggedImageData.value = null
  
  draggedIndex.value = null
  dragOverIndex.value = null
}

const updateDragPreview = (e) => {
  if (draggedIndex.value !== null) {
    // Position follows cursor (will be centered via transform)
    dragPreviewPosition.value = { 
      x: e.clientX,
      y: e.clientY
    }
  }
}

const getImageUrl = (image) => {
  if (!image) return ''
  return image.url || ''
}

const canAddMore = computed(() => {
  return images.value.length < props.maxImages
})

// Get displayed media from media store
const displayedMedia = computed(() => {
  return mediaStore.mediaLibrary
})

// Paginated displayed media (show first 4, then load more)
const visibleMedia = computed(() => {
  return displayedMedia.value.slice(0, visibleMediaCount.value)
})

const hasMoreMedia = computed(() => {
  return displayedMedia.value.length > visibleMediaCount.value
})

const loadMoreMedia = () => {
  visibleMediaCount.value += 4
}

// Paginated gallery images (show first 4, then load more)
const visibleGalleryImages = computed(() => {
  return images.value.slice(0, visibleGalleryCount.value)
})

const hasMoreGalleryImages = computed(() => {
  return images.value.length > visibleGalleryCount.value
})

const loadMoreGalleryImages = () => {
  visibleGalleryCount.value += 4
}

// Reset visible count if images are removed below threshold
watch(() => images.value.length, (newLength) => {
  if (newLength < visibleGalleryCount.value) {
    visibleGalleryCount.value = Math.max(4, newLength)
  }
})

// Check if a media item is already in the gallery
const isInGallery = (mediaItem) => {
  const mediaId = mediaItem.id || mediaItem.data?.id || mediaItem.attributes?.id
  if (!mediaId) return false
  
  return images.value.some(img => {
    const imgId = img?.id || img?.data?.id
    return imgId === mediaId
  })
}

// Select media from gallery
const selectMedia = (mediaItem) => {
  if (!canAddMore.value) {
    alert(`Maximum of ${props.maxImages} images allowed.`)
    return
  }
  
  const mediaId = mediaItem.id || mediaItem.data?.id || mediaItem.attributes?.id
  const mediaUrl = getMediaImageUrl(mediaItem)
  
  if (!mediaId || !mediaUrl) return
  
  // Check if already in gallery
  if (isInGallery(mediaItem)) {
    return
  }
  
  // Add to gallery
  const newImage = {
    id: mediaId,
    url: mediaUrl
  }
  
  images.value = [...images.value, newImage]
}

// Get image URL from media item
const getMediaImageUrl = (mediaItem) => {
  if (!mediaItem) return ''
  
  // Handle Strapi format
  const attrs = mediaItem.data?.attributes || mediaItem.attributes || mediaItem
  
  // Try main URL first
  if (attrs.url) {
    return attrs.url.startsWith('http') ? attrs.url : `${import.meta.env.VITE_API_URL}${attrs.url}`
  }
  if (mediaItem.url) {
    return mediaItem.url.startsWith('http') ? mediaItem.url : `${import.meta.env.VITE_API_URL}${mediaItem.url}`
  }
  
  // Fallback to formats
  if (attrs.formats?.large?.url) {
    const url = attrs.formats.large.url
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`
  }
  if (attrs.formats?.medium?.url) {
    const url = attrs.formats.medium.url
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`
  }
  
  return ''
}

// Get thumbnail URL from media item
const getMediaThumbnailUrl = (mediaItem) => {
  if (!mediaItem) return ''
  
  const attrs = mediaItem.data?.attributes || mediaItem.attributes || mediaItem
  
  // Try thumbnail format first
  if (attrs.formats?.thumbnail?.url) {
    const url = attrs.formats.thumbnail.url
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`
  }
  if (mediaItem.formats?.thumbnail?.url) {
    const url = mediaItem.formats.thumbnail.url
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`
  }
  
  // Fallback to small format
  if (attrs.formats?.small?.url) {
    const url = attrs.formats.small.url
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`
  }
  
  // Fallback to main URL
  return getMediaImageUrl(mediaItem)
}

// Fetch media on mount and when gardenId changes
onMounted(async () => {
  if (props.gardenId) {
    await mediaStore.fetchGardenMedia(props.gardenId)
  }
})

watch(() => props.gardenId, async (newId) => {
  if (newId) {
    await mediaStore.fetchGardenMedia(newId)
  }
})
</script>

<template>
  <div class="image-gallery-upload">
    <!-- Tabs -->
    <div class="flex border-b border-gray-300 mb-4">
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
      <button
        v-if="gardenId"
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
    </div>

    <!-- Choose Existing Tab -->
    <div v-if="activeTab === 'existing' && gardenId" class="existing-media-tab mb-4">
      <!-- Loading State -->
      <div v-if="mediaStore.loading" class="text-center py-8 text-gray-600">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
        <p>Loading media...</p>
      </div>

      <!-- Media Grid -->
      <div v-else-if="displayedMedia.length > 0">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div
            v-for="(mediaItem, index) in visibleMedia"
            :key="mediaItem.id || mediaItem.data?.id || `media-${index}`"
            class="relative group cursor-pointer"
            @click="selectMedia(mediaItem)"
          >
            <div
              class="aspect-square rounded-lg overflow-hidden border-2 transition-all"
              :class="{
                'border-green-500 ring-2 ring-green-200': isInGallery(mediaItem),
                'border-gray-300 hover:border-green-400': !isInGallery(mediaItem),
                'opacity-50': isInGallery(mediaItem) || !canAddMore
              }"
            >
              <img
                :src="getMediaThumbnailUrl(mediaItem)"
                :alt="mediaItem.attributes?.name || mediaItem.data?.attributes?.name || 'Media'"
                class="w-full h-full object-cover"
              />
              
              <!-- Selection Indicator -->
              <div
                v-if="isInGallery(mediaItem)"
                class="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div v-if="hasMoreMedia" class="mt-4 text-center">
          <button
            @click="loadMoreMedia"
            type="button"
            class="px-4 py-2 bg-custom-green text-white font-medium rounded shadow-md hover:bg-darker-green transition duration-150 ease-in-out"
          >
            Load More
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-8 text-gray-500">
        <p>No media available for this garden</p>
      </div>
    </div>

    <!-- Upload New Tab -->
    <div v-if="activeTab === 'upload'">
    <!-- Upload Zone -->
    <div
      v-if="canAddMore"
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
        multiple
        @change="handleChange"
      />
      
      <div class="text-gray-600">
        <i class="fas fa-cloud-upload-alt text-4xl mb-2"></i>
        <p class="text-sm font-medium">Drag photos here or click to browse</p>
        <p class="text-xs text-gray-500 mt-1">
          {{ images.length }}/{{ maxImages }} photos uploaded
        </p>
      </div>
    </div>
    
    <!-- Compression Progress -->
    <div v-if="compressingFiles.length > 0" class="mb-4">
      <div
        v-for="compressing in compressingFiles"
        :key="compressing.id"
        class="bg-purple-50 border border-purple-200 rounded p-3 mb-2"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm text-purple-800 font-medium">{{ compressing.name }}</span>
          <span class="text-xs text-purple-600">
            {{ compressing.status === 'compressing' ? 'Compressing...' : compressing.message }}
          </span>
        </div>
        <div v-if="compressing.status === 'compressing'" class="w-full bg-purple-200 rounded-full h-2">
          <div 
            class="bg-purple-600 h-2 rounded-full transition-all duration-300" 
            :style="{ width: compressing.progress + '%' }"
          ></div>
        </div>
        <div v-else-if="compressing.status === 'complete' && compressing.savings" class="text-xs text-purple-600 mt-1">
          ✓ Saved {{ compressing.savings }}% space
        </div>
      </div>
    </div>
    
    <!-- Upload Progress -->
    <div v-if="uploadingFiles.length > 0" class="mb-4">
      <div
        v-for="uploading in uploadingFiles"
        :key="uploading.id"
        class="bg-blue-50 border border-blue-200 rounded p-3 mb-2"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm text-blue-800 font-medium">{{ uploading.name }}</span>
          <span class="text-xs text-blue-600">Uploading...</span>
        </div>
        <div v-if="uploading.compressionInfo && uploading.compressionInfo.status === 'complete'" class="text-xs text-blue-600 mb-1">
          {{ uploading.compressionInfo.message }}
        </div>
        <div class="w-full bg-blue-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full animate-pulse" style="width: 60%"></div>
        </div>
      </div>
    </div>
    
    <!-- Gallery Grid -->
    <div v-if="images.length > 0" class="mb-4">
      <p class="text-sm font-semibold mb-2 dark:text-white">Current Gallery ({{ images.length }} photo{{ images.length !== 1 ? 's' : '' }})</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div
          v-for="(image, index) in visibleGalleryImages"
          :key="image?.id ? `image-${image.id}` : `image-temp-${index}`"
          class="relative group aspect-square gallery-thumbnail cursor-move"
          :class="{ 
            'opacity-50 scale-95': draggedIndex === index,
            'ring-4 ring-blue-500 ring-offset-2': dragOverIndex === index && draggedIndex !== null && draggedIndex !== index,
            'slide-right': dragOverIndex === index && draggedIndex !== null && draggedIndex !== index
          }"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @dragenter="handleDragEnter($event, index)"
          @dragover="handleDragOver($event, index)"
          @dragleave="handleDragLeave($event)"
          @drop="handleDropReorder($event, index)"
          @dragend="handleDragEnd"
        >
          <img
            v-if="image && getImageUrl(image)"
            :src="getImageUrl(image)"
            :alt="`Gallery image ${index + 1}`"
            class="w-full h-full object-cover rounded-lg border-2 transition-all pointer-events-none"
            :class="{
              'border-blue-500': dragOverIndex === index && draggedIndex !== null && draggedIndex !== index,
              'border-gray-300': dragOverIndex !== index || draggedIndex === index
            }"
            draggable="false"
          />
          
          <!-- Delete Button -->
          <button
            @click.stop="removeImage(index)"
            class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
            type="button"
            title="Remove image"
            @mousedown.stop
          >
            <i class="fas fa-times text-xs"></i>
          </button>
          
          <!-- Drag Indicator (visual only, not required for dragging) -->
          <div class="absolute top-2 left-2 bg-black bg-opacity-50 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <i class="fas fa-grip-vertical text-xs"></i>
          </div>
          
          <!-- Reorder Drop Indicator -->
          <div
            v-if="dragOverIndex === index && draggedIndex !== null && draggedIndex !== index"
            class="absolute inset-0 border-4 border-blue-500 rounded-lg bg-blue-200 bg-opacity-30 pointer-events-none"
          ></div>
        </div>
      </div>
      
      <div v-if="hasMoreGalleryImages" class="mt-4 text-center">
        <button
          @click="loadMoreGalleryImages"
          type="button"
          class="px-4 py-2 bg-custom-green text-white font-medium rounded shadow-md hover:bg-darker-green transition duration-150 ease-in-out"
        >
          Load More
        </button>
      </div>
      
      <p class="text-xs text-gray-500 mt-2 dark:text-white/80">
        <i class="fas fa-info-circle"></i> Drag images to reorder. Hover to delete.
      </p>
    </div>
    
    <!-- Empty State -->
    <div v-if="images.length === 0 && uploadingFiles.length === 0 && !dragActive && activeTab === 'upload'" class="text-center text-gray-500 text-sm py-4">
      No photos yet. Add {{ maxImages }} photos to showcase your event.
    </div>
    </div>
    
    <!-- Custom Drag Preview -->
    <Teleport to="body">
      <div
        v-if="draggedIndex !== null && draggedImageData"
        class="drag-preview"
        :style="{
          position: 'fixed',
          left: dragPreviewPosition.x + 'px',
          top: dragPreviewPosition.y + 'px',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'translate(-50%, -50%)'
        }"
      >
        <img
          :src="getImageUrl(draggedImageData)"
          alt="Dragged image"
          class="w-32 h-32 object-cover rounded-lg border-2 border-blue-500 shadow-lg"
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.image-gallery-upload {
  width: 100%;
}

/* Smooth transitions for drag operations */
.gallery-thumbnail {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  user-select: none;
  -webkit-user-drag: element;
}

.gallery-thumbnail:hover:not(.dragging) {
  transform: scale(1.02);
}

.gallery-thumbnail.dragging {
  opacity: 0.5;
}

/* Slide animation for thumbnails when dragging over */
.gallery-thumbnail.slide-right {
  animation: slideRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes slideRight {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(1rem);
  }
}

/* Prevent text selection during drag */
.gallery-thumbnail * {
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
}

.gallery-thumbnail button {
  pointer-events: auto;
}

/* Ensure smooth ring animation */
.ring-4 {
  animation: pulse-ring 0.6s ease-in-out;
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}
</style>

