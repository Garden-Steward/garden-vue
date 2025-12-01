<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  gallery: {
    type: [Array, Object],
    default: () => []
  },
  title: {
    type: String,
    default: 'Gallery'
  },
  photoAlbumUrl: {
    type: String,
    default: null
  }
});

// Lightbox state
const showLightbox = ref(false);
const lightboxImageIndex = ref(0);

// Normalize gallery images from various Strapi formats
const getGalleryImages = computed(() => {
  if (!props.gallery) return [];
  
  // Handle Strapi format: { data: [...] } or direct array
  let imagesArray = [];
  if (props.gallery?.data && Array.isArray(props.gallery.data)) {
    imagesArray = props.gallery.data;
  } else if (Array.isArray(props.gallery)) {
    imagesArray = props.gallery;
  } else {
    return [];
  }
  
  return imagesArray.map(img => {
    // Handle different Strapi formats
    if (typeof img === 'object' && img !== null) {
      return {
        id: img.id || img.data?.id,
        url: img.url || img.data?.attributes?.url || img.attributes?.url || ''
      };
    }
    return { id: null, url: img };
  }).filter(img => img.url);
});

const openLightbox = (index) => {
  lightboxImageIndex.value = index;
  showLightbox.value = true;
};

const closeLightbox = () => {
  showLightbox.value = false;
};

const nextImage = () => {
  const images = getGalleryImages.value;
  if (lightboxImageIndex.value < images.length - 1) {
    lightboxImageIndex.value++;
  } else {
    lightboxImageIndex.value = 0;
  }
};

const prevImage = () => {
  const images = getGalleryImages.value;
  if (lightboxImageIndex.value > 0) {
    lightboxImageIndex.value--;
  } else {
    lightboxImageIndex.value = images.length - 1;
  }
};

const handleLightboxKeydown = (e) => {
  if (!showLightbox.value) return;
  
  if (e.key === 'Escape') {
    closeLightbox();
  } else if (e.key === 'ArrowLeft') {
    prevImage();
  } else if (e.key === 'ArrowRight') {
    nextImage();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleLightboxKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleLightboxKeydown);
});
</script>

<template>
  <div v-if="getGalleryImages.length > 0" class="gallery-container">
    <h2 v-if="title" class="gallery-title">{{ title }}</h2>
    <div class="gallery-grid">
      <div
        v-for="(image, index) in getGalleryImages"
        :key="image.id || index"
        class="gallery-item"
        @click="openLightbox(index)"
      >
        <img
          :src="image.url"
          :alt="`Gallery image ${index + 1}`"
          class="gallery-image"
        />
      </div>
    </div>
    <p v-if="photoAlbumUrl" class="gallery-link">
      <a 
        :href="photoAlbumUrl" 
        target="_blank" 
        rel="noopener noreferrer"
        class="external-link"
      >
        View Full Album <i class="fas fa-external-link-alt"></i>
      </a>
    </p>
  </div>

  <!-- Lightbox Modal -->
  <Teleport to="body">
    <div 
      v-if="showLightbox && getGalleryImages.length > 0"
      class="lightbox-backdrop"
      @click="closeLightbox"
    >
      <div class="lightbox-container">
        <button
          @click.stop="closeLightbox"
          class="lightbox-close"
          aria-label="Close"
        >
          <i class="fas fa-times"></i>
        </button>
        
        <button
          v-if="getGalleryImages.length > 1"
          @click.stop="prevImage"
          class="lightbox-nav lightbox-prev"
          aria-label="Previous"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        
        <button
          v-if="getGalleryImages.length > 1"
          @click.stop="nextImage"
          class="lightbox-nav lightbox-next"
          aria-label="Next"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
        
        <img
          :src="getGalleryImages[lightboxImageIndex]?.url"
          :alt="`Gallery image ${lightboxImageIndex + 1}`"
          class="lightbox-image"
          @click.stop
        />
        
        <div 
          v-if="getGalleryImages.length > 1"
          class="lightbox-counter"
        >
          {{ lightboxImageIndex + 1 }} / {{ getGalleryImages.length }}
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gallery-container {
  margin-top: 2rem;
  margin-bottom: 1.5rem;
}

.gallery-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: inherit;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 640px) {
  .gallery-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .gallery-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.gallery-item {
  aspect-ratio: 1;
  cursor: pointer;
  overflow: hidden;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.gallery-item:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.gallery-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gallery-link {
  margin-top: 1rem;
  text-align: center;
}

.external-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #8aa37c;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.external-link:hover {
  color: #6c8a6a;
  text-decoration: underline;
}

/* Lightbox Styles */
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  cursor: pointer;
}

.lightbox-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  padding: 40px;
}

.lightbox-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  color: white;
  font-size: 32px;
  cursor: pointer;
  z-index: 100001;
  padding: 10px;
  transition: color 0.3s ease;
}

.lightbox-close:hover {
  color: #ccc;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: white;
  font-size: 32px;
  cursor: pointer;
  z-index: 100001;
  padding: 20px;
  transition: color 0.3s ease;
}

.lightbox-nav:hover {
  color: #ccc;
}

.lightbox-prev {
  left: 10px;
}

.lightbox-next {
  right: 10px;
}

.lightbox-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  cursor: default;
}

.lightbox-counter {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 20px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .lightbox-container {
    padding: 20px;
  }

  .lightbox-close,
  .lightbox-nav {
    font-size: 24px;
    padding: 10px;
  }
}

@media (max-width: 480px) {
  .gallery-grid {
    grid-template-columns: 1fr;
  }
}
</style>

