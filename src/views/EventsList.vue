<script setup>
import { storeToRefs } from 'pinia';
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useEventStore } from '@/stores';
import { getImageOrDefault } from '@/helpers/image-utils';
import { titleWithoutDate } from '@/helpers/event-utils';
import '@/assets/garden-public.css';

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const { events, eventsPagination } = storeToRefs(eventStore);

// The public feed is small, so take it in one page and filter here.
eventStore.fetchPublic(1, 100);

const isLoading = computed(() => !!events.value?.loading);
const loadFailed = computed(() => !!events.value?.error);
const allEvents = computed(() => (Array.isArray(events.value) ? events.value : []));

const isLoadingMore = ref(false);
const hasMore = computed(() => eventsPagination.value?.page < eventsPagination.value?.pageCount);
const loadMore = async () => {
  isLoadingMore.value = true;
  try {
    await eventStore.loadMoreEvents();
  } finally {
    isLoadingMore.value = false;
  }
};

/* ---------- Filters (kept in the URL so a filtered view can be shared) ---------- */

const when = computed(() => (route.query.when === 'past' ? 'past' : 'upcoming'));
const gardenSlug = computed(() => (typeof route.query.garden === 'string' ? route.query.garden : ''));

const setFilter = (patch) => {
  const query = { ...route.query, ...patch };
  Object.keys(query).forEach((k) => { if (!query[k] || (k === 'when' && query[k] === 'upcoming')) delete query[k]; });
  router.replace({ query });
};

const now = new Date();
const isPast = (e) => new Date(e.startDatetime) < now;

const inWhen = computed(() => allEvents.value
  .filter((e) => e.startDatetime && (when.value === 'past' ? isPast(e) : !isPast(e)))
  .sort((a, b) => {
    const diff = new Date(a.startDatetime) - new Date(b.startDatetime);
    return when.value === 'past' ? -diff : diff;
  }));

const upcomingCount = computed(() => allEvents.value.filter((e) => e.startDatetime && !isPast(e)).length);
const pastCount = computed(() => allEvents.value.filter((e) => e.startDatetime && isPast(e)).length);

// Garden chips: only gardens with something in the current time range, busiest first.
const gardenOptions = computed(() => {
  const byslug = new Map();
  inWhen.value.forEach((e) => {
    const g = e.garden;
    if (!g?.slug) return;
    const entry = byslug.get(g.slug) || { slug: g.slug, title: g.title, count: 0 };
    entry.count += 1;
    byslug.set(g.slug, entry);
  });
  return [...byslug.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
});

const filtered = computed(() => (gardenSlug.value
  ? inWhen.value.filter((e) => e.garden?.slug === gardenSlug.value)
  : inWhen.value));

const activeGardenTitle = computed(() => gardenOptions.value.find((g) => g.slug === gardenSlug.value)?.title
  || allEvents.value.find((e) => e.garden?.slug === gardenSlug.value)?.garden?.title
  || '');

// Upcoming leads with the next event as a feature card; the rest group by month.
const featured = computed(() => {
  if (when.value !== 'upcoming') return null;
  return filtered.value.find((e) => !e.canceled) || null;
});

const monthGroups = computed(() => {
  const groups = [];
  filtered.value.forEach((e) => {
    if (featured.value && e.id === featured.value.id) return;
    const d = new Date(e.startDatetime);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), events: [] };
      groups.push(group);
    }
    group.events.push(e);
  });
  return groups;
});

/* ---------- Display helpers ---------- */

const chipMonth = (s) => new Date(s).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
const chipDay = (s) => new Date(s).getDate();
const timeOf = (s) => new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const weekdayTime = (s) => `${new Date(s).toLocaleDateString('en-US', { weekday: 'short' })} · ${timeOf(s)}`;
const longWhen = (s) => `${new Date(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ${timeOf(s)}`;

