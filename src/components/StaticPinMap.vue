<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/*
 * A small, non-interactive map with one pin — a preview, not a picker.
 * The project page uses it in the Location card; LocationPicker does the
 * editing.
 */
const props = defineProps({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  zoom: { type: Number, default: 16 }
});

const el = ref(null);
let map = null;
let marker = null;

const pin = L.divIcon({
  className: 'static-pin',
  html: '<span class="static-pin__dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

onMounted(() => {
  map = L.map(el.value, {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    attributionControl: false
  }).setView([props.latitude, props.longitude], props.zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  marker = L.marker([props.latitude, props.longitude], { icon: pin, interactive: false }).addTo(map);
  setTimeout(() => map && map.invalidateSize(), 150);
});

watch(() => [props.latitude, props.longitude], ([lat, lng]) => {
  if (!map) return;
  map.setView([lat, lng], props.zoom);
  marker.setLatLng([lat, lng]);
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <div ref="el" class="static-pin-map"></div>
</template>

<style scoped>
.static-pin-map {
  width: 100%;
  height: 100%;
  z-index: 0;
}
</style>

<style>
.static-pin__dot {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: #064e3b;
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}
</style>
