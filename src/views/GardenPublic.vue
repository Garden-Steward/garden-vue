<script setup>
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useGardensStore, useEventStore, useAuthStore, useProjectsStore } from '@/stores';
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import { getRandomDefaultImage, getImageOrDefault } from '@/helpers/image-utils';
import VolunteerActivity from '@/components/VolunteerActivity.vue';
import LeafletMap from '@/components/LeafletMap.vue';
import { approximateCenter, APPROX_AREA_RADIUS_M } from '@/helpers/location-privacy';
import { truncatePlainText } from '@/helpers/safe-html';
import { RsvpPhoneModal } from '@/components/modals';
import GardenMemberMenu from '@/components/GardenMemberMenu.vue';
import '@/assets/garden-public.css';

const route = useRoute();
const gardensStore = useGardensStore();
const eventStore = useEventStore();
const authStore = useAuthStore();
const projectsStore = useProjectsStore();

const { garden } = storeToRefs(gardensStore);
const { volunteerDays } = storeToRefs(eventStore);
const { user } = storeToRefs(authStore);
const { projects } = storeToRefs(projectsStore);

onMounted(() => {
  restoreScrollPosition();
});

// Restore scroll position when navigating back from project
const restoreScrollPosition = async () => {
  if (!garden.value?.slug) return;
  
  const scrollKey = `garden-scroll-${garden.value.slug}`;
  const savedScrollPosition = sessionStorage.getItem(scrollKey);
  
  if (savedScrollPosition) {
    // Wait for DOM to be ready
    await nextTick();
    
    // Additional small delay to ensure content is rendered
    setTimeout(() => {
      const container = document.querySelector('.garden-public-container');
      if (container) {
        container.scrollTop = parseInt(savedScrollPosition, 10);
      }
      // Clear the saved position after restoring
      sessionStorage.removeItem(scrollKey);
    }, 100);
  }
};

// Watch for garden to load and restore scroll position
watch(() => garden.value?.slug, async (slug) => {
  if (slug && !garden.value?.loading) {
    await restoreScrollPosition();
  }
}, { immediate: false });

// Save scroll position before navigating to project
const saveScrollPosition = () => {
  const container = document.querySelector('.garden-public-container');
  if (container && garden.value?.slug) {
    const scrollPosition = container.scrollTop;
    const scrollKey = `garden-scroll-${garden.value.slug}`;
    sessionStorage.setItem(scrollKey, scrollPosition.toString());
  }
};

// Load garden data
gardensStore.getSlug(route.params.slug);
eventStore.getByGarden(route.params.slug);

// Fetch projects when garden is loaded
watch(() => garden.value?.id, (gardenId) => {
  if (gardenId) {
    projectsStore.getProjects(garden.value);
  }
}, { immediate: true });

// Get upcoming events (not past)
const upcomingEvents = computed(() => {
  // Handle different response structures
  let eventsArray = [];
  
  // Debug: log the volunteerDays structure
  console.log('volunteerDays value:', volunteerDays.value);
  
  if (volunteerDays.value) {
    // Check if it's already an array
    if (Array.isArray(volunteerDays.value)) {
      eventsArray = volunteerDays.value;
    } 
    // Check if it has a days property that's an array
    else if (volunteerDays.value.days) {
      if (Array.isArray(volunteerDays.value.days)) {
        eventsArray = volunteerDays.value.days;
      } else if (volunteerDays.value.days.data && Array.isArray(volunteerDays.value.days.data)) {
        eventsArray = volunteerDays.value.days.data;
      }
    }
    // Check if it has a data property
    else if (volunteerDays.value.data && Array.isArray(volunteerDays.value.data)) {
      eventsArray = volunteerDays.value.data;
    }
  }
  
  console.log('eventsArray:', eventsArray);
  
  if (!eventsArray || eventsArray.length === 0) {
    console.log('No events found in array');
    return [];
  }
  
  const now = new Date();
  console.log('Current time:', now);
  
  const upcoming = eventsArray
    .map(day => day)
    .filter(day => {
      // Skip if no startDatetime
      if (!day.startDatetime) {
        console.log('Event skipped - no startDatetime:', day);
        return false;
      }
      
      // Parse the date
      const eventDate = new Date(day.startDatetime);
      console.log(`Event "${day.title}": ${eventDate} >= ${now}?`, eventDate >= now);
      
      // Include events that haven't passed yet (disabled events still show, they just don't send SMS;
      // canceled ones show with a Canceled tag so visitors know not to come)
      return eventDate >= now;
    })
    .sort((a, b) => {
      // Sort by startDatetime, earliest first
      const dateA = new Date(a.startDatetime || 0);
      const dateB = new Date(b.startDatetime || 0);
      return dateA - dateB;
    })
    .slice(0, 3); // Limit to 3 upcoming events
    
  console.log('Upcoming events result:', upcoming);
  return upcoming;
});

