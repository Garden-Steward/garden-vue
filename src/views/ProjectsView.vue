<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useProjectsStore, useAuthStore } from '@/stores';
import {
    getProjectCategoryBadgeClasses,
    projectReviewLabel,
    projectReviewOptions,
    normalizeReviewStatus
} from '@/_config/GardenConfig';
import ManageLayout from '@/components/ManageLayout.vue';
import ExpressInterest from '@/components/modals/ExpressInterest.vue';

const router = useRouter();
const projectsStore = useProjectsStore();
const authStore = useAuthStore();
const { communityProjects } = storeToRefs(projectsStore);
const { user } = storeToRefs(authStore);

projectsStore.getAllProjects();

const search = ref('');
const sortBy = ref('interested'); // 'interested' | 'recent'
// 'ACTIVE' = every status except ARCHIVED; otherwise one review status.
const statusFilter = ref('ACTIVE');
const statusFilterOptions = [
    { value: 'ACTIVE', label: 'All active' },
    ...projectReviewOptions
];
const togglingId = ref(null);
const approvingId = ref(null);
const showInterestModal = ref(false);
const interestProject = ref({ id: null, title: '' });

const pendingProjects = computed(() =>
  allProjects.value.filter(p => {
    const rs = String(p.review_status || '').toUpperCase();
    return rs === 'CREATED';
  })
);

const isProjectAdmin = computed(() => {
  const role = user.value?.role;
  return authStore.isAdmin || role?.type === 'manager';
});

const approveProject = async (id) => {
  approvingId.value = id;
  try {
    await projectsStore.review(id, 'APPROVED');
    await projectsStore.getAllProjects();
  } catch { /* store surfaces error */ }
  finally { approvingId.value = null; }
};

const rejectProject = async (id) => {
  approvingId.value = id;
  try {
    await projectsStore.review(id, 'REJECTED');
    await projectsStore.getAllProjects();
  } catch { /* store surfaces error */ }
  finally { approvingId.value = null; }
};

const interestedCount = (project) => projectsStore.interestState(project).count;
const isInterested = (project) => projectsStore.interestState(project).isInterested;

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

// The title is a real link; clicking the card follows it, except over
// controls that own their click.
const projectLink = (project) => `/manage/project/${project.documentId || project.id}`;

const openProject = (project, event) => {
    if (event.target.closest('a, button')) return;
    router.push(projectLink(project));
};

const reviewStatus = (project) => normalizeReviewStatus(project.review_status);
const showReviewBadge = (project) => reviewStatus(project) !== 'APPROVED';
const reviewFlagClass = (project) => `cproj-card__flag--${reviewStatus(project).toLowerCase()}`;

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
    let list = allProjects.value.filter(p => {
        const rs = reviewStatus(p);
        return statusFilter.value === 'ACTIVE' ? rs !== 'ARCHIVED' : rs === statusFilter.value;
    });
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
    try {
        // The store patches the cache; refetching here would flash the grid.
        await projectsStore.toggleInterest(project.id);
    } catch (e) {
        // store surfaces its own error alert
    } finally {
        togglingId.value = null;
    }
};

