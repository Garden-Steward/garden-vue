<template>
  <div id="map" style="height: 500px;"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import L from 'leaflet';

const props = defineProps({
  locationTrackings: {
    type: Array,
    required: true
  }
});

onMounted(() => {
  // Initialize the map with a higher zoom level
  const map = L.map('map').setView([37.80189465989609, -122.24179398126134], 15);

  // Add a tile layer to the map
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Add a marker to the map
  props.locationTrackings.forEach(locationTracking => {
    L.marker([locationTracking.latitude, locationTracking.longitude]).addTo(map)
      .bindPopup(`<div class="popup-content text-center">
                    ${locationTracking.label}<br />
                    <img src="${locationTracking.small_image}" alt="Plant Image" class="popup-image">
                  </div>`)
      .openPopup();
  });
})
</script>

<style>
#map {
  width: 100%;
  height: 100%;
}

.popup-content {
  min-width: 250px; /* Set a minimum width for the popup */
}

.popup-image {
  width: 500px; /* Set a larger width for the image */
  height: auto; /* Maintain aspect ratio */
}
</style>