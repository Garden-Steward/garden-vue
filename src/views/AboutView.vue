<script setup>
import ManageLayout from '@/components/ManageLayout.vue';
import EmailLink from '@/components/EmailLink.vue';
</script>

<template>
  <ManageLayout>
    <main class="about-page">
      <header class="about-page__intro">
        <p class="about-page__eyebrow">About Garden Steward</p>
        <h1>Care for a place.<br>Get to know its people.</h1>
        <p>Community-grown tools for urban agriculture.</p>
      </header>
      <figure class="about-page__film">
        <video controls playsinline preload="metadata" aria-label="Garden Steward garden footage">
          <source src="https://storage.googleapis.com/steward-public/videos/homepage/hole-water.mp4" type="video/mp4">
        </video>
        <figcaption>Garden Steward garden footage</figcaption>
      </figure>
      <section class="about-page__story">
        <p class="about-page__eyebrow">What brings us together</p>
        <div>
          <h2>Learning happens when we take part.</h2>
          <p>Garden Steward is a community-driven, open-source project developing SMS-first software for managing volunteer events, watering schedules, and harvest coordination. Since 2022, we've partnered with the Oakland Urban Farming Project (OUFP) to organize urban agricultural initiatives.</p>
          <p>We believe the fastest change comes from a cooperative approach. Each SMS phone number is its own cooperative of local gardening projects. If you're in Oakland, join our existing cooperative. Otherwise, partner with us and add to our cooperative network.</p>
          <div class="about-page__actions">
            <router-link to="/events">Find an event ↗</router-link>
            <router-link to="/gardens">Explore gardens ↗</router-link>
            <EmailLink subject="Garden Steward in my city">Bring Garden Steward to your city ↗</EmailLink>
            <a href="https://github.com/Garden-Steward" target="_blank" rel="noopener noreferrer">Explore on GitHub ↗</a>
          </div>
        </div>
      </section>
    </main>
  </ManageLayout>
</template>

<style scoped>
.about-page { min-height: 70vh; background: var(--gs-paper); color: var(--gs-ink); font: 18px/1.55 var(--gs-body-font); }
.about-page__eyebrow { color: var(--gs-muted); font-size: 15px; margin: 0 0 16px; }
.about-page__intro { max-width: 850px; margin-bottom: 42px; }
.about-page h1, .about-page h2 { font-family: var(--gs-heading-font); font-weight: 400; }
.about-page h1 { font-size: clamp(44px, 4.8vw, 76px); line-height: 1.08; margin: 0 0 20px; }
.about-page__intro > p:last-child { font-size: clamp(18px, 1.4vw, 23px); line-height: 1.65; margin: 0; }
.about-page__film { margin: 0; }
.about-page__film video { display: block; width: 100%; max-height: 570px; background: var(--gs-ink); }
.about-page__film figcaption { margin-top: 10px; color: var(--gs-muted); font-size: 15px; }
.about-page__story { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 44px; border-top: 1px solid var(--gs-rule); margin-top: 48px; padding: 34px 0; }
.about-page h2 { font-size: 36px; line-height: 1.16; margin: 0 0 24px; }
.about-page__story p:not(.about-page__eyebrow) { max-width: 70ch; font-size: 18px; line-height: 1.65; margin: 0 0 20px; }
.about-page__actions { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 24px; }
.about-page__actions a { color: var(--gs-ink); text-underline-offset: 4px; }
@media (max-width: 760px) {
  .about-page h1 { font-size: 42px; }
  .about-page h2 { font-size: 31px; }
  .about-page__story { grid-template-columns: minmax(0, 1fr); gap: 25px; }
}
</style>
