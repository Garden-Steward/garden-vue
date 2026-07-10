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

// ── Image helpers (v5 flat) ──
const getClipUrl = () => {
  const clip = plant.value?.clipart;
  if (!clip) return null;
  return clip.formats?.large?.url || clip.formats?.medium?.url || clip.url;
};

const getImages = () => {
  return Array.isArray(plant.value?.images) ? plant.value.images : [];
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

// ── Invasive status display ──
const invasiveLabels = {
  native: { label: '🌱 Native', cls: 'bg-green-100 text-green-800 border-green-300' },
  non_native_benign: { label: '🌿 Non-Native (Benign)', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  invasive_ca: { label: '⚠️ Invasive (CA)', cls: 'bg-red-100 text-red-800 border-red-300' },
  invasive_na: { label: '⚠️ Invasive (North America)', cls: 'bg-orange-100 text-orange-800 border-orange-300' },
  caution: { label: '🔍 Caution', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
};

const getInvasiveStatus = (status) => {
  return invasiveLabels[status] || null;
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
        <router-link to="/manage/plants" class="plant-detail__back-link">&larr; Plants Directory</router-link>
      </div>

      <div class="plant-detail__card">
        <!-- ── Hero: clipart + basic info side by side ── -->
        <div class="plant-detail__hero">
          <div class="plant-detail__clipart-wrap">
            <img
              v-if="getClipUrl()"
              :src="getClipUrl()"
              :alt="plant.title || 'Plant illustration'"
              class="plant-detail__clipart"
            />
            <div v-else class="plant-detail__clipart-empty">🌿</div>
          </div>

          <div class="plant-detail__info">
            <h1 class="plant-detail__name">{{ plant.title }}</h1>
            <p class="plant-detail__latin">{{ plant.latin }}</p>

            <div class="plant-detail__badges">
              <span
                v-if="plant.type"
                class="plant-detail__badge"
                :class="getTypeColor(plant.type)"
              >
                {{ plant.type }}
              </span>
              <span
                v-if="plant.invasive_status"
                class="plant-detail__badge plant-detail__badge--invasive"
                :class="getInvasiveStatus(plant.invasive_status)?.cls"
              >
                {{ getInvasiveStatus(plant.invasive_status)?.label }}
              </span>
              <span v-if="hasClip" class="plant-detail__badge plant-detail__badge--clipart">🖌️ Clipart</span>
            </div>

            <div class="plant-detail__meta">
              <div v-if="plant.sun_detail" class="plant-detail__meta-item">
                <span class="plant-detail__meta-label">☀️ Sun</span>
                <p class="plant-detail__meta-text">{{ plant.sun_detail }}</p>
              </div>
              <div v-if="plant.water_detail" class="plant-detail__meta-item">
                <span class="plant-detail__meta-label">💧 Water</span>
                <p class="plant-detail__meta-text">{{ plant.water_detail }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Anchor nav ── -->
        <nav v-if="plant.magic || plant.description || plant.uses" class="plant-detail__nav">
          <a v-if="plant.magic" href="#magic" class="plant-detail__nav-link">✨ Magic</a>
          <a v-if="plant.description" href="#description" class="plant-detail__nav-link">📖 Description</a>
          <a v-if="plant.uses" href="#uses" class="plant-detail__nav-link">🔧 Uses</a>
        </nav>

        <!-- ── Body: content left, tags sidebar right ── -->
        <div class="plant-detail__body">
          <div class="plant-detail__content">
            <div v-if="plant.magic" id="magic" class="plant-detail__section">
              <h2 class="plant-detail__section-title">Magic</h2>
              <div class="plant-detail__text plant-detail__text--magic" v-html="plant.magic"></div>
            </div>

            <div v-if="plant.description" id="description" class="plant-detail__section">
              <h2 class="plant-detail__section-title">Description</h2>
              <div class="plant-detail__text" v-html="plant.description"></div>
            </div>

            <div v-if="plant.uses" id="uses" class="plant-detail__section">
              <h2 class="plant-detail__section-title">Uses</h2>
              <div class="plant-detail__text" v-html="plant.uses"></div>
            </div>

            <div v-if="plant.Benefits?.length" class="plant-detail__section">
              <h2 class="plant-detail__section-title">Benefits</h2>
              <div class="plant-detail__benefits">
                <span v-for="b in plant.Benefits" :key="b.id" class="plant-detail__benefit-tag">
                  {{ b.title }}
                </span>
              </div>
            </div>

            <div v-if="getImages().length > 0" class="plant-detail__section">
              <h2 class="plant-detail__section-title">Photos</h2>
              <div class="plant-detail__gallery">
                <img
                  v-for="img in getImages()"
                  :key="img.id"
                  :src="img.formats?.medium?.url || img.url"
                  :alt="img.alternativeText || plant.title"
                  class="plant-detail__gallery-img"
                />
              </div>
            </div>
          </div>

          <!-- ── Sidebar: tags ── -->
          <aside v-if="plant.tags?.length" class="plant-detail__sidebar">
            <div class="plant-detail__tags-panel">
              <h3 class="plant-detail__sidebar-title">Tags</h3>
              <div class="plant-detail__tags">
                <span
                  v-for="tag in plant.tags"
                  :key="tag.documentId"
                  class="plant-detail__tag"
                >#{{ tag.name }}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Outer shell ── */
.plant-detail {
  max-width: 1000px;
  margin: 0 auto;
}

/* ── Back link ── */
.plant-detail__back {
  margin-bottom: 0.75rem;
}

.plant-detail__back-link {
  color: #6b7280;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  transition: color 0.15s;
}

.plant-detail__back-link:hover {
  color: #2f5233;
  text-decoration: underline;
}

html.dark .plant-detail__back-link {
  color: #c2cbbb;
}

html.dark .plant-detail__back-link:hover {
  color: #e6f0db;
}

/* ── Inner card ── */
.plant-detail__card {
  background: #f7f1e3;
  border-radius: 1.25rem;
  padding: 2rem 2rem 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

html.dark .plant-detail__card {
  background: #2a3928;
  box-shadow: none;
}

/* ── Hero: two-column ── */
.plant-detail__hero {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 1.75rem;
  margin-bottom: 1.25rem;
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
  border: 1px solid #ddd6c4;
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

/* ── Info sidebar ── */
.plant-detail__info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plant-detail__name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.6rem, 3.5vw, 2.5rem);
  font-weight: 800;
  color: #2d4a2e;
  margin: 0;
  line-height: 1.1;
}

html.dark .plant-detail__name {
  color: #c8dbbf;
}

.plant-detail__latin {
  font-size: 1.05rem;
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
  gap: 0.45rem;
  margin-top: 0.15rem;
}

.plant-detail__badge {
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.plant-detail__badge--clipart {
  background: rgba(138, 163, 124, 0.18);
  color: #3d5a3e;
}

html.dark .plant-detail__badge--clipart {
  color: #c2cbbb;
}

.plant-detail__badge--invasive {
  border: 1px solid;
}

/* ── Anchor nav ── */
.plant-detail__nav {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 0.65rem 0;
  border-top: 1px solid #ddd6c4;
  border-bottom: 1px solid #ddd6c4;
}

html.dark .plant-detail__nav {
  border-color: #3d4d36;
}

.plant-detail__nav-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: #3d5a3e;
  text-decoration: none;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  background: rgba(138, 163, 124, 0.1);
  transition: background 0.15s, color 0.15s;
}

.plant-detail__nav-link:hover {
  background: #2d4a2e;
  color: #fff;
}

html.dark .plant-detail__nav-link {
  color: #c2cbbb;
  background: rgba(255, 255, 255, 0.06);
}

html.dark .plant-detail__nav-link:hover {
  background: #8aa37c;
  color: #1a1a1a;
}

/* ── Meta blocks ── */
.plant-detail__meta {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.4rem;
}

.plant-detail__meta-item {
  padding: 0.6rem 0.85rem;
  background: rgba(138, 163, 124, 0.1);
  border-radius: 0.75rem;
  border: 1px solid #ddd6c4;
}

html.dark .plant-detail__meta-item {
  background: rgba(255, 255, 255, 0.04);
  border-color: #3d4d36;
}

.plant-detail__meta-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #3d5a3e;
  display: block;
  margin-bottom: 0.15rem;
}

html.dark .plant-detail__meta-label {
  color: #c2cbbb;
}

.plant-detail__meta-text {
  font-size: 0.88rem;
  color: #4b5563;
  margin: 0;
  line-height: 1.5;
}

html.dark .plant-detail__meta-text {
  color: #d1d5db;
}

/* ── Body: two-column layout ── */
.plant-detail__body {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 2rem;
  padding-bottom: 1rem;
}

@media (max-width: 768px) {
  .plant-detail__body {
    grid-template-columns: 1fr;
  }
}

/* ── Content column ── */
.plant-detail__content {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  min-width: 0;
}

.plant-detail__section {
  padding-bottom: 0.25rem;
}

.plant-detail__section:last-child {
  padding-bottom: 0;
}

.plant-detail__section-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #2d4a2e;
  margin: 0 0 0.65rem;
  padding-bottom: 0.35rem;
  border-bottom: 2px solid #ddd6c4;
  scroll-margin-top: 1rem;
}

html.dark .plant-detail__section-title {
  color: #c8dbbf;
  border-bottom-color: #3d4d36;
}

.plant-detail__text {
  font-size: 0.95rem;
  line-height: 1.75;
  color: #374151;
  white-space: pre-line;
  padding: 0 0.5rem;
}

html.dark .plant-detail__text {
  color: #d1d5db;
}

.plant-detail__text--magic {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.05rem;
  line-height: 1.8;
  color: #3d5a3e;
  padding: 1rem 1.25rem;
  background: rgba(138, 163, 124, 0.1);
  border-radius: 0.75rem;
  border-left: 4px solid #8aa37c;
}

html.dark .plant-detail__text--magic {
  color: #e6f0db;
  background: rgba(138, 163, 124, 0.08);
  border-left-color: #6a8360;
}

/* ── Benefits ── */
.plant-detail__benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
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
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.65rem;
}

.plant-detail__gallery-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 0.6rem;
  border: 1px solid #ddd6c4;
}

html.dark .plant-detail__gallery-img {
  border-color: #3d4d36;
}

/* ── Tags sidebar ── */
.plant-detail__sidebar {
  position: sticky;
  top: 1.5rem;
  align-self: start;
}

.plant-detail__tags-panel {
  background: rgba(138, 163, 124, 0.08);
  border: 1px solid #ddd6c4;
  border-radius: 0.85rem;
  padding: 1rem;
}

html.dark .plant-detail__tags-panel {
  border-color: #3d4d36;
  background: rgba(255, 255, 255, 0.03);
}

.plant-detail__sidebar-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: #2d4a2e;
  margin: 0 0 0.65rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid #ddd6c4;
}

html.dark .plant-detail__sidebar-title {
  color: #c8dbbf;
  border-bottom-color: #3d4d36;
}

.plant-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.plant-detail__tag {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: rgba(138, 163, 124, 0.1);
  transition: color 0.15s, background 0.15s;
}

.plant-detail__tag:hover {
  color: #2d4a2e;
  background: rgba(138, 163, 124, 0.2);
}

html.dark .plant-detail__tag {
  color: #c2cbbb;
  background: rgba(255, 255, 255, 0.06);
}

html.dark .plant-detail__tag:hover {
  color: #e6f0db;
  background: rgba(255, 255, 255, 0.1);
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
  color: #a0a8a0;
  margin: 0 0 0.75rem;
}
</style>