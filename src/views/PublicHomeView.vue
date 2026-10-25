<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { isProjectPubliclyVisible } from '@/_config/GardenConfig';
import { useProjectsStore } from '@/stores';
import { readPublicCollection } from '@/helpers/public-collection';
import { scheduleTimeZone } from '@/helpers/schedule-calendar';
import ManageLayout from '@/components/ManageLayout.vue';
import EmailLink from '@/components/EmailLink.vue';

const projectsStore = useProjectsStore();
const featured = ref({ loading: true });
const gatherings = ref({ loading: true });
const failedGatheringImages = ref(new Set());
const currentTime = ref(Date.now());
let clockInterval = null;
let active = true;
const refreshTime = () => { currentTime.value = Date.now(); };
onMounted(() => {
  refreshTime();
  clockInterval = window.setInterval(refreshTime, 60000);
  document.addEventListener('visibilitychange', refreshTime);
});
onBeforeUnmount(() => {
  active = false;
  window.clearInterval(clockInterval);
  document.removeEventListener('visibilitychange', refreshTime);
});
projectsStore.getPublicProjectPage(1, 3)
  .then(response => { if (active) featured.value = response.data; })
  .catch(error => { if (active) featured.value = { error }; });
readPublicCollection(`${import.meta.env.VITE_API_URL}/api/volunteer-days/public`)
  .then(response => { if (active) gatherings.value = response.data; })
  .catch(error => { if (active) gatherings.value = { error }; });