const handleInterest = (project) => {
  if (isInterested(project)) {
    toggleInterest(project);
  } else if (user.value) {
    toggleInterest(project);
  } else {
    interestProject.value = { id: project.id, title: project.title };
    showInterestModal.value = true;
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
        <label class="cproj-filter">
          <span class="cproj-sort__label">STATUS:</span>
          <select v-model="statusFilter" class="cproj-filter__select">
            <option v-for="o in statusFilterOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <div class="cproj-sort">
          <span class="cproj-sort__label">SORT BY:</span>
          <div class="cproj-sort__toggle">
            <button type="button" :class="{ 'is-active': sortBy === 'interested' }" @click="sortBy = 'interested'">Most Interested</button>
            <button type="button" :class="{ 'is-active': sortBy === 'recent' }" @click="sortBy = 'recent'">Most Recent</button>
          </div>
        </div>
      </div>

      <p v-if="communityProjects.loading" class="cproj__state">Loading projects…</p>

            <!-- Pending Projects (admin only) -->
            <section v-if="isProjectAdmin && pendingProjects.length" class="cproj-pending">
              <h2 class="cproj-pending__title">📋 Pending Review ({{ pendingProjects.length }})</h2>
              <div class="cproj-pending__list">
                <div v-for="p in pendingProjects" :key="p.id" class="cproj-pending__item">
                  <div class="cproj-pending__info">
                    <strong>{{ p.title }}</strong>
                    <span class="cproj-pending__meta">{{ pitchedBy(p) }} · {{ p.submitter_email || 'no email' }}</span>
                    <span class="cproj-pending__desc">{{ (p.short_description || '').slice(0, 120) }}</span>
                  </div>
                  <div class="cproj-pending__actions">
                    <button @click="approveProject(p.id)" :disabled="approvingId === p.id" class="cproj-pending__approve">
                      {{ approvingId === p.id ? '…' : 'Approve' }}
                    </button>
                    <button @click="rejectProject(p.id)" :disabled="approvingId === p.id" class="cproj-pending__reject">
                      {{ approvingId === p.id ? '…' : 'Reject' }}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <!-- Grid -->
      <div class="cproj-grid">
        <article
          v-for="p in projects"
          :key="p.id"
          class="cproj-card"
          @click="openProject(p, $event)"
        >
          <div
            class="cproj-card__media"
            :class="{ 'cproj-card__media--empty': !getImageUrl(p.hero_image) }"
            :style="getImageUrl(p.hero_image) ? { backgroundImage: `url(${getImageUrl(p.hero_image)})` } : null"
          >
            <div class="cproj-card__flags">
              <span v-if="p.category" :class="getProjectCategoryBadgeClasses(p.category)">{{ p.category }}</span>
              <span v-if="secondaryBadge(p)" class="cproj-card__flag">{{ secondaryBadge(p) }}</span>
              <span
                v-if="showReviewBadge(p)"
                class="cproj-card__flag cproj-card__flag--review"
                :class="reviewFlagClass(p)"
              >{{ projectReviewLabel(reviewStatus(p)) }}</span>
            </div>
          </div>
          <div class="cproj-card__body">
            <div class="cproj-card__titlerow">
              <h3 class="cproj-card__title">
                <RouterLink :to="projectLink(p)">{{ p.title }}</RouterLink>
              </h3>
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
              @click="handleInterest(p)"
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
        No projects match your search{{ statusFilter === 'ACTIVE' ? '' : ' and status filter' }}.
      </p>
    </div>
  </ManageLayout>

  <ExpressInterest
    v-model="showInterestModal"
    :project-id="interestProject.id"
    :project-title="interestProject.title"
  />
</template>

<style scoped>
.cproj {
    min-width: 0;
    font-family: var(--gs-body-font);
    font-size: 18px;
    color: var(--gs-ink);
    overflow-wrap: anywhere;
}

.cproj__title {
    font-family: var(--gs-heading-font);
    font-size: clamp(42px, 4.8vw, 72px);
    font-weight: 400;
    color: var(--gs-ink);
    line-height: 1.1;
    margin: 0 0 0.5rem;
}

.cproj__intro {
    max-width: none;
    color: var(--gs-muted);
    margin: 0 0 1.5rem;
    line-height: 1.5;
}

.cproj__state {
    color: var(--gs-muted);
    font-style: italic;
}

/* ── Toolbar ── */
.cproj-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background-color: var(--gs-sage);
    border: none;
    border-radius: 0;
    padding: 0.85rem 1rem;
    margin-bottom: 1.75rem;
    border-top: 1px solid var(--gs-rule);
    border-bottom: 1px solid var(--gs-rule);
}

.cproj-search {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    min-width: min(220px, 100%);
    background-color: var(--gs-paper);
    border: 1px solid var(--gs-rule);
    border-radius: 0;
    padding: 0.55rem 1rem;
}

.cproj-search svg {
    width: 1.1rem;
    height: 1.1rem;
    color: var(--gs-muted);
    flex-shrink: 0;
}

.cproj-search input {
    border: none;
    outline: none;
    background: transparent;
    width: 100%;
    color: var(--gs-ink);
    font-size: 0.95rem;
    min-width: 0;
    font: inherit;
}

.cproj-sort {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.cproj-sort__label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--gs-muted);
}

.cproj-sort__toggle {
    display: inline-flex;
    background-color: var(--gs-sage);
    border-radius: 0;
    padding: 0.2rem;
    border: 1px solid var(--gs-rule);
}

.cproj-sort__toggle button {
    border: none;
    background: transparent;
    border-radius: 0;
    padding: 0.4rem 0.9rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--gs-muted);
    cursor: pointer;
    transition: all 0.2s ease;
}

.cproj-sort__toggle button.is-active {
    background-color: var(--gs-ink);
    color: var(--gs-paper);
}

/* ── Status filter ── */
.cproj-filter {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
}

.cproj-filter__select {
    appearance: none;
    border: 1px solid var(--gs-rule);
    border-radius: 0;
    background-color: var(--gs-paper);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234a5a45' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.7rem center;
    background-size: 0.9rem;
    padding: 0.5rem 2.1rem 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--gs-ink);
    cursor: pointer;
}

.cproj-filter__select:focus-visible {
    outline: 2px solid var(--gs-ink);
    outline-offset: 2px;
}

/* ── Grid + cards ── */
.cproj-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 1.5rem;
}

.cproj-card {
    position: relative;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    background-color: var(--gs-paper);
    border: 1px solid var(--gs-rule);
    border-radius: 0;
    overflow: hidden;
    transition: all 0.2s ease;
}

/* Highlight the card on hover, except over the interest button. */
.cproj-card:hover:not(:has(.cproj-card__btn:hover)) {
    border-color: var(--gs-muted);
    box-shadow: none;
    transform: none;
}

.cproj-card:hover:not(:has(.cproj-card__btn:hover)) .cproj-card__title a {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
}

.cproj-card__title a {
    color: inherit;
    text-decoration: none;
}

