<script setup>
import ManageLayout from '@/components/ManageLayout.vue';
import EmailLink from '@/components/EmailLink.vue';
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useProjectsStore, useAuthStore } from '@/stores';
import ProjectAlertSignup from '@/components/ProjectAlertSignup.vue';
import PhotoStack from '@/components/PhotoStack.vue';
import { toPhotoSet } from '@/helpers/image-utils';
import {
  projectStatusOptions,
  resolveProjectStatus,
  isProjectPubliclyVisible
} from '@/_config/GardenConfig';

const projectsStore = useProjectsStore();
const authStore = useAuthStore();
const { publicProjects } = storeToRefs(projectsStore);
const { user } = storeToRefs(authStore);

Promise.allSettled([projectsStore.getPublicProjects()]);

const statusFilters = ['All', ...projectStatusOptions.map(o => o.value)];
const filter = ref('All');

const pendingInterest = ref(null);
const togglingId = computed(() => pendingInterest.value?.id);

const listedProjects = computed(() => {
  const list = Array.isArray(publicProjects.value) ? publicProjects.value : [];
  return list.filter(isProjectPubliclyVisible);
});

const visibleProjects = computed(() => {
  if (filter.value === 'All') return listedProjects.value;
  return listedProjects.value.filter(p => resolveProjectStatus(p) === filter.value);
});

function projectPhotos(project) {
  return toPhotoSet([project.hero_image, ...(project.featured_gallery || [])], `Photo for ${project.title}`);
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

function parseProjectDate(value) {
  if (typeof value !== 'string') return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatWhen(value) {
  const date = parseProjectDate(value);
  if (!date) return null;
  const day = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return day;
  if (date.getHours() === 0 && date.getMinutes() === 0) return day;
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
  return `${day}, ${time}`;
}

function nextWork(project) {
  const events = Array.isArray(project?.related_events) ? project.related_events : [];
  const now = Date.now();
  const upcoming = events
    .filter(event => event?.startDatetime && new Date(event.startDatetime).getTime() >= now)
    .sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime))[0];
  if (upcoming) return `Next event · ${formatWhen(upcoming.startDatetime)}`;

  const start = parseProjectDate(project?.date_start);
  if (start && start.getTime() > now) return `Project starts · ${formatWhen(project.date_start)}`;
  return null;
}

function displayedInterest(project) {
  if (pendingInterest.value?.id === project.id) return pendingInterest.value.state;
  return projectsStore.interestState(project);
}

function isInterested(project) {
  return displayedInterest(project).isInterested;
}

function interestedCount(project) {
  return displayedInterest(project).count;
}

async function toggleInterest(project) {
  if (!user.value?.id) {
    authStore.openLoginModal('/projects');
    return;
  }
  if (pendingInterest.value) return;
  const previous = projectsStore.interestState(project);
  let count = previous.count - 1;
  if (!previous.isInterested) count = previous.count + 1;
  pendingInterest.value = { id: project.id, state: { count, isInterested: !previous.isInterested } };
  try {
    await projectsStore.toggleInterest(project.id);
  } catch {
    return;
  } finally {
    pendingInterest.value = null;
  }
}

</script>