const featuredProjects = computed(() => {
  const list = Array.isArray(featured.value) ? featured.value : [];
  return list
    .filter(isProjectPubliclyVisible)
    .sort((a, b) => Number(isProjectPubliclyVisible(b)) - Number(isProjectPubliclyVisible(a)))
    .slice(0, 3);
});
const heroProject = computed(() => featuredProjects.value.find(project => heroImage(project)));
const upcomingEvents = computed(() => {
  if (!Array.isArray(gatherings.value)) return [];
  const now = currentTime.value;
  return gatherings.value
    .filter(event => !event.canceled && !event.disabled && Number.isSafeInteger(event.id) && event.id > 0 && Date.parse(event.startDatetime) > now)
    .sort((first, second) => {
      const byTime = Date.parse(first.startDatetime) - Date.parse(second.startDatetime);
      if (byTime) return byTime;
      return first.documentId.localeCompare(second.documentId);
    })
    .slice(0, 3);
});
const gatheringDate = new Intl.DateTimeFormat('en-US', { timeZone: scheduleTimeZone, month: 'short', day: 'numeric' });
const gatheringTime = new Intl.DateTimeFormat('en-US', { timeZone: scheduleTimeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

function heroImage(item) {
  const image = item?.hero_image;
  const url = image?.formats?.medium?.url || image?.formats?.small?.url || image?.url;
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

function gatheringImage(event) {
  const url = heroImage(event);
  if (failedGatheringImages.value.has(url)) return '';
  return url;
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
      <header class="public-home__hero" :class="{ 'public-home__hero--text-only': !heroProject }">
        <div class="public-home__intro">
          <p class="public-home__eyebrow">Rooted in the East Bay</p>
          <h1>Find your people.<br><em>Grow something</em> good.</h1>
          <p class="public-home__welcome">A garden, a shared meal, a few new friends.<br>There's a place for you here.</p>
          <router-link to="/events" class="public-home__join">Find your next gathering <span aria-hidden="true">↗</span></router-link>
          <p class="public-home__aside">No green thumb required. Just you.</p>
        </div>
        <figure v-if="heroProject" class="public-home__hero-photo">
          <router-link :to="projectLink(heroProject)" :aria-label="`Explore ${heroProject.title}`">
            <img :src="heroImage(heroProject)" :alt="`Photo for ${heroProject.title}`">
          </router-link>
          <span class="public-home__stamp" aria-hidden="true">Small acts.<br>Deep roots.</span>
          <figcaption>{{ heroProject.title }}</figcaption>
        </figure>
      </header>

      <section class="public-home__section" aria-labelledby="home-gatherings">
        <div class="public-home__section-head">
          <div>
            <h2 id="home-gatherings">Your next good thing.</h2>
            <p class="public-home__gathering-intro">Find a way to join in.</p>
          </div>
          <router-link to="/schedule" class="public-home__text-link">View Schedule ↗</router-link>
        </div>
        <p v-if="gatherings.loading" class="public-home__state" role="status">Loading gatherings…</p>
        <p v-else-if="gatherings.error" class="public-home__state" role="alert">Couldn't load gatherings. Try again in a moment.</p>
        <p v-else-if="!upcomingEvents.length" class="public-home__state">No upcoming gatherings right now. <router-link to="/gardens">Find a garden near you ↗</router-link></p>
        <div v-else class="public-home__gatherings">
          <article v-for="event in upcomingEvents" :key="event.documentId" class="gathering-card">
            <router-link v-if="gatheringImage(event)" :to="`/d/${event.id}`" class="gathering-card__photo" :aria-label="`Explore ${event.title}`">
              <img :src="gatheringImage(event)" :alt="`Photo for ${event.title}`" loading="lazy" @error="failedGatheringImages.add(heroImage(event))">
            </router-link>
            <div v-else class="gathering-card__date"><time :datetime="event.startDatetime">{{ gatheringDate.format(new Date(event.startDatetime)) }}</time></div>
            <div class="gathering-card__copy">
              <time class="gathering-card__when" :datetime="event.startDatetime">{{ gatheringTime.format(new Date(event.startDatetime)) }}</time>
              <h3><router-link :to="`/d/${event.id}`">{{ event.title }}</router-link></h3>
              <p v-if="event.garden?.title" class="gathering-card__garden">{{ event.garden.title }}</p>
              <router-link :to="`/d/${event.id}`" class="gathering-card__link">Explore gathering <span aria-hidden="true">↗</span></router-link>
            </div>
          </article>
        </div>
      </section>

      <section class="public-home__section" aria-labelledby="home-projects">
        <div class="public-home__section-head">
          <div>
            <p class="public-home__eyebrow">From the Garden Steward community</p>
            <h2 id="home-projects">This is what growing together looks like.</h2>
          </div>
          <router-link to="/projects" class="public-home__text-link">See all projects ↗</router-link>
        </div>
        <p v-if="featured.loading" class="public-home__state" role="status">Loading projects…</p>
        <p v-else-if="featured.error" class="public-home__state" role="alert">Couldn't load projects. Try again in a moment.</p>
        <p v-else-if="!featuredProjects.length" class="public-home__state">No projects to show right now. <router-link to="/gardens">Find a garden near you ↗</router-link></p>
        <div v-else class="public-home__stories" :class="{ 'public-home__stories--single': featuredProjects.length === 1 }">
          <article v-for="project in featuredProjects" :key="project.id" class="project-story" :class="{ 'project-story--text-only': !heroImage(project) }">
            <router-link v-if="heroImage(project)" :to="projectLink(project)" class="project-story__photo" :aria-label="`Explore ${project.title}`">
              <img :src="heroImage(project)" :alt="`Photo for ${project.title}`" loading="lazy">
            </router-link>
            <div class="project-story__copy">
              <p v-if="project.garden?.title" class="project-story__garden">{{ project.garden.title }}</p>
              <h3><router-link :to="projectLink(project)">{{ project.title }}</router-link></h3>
              <p v-if="project.short_description">{{ project.short_description }}</p>
              <router-link :to="projectLink(project)" class="public-home__text-link">Explore the project ↗</router-link>
            </div>
          </article>
        </div>
      </section>

      <section class="public-home__first-visit public-home__section" aria-labelledby="home-first-visit">
        <div>
          <p class="public-home__eyebrow">Your first time?</p>
          <h2 id="home-first-visit">You don't have to<br>know a thing.<br>Or anyone.</h2>
        </div>
        <ol class="public-home__steps">
          <li><span aria-hidden="true">01</span><div><h3>Find something that feels like you.</h3><p>Find a garden or a project close to home.</p><router-link to="/gardens" class="public-home__text-link">Find your garden ↗</router-link></div></li>
          <li><span aria-hidden="true">02</span><div><h3>Let us know you're coming.</h3><p>Choose an upcoming gathering and read the plan for the day.</p><router-link to="/events" class="public-home__text-link">See upcoming events ↗</router-link></div></li>
          <li><span aria-hidden="true">03</span><div><h3>Show up. We'll start together.</h3><p>Meet the group, find your rhythm, and take part.</p></div></li>
        </ol>
      </section>

      <section class="public-home__about public-home__section" aria-labelledby="home-about">
        <h2 id="home-about">A little care.<br>A lot of community.</h2>
        <div>
          <p>Garden Steward is a community-driven, open-source project helping communities organize around their land.</p>
          <div class="public-home__about-links">
            <router-link to="/about" class="public-home__text-link">About Garden Steward ↗</router-link>
            <EmailLink subject="Garden Steward in my city" class="public-home__text-link">Bring Garden Steward to your city ↗</EmailLink>
          </div>
        </div>
      </section>
    </main>
  </ManageLayout>
</template>

<style scoped>
.public-home { background: var(--gs-paper); color: var(--gs-ink); font: 18px/1.55 var(--gs-body-font); }
.public-home a { color: inherit; text-underline-offset: 4px; }
.public-home h1, .public-home h2, .public-home h3 { font-family: var(--gs-heading-font); font-weight: 400; }
.public-home__eyebrow { margin: 0 0 18px; color: var(--gs-muted); font-size: 13px; letter-spacing: .1em; text-transform: uppercase; }
.public-home__eyebrow::before { content: ''; display: inline-block; width: 5px; height: 5px; margin-right: 9px; border-radius: 50%; background: #c1272d; vertical-align: middle; }
.public-home__hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: clamp(28px, 4vw, 70px); padding: 14px 0 62px; }
.public-home__hero--text-only { grid-template-columns: minmax(0, 1fr); }
.public-home h1 { margin: 0 0 24px; font-size: clamp(44px, 4.4vw, 104px); line-height: 1.02; letter-spacing: -.055em; max-width: 14ch; }
.public-home h1 em { color: #916625; font-weight: 400; }
.public-home__welcome { margin: 0 0 24px; font-size: clamp(18px, 1.45vw, 23px); line-height: 1.5; }
.public-home .public-home__join { display: inline-flex; justify-content: space-between; align-items: center; gap: 32px; padding: 13px 21px; border-radius: 28px; background: #c1272d; color: #fff9e8; text-decoration: none; font-size: 17px; }
.public-home__join:hover { background: #a51f25; }
.public-home__aside { margin: 15px 0 0; font-size: 14px; color: var(--gs-muted); }
.public-home__hero-photo { position: relative; margin: 12px 14px 16px 0; min-width: 0; }
.public-home__hero-photo > a { display: block; overflow: hidden; border-radius: 49% 49% 0 0; }
.public-home__hero-photo img { display: block; width: 100%; height: clamp(300px, 34vw, 560px); object-fit: cover; }
.public-home__hero-photo figcaption { position: absolute; left: -12px; bottom: -13px; max-width: 85%; padding: 8px 15px; transform: rotate(-4deg); border: 1px solid var(--gs-ink); background: var(--gs-paper); color: var(--gs-ink); font: 18px/1.25 var(--gs-heading-font); overflow-wrap: anywhere; }
.public-home__stamp { position: absolute; top: 0; right: -12px; display: grid; place-content: center; width: 90px; height: 90px; transform: rotate(14deg); border: 1px solid var(--gs-ink); border-radius: 50%; background: #f2ab27; text-align: center; font: 17px/1.15 var(--gs-heading-font); }
.public-home__section { padding: 40px 0 46px; border-top: 1px solid var(--gs-rule); }
.public-home h2 { max-width: 25ch; margin: 0; font-size: clamp(31px, 2.8vw, 44px); line-height: 1.12; letter-spacing: -.035em; }
.public-home__section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 30px; }
.public-home__section-head .public-home__eyebrow { margin-bottom: 13px; }
.public-home__text-link { font-size: 16px; white-space: normal; }
.public-home__section-head > a { flex-shrink: 0; }
.public-home__gathering-intro { margin: 10px 0 0; color: var(--gs-muted); font-size: 16px; }
.public-home__gatherings { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: stretch; gap: 20px; }
.gathering-card { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--gs-rule); border-radius: 3px; overflow: hidden; }
.gathering-card__photo { display: block; }
.gathering-card__photo img { display: block; width: 100%; aspect-ratio: 1.75 / 1; object-fit: cover; }
.gathering-card__date { display: grid; place-items: center; aspect-ratio: 1.75 / 1; background: #e4e8cc; font: 400 clamp(30px, 3vw, 48px)/1.1 var(--gs-heading-font); }
.gathering-card__copy { display: flex; flex: 1; flex-direction: column; align-items: flex-start; padding: 20px; }
.gathering-card__when { color: var(--gs-muted); font-size: 13px; line-height: 1.5; }
.gathering-card h3 { margin: 12px 0 10px; font-size: clamp(25px, 2.1vw, 34px); line-height: 1.12; letter-spacing: -.025em; overflow-wrap: anywhere; }
.gathering-card h3 a { text-decoration: none; }
.gathering-card h3 a:hover { text-decoration: underline; }
.gathering-card__garden { margin: 0 0 22px; color: var(--gs-muted); font-size: 16px; }
.gathering-card__link { display: flex; justify-content: space-between; align-items: center; gap: 20px; width: 100%; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--gs-rule); font-size: 15px; }
.public-home__stories { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); align-items: start; gap: 24px; }
.project-story { min-width: 0; padding: 8px; background: #e4e8cc; transform: rotate(-1deg); }
.project-story:nth-child(2) { background: #ece0c2; transform: rotate(1deg); }
.project-story:nth-child(3) { background: #e4e5bc; transform: rotate(-.5deg); }
.project-story__photo { display: block; }
.project-story__photo img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.project-story__copy { min-width: 0; padding: 18px 13px 13px; }
.project-story h3 { margin: 0 0 12px; font-size: clamp(27px, 2.1vw, 36px); line-height: 1.12; letter-spacing: -.025em; overflow-wrap: anywhere; }
.project-story h3 a { text-decoration: none; }
.project-story h3 a:hover { text-decoration: underline; }
.project-story p { margin: 0 0 18px; font-size: 18px; }
.project-story .project-story__garden { margin-bottom: 10px; color: var(--gs-muted); font-size: 15px; }
.public-home__stories--single .project-story { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 25px; transform: none; background: transparent; padding: 0; }
.public-home__stories--single .project-story__photo { padding: 8px; background: #e4e8cc; transform: rotate(-1deg); }
.public-home__stories--single .project-story__copy { padding: 14px 0; }
.public-home__stories--single .project-story--text-only { grid-template-columns: minmax(0, 1fr); }
.public-home__state { margin: 20px 0 8px; color: var(--gs-muted); }
.public-home__first-visit, .public-home__about { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(28px, 4vw, 70px); }
.public-home__steps { margin: 0; padding: 0; list-style: none; }
.public-home__steps li { display: grid; grid-template-columns: 35px minmax(0, 1fr); gap: 14px; padding: 17px 0; border-top: 1px solid var(--gs-rule); }
.public-home__steps li:first-child { padding-top: 0; border-top: 0; }
.public-home__steps li > span { color: #916625; font: 18px/1.3 var(--gs-heading-font); }
.public-home__steps h3 { margin: 0 0 6px; font-family: var(--gs-body-font); font-size: 19px; font-weight: 400; line-height: 1.35; }
.public-home__steps p { margin: 0 0 7px; color: var(--gs-muted); font-size: 16px; }
.public-home__about p { margin: 0 0 20px; max-width: 55ch; font-size: 19px; }
.public-home__about-links { display: flex; flex-wrap: wrap; gap: 15px 24px; }
@media (max-width: 760px) {
  .public-home__hero { grid-template-columns: minmax(0, 1fr); padding-top: 0; padding-bottom: 36px; gap: 28px; }
  .public-home h1 { font-size: clamp(43px, 10.5vw, 64px); }
  .public-home__welcome { font-size: 19px; }
  .public-home__hero-photo { margin: 0 12px 16px 4px; }
  .public-home__hero-photo img { height: auto; aspect-ratio: 1.2 / 1; }
  .public-home__stamp { width: 78px; height: 78px; font-size: 15px; }
  .public-home__hero-photo figcaption { left: -4px; font-size: 17px; }
  .public-home__section { padding: 30px 0 35px; }
  .public-home__section-head { display: block; }
  .public-home__section-head > a { display: inline-block; margin-top: 18px; }
  .public-home__gatherings { grid-template-columns: minmax(0, 1fr); gap: 22px; }
  .public-home__stories { grid-template-columns: minmax(0, 1fr); gap: 30px; }
  .public-home__stories--single .project-story, .public-home__first-visit, .public-home__about { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .public-home__stories--single .project-story { gap: 7px; }
  .project-story__copy { padding: 16px 11px 12px; }
}
</style>
