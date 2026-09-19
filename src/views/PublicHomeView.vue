<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { isProjectPubliclyVisible } from '@/_config/GardenConfig';
import { useProjectsStore } from '@/stores';
import NewsletterSignup from '@/components/NewsletterSignup.vue';

// ── Video sections ──────────────────────────────────
// Each clip is paired with its line on purpose — "hole-water" carries
// "we can choose to be its steward", "pick-elderberries" carries the call to
// join. They are no longer shuffled from a pool; the copy depends on the
// imagery. (`shovel-woodchips.mp4` is out of rotation as a result.)
const VIDEO_BASE = 'https://storage.googleapis.com/steward-public/videos/homepage/';

const videoSections = ref([
  {
    id: 'welcome',
    line: 'When we see the whole world as a garden..',
    subline: null,
    overlay: 'rgba(20, 40, 20, 0.35)',
    gradient: 'linear-gradient(180deg, rgba(10,20,15,.55) 0%, rgba(10,20,15,0) 34%, rgba(10,20,15,.45) 100%)',
    dark: false,
    src: `${VIDEO_BASE}leaf-herb-prep-dehydrate.mp4`,
  },
  {
    id: 'steward',
    line: 'we can choose to be its steward',
    subline: 'In a mission to restore biodiversity, Garden Steward helps communities organize around their land.',
    overlay: 'rgba(10, 20, 15, 0.5)',
    gradient: null,
    dark: true,
    src: `${VIDEO_BASE}hole-water.mp4`,
  },
  {
    id: 'action',
    line: 'Join a project. Or start one where you live.',
    subline: 'All hands are needed in transition times.',
    overlay: 'rgba(60, 40, 20, 0.4)',
    gradient: 'linear-gradient(180deg, rgba(26,42,26,0) 55%, rgba(26,42,26,.9) 100%)',
    dark: false,
    src: `${VIDEO_BASE}pick-elderberries.mp4`,
  },
]);

// Fallback gradient when no video source is set
const fallbackGradients = [
  'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 40%, #4a7c59 100%)',
  'linear-gradient(135deg, #2d3e26 0%, #1a2a1a 40%, #3d4d36 100%)',
  'linear-gradient(135deg, #3a2a1a 0%, #5a3d2d 40%, #7c594a 100%)',
];

// ── Featured projects ───────────────────────────────
// The homepage cards carry only photo, name and one line. Status, category and
// the next-work meta line are the projects list's job — the homepage is meant
// to make someone curious, not to let them compare.
const projectsStore = useProjectsStore();
const { communityProjects } = storeToRefs(projectsStore);

projectsStore.getAllProjects();

const featuredProjects = computed(() => {
  const list = Array.isArray(communityProjects.value) ? communityProjects.value : [];
  return list
    // The landing page is the public face of the site: approved work only.
    .filter(isProjectPubliclyVisible)
    .slice(0, 3);
});

function projectImage(project) {
  const img = project?.hero_image;
  const url = img?.formats?.medium?.url || img?.formats?.small?.url || img?.url;
  if (!url) return '';
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
}

/** Project detail lives under its garden; fall back to the list when unassociated. */
function projectLink(project) {
  const gardenSlug = project?.garden && typeof project.garden === 'object' ? project.garden.slug : null;
  if (gardenSlug && project.slug) return `/gardens/${gardenSlug}/p/${project.slug}`;
  return '/projects';
}

// ── Scroll-driven motion ────────────────────────────
const activeSection = ref(0);
const sectionsRef = ref([]);
const videoRefs = ref([]);
const textRefs = ref([]);

/**
 * The sticky nav is opaque cream and sits above the page, so the first video is
 * pulled up underneath it — otherwise video 1 is short by the header height and
 * never reads as full-bleed.
 */
const headerOffset = ref(0);

function setSectionRefs(el, index) {
  if (el) sectionsRef.value[index] = el;
}

function setVideoRef(el, index) {
  if (el) videoRefs.value[index] = el;
}

function setTextRef(el, index) {
  if (el) textRefs.value[index] = el;
}

let observer = null;
let rafHandle = null;
let reduceMotion = false;

