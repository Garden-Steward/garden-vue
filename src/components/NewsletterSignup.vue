<script setup>
// Replace EMBED_URL with the src from your Beehiiv embed code once published
const EMBED_URL = import.meta.env.VITE_BEEHIIV_EMBED_URL || ''
</script>

<template>
  <section class="newsletter-section">
    <div class="newsletter-card">
      <div class="newsletter-icon" aria-hidden="true">🌿</div>
      <h2 class="newsletter-heading">Stay Rooted</h2>
      <p class="newsletter-sub">
        Seasonal updates, nature inspirations, and project updates — straight to your inbox.
      </p>

      <div class="embed-wrapper">
        <iframe
          v-if="EMBED_URL"
          :src="EMBED_URL"
          data-test-id="beehiiv-embed"
          frameborder="0"
          scrolling="no"
          class="beehiiv-iframe"
        />
        <p v-else class="embed-missing">
          Set <code>VITE_BEEHIIV_EMBED_URL</code> in your .env to your Beehiiv embed src.
        </p>
      </div>

      <p class="newsletter-fine">No spam. Unsubscribe any time.</p>
    </div>
  </section>
</template>

<style scoped>
.newsletter-section {
  padding: 3rem 1.25rem;
  display: flex;
  justify-content: center;
  background-color: #f7f1e3;
}

.newsletter-card {
  width: 100%;
  max-width: 580px;
  background: #ffffff;
  border: 1px solid rgba(138, 163, 124, 0.25);
  border-radius: 16px;
  padding: 2.5rem 2rem 1.75rem;
  text-align: center;
  box-shadow: 0 4px 24px rgba(138, 163, 124, 0.15);
  transition: box-shadow 0.3s ease;
}

.newsletter-card:hover {
  box-shadow: 0 8px 32px rgba(138, 163, 124, 0.22);
}

:global(.dark) .newsletter-section {
  background-color: #2d3e26;
}
:global(.dark) .newsletter-card {
  background: #344a34;
  border-color: rgba(138, 163, 124, 0.2);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.newsletter-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
  line-height: 1;
}

.newsletter-heading {
  font-size: 1.75rem;
  font-weight: 700;
  color: #376451;
  margin: 0 0 0.6rem;
  letter-spacing: -0.01em;
}

:global(.dark) .newsletter-heading {
  color: #f5f5f5;
}

.newsletter-sub {
  font-size: 1rem;
  color: #555;
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

:global(.dark) .newsletter-sub {
  color: #d0d0d0;
}

.embed-wrapper {
  width: 100%;
}

.beehiiv-iframe {
  width: 100%;
  height: 52px;
  border: none;
  display: block;
}

.embed-missing {
  font-size: 0.85rem;
  color: #C2410C;
  background: #fff5f0;
  border: 1px solid #fca89a;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  text-align: left;
}

.embed-missing code {
  font-family: monospace;
  font-size: 0.8rem;
}

.newsletter-fine {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: #999;
}

:global(.dark) .newsletter-fine {
  color: #6b7280;
}

@media (max-width: 480px) {
  .newsletter-card {
    padding: 2rem 1.25rem 1.5rem;
  }
}
</style>
