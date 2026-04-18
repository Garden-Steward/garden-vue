<script setup>
import NewsletterSignup from '@/components/NewsletterSignup.vue'
</script>

<template>
  <div class="home-wrapper">

    <!-- Hero heading — full width -->
    <div class="hero-section">
      <p class="hero-eyebrow">Welcome to</p>
      <h1 class="hero-title">Garden Steward</h1>
      <p class="hero-tagline">Community-grown tools for urban agriculture</p>
    </div>

    <!-- Image + Newsletter side-by-side on desktop -->
    <div class="hero-row">
      <img
        src="https://storage.googleapis.com/steward_upload/uploads/tutorial_group_harvest_2b80cd2b7e/tutorial_group_harvest_2b80cd2b7e.png"
        alt="Community harvest at Garden Steward"
        class="hero-image"
      />
      <div class="newsletter-col">
        <NewsletterSignup />
      </div>
    </div>

    <!-- About -->
    <div class="content-section">
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

    <!-- Manifesto -->
    <div class="manifesto-section">
      <p class="manifesto-label">Our Mission</p>
      <h2 class="manifesto-heading">We are life seeking fulfillment.</h2>
      <p class="manifesto-quote">
        "We rose on a planet bustling in biodiversity..."
      </p>
      <a href="/manifesto" class="btn-home btn-home-primary">
        Read Our Full Manifesto
      </a>
    </div>

  </div>
</template>

<style scoped>
/* ── Page wrapper ──────────────────────────────────── */
.home-wrapper {
  background-color: #f7f1e3;
  min-height: 100vh;
}

/* ── Hero heading ──────────────────────────────────── */
.hero-section {
  text-align: center;
  padding: 3.5rem 1.5rem 2rem;
  max-width: 720px;
  margin: 0 auto;
}

.hero-eyebrow {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #8aa37c;
  margin: 0 0 0.4rem;
}

.hero-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(2.75rem, 7vw, 4.5rem);
  font-weight: 800;
  color: #376451;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
}

.hero-tagline {
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0;
  font-weight: 400;
}

/* ── Image + Newsletter row ────────────────────────── */
.hero-row {
  display: flex;
  align-items: center;
  gap: 2.5rem;
  max-width: 1000px;
  margin: 2.5rem auto 0;
  padding: 0 2rem;
}

.hero-image {
  width: 100%;
  max-width: 440px;
  flex-shrink: 0;
  border-radius: 16px;
  display: block;
}

.newsletter-col {
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .hero-row {
    flex-direction: column;
    padding: 0 1.25rem;
    gap: 0;
  }

  .hero-image {
    max-width: 100%;
  }
}

/* ── Content block ─────────────────────────────────── */
.content-section {
  max-width: 640px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.body-text {
  font-size: 1.05rem;
  line-height: 1.75;
  color: #3d3d3d;
  margin-bottom: 1.25rem;
  text-align: left;
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
}

.btn-home-secondary:hover {
  background: #8aa37c;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
  text-decoration: none;
}

.github-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* ── Manifesto ─────────────────────────────────────── */
.manifesto-section {
  background: #344a34;
  padding: 3.5rem 1.5rem;
  text-align: center;
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

/* ── Dark mode ─────────────────────────────────────── */
:global(.dark) .home-wrapper {
  background-color: #2d3e26;
}

:global(.dark) .hero-title {
  color: #c8dbbf;
}

:global(.dark) .hero-tagline {
  color: #a0a8a0;
}

:global(.dark) .body-text {
  color: #d0d0d0;
}

:global(.dark) .manifesto-section {
  background: #1e2e1e;
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
