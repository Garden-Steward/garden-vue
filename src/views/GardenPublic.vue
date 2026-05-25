<script setup>
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useGardensStore, useEventStore, useAuthStore, useProjectsStore } from '@/stores';
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import { getRandomDefaultImage, getImageOrDefault } from '@/helpers/image-utils';
import VolunteerActivity from '@/components/VolunteerActivity.vue';
import LeafletMap from '@/components/LeafletMap.vue';
import SunIcon from '@/components/icons/Sun.svg?raw';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const route = useRoute();
const gardensStore = useGardensStore();
const eventStore = useEventStore();
const authStore = useAuthStore();
const projectsStore = useProjectsStore();

const { garden } = storeToRefs(gardensStore);
const { volunteerDays } = storeToRefs(eventStore);
const { user } = storeToRefs(authStore);
const { projects } = storeToRefs(projectsStore);

// Dark mode state - initialize from system preference
const getSystemPreference = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

const isDarkMode = ref(false);

// Initialize dark mode from localStorage, or fall back to system preference
onMounted(() => {
  const savedTheme = localStorage.getItem('garden-public-theme');
  let shouldBeDark = false;
  
  if (savedTheme === 'dark' || savedTheme === 'light') {
    // User has manually set a preference
    shouldBeDark = savedTheme === 'dark';
  } else {
    // No saved preference, use system default
    shouldBeDark = getSystemPreference();
  }
  
  isDarkMode.value = shouldBeDark;
  applyDarkMode(shouldBeDark);
  
  // Restore scroll position if returning from a project page
  restoreScrollPosition();
});

