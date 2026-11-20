<script setup>
import { ref } from 'vue';

// The newsletter Worker (newsletter-engine/tracking-worker) sends a thank-you email with a confirm button.
const endpoint = import.meta.env.VITE_NEWSLETTER_URL
  || 'https://garden-steward-newsletter-tracking.cameron-a78.workers.dev';

const email = ref('');
const website = ref('');
const state = ref('idle'); // idle | sending | sent | error
const message = ref('');

async function submit() {
  state.value = 'sending';
  message.value = '';
  try {
    const res = await fetch(`${endpoint}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, source: 'steward', website: website.value }),
    });
    const body = await res.json().catch(() => ({}));
    state.value = res.ok && body.ok ? 'sent' : 'error';
    message.value = body.message || 'Something went wrong. Please try again.';
  } catch (e) {
    state.value = 'error';
    message.value = "We couldn't reach the newsletter just now. Please try again.";
  }
}
</script>

<template>
  <section class="newsletter-section">
    <div class="newsletter-card">
      <div class="newsletter-icon" aria-hidden="true">🌿</div>
      <h2 class="newsletter-heading">Stay Rooted</h2>
      <p class="newsletter-sub">
        Seasonal updates, nature inspirations, and project updates — straight to your inbox.
      </p>

      <form v-if="state !== 'sent'" class="subscribe-form" @submit.prevent="submit">
        <label for="newsletter-email" class="sr-only">Email address</label>
        <input
          id="newsletter-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="you@example.com"
          class="subscribe-input"
          :disabled="state === 'sending'"
        />
        <!-- Hidden from people; bots fill it in and are quietly ignored -->
        <input v-model="website" type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <button type="submit" class="subscribe-btn" :disabled="state === 'sending'">
          {{ state === 'sending' ? 'Joining…' : 'Join the Newsletter' }}
        </button>
      </form>

      <p v-if="message" class="newsletter-message" :class="{ error: state === 'error' }" role="status">{{ message }}</p>
      <p v-if="state === 'sent'" class="newsletter-fine">
        Meanwhile, wander into the <a href="https://journal.steward.garden">journal</a>.
      </p>

      <p v-if="state !== 'sent'" class="newsletter-fine">We'll email you a link to confirm. No spam. Unsubscribe any time.</p>
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


.subscribe-form {
  display: flex;
  gap: 0.5rem;
  max-width: 440px;
  margin: 0 auto;
}

.subscribe-input {
  flex: 1;
  min-width: 0;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: #1a3d2e;
  -webkit-text-fill-color: currentColor;
  background: #fff;
  border: 1px solid rgba(138, 163, 124, 0.6);
  border-radius: 8px;
}

.subscribe-input:focus {
  outline: 2px solid #8aa37c;
  outline-offset: 1px;
}

.subscribe-btn {
  border: 0;
  cursor: pointer;
  white-space: nowrap;
}

.subscribe-btn:disabled { opacity: 0.7; cursor: default; transform: none; }

.hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }

.newsletter-message {
  margin: 1rem auto 0;
  max-width: 400px;
  font-weight: 600;
  color: #1a3d2e;
  -webkit-text-fill-color: currentColor;
}

.newsletter-message.error { color: #9b2c2c; }

.newsletter-fine a { color: #1a3d2e; font-weight: 600; }

@media (max-width: 480px) {
  .newsletter-card { padding: 2rem 1.25rem; }
  .subscribe-form { flex-direction: column; }
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

html.dark .newsletter-message:not(.error),
html.dark .subscribe-input {
  color: #1a3d2e !important;
  -webkit-text-fill-color: #1a3d2e !important;
}

html.dark .newsletter-fine {
  color: #4a6b48 !important;
  -webkit-text-fill-color: #4a6b48 !important;
}
</style>