// State for how many latest events to show
const latestEventsToShow = ref(2);

// Get all past events (sorted by most recent first)
const allPastEvents = computed(() => {
  // Handle different response structures (same as upcomingEvents)
  let eventsArray = [];
  
  if (volunteerDays.value) {
    if (Array.isArray(volunteerDays.value)) {
      eventsArray = volunteerDays.value;
    } 
    else if (volunteerDays.value.days) {
      if (Array.isArray(volunteerDays.value.days)) {
        eventsArray = volunteerDays.value.days;
      } else if (volunteerDays.value.days.data && Array.isArray(volunteerDays.value.days.data)) {
        eventsArray = volunteerDays.value.days.data;
      }
    }
    else if (volunteerDays.value.data && Array.isArray(volunteerDays.value.data)) {
      eventsArray = volunteerDays.value.data;
    }
  }
  
  if (!eventsArray || eventsArray.length === 0) {
    return [];
  }
  
  const now = new Date();
  
  const pastEvents = eventsArray
    .map(day => day)
    .filter(day => {
      // Skip if no startDatetime
      if (!day.startDatetime) {
        return false;
      }
      
      // Skip disabled events
      if (day.disabled === true) {
        return false;
      }

      // Skip canceled events
      if (day.canceled === true) {
        return false;
      }

      // Only include past events (events that have already happened)
      const eventDate = new Date(day.startDatetime);
      return eventDate < now;
    })
    .sort((a, b) => {
      // Sort by startDatetime, most recent first
      const dateA = new Date(a.startDatetime || 0);
      const dateB = new Date(b.startDatetime || 0);
      return dateB - dateA;
    });
    
  return pastEvents;
});

// Get displayed latest events (limited by latestEventsToShow)
const latestEvents = computed(() => {
  return allPastEvents.value.slice(0, latestEventsToShow.value);
});

// Check if there are more events to load
const hasMoreLatestEvents = computed(() => {
  return allPastEvents.value.length > latestEventsToShow.value;
});

// Load more latest events
const loadMoreLatestEvents = () => {
  latestEventsToShow.value += 2;
};

// Donation modal state
const showDonationModal = ref(false);

// Garden activity state - only show section if API returns activity
const hasGardenActivity = ref(false);

const openDonationModal = () => {
  showDonationModal.value = true;
};

const closeDonationModal = () => {
  showDonationModal.value = false;
};

// Get organization from garden
const organization = computed(() => {
  if (!garden.value || garden.value.loading || garden.value.error) {
    return null;
  }
  
  return garden.value?.organization || null;
});

// Get Venmo handle from organization (if available)
const venmoHandle = computed(() => {
  if (!organization.value) {
    return null;
  }
  
  // Check for venmo_handle in organization
  const handle = organization.value?.venmo_handle ||
                 organization.value?.venmoHandle;
  
  if (!handle || (typeof handle === 'string' && handle.trim() === '')) {
    return null;
  }
  
  // Clean up the handle - remove @ symbol if present and trim whitespace
  const cleaned = String(handle).replace(/^@+/, '').trim();
  return cleaned || null;
});

// Build Venmo payment link
const venmoPaymentLink = computed(() => {
  if (!venmoHandle.value) return null;
  return `https://account.venmo.com/pay?recipients=${encodeURIComponent(venmoHandle.value)}`;
});

