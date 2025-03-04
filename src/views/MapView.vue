<template>
  <div v-if="!locationTrackings.loading">
    <LeafletMap :locationTrackings="locationTrackings" />
    <div>
      <h1>Location Trackings</h1>
      <div v-for="locationTracking in locationTrackings" :key="locationTracking.id">
        <p class="text-sm text-white">{{ locationTracking.label }}</p>
        <img :src="locationTracking.small_image" alt="Plant Image" class="h-50">
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import LeafletMap from '@/components/LeafletMap.vue';
import { useLocationTrackingStore } from '@/stores';
const locationTrackingStore = useLocationTrackingStore();
locationTrackingStore.fetchAll();
const { locationTrackings } = storeToRefs(locationTrackingStore);
</script>
