<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useGardensStore, useAuthStore } from '@/stores';
import { fetchWrapper } from '@/helpers';
import { getImageOrDefault } from '@/helpers/image-utils';
import { isProjectPubliclyVisible } from '@/_config/GardenConfig';

const gardensStore = useGardensStore();
const authStore = useAuthStore();
const { gardens } = storeToRefs(gardensStore);
const { user } = storeToRefs(authStore);

gardensStore.getAllPublic();

// Same chip vocabulary as the Projects list, framed around what gets someone
// through the gate: is there a workday soon, and is anything being built.
const filters = ['All', 'Workday this week', 'Active projects'];
const filter = ref('All');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const relationIds = (rel) => {
  const arr = rel?.data || rel || [];
  return (Array.isArray(arr) ? arr : []).map(x => x.id ?? x);
};

// ── Next workday per garden ──
// The public workday feed is the only place events and gardens meet without
// auth, so one fetch covers the whole list.
const nextWorkdayBySlug = ref({});

async function loadWorkdays() {
  try {
    const res = await fetchWrapper.get(
      `${import.meta.env.VITE_API_URL}/api/volunteer-days/public?populate[0]=garden&pagination[pageSize]=100`
    );
    const events = Array.isArray(res) ? res : (res?.data || []);
    const now = Date.now();
    const next = {};
    for (const e of events) {
      const slug = e?.garden?.slug;
      const t = e?.startDatetime ? new Date(e.startDatetime).getTime() : NaN;
      if (!slug || Number.isNaN(t) || t < now) continue;
      if (!next[slug] || t < next[slug].time) next[slug] = { time: t, id: e.id };
    }
    nextWorkdayBySlug.value = next;
  } catch (e) {
    // Cards still render without the workday line.
  }
}

// ── Near me ──
const here = ref(null);
const locating = ref(false);

function toggleNearMe() {
  if (here.value) {
    here.value = null;
    return;
  }
  if (!navigator.geolocation || locating.value) return;
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    pos => {
      here.value = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      locating.value = false;
    },
    () => { locating.value = false; },
    { maximumAge: 10 * 60 * 1000, timeout: 10000 }
  );
}