// Get hero image for garden (use default if none available)
const gardenHeroImage = computed(() => {
  // Check if garden has any image field (could be hero_image, primary_image, etc.)
  const heroImageUrl = garden.value?.hero_image?.url ||
                       garden.value?.primary_image?.url;
  return heroImageUrl || getRandomDefaultImage();
});

// Get project hero image helper function
const getProjectHeroImage = (project) => {
  if (!project) return null;
  
  const heroImage = project.hero_image;
  if (!heroImage) return null;

  // v5 media is flat
  const imageUrl = heroImage.url ||
                   heroImage.formats?.medium?.url;

  return getImageOrDefault(imageUrl);
};

// Get garden coordinates for map
const gardenCoordinates = computed(() => {
  const attrs = garden.value;

  // Check if we have lat/lon
  const latitude = attrs?.latitude || attrs?.lat;
  const longitude = attrs?.longitude || attrs?.lon;
  
  if (latitude && longitude) {
    return {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };
  }
  
  return null;
});

// Get location trackings array for map (single garden location)
const mapLocationTrackings = computed(() => {
  if (!gardenCoordinates.value) return [];
  
  return [{
    latitude: gardenCoordinates.value.latitude,
    longitude: gardenCoordinates.value.longitude,
    label: garden.value?.title || 'Garden Location'
  }];
});

// Signed-out visitors get a 600-yard area, not the exact spot.
const approximateArea = computed(() => {
  if (user.value || !gardenCoordinates.value) return null;
  const { latitude, longitude } = gardenCoordinates.value;
  // Strapi already offsets coordinates for signed-out callers and says so;
  // offsetting again would double the shift.
  const center = garden.value?.location_approximate
    ? { latitude, longitude }
    : approximateCenter(latitude, longitude, garden.value?.id ?? garden.value?.slug);
  return center ? { ...center, radiusMeters: APPROX_AREA_RADIUS_M } : null;
});

const showGardenMap = computed(() => {
  return !!(
    garden.value?.id &&
    gardenCoordinates.value &&
    mapLocationTrackings.value.length > 0
  );
});

const googleMapsUrl = computed(() => {
  const c = gardenCoordinates.value;
  if (!c || !user.value) return null;
  const { latitude: lat, longitude: lng } = c;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
});

const volunteerCount = computed(() => {
  const v = garden.value?.volunteers;
  return Array.isArray(v) ? v.length : 0;
});

const gardenStartedAt = computed(() => {
  return garden.value?.createdAt || garden.value?.publishedAt || null;
});

/** All projects for this garden (public list beside map). */
const gardenProjectsList = computed(() => {
  const list = projects.value;
  if (!list || !Array.isArray(list)) return [];
  return list.filter((p) => p?.id);
});

/** Featured projects first, then most recent. */
const orderedProjects = computed(() => {
  const byDate = (p) => (p.date_start ? new Date(p.date_start).getTime() : 0);
  return [...gardenProjectsList.value].sort((a, b) => {
    const featuredDiff = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    return featuredDiff || byDate(b) - byDate(a);
  });
});

const projectsToShow = ref(4);
const visibleProjects = computed(() => orderedProjects.value.slice(0, projectsToShow.value));
const hasMoreProjects = computed(() => orderedProjects.value.length > projectsToShow.value);
const showAllProjects = () => {
  projectsToShow.value = orderedProjects.value.length;
};

const projectLinkProps = (project) => {
  if (project?.slug && garden.value?.slug) {
    return { to: `/gardens/${garden.value.slug}/p/${project.slug}` };
  }
  return {};
};

// The next workday that's still on drives the hero CTA and the sidebar feature
// card. Canceled ones only show in the list under it, tagged.
const nextEvent = computed(() => upcomingEvents.value.find(e => !e.canceled) || null);
const laterEvents = computed(() => upcomingEvents.value.filter(e => e !== nextEvent.value));

// RSVP to the next workday right here rather than sending people to the event
// page. Signed-in stewards RSVP directly; everyone else gives a phone number.
const showRsvpModal = ref(false);
const rsvpedIds = ref(new Set());
const rsvpBusy = ref(false);
const nextEventRsvped = computed(() => !!nextEvent.value && rsvpedIds.value.has(nextEvent.value.id));
const markRsvped = (id) => { rsvpedIds.value = new Set(rsvpedIds.value).add(id); };

