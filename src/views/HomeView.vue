<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useGardensStore } from '@/stores';
import EmailLink from '@/components/EmailLink.vue';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);

gardensStore.getAll(user.value.id);
</script>

<template>
  <div
    class="manage-home-wrapper min-h-screen"
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
          <EmailLink class="body-link" />
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
.manage-home-wrapper {
  min-height: 100vh;
  padding: clamp(28px, 4vw, 64px) 20px;
  background: var(--gs-paper);
  color: var(--gs-ink);
  font: 18px/1.55 var(--gs-body-font);
}

.manage-home-card {
  max-width: 960px;
  margin: 0 auto;
  background: var(--gs-paper);
  border-top: 1px solid var(--gs-rule);
  border-bottom: 1px solid var(--gs-rule);
  padding: clamp(28px, 4vw, 56px) 0;
  overflow-wrap: anywhere;
}

.manage-eyebrow {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--gs-muted);
  margin: 0 0 12px;
}

.manage-title {
  font-family: var(--gs-heading-font);
  font-size: clamp(42px, 4.8vw, 72px);
  font-weight: 400;
  color: var(--gs-ink);
  line-height: 1.08;
  letter-spacing: -0.02em;
  margin: 0 0 20px;
}

.manage-tagline {
  font-size: 1.25rem;
  color: var(--gs-muted);
  margin: 0 0 32px;
}

.content-section {
  margin-bottom: 1.5rem;
}

.body-text {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--gs-ink);
  margin-bottom: 1rem;
}

.body-link {
  color: var(--gs-ink);
  text-decoration: underline;
}
.body-link:hover {
  color: var(--gs-muted);
}

.profile-section {
  border-top: 1px solid var(--gs-rule);
  padding-top: 1.25rem;
  margin-bottom: 1.5rem;
}

.profile-line {
  font-size: 1.125rem;
  color: var(--gs-ink);
  margin-bottom: 0.5rem;
}

.profile-label {
  font-weight: 600;
}

.profile-link {
  font-weight: 700;
  color: var(--gs-ink);
  text-decoration: underline;
}
.profile-link:hover {
  color: var(--gs-muted);
}

.cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.875rem;
}

.btn-manage {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.75rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0;
  text-decoration: none;
  transition: background 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
}

.btn-manage-primary {
  background: var(--gs-ink);
  color: var(--gs-paper);
  border: 1px solid var(--gs-ink);
}
.btn-manage-primary:hover {
  background: var(--gs-muted);
  border-color: var(--gs-muted);
  color: var(--gs-paper);
  text-decoration: none;
}

.btn-manage:focus-visible {
  outline: 2px solid var(--gs-ink);
  outline-offset: 4px;
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
/* ── Dark mode overrides ───────────────────────────── */
html.dark .manage-home-card {
  background-color: #344a34;
  border-color: #3d4d36;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

html.dark .manage-title {
  color: #c8dbbf;
}

html.dark .manage-tagline {
  color: #a0a8a0;
}

html.dark .body-text,
html.dark .profile-line {
  color: #d0d0d0;
}

html.dark .profile-section {
  border-top-color: #3d4d36;
}

html.dark .profile-link {
  color: #c8dbbf;
}

html.dark .profile-link:hover {
  color: #8aa37c;
}
</style>

