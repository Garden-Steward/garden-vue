<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { isProjectPubliclyVisible, isProjectVisibleTo } from '@/_config/GardenConfig';
import { useProjectsStore, useAuthStore } from '@/stores';
import ManageLayout from '@/components/ManageLayout.vue';
import NewsletterSignup from '@/components/NewsletterSignup.vue';
import EmailLink from '@/components/EmailLink.vue';

const projectsStore = useProjectsStore();
const { communityProjects } = storeToRefs(projectsStore);
const { user } = storeToRefs(useAuthStore());
Promise.allSettled([projectsStore.getAllProjects()]);

const featuredProjects = computed(() => {
  const list = Array.isArray(communityProjects.value) ? communityProjects.value : [];
  return list
    .filter(project => isProjectVisibleTo(project, user.value))
    .sort((a, b) => Number(isProjectPubliclyVisible(b)) - Number(isProjectPubliclyVisible(a)))
    .slice(0, 3);
});

function projectImage(project) {
  const image = project?.hero_image;
  const url = image?.formats?.medium?.url || image?.formats?.small?.url || image?.url;
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

function projectLink(project) {
  const garden = project?.garden;
  if (garden && typeof garden === 'object' && garden.slug && project.slug) {
    return `/gardens/${garden.slug}/p/${project.slug}`;
  }
  return '/projects';
}
</script>

<template>
  <ManageLayout>
    <main class="public-home">
      <header class="public-home__intro">
        <h1>Garden Steward</h1>
        <p class="public-home__welcome">Hi, welcome.</p>
        <p>In a mission to restore biodiversity, Garden Steward helps communities organize around their land.</p>
        <div class="public-home__actions">
          <router-link to="/gardens">Explore gardens ↗</router-link>
          <router-link to="/projects">See projects ↗</router-link>
        </div>
      </header>

      <figure class="public-home__film">
        <video controls playsinline preload="metadata" aria-label="Garden Steward garden footage">
          <source src="https://storage.googleapis.com/steward-public/videos/homepage/leaf-herb-prep-dehydrate.mp4" type="video/mp4">
        </video>
        <figcaption>Garden Steward garden footage</figcaption>
      </figure>

      <section class="public-home__section" aria-labelledby="home-projects">
        <div class="public-home__section-head">
          <div><p class="public-home__eyebrow">Oakland, CA</p><h2 id="home-projects">Happening now</h2></div>
          <router-link to="/projects">See all projects ↗</router-link>
        </div>
        <article v-for="project in featuredProjects" :key="project.id" class="public-home__row">
          <router-link :to="projectLink(project)" class="public-home__photo">
            <img v-if="projectImage(project)" :src="projectImage(project)" :alt="`Photo for ${project.title}`">
          </router-link>
          <div class="public-home__copy">
            <h3><router-link :to="projectLink(project)">{{ project.title }}</router-link></h3>
            <p v-if="project.garden?.title" class="public-home__context">{{ project.garden.title }}</p>
            <p v-if="project.short_description">{{ project.short_description }}</p>
            <router-link :to="projectLink(project)">View project ↗</router-link>
          </div>
        </article>
        <p v-if="communityProjects.loading">Loading projects…</p>
        <p v-else-if="communityProjects.error" role="alert">Couldn't load projects. Try again in a moment.</p>
        <p v-else-if="!featuredProjects.length">No projects to show right now.</p>
      </section>

      <section class="public-home__section public-home__about" aria-labelledby="home-about">
        <p class="public-home__eyebrow">About us</p>
        <div>
          <h2 id="home-about">Community-grown tools for urban agriculture</h2>
          <p>Garden Steward is a community-driven, open-source project developing SMS-first software for managing volunteer events, watering schedules, and harvest coordination. Since 2022, we've partnered with the Oakland Urban Farming Project (OUFP) to organize urban agricultural initiatives.</p>
          <p>Each SMS phone number is its own cooperative of local gardening projects. If you're in Oakland, join our existing cooperative. Otherwise, partner with us and add to our cooperative network.</p>
          <div class="public-home__actions">
            <EmailLink subject="Garden Steward in my city">Bring Garden Steward to your city ↗</EmailLink>
            <a href="https://github.com/Garden-Steward" target="_blank" rel="noopener noreferrer">Explore on GitHub ↗</a>
          </div>
        </div>
      </section>

      <section class="public-home__section" aria-label="Newsletter signup"><NewsletterSignup /></section>
      <section class="public-home__section public-home__manifesto" aria-labelledby="home-manifesto">
        <p class="public-home__eyebrow">Our mission</p>
        <h2 id="home-manifesto">We are life seeking fulfillment.</h2>
        <router-link to="/manifesto">Read our full manifesto ↗</router-link>
      </section>
    </main>
  </ManageLayout>
</template>

<style scoped>
.public-home { background: var(--gs-paper); color: var(--gs-ink); font: 18px/1.55 var(--gs-body-font); }
.public-home__eyebrow { font-size: 15px; color: var(--gs-muted); margin: 0 0 16px; }
.public-home h1, .public-home h2, .public-home h3 { font-family: var(--gs-heading-font); font-weight: 400; }
.public-home__welcome { font: 400 clamp(26px, 2.5vw, 36px)/1.2 var(--gs-body-font); }
.public-home h1 { font-size: clamp(44px, 4.8vw, 76px); line-height: 1.08; max-width: 900px; margin: 0 0 20px; }
.public-home h2 { font-size: 36px; line-height: 1.16; margin: 0 0 20px; }
.public-home h3 { font-size: clamp(34px, 3vw, 52px); line-height: 1.15; margin: 0 0 12px; }
.public-home__intro { margin-bottom: 42px; }
.public-home__intro > p:not(.public-home__eyebrow):not(.public-home__welcome) { max-width: 60ch; font-size: clamp(18px, 1.4vw, 23px); line-height: 1.65; }
.public-home a { color: var(--gs-ink); text-underline-offset: 4px; }
.public-home__actions { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 24px; }
.public-home__film { margin: 0 0 50px; }
.public-home__film video { display: block; width: 100%; max-height: 570px; background: var(--gs-ink); }
.public-home__film figcaption { font-size: 15px; color: var(--gs-muted); margin-top: 10px; }
.public-home__section { border-top: 1px solid var(--gs-rule); padding: 35px 0 45px; }
.public-home__section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 20px; }
.public-home__row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 44px; border-top: 1px solid var(--gs-rule); padding: 34px 0; }
.public-home__photo { display: block; min-height: 220px; background: var(--gs-sage); }
.public-home__photo img { display: block; width: 100%; aspect-ratio: 4/3; object-fit: cover; }
.public-home__copy p { font-size: clamp(18px, 1.4vw, 23px); line-height: 1.65; margin: 0 0 16px; }
.public-home__copy .public-home__context { font-size: 18px; color: var(--gs-muted); }
.public-home__about { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 44px; }
.public-home__about p { max-width: 70ch; }
@media (max-width: 760px) {
  .public-home h1 { font-size: 42px; }
  .public-home h2 { font-size: 31px; }
  .public-home h3 { font-size: 34px; }
  .public-home__row, .public-home__about { grid-template-columns: minmax(0, 1fr); gap: 25px; }
  .public-home__row { padding: 24px 0 30px; }
}
</style>
