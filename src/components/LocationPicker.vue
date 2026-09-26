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
// Placing mode: armed by the "Select exact location" button; the next map
// click drops the pin. Outside it, clicks just pan so the pin can't be moved
// by accident.
const isPlacing = ref(false);
let map = null;
let marker = null;
let resizeObserver = null;

// On touch screens a one-finger drag on the map would trap page scrolling, so
// panning is off until "Select exact location" arms placing mode. Pinch-zoom,
// the zoom buttons and dragging the pin itself still work.
const isTouch = L.Browser.mobile;

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
  // The path's tip is at y=16 of its 24px viewBox → 16/24 × 56 ≈ 37px.
  iconAnchor: [28, 37]
});

const setCoords = (lat, lng) => {
  emit('update:modelValue', { latitude: lat, longitude: lng });
};

onMounted(() => {
  const { latitude, longitude } = startCoords();
  map = L.map(mapEl.value, { zoomControl: true, dragging: !isTouch }).setView([latitude, longitude], props.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  marker = L.marker([latitude, longitude], { icon: pinIcon, draggable: true })
    .addTo(map)
    .bindTooltip('Drag to adjust', { permanent: false, direction: 'top', offset: [0, -34] });

  marker.on('dragend', () => {
    const { lat, lng } = marker.getLatLng();
    setCoords(lat, lng);
  });

  map.on('click', (e) => {
    if (!isPlacing.value) return;
    marker.setLatLng(e.latlng);
    setCoords(e.latlng.lat, e.latlng.lng);
    isPlacing.value = false;
  });

  // Seed the model so the parent has coordinates even before any drag.
  if (!props.modelValue) {
    setCoords(latitude, longitude);
  }

  // The map is usually mounted inside a modal that animates/opens, so the
  // container can have zero size at first paint — recalculate once visible.
  nextTick(() => setTimeout(() => map && map.invalidateSize(), 150));

  // The host form switches between a tall side column and a short full-width
  // strip as its container resizes; keep Leaflet's tiles in sync.
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => map && map.invalidateSize());
    resizeObserver.observe(mapEl.value);
  }
});

const onKeydown = (e) => {
  if (e.key === 'Escape' && isPlacing.value) {
    // Don't let Esc also close the surrounding modal.
    e.stopPropagation();
    isPlacing.value = false;
  }
};

watch(isPlacing, (placing) => {
  if (placing) window.addEventListener('keydown', onKeydown, true);
  else window.removeEventListener('keydown', onKeydown, true);
  if (isTouch && map) {
    if (placing) map.dragging.enable();
    else map.dragging.disable();
  }
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
  window.removeEventListener('keydown', onKeydown, true);
  resizeObserver?.disconnect();
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <div class="location-picker">
    <!-- The placing class lives on the frame: Leaflet owns the map element's
         classes, and a Vue class binding there would wipe them. -->
    <div class="location-picker__frame" :class="{ 'location-picker__frame--placing': isPlacing }">
      <div ref="mapEl" class="location-picker__map"></div>

      <div v-if="isPlacing" class="location-picker__banner">
        {{ isTouch ? 'Tap' : 'Click' }} the map to drop the pin
        <span v-if="!isTouch" class="location-picker__banner-sub">Esc to cancel</span>
      </div>

      <button
        type="button"
        class="location-picker__btn"
        :class="{ 'location-picker__btn--active': isPlacing }"
        @click="isPlacing = !isPlacing"
      >
        <span v-if="!isPlacing" class="location-picker__btn-icon" v-html="pinSvg"></span>
        {{ isPlacing ? 'Cancel' : 'Select exact location' }}
      </button>
    </div>
    <p class="location-picker__hint">
      <template v-if="isPlacing">Pan and zoom freely, then {{ isTouch ? 'tap' : 'click' }} the exact spot.</template>
      <template v-else-if="isTouch">Tap “Select exact location” to move the map, or drag the pin.</template>
      <template v-else>Use “Select exact location”, or drag the pin.</template>
    </p>
  </div>
</template>

<style scoped>
.location-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 240px;
}

.location-picker__frame {
  position: relative;
  flex: 1;
  display: flex;
  min-height: 200px;
}

.location-picker__map {
  flex: 1;
  width: 100%;
  min-height: 200px;
  border-radius: 12px;
  overflow: hidden;
  z-index: 0;
}

.location-picker__btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.8rem;
  border: none;
  border-radius: 999px;
  background: #ffffff;
  color: #1f2a1a;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.location-picker__btn:hover {
  background: #f1f5ee;
}

.location-picker__btn--active {
  background: #1f2a1a;
  color: #ffffff;
}

.location-picker__btn--active:hover {
  background: #33422c;
}

.location-picker__btn-icon {
  display: inline-flex;
  color: #dc2626;
}

.location-picker__btn-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.location-picker__banner {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: rgba(31, 42, 26, 0.9);
  color: #ffffff;
  font-size: 0.85rem;
  white-space: nowrap;
  pointer-events: none;
}

.location-picker__banner-sub {
  margin-left: 0.4rem;
  opacity: 0.7;
}

.location-picker__hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #4a5c42;
  text-align: center;
}
</style>

<style>
/* Leaflet sets its own grab cursor on inner elements, so this block is unscoped.
   Hotspot (18,24) is the pin's tip in the 36px cursor. */
.location-picker__frame--placing .leaflet-container,
.location-picker__frame--placing .leaflet-grab,
.location-picker__frame--placing .leaflet-interactive {
  cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='36' height='36'><path fill='%23dc2626' stroke='white' stroke-width='1.2' d='M12 2C9.24 2 7 4.24 7 7c0 3.31 5 9 5 9s5-5.69 5-9c0-2.76-2.24-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z'/></svg>") 18 24, crosshair;
}

.location-picker__frame--placing .leaflet-dragging .leaflet-grab {
  cursor: grabbing;
}

.location-picker-pin {
  cursor: grab;
}

html.dark .location-picker__hint {
  color: #d0d7cc;
}
</style>
