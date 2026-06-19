<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { usePlantsStore } from '@/stores';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const route = useRoute();
const plantsStore = usePlantsStore();
const { plant, plantLoading, plantError } = storeToRefs(plantsStore);

const slug = route.params.slug;

onMounted(() => {
  plantsStore.fetchBySlug(slug);
});

// ── Image helpers ──
const getClipUrl = () => {
  const clip = plant.value?.attributes?.clipart?.data?.attributes;
  if (!clip) return null;
  // Prefer large format, then medium, then original
  return clip.formats?.large?.url || clip.formats?.medium?.url || clip.url;
};

const getImages = () => {
  return plant.value?.attributes?.images?.data || [];
};

const hasClip = computed(() => !!getClipUrl());

// ── Type badge color ──
const typeColors = {
  tree: 'bg-emerald-100 text-emerald-800',
  shrub: 'bg-green-100 text-green-800',
  wildflower: 'bg-purple-100 text-purple-800',
  perennial: 'bg-blue-100 text-blue-800',
  vine: 'bg-teal-100 text-teal-800',
  grass: 'bg-yellow-100 text-yellow-800',
  herb: 'bg-pink-100 text-pink-800',
  groundcover: 'bg-indigo-100 text-indigo-800',
  succulent: 'bg-orange-100 text-orange-800',
  fern: 'bg-lime-100 text-lime-800'
};