function measureHeader() {
  const nav = document.querySelector('.gs-navbar');
  const container = document.querySelector('.app-container > .container');
  const navHeight = nav ? nav.getBoundingClientRect().height : 0;
  const padTop = container ? parseFloat(getComputedStyle(container).paddingTop) || 0 : 0;
  headerOffset.value = Math.round(navHeight + padTop);
}

/**
 * Bloom: the in-view video scales up slightly and eases back as it leaves.
 * `p` is −1 above the viewport, 0 in place, 1 scrolled past. Driven straight
 * from scroll position, so the video transform carries no CSS transition.
 */
function paint() {
  const first = sectionsRef.value[0];
  if (!first) return;
  const h = first.clientHeight || window.innerHeight || 1;
  const y = window.scrollY;

  videoRefs.value.forEach((video, i) => {
    const p = (y - i * h) / h;
    const vis = Math.max(0, 1 - Math.abs(p));
    if (video) video.style.transform = `scale(${1 + 0.09 * vis})`;
    const text = textRefs.value[i];
    if (text) {
      text.style.opacity = String(Math.max(0.25, 1 - Math.abs(p) * 1.5));
      text.style.transform = `translateY(${p * -26}px)`;
    }
  });
}

function onScroll() {
  if (rafHandle) return;
  rafHandle = requestAnimationFrame(() => {
    rafHandle = null;
    paint();
  });
}

function onResize() {
  measureHeader();
  if (!reduceMotion) paint();
}

onMounted(() => {
  reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  measureHeader();

  /**
   * `proximity`, not `mandatory`. With `mandatory` (plus `scroll-snap-stop:
   * always`) the scroll position is trapped on the last video and nothing below
   * it is reachable. The video sections still snap under `proximity`.
   */
  document.documentElement.style.scrollSnapType = 'y proximity';

  // Staggered start so the three clips do not all decode at once.
  videoRefs.value.forEach((video, i) => {
    setTimeout(() => {
      if (video && video.paused) video.play().catch(() => {});
    }, i * 700);
  });

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const idx = Number(entry.target.dataset.section);
        if (entry.isIntersecting) {
          activeSection.value = idx;
          const video = videoRefs.value[idx];
          if (video && video.paused) video.play().catch(() => {});
        }
      });
    },
    { threshold: 0.5 }
  );
  sectionsRef.value.forEach((el) => el && observer.observe(el));

  window.addEventListener('resize', onResize);

  if (!reduceMotion) {
    window.addEventListener('scroll', onScroll, { passive: true });
    paint();
  }
});

onUnmounted(() => {
  if (observer) observer.disconnect();
  if (rafHandle) cancelAnimationFrame(rafHandle);
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onResize);
  document.documentElement.style.scrollSnapType = '';
});

// ── Helpers ─────────────────────────────────────────
function bgStyle(index) {
  const sec = videoSections.value[index];
  if (sec.src) return {};
  return { background: fallbackGradients[index] || fallbackGradients[0] };
}

function overlayStyle(index) {
  return { backgroundColor: videoSections.value[index].overlay };
}

function isActive(index) {
  return activeSection.value === index;
}
</script>

