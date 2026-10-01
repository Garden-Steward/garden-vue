<script setup>
import { ref, watch } from 'vue';
import LocationPicker from '@/components/LocationPicker.vue';

/*
 * "Set project location" dialog opened from the project page's edit mode.
 * Works on a local copy of the coordinates; nothing reaches the parent until
 * "Save location", and the parent only persists it with the page-level Save.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // { latitude, longitude } or null
  location: { type: Object, default: null },
  // The project's garden, used for the starting center and "Snap to garden".
  garden: { type: Object, default: null }
});

const emit = defineEmits(['update:modelValue', 'save']);

const local = ref(null);

const gardenCoords = () => (
  props.garden?.latitude != null && props.garden?.longitude != null
    ? { latitude: props.garden.latitude, longitude: props.garden.longitude }
    : null
);

watch(() => props.modelValue, (open) => {
  if (open) local.value = props.location ? { ...props.location } : gardenCoords();
}, { immediate: true });

const close = () => emit('update:modelValue', false);

const snapToGarden = () => {
  const g = gardenCoords();
  if (g) local.value = g;
};

const save = () => {
  emit('save', local.value ? { ...local.value } : null);
  close();
};
</script>

<template>
  <Teleport to="#modals">
    <div v-if="modelValue">
      <div class="fixed inset-0 bg-[rgba(45,62,38,0.72)]" @click="close"></div>
      <div class="fixed inset-0 flex items-center justify-center overflow-y-auto py-6" @click="close">
        <div class="plm" role="dialog" aria-modal="true" aria-labelledby="plm-title" @click.stop>
          <div class="plm__head">
            <div class="plm__heading">
              <h2 id="plm-title" class="plm__title">Set project location</h2>
              <p class="plm__sub">Drop the pin where volunteers should meet.</p>
            </div>
            <button type="button" class="plm__x" aria-label="Close" @click="close">×</button>
          </div>

          <div v-if="garden" class="plm__bar">
            <span class="plm__where">{{ garden.title }}</span>
            <button
              v-if="garden.latitude != null && garden.longitude != null"
              type="button"
              class="plm__snap"
              @click="snapToGarden"
            >
              Snap to garden
            </button>
          </div>

          <div class="plm__map">
            <LocationPicker
              v-model="local"
              :center="gardenCoords() || undefined"
              :zoom="17"
            />
          </div>

          <div class="plm__foot">
            <button type="button" class="plm__cancel" @click="close">Cancel</button>
            <button type="button" class="plm__save" :disabled="!local" @click="save">Save location</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.plm {
  width: min(860px, 94vw);
  background: #f7f1e3;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #1a1a1a;
}

.plm__head {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e0d7c4;
}

.plm__heading { flex: 1; }

.plm__title {
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 24px;
  font-weight: 700;
  color: #376451;
}

.plm__sub {
  margin: 2px 0 0;
  font-size: 14px;
  color: #4b5563;
}

.plm__x {
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  border: 1px solid #dcd3c0;
  background: transparent;
  color: #376451;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.plm__bar {
  padding: 16px 24px 0;
  display: flex;
  gap: 10px;
  align-items: center;
}

.plm__where {
  flex: 1;
  background: #fff;
  border: 1px solid #dcd3c0;
  border-radius: 9999px;
  padding: 10px 18px;
  font-size: 15px;
  color: #4b5563;
}

.plm__snap {
  border: 1px solid #c3cdb8;
  color: #064e3b;
  background: #fff;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 9999px;
  white-space: nowrap;
  cursor: pointer;
}

.plm__map {
  margin: 16px 24px 0;
  height: min(400px, 50vh);
}

.plm__foot {
  padding: 18px 24px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.plm__cancel {
  background: none;
  border: none;
  font-weight: 700;
  font-size: 14px;
  color: #376451;
  padding: 10px 16px;
  cursor: pointer;
}

.plm__save {
  background: #064e3b;
  color: #fff;
  border: none;
  font-weight: 700;
  font-size: 14px;
  padding: 11px 20px;
  border-radius: 9999px;
  cursor: pointer;
}

.plm__save:disabled { opacity: 0.5; cursor: not-allowed; }

.plm__x,
.plm__snap,
.plm__cancel,
.plm__save { -webkit-text-fill-color: currentColor; }
</style>