<template>
  <ManageLayout v-slot="{ openPitch }">
  <div class="plist">
    <header class="plist-heading">
      <h1>Projects</h1>
      <p>Garden builds, plantings and restoration work underway near you. Find one to join.</p>
    </header>

    <div class="plist-toolbar">
      <div class="plist-filters" role="group" aria-label="Project status">
        <button v-for="status in statusFilters" :key="status" type="button" :class="{ 'is-selected': filter === status }" :aria-pressed="filter === status" :disabled="!Array.isArray(publicProjects)" @click="filter = status">{{ status }}</button>
      </div>
      <button type="button" class="plist-add" @click="openPitch">+ Add project</button>
    </div>
    <p v-if="Array.isArray(publicProjects)" class="plist-place">Oakland · {{ listedProjects.length }} <span v-if="listedProjects.length === 1">project</span><span v-else>projects</span></p>
    <details class="plist-updates">
      <summary>Get project updates</summary>
      <ProjectAlertSignup />
    </details>

    <div class="plist-cards">
      <article v-for="p in visibleProjects" :key="p.id" class="pcard" :class="{ 'pcard--text-only': !projectPhotos(p).length }">
        <PhotoStack v-if="projectPhotos(p).length" :photos="projectPhotos(p)" :label="p.title" :to="projectLink(p)" />
        <div class="pcard-body">
          <h2 class="pcard-name">
            <router-link v-if="projectLink(p)" :to="projectLink(p)">{{ p.title }}</router-link>
            <span v-else>{{ p.title }}</span>
          </h2>
          <p v-if="gardenName(p)" class="pcard-context">{{ gardenName(p) }}</p>
          <p v-if="p.short_description" class="pcard-line">{{ p.short_description }}</p>
          <div class="pcard-tags">
            <span class="pcard-tag pcard-tag--status">{{ resolveProjectStatus(p) }}</span>
            <span v-if="p.category" class="pcard-tag pcard-tag--category" :data-category="p.category">{{ p.category }}</span>
          </div>
          <p v-if="nextWork(p)" class="pcard-meta">{{ nextWork(p) }}</p>
          <div class="pcard-actions">
            <button type="button" class="pcard-btn" :class="{ 'is-in': isInterested(p) }" :disabled="togglingId === p.id" @click="toggleInterest(p)"><span v-if="isInterested(p)">You're in</span><span v-else>I'm interested</span></button>
            <span class="pcard-count">{{ interestedCount(p) }} interested</span>
          </div>
        </div>
      </article>

      <p v-if="publicProjects.loading" class="plist-state">Loading projects…</p>
      <p v-else-if="publicProjects.error" class="plist-state" role="alert">Couldn't load projects. Try again in a moment.</p>
      <p v-else-if="!visibleProjects.length && filter === 'All'" class="plist-state">No projects right now.</p>
      <p v-else-if="!visibleProjects.length" class="plist-state">No {{ filter.toLowerCase() }} projects right now.</p>
    </div>

    <div class="pcity">
      <p class="pcity-eyebrow">Outside Oakland</p>
      <h2 class="pcity-title">Start the first project in your city.</h2>
      <p class="pcity-body">Each SMS number is its own cooperative of local projects. Tell us about yours and we'll help you stand it up.</p>
      <EmailLink subject="Garden Steward in my city" class="pcity-btn">Email us about your city</EmailLink>
    </div>
  </div>
  </ManageLayout>
</template>

