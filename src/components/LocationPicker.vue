<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import pinSvg from './icons/Pin.svg?raw';

const props = defineProps({
  // { latitude, longitude } — when null, falls back to the default center.
  modelValue: {
    type: Object,
    default: null
  },
  center: {
    type: Object,
    default: () => ({ latitude: 37.80189465989609, longitude: -122.24179398126134 })
  },
  zoom: {
    type: Number,
    default: 13
  }
});

const emit = defineEmits(['update:modelValue']);

const mapEl = ref(null);
let map = null;
let marker = null;

const startCoords = () => ({
  latitude: props.modelValue?.latitude ?? props.center.latitude,
  longitude: props.modelValue?.longitude ?? props.center.longitude
});

// Bump the bare 24x24 icon up to a large pin and recolor it red. The SVG fills
// with currentColor, so the wrapper's color drives the pin color; CSS width/
// height on the <svg> overrides its inline 24x24 attributes.
const bigRedPin = pinSvg
  .replace('width="24"', 'width="56"')
  .replace('height="24"', 'height="56"');

const pinIcon = L.divIcon({
  className: 'location-picker-pin',
  html: `<div style="color:#dc2626;line-height:0;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.45))">${bigRedPin}</div>`,
  iconSize: [56, 56],
  iconAnchor: [28, 52]
});

const setCoords = (lat, lng) => {
  emit('update:modelValue', { latitude: lat, longitude: lng });
};

onMounted(() => {
  const { latitude, longitude } = startCoords();
  map = L.map(mapEl.value, { zoomControl: true }).setView([latitude, longitude], props.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  marker = L.marker([latitude, longitude], { icon: pinIcon, draggable: true })
    .addTo(map)
    .bindTooltip('Drag the pin to the project location.', { permanent: false, direction: 'top' });

  marker.on('dragend', () => {
    const { lat, lng } = marker.getLatLng();
    setCoords(lat, lng);
  });

  // Click the map to move the pin too.
  map.on('click', (e) => {
    marker.setLatLng(e.latlng);
    setCoords(e.latlng.lat, e.latlng.lng);
  });

  // Seed the model so the parent has coordinates even before any drag.
  if (!props.modelValue) {
    setCoords(latitude, longitude);
  }

  // The map is usually mounted inside a modal that animates/opens, so the
  // container can have zero size at first paint — recalculate once visible.
  nextTick(() => setTimeout(() => map && map.invalidateSize(), 150));
});

watch(
  () => props.modelValue,
  (val) => {
    if (!val || !marker) return;
    const current = marker.getLatLng();
    if (current.lat !== val.latitude || current.lng !== val.longitude) {
      marker.setLatLng([val.latitude, val.longitude]);
    }
  }
);

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <div class="location-picker">
    <div ref="mapEl" class="location-picker__map"></div>
    <p class="location-picker__hint">Drag the pin to the project location.</p>
  </div>
</template>

<style scoped>
.location-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 320px;
}

.location-picker__map {
  flex: 1;
  width: 100%;
  min-height: 280px;
  border-radius: 12px;
  overflow: hidden;
  z-index: 0;
}

.location-picker__hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #d0d7cc;
  text-align: center;
}
</style>