const relativeDay = (s) => {
  const start = new Date(s);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  const days = Math.round((day - today) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return `In ${days} days`;
  return '';
};

const placeOf = (e) => e.garden?.title || e.location_name || '';
const hostOf = (e) => e.garden?.organization?.title || '';

const imageOf = (e, size = 'small') => {
  const img = e?.hero_image || e?.garden?.hero_image;
  const url = img?.formats?.[size]?.url || img?.formats?.small?.url || img?.formats?.thumbnail?.url || img?.url;
  if (url && url.startsWith('/') && import.meta.env.VITE_API_URL) return `${import.meta.env.VITE_API_URL}${url}`;
  return getImageOrDefault(url || null);
};

const plainBlurb = (e) => (e.blurb || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
</script>

<template>
  <div class="evl-page">
    <header class="evl-head">
      <div class="evl-wrap">
        <p class="gp-label gp-label--accent">Events</p>
        <h1 class="evl-title">Workdays &amp; gatherings</h1>
        <p class="evl-sub">
          Harvests, build days and restoration in community gardens near you.
          Everyone's welcome, no experience needed.
        </p>
      </div>
    </header>

    <div class="evl-wrap">
      <!-- Filters -->
      <div class="evl-filters">
        <div class="evl-seg" role="tablist" aria-label="When">
          <button
            type="button"
            role="tab"
            class="evl-seg-btn"
            :class="{ 'is-active': when === 'upcoming' }"
            :aria-selected="when === 'upcoming'"
            @click="setFilter({ when: 'upcoming', garden: '' })"
          >
            Upcoming<span v-if="!isLoading" class="evl-count">{{ upcomingCount }}</span>
          </button>
          <button
            type="button"
            role="tab"
            class="evl-seg-btn"
            :class="{ 'is-active': when === 'past' }"
            :aria-selected="when === 'past'"
            @click="setFilter({ when: 'past', garden: '' })"
          >
            Past<span v-if="!isLoading" class="evl-count">{{ pastCount }}</span>
          </button>
        </div>

        <div v-if="gardenOptions.length > 1 || gardenSlug" class="evl-chips" aria-label="Filter by garden">
          <button
            type="button"
            class="evl-chip"
            :class="{ 'is-active': !gardenSlug }"
            :aria-pressed="!gardenSlug"
            @click="setFilter({ garden: '' })"
          >All gardens</button>
          <button
            v-for="g in gardenOptions"
            :key="g.slug"
            type="button"
            class="evl-chip"
            :class="{ 'is-active': gardenSlug === g.slug }"
            :aria-pressed="gardenSlug === g.slug"
            @click="setFilter({ garden: gardenSlug === g.slug ? '' : g.slug })"
          >{{ g.title }}</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="evl-list" aria-hidden="true">
        <div v-for="n in 3" :key="n" class="evl-skeleton animate-pulse"></div>
      </div>

      <p v-else-if="loadFailed" class="evl-empty">Couldn't load events. Try refreshing the page.</p>

      <template v-else>
        <!-- Next up -->
        <router-link v-if="featured" :to="`/d/${featured.id}`" class="evl-feature">
          <img :src="imageOf(featured, 'medium')" :alt="placeOf(featured)" class="evl-feature-img" />
          <div class="evl-feature-body">
            <p class="gp-label gp-label--accent">
              Next up<template v-if="relativeDay(featured.startDatetime)"> · {{ relativeDay(featured.startDatetime) }}</template>
            </p>
            <h2 class="evl-feature-title">{{ titleWithoutDate(featured.title) }}</h2>
            <p class="evl-feature-when">{{ longWhen(featured.startDatetime) }}</p>
            <p v-if="placeOf(featured)" class="evl-feature-place">
              <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
              {{ placeOf(featured) }}<template v-if="hostOf(featured)"> · {{ hostOf(featured) }}</template>
            </p>
            <p v-if="plainBlurb(featured)" class="evl-feature-blurb">{{ plainBlurb(featured) }}</p>
            <span class="gp-btn gp-btn-primary gp-btn-sm evl-feature-cta">
              View &amp; RSVP
              <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </div>
        </router-link>

        <!-- Month groups -->
        <section v-for="group in monthGroups" :key="group.key" class="evl-month">
          <h2 class="evl-month-title">{{ group.label }}</h2>
          <div class="evl-list">
            <router-link
              v-for="e in group.events"
              :key="e.id"
              :to="`/d/${e.id}`"
              class="evl-row"
              :class="{ 'is-canceled': e.canceled, 'is-past': when === 'past' }"
            >
              <span class="gp-datechip">
                <span class="gp-datechip-month">{{ chipMonth(e.startDatetime) }}</span>
                <span class="gp-datechip-day">{{ chipDay(e.startDatetime) }}</span>
              </span>
              <span class="evl-row-body">
                <span class="evl-row-meta">
                  {{ weekdayTime(e.startDatetime) }}
                  <template v-if="placeOf(e)"> · <span class="evl-row-place">{{ placeOf(e) }}</span></template>
                </span>
                <span class="evl-row-title">
                  {{ titleWithoutDate(e.title) }}
                  <span v-if="e.canceled" class="evl-pill">Canceled</span>
                </span>
                <span v-if="plainBlurb(e)" class="evl-row-blurb">{{ plainBlurb(e) }}</span>
              </span>
              <img :src="imageOf(e)" alt="" class="evl-row-img" loading="lazy" />
            </router-link>
          </div>
        </section>

        <div v-if="!featured && !monthGroups.length" class="evl-empty">
          <template v-if="when === 'upcoming'">
            Nothing on the calendar<template v-if="activeGardenTitle"> at {{ activeGardenTitle }}</template> yet.
            <button v-if="pastCount" type="button" class="evl-textbtn" @click="setFilter({ when: 'past' })">See past events</button>
          </template>
          <template v-else>No past events<template v-if="activeGardenTitle"> at {{ activeGardenTitle }}</template>.</template>
        </div>

        <button v-if="hasMore" type="button" class="gp-btn gp-btn-outline evl-more" :disabled="isLoadingMore" @click="loadMore">
          {{ isLoadingMore ? 'Loading…' : 'Load more events' }}
        </button>
      </template>
    </div>
  </div>
</template>

<style>
.evl-page {
  min-height: 100vh;
  padding-bottom: 64px;
  background-color: #ffffff;
  color: #1f2a1f;
  font-family: Roboto, system-ui, sans-serif;
}

.dark .evl-page {
  background-color: #2d3e26;
  color: #f5f5f5;
}

.evl-wrap {
  box-sizing: border-box;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Header */
.evl-head {
  padding: 48px 0 36px;
  background-color: #f7f1e3;
  border-bottom: 1px solid #e0d6c4;
}

.dark .evl-head {
  background-color: #344a34;
  border-bottom-color: #3d4d36;
}

.evl-title {
  margin: 8px 0 10px;
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: clamp(2rem, 4.5vw, 3rem);
  line-height: 1.1;
  color: #064e3b;
}

.dark .evl-title {
  color: #f5f5f5;
}

.evl-sub {
  max-width: 56ch;
  margin: 0;
  font-size: 1.0625rem;
  line-height: 1.6;
  color: #4b5563;
}

.dark .evl-sub {
  color: #d0d0d0;
}

/* Filters */
.evl-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  padding: 24px 0 8px;
}

.evl-seg {
  display: inline-flex;
  padding: 4px;
  border-radius: 9999px;
  background-color: #eef1ea;
}

.dark .evl-seg {
  background-color: #1f2d1a;
}

.evl-seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.evl-seg-btn.is-active {
  background-color: #ffffff;
  color: #064e3b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.dark .evl-seg-btn {
  color: #c5d4b8;
}

.dark .evl-seg-btn.is-active {
  background-color: #8aa37c;
  color: #1f2a1f;
}

.evl-count {
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.6;
}

.evl-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.evl-chip {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #c8d0c0;
  border-radius: 9999px;
  background-color: transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: #376451;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.evl-chip:hover {
  border-color: #376451;
}

.evl-chip.is-active {
  border-color: #064e3b;
  background-color: #064e3b;
  color: #ffffff;
}

.dark .evl-chip {
  border-color: #6c8a6a;
  color: #c5d4b8;
}

.dark .evl-chip.is-active {
  border-color: #8aa37c;
  background-color: #8aa37c;
  color: #1f2a1f;
}

.evl-seg-btn:focus-visible,
.evl-chip:focus-visible,
.evl-row:focus-visible,
.evl-feature:focus-visible,
.evl-textbtn:focus-visible {
  outline: 3px solid #8aa37c;
  outline-offset: 2px;
}

/* Next up */
.evl-feature {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  margin-top: 20px;
  overflow: hidden;
  border: 1px solid #c8d0c0;
  border-radius: 16px;
  background-color: #f7f1e3;
  color: inherit;
  text-decoration: none;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.evl-feature:hover {
  color: inherit;
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.1);
}

.dark .evl-feature {
  background-color: #344a34;
  border-color: #3d4d36;
}

.evl-feature-img {
  width: 100%;
  height: 100%;
  min-height: 240px;
  object-fit: cover;
}

.evl-feature-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 28px;
}

.evl-feature-title {
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.15;
  color: #1f2a1f;
}

.dark .evl-feature-title {
  color: #f5f5f5;
}

.evl-feature-when {
  margin: 0;
  font-weight: 700;
  color: #064e3b;
}

.dark .evl-feature-when {
  color: #c5d4b8;
}

.evl-feature-place {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 0.9375rem;
  color: #4b5563;
}

.evl-feature-place .gp-icon {
  width: 16px;
  height: 16px;
}

.dark .evl-feature-place {
  color: #d0d0d0;
}

.evl-feature-blurb {
  margin: 4px 0 0;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: #4b5563;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dark .evl-feature-blurb {
  color: #d0d0d0;
}

.evl-feature-cta {
  align-self: flex-start;
  margin-top: auto;
}

.evl-feature .evl-feature-cta {
  margin-top: 12px;
}

.evl-feature-cta .gp-icon {
  width: 16px;
  height: 16px;
}

/* Month groups */
.evl-month {
  margin-top: 36px;
}

.evl-month-title {
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #c8d0c0;
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: 1.375rem;
  color: #376451;
}

.dark .evl-month-title {
  color: #f5f5f5;
  border-bottom-color: #3d4d36;
}

.evl-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.evl-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px;
  border-radius: 14px;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.evl-row:hover {
  color: inherit;
  text-decoration: none;
  background-color: #f3f5ef;
}

.dark .evl-row:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.evl-row:hover .evl-row-title {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.evl-row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.evl-row-meta {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #4b5563;
}

.evl-row-place {
  color: #376451;
}

.dark .evl-row-meta {
  color: #a8b89e;
}

.dark .evl-row-place {
  color: #c5d4b8;
}

.evl-row-title {
  font-size: 1.0625rem;
  font-weight: 700;
  line-height: 1.3;
  color: #1f2a1f;
}

.dark .evl-row-title {
  color: #f5f5f5;
}

.evl-row-blurb {
  font-size: 0.875rem;
  line-height: 1.5;
  color: #4b5563;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dark .evl-row-blurb {
  color: #d0d0d0;
}

.evl-row-img {
  flex: none;
  width: 128px;
  height: 88px;
  border-radius: 10px;
  object-fit: cover;
}

.evl-row.is-past .evl-row-img {
  filter: saturate(0.6);
}

.evl-row.is-canceled .evl-row-title {
  text-decoration: line-through;
  color: #6b7280;
}

.evl-pill {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: #fde8dc;
  color: #9a3412;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  vertical-align: middle;
}

/* States */
.evl-skeleton {
  height: 104px;
  margin-top: 16px;
  border-radius: 14px;
  background-color: #eef1ea;
}

.dark .evl-skeleton {
  background-color: #344a34;
}

.evl-empty {
  margin: 48px 0;
  font-size: 1rem;
  color: #4b5563;
}

.dark .evl-empty {
  color: #d0d0d0;
}

.evl-textbtn {
  margin-left: 6px;
  padding: 0;
  border: 0;
  background: none;
  font-weight: 700;
  color: #064e3b;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.dark .evl-textbtn {
  color: #c5d4b8;
}

.evl-more {
  margin-top: 28px;
}

@media (max-width: 720px) {
  .evl-head {
    padding: 32px 0 24px;
  }

  .evl-wrap {
    padding: 0 16px;
  }

  .evl-chips {
    flex-wrap: nowrap;
    width: calc(100% + 32px);
    margin: 0 -16px;
    padding: 0 16px 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .evl-chip {
    flex: none;
  }

  .evl-feature {
    grid-template-columns: 1fr;
  }

  .evl-feature-img {
    min-height: 0;
    aspect-ratio: 16 / 9;
  }

  .evl-feature-body {
    padding: 20px;
  }

  .evl-row {
    gap: 14px;
    padding: 12px 4px;
  }

  .evl-row-img {
    display: none;
  }
}
</style>