.cproj-card__title a:focus-visible {
    outline: 2px solid var(--gs-ink);
    outline-offset: 2px;
    border-radius: 0;
}

.cproj-card__media {
    position: relative;
    height: 200px;
    background-size: cover;
    background-position: center;
}

.cproj-card__media--empty {
    background: var(--gs-sage);
}

.cproj-card__flags {
    position: absolute;
    top: 0.85rem;
    left: 0.85rem;
    right: 0.85rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.cproj-card__flag {
    display: inline-block;
    white-space: nowrap;
    padding: 0.15rem 0.65rem;
    border-radius: 0;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: var(--gs-paper);
    color: var(--gs-muted);
    -webkit-text-fill-color: currentColor;
}

.cproj-card__flag--created { background-color: #fbe6a2; color: #6b4e00; }
.cproj-card__flag--rejected { background-color: #f6cfcf; color: #7a1f1f; }
.cproj-card__flag--completed { background-color: #cfe0ea; color: #1f3a4d; }
.cproj-card__flag--archived { background-color: #ddd8c8; color: #4a4a3f; }

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
    font-size: 1.6rem;
    font-weight: 400;
    color: var(--gs-ink);
    margin: 0;
    line-height: 1.2;
    font-family: var(--gs-heading-font);
}

.cproj-card__count {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--gs-muted);
}

.cproj-card__count svg {
    width: 1rem;
    height: 1rem;
}

.cproj-card__desc {
    font-size: 0.9rem;
    color: var(--gs-muted);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.cproj-card__pitch {
    font-size: 0.85rem;
    color: var(--gs-muted);
    margin: 0.2rem 0 0.4rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: space-between;
}

.cproj-card__pitch strong {
    color: var(--gs-ink);
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
    position: relative;
    margin-top: auto;
    width: 100%;
    background-color: var(--gs-ink);
    color: var(--gs-paper);
    border: none;
    border-radius: 0;
    padding: 0.6rem 1rem;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.cproj-card__btn:hover:not(:disabled) {
    background-color: var(--gs-muted);
}

.cproj-card__btn.is-active {
    background-color: var(--gs-sage);
    color: var(--gs-ink);
    outline: 1px solid var(--gs-ink);
}

.cproj-card__btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ── Pending review section ── */
.cproj-pending {
  margin-bottom: 2rem;
  background: var(--gs-sage);
  border: 1px solid var(--gs-rule);
  border-radius: 0;
  padding: 1.25rem;
    border-left: 3px solid #F2AB27;
}

.cproj-pending__title {
  font-size: 1.6rem;
  font-weight: 400;
  color: var(--gs-ink);
  margin: 0 0 1rem;
    font-family: var(--gs-heading-font);
}

.cproj-pending__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cproj-pending__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--gs-paper);
  border: 1px solid var(--gs-rule);
  border-radius: 0;
    flex-wrap: wrap;
}

.cproj-pending__info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
}

.cproj-pending__info strong {
  color: var(--gs-ink);
}

.cproj-pending__meta {
  font-size: 0.85rem;
  color: var(--gs-muted);
}

.cproj-pending__desc {
  font-size: 0.85rem;
  color: var(--gs-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cproj-pending__actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.cproj-pending__approve,
.cproj-pending__reject {
  padding: 0.4rem 1rem;
  border-radius: 0;
  border: none;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.cproj-pending__approve {
  background: var(--gs-ink);
  color: var(--gs-paper);
}

.cproj-pending__approve:hover:not(:disabled) {
  background: var(--gs-muted);
}

.cproj-pending__reject {
  background: #c1272d;
  color: var(--gs-paper);
}

.cproj-pending__reject:hover:not(:disabled) {
  background: #a92127;
}

.cproj-pending__approve:disabled,
.cproj-pending__reject:disabled {
  opacity: 0.5;
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
    border-radius: 0;
    background-color: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    border-color: var(--gs-rule);
}

.cproj-idea:hover {
    background-color: var(--gs-sage);
    border-color: var(--gs-muted);
}

.cproj-idea__plus {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0;
    background-color: var(--gs-sage);
    color: var(--gs-ink);
    font-size: 1.6rem;
    line-height: 1;
    margin-bottom: 0.25rem;
}

.cproj-idea__title {
    font-size: 1.6rem;
    font-weight: 400;
    color: var(--gs-ink);
    font-family: var(--gs-heading-font);
}

.cproj-idea__text {
    font-size: 0.9rem;
    color: var(--gs-muted);
    max-width: 220px;
}

.cproj-idea__cta {
    font-weight: 700;
    color: var(--gs-ink);
    text-decoration: underline;
    margin-top: 0.4rem;
}

.cproj button:focus-visible,
.cproj input:focus-visible {
    outline: 2px solid var(--gs-ink);
    outline-offset: 3px;
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

html.dark .cproj-filter__select {
    background-color: rgba(255, 255, 255, 0.06);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c2cbbb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    color: #e6f0db;
}

html.dark .cproj-filter__select option {
    background-color: #344a34;
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
