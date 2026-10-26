<script setup>
import { storeToRefs } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { renderMarkdown } from '@/helpers/safe-html';

import { useEventStore, useAuthStore } from '@/stores';
import { getImageOrDefault } from '@/helpers/image-utils';
import { approximateCenter, APPROX_AREA_RADIUS_M } from '@/helpers/location-privacy';
import LeafletMap from '@/components/LeafletMap.vue';
import Gallery from '@/components/Gallery.vue';
import EventProjectCard from '@/components/EventProjectCard.vue';
import CalendarExportButton from '@/components/CalendarExportButton.vue';
import GardenContextBar from '@/components/GardenContextBar.vue';
import { PrintDaySheetModal, JoinEventModal } from '@/components/modals';
import '@/assets/garden-public.css';

const route = useRoute();
const eventStore = useEventStore();
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const { event } = storeToRefs(eventStore);

const showModal = ref(false);
const showPrintDaySheet = ref(false);
const isRSVPed = ref(false);

// The component is reused when moving between events (e.g. "Next in this
// series"), so fetch on every id change, not just on mount.
watch(
  () => route.params.id,
  (id) => { if (id) eventStore.findById(id); },
  { immediate: true },
);

watch(
  [() => event.value?.confirmed, () => user.value?.id],
  ([confirmed, userId]) => {
    isRSVPed.value = Array.isArray(confirmed) && !!userId && confirmed.some((c) => c.id === userId);
  },
  { immediate: true },
);

/* ---------- Event basics ---------- */

const garden = computed(() => event.value?.garden || null);
const hasGarden = computed(() => !!garden.value?.slug);

const isEventPast = computed(() => {
  if (!event.value?.startDatetime) return false;
  return new Date(event.value.startDatetime) < new Date();
});
const isEventCanceled = computed(() => event.value?.canceled === true);

const isManager = computed(() => {
  if (!garden.value?.managers || !user.value) return false;
  return garden.value.managers.some((m) => m.id === user.value.id);
});

const heroImage = computed(() =>
  getImageOrDefault(event.value?.hero_image?.url || garden.value?.hero_image?.url));

const renderedContent = computed(() => (event.value?.content ? renderMarkdown(event.value.content) : ''));

const linkedProjects = computed(() => (Array.isArray(event.value?.projects) ? event.value.projects : []));

const organization = computed(() => garden.value?.organization || event.value?.organization || null);

const typeLabel = computed(() => ({
  general: 'Workday',
  land_work: 'Land work',
  cleanup: 'Cleanup',
  art: 'Art day',
  workshop: 'Workshop',
}[event.value?.type] || null));

// "Every 3rd Sunday" from the template, when the event comes from one.
const recurrenceLabel = computed(() => {
  const t = event.value?.recurring_template;
  if (!t) return null;
  if (t.recurrence_type === 'nth_weekday' && t.nth_occurrence && t.weekday) {
    const nth = { first: '1st', second: '2nd', third: '3rd', fourth: '4th', last: 'last' }[t.nth_occurrence];
    return `Every ${nth} ${t.weekday}`;
  }
  if (t.recurrence_type === 'day_of_month' && t.day_of_month) {
    const d = t.day_of_month;
    const suffix = (d % 10 === 1 && d !== 11) ? 'st' : (d % 10 === 2 && d !== 12) ? 'nd' : (d % 10 === 3 && d !== 13) ? 'rd' : 'th';
    return `Monthly on the ${d}${suffix}`;
  }
  return 'Recurring';
});

const heroPill = computed(() => [typeLabel.value, recurrenceLabel.value].filter(Boolean).join(' · '));

/* ---------- Dates ---------- */

const start = computed(() => (event.value?.startDatetime ? new Date(event.value.startDatetime) : null));

const longDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const timeOf = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const chipMonth = (s) => (s ? new Date(s).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '');
const chipDay = (s) => (s ? new Date(s).getDate() : '');
const shortWhen = (s) => (s ? `${new Date(s).toLocaleDateString('en-US', { weekday: 'long' })} · ${timeOf(new Date(s))}` : '');

const whenLine = computed(() => {
  if (!start.value) return '';
  const end = event.value?.endText ? ` – ${event.value.endText}` : '';
  return `${longDate(start.value)} · ${timeOf(start.value)}${end}`;
});

