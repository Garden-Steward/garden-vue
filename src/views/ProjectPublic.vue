<script setup>
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useProjectsStore, useGardensStore } from '@/stores';
import { computed, ref, onMounted, watch } from 'vue';
import { getImageOrDefault } from '@/helpers/image-utils';
import Gallery from '@/components/Gallery.vue';
import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';

const md = new MarkdownIt().use(markdownItAttrs);

const route = useRoute();
const projectsStore = useProjectsStore();
const gardensStore = useGardensStore();

const { project } = storeToRefs(projectsStore);
const { garden } = storeToRefs(gardensStore);

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
    shouldBeDark = savedTheme === 'dark';
  } else {
    shouldBeDark = getSystemPreference();
  }
  
  isDarkMode.value = shouldBeDark;
  applyDarkMode(shouldBeDark);
});

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
  localStorage.setItem('garden-public-theme', isDarkMode.value ? 'dark' : 'light');
};

// Load project data
projectsStore.getSlug(route.params.projectSlug);

// Load garden data from route params (we have gardenSlug in the URL)
if (route.params.gardenSlug) {
  gardensStore.getSlug(route.params.gardenSlug);
}

// Get hero image for project
const projectHeroImage = computed(() => {
  if (!project.value?.attributes?.hero_image) return null;
  
  const heroImage = project.value.attributes.hero_image;
  const imageUrl = heroImage.url || 
                   heroImage.formats?.medium?.url ||
                   heroImage.formats?.large?.url ||
                   heroImage.data?.attributes?.url;
  
  return getImageOrDefault(imageUrl);
});

// Render description markdown
const renderedDescription = computed(() => {
  if (!project.value?.attributes?.description) return '';
  return md.render(project.value.attributes.description);
});

// Format project dates
const formatProjectDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Get formatted date range text
const projectDateText = computed(() => {
  if (!project.value?.attributes) return '';
  
  const dateStart = project.value.attributes.date_start;
  const dateEnd = project.value.attributes.date_end;
  
  if (dateStart && dateEnd) {
    return `From ${formatProjectDate(dateStart)} to ${formatProjectDate(dateEnd)}`;
  } else if (dateStart) {
    return `Project started on ${formatProjectDate(dateStart)} and actively being worked on`;
  }
  
  return '';
});

// Get garden info for breadcrumb (from loaded garden or project data)
const gardenInfo = computed(() => {
  // Prefer loaded garden data if available
  if (garden.value?.attributes) {
    return {
      slug: garden.value.attributes.slug,
      title: garden.value.attributes.title
    };
  }
  
  // Fallback to project's garden data
  const projectGarden = project.value?.attributes?.garden;
  if (projectGarden?.data?.attributes) {
    return {
      slug: projectGarden.data.attributes.slug,
      title: projectGarden.data.attributes.title
    };
  }
  
  return null;
});

// Check if gallery has images (similar to Gallery component logic)
const hasGalleryImages = computed(() => {
  const gallery = project.value?.attributes?.featured_gallery;
  if (!gallery) return false;
  
  // Handle Strapi format: { data: [...] } or direct array
  let imagesArray = [];
  if (gallery?.data && Array.isArray(gallery.data)) {
    imagesArray = gallery.data;
  } else if (Array.isArray(gallery)) {
    imagesArray = gallery;
  } else {
    return false;
  }
  
  // Check if any images have valid URLs
  return imagesArray.some(img => {
    const url = img?.url || img?.data?.attributes?.url || img?.attributes?.url || '';
    return url && url.trim() !== '';
  });
});

// Get related volunteer days/events
const relatedVolunteerDays = computed(() => {
  if (!project.value?.attributes?.related_events) return [];
  
  let eventsArray = [];
  const relatedEvents = project.value.attributes.related_events;
  
  // Handle different Strapi formats
  if (relatedEvents?.data && Array.isArray(relatedEvents.data)) {
    eventsArray = relatedEvents.data;
  } else if (Array.isArray(relatedEvents)) {
    eventsArray = relatedEvents;
  } else {
    return [];
  }
  
  return eventsArray.map(event => {
    // Handle Strapi format: { id, attributes: { title, startDatetime, hero_image, ... } }
    if (event.attributes) {
      return {
        id: event.id,
        title: event.attributes.title,
        startDatetime: event.attributes.startDatetime,
        hero_image: event.attributes.hero_image
      };
    }
    // Already normalized format
    return {
      id: event.id,
      title: event.title,
      startDatetime: event.startDatetime,
      hero_image: event.hero_image
    };
  }).filter(event => event.title); // Only include events with titles
});

