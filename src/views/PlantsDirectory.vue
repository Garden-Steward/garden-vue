<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { usePlantsStore } from '@/stores';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const plantsStore = usePlantsStore();
const route = useRoute();
const router = useRouter();
const { plants, loading, error, pagination, query, allLoaded, totalCount } = storeToRefs(plantsStore);

// ── Search with debounce ──
const searchInput = ref('');
let debounceTimer = null;

const onSearchInput = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    plantsStore.search(searchInput.value);
  }, 300);
};

const clearSearch = () => {
  searchInput.value = '';
  plantsStore.search('');
};

// ── Sort (synced with URL query param ?sort=field:order) ──
const sortField = computed(() => plantsStore.sortField);

// Prevents infinite loop when URL-initiated change bounces back
let syncingFromUrl = false;

const toggleSort = (field) => {
  plantsStore.setSort(field);
};

const sortChevron = (field) => {
  if (plantsStore.sortField !== field) return '';
  return plantsStore.sortOrder === 'asc' ? ' ↑' : ' ↓';
};

// Valid sort fields we support
const validSortFields = ['title', 'latin', 'type', 'updatedAt'];
const validSortOrders = ['asc', 'desc'];

// Parse ?sort=field:order from URL (e.g. ?sort=updatedAt:desc)
const parseSortParam = (val) => {
  if (typeof val !== 'string') return null;
  const parts = val.split(':');
  if (parts.length === 2 && validSortFields.includes(parts[0]) && validSortOrders.includes(parts[1])) {
    return { field: parts[0], order: parts[1] };
  }
  return null;
};

// Watch store sort changes → sync to URL (skip during URL-initiated changes)
watch(
  () => `${plantsStore.sortField}:${plantsStore.sortOrder}`,
  (val) => {
    if (syncingFromUrl) return;
    const q = { ...route.query };
    q.sort = val;
    router.replace({ query: q });
  }
);

// Watch URL sort changes → sync to store (handles back/forward nav)
watch(
  () => route.query.sort,
  (newSort) => {
    const parsed = parseSortParam(newSort);
    if (!parsed) return;
    if (plantsStore.sortField !== parsed.field || plantsStore.sortOrder !== parsed.order) {
      syncingFromUrl = true;
      plantsStore.sortField = parsed.field;
      plantsStore.sortOrder = parsed.order;
      syncingFromUrl = false;
      plantsStore.search(plantsStore.query);
    }
  }
);

// ── Load more button ──
onMounted(() => {
  // Read sort from URL query params before initial load
  const parsed = parseSortParam(route.query.sort);
  if (parsed) {
    syncingFromUrl = true;
    plantsStore.sortField = parsed.field;
    plantsStore.sortOrder = parsed.order;
    // Don't call search() here — ensureLoaded will pick up the state
    syncingFromUrl = false;
  }
  plantsStore.ensureLoaded();
});

const loadMore = () => {
  plantsStore.loadNextPage();
};

// ── Image helper ──
const getThumbnailUrl = (plant) => {
  // Priority: clipart (small format) → first image (small) → clipart (full) → first image (full)
  const clipart = plant.attributes?.clipart?.data?.attributes;
  const images = plant.attributes?.images?.data;

  if (clipart?.formats?.small?.url) return clipart.formats.small.url;
  if (clipart?.url) return clipart.url;
  if (images?.[0]?.attributes?.formats?.small?.url) return images[0].attributes.formats.small.url;
  if (images?.[0]?.attributes?.url) return images[0].attributes.url;
  return null;
};

const getFullClipUrl = (plant) => {
  const clipart = plant.attributes?.clipart?.data?.attributes;
  return clipart?.url || null;
};

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
  fern: 'bg-lime-100 text-lime-800',
  fungi: 'bg-amber-100 text-amber-900'
};

const getTypeColor = (type) => {
  return typeColors[type?.toLowerCase()] || 'bg-gray-100 text-gray-800';
};
</script>