const locationText = computed(() => {
  if (hasGarden.value) return garden.value.title;
  return [event.value?.location_name, event.value?.location_address].filter(Boolean).join(', ');
});

/* ---------- Brief, visit info, tasks, series ---------- */

const brief = computed(() => event.value?.resolved_brief || null);
const agenda = computed(() => brief.value?.agenda || []);
const bringYou = computed(() => (brief.value?.bring_items || []).filter((i) => i.provided_by !== 'garden'));
const bringGarden = computed(() => (brief.value?.bring_items || []).filter((i) => i.provided_by === 'garden'));
const hasBring = computed(() => bringYou.value.length > 0 || bringGarden.value.length > 0);
const hasHowItGoes = computed(() => !!brief.value?.what_to_expect || agenda.value.length > 0);

const visit = computed(() => garden.value?.visit_info || null);

const tasks = computed(() => (Array.isArray(event.value?.event_tasks) ? event.value.event_tasks : []));
const plantings = computed(() => (Array.isArray(event.value?.planting) ? event.value.planting : [])
  .map((p) => p.plant_name).filter(Boolean));

const TASK_ICONS = { Planting: 'leaf', Harvest: 'leaf', Water: 'drop', Weeding: 'fork', General: 'house' };
const taskIcon = (t) => TASK_ICONS[t.type] || 'house';

const upcoming = computed(() => event.value?.series?.upcoming || []);
const previous = computed(() => event.value?.series?.previous || null);
const previousPhotos = computed(() => (Array.isArray(previous.value?.featured_gallery) ? previous.value.featured_gallery.slice(0, 3) : []));
const ownGallery = computed(() => {
  const g = event.value?.featured_gallery;
  return Array.isArray(g) ? g : (g?.data || []);
});
const monthName = (s) => (s ? new Date(s).toLocaleDateString('en-US', { month: 'long' }) : '');

