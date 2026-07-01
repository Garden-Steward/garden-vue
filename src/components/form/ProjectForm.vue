<script setup>
import { computed, ref } from 'vue';
import { useProjectsStore, useAlertStore } from '@/stores';
import {
  projectCategoryOptions,
  getProjectCategoryBadgeClasses
} from '@/_config/GardenConfig';
import DropDown from '@/components/form/DropDown.vue';
import LocationPicker from '@/components/LocationPicker.vue';

/*
 * Shared project field set used by both the "Pitch a Project" modal and the
 * dedicated /manage/project/:id editor page. The parent owns the form object
 * (passed as modelValue); this component never mutates it directly — it emits
 * update:modelValue with a merged copy. It assumes a dark panel background;
 * both hosts provide one.
 */
const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  gardens: {
    type: Array,
    default: () => []
  },
  errors: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);

const projectsStore = useProjectsStore();
const alertStore = useAlertStore();

const isUploading = ref(false);
const dragActive = ref(false);
const fileInput = ref(null);

const gardenOptions = computed(() =>
  (props.gardens || []).map((g) => ({
    value: g.id,
    label: g.title || 'Untitled garden'
  }))
);

const gallery = computed(() =>
  Array.isArray(props.modelValue.featured_gallery) ? props.modelValue.featured_gallery : []
);

// Emit a shallow-merged copy so we never mutate the prop in place.
const patch = (changes) => {
  emit('update:modelValue', { ...props.modelValue, ...changes });
};

const previewSrc = (photo) => {
  const url = photo?.formats?.thumbnail?.url || photo?.url || '';
  if (!url) return '';
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
};

const triggerFilePicker = () => {
  fileInput.value?.click();
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

const onFileChange = (e) => {
  uploadFiles(e.target.files);
  e.target.value = '';
};

const onDrop = (e) => {
  dragActive.value = false;
  uploadFiles(e.dataTransfer?.files);
};

const removePhoto = (id) => {
  patch({ featured_gallery: gallery.value.filter((p) => p.id !== id) });
};

defineExpose({ isUploading });
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
    <!-- Left column: form fields -->
    <div class="space-y-5">
      <!-- Title -->
      <div>
        <label class="pf-label">Project Title</label>
        <input
          :value="modelValue.title"
          type="text"
          placeholder="Enter project title..."
          :class="['pf-input', errors.title ? 'pf-input--error' : '']"
          @input="patch({ title: $event.target.value })"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="pf-label">Description</label>
        <textarea
          :value="modelValue.short_description"
          rows="4"
          placeholder="Describe your project idea..."
          class="pf-input resize-y"
          @input="patch({ short_description: $event.target.value })"
        ></textarea>
      </div>

      <!-- Category -->
      <div>
        <label class="pf-label">Category</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in projectCategoryOptions"
            :key="opt.value"
            type="button"
            :class="[
              getProjectCategoryBadgeClasses(opt.value),
              'transition-transform',
              modelValue.category === opt.value
                ? 'ring-2 ring-white/90 scale-105'
                : 'opacity-80 hover:opacity-100'
            ]"
            @click="patch({ category: opt.value })"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Photos -->
      <div>
        <label class="pf-label">Upload Photos</label>
        <div
          class="pf-dropzone"
          :class="dragActive ? 'pf-dropzone--active' : ''"
          @click="triggerFilePicker"
          @dragover.prevent="dragActive = true"
          @dragleave.prevent="dragActive = false"
          @drop.prevent="onDrop"
        >
          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onFileChange" />
          <svg class="w-7 h-7 mx-auto mb-2 text-[#d0d7cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.66-.9l.82-1.2A2 2 0 0110.07 4h3.86a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p class="text-sm text-[#d0d7cc]">
            {{ isUploading ? 'Uploading…' : 'Drag & drop photos or click to upload' }}
          </p>
        </div>

        <div v-if="gallery.length" class="flex flex-wrap gap-2 mt-3">
          <div
            v-for="photo in gallery"
            :key="photo.id"
            class="relative w-16 h-16 rounded-md overflow-hidden border border-white/10"
          >
            <img :src="previewSrc(photo)" alt="" class="w-full h-full object-cover" />
            <button
              type="button"
              class="absolute top-0 right-0 bg-black/60 text-white w-5 h-5 flex items-center justify-center text-xs"
              @click.stop="removePhoto(photo.id)"
            >×</button>
          </div>
        </div>
      </div>

      <!-- Garden association -->
      <div>
        <label class="pf-label">Association (Optional)</label>
        <DropDown
          :model-value="modelValue.garden"
          :options="gardenOptions"
          placeholder="Select a Garden"
          @update:model-value="patch({ garden: $event })"
        />
      </div>
    </div>

    <!-- Right column: location map -->
    <div class="min-h-[320px]">
      <LocationPicker
        :model-value="modelValue.location"
        @update:model-value="patch({ location: $event })"
      />
    </div>
  </div>
</template>

<style scoped>
.pf-label {
  display: block;
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.4rem;
  color: #f4f1e4;
}

.pf-input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 0.6rem;
  background-color: transparent;
  border: 1px solid rgba(244, 241, 228, 0.35);
  color: #f4f1e4;
  outline: none;
  transition: border-color 0.2s ease;
}

.pf-input::placeholder {
  color: rgba(244, 241, 228, 0.5);
}

.pf-input:focus {
  border-color: #a7c080;
}

.pf-input--error {
  border-color: #f87171;
  border-width: 2px;
}

.pf-dropzone {
  border: 1px dashed rgba(244, 241, 228, 0.45);
  border-radius: 0.6rem;
  padding: 1.75rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.pf-dropzone:hover,
.pf-dropzone--active {
  background-color: rgba(167, 192, 128, 0.12);
  border-color: #a7c080;
}
</style>