// Restore scroll position when navigating back from project
const restoreScrollPosition = async () => {
  if (!garden.value?.attributes?.slug) return;
  
  const scrollKey = `garden-scroll-${garden.value.attributes.slug}`;
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
watch(() => garden.value?.attributes?.slug, async (slug) => {
  if (slug && !garden.value?.loading) {
    await restoreScrollPosition();
  }
}, { immediate: false });

// Apply dark mode class to html element (for Tailwind)
const applyDarkMode = (dark) => {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Toggle dark mode
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  applyDarkMode(isDarkMode.value);
  // Save preference when manually toggled
  localStorage.setItem('garden-public-theme', isDarkMode.value ? 'dark' : 'light');
};

// Save scroll position before navigating to project
const saveScrollPosition = () => {
  const container = document.querySelector('.garden-public-container');
  if (container && garden.value?.attributes?.slug) {
    const scrollPosition = container.scrollTop;
    const scrollKey = `garden-scroll-${garden.value.attributes.slug}`;
    sessionStorage.setItem(scrollKey, scrollPosition.toString());
  }
};

// Load garden data
gardensStore.getSlug(route.params.slug);
eventStore.getByGarden(route.params.slug);

// Fetch projects when garden is loaded
watch(() => garden.value?.id, (gardenId) => {
  if (gardenId) {
    projectsStore.getProjects(gardenId);
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
    .map(day => {
      // Normalize Strapi format if needed
      if (day.attributes) {
        return { ...day.attributes, id: day.id };
      }
      return day;
    })
    .filter(day => {
      // Skip if no startDatetime
      if (!day.startDatetime) {
        console.log('Event skipped - no startDatetime:', day);
        return false;
      }
      
      // Parse the date
      const eventDate = new Date(day.startDatetime);
      console.log(`Event "${day.title}": ${eventDate} >= ${now}?`, eventDate >= now);
      
      // Include events that haven't passed yet (disabled events still show, they just don't send SMS)
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
    .map(day => {
      // Normalize Strapi format if needed
      if (day.attributes) {
        return { ...day.attributes, id: day.id };
      }
      return day;
    })
    .filter(day => {
      // Skip if no startDatetime
      if (!day.startDatetime) {
        return false;
      }
      
      // Skip disabled events
      if (day.disabled === true) {
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

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Truncate description to 200 characters
const truncateDescription = (htmlString) => {
  if (!htmlString) return '';
  // Strip HTML tags using regex to get plain text length
  const plainText = htmlString.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  
  if (plainText.length <= 200) {
    return htmlString;
  }
  
  // Truncate plain text to 200 characters
  const truncated = plainText.substring(0, 200).trim();
  // Find the last space to avoid cutting words
  const lastSpace = truncated.lastIndexOf(' ');
  const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
  
  // Return truncated text with ellipsis (keeping it as plain text since we're truncating)
  return finalText + '...';
};

const isManager = computed(() => {
  if (!garden.value?.attributes?.managers?.data || !user.value) return false;
  return garden.value.attributes.managers.data.some(manager => manager.id === user.value.id);
});

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
  
  return garden.value?.attributes?.organization?.data?.attributes ||
         garden.value?.attributes?.organization?.attributes ||
         garden.value?.organization?.attributes ||
         null;
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
  const heroImageUrl = garden.value?.attributes?.hero_image?.data?.attributes?.url ||
                       garden.value?.attributes?.primary_image?.data?.attributes?.url;
  return heroImageUrl || getRandomDefaultImage();
});

// Get featured projects
const featuredProjects = computed(() => {
  if (!projects.value || !Array.isArray(projects.value) || projects.value.length === 0) {
    return [];
  }
  
  // Get all projects
  const allProjects = projects.value.filter(p => p.attributes);
  
  if (allProjects.length === 0) return [];
  
  // Get all featured projects
  const featured = allProjects.filter(p => p.attributes?.featured);
  
  // Sort featured projects by date_start (most recent first)
  if (featured.length > 0) {
    return featured.sort((a, b) => {
      const dateA = a.attributes?.date_start ? new Date(a.attributes.date_start) : new Date(0);
      const dateB = b.attributes?.date_start ? new Date(b.attributes.date_start) : new Date(0);
      return dateB - dateA;
    });
  }
  
  // If no featured projects, return most recent project
  const sorted = [...allProjects].sort((a, b) => {
    const dateA = a.attributes?.date_start ? new Date(a.attributes.date_start) : new Date(0);
    const dateB = b.attributes?.date_start ? new Date(b.attributes.date_start) : new Date(0);
    return dateB - dateA;
  });
  
  return sorted.slice(0, 1); // Return just the most recent as a single-item array
});

// Get project hero image helper function
const getProjectHeroImage = (project) => {
  if (!project) return null;
  
  const heroImage = project.attributes?.hero_image;
  if (!heroImage) return null;
  
  // Handle different image formats
  const imageUrl = heroImage.url || 
                   heroImage.formats?.medium?.url ||
                   heroImage.data?.attributes?.url ||
                   heroImage.data?.attributes?.formats?.medium?.url;
  
  return getImageOrDefault(imageUrl);
};

// Get garden coordinates for map
const gardenCoordinates = computed(() => {
  const attrs = garden.value?.attributes;
  
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
    label: garden.value?.attributes?.title || 'Garden Location'
  }];
});

const showGardenMap = computed(() => {
  return !!(
    garden.value?.attributes &&
    gardenCoordinates.value &&
    mapLocationTrackings.value.length > 0
  );
});

const googleMapsUrl = computed(() => {
  const c = gardenCoordinates.value;
  if (!c) return null;
  const { latitude: lat, longitude: lng } = c;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
});

const volunteerCount = computed(() => {
  const v = garden.value?.attributes?.volunteers;
  if (!v) return 0;
  if (Array.isArray(v)) return v.length;
  if (Array.isArray(v.data)) return v.data.length;
  return 0;
});

const activeVolunteersBubbleText = computed(() => {
  const n = volunteerCount.value;
  const noun = n === 1 ? 'Active Volunteer' : 'Active Volunteers';
  return `${n} ${noun}`;
});

const gardenStartedAt = computed(() => {
  const a = garden.value?.attributes;
  return a?.createdAt || a?.publishedAt || garden.value?.createdAt || null;
});

const formatStartedDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const gardenStartedLabel = computed(() => formatStartedDate(gardenStartedAt.value));

/** All projects for this garden (public list beside map). */
const gardenProjectsList = computed(() => {
  const list = projects.value;
  if (!list || !Array.isArray(list)) return [];
  return list.filter((p) => p?.attributes);
});
</script>

<template>
  <div class="garden-public-container">
    <!-- Dark Mode Toggle Button -->
    <button 
      @click="toggleDarkMode"
      class="dark-mode-toggle"
      :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <span v-if="isDarkMode" class="sun-icon" v-html="SunIcon"></span>
      <i v-else class="fas fa-moon"></i>
    </button>

    <!-- Full Screen Content -->
    <div class="garden-public-content">
      <!-- Title + blurb first -->
      <div v-if="garden.attributes" class="garden-header garden-header-top">
        <h1 class="garden-title">{{ garden.attributes.title }}</h1>
        <p v-if="garden.attributes.blurb" class="garden-blurb">{{ garden.attributes.blurb }}</p>
      </div>
      <div v-else-if="garden.loading" class="garden-header garden-header-top">
        <div class="garden-title h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
        <div class="garden-blurb h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
      </div>

      <!-- Hero Image -->
      <div v-if="garden.attributes" class="garden-hero-image">
        <img 
          :src="gardenHeroImage" 
          :alt="garden.attributes.title || 'Garden Image'"
          class="hero-image"
        />
      </div>
      <div v-else-if="garden.loading" class="garden-hero-image">
        <div class="hero-image bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
      </div>

      <!-- Upcoming Events and Latest Events (before map / stats) -->
      <section v-if="garden.attributes" class="two-column-section">
        <div class="two-column-layout">
          <!-- Left: Upcoming Events -->
          <div class="column-content">
            <h2 v-if="upcomingEvents.length > 0" class="section-title">Upcoming Events</h2>
            <div v-if="upcomingEvents.length > 0" class="events-list">
              <div 
                v-for="event in upcomingEvents" 
                :key="event.id"
                class="event-item"
              >
                <router-link 
                  :to="`/d/${event.id}`"
                  class="event-link"
                >
                  <h3 class="event-title">{{ event.title }}</h3>
                  <p class="event-date">{{ formatDate(event.startDatetime) }}</p>
                  <div v-if="event.blurb" class="event-description" v-html="event.blurb"></div>
                </router-link>
              </div>
            </div>
            
            <div v-if="upcomingEvents.length === 0 && latestEvents.length === 0 && !volunteerDays.loading" class="section-empty">
              <p>No events scheduled at this time.</p>
            </div>
          </div>
          
          <!-- Right: Latest Events -->
          <div class="column-content">
            <div v-if="latestEvents.length > 0">
              <h2 class="section-title">
                <span v-if="upcomingEvents.length > 0">Latest Events</span>
                <span v-else>Events</span>
              </h2>
              <div class="events-list">
                <div 
                  v-for="event in latestEvents" 
                  :key="event.id"
                  class="event-item"
                >
                  <router-link 
                    :to="`/d/${event.id}`"
                    class="event-link"
                  >
                    <h3 class="event-title">{{ event.title }}</h3>
                    <p class="event-date">{{ formatDate(event.startDatetime) }}</p>
                    <div v-if="event.blurb" class="event-description" v-html="event.blurb"></div>
                  </router-link>
                </div>
              </div>
              <button 
                v-if="hasMoreLatestEvents"
                @click="loadMoreLatestEvents"
                class="btn-load-more"
              >
                Load More
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="garden.attributes?.description" class="garden-section">

        <div class="section-content" v-html="garden.attributes.description.replace(/\n/g, '<br>')"></div>
      </section>

      <!-- Map (left) + stats (right) on wide screens -->
      <section v-if="garden.attributes" class="garden-map-stats-section">
        <div
          class="garden-map-stats-row"
          :class="{ 'garden-map-stats-row--no-map': !showGardenMap }"
        >
          <div v-if="showGardenMap" class="garden-map-column">
            <div class="garden-map-container garden-map-container--inline">
              <LeafletMap 
                :location-trackings="mapLocationTrackings"
                :center-coordinates="gardenCoordinates"
              />
            </div>
            <a
              v-if="googleMapsUrl"
              :href="googleMapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="garden-google-maps-link"
            >
              Open in Google Maps
            </a>
          </div>
          <div class="garden-stats-column">
            <p class="garden-active-volunteers-bubble">{{ activeVolunteersBubbleText }}</p>
            <dl class="garden-stats-dl">
              <div v-if="organization?.title" class="garden-stat">
                <dt class="garden-stat-label">Organization</dt>
                <dd class="garden-stat-value">
                  <a
                    v-if="organization.url"
                    :href="organization.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="garden-stat-link"
                  >{{ organization.title }}</a>
                  <template v-else>{{ organization.title }}</template>
                </dd>
              </div>
              <div v-if="gardenStartedLabel" class="garden-stat">
                <dt class="garden-stat-label">Started</dt>
                <dd class="garden-stat-value">{{ gardenStartedLabel }}</dd>
              </div>
              <div class="garden-stat">
                <dt class="garden-stat-label">Projects</dt>
                <dd class="garden-stat-value">
                  {{ gardenProjectsList.length > 0 ? gardenProjectsList.length : 'Working on it' }}
                </dd>
              </div>
            </dl>
            <ul v-if="gardenProjectsList.length" class="garden-projects-mini-list">
              <li
                v-for="proj in gardenProjectsList"
                :key="proj.id"
                class="garden-projects-mini-item"
              >
                <router-link
                  v-if="proj.attributes.slug && garden.attributes.slug"
                  :to="`/gardens/${garden.attributes.slug}/p/${proj.attributes.slug}`"
                  class="garden-projects-mini-link"
                  @click="saveScrollPosition"
                >
                  {{ proj.attributes.title }}
                </router-link>
                <span v-else class="garden-projects-mini-text">{{ proj.attributes.title }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Garden Activity (only if there's activity) -->
      <section 
        v-if="garden?.id" 
        v-show="hasGardenActivity"
        class="garden-section"
      >
        <h2 class="section-title">Garden Activity</h2>
        <VolunteerActivity 
          :garden-id="garden.id"
          @has-activity="hasGardenActivity = $event"
        />
      </section>

      <!-- What We're Working On (Featured Projects) -->
      <section v-if="featuredProjects.length > 0" class="garden-section">
        <h2 class="section-title">What We're Working On</h2>
        <div 
          v-for="(project, index) in featuredProjects" 
          :key="project.id"
          class="project-section"
          :class="{ 'project-section-spacing': index > 0 }"
        >
          <div class="project-layout" :class="{ 'project-layout-reverse': index % 2 === 1 }">
            <!-- Copy/Text -->
            <div class="project-content">
              <h3 class="project-title">{{ project.attributes.title }}</h3>
              <div v-if="project.attributes.short_description" class="project-description" v-html="truncateDescription(project.attributes.short_description)"></div>
              <div v-else-if="project.attributes.description" class="project-description" v-html="truncateDescription(project.attributes.description)"></div>
              <router-link 
                v-if="project.attributes.slug && garden?.attributes?.slug"
                :to="`/gardens/${garden.attributes.slug}/p/${project.attributes.slug}`"
                class="btn-explore-project"
                @click="saveScrollPosition"
              >
                Explore this Project
              </router-link>
            </div>
            
            <!-- Hero Image (cropped square) -->
            <div v-if="getProjectHeroImage(project)" class="project-image-wrapper">
              <img 
                :src="getProjectHeroImage(project)" 
                :alt="project.attributes.title || 'Project image'"
                class="project-hero-image"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Join/Contact Section -->
      <section class="garden-section garden-cta">
        <h2 class="section-title">Get Involved</h2>
        <p class="section-content">
          Interested in volunteering or learning more about this garden?
        </p>
        <div class="cta-buttons">
          <button 
            @click="openDonationModal"
            class="btn-primary"
          >
            Donate to the Garden
          </button>
          <router-link 
            to="/events"
            class="btn-secondary"
          >
            View All Events
          </router-link>
        </div>
      </section>

      <!-- Organization Section -->
      <section v-if="organization" class="garden-section organization-section">
        <div class="organization-content">
          <p class="organization-intro">
            This is a project of <span class="heart-emoji">❤️</span> by the 
            <span v-if="organization.title" class="organization-name-inline">
              <a 
                v-if="organization.url"
                :href="organization.url" 
                target="_blank" 
                rel="noopener noreferrer"
                class="organization-link-inline"
              >
                <strong>{{ organization.title }}</strong>
              </a>
              <strong v-else>{{ organization.title }}</strong>
            </span>
          </p>
          <p v-if="organization.description" class="organization-description">
            {{ organization.description }}
          </p>
          <div v-if="organization.url" class="organization-url">
            <a 
              :href="organization.url" 
              target="_blank" 
              rel="noopener noreferrer"
              class="organization-website-link"
            >
              Visit Website
              <svg class="inline w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
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
          
          <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Donate to {{ garden.attributes?.title || 'This Garden' }}</h2>
          
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
  color: #1a1a1a;
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

/* Dark mode toggle button */
.dark-mode-toggle {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 100000;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid #8aa37c;
  background-color: #ffffff;
  color: #8aa37c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark-mode-toggle:hover {
  background-color: #8aa37c;
  color: #ffffff;
  transform: scale(1.1);
}

.dark .dark-mode-toggle {
  background-color: #1a1a1a;
  border-color: #8aa37c;
  color: #8aa37c;
}

.dark .dark-mode-toggle:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

/* Sun icon SVG styling */
.sun-icon {
  width: 24px;
  height: 24px;
  transition: all 0.3s ease;
  color: #4a4a4a;
}

.dark-mode-toggle:hover .sun-icon {
  color: #ffffff;
}

.dark .dark-mode-toggle .sun-icon {
  color: #8aa37c;
}

.dark .dark-mode-toggle:hover .sun-icon {
  color: #ffffff;
}

/* Full screen content wrapper */
.garden-public-content {
  min-height: 100vh;
  padding: 80px 30px 40px;
  max-width: 1400px;
  margin: 0 auto;
  transition: all 0.3s ease;
}

/* Hero Image */
.garden-hero-image {
  width: 100%;
  margin-bottom: 60px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.garden-hero-image:has(+ .two-column-section) {
  margin-bottom: 36px;
}

.dark .garden-hero-image {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.hero-image {
  width: 100%;
  height: auto;
  max-height: 500px;
  object-fit: cover;
  display: block;
}

/* Header (title + blurb at top, before hero) */
.garden-header {
  text-align: center;
}
.garden-header-top {
  margin-bottom: 28px;
}

/* Map (narrow, left) + stats (right); whole block centered with panel background */
.garden-map-stats-section {
  box-sizing: border-box;
  width: 100%;
  max-width: 920px;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 60px;
  padding: 28px 32px 32px;
  border-radius: 16px;
  background-color: rgba(234, 241, 229, 0.95);
  border: 1px solid rgba(138, 163, 124, 0.35);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.dark .garden-map-stats-section {
  background-color: rgba(31, 45, 28, 0.92);
  border-color: rgba(138, 163, 124, 0.28);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

.garden-map-stats-row {
  display: grid;
  grid-template-columns: minmax(260px, 38%) minmax(0, 1fr);
  gap: 40px;
  align-items: start;
}

.garden-map-stats-row--no-map {
  grid-template-columns: 1fr;
}

.garden-stats-column {
  text-align: left;
  min-width: 0;
}

.garden-active-volunteers-bubble {
  display: inline-block;
  margin: 0 0 20px 0;
  padding: 12px 20px;
  border-radius: 9999px;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
  color: #1a3d1f;
  background-color: rgba(138, 163, 124, 0.28);
  border: 1px solid rgba(108, 138, 106, 0.45);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.dark .garden-active-volunteers-bubble {
  color: #e8f0e4;
  background-color: rgba(138, 163, 124, 0.35);
  border-color: rgba(197, 212, 184, 0.35);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.garden-stats-dl {
  margin: 0;
  padding: 0;
}

.garden-stat {
  margin-bottom: 18px;
}

.garden-stat:last-of-type {
  margin-bottom: 0;
}

.garden-stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #666;
  margin: 0 0 4px 0;
}

.dark .garden-stat-label {
  color: #a8b89e;
}

.garden-stat-value {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.4;
  color: #1a1a1a;
}

.dark .garden-stat-value {
  color: #f5f5f5;
}

.garden-stat-link {
  color: #6c8a6a;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.garden-stat-link:hover {
  color: #8aa37c;
  text-decoration: underline;
}

.dark .garden-stat-link {
  color: #a3c49a;
}

.dark .garden-stat-link:hover {
  color: #c5d4b8;
}

.garden-projects-mini-list {
  list-style: none;
  margin: 20px 0 0 0;
  padding: 0;
  border-top: 1px solid rgba(138, 163, 124, 0.25);
  padding-top: 16px;
}

.dark .garden-projects-mini-list {
  border-top-color: rgba(138, 163, 124, 0.35);
}

.garden-projects-mini-item {
  margin-bottom: 10px;
}

.garden-projects-mini-item:last-child {
  margin-bottom: 0;
}

.garden-projects-mini-link {
  color: #6c8a6a;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s ease;
}

.garden-projects-mini-link:hover {
  color: #8aa37c;
  text-decoration: underline;
}

.dark .garden-projects-mini-link {
  color: #a3c49a;
}

.garden-projects-mini-text {
  color: #4a4a4a;
}

.dark .garden-projects-mini-text {
  color: #d0d0d0;
}

.garden-map-column {
  min-width: 0;
}

.garden-google-maps-link {
  display: inline-block;
  margin-top: 14px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #6c8a6a;
  text-decoration: none;
  transition: color 0.2s ease, text-decoration 0.2s ease;
}

.garden-google-maps-link:hover {
  color: #4a6b48;
  text-decoration: underline;
}

.dark .garden-google-maps-link {
  color: #a3c49a;
}

.dark .garden-google-maps-link:hover {
  color: #c5d4b8;
}

.garden-map-container--inline {
  margin-top: 0;
  max-width: 100%;
  width: 100%;
}

@media (max-width: 900px) {
  .garden-map-stats-section {
    padding: 22px 18px 24px;
    border-radius: 14px;
  }

  .garden-map-stats-row:not(.garden-map-stats-row--no-map) {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

.garden-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark .garden-title {
  color: #f5f5f5;
}

.garden-blurb {
  font-size: 1.25rem;
  line-height: 1.6;
  color: #4a4a4a;
  max-width: 1000px;
  margin: 0 auto;
  transition: color 0.3s ease;
}

.dark .garden-blurb {
  color: #d0d0d0;
}

/* Garden Map Container */
.garden-map-container {
  max-height: 300px;
  margin-top: 30px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.dark .garden-map-container {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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

/* Actions */
.garden-actions {
  text-align: center;
  margin-bottom: 40px;
}

/* Sections */
.garden-section {
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 40px 50px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.dark .garden-section {
  background-color: rgba(26, 26, 26, 0.6);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* Two-column section */
.two-column-section {
  background-color: transparent;
  padding: 0;
  margin-bottom: 30px;
  box-shadow: none;
}

.dark .two-column-section {
  background-color: transparent;
  box-shadow: none;
}

.two-column-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
}

.column-content {
  min-width: 0; /* Allow content to shrink */
}

.activity-content {
  color: #4a4a4a;
}

.dark .activity-content {
  color: #d0d0d0;
}

.activity-text {
  font-size: 1.1rem;
  line-height: 1.8;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 300;
  font-family: Georgia, "Times New Roman", Times, serif;
  margin-bottom: 24px;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark .section-title {
  color: #f5f5f5;
}

.section-content {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #4a4a4a;
  transition: color 0.3s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.dark .section-content {
  color: #d0d0d0;
}

.section-empty {
  color: #888;
  font-style: italic;
  transition: color 0.3s ease;
}

.dark .section-empty {
  color: #888;
}

/* Events List */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: none;
}

/* Garden Activity Section - hide when no activity but keep rendered for IntersectionObserver */
.garden-activity-hidden {
  visibility: hidden;
  position: absolute;
  left: -9999px;
  height: 0;
  overflow: hidden;
}

/* Garden Activity Section - hide when no activity but keep rendered for IntersectionObserver */
.garden-activity-hidden {
  visibility: hidden;
  position: absolute;
  left: -9999px;
  height: 0;
  overflow: hidden;
}

.event-item {
  border-left: 4px solid #8aa37c;
  padding: 12px 20px;
  margin: 0 -20px;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
  background-color: rgba(138, 163, 124, 0.1);
  box-shadow: none;
}

.dark .event-item {
  background-color: rgba(138, 163, 124, 0.8);
}

.event-item:hover {
  background-color: rgba(108, 138, 106, 0.25);
}

.dark .event-item:hover {
  background-color: rgba(108, 138, 106, 0.35);
}

.event-link {
  display: block;
  text-decoration: none;
  transition: all 0.3s ease;
  color: inherit;
}

.event-link:hover {
  text-decoration: none;
}

.event-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark .event-title {
  color: #f5f5f5;
}

.event-link:hover .event-title {
  color: #8aa37c;
}

.event-date {
  font-size: 1rem;
  color: #666;
  margin-bottom: 12px;
  transition: color 0.3s ease;
}

.dark .event-date {
  color: #999;
}

.event-description {
  color: #4a4a4a;
  margin-top: 8px;
  transition: color 0.3s ease;
}

.dark .event-description {
  color: #d0d0d0;
}

/* CTA Section */
.garden-cta {
  text-align: center;
  background: linear-gradient(135deg, rgba(138, 163, 124, 0.1) 0%, rgba(138, 163, 124, 0.05) 100%);
}

.dark .garden-cta {
  background: linear-gradient(135deg, rgba(138, 163, 124, 0.2) 0%, rgba(138, 163, 124, 0.1) 100%);
}

.cta-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
  align-items: center;
  margin-top: 30px;
}

@media (min-width: 640px) {
  .cta-buttons {
    flex-direction: row;
  }
}

/* Buttons - Using custom green colors */
.btn-primary,
.btn-secondary,
.btn-manage {
  display: inline-block;
  padding: 14px 32px;
  font-size: 1.1rem;
  font-weight: 600;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  cursor: pointer;
}

.btn-primary {
  background-color: #8aa37c;
  color: #ffffff;
}

.btn-primary:hover {
  background-color: #6c8a6a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
}

.btn-secondary {
  background-color: transparent;
  color: #8aa37c;
  border: 2px solid #8aa37c;
}

.btn-secondary:hover {
  background-color: #8aa37c;
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
}

.dark .btn-secondary {
  color: #8aa37c;
  border-color: #8aa37c;
}

.dark .btn-secondary:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

.btn-explore-project {
  display: inline-block;
  padding: 14px 32px;
  font-size: 1.1rem;
  font-weight: 600;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s ease;
  background-color: transparent;
  color: #8aa37c;
  border: 2px solid #8aa37c;
  margin-top: 20px;
}

.btn-explore-project:hover {
  background-color: #8aa37c;
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
}

.dark .btn-explore-project {
  color: #8aa37c;
  border-color: #8aa37c;
}

.dark .btn-explore-project:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

/* Make button full width on mobile */
@media (max-width: 768px) {
  .btn-explore-project {
    display: block;
    width: 100%;
    text-align: center;
  }
}

.btn-manage {
  background-color: #8aa37c;
  color: #ffffff;
  padding: 12px 28px;
  font-size: 1rem;
}

.btn-manage:hover {
  background-color: #6c8a6a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
}

.btn-load-more {
  display: inline-block;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.3s ease;
  background-color: transparent;
  color: #8aa37c;
  border: 1px solid #8aa37c;
  cursor: pointer;
  margin-top: 12px;
}

.btn-load-more:hover {
  background-color: #8aa37c;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(138, 163, 124, 0.3);
}

.dark .btn-load-more {
  color: #8aa37c;
  border-color: #8aa37c;
}

.dark .btn-load-more:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #4a4a4a;
}

.dark .loading-state {
  color: #d0d0d0;
}

/* Error State */
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

/* Project Section Layout */
.project-section {
  padding: 0;
  overflow: hidden;
  margin-bottom: 0;
}

.project-section + .project-section,
.project-section-spacing {
  margin-top: 40px;
  padding-top: 40px;
  border-top: 1px solid rgba(138, 163, 124, 0.2);
}

.dark .project-section + .project-section {
  border-top-color: rgba(138, 163, 124, 0.3);
}

.project-layout {
  display: flex;
  flex-direction: row;
  gap: 50px;
  align-items: center;
}

.project-layout-reverse {
  flex-direction: row-reverse;
}

.project-content {
  padding: 40px 30px;
  min-width: 0; /* Allow text to wrap properly */
  flex: 1;
}

.project-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 16px;
  line-height: 1.2em;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark .project-title {
  color: #f5f5f5;
}

.project-description {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #4a4a4a;
  transition: color 0.3s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.dark .project-description {
  color: #d0d0d0;
}

.project-image-wrapper {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border-radius: 12px;
  border: 3px solid #8aa37c;
  background-color: rgba(138, 163, 124, 0.05);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.dark .project-image-wrapper {
  border-color: #8aa37c;
  background-color: rgba(138, 163, 124, 0.1);
}

.project-hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 8px;
}

/* Organization Section */
.organization-section {
  text-align: center;
}

.organization-content {
  max-width: 800px;
  margin: 0 auto;
}

.organization-intro {
  font-size: 1.25rem;
  line-height: 1.8;
  color: #4a4a4a;
  margin-bottom: 24px;
  transition: color 0.3s ease;
}

.dark .organization-intro {
  color: #d0d0d0;
}

.organization-name-inline {
  display: inline;
}

.organization-link-inline {
  color: inherit;
  text-decoration: none;
  transition: color 0.3s ease;
}

.organization-link-inline:hover {
  color: #8aa37c;
  text-decoration: underline;
}

.organization-link-inline strong {
  font-weight: 700;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark .organization-link-inline strong {
  color: #f5f5f5;
}

.organization-link-inline:hover strong {
  color: #8aa37c;
}

.heart-emoji {
  display: inline-block;
  margin-left: 6px;
  font-size: 1.1rem;
}

.organization-description {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #4a4a4a;
  margin-bottom: 24px;
  transition: color 0.3s ease;
}

.dark .organization-description {
  color: #d0d0d0;
}

.organization-url {
  margin-top: 24px;
}

.organization-website-link {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  color: #8aa37c;
  text-decoration: none;
  border: 2px solid #8aa37c;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.organization-website-link:hover {
  background-color: #8aa37c;
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
}

.dark .organization-website-link {
  color: #8aa37c;
  border-color: #8aa37c;
}

.dark .organization-website-link:hover {
  background-color: #8aa37c;
  color: #ffffff;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .garden-title {
    font-size: 2.5rem;
  }
  
  .garden-blurb {
    font-size: 1.1rem;
  }
  
  .garden-section {
    padding: 24px;
  }
  
  .garden-public-content {
    padding: 60px 15px 30px;
  }
  
  .dark-mode-toggle {
    display: none;
  }
  
  .project-layout {
    flex-direction: column !important;
    gap: 0;
    align-items: stretch;
  }
  
  .project-layout-reverse {
    flex-direction: column !important;
  }
  
  .project-content {
    padding: 24px;
    width: 100%;
    order: 2;
  }
  
  .project-image-wrapper {
    aspect-ratio: 16/9;
    margin-bottom: 0;
    width: 100%;
    max-width: 100%;
    order: 1;
  }
  
  /* Ensure image is always at top on mobile, regardless of reverse class */
  .project-layout-reverse .project-image-wrapper,
  .project-layout .project-image-wrapper {
    order: 1;
  }
  
  .project-layout-reverse .project-content,
  .project-layout .project-content {
    order: 2;
  }
  
  .two-column-layout {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .organization-title {
    font-size: 1.75rem;
  }

  /* Inset event cards on mobile so the section background shows through
     on the sides and the rounded corners are visible. */
  .event-item {
    margin: 0 8px;
    border-radius: 10px;
  }
}

@media (max-width: 480px) {
  .garden-title {
    font-size: 2rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
}

/* Garden Map Container */
.garden-map-container {
  width: 100%;
  height: 300px;
  margin: 24px 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .garden-map-container {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .garden-map-container {
    height: 250px;
    margin: 16px 0;
  }
}

@media (max-width: 480px) {
  .garden-map-container {
    height: 200px;
    margin: 12px 0;
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