<template>
  <div class="plants-page">
    <!-- Header -->
    <header class="plants-header">
      <div>
        <h1 class="plants-title">Plants</h1>
        <p class="plants-count" v-if="totalCount && !loading">
          {{ totalCount }} plants in the database
        </p>
      </div>
    </header>

    <!-- Search bar -->
    <div class="plants-search-row">
      <div class="plants-search-wrap">
        <svg class="plants-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          v-model="searchInput"
          type="text"
          placeholder="Search plants by name or scientific name..."
          class="plants-search-input"
          @input="onSearchInput"
        />
        <button
          v-if="searchInput"
          class="plants-search-clear"
          @click="clearSearch"
          title="Clear search"
        >×</button>
      </div>
    </div>

    <!-- Sort toggle -->
    <div class="plants-sort-row">
      <button
        class="plants-sort-btn"
        :class="{ 'plants-sort-btn--active': sortField === 'title' }"
        @click="toggleSort('title')"
      >
        Name{{ sortChevron('title') }}
      </button>
      <button
        class="plants-sort-btn"
        :class="{ 'plants-sort-btn--active': sortField === 'latin' }"
        @click="toggleSort('latin')"
      >
        Scientific Name{{ sortChevron('latin') }}
      </button>
      <button
        class="plants-sort-btn"
        :class="{ 'plants-sort-btn--active': sortField === 'type' }"
        @click="toggleSort('type')"
      >
        Type{{ sortChevron('type') }}
      </button>
      <button
        class="plants-sort-btn"
        :class="{ 'plants-sort-btn--active': sortField === 'updatedAt' }"
        @click="toggleSort('updatedAt')"
      >
        Updated{{ sortChevron('updatedAt') }}
      </button>
    </div>

    <!-- Loading (initial) -->
    <div v-if="loading && !plants.length" class="plants-loader">
      <LoadingSpinner :centered="true" size="md" />
    </div>

    <!-- Error -->
    <div v-else-if="error && !plants.length" class="plants-error">
      <p>Could not load plants. {{ error?.message || error || 'Please try again.' }}</p>
      <button class="dash-btn dash-btn--primary" @click="plantsStore.fetchPage(1)">Retry</button>
    </div>

    <!-- Plants grid -->
    <div v-else-if="plants.length" class="plants-grid">
      <router-link
        v-for="plant in plants"
        :key="plant.id"
        :to="`/manage/plant/${plant.attributes?.slug}`"
        class="plant-card"
      >
        <!-- Thumbnail -->
        <div class="plant-card__media">
          <img
            v-if="getThumbnailUrl(plant)"
            :src="getThumbnailUrl(plant)"
            :alt="plant.attributes?.title || 'Plant'"
            class="plant-card__img"
          />
          <div v-else class="plant-card__img-fallback">
            🌿
          </div>
          <!-- Clipart badge -->
          <span v-if="getFullClipUrl(plant)" class="plant-card__badge-clipart" title="Has clipart illustration">
            🖌️
          </span>
        </div>

        <!-- Info -->
        <div class="plant-card__body">
          <h3 class="plant-card__name">{{ plant.attributes?.title }}</h3>
          <p class="plant-card__latin">{{ plant.attributes?.latin }}</p>
          <span
            v-if="plant.attributes?.type"
            class="plant-card__type"
            :class="getTypeColor(plant.attributes.type)"
          >
            {{ plant.attributes.type }}
          </span>
        </div>
      </router-link>

      <!-- Load more button -->
      <div class="plants-load-more">
        <button
          v-if="!allLoaded"
          class="plants-load-more__btn"
          :disabled="loading"
          @click="loadMore"
        >
          <LoadingSpinner v-if="loading" :centered="true" size="sm" />
          <span v-else>Load More Plants</span>
        </button>
        <p v-else class="plants-load-more__done">
          All {{ pagination.total }} plants loaded ✓
        </p>
      </div>
    </div>

    <!-- Empty state (searched but nothing found) -->
    <div v-else-if="query && !loading" class="plants-empty">
      <div class="plants-empty-icon">🔍</div>
      <p class="plants-empty-text">No plants found for "<strong>{{ query }}</strong>"</p>
      <button class="dash-btn dash-btn--ghost" @click="clearSearch">Clear search</button>
    </div>
  </div>
</template>

<style scoped>
.plants-page {
  padding: 0;
}

/* ── Header ── */
.plants-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.plants-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  color: #376451;
  margin: 0;
  line-height: 1.15;
}

html.dark .plants-title {
  color: #c8dbbf;
}

.plants-count {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0.25rem 0 0;
}

html.dark .plants-count {
  color: #a0a8a0;
}

/* ── Search ── */
.plants-search-row {
  margin-bottom: 0.75rem;
}

.plants-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.plants-search-icon {
  position: absolute;
  left: 0.85rem;
  width: 1.1rem;
  height: 1.1rem;
  color: #9ca3af;
  pointer-events: none;
}

.plants-search-input {
  width: 100%;
  padding: 0.65rem 2.5rem 0.65rem 2.5rem;
  border: 1px solid #d4cfbf;
  border-radius: 0.75rem;
  background: #fff;
  color: #1f2937;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.plants-search-input:focus {
  border-color: #8aa37c;
  box-shadow: 0 0 0 3px rgba(138, 163, 124, 0.2);
}

