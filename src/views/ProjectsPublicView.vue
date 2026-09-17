<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useProjectsStore, useAuthStore } from '@/stores';
import {
  projectStatusOptions,
  resolveProjectStatus,
  getProjectStatusOverlayClasses,
  getProjectCategoryOverlayClasses
} from '@/_config/GardenConfig';

const projectsStore = useProjectsStore();
const authStore = useAuthStore();
const router = useRouter();
const { communityProjects } = storeToRefs(projectsStore);
const { user } = storeToRefs(authStore);

projectsStore.getAllProjects();

// One row of status chips is the whole filter UI at this many projects.
// Category, distance and skill filters can join the same scrolling row later.
const statusFilters = ['All', ...projectStatusOptions.map(o => o.value)];
const filter = ref('All');

/** Optimistic overrides for the interest toggle, keyed by project id. */
const joined = ref({});
const togglingId = ref(null);

const relationIds = (rel) => {
  const arr = rel?.data || rel || [];
  return (Array.isArray(arr) ? arr : []).map(x => x.id ?? x);
};

const listedProjects = computed(() => {
  const list = Array.isArray(communityProjects.value) ? communityProjects.value : [];
  return list.filter(p => !['REJECTED', 'ARCHIVED'].includes(p.review_status));
});

const visibleProjects = computed(() => {
  if (filter.value === 'All') return listedProjects.value;
  return listedProjects.value.filter(p => resolveProjectStatus(p) === filter.value);
});

function projectImage(project) {
  const img = project?.hero_image;
  const url = img?.formats?.medium?.url || img?.formats?.small?.url || img?.url;
  if (!url) return '';
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
}

function gardenName(project) {
  const g = project?.garden;
  return (g && typeof g === 'object') ? (g.title || '') : '';
}

function projectLink(project) {
  const g = project?.garden;
  const gardenSlug = (g && typeof g === 'object') ? g.slug : null;
  if (gardenSlug && project.slug) return `/gardens/${gardenSlug}/p/${project.slug}`;
  return null;
}

function formatWhen(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (!hasTime) return day;
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
  return `${day}, ${time}`;
}

/**
 * Where and when the next work is — the line that decides whether someone
 * shows up, and the main thing this list adds over the homepage. Derived from
 * the next scheduled event on the project, falling back to its start date.
 */
function nextWork(project) {
  const events = Array.isArray(project?.related_events) ? project.related_events : [];
  const now = Date.now();
  const upcoming = events
    .filter(e => e?.startDatetime && new Date(e.startDatetime).getTime() >= now)
    .sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime))[0];

  const when = upcoming
    ? formatWhen(upcoming.startDatetime)
    : (project?.date_start ? formatWhen(project.date_start) : null);

  return [gardenName(project), when].filter(Boolean).join(' · ') || null;
}

function isInterested(project) {
  if (project.id in joined.value) return joined.value[project.id];
  return relationIds(project.interested).includes(user.value?.id);
}

function interestedCount(project) {
  const base = relationIds(project.interested).length;
  if (!(project.id in joined.value)) return base;
  const wasIn = relationIds(project.interested).includes(user.value?.id);
  const isIn = joined.value[project.id];
  if (isIn === wasIn) return base;
  return base + (isIn ? 1 : -1);
}

async function toggleInterest(project) {
  // Interest is attached to a user account, so signed-out visitors sign in first.
  if (!user.value?.id) {
    authStore.returnUrl = '/projects';
    router.push('/login');
    return;
  }
  if (togglingId.value) return;
  togglingId.value = project.id;

  const ids = relationIds(project.interested);
  const wasIn = ids.includes(user.value.id);
  const next = wasIn ? ids.filter(id => id !== user.value.id) : [...ids, user.value.id];
  joined.value = { ...joined.value, [project.id]: !wasIn };

  try {
    await projectsStore.update(project.id, { interested: next });
    await projectsStore.getAllProjects();
    // The refreshed record is now authoritative.
    const rest = { ...joined.value };
    delete rest[project.id];
    joined.value = rest;
  } catch (e) {
    // Roll the optimistic toggle back; the store surfaces its own alert.
    joined.value = { ...joined.value, [project.id]: wasIn };
  } finally {
    togglingId.value = null;
  }
}

// ── Sticky filter bar sits directly under the global nav ──
const navOffset = ref(0);

function measureNav() {
  const nav = document.querySelector('.gs-navbar');
  navOffset.value = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
}

onMounted(() => {
  measureNav();
  window.addEventListener('resize', measureNav);
});

onUnmounted(() => {
  window.removeEventListener('resize', measureNav);
});
</script>