// Format event date and time
const formatEventDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get event hero image
const getEventImage = (event) => {
  if (!event?.hero_image) return null;
  
  const heroImage = event.hero_image;
  const imageUrl = heroImage.url || 
                   heroImage.formats?.medium?.url ||
                   heroImage.data?.attributes?.url ||
                   heroImage.data?.attributes?.formats?.medium?.url;
  
  return getImageOrDefault(imageUrl);
};
</script>

<template>
  <div class="project-public-container">
    <!-- Dark Mode Toggle Button -->
    <button 
      @click="toggleDarkMode"
      class="dark-mode-toggle"
      :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <i v-if="isDarkMode" class="fas fa-sun"></i>
      <i v-else class="fas fa-moon"></i>
    </button>

    <!-- Full Screen Content -->
    <div class="project-public-content">
      <!-- Garden Header -->
      <div v-if="gardenInfo" class="garden-header-section">
        <div class="garden-header-content">
          <router-link :to="`/gardens/${gardenInfo.slug}`" class="garden-header-back-link">
            <i class="fas fa-arrow-left"></i> Back
          </router-link>
          <h2 class="garden-header-title">{{ gardenInfo.title }}</h2>
        </div>
      </div>

      <!-- Hero Image Strip -->
      <div v-if="projectHeroImage && project?.attributes" class="project-hero-strip">
        <img 
          :src="projectHeroImage" 
          :alt="project.attributes.title || 'Project Image'"
          class="hero-strip-image"
        />
      </div>

      <!-- Header -->
      <div v-if="project?.attributes" class="project-header">
        <h1 class="project-title">{{ project.attributes.title }}</h1>
        <p v-if="projectDateText" class="project-date-text">{{ projectDateText }}</p>
      </div>

      <!-- Description -->
      <section v-if="project?.attributes?.description" class="project-section">
        <div class="section-content" v-html="renderedDescription"></div>
        <div v-if="gardenInfo" class="description-back-button">
          <router-link :to="`/gardens/${gardenInfo.slug}`" class="back-link-small">
            <i class="fas fa-arrow-left"></i> Back to {{ gardenInfo.title }}
          </router-link>
        </div>
      </section>

      <!-- Volunteer Days Section -->
      <section v-if="relatedVolunteerDays.length > 0" class="project-section">
        <h2 class="section-title">Volunteer Days worked on:</h2>
        <div class="volunteer-days-list">
          <router-link
            v-for="event in relatedVolunteerDays"
            :key="event.id"
            :to="`/d/${event.id}`"
            class="volunteer-day-item"
          >
            <div class="volunteer-day-content">
              <div class="volunteer-day-info">
                <h3 class="volunteer-day-title">{{ event.title }}</h3>
                <p class="volunteer-day-date">{{ formatEventDateTime(event.startDatetime) }}</p>
              </div>
              <div v-if="getEventImage(event)" class="volunteer-day-image">
                <img 
                  :src="getEventImage(event)" 
                  :alt="event.title || 'Event image'"
                  class="volunteer-day-thumbnail"
                />
              </div>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Featured Gallery -->
      <section v-if="hasGalleryImages" class="project-section">
        <Gallery 
          :gallery="project.attributes.featured_gallery"
          title="Project Gallery"
          :photo-album-url="project.attributes.photo_album_url"
        />
      </section>

      <!-- Garden Link -->
      <section v-if="garden?.attributes" class="project-section garden-link-section">
        <p class="garden-link-text">
          This project is part of 
          <router-link 
            :to="`/gardens/${garden.attributes.slug}`"
            class="garden-link"
          >
            {{ garden.attributes.title }}
          </router-link>
        </p>
      </section>

      <!-- Loading State -->
      <div v-if="project.loading" class="loading-state">
        <div class="spinner-border spinner-border-sm"></div>
        <p>Loading project information...</p>
      </div>

      <!-- Error State -->
      <div v-if="project.error" class="error-state">
        <p>Error loading project: {{ project.error }}</p>
      </div>
    </div>
  </div>