<template>
  <div class="home-wrapper" :style="{ marginTop: `-${headerOffset}px` }">

    <!-- ── Video sections ────────────────────────────── -->
    <section
      v-for="(sec, i) in videoSections"
      :key="sec.id"
      :ref="(el) => setSectionRefs(el, i)"
      :data-section="i"
      class="video-section"
      :class="{ 'section-active': isActive(i) }"
      :style="bgStyle(i)"
    >
      <!-- Background video (when src is set) -->
      <video
        v-if="sec.src"
        :ref="(el) => setVideoRef(el, i)"
        class="section-video"
        :src="sec.src"
        muted
        loop
        playsinline
      ></video>

      <!-- Color overlay -->
      <div class="section-overlay" :style="overlayStyle(i)"></div>
      <div v-if="sec.gradient" class="section-overlay" :style="{ background: sec.gradient }"></div>

      <!-- Text content -->
      <div
        :ref="(el) => setTextRef(el, i)"
        class="section-text"
        :class="{ 'text-dark': !sec.dark, 'text-light': sec.dark }"
      >
        <p class="section-line">{{ sec.line }}</p>
        <p v-if="sec.subline" class="section-subline">{{ sec.subline }}</p>
      </div>

      <!-- Scroll hint (only on first section) -->
      <div v-if="i === 0" class="scroll-hint">
        <span class="scroll-word">Scroll</span>
        <span class="scroll-chevron">⌄</span>
      </div>
    </section>

    <!-- ── Content below the video sections ───────────── -->
    <div class="content-below">

      <!-- Projects callout -->
      <div class="projects-band">
        <h2 class="projects-heading">Projects</h2>
        <div class="projects-flow">
          <span class="project-verb">Find one</span>
          <span class="project-verb">Join one</span>
          <span class="project-verb">Pitch your own</span>
        </div>
        <p class="projects-invite">An open call — everyone's invited to get involved.</p>
      </div>

      <!-- Featured projects -->
      <div class="featured">
        <div class="featured-head">
          <h3 class="featured-title">Happening now</h3>
          <span class="featured-place">Oakland, CA</span>
        </div>
        <p class="featured-sub">Three of the projects our cooperative is working on this month.</p>

        <div class="featured-cards">
          <router-link
            v-for="p in featuredProjects"
            :key="p.id"
            :to="projectLink(p)"
            class="pcard"
          >
            <div
              class="pcard-photo"
              :style="projectImage(p) ? { backgroundImage: `url(${projectImage(p)})` } : null"
            ></div>
            <div class="pcard-body">
              <h4 class="pcard-name">{{ p.title }}</h4>
              <p class="pcard-line">{{ p.short_description }}</p>
            </div>
          </router-link>
        </div>

        <p v-if="communityProjects.loading" class="featured-state">Loading projects…</p>

        <router-link to="/projects" class="featured-cta">See all projects</router-link>
        <p class="featured-elsewhere">
          Not in Oakland? <router-link to="/join" class="featured-elsewhere-link">Start a project in your city</router-link>
        </p>
      </div>

      <!-- About -->
      <div class="content-section">
        <h2 class="section-heading">Open-source tools for running projects and garden events, instructing, managing watering, and so much more.</h2>
        <p class="body-text">
          Garden Steward is a community-driven, open-source project developing SMS-first software
          for managing volunteer events, watering schedules, and harvest coordination. Since 2022,
          we've partnered with the Oakland Urban Farming Project (OUFP) to organize urban
          agricultural initiatives.
        </p>
        <p class="body-text">
          We believe the best way to achieve the fastest change is a cooperative approach.
          Each SMS phone number is its own cooperative of local gardening projects. If you're
          in Oakland, join our existing cooperative — otherwise, partner with us and add to
          our cooperative network!
        </p>

        <div class="cta-row">
          <a href="/join" class="btn-home btn-home-primary">
            Submit your Community Project
          </a>
          <a
            href="https://github.com/Garden-Steward"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-home btn-home-secondary"
          >
            <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Explore on GitHub
          </a>
        </div>
      </div>

      <!-- Newsletter -->
      <div class="newsletter-section">
        <div class="newsletter-inner">
          <NewsletterSignup />
        </div>
      </div>

      <!-- Manifesto -->
      <div class="manifesto-section">
        <p class="manifesto-label">Our Mission</p>
        <h2 class="manifesto-heading">We are life seeking fulfillment.</h2>
        <p class="manifesto-quote">
          "We rose on a planet bustling in biodiversity..."
        </p>
        <a href="/manifesto" class="btn-home btn-home-primary btn-manifesto">
          Read Our Full Manifesto
        </a>
      </div>

    </div>

  </div>
</template>

<style scoped>
/* ── Reset ────────────────────────────────────────── */
.home-wrapper {
  background: #1a2a1a;
}

/* ── Full-viewport video sections ─────────────────── */
.video-section {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  scroll-snap-align: start;
}

.section-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  will-change: transform;
  /* No transition — the transform is driven directly by the scroll handler. */
}

.section-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.section-text {
  position: relative;
  z-index: 2;
  text-align: right;
  padding: 0 22px 0 36px;
  max-width: 720px;
  margin-left: auto;
}

.section-line {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 38px;
  font-weight: 400;
  line-height: 1.18;
  margin: 0;
}

.section-subline {
  font-size: 15px;
  line-height: 1.5;
  margin: 16px 0 0;
  font-weight: 400;
  font-style: italic;
}