<template>
  <div class="plist">

    <!-- Filter bar (the logo + hamburger row above it is the app's global nav) -->
    <div class="plist-bar" :style="{ top: `${navOffset}px` }">
      <div class="chip-row">
        <span class="chip chip--place">
          Oakland <span class="chip-count">{{ listedProjects.length }}</span>
        </span>
        <router-link to="/join" class="chip chip--ghost">Your city?</router-link>
      </div>

      <div class="chip-row chip-row--status">
        <button
          v-for="f in statusFilters"
          :key="f"
          type="button"
          class="chip chip--status"
          :class="{ 'is-selected': filter === f }"
          @click="filter = f"
        >{{ f }}</button>
      </div>
    </div>

    <!-- Cards -->
    <div class="plist-cards">
      <article v-for="p in visibleProjects" :key="p.id" class="pcard">
        <component
          :is="projectLink(p) ? 'router-link' : 'div'"
          :to="projectLink(p) || undefined"
          class="pcard-photo"
          :style="projectImage(p) ? { backgroundImage: `url(${projectImage(p)})` } : null"
        >
          <div class="pcard-badges">
            <span :class="getProjectStatusOverlayClasses(resolveProjectStatus(p))">
              {{ resolveProjectStatus(p) }}
            </span>
            <span v-if="p.category" :class="getProjectCategoryOverlayClasses(p.category)">
              {{ p.category }}
            </span>
          </div>
        </component>

        <div class="pcard-body">
          <h3 class="pcard-name">{{ p.title }}</h3>
          <p class="pcard-line">{{ p.short_description }}</p>
          <p v-if="nextWork(p)" class="pcard-meta">{{ nextWork(p) }}</p>

          <div class="pcard-actions">
            <button
              type="button"
              class="pcard-btn"
              :class="{ 'is-in': isInterested(p) }"
              :disabled="togglingId === p.id"
              @click="toggleInterest(p)"
            >{{ isInterested(p) ? "You're in" : "I'm interested" }}</button>
            <span class="pcard-count">{{ interestedCount(p) }} interested</span>
          </div>
        </div>
      </article>

      <p v-if="communityProjects.loading" class="plist-state">Loading projects…</p>
      <p v-else-if="!visibleProjects.length" class="plist-state">
        No {{ filter === 'All' ? '' : filter.toLowerCase() + ' ' }}projects right now.
      </p>
    </div>

    <!-- Start in your city -->
    <div class="pcity">
      <p class="pcity-eyebrow">Outside Oakland</p>
      <h2 class="pcity-title">Start the first project in your city.</h2>
      <p class="pcity-body">
        Each SMS number is its own cooperative of local projects. Pitch one and we'll help
        you stand it up.
      </p>
      <router-link to="/join" class="pcity-btn">Pitch a project</router-link>
    </div>

  </div>
</template>

<style scoped>
.plist {
  background: #f7f1e3;
  min-height: 100vh;
}

:global(.dark) .plist {
  background: #121a12;
}

/* ── Filter bar ────────────────────────────────────── */
.plist-bar {
  position: sticky;
  z-index: 5;
  background: #f7f1e3;
  border-bottom: 1px solid #e0d7c4;
  padding-top: 10px;
}

:global(.dark) .plist-bar {
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

:global(.dark) .chip--ghost {
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

:global(.dark) .chip--status {
  color: #c8dbbf;
  border-color: #3d4d36;
}

:global(.dark) .chip--status.is-selected {
  background: #064e3b;
  border-color: #064e3b;
  color: #fff;
}

/* ── Cards ─────────────────────────────────────────── */
.plist-cards {
  padding: 16px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plist-state {
  margin: 0;
  font-size: 13px;
  color: #4b5563;
}

:global(.dark) .plist-state {
  color: #cfd8c8;
}

.pcard {
  background: #fff;
  border: 1px solid #dcd3c0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(45, 62, 38, 0.06);
}

:global(.dark) .pcard {
  background: #1f2d1a;
  border-color: #3d4d36;
}

.pcard-photo {
  position: relative;
  display: block;
  height: 160px;
  background-color: #e4dccb;
  background-size: cover;
  background-position: center;
}

.pcard-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
  pointer-events: none;
}

.pcard-body {
  padding: 13px 14px 14px;
}

.pcard-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  color: #064e3b;
  margin: 0 0 5px;
}

:global(.dark) .pcard-name {
  color: #c8dbbf;
}

.pcard-line {
  font-size: 13.5px;
  line-height: 1.5;
  color: #4b5563;
  margin: 0 0 8px;
}

:global(.dark) .pcard-line {
  color: #cfd8c8;
}

.pcard-meta {
  font-size: 12.5px;
  color: #6c8a6a;
  margin: 0 0 12px;
}

.pcard-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pcard-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 9999px;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  background: #064e3b;
  color: #fff;
  border: 1px solid #064e3b;
}

.pcard-btn.is-in {
  background: #f3ece0;
  color: #064e3b;
  border-color: #8aa37c;
}

.pcard-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.pcard-count {
  font-size: 12.5px;
  color: #4b5563;
  white-space: nowrap;
}

:global(.dark) .pcard-count {
  color: #cfd8c8;
}

/* ── Start in your city ────────────────────────────── */
.pcity {
  margin: 12px 16px 46px;
  background: #344a34;
  border-radius: 14px;
  padding: 22px 18px;
  text-align: center;
}

.pcity-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #8aa37c;
}

.pcity-title {
  margin: 0 0 8px;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 21px;
  font-weight: 700;
  color: #f7f1e3;
}

.pcity-body {
  margin: 0 0 16px;
  font-size: 13.5px;
  line-height: 1.6;
  color: #cfd8c8;
}

.pcity-btn {
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

.pcity-btn:hover {
  background: #9a330a;
  color: #fff;
  text-decoration: none;
}
</style>
