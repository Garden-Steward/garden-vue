<script setup>
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useProjectsStore, useAuthStore } from '@/stores';
import { getProjectCategoryBadgeClasses } from '@/_config/GardenConfig';
import ManageLayout from '@/components/ManageLayout.vue';

const projectsStore = useProjectsStore();
const authStore = useAuthStore();
const { communityProjects } = storeToRefs(projectsStore);
const { user } = storeToRefs(authStore);

projectsStore.getAllProjects();

const search = ref('');
const sortBy = ref('interested'); // 'interested' | 'recent'
const togglingId = ref(null);

const relationIds = (rel) => {
    const arr = rel?.data || rel || [];
    return (Array.isArray(arr) ? arr : []).map(x => x.id ?? x);
};
const interestedCount = (project) => relationIds(project.interested).length;
const isInterested = (project) => relationIds(project.interested).includes(user.value?.id);

const pitchedBy = (project) => {
    const cb = project.created_by;
    if (!cb || typeof cb !== 'object') return 'A steward';
    const full = [cb.firstName, cb.lastName].filter(Boolean).join(' ').trim();
    return full || cb.username || cb.name || cb.email || 'A steward';
};

const gardenName = (project) => {
    const g = project.garden;
    return (g && typeof g === 'object') ? (g.title || '') : '';
};

const getImageUrl = (image) => {
    const img = image;
    const url = img?.formats?.medium?.url || img?.formats?.small?.url || img?.url;
    if (!url) return '';
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
};

const secondaryBadge = (project) => {
    if (interestedCount(project) >= 50) return 'Popular';
    const created = project.createdAt;
    if (created && (Date.now() - new Date(created).getTime()) < 14 * 24 * 3600 * 1000) return 'Recent';
    return null;
};

const allProjects = computed(() =>
    Array.isArray(communityProjects.value) ? communityProjects.value : []
);

