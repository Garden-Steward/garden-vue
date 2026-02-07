<template>
  <div v-if="!locationTrackings.loading">
    <h1 class="dark:text-[#f5f5f5]">Pollinator Pathways</h1>
    <LeafletMap ref="leafletMap" :locationTrackings="locationTrackings" :centerCoordinates="centerCoordinates" @select-location="selectLocation" />
    <div>
      <div v-if="selectedLocation">
        <h2 class="dark:text-[#f5f5f5]">{{ selectedLocation.label }}</h2>
        <img :src="selectedLocation.small_image" alt="Selected Plant Image" class="h-50">
      </div>

      <div v-for="locationTracking in locationTrackings" :key="locationTracking.id" class="grid grid-cols-3 gap-4 items-center">
        <img :src="locationTracking.thumbnail" :alt="locationTracking.label" class="w-20 h-20 object-cover rounded mb-2">
        <p class="text-sm text-white">
          <a href="#" @click.prevent="toggleDrawer(locationTracking)">
            {{ locationTracking.label }}
          </a>
          <div href="#" @click.prevent="centerMap(locationTracking.latitude, locationTracking.longitude)" class="text-xs text-gray-100 mt-2">
            Center
          </div>
        </p>
        <p class="text-xs text-gray-100">
          {{ locationTracking.last_verified ? new Date(locationTracking.last_verified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown' }}
        </p>
        <LocationTrack v-if="visibleDrawer[locationTracking.id]" :location="locationTracking" class="col-span-3" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import LeafletMap from '@/components/LeafletMap.vue';
import LocationTrack from '@/components/LocationTrack.vue';
import { useLocationTrackingStore } from '@/stores';

const locationTrackingStore = useLocationTrackingStore();
locationTrackingStore.fetchAll();
const { locationTrackings } = storeToRefs(locationTrackingStore);

const selectedLocation = ref(null);
const centerCoordinates = ref({ latitude: 37.80189465989609, longitude: -122.24179398126134 });
const leafletMap = ref(null);
const visibleDrawer = ref({});

function selectLocation(location) {
  selectedLocation.value = location;
}

function centerMap(locationTracking) {
  centerCoordinates.value = { latitude: locationTracking.latitude, longitude: locationTracking.longitude };
  selectedLocation.value = locationTracking;
}

function toggleDrawer(locationTracking) {
  visibleDrawer.value[locationTracking.id] = !visibleDrawer.value[locationTracking.id];
}
</script>
