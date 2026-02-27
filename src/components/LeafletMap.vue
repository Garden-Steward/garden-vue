<template>
  <div id="map" style="height: 100%; width: 100%;"></div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import the SVG as a string
import pinSvg from './icons/Pin.svg?raw';

const props = defineProps({
  locationTrackings: {
    type: Array,
    required: true
  },
  centerCoordinates: {
    type: Object,
    default: () => ({ latitude: 37.80189465989609, longitude: -122.24179398126134 })
  }
});

const emit = defineEmits(['select-location']);

let map;
const centerMapOnLocation = ref(null);

onMounted(() => {
  map = L.map('map').setView([props.centerCoordinates.latitude, props.centerCoordinates.longitude], 15);

  // Add a tile layer to the map
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Add a marker with an SVG icon to the map
  props.locationTrackings.forEach(locationTracking => {
    const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'indigo', 'teal'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const svgIcon = L.divIcon({
      className: 'custom-svg-icon',
      html: `<p class="text-${randomColor}-500">${pinSvg}</p>`, // Use the imported SVG
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker([locationTracking.latitude, locationTracking.longitude], { icon: svgIcon }).addTo(map)
      .bindTooltip(locationTracking.label)
      .bindPopup(`<div class="popup-content text-center">
                    ${locationTracking.label}
                </div>`)
      .on('click', () => {
        // Emit an event with the selected location
        emit('select-location', locationTracking);
      })
      .openPopup();
  });

  // Define the method to center the map
  centerMapOnLocation.value = (latitude, longitude) => {
    map.setView([latitude, longitude], 15);
  };
});

watch(() => props.centerCoordinates, (newCoords) => {
  if (map) {
    map.setView([newCoords.latitude, newCoords.longitude], 15);
  }
});

// export { centerMapOnLocation };
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