const projects = computed(() => {
    let list = allProjects.value;
    const q = search.value.trim().toLowerCase();
    if (q) {
        list = list.filter(p =>
            (p.title || '').toLowerCase().includes(q) ||
            (p.short_description || '').toLowerCase().includes(q)
        );
    }
    return [...list].sort((a, b) => {
        if (sortBy.value === 'interested') return interestedCount(b) - interestedCount(a);
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
});

const toggleInterest = async (project) => {
    if (togglingId.value) return;
    togglingId.value = project.id;
    const ids = relationIds(project.interested);
    const next = ids.includes(user.value?.id)
        ? ids.filter(id => id !== user.value?.id)
        : [...ids, user.value?.id];
    try {
        await projectsStore.update(project.id, { interested: next });
        await projectsStore.getAllProjects();
    } catch (e) {
        // store surfaces its own error alert
    } finally {
        togglingId.value = null;
    }
};
</script>

<template>
  <ManageLayout v-slot="{ openPitch }">
    <div class="cproj">
      <header class="cproj__head">
        <h1 class="cproj__title">Community Projects</h1>
        <p class="cproj__intro">
          Explore organic initiatives proposed by your fellow stewards. Support the growth of local
          ecosystems through community-led infrastructure and art.
        </p>
      </header>

      <!-- Toolbar -->
      <div class="cproj-toolbar">
        <div class="cproj-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input v-model="search" type="text" placeholder="Search projects..." />
        </div>
        <div class="cproj-sort">
          <span class="cproj-sort__label">SORT BY:</span>
          <div class="cproj-sort__toggle">
            <button type="button" :class="{ 'is-active': sortBy === 'interested' }" @click="sortBy = 'interested'">Most Interested</button>
            <button type="button" :class="{ 'is-active': sortBy === 'recent' }" @click="sortBy = 'recent'">Most Recent</button>
          </div>
        </div>
      </div>

      <p v-if="communityProjects.loading" class="cproj__state">Loading projects…</p>

      <!-- Grid -->
      <div class="cproj-grid">
        <article v-for="p in projects" :key="p.id" class="cproj-card">
          <div
            class="cproj-card__media"
            :class="{ 'cproj-card__media--empty': !getImageUrl(p.hero_image) }"
            :style="getImageUrl(p.hero_image) ? { backgroundImage: `url(${getImageUrl(p.hero_image)})` } : null"
          >
            <div class="cproj-card__flags">
              <span v-if="p.category" :class="getProjectCategoryBadgeClasses(p.category)">{{ p.category }}</span>
              <span v-if="secondaryBadge(p)" class="cproj-card__flag">{{ secondaryBadge(p) }}</span>
            </div>
          </div>
          <div class="cproj-card__body">
            <div class="cproj-card__titlerow">
              <h3 class="cproj-card__title">{{ p.title }}</h3>
              <span class="cproj-card__count" title="People interested">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
                </svg>
                {{ interestedCount(p) }}
              </span>
            </div>
            <p class="cproj-card__desc">{{ p.short_description }}</p>
            <p class="cproj-card__pitch">
              Pitched by <strong>{{ pitchedBy(p) }}</strong>
              <span class="cproj-card__garden">{{ gardenName(p) ? '@ ' + gardenName(p) : 'Independent' }}</span>
            </p>
            <button
              type="button"
              class="cproj-card__btn"
              :class="{ 'is-active': isInterested(p) }"
              :disabled="togglingId === p.id"
              @click="toggleInterest(p)"
            >
              {{ isInterested(p) ? 'Interested ✓' : "I'm interested" }}
            </button>
          </div>
        </article>

        <!-- Have an idea? -->
        <button type="button" class="cproj-idea" @click="openPitch">
          <span class="cproj-idea__plus">+</span>
          <span class="cproj-idea__title">Have an idea?</span>
          <span class="cproj-idea__text">Pitch your vision to the community and find supporters.</span>
          <span class="cproj-idea__cta">Create New Proposal</span>
        </button>
      </div>

      <p v-if="!projects.length && !communityProjects.loading" class="cproj__state">
        No projects match your search.
      </p>
    </div>
  </ManageLayout>
</template>

<style scoped>
.cproj {
    min-width: 0;
}

.cproj__title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    color: #376451;
    line-height: 1.1;
    margin: 0 0 0.5rem;
}

.cproj__intro {
    max-width: 720px;
    color: #6b7280;
    margin: 0 0 1.5rem;
    line-height: 1.5;
}

.cproj__state {
    color: #6b7280;
    font-style: italic;
}

/* ── Toolbar ── */
.cproj-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background-color: rgba(108, 138, 106, 0.1);
    border: 1px solid #e2dccb;
    border-radius: 12px;
    padding: 0.85rem 1rem;
    margin-bottom: 1.75rem;
}

.cproj-search {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    min-width: 220px;
    background-color: #ffffff;
    border: 1px solid #e2dccb;
    border-radius: 999px;
    padding: 0.55rem 1rem;
}

.cproj-search svg {
    width: 1.1rem;
    height: 1.1rem;
    color: #8aa37c;
    flex-shrink: 0;
}

.cproj-search input {
    border: none;
    outline: none;
    background: transparent;
    width: 100%;
    color: #344a34;
    font-size: 0.95rem;
}

.cproj-sort {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.cproj-sort__label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #6b7280;
}

.cproj-sort__toggle {
    display: inline-flex;
    background-color: rgba(108, 138, 106, 0.15);
    border-radius: 999px;
    padding: 0.2rem;
}

.cproj-sort__toggle button {
    border: none;
    background: transparent;
    border-radius: 999px;
    padding: 0.4rem 0.9rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #4a5a45;
    cursor: pointer;
    transition: all 0.2s ease;
}

.cproj-sort__toggle button.is-active {
    background-color: #d7e8c8;
    color: #2f5233;
}

/* ── Grid + cards ── */
.cproj-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}

.cproj-card {
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    border: 1px solid #e2dccb;
    border-radius: 14px;
    overflow: hidden;
    transition: all 0.2s ease;
}

.cproj-card:hover {
    border-color: #8aa37c;
    box-shadow: 0 6px 18px rgba(138, 163, 124, 0.22);
}

.cproj-card__media {
    position: relative;
    height: 200px;
    background-size: cover;
    background-position: center;
}

.cproj-card__media--empty {
    background: linear-gradient(135deg, #8aa37c, #376451);
}

.cproj-card__flags {
    position: absolute;
    top: 0.85rem;
    left: 0.85rem;
    display: flex;
    gap: 0.4rem;
}

.cproj-card__flag {
    display: inline-block;
    padding: 0.15rem 0.65rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: #f4f1e4;
    color: #4a5a45;
    -webkit-text-fill-color: currentColor;
}

.cproj-card__body {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem 1.1rem 1.2rem;
    flex: 1;
}

.cproj-card__titlerow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
}

