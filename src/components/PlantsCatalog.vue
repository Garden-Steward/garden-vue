<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useLocationTrackingStore } from '@/stores';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const props = defineProps({
  garden: {
    type: Object,
    required: true
  }
});

const locationTrackingStore = useLocationTrackingStore();
const { locationTrackings } = storeToRefs(locationTrackingStore);

const selectedLayer = ref('all');
const searchQuery = ref('');

// Fetch plants when garden data is available
const fetchPlants = () => {
  const lat = props.garden?.attributes?.latitude;
  const lng = props.garden?.attributes?.longitude;
  locationTrackingStore.fetchByGarden(lat, lng, 0.5); // 500m radius
};

watch(() => props.garden?.id, (newId) => {
  if (newId) {
    fetchPlants();
  }
}, { immediate: true });

// Filter options based on map_layer enum
const layerOptions = [
  { value: 'all', label: 'All Plants' },
  { value: 'fruit_tree', label: 'Fruit Trees' },
  { value: 'pollinator', label: 'Pollinators' },
  { value: 'garden', label: 'Garden Plants' },
  { value: 'other', label: 'Other' }
];

// Confidence badge colors
const confidenceColors = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-orange-100 text-orange-800',
  unknown: 'bg-gray-100 text-gray-800',
  unverified: 'bg-red-100 text-red-800'
};

// Filtered plants
const filteredPlants = computed(() => {
  if (!Array.isArray(locationTrackings.value)) return [];
  
  return locationTrackings.value.filter(tracking => {
    // Filter by layer
    if (selectedLayer.value !== 'all' && tracking.map_layer !== selectedLayer.value) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      const plantTitle = tracking.plant?.title?.toLowerCase() || '';
      const plantLatin = tracking.plant?.latin?.toLowerCase() || '';
      const label = tracking.label?.toLowerCase() || '';
      return plantTitle.includes(query) || plantLatin.includes(query) || label.includes(query);
    }
    
    return true;
  });
});

// Group plants by type for summary
const plantsSummary = computed(() => {
  if (!Array.isArray(locationTrackings.value)) return {};
  
  const summary = {};
  locationTrackings.value.forEach(tracking => {
    const layer = tracking.map_layer || 'other';
    summary[layer] = (summary[layer] || 0) + 1;
  });
  return summary;
});

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getImageUrl = (tracking) => {
  // Try plant_image first, then location_image
  if (tracking.small_image) return tracking.small_image;
  if (tracking.thumbnail) return tracking.thumbnail;
  if (tracking.location_thumbnail) return tracking.location_thumbnail;
  // Fallback to plant's images if available
  if (tracking.plant?.images?.data?.[0]?.attributes?.formats?.small?.url) {
    return tracking.plant.images.data[0].attributes.formats.small.url;
  }
  return null;
};
</script>

