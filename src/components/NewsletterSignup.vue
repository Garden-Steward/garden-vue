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
  /* Explicit surface text — do not inherit light gray from dark-mode page wrappers */
  color: #1a3d2e;
  /* WebKit paints -webkit-text-fill-color over `color`; keep them aligned (fixes “computed green, looks white”). */
  -webkit-text-fill-color: currentColor;
}

.newsletter-card:hover {
  box-shadow: 0 6px 24px rgba(138, 163, 124, 0.2);
}

.newsletter-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
  line-height: 1;
}

/* Same palette as Nav on cream (`#376451` family); must win over inherited wrapper text in dark mode */
.newsletter-heading {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #1a3d2e;
  -webkit-text-fill-color: currentColor;
  margin: 0 0 0.6rem;
  letter-spacing: -0.01em;
}

.newsletter-sub {
  font-size: 1rem;
  color: #3d5c3d;
  -webkit-text-fill-color: currentColor;
  line-height: 1.6;
  margin: 0 auto 1.75rem;
  max-width: 380px;
}

.subscribe-btn {
  display: inline-block;
  padding: 0.8rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  -webkit-text-fill-color: currentColor;
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
  color: #4a6b48;
  -webkit-text-fill-color: currentColor;
}

@media (max-width: 480px) {
  .newsletter-card { padding: 2rem 1.25rem; }
  .subscribe-btn { display: block; }
}
</style>

<!--
  `:global()` with a trailing descendant selector does not survive scoped-style
  compilation: ":global(.dark) .foo" becomes the bare rule ".dark { ... }",
  which lands on <html class="dark"> and leaks inheritable declarations such as
  color and -webkit-text-fill-color into every page. Dark-mode overrides live
  here instead, in a plain (non-scoped) <style> block with a literal
  "html.dark ..." selector — the same pattern ProjectsList.vue uses.
-->
<style>
html.dark .newsletter-section {
  background: transparent;
}

/* Dark mode: cream card + dark green type (do not inherit page-level light `color` / fill from wrappers) */
html.dark .newsletter-card {
  color: #1a3d2e !important;
  -webkit-text-fill-color: #1a3d2e !important;
}

html.dark .newsletter-heading {
  color: #1a3d2e !important;
  -webkit-text-fill-color: #1a3d2e !important;
}

html.dark .newsletter-sub {
  color: #3d5c3d !important;
  -webkit-text-fill-color: #3d5c3d !important;
}

html.dark .newsletter-fine {
  color: #4a6b48 !important;
  -webkit-text-fill-color: #4a6b48 !important;
}
</style>