.cproj-card__title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #344a34;
    margin: 0;
    line-height: 1.2;
}

.cproj-card__count {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #8aa37c;
}

.cproj-card__count svg {
    width: 1rem;
    height: 1rem;
}

.cproj-card__desc {
    font-size: 0.9rem;
    color: #6b7280;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.cproj-card__pitch {
    font-size: 0.85rem;
    color: #6b7280;
    margin: 0.2rem 0 0.4rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: space-between;
}

.cproj-card__pitch strong {
    color: #344a34;
    font-weight: 700;
}

.cproj-card__garden {
    font-style: italic;
}

/*
 * WebKit paints (inherited) -webkit-text-fill-color over `color`, so dark text
 * on these light backgrounds renders white unless we re-anchor the fill.
 * (Same fix as the dashboard badges.)
 */
.cproj-card__btn,
.cproj-card__flags span,
.cproj-sort__toggle button,
.cproj-search input {
    -webkit-text-fill-color: currentColor;
}

.cproj-card__btn {
    margin-top: auto;
    width: 100%;
    background-color: #cfeacd;
    color: #1f3d22;
    border: none;
    border-radius: 999px;
    padding: 0.6rem 1rem;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.cproj-card__btn:hover:not(:disabled) {
    background-color: #b9dfb6;
}

.cproj-card__btn.is-active {
    background-color: #86b153;
    color: #14250f;
}

.cproj-card__btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ── Have an idea card ── */
.cproj-idea {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 0.5rem;
    min-height: 200px;
    padding: 1.5rem;
    border: 1px dashed #c7cdbb;
    border-radius: 14px;
    background-color: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
}

.cproj-idea:hover {
    background-color: rgba(138, 163, 124, 0.08);
    border-color: #8aa37c;
}

.cproj-idea__plus {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background-color: #86b153;
    color: #14250f;
    font-size: 1.6rem;
    line-height: 1;
    margin-bottom: 0.25rem;
}

.cproj-idea__title {
    font-size: 1.2rem;
    font-weight: 700;
    color: #344a34;
}

.cproj-idea__text {
    font-size: 0.9rem;
    color: #6b7280;
    max-width: 220px;
}

.cproj-idea__cta {
    font-weight: 700;
    color: #376451;
    text-decoration: underline;
    margin-top: 0.4rem;
}
</style>

<style>
html.dark .cproj__title {
    color: #c8dbbf;
}

html.dark .cproj__intro,
html.dark .cproj__state,
html.dark .cproj-card__desc,
html.dark .cproj-card__pitch {
    color: #a0a8a0;
}

html.dark .cproj-toolbar {
    background-color: rgba(255, 255, 255, 0.04);
    border-color: #3d4d36;
}

html.dark .cproj-search {
    background-color: rgba(26, 26, 26, 0.4);
    border-color: #3d4d36;
}

html.dark .cproj-search input {
    color: #f5f5f5;
}

html.dark .cproj-sort__label {
    color: #a0a8a0;
}

html.dark .cproj-sort__toggle {
    background-color: rgba(255, 255, 255, 0.06);
}

html.dark .cproj-sort__toggle button {
    color: #c2cbbb;
}

html.dark .cproj-sort__toggle button.is-active {
    background-color: rgba(138, 163, 124, 0.3);
    color: #e6f0db;
}

html.dark .cproj-card {
    background-color: #344a34;
    border-color: #3d4d36;
}

html.dark .cproj-card__title {
    color: #f5f5f5;
}

html.dark .cproj-card__pitch strong {
    color: #e6f0db;
}

html.dark .cproj-idea {
    border-color: #3d4d36;
}

html.dark .cproj-idea:hover {
    background-color: rgba(138, 163, 124, 0.1);
    border-color: #8aa37c;
}

html.dark .cproj-idea__title {
    color: #c8dbbf;
}

html.dark .cproj-idea__text {
    color: #a0a8a0;
}

html.dark .cproj-idea__cta {
    color: #c8dbbf;
}
</style>