.text-dark .section-line,
.text-dark .section-subline {
  color: #fff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}

.text-light .section-line,
.text-light .section-subline {
  color: #f0e8d8;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

@media (min-width: 768px) {
  .section-line {
    font-size: clamp(38px, 5vw, 4.5rem);
  }
  .section-subline {
    font-size: clamp(15px, 2vw, 1.25rem);
  }
  .section-text {
    padding: 0 2rem;
  }
}

/* ── Scroll hint ───────────────────────────────────── */
.scroll-hint {
  position: absolute;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  animation: float 2.5s ease-in-out infinite;
}

.scroll-word {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}

.scroll-chevron {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1;
}

@keyframes float {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(8px); }
}

/* ── Content below videos ─────────────────────────── */
.content-below {
  background: #f7f1e3;
  scroll-snap-align: none;
}

html.dark .content-below {
  background: #121a12;
}

/* ── Projects callout band ─────────────────────────── */
.projects-band {
  background: #2d3e26;
  padding: 38px 22px 30px;
  text-align: center;
}

html.dark .projects-band {
  background: #1a2a1a;
}

.projects-heading {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 52px;
  font-weight: 400;
  color: #c8dbbf;
  margin: 0 0 10px;
  line-height: 1;
  letter-spacing: -0.02em;
}

.projects-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-bottom: 12px;
}

.project-verb {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.projects-invite {
  font-size: 13px;
  color: #a0b8a0;
  margin: 0;
  font-style: italic;
}

/* ── Featured projects ─────────────────────────────── */
.featured {
  background: #f7f1e3;
  padding: 26px 18px 34px;
}

html.dark .featured {
  background: #121a12;
}

.featured-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.featured-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 22px;
  font-weight: 700;
  color: #376451;
  margin: 0;
}

html.dark .featured-title {
  color: #c8dbbf;
}

.featured-place {
  font-size: 12px;
  font-weight: 700;
  color: #064e3b;
  white-space: nowrap;
}

html.dark .featured-place {
  color: #8aa37c;
}

.featured-sub {
  margin: 0 0 18px;
  font-size: 13px;
  line-height: 1.5;
  color: #4b5563;
}

html.dark .featured-sub {
  color: #cfd8c8;
}

.featured-state {
  margin: 0;
  font-size: 13px;
  color: #4b5563;
}

.featured-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pcard {
  display: block;
  background: #fff;
  border: 1px solid #dcd3c0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(45, 62, 38, 0.06);
  text-decoration: none;
}

.pcard:hover {
  text-decoration: none;
}

html.dark .pcard {
  background: #1f2d1a;
  border-color: #3d4d36;
}

.pcard-photo {
  height: 150px;
  background-color: #e4dccb;
  background-size: cover;
  background-position: center;
}

.pcard-body {
  padding: 13px 14px 15px;
}

.pcard-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  color: #064e3b;
  margin: 0 0 5px;
}

html.dark .pcard-name {
  color: #c8dbbf;
}

.pcard-line {
  font-size: 13.5px;
  line-height: 1.5;
  color: #4b5563;
  margin: 0;
}

html.dark .pcard-line {
  color: #cfd8c8;
}

/* The cream placeholder is the brightest block on the page until a photo loads. */
html.dark .pcard-photo {
  background-color: #2a3826;
}

/* Emerald reads as a button on cream but disappears into the dark page. */
html.dark .featured-cta {
  background: #8aa37c;
  color: #14281a;
}

html.dark .featured-cta:hover {
  background: #9db892;
  color: #14281a;
}

.featured-cta {
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #064e3b;
  color: #fff;
  border-radius: 9999px;
  padding: 14px 22px;
  font-size: 15px;
  font-weight: 700;
  min-height: 48px;
  box-sizing: border-box;
  text-decoration: none;
}

.featured-cta:hover {
  background: #053f30;
  color: #fff;
  text-decoration: none;
}

.featured-elsewhere {
  margin: 12px 0 0;
  text-align: center;
  font-size: 12.5px;
  color: #4b5563;
}

html.dark .featured-elsewhere {
  color: #cfd8c8;
}

.featured-elsewhere-link {
  color: #064e3b;
  font-weight: 700;
  text-decoration: underline;
}