function milesTo(garden) {
  if (!here.value || garden?.latitude == null || garden?.longitude == null) return null;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(garden.latitude - here.value.lat);
  const dLng = toRad(garden.longitude - here.value.lng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(here.value.lat)) * Math.cos(toRad(garden.latitude)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatMiles(mi) {
  if (mi == null) return null;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

// ── Derived per-garden facts ──
function activeProjectCount(garden) {
  const list = Array.isArray(garden?.projects) ? garden.projects : [];
  const now = Date.now();
  return list.filter(p => {
    if (!isProjectPubliclyVisible(p)) return false;
    return !(p.date_end && new Date(p.date_end).getTime() < now);
  }).length;
}

function nextWorkday(garden) {
  return nextWorkdayBySlug.value[garden?.slug] || null;
}

function workdaySoon(garden) {
  const w = nextWorkday(garden);
  return !!w && w.time - Date.now() <= WEEK_MS;
}

function formatWhen(time) {
  const d = new Date(time);
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (!hasTime) return day;
  const t = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
  return `${day}, ${t}`;
}

function workdayBadge(garden) {
  const w = nextWorkday(garden);
  return w ? `Workday ${new Date(w.time).toLocaleDateString(undefined, { weekday: 'short' })}` : '';
}

function isMember(garden) {
  return !!user.value?.id && relationIds(garden?.volunteers).includes(user.value.id);
}

// The fallback picture is random, so pick it once per garden or every
// re-render (a filter tap) would reshuffle the photos.
const fallbackImages = {};

function gardenImage(garden) {
  const img = garden?.hero_image;
  const url = img?.formats?.medium?.url || img?.formats?.large?.url || img?.url;
  if (url) return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
  if (!fallbackImages[garden.id]) fallbackImages[garden.id] = getImageOrDefault(null);
  return fallbackImages[garden.id];
}

const listedGardens = computed(() => (Array.isArray(gardens.value) ? gardens.value : []));

const visibleGardens = computed(() => {
  let list = listedGardens.value;
  if (filter.value === 'Workday this week') list = list.filter(workdaySoon);
  if (filter.value === 'Active projects') list = list.filter(g => activeProjectCount(g) > 0);

  if (here.value) {
    return [...list].sort((a, b) => (milesTo(a) ?? Infinity) - (milesTo(b) ?? Infinity));
  }
  // Without a location, the soonest workday leads: it's the easiest way in.
  return [...list].sort((a, b) => (nextWorkday(a)?.time ?? Infinity) - (nextWorkday(b)?.time ?? Infinity));
});

// ── Sticky filter bar sits directly under the global nav ──
const navOffset = ref(0);

function measureNav() {
  const nav = document.querySelector('.gs-navbar');
  navOffset.value = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
}

onMounted(() => {
  loadWorkdays();
  measureNav();
  window.addEventListener('resize', measureNav);
});

onUnmounted(() => {
  window.removeEventListener('resize', measureNav);
});
</script>

<template>
  <div class="glist">

    <!-- Filter bar (the logo + hamburger row above it is the app's global nav) -->
    <div class="glist-bar" :style="{ top: `${navOffset}px` }">
      <div class="chip-row">
        <span class="chip chip--place">
          Oakland <span class="chip-count">{{ listedGardens.length }}</span>
        </span>
        <a href="mailto:volunteer@oufp.org?subject=Garden%20Steward%20in%20my%20city" class="chip chip--ghost">Your city?</a>
      </div>

      <div class="chip-row chip-row--status">
        <button
          v-for="f in filters"
          :key="f"
          type="button"
          class="chip chip--status"
          :class="{ 'is-selected': filter === f }"
          @click="filter = f"
        >{{ f }}</button>
        <button
          type="button"
          class="chip chip--status chip--near"
          :class="{ 'is-selected': here }"
          :disabled="locating"
          :aria-pressed="!!here"
          @click="toggleNearMe"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/>
          </svg>
          {{ locating ? 'Locating…' : 'Near me' }}
        </button>
      </div>
    </div>

    <!-- Intro -->
    <header class="glist-intro">
      <h1 class="glist-title">Community gardens</h1>
      <p class="glist-lede">
        Pick one close to you and come to a workday. No experience needed — tools, gloves and good company provided.
      </p>
    </header>

    <!-- Cards -->
    <div class="glist-cards">
      <article v-for="g in visibleGardens" :key="g.id" class="gcard">
        <router-link
          :to="`/gardens/${g.slug}`"
          class="gcard-photo"
          :style="{ backgroundImage: `url(${gardenImage(g)})` }"
          :aria-label="g.title"
        >
          <div class="gcard-badges">
            <span v-if="workdaySoon(g)" class="gbadge gbadge--workday">{{ workdayBadge(g) }}</span>
            <span v-if="activeProjectCount(g)" class="gbadge gbadge--projects">
              {{ activeProjectCount(g) }} {{ activeProjectCount(g) === 1 ? 'project' : 'projects' }}
            </span>
          </div>
          <span v-if="milesTo(g) != null" class="gbadge gbadge--distance">{{ formatMiles(milesTo(g)) }}</span>
        </router-link>

        <div class="gcard-body">
          <h3 class="gcard-name">
            <router-link :to="`/gardens/${g.slug}`">{{ g.title }}</router-link>
          </h3>
          <p v-if="g.blurb" class="gcard-line">{{ g.blurb }}</p>
          <p class="gcard-meta">
            <template v-if="nextWorkday(g)">Next workday · {{ formatWhen(nextWorkday(g).time) }}</template>
            <template v-else>No workdays scheduled yet</template>
          </p>

          <div class="gcard-actions">
            <!-- A status, not an action: the photo and name still open the garden -->
            <span v-if="isMember(g)" class="gcard-joined">
              <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
                <path fill="currentColor" d="M8.2 13.6 4.6 10l-1.2 1.2 4.8 4.8 9-9-1.2-1.2z"/>
              </svg>
              Joined!
            </span>
            <router-link v-else :to="`/gardens/${g.slug}`" class="gcard-btn">Visit garden</router-link>
            <span class="gcard-count">
              {{ relationIds(g.volunteers).length }}
              {{ relationIds(g.volunteers).length === 1 ? 'volunteer' : 'volunteers' }}
            </span>
          </div>
        </div>
      </article>

      <p v-if="gardens.loading" class="glist-state">Loading gardens…</p>
      <p v-else-if="gardens.error" class="glist-state">Couldn't load gardens. Try again in a moment.</p>
      <p v-else-if="!visibleGardens.length" class="glist-state">
        {{ filter === 'All' ? 'No gardens listed yet.' : `No gardens match “${filter.toLowerCase()}” right now.` }}
      </p>
    </div>

    <!-- Start in your city -->
    <div class="gcity">
      <p class="gcity-eyebrow">Outside Oakland</p>
      <h2 class="gcity-title">Bring a garden onto Garden Steward.</h2>
      <p class="gcity-body">
        Run a community garden somewhere else? Email us and we'll help you set up workdays, volunteer texts
        and projects for your neighbors.
      </p>
      <a href="mailto:volunteer@oufp.org?subject=Adding%20a%20garden%20to%20Garden%20Steward" class="gcity-btn">Email us about your garden</a>
    </div>

  </div>
</template>

<style scoped>
.glist {
  background: #f7f1e3;
  min-height: 100vh;
}

html.dark .glist {
  background: #121a12;
}

/* ── Filter bar (mirrors ProjectsPublicView) ───────── */
.glist-bar {
  position: sticky;
  z-index: 5;
  background: #f7f1e3;
  border-bottom: 1px solid #e0d7c4;
  padding-top: 10px;
}

html.dark .glist-bar {
  background: #121a12;
  border-bottom-color: #3d4d36;
}

.chip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.chip-row::-webkit-scrollbar {
  display: none;
}

.chip-row--status {
  padding-bottom: 12px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 9999px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
}

.chip--place {
  background: #064e3b;
  color: #fff;
  padding: 8px 14px;
  font-size: 13px;
}

.chip-count {
  opacity: 0.7;
  font-size: 11px;
}

.chip--ghost {
  background: transparent;
  color: #064e3b;
  border: 1px dashed #8aa37c;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

.chip--ghost:hover {
  text-decoration: none;
  color: #064e3b;
}

html.dark .chip--place {
  background: #8aa37c;
  color: #14281a;
}

html.dark .chip--ghost {
  color: #8aa37c;
}

.chip--status {
  padding: 7px 13px;
  font-size: 12.5px;
  background: transparent;
  color: #376451;
  border: 1px solid #c3cdb8;
  cursor: pointer;
}

.chip--status.is-selected {
  background: #064e3b;
  color: #fff;
  border-color: #064e3b;
}

.chip--status:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Near me is a sort, not one of the exclusive filters, so it sits apart. */
.chip--near {
  margin-left: 4px;
}

html.dark .chip--status {
  color: #c8dbbf;
  border-color: #3d4d36;
}

html.dark .chip--status.is-selected {
  background: #8aa37c;
  border-color: #8aa37c;
  color: #14281a;
}

/* ── Intro ─────────────────────────────────────────── */
.glist-intro {
  padding: 20px 16px 0;
}

.glist-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  color: #064e3b;
  margin: 0 0 6px;
}

.glist-lede {
  font-size: 14px;
  line-height: 1.55;
  color: #4b5563;
  margin: 0;
  max-width: 560px;
}

html.dark .glist-title {
  color: #f7f1e3;
}

html.dark .glist-lede {
  color: #cfd8c8;
}

/* ── Cards ─────────────────────────────────────────── */
.glist-cards {
  padding: 16px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.glist-state {
  margin: 0;
  font-size: 13px;
  color: #4b5563;
}

html.dark .glist-state {
  color: #cfd8c8;
}

.gcard {
  background: #fff;
  border: 1px solid #dcd3c0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(45, 62, 38, 0.06);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.gcard:hover {
  box-shadow: 0 6px 18px rgba(45, 62, 38, 0.12);
}

html.dark .gcard {
  background: #1f2d1a;
  border-color: #3d4d36;
}

html.dark .gcard:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
}

.gcard-photo {
  position: relative;
  display: block;
  height: 170px;
  background-color: #e4dccb;
  background-size: cover;
  background-position: center;
}

/* The cream placeholder is the brightest block on the page until a photo loads. */
html.dark .gcard-photo {
  background-color: #2a3826;
}

.gcard-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
  pointer-events: none;
}

/* Same pill as the project overlay badges (projectBadgeOverlayBaseClasses). */
.gbadge {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.02em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.gbadge--workday {
  background: #F5C430;
  color: #3d2c00;
}

.gbadge--projects {
  background: #8aa37c;
  color: #14281a;
}

.gbadge--distance {
  position: absolute;
  right: 10px;
  bottom: 10px;
  background: rgba(20, 40, 26, 0.82);
  color: #f7f1e3;
}

.gcard-body {
  padding: 13px 14px 14px;
}

.gcard-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.25;
  margin: 0 0 5px;
}

.gcard-name a {
  color: #064e3b;
  text-decoration: none;
}

.gcard-name a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

html.dark .gcard-name a {
  color: #c8dbbf;
}

.gcard-line {
  font-size: 13.5px;
  line-height: 1.5;
  color: #4b5563;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

html.dark .gcard-line {
  color: #cfd8c8;
}

.gcard-meta {
  font-size: 12.5px;
  color: #6c8a6a;
  margin: 0 0 12px;
}

html.dark .gcard-meta {
  color: #8aa37c;
}

.gcard-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gcard-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 9999px;
  font-size: 14.5px;
  font-weight: 700;
  text-decoration: none;
  background: #064e3b;
  color: #fff;
  border: 1px solid #064e3b;
}

.gcard-btn:hover {
  background: #053f30;
  color: #fff;
  text-decoration: none;
}

/* Flat and borderless so it reads as a label next to the real buttons. */
.gcard-joined {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  font-size: 14.5px;
  font-weight: 700;
  color: #376451;
  cursor: default;
  user-select: none;
}

.gcard-count {
  font-size: 12.5px;
  color: #4b5563;
  white-space: nowrap;
}

/*
 * Emerald reads as a button on cream but disappears into a dark card, so the
 * dark theme promotes sage to the primary action — same as the Projects list.
 */
html.dark .gcard-btn {
  background: #8aa37c;
  color: #14281a;
  border-color: #8aa37c;
}

html.dark .gcard-btn:hover {
  background: #9cb48e;
}

html.dark .gcard-joined {
  color: #8aa37c;
}

html.dark .gcard-count {
  color: #cfd8c8;
}

/* ── Wider screens ─────────────────────────────────── */
@media (min-width: 700px) {
  .chip-row,
  .glist-intro {
    max-width: 1080px;
    margin-left: auto;
    margin-right: auto;
  }

  .glist-intro {
    padding: 28px 24px 0;
  }

  .glist-title {
    font-size: 32px;
  }

  .glist-lede {
    font-size: 15px;
  }

  .glist-cards {
    max-width: 1080px;
    margin: 0 auto;
    padding: 20px 24px 8px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .glist-state {
    grid-column: 1 / -1;
  }

  .gcard {
    display: flex;
    flex-direction: column;
  }

  .gcard:hover {
    transform: translateY(-2px);
  }

  .gcard-photo {
    height: auto;
    aspect-ratio: 16 / 10;
  }

  .gcard-body {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .gcard-actions {
    margin-top: auto;
  }
}

@media (min-width: 1000px) {
  .glist-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ── Start in your city ────────────────────────────── */
.gcity {
  margin: 12px 16px 46px;
  background: #344a34;
  border-radius: 14px;
  padding: 22px 18px;
  text-align: center;
}

.gcity-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #8aa37c;
}

.gcity-title {
  margin: 0 0 8px;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 21px;
  font-weight: 700;
  color: #f7f1e3;
}

.gcity-body {
  margin: 0 auto 16px;
  max-width: 520px;
  font-size: 13.5px;
  line-height: 1.6;
  color: #cfd8c8;
}

.gcity-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #C2410C;
  color: #fff;
  border-radius: 9999px;
  padding: 13px 24px;
  font-size: 15px;
  font-weight: 700;
  min-height: 44px;
  box-sizing: border-box;
  text-decoration: none;
}

.gcity-btn:hover {
  background: #9a330a;
  color: #fff;
  text-decoration: none;
}

@media (min-width: 700px) {
  .gcity {
    max-width: 1080px;
    margin: 20px auto 56px;
    padding: 30px 24px;
  }
}
</style>
