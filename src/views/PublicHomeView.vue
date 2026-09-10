<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import NewsletterSignup from '@/components/NewsletterSignup.vue';

// ── Video sections ──────────────────────────────────
// Each section is a full-viewport video background.
// Replace `src` with your own uploaded video URLs when ready.
// Supported formats: .mp4, .webm
const videoSections = [
  {
    id: 'welcome',
    line: 'See the world as a garden.',
    subline: null,
    overlay: 'rgba(20, 40, 20, 0.35)',
    dark: false,
    // TODO: upload video → replace this placeholder
    src: null,
  },
  {
    id: 'steward',
    line: 'We are its steward.',
    subline: 'Garden Steward helps communities gather around land — together.',
    overlay: 'rgba(10, 20, 15, 0.5)',
    dark: true,
    src: null,
  },
  {
    id: 'action',
    line: 'Start your project.',
    subline: 'Open-source tools for volunteer events, watering schedules, and harvest coordination.',
    overlay: 'rgba(60, 40, 20, 0.4)',
    dark: false,
    src: null,
  },
];

// Fallback gradient when no video source is set
const fallbackGradients = [
  'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 40%, #4a7c59 100%)',
  'linear-gradient(135deg, #2d3e26 0%, #1a2a1a 40%, #3d4d36 100%)',
  'linear-gradient(135deg, #3a2a1a 0%, #5a3d2d 40%, #7c594a 100%)',
];

// ── Scroll reveal ───────────────────────────────────
// Each section fades in as it enters the viewport.
const activeSection = ref(0);
const sectionsRef = ref([]);

function setSectionRefs(el, index) {
  if (el) sectionsRef.value[index] = el;
}

let observer = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = Number(entry.target.dataset.section);
          activeSection.value = idx;
        }
      });
    },
    { threshold: 0.5 }
  );

  sectionsRef.value.forEach((el) => {
    if (el) observer.observe(el);
  });
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});

// ── Helpers ─────────────────────────────────────────
function bgStyle(index) {
  const sec = videoSections[index];
  if (sec.src) {
    return {}; // video handles background
  }
  return { background: fallbackGradients[index] || fallbackGradients[0] };
}

function overlayStyle(index) {
  return { backgroundColor: videoSections[index].overlay };
}

function isActive(index) {
  return activeSection.value === index;
}
</script>

<template>
  <div class="home-wrapper">

    <!-- ── Scroll-through video sections ──────────────── -->
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
        class="section-video"
        :src="sec.src"
        autoplay
        muted
        loop
        playsinline
      ></video>

      <!-- Color overlay -->
      <div class="section-overlay" :style="overlayStyle(i)"></div>

      <!-- Text content -->
      <div class="section-text" :class="{ 'text-dark': !sec.dark, 'text-light': sec.dark }">
        <p class="section-line">{{ sec.line }}</p>
        <p v-if="sec.subline" class="section-subline">{{ sec.subline }}</p>
      </div>

      <!-- Scroll hint (only on first section) -->
      <div v-if="i === 0" class="scroll-hint">
        <span class="scroll-chevron">⌄</span>
      </div>
    </section>

    <!-- ── Content below the video sections ───────────── -->
    <div class="content-below">

      <!-- About -->
      <div class="content-section">
        <h2 class="section-heading">Community-grown tools for urban agriculture</h2>
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
  height: 100svh; /* mobile-safe */
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.section-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.section-text {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 0 1.5rem;
  max-width: 720px;
  opacity: 0.6;
  transform: translateY(20px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.section-active .section-text {
  opacity: 1;
  transform: translateY(0);
}

.section-line {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(2.25rem, 6vw, 4rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0;
}

.section-subline {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  line-height: 1.5;
  margin: 1rem 0 0;
  font-weight: 400;
  opacity: 0.85;
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

/* ── Scroll hint ───────────────────────────────────── */
.scroll-hint {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  animation: float 2.5s ease-in-out infinite;
}

.scroll-chevron {
  font-size: 1.5rem;
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
}

:global(.dark) .content-below {
  background: #2d3e26;
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

:global(.dark) .section-heading {
  color: #c8dbbf;
}

.body-text {
  font-size: 1.05rem;
  line-height: 1.75;
  color: #3d3d3d;
  margin-bottom: 1.25rem;
  text-align: left;
}

:global(.dark) .body-text {
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

:global(.dark) .btn-home-secondary {
  color: #c8dbbf;
  -webkit-text-fill-color: #c8dbbf;
  border-color: #8aa37c;
}

:global(.dark) .btn-home-secondary:hover {
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

:global(.dark) .newsletter-section {
  background: #263a22;
}

.newsletter-inner {
  max-width: 480px;
  margin: 0 auto;
}

/* ── Manifesto ─────────────────────────────────────── */
.manifesto-section {
  background: #344a34;
  padding: 3.5rem 1.5rem;
  text-align: center;
}

:global(.dark) .manifesto-section {
  background: #344a34;
}

.manifesto-label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #8aa37c;
  margin: 0 0 0.5rem;
}

.manifesto-heading {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  color: #f5f5f5;
  margin: 0 0 1rem;
  line-height: 1.2;
}

.manifesto-quote {
  font-size: 1.1rem;
  color: #d0d0d0;
  font-style: italic;
  margin: 0 auto 2rem;
  max-width: 480px;
  line-height: 1.6;
}

.btn-manifesto {
  margin: 0 auto;
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

  .section-text {
    padding: 0 1rem;
  }
}
</style>