<style scoped>
.plist { min-height: 100vh; background: var(--gs-paper); color: var(--gs-ink); font-family: var(--gs-body-font); overflow-x: clip; }
.plist-heading { padding: clamp(32px, 4vw, 70px) clamp(20px, 4vw, 80px) 20px; }
.plist-heading h1 { font: 400 clamp(44px, 5vw, 84px)/1.05 var(--gs-heading-font); margin: 0 0 14px; }
.plist-heading p { font-size: clamp(18px, 1.5vw, 23px); line-height: 1.45; margin: 0; color: var(--gs-muted); }
.plist-toolbar { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 14px 24px; border-bottom: 1px solid var(--gs-rule); }
.plist-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 18px; }
.plist-filters button, .plist-add { min-height: 42px; padding: 8px 2px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; color: var(--gs-ink); font: 400 16px/1.4 var(--gs-body-font); cursor: pointer; }
.plist-filters button.is-selected { border-bottom-color: var(--gs-ink); font-weight: 600; }
.plist-filters button:hover, .plist-add:hover { text-decoration: underline; text-underline-offset: 4px; }
.plist-add { text-decoration: underline; text-underline-offset: 4px; white-space: nowrap; }
.plist-place { color: var(--gs-muted); font-size: 15px; margin: 12px 0; }
.plist-updates { border-bottom: 1px solid var(--gs-rule); padding: 10px 0; }
.plist-updates summary { display: list-item; width: fit-content; color: var(--gs-ink); font-size: 16px; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.plist-updates :deep(.palert) { margin: 12px 0 0; max-width: none; padding: 20px 0 12px; border: 0; border-top: 1px solid var(--gs-rule); border-radius: 0; background: transparent; }
.plist-updates :deep(.palert-title) { font: 400 28px/1.2 var(--gs-heading-font); color: var(--gs-ink); }
.plist-updates :deep(.palert-body), .plist-updates :deep(.palert-note) { color: var(--gs-muted); font: 18px/1.55 var(--gs-body-font); }
.plist-updates :deep(.palert-scope) { border: 0; border-bottom: 1px solid var(--gs-rule); border-radius: 0; padding: 0; }
.plist-updates :deep(.palert-seg) { border-radius: 0; color: var(--gs-ink); font: 16px var(--gs-body-font); }
.plist-updates :deep(.palert-seg.is-selected) { background: transparent; color: var(--gs-ink); text-decoration: underline; text-underline-offset: 4px; }
.plist-updates :deep(.palert-input) { border-color: var(--gs-rule); border-radius: 0; background: var(--gs-paper); color: var(--gs-ink); font: 16px var(--gs-body-font); }
.plist-updates :deep(.palert-btn) { border-radius: 0; background: var(--gs-ink); color: var(--gs-paper); font: 16px var(--gs-body-font); }
.plist-cards { padding: 10px clamp(20px, 4vw, 80px) 40px; }
.plist-state { margin: 24px 0; font-size: 18px; color: var(--gs-muted); }
.pcard { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(24px, 4vw, 76px); min-width: 0; padding: clamp(30px, 4vw, 66px) 0; border-bottom: 1px solid var(--gs-rule); }
.pcard--text-only { grid-template-columns: minmax(0, 1fr); }
.pcard-body { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
.pcard-name { font: 400 clamp(34px, 3.4vw, 62px)/1.08 var(--gs-heading-font); margin: 0 0 12px; }
.pcard-name a { color: inherit; text-decoration: none; }
.pcard-name a:hover { text-decoration: underline; }
.pcard-context { font-size: 18px; margin: 0 0 20px; color: var(--gs-muted); }
.pcard-line { font-size: clamp(18px, 1.45vw, 23px); line-height: 1.5; margin: 0 0 20px; }
.pcard-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.pcard-tag { font-size: 16px; padding: 5px 10px; background: var(--gs-sage); color: var(--gs-ink); }
.pcard-tag--status { background: #f4edcf; }
.pcard-tag--category { background: #e3e8c9; }
.pcard-tag--category[data-category="Infrastructure" i], .pcard-tag--category[data-category="Event" i] { background: #eee0ad; }
.pcard-tag--category[data-category="Planting" i], .pcard-tag--category[data-category="Community" i] { background: #dbe8d4; }
html.dark .pcard-tag--status { background: #4a432d; }
html.dark .pcard-tag--category { background: #384a34; }
html.dark .pcard-tag--category[data-category="Infrastructure" i], html.dark .pcard-tag--category[data-category="Event" i] { background: #594d2f; }
html.dark .pcard-tag--category[data-category="Planting" i], html.dark .pcard-tag--category[data-category="Community" i] { background: #2b4a3b; }
.pcard-meta { font-size: 18px; color: var(--gs-muted); margin: 0 0 22px; }
.pcard-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; margin-top: auto; }
.pcard-btn { min-height: 44px; padding: 8px 20px; border: 1px solid var(--gs-ink); border-radius: 0; background: var(--gs-ink); color: var(--gs-paper); font: 600 17px var(--gs-body-font); cursor: pointer; }
.pcard-btn.is-in { background: var(--gs-sage); color: var(--gs-ink); }
.pcard-btn:disabled { opacity: .6; cursor: default; }
.pcard-count { font-size: 16px; color: var(--gs-muted); }
.pcity { margin: 20px clamp(20px, 4vw, 80px) 56px; padding: 28px; background: var(--gs-sage); }
.pcity-eyebrow { margin: 0 0 6px; font-size: 15px; color: var(--gs-muted); }
.pcity-title { margin: 0 0 12px; font: 400 clamp(28px, 3vw, 48px)/1.15 var(--gs-heading-font); }
.pcity-body { margin: 0 0 20px; font-size: 18px; line-height: 1.5; }
.pcity-btn { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px; background: var(--gs-ink); color: var(--gs-paper); text-decoration: none; font-size: 17px; }
@media (max-width: 760px) { .pcard { grid-template-columns: minmax(0, 1fr); gap: 24px; } }

.plist { min-height: 0; font-size: 18px; line-height: 1.55; }
.plist-heading { padding: 0; margin-bottom: 30px; }
.plist-heading h1 { font-size: clamp(44px, 4.8vw, 76px); line-height: 1.08; font-weight: 400; }
.plist-heading p { font-size: clamp(18px, 1.4vw, 23px); line-height: 1.65; max-width: none; }
.plist-cards { padding: 0; }
.pcard { column-gap: 44px; padding: 34px 0; border-bottom: 0; border-top: 1px solid var(--gs-rule); }
.pcard-name { font-size: clamp(34px, 3vw, 52px); line-height: 1.15; }
.pcard-line { font-size: clamp(18px, 1.4vw, 23px); line-height: 1.65; }
@media (max-width: 760px) {
  .plist-heading h1 { font-size: 42px; }
  .pcard { grid-template-columns: minmax(0, 1fr); gap: 25px; padding: 24px 0 30px; }
  .pcard-name { font-size: 34px; }
  .pcard-line { font-size: 18px; }
}
</style>