html.dark .featured-elsewhere-link {
  color: #8aa37c;
}

/* ── About section ─────────────────────────────────── */
.content-section {
  max-width: 640px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 2rem;
  text-align: center;
}

.section-heading {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  font-weight: 700;
  color: #376451;
  margin: 0 0 1.5rem;
  line-height: 1.25;
}

html.dark .section-heading {
  color: #c8dbbf;
}

.body-text {
  font-size: 1.05rem;
  line-height: 1.75;
  color: #3d3d3d;
  margin-bottom: 1.25rem;
  text-align: left;
}

html.dark .body-text {
  color: #e8e8e8 !important;
  -webkit-text-fill-color: #e8e8e8 !important;
}

.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.875rem;
  justify-content: center;
  margin-top: 2rem;
}

/* ── Buttons ───────────────────────────────────────── */
.btn-home {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.75rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  white-space: nowrap;
}

.btn-home-primary {
  background: #8aa37c;
  color: #fff;
  border: 2px solid #8aa37c;
}

.btn-home-primary:hover {
  background: #6c8a6a;
  border-color: #6c8a6a;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
  text-decoration: none;
}

.btn-home-secondary {
  background: transparent;
  color: #8aa37c;
  border: 2px solid #8aa37c;
  -webkit-text-fill-color: #8aa37c;
}

.btn-home-secondary:hover {
  background: #8aa37c;
  color: #fff;
  -webkit-text-fill-color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
  text-decoration: none;
}

html.dark .btn-home-secondary {
  color: #c8dbbf;
  -webkit-text-fill-color: #c8dbbf;
  border-color: #8aa37c;
}

html.dark .btn-home-secondary:hover {
  color: #fff;
  -webkit-text-fill-color: #fff;
}

.github-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* ── Newsletter ────────────────────────────────────── */
.newsletter-section {
  background: #e8dfd0;
  padding: 3rem 1.5rem;
}

html.dark .newsletter-section {
  background: #1a2212;
}

.newsletter-inner {
  max-width: 480px;
  margin: 0 auto;
}

/* ── Manifesto ─────────────────────────────────────── */
.manifesto-section {
  background: #344a34;
  padding: 34px 22px;
  text-align: center;
}

.manifesto-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #8aa37c;
  margin: 0 0 8px;
}

.manifesto-heading {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 26px;
  font-weight: 700;
  color: #f5f5f5;
  margin: 0 0 12px;
  line-height: 1.2;
}

.manifesto-quote {
  font-size: 14px;
  color: #d0d0d0;
  font-style: italic;
  margin: 0 auto 20px;
  max-width: 480px;
  line-height: 1.6;
}

.btn-manifesto {
  margin: 0 auto;
  padding: 13px 24px;
  font-size: 15px;
  font-weight: 700;
  min-height: 44px;
  box-sizing: border-box;
  justify-content: center;
}

/* ── Wider screens ─────────────────────────────────── */
/*
 * The design is mobile-first. On a wider viewport a single column stretches
 * each card into a letterbox, so the band keeps its full-bleed background but
 * constrains its content and lays the three cards out in a row.
 */
@media (min-width: 700px) {
  .featured {
    padding: 40px 24px 48px;
  }

  .featured-head,
  .featured-sub,
  .featured-cards,
  .featured-state,
  .featured-elsewhere {
    max-width: 1080px;
    margin-left: auto;
    margin-right: auto;
  }

  .featured-title {
    font-size: 26px;
  }

  .featured-sub {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .featured-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  /* Photo scales with the column instead of holding a fixed mobile height. */
  .pcard {
    display: flex;
    flex-direction: column;
  }

  .pcard-photo {
    height: auto;
    aspect-ratio: 16 / 10;
  }

  .pcard-body {
    flex: 1;
  }

  .featured-cta {
    max-width: 420px;
    margin-left: auto;
    margin-right: auto;
  }
}

/* ── Reduced motion ────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .scroll-hint {
    animation: none;
  }
  .section-video {
    transform: none !important;
  }
}

/* ── Mobile ────────────────────────────────────────── */
@media (max-width: 480px) {
  .cta-row {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-home {
    justify-content: center;
  }
}
</style>