const rsvpNextEvent = async () => {
  if (!nextEvent.value || nextEventRsvped.value || rsvpBusy.value) return;
  if (!user.value) {
    showRsvpModal.value = true;
    return;
  }
  rsvpBusy.value = true;
  try {
    await eventStore.rsvpEvent({ userId: user.value.id, id: nextEvent.value.id });
    markRsvped(nextEvent.value.id);
  } catch {
    // The store's error handler already raises an alert.
  } finally {
    rsvpBusy.value = false;
  }
};

const formatShortDay = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatWeekdayTime = (dateString) => {
  if (!dateString) return '';
  const weekday = new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday} · ${formatTime(dateString)}`;
};

const chipMonth = (dateString) =>
  dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
const chipDay = (dateString) => (dateString ? new Date(dateString).getDate() : '');

const gardenSinceLabel = computed(() => {
  if (!gardenStartedAt.value) return '';
  return new Date(gardenStartedAt.value).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
});

const scrollToSection = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Pages under the garden (events, tasks) link back to a section with a hash,
// e.g. /gardens/foo#events. This page scrolls inside its own fixed container,
// so the router's window-level hash scrolling can't reach it — do it here
// once the garden has rendered.
watch(
  () => [garden.value?.id, route.hash],
  async ([id, hash]) => {
    if (!id || !hash || hash.length < 2) return;
    await nextTick();
    setTimeout(() => scrollToSection(decodeURIComponent(hash.slice(1))), 150);
  },
  { immediate: true },
);
</script>

<template>
  <div class="garden-public-container">
    <div class="garden-public-content">
      <!-- Hero: title, blurb and the main action sit on the photo -->
      <section v-if="garden.id" class="gp-hero" aria-labelledby="garden-title">
        <img :src="gardenHeroImage" :alt="garden.title || 'Garden image'" class="gp-hero-img" />
        <div class="gp-hero-scrim" aria-hidden="true"></div>
        <div class="gp-hero-body">
          <h1 id="garden-title" class="gp-title">{{ garden.title }}</h1>
          <p v-if="garden.blurb" class="gp-blurb">{{ garden.blurb }}</p>
          <!-- RSVPing to a workday is how new volunteers join, so it leads the hero -->
          <div v-if="nextEvent" class="gp-hero-actions">
            <a
              v-if="nextEvent.partiful_link"
              :href="nextEvent.partiful_link"
              target="_blank"
              rel="noopener noreferrer"
              class="gp-btn gp-btn-cta"
            >RSVP to next event</a>
            <button
              v-else
              type="button"
              class="gp-btn gp-btn-cta"
              :disabled="nextEventRsvped || rsvpBusy"
              @click="rsvpNextEvent"
            >{{ nextEventRsvped ? "You're going" : 'RSVP to next event' }}</button>
            <router-link :to="`/d/${nextEvent.id}`" class="gp-btn gp-btn-ghost">
              Next event · {{ formatShortDay(nextEvent.startDatetime) }}
              <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </router-link>
          </div>
        </div>
      </section>
      <div v-else-if="garden.loading" class="gp-hero gp-hero--loading animate-pulse" aria-hidden="true"></div>

      <!-- At a glance: replaces the old stats panel -->
      <section v-if="garden.id" class="gp-facts" aria-label="Garden at a glance">
        <div v-if="nextEvent" class="gp-fact">
          <span class="gp-fact-icon">
            <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
          </span>
          <span class="gp-fact-text">
            <span class="gp-label">Next workday</span>
            <router-link :to="`/d/${nextEvent.id}`" class="gp-fact-value gp-fact-link gp-nowrap">
              {{ formatShortDay(nextEvent.startDatetime) }} · {{ formatTime(nextEvent.startDatetime) }}
            </router-link>
          </span>
        </div>
        <div class="gp-fact">
          <span class="gp-fact-icon">
            <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.5 3.5 5.2" /></svg>
          </span>
          <span class="gp-fact-text">
            <span class="gp-label">Volunteers</span>
            <span class="gp-fact-value">{{ volunteerCount }} active</span>
          </span>
        </div>
        <div v-if="organization?.title" class="gp-fact">
          <span class="gp-fact-icon">
            <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V11" /><path d="M12 11C12 6 8 4 4 4c0 5 3 7 8 7z" /><path d="M12 13c0-4 3-6 8-6 0 4-3 6-8 6z" /></svg>
          </span>
          <span class="gp-fact-text">
            <span class="gp-label">Stewarded by</span>
            <a
              v-if="organization.url"
              :href="organization.url"
              target="_blank"
              rel="noopener noreferrer"
              class="gp-fact-value gp-fact-link"
            >{{ organization.title }}</a>
            <span v-else class="gp-fact-value">{{ organization.title }}</span>
          </span>
        </div>
        <div v-if="gardenSinceLabel" class="gp-fact">
          <span class="gp-fact-icon">
            <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          </span>
          <span class="gp-fact-text">
            <span class="gp-label">Tending since</span>
            <span class="gp-fact-value">{{ gardenSinceLabel }}</span>
          </span>
        </div>
        <div v-if="gardenProjectsList.length" class="gp-fact">
          <span class="gp-fact-icon">
            <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-6h6v6" /></svg>
          </span>
          <span class="gp-fact-text">
            <span class="gp-label">Projects</span>
            <button type="button" class="gp-fact-value gp-fact-link gp-fact-button" @click="scrollToSection('projects')">
              {{ gardenProjectsList.length }} underway
            </button>
          </span>
        </div>
        <!-- Signed-in members: mute this garden's texts or leave it -->
        <GardenMemberMenu
          class="gp-member-menu"
          :garden-slug="garden.slug"
          :garden-title="garden.title"
        />
      </section>

      <div v-if="garden.id" class="gp-body">
        <!-- Main column: story, projects, activity -->
        <div class="gp-main">
          <section v-if="garden.description" id="about" class="gp-section gp-section--about">
            <h2 class="gp-h2">About this garden</h2>
            <div class="gp-prose gp-prose--plain">{{ garden.description }}</div>
          </section>

          <section v-if="orderedProjects.length" id="projects" class="gp-section">
            <div class="gp-section-head">
              <h2 class="gp-h2">What we're working on</h2>
              <span class="gp-muted">
                {{ orderedProjects.length }} {{ orderedProjects.length === 1 ? 'project' : 'projects' }}
              </span>
            </div>
            <div class="gp-project-grid">
              <component
                :is="projectLinkProps(project).to ? 'router-link' : 'div'"
                v-for="project in visibleProjects"
                :key="project.id"
                v-bind="projectLinkProps(project)"
                class="gp-project-card"
                @click="saveScrollPosition"
              >
                <img
                  v-if="getProjectHeroImage(project)"
                  :src="getProjectHeroImage(project)"
                  :alt="project.title || 'Project image'"
                  class="gp-project-img"
                />
                <span v-else class="gp-project-img gp-project-img--empty" aria-hidden="true">
                  <svg class="gp-icon gp-icon--lg" viewBox="0 0 24 24"><path d="M12 21V11" /><path d="M12 11C12 6 8 4 4 4c0 5 3 7 8 7z" /><path d="M12 13c0-4 3-6 8-6 0 4-3 6-8 6z" /></svg>
                </span>
                <span class="gp-project-body">
                  <span class="gp-project-title">{{ project.title }}</span>
                  <span
                    v-if="project.short_description || project.description"
                    class="gp-project-desc"
                  >{{ truncatePlainText(project.short_description || project.description) }}</span>
                  <span v-if="projectLinkProps(project).to" class="gp-project-more">
                    Explore project
                    <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                </span>
              </component>
            </div>
            <button v-if="hasMoreProjects" type="button" class="gp-btn gp-btn-outline" @click="showAllProjects">
              Show all {{ orderedProjects.length }} projects
            </button>
          </section>

          <!-- Garden Activity (only if there's activity) -->
          <section v-show="hasGardenActivity" class="gp-section">
            <h2 class="gp-h2">Garden activity</h2>
            <VolunteerActivity
              :garden-id="garden.id"
              @has-activity="hasGardenActivity = $event"
            />
          </section>
        </div>

        <!-- Sidebar: events, map, organization -->
        <aside id="events" class="gp-aside" aria-label="Events and garden details">
          <div class="gp-card gp-card--feature">
            <p class="gp-label gp-label--accent">
              {{ upcomingEvents.length > 1 ? 'Upcoming workdays' : 'Upcoming workday' }}
            </p>
            <template v-if="nextEvent || laterEvents.length">
              <template v-if="nextEvent">
              <router-link :to="`/d/${nextEvent.id}`" class="gp-event gp-event--feature" :aria-label="`${nextEvent.title}, view workday details`">
                <span class="gp-datechip gp-datechip--solid">
                  <span class="gp-datechip-month">{{ chipMonth(nextEvent.startDatetime) }}</span>
                  <span class="gp-datechip-day">{{ chipDay(nextEvent.startDatetime) }}</span>
                </span>
                <span class="gp-event-text">
                  <span class="gp-event-title">{{ nextEvent.title }}</span>
                  <span class="gp-event-meta">{{ formatWeekdayTime(nextEvent.startDatetime) }}</span>
                </span>
                <svg class="gp-icon gp-event-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </router-link>
              <div v-if="nextEvent.blurb" class="gp-event-blurb">{{ nextEvent.blurb }}</div>
              <div class="gp-rsvp-row">
                <a
                  v-if="nextEvent.partiful_link"
                  :href="nextEvent.partiful_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="gp-btn gp-btn-primary gp-btn-sm"
                >RSVP on Partiful</a>
                <button
                  v-else
                  type="button"
                  class="gp-btn gp-btn-primary gp-btn-sm"
                  :disabled="nextEventRsvped || rsvpBusy"
                  @click="rsvpNextEvent"
                >
                  {{ nextEventRsvped ? "You're going" : 'RSVP' }}
                </button>
              </div>
              </template>

              <div v-if="laterEvents.length" class="gp-event-list gp-event-list--later">
                <p class="gp-label">{{ nextEvent ? 'Also coming up' : 'Coming up' }}</p>
                <router-link
                  v-for="event in laterEvents"
                  :key="event.id"
                  :to="`/d/${event.id}`"
                  class="gp-event gp-event--compact"
                >
                  <span class="gp-datechip">
                    <span class="gp-datechip-month">{{ chipMonth(event.startDatetime) }}</span>
                    <span class="gp-datechip-day">{{ chipDay(event.startDatetime) }}</span>
                  </span>
                  <span class="gp-event-text">
                    <span class="gp-event-title">
                      {{ event.title }}
                      <span v-if="event.canceled" class="gp-canceled-tag">Canceled</span>
                    </span>
                    <span class="gp-event-meta">{{ formatWeekdayTime(event.startDatetime) }}</span>
                  </span>
                </router-link>
              </div>
            </template>
            <div v-else-if="volunteerDays.loading" class="gp-skeleton animate-pulse" aria-hidden="true"></div>
            <p v-else class="gp-empty">No workdays scheduled right now. Check back soon.</p>
          </div>

          <div v-if="latestEvents.length" class="gp-card">
            <p class="gp-label">Past workdays</p>
            <div class="gp-event-list">
              <router-link
                v-for="event in latestEvents"
                :key="event.id"
                :to="`/d/${event.id}`"
                class="gp-event gp-event--compact"
              >
                <span class="gp-datechip">
                  <span class="gp-datechip-month">{{ chipMonth(event.startDatetime) }}</span>
                  <span class="gp-datechip-day">{{ chipDay(event.startDatetime) }}</span>
                </span>
                <span class="gp-event-text">
                  <span class="gp-event-title">{{ event.title }}</span>
                </span>
              </router-link>
            </div>
            <div class="gp-card-links">
              <button v-if="hasMoreLatestEvents" type="button" class="gp-link gp-link-button" @click="loadMoreLatestEvents">
                Show more
              </button>
              <router-link to="/events" class="gp-link">See all events</router-link>
            </div>
          </div>

          <div v-if="showGardenMap" class="gp-card gp-card--map">
            <div class="garden-map-container garden-map-container--inline">
              <!-- Keyed on sign-in so the map redraws when the exact spot unlocks -->
              <LeafletMap
                :key="approximateArea ? 'area' : 'pin'"
                :location-trackings="mapLocationTrackings"
                :center-coordinates="approximateArea || gardenCoordinates"
                :area="approximateArea"
              />
            </div>
            <p v-if="approximateArea" class="gp-map-note">
              Approximate area ·
              <button type="button" class="gp-link gp-link-button" @click="authStore.openLoginModal(route.fullPath)">Sign in for location details</button>
            </p>
            <a
              v-if="googleMapsUrl"
              :href="googleMapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="gp-link gp-map-link"
            >
              Open in Google Maps
            </a>
          </div>

          <div v-if="organization" class="gp-card">
            <p class="gp-label">A project of</p>
            <a
              v-if="organization.url && organization.title"
              :href="organization.url"
              target="_blank"
              rel="noopener noreferrer"
              class="gp-org-name"
            >{{ organization.title }}</a>
            <span v-else-if="organization.title" class="gp-org-name">{{ organization.title }}</span>
            <p v-if="organization.description" class="gp-org-desc">{{ organization.description }}</p>
            <a
              v-if="organization.url"
              :href="organization.url"
              target="_blank"
              rel="noopener noreferrer"
              class="gp-link"
            >
              Visit website
              <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>
        </aside>
      </div>

      <!-- Donations: only when the stewarding org has a Venmo handle to receive them -->
      <section v-if="garden.id && venmoPaymentLink" class="gp-involved">
        <div class="gp-involved-text">
          <h2 class="gp-h2 gp-h2--on-dark">Support this garden</h2>
          <p>
            Donations go to
            <template v-if="organization?.title">{{ organization.title }}</template>
            <template v-else>the garden's stewards</template>
            via Venmo.
          </p>
        </div>
        <div class="gp-involved-actions">
          <button type="button" class="gp-btn gp-btn-cream" @click="openDonationModal">Donate</button>
        </div>
      </section>

      <!-- Loading State -->
      <div v-if="garden.loading" class="loading-state">
        <div class="spinner-border spinner-border-sm"></div>
        <p>Loading garden information...</p>
      </div>

      <!-- Error State -->
      <div v-if="garden.error" class="error-state">
        <p>Error loading garden: {{ garden.error }}</p>
      </div>
    </div>
  </div>

  <!-- Donation Modal -->
  <Teleport to="#modals">
    <div v-if="showDonationModal" class="w-xl">
      <!-- The backdrop - peach for light mode, dark green for dark mode -->
      <div class="donation-modal-backdrop fixed inset-0 bg-[#9A9084] dark:bg-[#1a1a1a] opacity-90 dark:opacity-90" @click="closeDonationModal"></div>

      <!-- Modal container - centered -->
      <div class="fixed inset-0 flex items-center justify-center overflow-x-hidden overflow-y-auto py-6" @click="closeDonationModal">
        <div class="donation-modal-container bg-white dark:!bg-[#2d3e26] text-black dark:text-white grid grid-cols-1 md:w-1/2 w-[90%] gap-2 p-6 md:p-10 mx-auto max-w-[95vw] max-h-[90vh] overflow-y-auto my-auto relative rounded-md shadow-xl" @click.stop>
          <!-- Close X button -->
          <button 
            @click="closeDonationModal"
            class="absolute top-3 right-3 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white focus:outline-none transition-colors z-10"
            type="button"
            aria-label="Close donation modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Donate to {{ garden.title || 'This Garden' }}</h2>
          
          <div class="space-y-4">
            <p class="text-gray-700 dark:text-gray-300">
              Your support helps us continue to grow and maintain this community garden.
            </p>
            
            <div v-if="venmoHandle && venmoPaymentLink" class="bg-gray-50 dark:bg-[#1f2d1a] p-6 rounded-lg text-center border border-gray-200 dark:border-[#3d4d36] dark:border-opacity-50">
              <p class="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">Venmo</p>
              <p class="text-2xl font-bold text-custom-green dark:text-[#8aa37c] mb-4 break-all">@{{ venmoHandle }}</p>
              <a 
                :href="venmoPaymentLink"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-custom-green dark:bg-[#8aa37c] text-white font-medium rounded-lg hover:bg-darker-green dark:hover:bg-[#6b8560] transition-all shadow-md dark:shadow-lg"
              >
                <!-- Venmo Icon -->
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.303 1.973c-2.317 0-4.235 1.848-4.737 4.228-.5-2.38-2.42-4.228-4.737-4.228C4.318 1.973 1.5 4.826 1.5 8.379c0 5.487 10.844 13.648 10.844 13.648S23.188 13.866 23.188 8.379c0-3.553-2.818-6.406-5.885-6.406z"/>
                </svg>
                <span>Pay with Venmo</span>
              </a>
            </div>
            
            <div v-else class="bg-gray-50 dark:bg-[#1f2d1a] p-6 rounded-lg text-center border border-gray-200 dark:border-[#3d4d36] dark:border-opacity-50">
              <p class="text-gray-700 dark:text-gray-300">
                Please contact the garden managers for donation information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <RsvpPhoneModal
    v-model="showRsvpModal"
    :event-id="nextEvent?.id"
    :garden-title="garden?.title"
    @rsvped="markRsvped"
  />
</template>

<style>
/* Full-screen container - takes over entire viewport */
.garden-public-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow-y: auto;
  background-color: #ffffff;
  color: #1f2a1f;
  transition: background-color 0.3s ease, color 0.3s ease;
  z-index: 10000;
  margin: 0;
  padding: 0;
}

/* Dark mode styles - using Tailwind's dark class on html */
.dark .garden-public-container {
  background-color: #2d3e26;
  color: #f5f5f5;
}

/* Page wrapper */
.garden-public-content {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 72px 24px 40px;
  max-width: 1280px;
  margin: 0 auto;
  font-family: Roboto, system-ui, sans-serif;
}

/* Member menu sits at the far end of the at-a-glance strip */
.gp-member-menu {
  align-self: center;
  margin-left: auto;
}

/* ---------- Map ---------- */
.garden-map-container {
  width: 100%;
  height: 300px;
  margin: 24px 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.garden-map-container--inline {
  margin-top: 0;
  max-width: 100%;
}

/*
 * Leaflet popups/tooltips use a white panel; this page sets light body text via
 * .dark .garden-public-container { color: #f5f5f5 }, which inherited into the
 * map UI. Force readable dark text on white surfaces (higher specificity than LeafletMap.vue alone).
 */
.dark .garden-public-container .leaflet-popup-content,
.dark .garden-public-container .leaflet-popup-content .popup-content,
.dark .garden-public-container .leaflet-popup-content a,
.dark .garden-public-container .leaflet-tooltip {
  color: #1a1a1a !important;
}

.dark .garden-public-container .leaflet-popup-close-button {
  color: #4b5563 !important;
}

.dark .garden-public-container .leaflet-popup-close-button:hover {
  color: #111827 !important;
}

.dark .garden-public-container .leaflet-popup-content-wrapper,
.dark .garden-public-container .leaflet-popup-tip {
  background-color: #ffffff !important;
}

/* ---------- Loading / error ---------- */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #4a4a4a;
}

.dark .loading-state {
  color: #d0d0d0;
}

.error-state {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 20px;
  margin: 20px auto;
  max-width: 600px;
  color: #dc2626;
}

.dark .error-state {
  background-color: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

/* ---------- Small screens ---------- */

@media (max-width: 640px) {
  .garden-public-content {
    padding: 56px 16px 32px;
  }
}

/* Donation Modal Styling */
.donation-modal-backdrop {
  transition: all 0.3s ease;
}

.dark .donation-modal-backdrop {
  background-color: #1a1a1a !important;
}

.donation-modal-container {
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.dark .donation-modal-container {
  background-color: #2d3e26 !important;
  border: 1px solid rgba(138, 163, 124, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(138, 163, 124, 0.1) !important;
}
</style>
