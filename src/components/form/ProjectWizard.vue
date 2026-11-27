<script setup>
import { ref, computed } from 'vue';
import { projectCategoryOptions } from '@/_config/GardenConfig';
import DropDown from '@/components/form/DropDown.vue';
import LocationPicker from '@/components/LocationPicker.vue';
import { useProjectsStore, useAlertStore } from '@/stores';

/*
 * One-question-at-a-time pitch wizard. A step is a full-screen question with a
 * big "Skip for now" for everything optional, so a half-formed idea can be
 * pitched in under a minute and fleshed out later. Shares ProjectForm's
 * `modelValue` / `update:modelValue` contract so it drops into the pitch flow
 * unchanged; the parent swaps on the `complete` event to the finalize step.
 */

const props = defineProps({
  modelValue: { type: Object, required: true },
  gardens: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:modelValue', 'complete']);

const projectsStore = useProjectsStore();
const alertStore = useAlertStore();

const currentStep = ref(0);

const patch = (changes) => emit('update:modelValue', { ...props.modelValue, ...changes });

const steps = [
  { key: 'title', emoji: '🌱', q: 'What are we making?', hint: 'Give your idea a name', type: 'text', required: true },
  { key: 'short_description', emoji: '📝', q: 'Tell us about it', hint: 'A sentence or two is plenty', type: 'textarea' },
  { key: 'category', emoji: '🎨', q: 'What flavor is it?', type: 'chips' },
  { key: 'goal', emoji: '📅', q: 'When are you hoping to do it?', hint: 'e.g. "by summer 2027"', type: 'text' },
  { key: 'volunteer_goal', emoji: '🙌', q: 'How many folks before it starts?', hint: 'e.g. 5', type: 'number' },
  { key: 'time_commitment', emoji: '⏱️', q: 'About how much time should folks give?', hint: 'e.g. "4–6 hours"', type: 'text' },
  { key: 'physical_wellness', emoji: '💪', q: 'How physical is the work?', type: 'wellness' },
  { key: 'location', emoji: '📍', q: "Where's it happening?", hint: 'Drop a pin', type: 'location' },
  { key: 'featured_gallery', emoji: '📸', q: 'Got photos?', hint: 'You can add these later', type: 'photos' },
  { key: 'garden', emoji: '🏡', q: 'Which garden?', hint: 'Or skip and we’ll sort it out', type: 'garden' },
];

const step = computed(() => steps[currentStep.value]);
const isFirst = computed(() => currentStep.value === 0);
const isLast = computed(() => currentStep.value === steps.length - 1);
const progress = computed(() => ((currentStep.value + 1) / steps.length) * 100);

// Required steps (title) gate their Next button until they have a value.
const canAdvance = computed(() => {
  if (!step.value.required) return true;
  const v = props.modelValue[step.value.key];
  return typeof v === 'string' ? !!v.trim() : !!v;
});

const next = () => {
  if (isLast.value) { emit('complete'); return; }
  currentStep.value += 1;
};
const back = () => { if (!isFirst.value) currentStep.value -= 1; };

const gardenOptions = computed(() =>
  (props.gardens || []).map((g) => ({ value: g.id, label: g.title || 'Untitled garden' }))
);

const wellnessOptions = [
  { value: 'none', label: 'None', emoji: '🪑' },
  { value: 'light', label: 'Light', emoji: '🌿' },
  { value: 'moderate', label: 'Moderate', emoji: '🛠️' },
  { value: 'heavy', label: 'Heavy', emoji: '💪' },
];

const categoryEmoji = {
  Infrastructure: '🛠️', Art: '🎨', Event: '🎪', Education: '🎓', Planting: '🌱', Community: '🤝'
};

// ── Photos ──
const isUploading = ref(false);
const fileInput = ref(null);
const gallery = computed(() =>
  Array.isArray(props.modelValue.featured_gallery) ? props.modelValue.featured_gallery : []
);

const previewSrc = (photo) => {
  const url = photo?.formats?.thumbnail?.url || photo?.url || '';
  if (!url) return '';
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
};

const uploadFiles = async (fileList) => {
  const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  isUploading.value = true;
  try {
    for (const file of files) {
      const fd = new FormData();
      fd.append('files', file);
      const uploaded = await projectsStore.uploadImage(fd);
      if (uploaded?.id) patch({ featured_gallery: [...gallery.value, uploaded] });
    }
  } catch (err) {
    alertStore.error('Failed to upload one or more photos');
  } finally {
    isUploading.value = false;
  }
};

const onFileChange = (e) => { uploadFiles(e.target.files); e.target.value = ''; };
const removePhoto = (id) => patch({ featured_gallery: gallery.value.filter((p) => p.id !== id) });
</script>

<template>
  <div class="pw">
    <!-- Progress -->
    <div class="pw-progress">
      <div class="pw-progress__bar" :style="{ width: progress + '%' }"></div>
    </div>
    <p class="pw-count">Step {{ currentStep + 1 }} of {{ steps.length }}</p>

    <!-- Question -->
    <div class="pw-step">
      <div class="pw-emoji">{{ step.emoji }}</div>
      <h3 class="pw-q">{{ step.q }}</h3>
      <p v-if="step.hint" class="pw-hint">{{ step.hint }}</p>

      <div class="pw-body">
        <!-- text -->
        <input
          v-if="step.type === 'text'"
          :value="modelValue[step.key]"
          type="text"
          class="pw-input"
          :placeholder="step.hint"
          @input="patch({ [step.key]: $event.target.value })"
        />

        <!-- textarea -->
        <textarea
          v-else-if="step.type === 'textarea'"
          :value="modelValue[step.key]"
          rows="4"
          class="pw-input resize-y"
          placeholder="Describe your idea…"
          @input="patch({ [step.key]: $event.target.value })"
        ></textarea>

        <!-- number -->
        <input
          v-else-if="step.type === 'number'"
          :value="modelValue[step.key]"
          type="number"
          min="0"
          class="pw-input"
          :placeholder="step.hint"
          @input="patch({ [step.key]: $event.target.value === '' ? null : Number($event.target.value) })"
        />

        <!-- category chips -->
        <div v-else-if="step.type === 'chips'" class="pw-grid">
          <button
            v-for="opt in projectCategoryOptions"
            :key="opt.value"
            type="button"
            class="pw-chip"
            :class="{ 'pw-chip--on': modelValue.category === opt.value }"
            @click="patch({ category: opt.value })"
          >
            <span class="pw-chip__emoji">{{ categoryEmoji[opt.value] || '✨' }}</span>
            {{ opt.label }}
          </button>
        </div>

        <!-- wellness -->
        <div v-else-if="step.type === 'wellness'" class="pw-grid">
          <button
            v-for="opt in wellnessOptions"
            :key="opt.value"
            type="button"
            class="pw-chip"
            :class="{ 'pw-chip--on': (modelValue.physical_wellness || 'none') === opt.value }"
            @click="patch({ physical_wellness: opt.value })"
          >
            <span class="pw-chip__emoji">{{ opt.emoji }}</span>
            {{ opt.label }}
          </button>
        </div>

        <!-- location -->
        <div v-else-if="step.type === 'location'" class="pw-map">
          <LocationPicker
            :model-value="modelValue.location"
            @update:model-value="patch({ location: $event })"
          />
        </div>

        <!-- photos -->
        <div v-else-if="step.type === 'photos'" class="pw-photos">
          <button
            type="button"
            class="pw-drop"
            :disabled="isUploading"
            @click="fileInput?.click()"
          >
            {{ isUploading ? 'Uploading…' : '📤 Tap to add photos' }}
          </button>
          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onFileChange" />
          <div v-if="gallery.length" class="pw-thumbs">
            <div v-for="photo in gallery" :key="photo.id" class="pw-thumb">
              <img :src="previewSrc(photo)" alt="" />
              <button type="button" class="pw-thumb__x" @click="removePhoto(photo.id)">×</button>
            </div>
          </div>
        </div>

        <!-- garden -->
        <div v-else-if="step.type === 'garden'" class="pw-select">
          <DropDown
            :model-value="modelValue.garden"
            :options="gardenOptions"
            placeholder="Pick a garden"
            @update:model-value="patch({ garden: $event })"
          />
        </div>
      </div>
    </div>

    <!-- Nav -->
    <div class="pw-nav">
      <button v-if="!isFirst" type="button" class="pw-back" @click="back">← Back</button>
      <span v-else></span>
      <div class="pw-nav__right">
        <button v-if="!step.required" type="button" class="pw-skip" @click="next">Skip for now</button>
        <button type="button" class="pw-next" :disabled="!canAdvance" @click="next">
          {{ isLast ? 'Almost there →' : 'Next →' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pw-progress { height: 8px; background: rgba(138, 163, 124, 0.2); border-radius: 999px; overflow: hidden; }
.pw-progress__bar { height: 100%; background: #86b153; border-radius: 999px; transition: width 0.25s ease; }
.pw-count { margin: 0.5rem 0 0; font-size: 0.8rem; color: #6b7d6e; }
.pw-step { margin-top: 1.25rem; }
.pw-emoji { font-size: 2.5rem; line-height: 1; }
.pw-q { font-size: clamp(1.4rem, 4vw, 2rem); font-weight: 800; color: #1a2617; margin: 0.5rem 0 0.25rem; line-height: 1.15; }
.pw-hint { color: #6b7d6e; margin: 0; }
.pw-body { margin-top: 1.25rem; }
.pw-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
.pw-input { width: 100%; padding: 0.8rem 0.9rem; border-radius: 0.8rem; border: 1px solid #a8c49a; background: #fff; color: #1a2617; font-size: 1.05rem; outline: none; }
.pw-input:focus { border-color: #8aa37c; box-shadow: 0 0 0 3px rgba(138, 163, 124, 0.35); }
.pw-chip { display: flex; align-items: center; gap: 0.5rem; padding: 0.8rem 0.9rem; border-radius: 0.8rem; border: 1px solid #a8c49a; background: #fff; color: #1a2617; font-weight: 600; cursor: pointer; text-align: left; }
.pw-chip__emoji { font-size: 1.25rem; }
.pw-chip--on { border-color: #86b153; background: rgba(134, 177, 83, 0.18); box-shadow: 0 0 0 2px rgba(134, 177, 83, 0.4); }
.pw-map { height: 260px; }
.pw-drop { width: 100%; padding: 1.6rem; border-radius: 0.8rem; border: 1px dashed #8aa37c; background: rgba(255, 255, 255, 0.5); color: #4a5c42; font-weight: 600; cursor: pointer; }
.pw-thumbs { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
.pw-thumb { position: relative; width: 64px; height: 64px; border-radius: 0.5rem; overflow: hidden; border: 1px solid #a8c49a; }
.pw-thumb img { width: 100%; height: 100%; object-fit: cover; }
.pw-thumb__x { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.6); color: #fff; width: 20px; height: 20px; line-height: 1; border: none; cursor: pointer; }
.pw-nav { display: flex; align-items: center; justify-content: space-between; margin-top: 1.75rem; }
.pw-nav__right { display: flex; gap: 0.75rem; align-items: center; }
.pw-back { background: none; border: none; color: #2f4a2a; text-decoration: underline; cursor: pointer; }
.pw-skip { background: none; border: none; color: #6b7d6e; cursor: pointer; font-size: 0.95rem; }
.pw-next { background: #86b153; color: #1f2a14; font-weight: 700; padding: 0.7rem 1.6rem; border-radius: 0.6rem; border: none; cursor: pointer; }
.pw-next:hover { background: #97c264; }
.pw-next:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

<style>
html.dark .pw-q { color: #f4f1e4; }
html.dark .pw-input,
html.dark .pw-chip { background: rgba(26, 26, 26, 0.35); border-color: rgba(244, 241, 228, 0.35); color: #f4f1e4; }
html.dark .pw-hint,
html.dark .pw-count { color: #d0d7cc; }
html.dark .pw-back { color: #d0d7cc; }
html.dark .pw-skip { color: #d0d7cc; }
html.dark .pw-drop { color: #d0d7cc; background: transparent; }
</style>