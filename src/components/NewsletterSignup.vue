<script setup>
import { ref } from 'vue'

const email = ref('')
const state = ref('idle') // idle | loading | success | error
const errorMsg = ref('')

const PUB_ID = import.meta.env.VITE_BEEHIIV_PUB_ID
const API_KEY = import.meta.env.VITE_BEEHIIV_API_KEY

async function subscribe() {
  if (!email.value || !email.value.includes('@')) {
    errorMsg.value = 'Please enter a valid email address.'
    state.value = 'error'
    return
  }

  state.value = 'loading'
  errorMsg.value = ''

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${PUB_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          email: email.value,
          reactivate_existing: false,
          send_welcome_email: true,
        }),
      }
    )

    if (!res.ok) {
      throw new Error(`Status ${res.status}`)
    }

    state.value = 'success'
  } catch {
    errorMsg.value = 'Something went wrong. Please try again.'
    state.value = 'error'
  }
}
</script>

<template>
  <section class="newsletter-section">
    <div class="newsletter-card">

      <!-- idle / error state -->
      <template v-if="state !== 'success'">
        <div class="newsletter-icon" aria-hidden="true">🌿</div>
        <h2 class="newsletter-heading">Stay Rooted</h2>
        <p class="newsletter-sub">
          Seasonal updates, nature inspirations, and project updates — straight to your inbox.
        </p>

        <form class="newsletter-form" @submit.prevent="subscribe" novalidate>
          <div class="input-row">
            <input
              v-model="email"
              type="email"
              placeholder="your@email.com"
              class="newsletter-input"
              :class="{ 'input-error': state === 'error' }"
              autocomplete="email"
              :disabled="state === 'loading'"
            />
            <button
              type="submit"
              class="newsletter-btn"
              :disabled="state === 'loading'"
            >
              <span v-if="state !== 'loading'">Join the Newsletter</span>
              <span v-else class="loading-dots">
                <span></span><span></span><span></span>
              </span>
            </button>
          </div>
          <p v-if="state === 'error'" class="error-text">{{ errorMsg }}</p>
        </form>

        <p class="newsletter-fine">No spam. Unsubscribe any time.</p>
      </template>

      <!-- success state -->
      <template v-else>
        <div class="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 12.5l3.5 3.5 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 class="newsletter-heading">You're in the garden!</h2>
        <p class="newsletter-sub">
          Welcome — check your inbox for a confirmation, then look out for good things to come.
        </p>
      </template>

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
  max-width: 560px;
  background: #ffffff;
  border: 1px solid rgba(138, 163, 124, 0.25);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  text-align: center;
  box-shadow: 0 4px 24px rgba(138, 163, 124, 0.15);
  transition: box-shadow 0.3s ease;
}

.newsletter-card:hover {
  box-shadow: 0 8px 32px rgba(138, 163, 124, 0.22);
}

/* dark mode */
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
  margin: 0 0 1.75rem;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

:global(.dark) .newsletter-sub {
  color: #d0d0d0;
}

.newsletter-form {
  width: 100%;
}

.input-row {
  display: flex;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.newsletter-input {
  flex: 1;
  min-width: 0;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  outline: none;
  background: #fff;
  color: #1a1a1a;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.newsletter-input:focus {
  border-color: #376451;
  box-shadow: 0 0 0 3px rgba(138, 163, 124, 0.2);
}

.newsletter-input.input-error {
  border-color: #C2410C;
}

.newsletter-input:disabled {
  opacity: 0.6;
}

:global(.dark) .newsletter-input {
  background: rgba(26, 26, 26, 0.6);
  border-color: rgba(138, 163, 124, 0.3);
  color: #f5f5f5;
}

:global(.dark) .newsletter-input:focus {
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(138, 163, 124, 0.15);
}

.newsletter-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background: #8aa37c;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  min-width: 9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.newsletter-btn:hover:not(:disabled) {
  background: #6c8a6a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
}

.newsletter-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Loading dots */
.loading-dots {
  display: flex;
  gap: 4px;
  align-items: center;
}
.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: dot-pulse 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40%           { opacity: 1;   transform: scale(1); }
}

.error-text {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #C2410C;
  text-align: left;
}

:global(.dark) .error-text {
  color: #f97316;
}

.newsletter-fine {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: #999;
}

:global(.dark) .newsletter-fine {
  color: #6b7280;
}

/* Success */
.success-icon {
  width: 56px;
  height: 56px;
  color: #8aa37c;
  margin: 0 auto 1rem;
}

.success-icon svg {
  width: 100%;
  height: 100%;
}

/* Mobile: stack input + button */
@media (max-width: 480px) {
  .input-row {
    flex-direction: column;
  }
  .newsletter-btn {
    width: 100%;
  }
  .newsletter-card {
    padding: 2rem 1.25rem;
  }
}
</style>
