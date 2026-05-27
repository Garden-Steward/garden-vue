<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useGardensStore } from '@/stores';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);

gardensStore.getAll(user.value.id);
</script>

<template>
  <div
    class="manage-home-wrapper min-h-screen bg-[#f7f1e3] dark:bg-[#2d3e26]"
  >
    <div class="manage-home-card">
      <p class="manage-eyebrow">Welcome back</p>
      <h1 class="manage-title">
        Hi {{ user.firstName }} {{ user.lastName }}
      </h1>
      <p class="manage-tagline">
        Your community-grown tools for urban agriculture.
      </p>

      <div class="content-section">
        <p class="body-text">
          Garden Steward is a community-driven, open-source project developing
          SMS-based software for managing volunteer events, watering schedules,
          and harvest coordination. Since 2022, we've partnered with the Oakland
          Urban Farming Project (OUFP) to foster urban agriculture. Join us by
          either setting up your own decentralized Garden Steward instance or
          participating in our existing network.
        </p>
        <p class="body-text">
          Thank you for helping out with your garden! This app is currently in
          <strong>Beta</strong> so feedback is encouraged. Feedback &amp;
          Support email:
          <a href="mailto:volunteer@oufp.org" class="body-link">volunteer@oufp.org</a>
          &mdash; screenshots helpful.
        </p>
      </div>

      <div class="profile-section">
        <p class="profile-line">
          <span class="profile-label">Bio:</span>
          {{ user.bio ? user.bio : 'No bio yet' }}
        </p>
        <p class="profile-line">
          You're a member of
          <router-link to="/manage" class="profile-link">
            {{ gardens.length }} gardens.
          </router-link>
        </p>
      </div>

      <div class="cta-row">
        <a href="/manage" class="btn-manage btn-manage-primary">
          View Gardens
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page wrapper — light bg / dark bg via Tailwind on element */
.manage-home-wrapper {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.manage-home-card {
  max-width: 720px;
  margin: 0 auto;
  background-color: #ffffff;
  border: 1px solid #e2dccb;
  border-radius: 16px;
  padding: 2.5rem 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

/* ── Hero / heading ────────────────────────────────── */
.manage-eyebrow {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #8aa37c;
  margin: 0 0 0.4rem;
  text-align: center;
}

.manage-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.85rem, 5vw, 2.75rem);
  font-weight: 800;
  color: #376451;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem;
  text-align: center;
}

.manage-tagline {
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 1.75rem;
  text-align: center;
}

/* ── Content ───────────────────────────────────────── */
.content-section {
  margin-bottom: 1.5rem;
}

.body-text {
  font-size: 1rem;
  line-height: 1.75;
  color: #3d3d3d;
  margin-bottom: 1rem;
}

.body-link {
  color: #8aa37c;
  text-decoration: underline;
}
.body-link:hover {
  color: #6c8a6a;
}

/* ── Profile lines ─────────────────────────────────── */
.profile-section {
  border-top: 1px solid #e2dccb;
  padding-top: 1.25rem;
  margin-bottom: 1.5rem;
}

.profile-line {
  font-size: 1rem;
  color: #344a34;
  margin-bottom: 0.5rem;
}

.profile-label {
  font-weight: 600;
}

.profile-link {
  font-weight: 700;
  color: #376451;
  text-decoration: underline;
}
.profile-link:hover {
  color: #8aa37c;
}

/* ── CTA buttons (homepage palette) ────────────────── */
.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.875rem;
  justify-content: center;
}

.btn-manage {
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

.btn-manage-primary {
  background: #8aa37c;
  color: #fff;
  border: 2px solid #8aa37c;
}
.btn-manage-primary:hover {
  background: #6c8a6a;
  border-color: #6c8a6a;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 163, 124, 0.4);
  text-decoration: none;
}

/* ── Dark mode overrides ───────────────────────────── */
:global(.dark) .manage-home-card {
  background-color: #344a34;
  border-color: #3d4d36;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

:global(.dark) .manage-title {
  color: #c8dbbf;
}

:global(.dark) .manage-tagline {
  color: #a0a8a0;
}

:global(.dark) .body-text,
:global(.dark) .profile-line {
  color: #d0d0d0;
}

:global(.dark) .profile-section {
  border-top-color: #3d4d36;
}

:global(.dark) .profile-link {
  color: #c8dbbf;
}
:global(.dark) .profile-link:hover {
  color: #8aa37c;
}
</style>
