<script setup>
import ManageLayout from '@/components/ManageLayout.vue';
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGardensStore, useAuthStore } from '@/stores';
import { toPhotoSet } from '@/helpers/image-utils';
import PhotoStack from '@/components/PhotoStack.vue';
import EmailLink from '@/components/EmailLink.vue';

const gardensStore = useGardensStore();
const authStore = useAuthStore();
const { publicGardens: gardens } = storeToRefs(gardensStore);
const { user } = storeToRefs(authStore);

gardensStore.getAllPublic();

const filters = ['All', 'Workday this week', 'Active projects'];
const filter = ref('All');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const relationIds = (rel) => {
  const arr = rel?.data || rel || [];
  return (Array.isArray(arr) ? arr : []).map(x => x.id ?? x);
};

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

function activeProjectCount(garden) {
  return garden.activeProjectCount;
}

function nextWorkday(garden) {
  const event = garden.nextWorkday;
  if (!event) return null;
  return { id: event.id, time: new Date(event.startDatetime).getTime() };
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

function gardenPhotos(garden) {
  return toPhotoSet([garden.hero_image], `Photo of ${garden.title}`);
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

</script>

<template>
  <ManageLayout>
  <div class="glist">
    <header class="glist-heading">
      <h1>Gardens</h1>
      <p>Pick one close to you and come to a workday. No experience needed. Tools, gloves and good company provided.</p>
    </header>

    <div class="glist-filters" role="group" aria-label="Garden filters">
      <button v-for="option in filters" :key="option" type="button" :class="{ 'is-selected': filter === option }" :aria-pressed="filter === option" :disabled="!Array.isArray(gardens)" @click="filter = option">{{ option }}</button>
      <button type="button" :class="{ 'is-selected': here }" :disabled="locating || !Array.isArray(gardens)" :aria-pressed="!!here" @click="toggleNearMe"><span v-if="locating">Locating…</span><span v-else>Near me</span></button>
    </div>
    <p v-if="Array.isArray(gardens)" class="glist-place">Oakland · {{ listedGardens.length }} <span v-if="listedGardens.length === 1">garden</span><span v-else>gardens</span></p>

    <div class="glist-cards">
      <article v-for="g in visibleGardens" :key="g.documentId" class="gcard" :class="{ 'gcard--text-only': !gardenPhotos(g).length }">
        <PhotoStack v-if="gardenPhotos(g).length" :photos="gardenPhotos(g)" :label="g.title" :to="`/gardens/${g.slug}`" />
        <div class="gcard-body">
          <h2 class="gcard-name"><router-link :to="`/gardens/${g.slug}`">{{ g.title }}</router-link></h2>
          <p v-if="milesTo(g) != null" class="gcard-context">About {{ formatMiles(milesTo(g)) }} away</p>
          <p v-if="g.blurb" class="gcard-line">{{ g.blurb }}</p>
          <div class="gcard-tags">
            <span v-if="workdaySoon(g)" class="gcard-tag gcard-tag--workday">{{ workdayBadge(g) }}</span>
            <span v-if="activeProjectCount(g)" class="gcard-tag">{{ activeProjectCount(g) }} <span v-if="activeProjectCount(g) === 1">project</span><span v-else>projects</span></span>
          </div>
          <p class="gcard-meta">
            <template v-if="nextWorkday(g)">Next workday · {{ formatWhen(nextWorkday(g).time) }}
</template>
            <template v-else>No workdays scheduled yet</template>
          </p>
          <div class="gcard-actions">
            <span v-if="isMember(g)" class="gcard-joined">Joined!</span>
            <router-link v-else :to="`/gardens/${g.slug}`" class="gcard-btn">Visit garden</router-link>
            <span class="gcard-count">{{ relationIds(g.volunteers).length }} <span v-if="relationIds(g.volunteers).length === 1">volunteer</span><span v-else>volunteers</span></span>
          </div>
        </div>
      </article>

      <p v-if="gardens.loading" class="glist-state">Loading gardens…</p>
      <p v-else-if="gardens.error" class="glist-state" role="alert">Couldn't load gardens. Try again in a moment.</p>
      <p v-else-if="!visibleGardens.length && filter === 'All'" class="glist-state">No gardens listed yet.</p>
      <p v-else-if="!visibleGardens.length" class="glist-state">No gardens match “{{ filter.toLowerCase() }}” right now.</p>
    </div>

    <div class="gcity">
      <p class="gcity-eyebrow">Outside Oakland</p>
      <h2 class="gcity-title">Bring a garden onto Garden Steward.</h2>
      <p class="gcity-body">Run a community garden somewhere else? Email us and we'll help you set up workdays, volunteer texts and projects for your neighbors.</p>
      <EmailLink subject="Adding a garden to Garden Steward" class="gcity-btn">Email us about your garden</EmailLink>
    </div>
  </div>
  </ManageLayout>
</template>

<style scoped>
.glist { min-height: 100vh; background: var(--gs-paper); color: var(--gs-ink); font-family: var(--gs-body-font); overflow-x: clip; }
.glist-heading { padding: clamp(32px, 4vw, 70px) clamp(20px, 4vw, 80px) 20px; }
.glist-heading h1 { font: 400 clamp(44px, 5vw, 84px)/1.05 var(--gs-heading-font); margin: 0 0 14px; }
.glist-heading p { font-size: clamp(18px, 1.5vw, 23px); line-height: 1.45; margin: 0; color: var(--gs-muted); }
.glist-filters { display: flex; flex-wrap: wrap; gap: 18px; border-bottom: 1px solid var(--gs-rule); }
.glist-filters button { min-height: 42px; padding: 8px 2px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; color: var(--gs-ink); font: 400 16px/1.4 var(--gs-body-font); cursor: pointer; }
.glist-filters button.is-selected { border-bottom-color: var(--gs-ink); font-weight: 600; }
.glist-filters button:hover { text-decoration: underline; text-underline-offset: 4px; }
.glist-filters button:disabled { opacity: .65; cursor: wait; }
.glist-place { color: var(--gs-muted); font-size: 15px; margin: 12px 0; }
.glist-cards { padding: 10px clamp(20px, 4vw, 80px) 40px; }
.glist-state { margin: 24px 0; font-size: 18px; color: var(--gs-muted); }
.gcard { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(24px, 4vw, 76px); min-width: 0; padding: clamp(30px, 4vw, 66px) 0; border-bottom: 1px solid var(--gs-rule); }
.gcard--text-only { grid-template-columns: minmax(0, 1fr); }
.gcard-body { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
.gcard-name { font: 400 clamp(34px, 3.4vw, 62px)/1.08 var(--gs-heading-font); margin: 0 0 12px; }
.gcard-name a { color: inherit; text-decoration: none; }
.gcard-name a:hover { text-decoration: underline; }
.gcard-context { font-size: 18px; margin: 0 0 20px; color: var(--gs-muted); }
.gcard-line { font-size: clamp(18px, 1.45vw, 23px); line-height: 1.5; margin: 0 0 20px; }
.gcard-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.gcard-tag { font-size: 16px; padding: 5px 10px; background: var(--gs-sage); color: var(--gs-ink); }
.gcard-tag--workday { background: #f4edcf; }
html.dark .gcard-tag--workday { background: #4a432d; }
.gcard-meta { font-size: 18px; color: var(--gs-muted); margin: 0 0 22px; }
.gcard-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; margin-top: auto; }
.gcard-btn { min-height: 44px; padding: 8px 20px; border: 1px solid var(--gs-ink); border-radius: 0; background: var(--gs-ink); color: var(--gs-paper); font: 600 17px var(--gs-body-font); text-decoration: none; display: inline-flex; align-items: center; cursor: pointer; }
.gcard-joined { display: inline-flex; align-items: center; min-height: 44px; color: var(--gs-ink); font-size: 17px; }
.gcard-count { font-size: 16px; color: var(--gs-muted); }
.gcity { margin: 20px clamp(20px, 4vw, 80px) 56px; padding: 28px; background: var(--gs-sage); }
.gcity-eyebrow { margin: 0 0 6px; font-size: 15px; color: var(--gs-muted); }
.gcity-title { margin: 0 0 12px; font: 400 clamp(28px, 3vw, 48px)/1.15 var(--gs-heading-font); }
.gcity-body { margin: 0 0 20px; font-size: 18px; line-height: 1.5; }
.gcity-btn { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px; background: var(--gs-ink); color: var(--gs-paper); text-decoration: none; font-size: 17px; }
@media (max-width: 760px) { .gcard { grid-template-columns: minmax(0, 1fr); gap: 24px; } }

.glist { min-height: 0; font-size: 18px; line-height: 1.55; }
.glist-heading { padding: 0; margin-bottom: 30px; }
.glist-heading h1 { font-size: clamp(44px, 4.8vw, 76px); line-height: 1.08; font-weight: 400; }
.glist-heading p { font-size: clamp(18px, 1.4vw, 23px); line-height: 1.65; max-width: none; }
.glist-cards { padding: 0; }
.gcard { column-gap: 44px; padding: 34px 0; border-bottom: 0; border-top: 1px solid var(--gs-rule); }
.gcard-name { font-size: clamp(34px, 3vw, 52px); line-height: 1.15; }
.gcard-line { font-size: clamp(18px, 1.4vw, 23px); line-height: 1.65; }
@media (max-width: 760px) {
  .glist-heading h1 { font-size: 42px; }
  .gcard { grid-template-columns: minmax(0, 1fr); gap: 25px; padding: 24px 0 30px; }
  .gcard-name { font-size: 34px; }
  .gcard-line { font-size: 18px; }
}
</style>