html.dark .plants-search-input {
  background: #2d3e26;
  border-color: #3d4d36;
  color: #f5f5f5;
}

html.dark .plants-search-input:focus {
  border-color: #8aa37c;
  box-shadow: 0 0 0 3px rgba(138, 163, 124, 0.25);
}

.plants-search-clear {
  position: absolute;
  right: 0.6rem;
  width: 1.6rem;
  height: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #d4cfbf;
  color: #4a5a45;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.15s;
}

.plants-search-clear:hover {
  background: #c0baa7;
}

html.dark .plants-search-clear {
  background: #3d4d36;
  color: #f5f5f5;
}

html.dark .plants-search-clear:hover {
  background: #4d6044;
}

/* ── Sort row ── */
.plants-sort-row {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.plants-sort-btn {
  padding: 0.3rem 0.7rem;
  border: 1px solid #d4cfbf;
  border-radius: 999px;
  background: transparent;
  color: #6b7280;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.plants-sort-btn:hover {
  border-color: #8aa37c;
  color: #376451;
}

.plants-sort-btn--active {
  background: #d7e8c8;
  border-color: #8aa37c;
  color: #2f5233;
  font-weight: 600;
}

html.dark .plants-sort-btn {
  border-color: #3d4d36;
  color: #a0a8a0;
}

html.dark .plants-sort-btn:hover {
  border-color: #8aa37c;
  color: #c8dbbf;
}

html.dark .plants-sort-btn--active {
  background: rgba(138, 163, 124, 0.3);
  border-color: #8aa37c;
  color: #e6f0db;
}

/* ── Grid ── */
.plants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

/* ── Plant card ── */
.plant-card {
  display: flex;
  flex-direction: column;
  border-radius: 0.85rem;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2dccb;
  text-decoration: none;
  transition: box-shadow 0.2s, transform 0.15s;
  cursor: pointer;
}

.plant-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

html.dark .plant-card {
  background: rgba(255, 255, 255, 0.04);
  border-color: #3d4d36;
}

html.dark .plant-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.plant-card__media {
  position: relative;
  aspect-ratio: 1;
  background: #f0efe8;
  overflow: hidden;
}

html.dark .plant-card__media {
  background: #1a1a1a;
}

.plant-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plant-card__img-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
}

.plant-card__badge-clipart {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 1.6rem;
  height: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  font-size: 0.8rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.plant-card__body {
  padding: 0.65rem 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.plant-card__name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #376451;
  margin: 0;
  line-height: 1.2;
}

html.dark .plant-card__name {
  color: #c8dbbf;
}

.plant-card__latin {
  font-size: 0.8rem;
  font-style: italic;
  color: #6b7280;
  margin: 0;
  line-height: 1.3;
}

html.dark .plant-card__latin {
  color: #a0a8a0;
}

.plant-card__type {
  align-self: flex-start;
  margin-top: 0.3rem;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
}

/* ── Load more ── */
.plants-load-more {
  grid-column: 1 / -1;
  padding: 1.5rem 0;
  text-align: center;
}

.plants-load-more__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 2rem;
  border: 2px solid #8aa37c;
  border-radius: 999px;
  background: #fff;
  color: #2f5233;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 180px;
  min-height: 44px;
}

.plants-load-more__btn:hover:not(:disabled) {
  background: #d7e8c8;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(138, 163, 124, 0.3);
}

.plants-load-more__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

html.dark .plants-load-more__btn {
  background: rgba(255, 255, 255, 0.04);
  border-color: #8aa37c;
  color: #e6f0db;
}

html.dark .plants-load-more__btn:hover:not(:disabled) {
  background: rgba(138, 163, 124, 0.2);
}

.plants-load-more__done {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0;
}

html.dark .plants-load-more__done {
  color: #a0a8a0;
}

/* ── Loading (initial) ── */
.plants-loader {
  padding: 3rem 0;
}

/* ── Error ── */
.plants-error {
  text-align: center;
  padding: 3rem 1rem;
  color: #b91c1c;
}

html.dark .plants-error {
  color: #f87171;
}

/* ── Empty ── */
.plants-empty {
  text-align: center;
  padding: 3rem 1rem;
}

.plants-empty-icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.plants-empty-text {
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 1rem;
}

html.dark .plants-empty-text {
  color: #a0a8a0;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .plants-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}
</style>

<style>
/* Global dark-mode overrides on the view */
html.dark .plants-error {
  background: transparent;
}
</style>