const hosts = computed(() => (Array.isArray(garden.value?.managers) ? garden.value.managers : []));
const hostName = (u) => [u.firstName, u.lastName ? `${u.lastName[0]}.` : ''].filter(Boolean).join(' ') || u.username;
const initials = (u) => ((u.firstName?.[0] || u.username?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase();
const avatarStyle = (u) => (u.color ? { backgroundColor: u.color } : {});

const goingCount = computed(() => {
  if (Number.isSafeInteger(event.value?.confirmedCount) && event.value.confirmedCount >= 0) return event.value.confirmedCount;
  return 0;
});

const facts = computed(() => {
  const out = [];
  if (brief.value?.duration_text) out.push({ key: 'duration', label: 'How long', value: brief.value.duration_text, icon: 'clock' });
  if (visit.value?.meeting_spot) out.push({ key: 'meet', label: 'Meet at', value: visit.value.meeting_spot, icon: 'pin' });
  else if (!hasGarden.value && event.value?.location_name) out.push({ key: 'where', label: 'Where', value: event.value.location_name, icon: 'pin' });
  if (brief.value?.good_for) out.push({ key: 'for', label: 'Good for', value: brief.value.good_for, icon: 'leaf' });
  if (brief.value?.food) out.push({ key: 'food', label: 'Food', value: brief.value.food, icon: 'bowl' });
  if (goingCount.value && !isEventPast.value) {
    let label = 'neighbors';
    if (goingCount.value === 1) label = 'neighbor';
    out.push({ key: 'going', label: 'Going', value: `${goingCount.value} ${label}`, icon: 'people' });
  }
  return out;
});

const gettingThere = computed(() => {
  const v = visit.value || {};
  return [
    { key: 'meet', title: v.meeting_spot ? `Meet at ${v.meeting_spot.charAt(0).toLowerCase()}${v.meeting_spot.slice(1)}` : null, text: v.meeting_note },
    { key: 'parking', title: 'Parking & transit', text: v.parking_transit },
    { key: 'restroom', title: 'Restroom', text: v.restroom },
    { key: 'access', title: 'Accessibility', text: v.accessibility },
    { key: 'kids', title: 'Kids & pets', text: v.kids_pets },
  ].filter((r) => r.text || (r.key === 'meet' && r.title));
});

const gardenPoint = computed(() => {
  const latitude = Number(garden.value?.latitude);
  const longitude = Number(garden.value?.longitude);
  if (!hasGarden.value || garden.value?.latitude == null || garden.value?.longitude == null) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (!latitude && !longitude)) return null;
  return { latitude, longitude };
});

// Same rule as the garden page: signed-out visitors see a 600-yard area, not
// the pin, and get no exact Maps link.
const approximateArea = computed(() => {
  if (user.value || !gardenPoint.value) return null;
  const { latitude, longitude } = gardenPoint.value;
  const center = garden.value?.location_approximate
    ? { latitude, longitude }
    : approximateCenter(latitude, longitude, garden.value?.id ?? garden.value?.slug);
  return center ? { ...center, radiusMeters: APPROX_AREA_RADIUS_M } : null;
});

const mapPins = computed(() => (gardenPoint.value
  ? [{ ...gardenPoint.value, label: garden.value?.title || 'Garden' }]
  : []));

const mapsUrl = computed(() => {
  if (gardenPoint.value) {
    if (!user.value) return null;
    return `https://www.google.com/maps?q=${gardenPoint.value.latitude},${gardenPoint.value.longitude}`;
  }
  const q = [event.value?.location_name, event.value?.location_address].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
});

/* ---------- RSVP ---------- */

const canRsvpHere = computed(() => hasGarden.value && !isEventPast.value && !isEventCanceled.value);
const partifulOpen = computed(() => !!event.value?.partiful_link && !isEventPast.value && !isEventCanceled.value);
const showRsvp = computed(() => partifulOpen.value || canRsvpHere.value);

const rsvpEvent = () => {
  if (isEventPast.value || isRSVPed.value) return;
  showModal.value = true;
};
const joinedEvent = async () => {
  isRSVPed.value = true;
  await eventStore.findById(event.value.documentId);
};

</script>

<template>
  <div id="event-view" class="ev-page">
    <GardenContextBar v-if="hasGarden" :garden="garden" current="events" :page-title="event?.title" />
    <div v-else-if="event?.id" class="ev-crumbs-bar">
      <nav class="ev-content ev-crumbs" aria-label="Breadcrumb">
        <router-link to="/events">Events</router-link>
        <span aria-hidden="true">/</span>
        <span class="ev-crumb-current" aria-current="page">{{ event.title }}</span>
        <span v-if="organization?.title" class="ev-crumb-host">
          Hosted by
          <a v-if="organization.url" :href="organization.url" target="_blank" rel="noopener noreferrer">{{ organization.title }}</a>
          <strong v-else>{{ organization.title }}</strong>
        </span>
      </nav>
    </div>

    <div class="ev-content">
      <div v-if="event?.loading" class="gp-hero gp-hero--loading animate-pulse" aria-hidden="true"></div>
      <p v-else-if="event?.error" class="ev-error">Couldn't load this event — try refreshing.</p>

      <template v-else-if="event?.id">
        <!-- Manager strip -->
        <div v-if="isManager" class="ev-manage">
          <span class="ev-manage-label">You manage this garden</span>
          <span class="ev-manage-links">
            <router-link :to="`/manage/events/${event.id}/edit`">Edit this event</router-link>
            <router-link v-if="garden?.slug && event.recurring_template" :to="`/manage/gardens/${garden.slug}/event-templates`">Edit series</router-link>
            <button type="button" class="gp-link gp-link-button" @click="showPrintDaySheet = true">Print day sheet</button>
          </span>
        </div>

        <!-- Hero -->
        <section class="gp-hero ev-hero" aria-labelledby="event-title">
          <img :src="heroImage" alt="" class="gp-hero-img" />
          <div class="gp-hero-scrim" aria-hidden="true"></div>
          <div class="gp-hero-body ev-hero-body">
            <div class="ev-hero-text">
              <span v-if="heroPill" class="ev-pill">{{ heroPill }}</span>
              <h1 id="event-title" class="gp-title">{{ event.title }}</h1>
              <p class="ev-when">{{ whenLine }}</p>
              <p v-if="event.blurb" class="gp-blurb">{{ event.blurb }}</p>
              <div v-if="showRsvp || (event.startDatetime && !isEventPast && !isEventCanceled)" class="gp-hero-actions">
                <a v-if="partifulOpen" :href="event.partiful_link" target="_blank" rel="noopener noreferrer" class="gp-btn gp-btn-cta">RSVP on Partiful</a>
                <button v-else-if="canRsvpHere" type="button" class="gp-btn gp-btn-cta" :disabled="isRSVPed" @click="rsvpEvent">
                  {{ isRSVPed ? "You're going" : 'RSVP' }}
                </button>
                <CalendarExportButton v-if="event.startDatetime && !isEventPast && !isEventCanceled" :key="event.id" :event="event" />
              </div>
            </div>
            <div v-if="goingCount && !isEventPast" class="ev-going">
              <span class="ev-going-text">{{ goingCount }} going</span>
            </div>
          </div>
        </section>

        <p v-if="isEventCanceled" class="ev-banner ev-banner--canceled" role="status">This event has been canceled.</p>

        <!-- At a glance -->
        <section v-if="facts.length" class="gp-facts" aria-label="Event at a glance">
          <div v-for="f in facts" :key="f.key" class="gp-fact">
            <span class="gp-fact-icon">
              <svg v-if="f.icon === 'clock'" class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <svg v-else-if="f.icon === 'pin'" class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
              <svg v-else-if="f.icon === 'bowl'" class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11h18" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M9 4c0 1.5 1 2 1 3.5M13 4c0 1.5 1 2 1 3.5" /></svg>
              <svg v-else-if="f.icon === 'people'" class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.5 3.5 5.2" /></svg>
              <svg v-else class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V11" /><path d="M12 11C12 6 8 4 4 4c0 5 3 7 8 7z" /><path d="M12 13c0-4 3-6 8-6 0 4-3 6-8 6z" /></svg>
            </span>
            <span class="gp-fact-text">
              <span class="gp-label">{{ f.label }}</span>
              <span class="gp-fact-value">{{ f.value }}</span>
            </span>
          </div>
        </section>

        <div class="gp-body">
          <!-- Main column -->
          <div class="gp-main">
            <section v-if="renderedContent" class="gp-section gp-section--about">
              <h2 class="gp-h2">About this day</h2>
              <div class="gp-prose ev-prose" v-html="renderedContent"></div>
            </section>

            <section v-if="tasks.length || plantings.length" class="gp-section">
              <div class="gp-section-head">
                <h2 class="gp-h2">{{ isEventPast ? 'What we worked on' : "What we'll work on" }}</h2>
                <router-link v-if="hasGarden" :to="`/gardens/${garden.slug}/tasks`" class="gp-link">All garden tasks</router-link>
              </div>
              <div v-if="tasks.length" class="ev-task-grid">
                <component
                  :is="hasGarden ? 'router-link' : 'div'"
                  v-for="t in tasks"
                  :key="t.documentId || t.id"
                  :to="hasGarden ? `/gardens/${garden.slug}/tasks/${t.id}` : undefined"
                  class="ev-task"
                >
                  <span class="ev-task-icon" :class="{ 'ev-task-icon--warm': t.type === 'Planting' }">
                    <svg v-if="taskIcon(t) === 'drop'" class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></svg>
                    <svg v-else-if="taskIcon(t) === 'fork'" class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20c4-1 6-5 8-9s4-7 8-7" /><path d="M4 20l4-4" /><path d="M14 4l6 6" /></svg>
                    <svg v-else-if="taskIcon(t) === 'leaf'" class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V11" /><path d="M12 11C12 6 8 4 4 4c0 5 3 7 8 7z" /><path d="M12 13c0-4 3-6 8-6 0 4-3 6-8 6z" /></svg>
                    <svg v-else class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-6h6v6" /></svg>
                  </span>
                  <span class="ev-task-text">
                    <span class="ev-task-title">{{ t.title }}</span>
                    <span v-if="t.overview" class="ev-task-desc">{{ t.overview }}</span>
                    <span v-if="t.task_status === 'FINISHED'" class="ev-task-done">Done</span>
                  </span>
                </component>
              </div>
              <div v-if="plantings.length" class="ev-chips">
                <span class="gp-label">Going in the ground</span>
                <span v-for="p in plantings" :key="p" class="ev-chip">{{ p }}</span>
              </div>
            </section>

            <section v-if="hasHowItGoes" class="gp-section">
              <h2 class="gp-h2">How the day goes</h2>
              <p v-if="brief.what_to_expect" class="gp-prose ev-lead">{{ brief.what_to_expect }}</p>
              <ol v-if="agenda.length" class="ev-timeline">
                <li v-for="(step, i) in agenda" :key="i" class="ev-step" :class="{ 'ev-step--untimed': !agenda.some((s) => s.time_text) }">
                  <span v-if="agenda.some((s) => s.time_text)" class="ev-step-time">{{ step.time_text }}</span>
                  <span class="ev-step-rail" aria-hidden="true">
                    <span class="ev-step-dot" :class="{ 'ev-step-dot--first': i === 0, 'ev-step-dot--last': i === agenda.length - 1 }"></span>
                    <span v-if="i < agenda.length - 1" class="ev-step-line"></span>
                  </span>
                  <span class="ev-step-body">
                    <span class="ev-step-label">{{ step.label }}</span>
                    <span v-if="step.detail" class="ev-step-detail">{{ step.detail }}</span>
                  </span>
                </li>
              </ol>
            </section>

            <section v-if="hasBring" class="gp-section">
              <h2 class="gp-h2">What to bring</h2>
              <div class="ev-bring-grid">
                <div v-if="bringYou.length" class="ev-bring ev-bring--you">
                  <span class="gp-label gp-label--accent">You bring</span>
                  <ul>
                    <li v-for="item in bringYou" :key="item.label">
                      <svg class="gp-icon ev-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>{{ item.label }}
                    </li>
                  </ul>
                </div>
                <div v-if="bringGarden.length" class="ev-bring ev-bring--garden">
                  <span class="gp-label">{{ hasGarden ? 'The garden provides' : 'Provided' }}</span>
                  <ul>
                    <li v-for="item in bringGarden" :key="item.label">
                      <svg class="gp-icon ev-check ev-check--soft" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>{{ item.label }}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section v-if="linkedProjects.length" class="gp-section">
              <span class="gp-label">{{ linkedProjects.length > 1 ? 'Part of these projects' : 'Part of this project' }}</span>
              <div class="ev-projects">
                <EventProjectCard v-for="project in linkedProjects" :key="project.documentId || project.id" :project="project" />
              </div>
            </section>

            <section v-if="ownGallery.length || event.photo_album_url" class="gp-section">
              <Gallery :gallery="event.featured_gallery" title="From this day" :photo-album-url="event.photo_album_url" />
            </section>

            <section v-else-if="previous && !isEventPast" class="gp-section">
              <div class="gp-section-head">
                <h2 class="gp-h2">Last time: {{ monthName(previous.startDatetime) }}</h2>
                <a v-if="previous.photo_album_url" :href="previous.photo_album_url" target="_blank" rel="noopener noreferrer" class="gp-link">See the full album</a>
              </div>
              <router-link v-if="previousPhotos.length" :to="`/d/${previous.id}`" class="ev-recap" :aria-label="`Photos from ${previous.title}`">
                <img v-for="img in previousPhotos" :key="img.id" :src="img.formats?.small?.url || img.url" :alt="img.alternativeText || ''" class="ev-recap-img" />
              </router-link>
            </section>
          </div>

          <!-- Aside -->
          <aside id="rsvp" class="gp-aside" aria-label="RSVP and details">
            <div class="gp-card gp-card--feature">
              <p class="gp-label gp-label--accent">{{ isEventPast ? 'This day has passed' : isEventCanceled ? 'Canceled' : showRsvp ? 'Save your spot' : 'When' }}</p>
              <div class="gp-event ev-when-card">
                <span class="gp-datechip gp-datechip--solid">
                  <span class="gp-datechip-month">{{ chipMonth(event.startDatetime) }}</span>
                  <span class="gp-datechip-day">{{ chipDay(event.startDatetime) }}</span>
                </span>
                <span class="gp-event-text">
                  <span class="gp-event-title">{{ start ? `${start.toLocaleDateString('en-US', { weekday: 'long' })}, ${timeOf(start)}` : '' }}</span>
                  <span v-if="event.endText" class="gp-event-meta">until {{ event.endText }}</span>
                </span>
              </div>

              <template v-if="partifulOpen">
                <a :href="event.partiful_link" target="_blank" rel="noopener noreferrer" class="gp-btn gp-btn-primary gp-btn-block">RSVP on Partiful</a>
              </template>
              <template v-else-if="canRsvpHere">
                <button type="button" class="gp-btn gp-btn-primary gp-btn-block" :disabled="isRSVPed" @click="rsvpEvent">
                  {{ isRSVPed ? "You're going" : 'RSVP' }}
                </button>
                <p class="ev-fine">Your place is confirmed only after registration. Text updates are a separate choice.</p>
              </template>
              <p v-else-if="isEventPast" class="ev-fine">RSVP is closed for this one.<template v-if="upcoming.length"> The next one is below.</template></p>
              <p v-else-if="isEventCanceled" class="ev-fine">Nothing to RSVP to.<template v-if="upcoming.length"> See the next one below.</template></p>
            </div>

            <div v-if="gettingThere.length || mapsUrl || gardenPoint || (!hasGarden && locationText)" class="gp-card">
              <p class="gp-label">Getting there</p>
              <div v-if="gardenPoint" class="ev-map">
                <!-- Keyed on sign-in so the map redraws when the exact spot unlocks -->
                <LeafletMap
                  :key="approximateArea ? 'area' : 'pin'"
                  :location-trackings="mapPins"
                  :center-coordinates="approximateArea || gardenPoint"
                  :area="approximateArea"
                />
              </div>
              <p v-if="approximateArea" class="ev-fine">
                Approximate area ·
                <button type="button" class="ev-textbtn" @click="authStore.openLoginModal(route.fullPath)">Sign in for location details</button>
              </p>
              <div v-if="!hasGarden && locationText" class="ev-row">
                <span class="ev-row-title">{{ event.location_name || event.location_address }}</span>
                <span v-if="event.location_name && event.location_address" class="ev-row-text">{{ event.location_address }}</span>
              </div>
              <div v-for="r in gettingThere" :key="r.key" class="ev-row">
                <span v-if="r.title" class="ev-row-title">{{ r.title }}</span>
                <span v-if="r.text" class="ev-row-text">{{ r.text }}</span>
              </div>
              <a v-if="mapsUrl" :href="mapsUrl" target="_blank" rel="noopener noreferrer" class="gp-link">Open in Google Maps</a>
            </div>

            <div v-if="hosts.length" class="gp-card">
              <p class="gp-label">Your hosts</p>
              <div v-for="h in hosts" :key="h.id" class="ev-host">
                <span class="ev-face ev-face--lg" :style="avatarStyle(h)">{{ initials(h) }}</span>
                <span class="ev-host-name">{{ hostName(h) }}</span>
              </div>
            </div>

            <div v-if="upcoming.length" class="gp-card">
              <p class="gp-label">Next in this series</p>
              <div class="gp-event-list">
                <router-link v-for="u in upcoming" :key="u.id" :to="`/d/${u.id}`" class="gp-event gp-event--compact">
                  <span class="gp-datechip">
                    <span class="gp-datechip-month">{{ chipMonth(u.startDatetime) }}</span>
                    <span class="gp-datechip-day">{{ chipDay(u.startDatetime) }}</span>
                  </span>
                  <span class="gp-event-text">
                    <span class="gp-event-title">{{ u.title }}</span>
                    <span class="gp-event-meta">{{ shortWhen(u.startDatetime) }}</span>
                  </span>
                </router-link>
              </div>
              <router-link v-if="hasGarden" :to="`/gardens/${garden.slug}#events`" class="gp-link">All {{ garden.title }} events</router-link>
            </div>

            <div v-if="organization && !hasGarden" class="gp-card">
              <p class="gp-label">Hosted by</p>
              <a v-if="organization.url" :href="organization.url" target="_blank" rel="noopener noreferrer" class="gp-org-name">{{ organization.title }}</a>
              <span v-else class="gp-org-name">{{ organization.title }}</span>
              <p v-if="organization.description" class="gp-org-desc">{{ organization.description }}</p>
            </div>
          </aside>
        </div>
      </template>
    </div>

    <!-- Back to the garden -->
    <section v-if="hasGarden && event?.id" class="ev-band">
      <div class="ev-content ev-band-inner">
        <div class="ev-band-text">
          <h2 class="gp-h2 ev-band-title">More from {{ garden.title }}</h2>
          <p v-if="garden.blurb" class="ev-band-blurb">{{ garden.blurb }}</p>
        </div>
        <router-link :to="`/gardens/${garden.slug}`" class="gp-btn gp-btn-cream">Visit the garden</router-link>
      </div>
    </section>
  </div>

  <JoinEventModal
    v-model="showModal"
    :event-id="event?.documentId || route.params.id"
    :event-title="event?.title"
    :garden-title="garden?.title"
    @rsvped="joinedEvent"
  />

  <PrintDaySheetModal v-model="showPrintDaySheet" :event-id="event?.id" :is-manager="isManager" />
</template>

<style>
/* Page frame: same ground as the garden page */
.ev-page {
  min-height: 100vh;
  background-color: #ffffff;
  color: #1f2a1f;
  font-family: Roboto, system-ui, sans-serif;
}

.dark .ev-page {
  background-color: #2d3e26;
  color: #f5f5f5;
}

.ev-content {
  box-sizing: border-box;
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 24px 0;
}

.ev-error {
  padding: 48px 0;
  color: #4b5563;
}

/* Garden map in Getting there */
.ev-map {
  height: 200px;
  overflow: hidden;
  border-radius: 10px;
}

.ev-textbtn {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 700;
  color: #064e3b;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.dark .ev-textbtn {
  color: #c5d4b8;
}

/* Breadcrumb for events with no garden */
.ev-crumbs-bar {
  border-bottom: 1px solid #e0d6c4;
  background-color: #f3ece0;
}

.dark .ev-crumbs-bar {
  background-color: #344a34;
  border-bottom-color: #3d4d36;
}

.ev-crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 14px;
  padding-bottom: 14px;
  font-size: 0.8125rem;
  color: #4b5563;
}