</template>

<style>
/* Full-screen container - takes over entire viewport */
.project-public-container {
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

/* Dark mode styles */
.dark .project-public-container {
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

/* Full screen content wrapper */
.project-public-content {
  min-height: 100vh;
  padding: 80px 30px 40px;
  max-width: 768px;
  margin: 0 auto;
  transition: all 0.3s ease;
}

/* Garden Header Section */
.garden-header-section {
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(138, 163, 124, 0.3);
  position: relative;
}

.garden-header-content {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.garden-header-back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  color: #4a4a4a;
  text-decoration: none;
  transition: all 0.3s ease;
  font-weight: 500;
  white-space: nowrap;
  position: absolute;
  left: 0;
}

.garden-header-back-link:hover {
  color: #8aa37c;
  text-decoration: underline;
}

.garden-header-back-link i {
  font-size: 0.9em;
}

.dark .garden-header-back-link {
  color: #d0d0d0;
}

.dark .garden-header-back-link:hover {
  color: #8aa37c;
}

.garden-header-title {
  font-size: 2rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  text-align: center;
  transition: color 0.3s ease;
}

.dark .garden-header-title {
  color: #f5f5f5;
}

.dark .garden-header-section {
  border-bottom-color: rgba(138, 163, 124, 0.5);
}

/* Hero Image Strip - horizontal, cropped from top/bottom, centered */
.project-hero-strip {
  width: 100%;
  margin-bottom: 40px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.dark .project-hero-strip {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.hero-strip-image {
  width: 100%;
  height: 400px;
  object-fit: cover;
  object-position: center;
  display: block;
}

/* Header */
.project-header {
  text-align: center;
  margin-bottom: 60px;
}

.project-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  line-height: 1.2em;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark .project-title {
  color: #f5f5f5;
}

.project-date-text {
  font-size: 1.1rem;
  color: #666;
  font-style: italic;
  margin-top: -10px;
  margin-bottom: 0;
  transition: color 0.3s ease;
}

.dark .project-date-text {
  color: #d0d0d0;
}

.project-blurb {
  font-size: 1.25rem;
  line-height: 1.6;
  color: #4a4a4a;
  max-width: 1000px;
  margin: 0 auto;
  transition: color 0.3s ease;
}

.dark .project-blurb {
  color: #d0d0d0;
}

/* Sections */
.project-section {
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 40px 50px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.dark .project-section {
  background-color: rgba(26, 26, 26, 0.6);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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

/* Markdown content styling */
.section-content :deep(h1),
.section-content :deep(h2),
.section-content :deep(h3),
.section-content :deep(h4),
.section-content :deep(h5),
.section-content :deep(h6) {
  font-weight: 700;
  margin-top: 1.5em;
  margin-bottom: 0.75em;
  line-height: 1.2;
  color: #1a1a1a;
  transition: color 0.3s ease;
}

.dark .section-content :deep(h1),
.dark .section-content :deep(h2),
.dark .section-content :deep(h3),
.dark .section-content :deep(h4),
.dark .section-content :deep(h5),
.dark .section-content :deep(h6) {
  color: #f5f5f5;
}

.section-content :deep(h1) {
  font-size: 2em;
  margin-top: 1em;
}

.section-content :deep(h2) {
  font-size: 1.75em;
}

.section-content :deep(h3) {
  font-size: 1.5em;
}

.section-content :deep(h4) {
  font-size: 1.25em;
}

.section-content :deep(p) {
  margin-bottom: 1em;
}

.section-content :deep(strong),
.section-content :deep(b) {
  font-weight: 700;
  color: #1a1a1a;
}

.dark .section-content :deep(strong),
.dark .section-content :deep(b) {
  color: #f5f5f5;
}

.section-content :deep(ul),
.section-content :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.section-content :deep(li) {
  margin-bottom: 0.5em;
}

.section-content :deep(ul) {
  list-style-type: disc;
}

.section-content :deep(ol) {
  list-style-type: decimal;
}

.section-content :deep(blockquote) {
  border-left: 4px solid #8aa37c;
  padding-left: 1em;
  margin: 1em 0;
  font-style: italic;
  color: #666;
}

.dark .section-content :deep(blockquote) {
  border-left-color: #8aa37c;
  color: #999;
}

.section-content :deep(em),
.section-content :deep(i) {
  font-style: italic;
}

.section-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.dark .section-content :deep(code) {
  background-color: rgba(255, 255, 255, 0.1);
}

.section-content :deep(pre) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
}

.dark .section-content :deep(pre) {
  background-color: rgba(255, 255, 255, 0.05);
}

.section-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.section-content :deep(a) {
  color: #8aa37c;
  text-decoration: underline;
  transition: color 0.3s ease;
}

.section-content :deep(a:hover) {
  color: #6c8a6a;
}

.dark .section-content :deep(a) {
  color: #8aa37c;
}

.dark .section-content :deep(a:hover) {
  color: #a5c499;
}

.section-content :deep(hr) {
  border: none;
  border-top: 1px solid #ddd;
  margin: 2em 0;
}

.dark .section-content :deep(hr) {
  border-top-color: #555;
}

/* Garden Link Section */
.garden-link-section {
  text-align: center;
  background: linear-gradient(135deg, rgba(138, 163, 124, 0.1) 0%, rgba(138, 163, 124, 0.05) 100%);
}

.dark .garden-link-section {
  background: linear-gradient(135deg, rgba(138, 163, 124, 0.2) 0%, rgba(138, 163, 124, 0.1) 100%);
}

.garden-link-text {
  font-size: 1.1rem;
  color: #4a4a4a;
  transition: color 0.3s ease;
}

.dark .garden-link-text {
  color: #d0d0d0;
}

.garden-link {
  color: #8aa37c;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.garden-link:hover {
  color: #6c8a6a;
  text-decoration: underline;
}

.dark .garden-link {
  color: #8aa37c;
}

.dark .garden-link:hover {
  color: #a5c499;
}

/* Volunteer Days Section */
.volunteer-days-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.volunteer-day-item {
  display: block;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  border: 1px solid rgba(138, 163, 124, 0.2);
  border-radius: 8px;
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.5);
}

.volunteer-day-item:hover {
  background-color: rgba(138, 163, 124, 0.1);
  border-color: rgba(138, 163, 124, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.2);
}

.dark .volunteer-day-item {
  background-color: rgba(210, 188, 155, 0.1);
  border-color: rgba(138, 163, 124, 0.3);
}

.dark .volunteer-day-item:hover {
  background-color: rgba(138, 163, 124, 0.15);
  border-color: rgba(138, 163, 124, 0.5);
}

.volunteer-day-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.volunteer-day-info {
  flex: 1;
  min-width: 0;
}

.volunteer-day-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #2c3e2d;
  line-height: 1.4;
}

.dark .volunteer-day-title {
  color: #d2bc9b;
}

.volunteer-day-date {
  font-size: 0.95rem;
  margin: 0;
  color: #666;
  line-height: 1.4;
}

.dark .volunteer-day-date {
  color: #999;
}

.volunteer-day-image {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  background-color: #f0f0f0;
}

.dark .volunteer-day-image {
  background-color: rgba(210, 188, 155, 0.2);
}

.volunteer-day-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Small back button in description */
.description-back-button {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(138, 163, 124, 0.2);
}

.dark .description-back-button {
  border-top-color: rgba(138, 163, 124, 0.3);
}

.back-link-small {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: #8aa37c;
  text-decoration: none;
  transition: all 0.3s ease;
  font-weight: 500;
}

.back-link-small:hover {
  color: #6c8a6a;
  text-decoration: underline;
}

.back-link-small i {
  font-size: 0.85em;
}

.dark .back-link-small {
  color: #8aa37c;
}

.dark .back-link-small:hover {
  color: #a5c499;
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .project-title {
    font-size: 2.5rem;
  }
  
  .project-blurb {
    font-size: 1.1rem;
  }
  
  .project-section {
    padding: 24px;
  }
  
  .project-public-content {
    padding: 60px 15px 30px;
  }
  
  .dark-mode-toggle {
    width: 45px;
    height: 45px;
    top: 75px;
    right: 15px;
    font-size: 18px;
  }

  .hero-strip-image {
    height: 250px;
  }

  .garden-header-content {
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }

  .garden-header-back-link {
    position: static;
    align-self: flex-start;
  }

  .garden-header-title {
    font-size: 1.5rem;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .project-title {
    font-size: 2rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
}
</style>