<template>
  <div class="bg-[#2d3e26] rounded-lg shadow-md p-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <h2 class="text-2xl font-light font-serif text-[#f5f5f5]">
        Plants at this Garden
        <span v-if="Array.isArray(locationTrackings)" class="text-lg text-[#d0d0d0] ml-2">
          ({{ locationTrackings.length }})
        </span>
      </h2>
    </div>

    <!-- Summary badges -->
    <div v-if="Object.keys(plantsSummary).length > 0" class="flex flex-wrap gap-2 mb-6">
      <span 
        v-for="(count, layer) in plantsSummary" 
        :key="layer"
        class="px-3 py-1 rounded-full text-sm bg-[rgba(26,26,26,0.6)] text-[#f5f5f5]"
      >
        {{ layer.replace('_', ' ') }}: {{ count }}
      </span>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search plants..."
          class="w-full px-4 py-2 rounded-lg bg-[rgba(26,26,26,0.6)] border border-[#3d4d36]/50 text-[#f5f5f5] placeholder-[#999] focus:outline-none focus:border-[#8aa37c]"
        />
      </div>
      <div>
        <select
          v-model="selectedLayer"
          class="px-4 py-2 rounded-lg bg-[rgba(26,26,26,0.6)] border border-[#3d4d36]/50 text-[#f5f5f5] focus:outline-none focus:border-[#8aa37c]"
        >
          <option v-for="option in layerOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <LoadingSpinner v-if="locationTrackings?.loading" size="sm" :centered="true" />

    <!-- Error State -->
    <div v-else-if="locationTrackings?.error" class="text-red-400 text-center py-8">
      Error loading plants: {{ locationTrackings.error.message || 'Unknown error' }}
    </div>

    <!-- Empty State -->
    <div v-else-if="!filteredPlants.length" class="text-center py-12">
      <div class="text-6xl mb-4">🌱</div>
      <p class="text-[#d0d0d0] text-lg">No plants recorded at this garden yet.</p>
      <p class="text-[#999] text-sm mt-2">Plants are added via the location tracking feature.</p>
    </div>

    <!-- Plants Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="tracking in filteredPlants" 
        :key="tracking.id"
        class="bg-[rgba(26,26,26,0.6)] rounded-lg overflow-hidden border border-[#3d4d36]/50 hover:border-[#8aa37c] transition-colors"
      >
        <!-- Image -->
        <div class="aspect-video bg-[#1a1a1a] relative">
          <img 
            v-if="getImageUrl(tracking)"
            :src="getImageUrl(tracking)" 
            :alt="tracking.plant?.title || tracking.label || 'Plant'"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-4xl">
            🌿
          </div>
          
          <!-- Confidence badge -->
          <span 
            v-if="tracking.confidence"
            :class="[confidenceColors[tracking.confidence] || confidenceColors.unknown, 'absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium']"
          >
            {{ tracking.confidence }}
          </span>
          
          <!-- Map layer badge -->
          <span 
            v-if="tracking.map_layer"
            class="absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium bg-[#344a34] text-white"
          >
            {{ tracking.map_layer.replace('_', ' ') }}
          </span>
        </div>

        <!-- Content -->
        <div class="p-4">
          <h3 class="text-lg font-semibold text-[#f5f5f5] mb-1">
            {{ tracking.plant?.title || tracking.label || 'Unknown Plant' }}
          </h3>
          <p v-if="tracking.plant?.latin" class="text-sm text-[#999] italic mb-2">
            {{ tracking.plant.latin }}
          </p>
          
          <!-- Plant type -->
          <p v-if="tracking.plant?.type" class="text-sm text-[#d0d0d0] mb-2">
            Type: {{ tracking.plant.type }}
          </p>

          <!-- Planted date -->
          <div v-if="tracking.planted_date" class="flex items-center gap-2 text-sm text-[#d0d0d0] mb-2">
            <span>🗓️</span>
            <span>Planted: {{ formatDate(tracking.planted_date) }}</span>
          </div>

          <!-- Verified date -->
          <div v-if="tracking.last_verified" class="flex items-center gap-2 text-sm text-[#d0d0d0] mb-2">
            <span>✓</span>
            <span>Verified: {{ formatDate(tracking.last_verified) }}</span>
          </div>

          <!-- Added by -->
          <div v-if="tracking.user" class="text-sm text-[#999]">
            Added by: {{ tracking.user }}
          </div>

          <!-- Benefits preview -->
          <div v-if="tracking.plant?.Benefits?.length" class="mt-3 pt-3 border-t border-[#3d4d36]/50">
            <p class="text-xs text-[#999] mb-1">Benefits:</p>
            <div class="flex flex-wrap gap-1">
              <span 
                v-for="benefit in tracking.plant.Benefits.slice(0, 3)" 
                :key="benefit.id"
                class="px-2 py-0.5 text-xs rounded bg-[#344a34] text-[#d0d0d0]"
              >
                {{ benefit.title }}
              </span>
              <span 
                v-if="tracking.plant.Benefits.length > 3"
                class="px-2 py-0.5 text-xs rounded bg-[#344a34] text-[#999]"
              >
                +{{ tracking.plant.Benefits.length - 3 }} more
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