const getTypeColor = (type) => {
  return typeColors[type?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};
</script>

<template>
  <div class="plant-detail">
    <!-- Loading -->
    <div v-if="plantLoading" class="plant-detail__loader">
      <LoadingSpinner :centered="true" size="md" />
    </div>

    <!-- Error -->
    <div v-else-if="plantError" class="plant-detail__error">
      <p>Could not load this plant. {{ plantError?.message || plantError }}</p>
      <button class="dash-btn dash-btn--primary" @click="plantsStore.fetchBySlug(slug)">Retry</button>
    </div>

    <!-- Not found -->
    <div v-else-if="!plant" class="plant-detail__not-found">
      <p class="plant-detail__not-found-text">Plant not found.</p>
      <router-link to="/manage/plants" class="dash-link">&larr; Back to all plants</router-link>
    </div>

    <!-- Plant detail -->
    <template v-else>
      <div class="plant-detail__back">
        <router-link to="/manage/plants" class="dash-link">&larr; Plants Directory</router-link>
      </div>

      <!-- ── Hero: clipart + basic info side by side ── -->
      <div class="plant-detail__hero">
        <!-- Clipart (left) -->
        <div class="plant-detail__clipart-wrap">
          <img
            v-if="getClipUrl()"
            :src="getClipUrl()"
            :alt="plant.attributes?.title || 'Plant illustration'"
            class="plant-detail__clipart"
          />
          <div v-else class="plant-detail__clipart-empty">
            🌿
          </div>
        </div>

        <!-- Basic info (right) -->
        <div class="plant-detail__info">
          <h1 class="plant-detail__name">{{ plant.attributes?.title }}</h1>
          <p class="plant-detail__latin">{{ plant.attributes?.latin }}</p>

          <div class="plant-detail__badges">
            <span
              v-if="plant.attributes?.type"
              class="plant-detail__badge"
              :class="getTypeColor(plant.attributes.type)"
            >
              {{ plant.attributes.type }}
            </span>
            <span v-if="hasClip" class="plant-detail__badge plant-detail__badge--clipart">
              🖌️ Clipart
            </span>
          </div>

          <!-- Sun & Water -->
          <div class="plant-detail__meta">
            <div v-if="plant.attributes?.sun_detail" class="plant-detail__meta-item">
              <span class="plant-detail__meta-label">☀️ Sun</span>
              <p class="plant-detail__meta-text">{{ plant.attributes.sun_detail }}</p>
            </div>
            <div v-if="plant.attributes?.water_detail" class="plant-detail__meta-item">
              <span class="plant-detail__meta-label">💧 Water</span>
              <p class="plant-detail__meta-text">{{ plant.attributes.water_detail }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Description / text content ── -->
      <div class="plant-detail__body">
        <!-- Magic writeup -->
        <div v-if="plant.attributes?.magic" class="plant-detail__section plant-detail__magic">
          <h2 class="plant-detail__section-title">Magic</h2>
          <div class="plant-detail__text plant-detail__text--magic">{{ plant.attributes.magic }}</div>
        </div>

        <!-- Full description -->
        <div v-if="plant.attributes?.description" class="plant-detail__section">
          <h2 class="plant-detail__section-title">Description</h2>
          <div class="plant-detail__text">{{ plant.attributes.description }}</div>
        </div>

        <!-- Benefits -->
        <div
          v-if="plant.attributes?.Benefits?.length"
          class="plant-detail__section"
        >
          <h2 class="plant-detail__section-title">Benefits</h2>
          <div class="plant-detail__benefits">
            <span
              v-for="b in plant.attributes.Benefits"
              :key="b.id"
              class="plant-detail__benefit-tag"
            >
              {{ b.title }}
            </span>
          </div>
        </div>

        <!-- Gallery images -->
        <div
          v-if="getImages().length > 0"
          class="plant-detail__section"
        >
          <h2 class="plant-detail__section-title">Photos</h2>
          <div class="plant-detail__gallery">
            <img
              v-for="img in getImages()"
              :key="img.id"
              :src="img.attributes?.formats?.medium?.url || img.attributes?.url"
              :alt="img.attributes?.alternativeText || plant.attributes?.title"
              class="plant-detail__gallery-img"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.plant-detail {
  max-width: 960px;
  margin: 0 auto;
}

/* ── Back link ── */
.plant-detail__back {
  margin-bottom: 1.25rem;
}

.dash-link {
  color: #4a5a45;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: color 0.15s;
}

.dash-link:hover {
  color: #2f5233;
  text-decoration: underline;
}

html.dark .dash-link {
  color: #c2cbbb;
}

html.dark .dash-link:hover {
  color: #e6f0db;
}

/* ── Hero: two-column ── */
.plant-detail__hero {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 2rem;
  margin-bottom: 2.5rem;
}

@media (max-width: 768px) {
  .plant-detail__hero {
    grid-template-columns: 1fr;
  }
}

/* ── Clipart ── */
.plant-detail__clipart-wrap {
  aspect-ratio: 1;
  border-radius: 1rem;
  overflow: hidden;
  background: #f0efe8;
  border: 1px solid #e2dccb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

html.dark .plant-detail__clipart-wrap {
  background: #1a1a1a;
  border-color: #3d4d36;
}

.plant-detail__clipart {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.plant-detail__clipart-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
}

/* ── Info ── */
.plant-detail__info {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.plant-detail__name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 800;
  color: #376451;
  margin: 0;
  line-height: 1.1;
}

html.dark .plant-detail__name {
  color: #c8dbbf;
}

.plant-detail__latin {
  font-size: 1.1rem;
  font-style: italic;
  color: #6b7280;
  margin: 0;
}

html.dark .plant-detail__latin {
  color: #a0a8a0;
}

.plant-detail__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.3rem;
}

.plant-detail__badge {
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.plant-detail__badge--clipart {
  background: rgba(138, 163, 124, 0.15);
  color: #4a5a45;
  font-size: 0.8rem;
}

html.dark .plant-detail__badge--clipart {
  color: #c2cbbb;
}

/* ── Meta blocks (sun, water) ── */
.plant-detail__meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.plant-detail__meta-item {
  padding: 0.65rem 0.85rem;
  background: rgba(138, 163, 124, 0.08);
  border-radius: 0.75rem;
  border: 1px solid #e2dccb;
}

html.dark .plant-detail__meta-item {
  background: rgba(255, 255, 255, 0.04);
  border-color: #3d4d36;
}

.plant-detail__meta-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #4a5a45;
  display: block;
  margin-bottom: 0.2rem;
}

html.dark .plant-detail__meta-label {
  color: #c2cbbb;
}

.plant-detail__meta-text {
  font-size: 0.9rem;
  color: #4b5563;
  margin: 0;
  line-height: 1.5;
}

html.dark .plant-detail__meta-text {
  color: #d1d5db;
}

/* ── Body sections ── */
.plant-detail__body {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-bottom: 3rem;
}

.plant-detail__section {
  padding-bottom: 0.5rem;
}

.plant-detail__section:last-child {
  padding-bottom: 0;
}

.plant-detail__section-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: #376451;
  margin: 0 0 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid #e2dccb;
}

html.dark .plant-detail__section-title {
  color: #c8dbbf;
  border-bottom-color: #3d4d36;
}

.plant-detail__text {
  font-size: 0.95rem;
  line-height: 1.7;
  color: #374151;
  white-space: pre-line;
  padding: 0 0.25rem;
}

html.dark .plant-detail__text {
  color: #d1d5db;
}

.plant-detail__text--magic {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.05rem;
  line-height: 1.8;
  color: #4a5a45;
  padding: 1rem 1.25rem;
  background: rgba(138, 163, 124, 0.08);
  border-radius: 0.75rem;
  border-left: 4px solid #8aa37c;
}

html.dark .plant-detail__text--magic {
  color: #e6f0db;
  background: rgba(138, 163, 124, 0.06);
  border-left-color: #6a8360;
}

/* ── Benefits ── */
.plant-detail__benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.plant-detail__benefit-tag {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: #d7e8c8;
  color: #2f5233;
  font-size: 0.85rem;
  font-weight: 600;
}

html.dark .plant-detail__benefit-tag {
  background: rgba(138, 163, 124, 0.25);
  color: #e6f0db;
}

/* ── Gallery ── */
.plant-detail__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}

.plant-detail__gallery-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 0.6rem;
  border: 1px solid #e2dccb;
}

html.dark .plant-detail__gallery-img {
  border-color: #3d4d36;
}

/* ── States ── */
.plant-detail__loader,
.plant-detail__error,
.plant-detail__not-found {
  text-align: center;
  padding: 3rem 1rem;
}

.plant-detail__error {
  color: #b91c1c;
}

html.dark .plant-detail__error {
  color: #f87171;
}

.plant-detail__not-found-text {
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0 0 0.75rem;
}

html.dark .plant-detail__not-found-text {
  color: #a0a8a0;
}
</style>
