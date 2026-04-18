<template>
  <section class="newsletter-section">
    <div class="newsletter-card">
      <div class="newsletter-icon" aria-hidden="true">🌿</div>
      <h2 class="newsletter-heading">Stay Rooted</h2>
      <p class="newsletter-sub">
        Seasonal updates, nature inspirations, and project updates — straight to your inbox.
      </p>

      <a
        href="https://garden-steward.beehiiv.com/subscribe"
        target="_blank"
        rel="noopener noreferrer"
        class="subscribe-btn"
      >
        Join the Newsletter
      </a>

      <p class="newsletter-fine">No spam. Unsubscribe any time.</p>
    </div>
  </section>
</template>

<style scoped>
.newsletter-section {
  padding: 1.5rem 0;
  display: flex;
  justify-content: center;
  background: transparent;
}

.newsletter-card {
  width: 100%;
  background: #ede5d0;
  border: 1px solid rgba(138, 163, 124, 0.2);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  text-align: center;
  box-shadow: 0 2px 12px rgba(138, 163, 124, 0.12);
  transition: box-shadow 0.3s ease;
}

.newsletter-card:hover {
  box-shadow: 0 6px 24px rgba(138, 163, 124, 0.2);
}

:global(.dark) .newsletter-section { background: transparent; }
:global(.dark) .newsletter-card {
  background: #293d29;
  border-color: rgba(138, 163, 124, 0.2);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.newsletter-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
  line-height: 1;
}

.newsletter-heading {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #376451;
  margin: 0 0 0.6rem;
  letter-spacing: -0.01em;
}

:global(.dark) .newsletter-heading { color: #f5f5f5; }

.newsletter-sub {
  font-size: 1rem;
  color: #555;
  line-height: 1.6;
  margin: 0 auto 1.75rem;
  max-width: 380px;
}

:global(.dark) .newsletter-sub { color: #d0d0d0; }

.subscribe-btn {
  display: inline-block;
  padding: 0.8rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: #8aa37c;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

.subscribe-btn:hover {
  background: #6c8a6a;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
  text-decoration: none;
}

.newsletter-fine {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: #999;
}

:global(.dark) .newsletter-fine { color: #6b7280; }

@media (max-width: 480px) {
  .newsletter-card { padding: 2rem 1.25rem; }
  .subscribe-btn { display: block; }
}
</style>