.ev-crumbs a {
  color: #4b5563;
  text-decoration: none;
}

.ev-crumbs a:hover {
  text-decoration: underline;
}

.ev-crumb-current {
  color: #1f2a1f;
  font-weight: 700;
}

.ev-crumb-host {
  margin-left: auto;
}

.ev-crumb-host a {
  color: #064e3b;
  font-weight: 700;
}

.dark .ev-crumbs,
.dark .ev-crumbs a {
  color: #a8b89e;
}

.dark .ev-crumb-current {
  color: #f5f5f5;
}

.dark .ev-crumb-host a {
  color: #c5d4b8;
}

/* Manager strip */
.ev-manage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 16px;
  padding: 10px 16px;
  border: 1px dashed #8aa37c;
  border-radius: 12px;
  font-size: 0.875rem;
  color: #376451;
}

.ev-manage-label {
  font-weight: 700;
}

.ev-manage-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
}

.ev-manage-links a {
  color: #064e3b;
  font-weight: 700;
}

.dark .ev-manage,
.dark .ev-manage-links a {
  color: #c5d4b8;
}

/* Hero */
.ev-hero-body {
  max-width: none;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.ev-hero-text {
  flex: 1 1 520px;
  min-width: 0;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ev-pill {
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 9999px;
  background-color: rgba(247, 241, 227, 0.16);
  border: 1px solid rgba(247, 241, 227, 0.45);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ev-when {
  margin: 0;
  font-size: clamp(1rem, 1.6vw, 1.1875rem);
  font-weight: 700;
}

.ev-hero .gp-btn:disabled {
  opacity: 0.85;
  cursor: default;
  transform: none;
}

.ev-going {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.ev-going-text {
  font-weight: 700;
}

.ev-faces {
  display: flex;
}

.ev-face {
  box-sizing: border-box;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #f7f1e3;
  background-color: #8aa37c;
  color: #1f2a1f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 700;
}

.ev-faces .ev-face + .ev-face {
  margin-left: -10px;
}

.ev-face--more {
  background-color: #376451;
  color: #f7f1e3;
}

.ev-face--lg {
  flex: none;
  width: 44px;
  height: 44px;
  border-color: transparent;
}

.ev-banner {
  margin: 16px 0 0;
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 700;
}

.ev-banner--canceled {
  background-color: #F9E2D1;
  color: #7c2d12;
}

/* Main column pieces */
.ev-prose p {
  margin: 0 0 1em;
}

.ev-lead {
  margin: 0;
}

.ev-task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.ev-task,
a.ev-task:hover {
  display: flex;
  gap: 14px;
  padding: 18px;
  border: 1px solid #c8d0c0;
  border-radius: 14px;
  color: inherit;
  text-decoration: none;
}

a.ev-task:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.dark .ev-task {
  border-color: #3d4d36;
  background-color: #344a34;
}

.ev-task-icon {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: #f3ece0;
  color: #064e3b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ev-task-icon--warm {
  background-color: #F9E2D1;
  color: #C2410C;
}

.dark .ev-task-icon {
  background-color: #2d3e26;
  color: #c5d4b8;
}

.ev-task-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ev-task-title {
  font-weight: 700;
}

.ev-task-desc {
  font-size: 0.875rem;
  line-height: 1.5;
  color: #4b5563;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dark .ev-task-desc {
  color: #d0d0d0;
}

.ev-task-done {
  align-self: flex-start;
  font-size: 0.75rem;
  font-weight: 700;
  color: #064e3b;
}

.dark .ev-task-done {
  color: #c5d4b8;
}

.ev-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ev-chips .gp-label {
  margin-right: 4px;
}

.ev-chip {
  padding: 6px 12px;
  border-radius: 9999px;
  background-color: #f3ece0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #376451;
}

.dark .ev-chip {
  background-color: #344a34;
  color: #c5d4b8;
}

/* Agenda timeline */
.ev-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ev-step {
  display: grid;
  grid-template-columns: 76px 20px minmax(0, 1fr);
  column-gap: 14px;
}

.ev-step--untimed {
  grid-template-columns: 20px minmax(0, 1fr);
}

.ev-step-time {
  padding-top: 1px;
  font-weight: 700;
  color: #064e3b;
}

.dark .ev-step-time {
  color: #c5d4b8;
}

.ev-step-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ev-step-dot {
  flex: none;
  width: 12px;
  height: 12px;
  margin-top: 5px;
  border-radius: 50%;
  background-color: #8aa37c;
}

.ev-step-dot--first {
  background-color: #064e3b;
}

.dark .ev-step-dot--first {
  background-color: #c5d4b8;
}

.ev-step-line {
  flex: 1;
  width: 2px;
  background-color: #c8d0c0;
}

.dark .ev-step-line {
  background-color: #3d4d36;
}

.ev-step-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 20px;
}

.ev-step-label {
  font-weight: 700;
}

.ev-step-detail {
  font-size: 0.875rem;
  color: #4b5563;
}

.dark .ev-step-detail {
  color: #d0d0d0;
}

/* What to bring */
.ev-bring-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.ev-bring {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border-radius: 14px;
}

.ev-bring ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ev-bring li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ev-bring--you {
  background-color: #f7f1e3;
}

.ev-bring--garden {
  border: 1px solid #c8d0c0;
}

.dark .ev-bring--you {
  background-color: #344a34;
}

.dark .ev-bring--garden {
  border-color: #3d4d36;
}

.ev-check {
  width: 18px;
  height: 18px;
  stroke-width: 2.4;
  color: #064e3b;
}

.ev-check--soft {
  color: #6c8a6a;
}

.dark .ev-check {
  color: #c5d4b8;
}

.ev-projects {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Last-time recap */
.ev-recap {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.ev-recap-img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 12px;
}

/* Aside pieces */
.ev-when-card {
  pointer-events: none;
}

.ev-fine {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #4b5563;
}

.dark .ev-fine {
  color: #a8b89e;
}

#event-view .gp-btn:disabled {
  cursor: default;
  transform: none;
  opacity: 0.8;
}

.ev-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ev-row-title {
  font-weight: 700;
}

.ev-row-text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: #4b5563;
  white-space: pre-line;
}

.dark .ev-row-text {
  color: #d0d0d0;
}

.ev-host {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ev-host-name {
  font-weight: 700;
}

/* Return band */
.ev-band {
  background-color: #344a34;
  color: #f7f1e3;
}

.dark .ev-band {
  background-color: #1f2d1a;
}

.ev-band-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 40px;
  padding-bottom: 40px;
}

.ev-band-text {
  flex: 1 1 420px;
  min-width: 0;
}

.ev-band-title,
.dark .ev-band-title {
  color: #f7f1e3;
}

.ev-band-blurb {
  margin: 8px 0 0;
  max-width: 70ch;
  line-height: 1.5;
  color: #e6dccb;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 640px) {
  .ev-content {
    padding: 16px 16px 0;
  }

  .ev-going {
    align-items: flex-start;
  }

  .ev-step {
    grid-template-columns: 58px 20px minmax(0, 1fr);
    column-gap: 10px;
  }

  .ev-recap {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ev-recap-img:nth-child(3) {
    display: none;
  }

  .ev-crumb-host {
    margin-left: 0;
    flex-basis: 100%;
  }
}

/* Kept from the previous EventView: these were global and other pages may
   lean on them. */
h4 {
  font-weight: bold;
  margin-bottom: 0.5rem;
}
</style>
