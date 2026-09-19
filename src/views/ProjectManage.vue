<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import MarkdownIt from 'markdown-it';
import { useProjectsStore, useGardensStore, useAuthStore, useAlertStore } from '@/stores';
import {
  getProjectCategoryBadgeClasses,
  projectReviewOptions,
  projectReviewLabel
} from '@/_config/GardenConfig';
import ManageLayout from '@/components/ManageLayout.vue';
import ProjectForm from '@/components/form/ProjectForm.vue';

const route = useRoute();
const projectId = Number(route.params.id) || route.params.id;

const projectsStore = useProjectsStore();
const gardensStore = useGardensStore();
const authStore = useAuthStore();
const alertStore = useAlertStore();
const { project } = storeToRefs(projectsStore);
const { gardens } = storeToRefs(gardensStore);
const { user } = storeToRefs(authStore);

const md = new MarkdownIt();

const form = ref({
  title: '',
  short_description: '',
  category: 'Community',
  garden: '',
  featured_gallery: [],
  location: null
});
const errors = ref({ title: false });
const isSaving = ref(false);
const isEditing = ref(false);
const projectForm = ref(null);

// People relations (managed separately from the editable form fields).
const managers = ref([]);
const interested = ref([]);
const promotingId = ref(null);
const reviewing = ref(false);
const togglingInterest = ref(false);

const userName = (u) => {
  if (!u) return '';
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return full || u.username || u.name || u.email || `User ${u.id}`;
};

const initials = (u) => {
  const name = userName(u);
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

// ── Garden options (gardens the user manages or volunteers at) ──
const isGardenManager = (garden) => {
  const gardenManagers = garden.managers || [];
  return gardenManagers.some(m => (m.id || m) === user.value?.id);
};
const isVolunteer = (garden) => {
  const volunteers = garden.volunteers || [];
  return volunteers.some(v => (v.id || v) === user.value?.id);
};
const pitchGardens = computed(() => {
  if (!Array.isArray(gardens.value) || !user.value) return [];
  return gardens.value.filter(g => isGardenManager(g) || isVolunteer(g));
});

// ── Permissions ──
// A garden's managers are the reviewers for projects pitched at that garden;
// the backend enforces the same rule on PUT /projects/:id/review.
const projectGarden = computed(() => {
  const g = project.value?.garden;
  const gardenId = (g && typeof g === 'object') ? g.id : g;
  if (!gardenId || !Array.isArray(gardens.value)) return null;
  return gardens.value.find(x => x.id === gardenId) || null;
});
const canReview = computed(() =>
  !!user.value && (authStore.isAdmin || (projectGarden.value ? isGardenManager(projectGarden.value) : false))
);
const isProjectManager = computed(() =>
  managers.value.some(m => (m.id || m) === user.value?.id)
);
const isCreator = computed(() => {
  const cb = project.value?.created_by;
  const id = (cb && typeof cb === 'object') ? cb.id : cb;
  return !!id && id === user.value?.id;
});
// Who may see the people behind a project and edit it: its own managers, the
// steward who pitched it, the managers of its garden, and admins.
const canManage = computed(() =>
  !!user.value && (authStore.isAdmin || isProjectManager.value || isCreator.value || canReview.value)
);

// ── Display helpers ──
const reviewStatus = computed(() => project.value?.review_status || 'CREATED');
const reviewLabel = computed(() => projectReviewLabel(reviewStatus.value));
const isApproved = computed(() => reviewStatus.value === 'APPROVED');

const pitchedBy = computed(() => {
  const cb = project.value?.created_by;
  if (!cb || typeof cb !== 'object') return 'A steward';
  return userName(cb) || 'A steward';
});

const gardenName = computed(() => {
  const g = project.value?.garden;
  return (g && typeof g === 'object') ? (g.title || '') : '';
});

const heroUrl = computed(() => {
  const img = project.value?.hero_image || project.value?.featured_gallery?.[0];
  const url = img?.formats?.large?.url || img?.formats?.medium?.url || img?.url;
  if (!url) return '';
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
});

const galleryUrls = computed(() => {
  const gallery = Array.isArray(project.value?.featured_gallery) ? project.value.featured_gallery : [];
  return gallery
    .map(img => {
      const url = img?.formats?.small?.url || img?.formats?.thumbnail?.url || img?.url;
      if (!url) return null;
      return { id: img.id, src: url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}` };
    })
    .filter(Boolean);
});

const renderedDescription = computed(() => {
  const body = project.value?.description;
  return body ? md.render(body) : '';
});

const createdOn = computed(() => {
  const created = project.value?.createdAt;
  if (!created) return '';
  const d = new Date(created);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
});

const publicUrl = computed(() => {
  const g = project.value?.garden;
  const slug = (g && typeof g === 'object') ? g.slug : null;
  if (!slug || !project.value?.slug) return '';
  return `/gardens/${slug}/p/${project.value.slug}`;
});

const isInterested = computed(() =>
  interested.value.some(u => (u.id || u) === user.value?.id)
);

const buildForm = (p) => {
  const attrs = p || {};
  const g = attrs.garden;
  const gardenId = g?.id ?? (typeof g === 'number' ? g : '');
  form.value = {
    title: attrs.title || '',
    short_description: attrs.short_description || '',
    category: attrs.category || 'Community',
    garden: gardenId || '',
    featured_gallery: Array.isArray(attrs.featured_gallery) ? [...attrs.featured_gallery] : [],
    // The schema stores flat latitude/longitude; the LocationPicker uses a
    // { latitude, longitude } object.
    location: (attrs.latitude != null && attrs.longitude != null)
      ? { latitude: attrs.latitude, longitude: attrs.longitude }
      : null
  };
  managers.value = Array.isArray(attrs.managers) ? [...attrs.managers] : [];
  interested.value = Array.isArray(attrs.interested) ? [...attrs.interested] : [];
};

// ManageLayout already loads gardens (for the pitch modal); this page reuses
// them for the association dropdown and the reviewer check.
projectsStore.findById(projectId)
  .then(p => { if (p) buildForm(p); })
  .catch(() => { /* store sets project.error */ });

const save = async () => {
  const valid = !!form.value.title.trim();
  errors.value = { title: !valid };
  if (!valid) return;
  isSaving.value = true;
  try {
    const gallery = form.value.featured_gallery || [];
    const payload = {
      title: form.value.title.trim(),
      short_description: form.value.short_description?.trim() || '',
      category: form.value.category,
      garden: form.value.garden || null,
      featured_gallery: gallery,
      hero_image: gallery[0] || null,
      // Map the picker's { latitude, longitude } to the schema's flat fields.
      latitude: form.value.location?.latitude ?? null,
      longitude: form.value.location?.longitude ?? null
    };
    await projectsStore.update(projectId, payload);
    const refreshed = await projectsStore.findById(projectId);
    if (refreshed) buildForm(refreshed);
    isEditing.value = false;
    alertStore.success('Project saved.');
  } catch (err) {
    alertStore.error('Could not save the project. Please try again.');
  } finally {
    isSaving.value = false;
  }
};

// Move the project through the review workflow. Only an APPROVED project is
// visible to signed-out visitors, so this is the gate to the public site.
const setReviewStatus = async (status) => {
  if (reviewing.value || status === reviewStatus.value) return;
  reviewing.value = true;
  try {
    await projectsStore.review(project.value.id, status);
    alertStore.success(
      status === 'APPROVED'
        ? 'Project approved — it is now visible to the public.'
        : `Project marked ${projectReviewLabel(status).toLowerCase()}.`
    );
  } catch (err) {
    alertStore.error('Could not update the review status. Please try again.');
  } finally {
    reviewing.value = false;
  }
};

const toggleInterest = async () => {
  if (togglingInterest.value) return;
  togglingInterest.value = true;
  try {
    // Patched in place by the store; re-fetching would blank the page.
    await projectsStore.toggleInterest(project.value.id);
    interested.value = Array.isArray(project.value.interested) ? [...project.value.interested] : [];
  } catch (e) {
    // store surfaces its own error alert
  } finally {
    togglingInterest.value = false;
  }
};

// Promote an interested person to a manager: add to managers, drop from
// interested, and persist immediately (independent of the form's Save).
const promote = async (person) => {
  if (promotingId.value) return;
  promotingId.value = person.id;
  const nextManagers = [...managers.value, person];
  const nextInterested = interested.value.filter(u => u.id !== person.id);
  try {
    await projectsStore.update(projectId, {
      managers: nextManagers.map(u => u.id),
      interested: nextInterested.map(u => u.id)
    });
    managers.value = nextManagers;
    interested.value = nextInterested;
    alertStore.success(`${userName(person)} is now a manager.`);
  } catch (err) {
    alertStore.error('Could not promote this person. Please try again.');
  } finally {
    promotingId.value = null;
  }
};
</script>

<template>
  <ManageLayout>
    <div class="pd">
      <div v-if="project.loading" class="pd__state">Loading project…</div>
      <div v-else-if="project.error" class="pd__state">
        Project not found.
        <a href="/manage/projects" class="pd__back">Back to projects</a>
      </div>

      <template v-else>
        <a href="/manage/projects" class="pd__back">← All projects</a>

        <!-- Hero -->
        <div
          class="pd-hero"
          :class="{ 'pd-hero--empty': !heroUrl }"
          :style="heroUrl ? { backgroundImage: `url(${heroUrl})` } : null"
        >
          <div class="pd-hero__flags">
            <span v-if="project.category" :class="getProjectCategoryBadgeClasses(project.category)">
              {{ project.category }}
            </span>
            <span class="pd-status" :class="`pd-status--${reviewStatus.toLowerCase()}`">{{ reviewLabel }}</span>
          </div>
        </div>

        <!-- Title block -->
        <header class="pd-head">
          <div class="pd-head__main">
            <h1 class="pd-title">{{ project.title }}</h1>
            <p class="pd-meta">
              Pitched by <strong>{{ pitchedBy }}</strong>
              <span v-if="gardenName"> · <em>@ {{ gardenName }}</em></span>
              <span v-else> · <em>Independent</em></span>
              <span v-if="createdOn"> · {{ createdOn }}</span>
            </p>
          </div>
          <div class="pd-head__actions">
            <span class="pd-count" title="People interested">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
              </svg>
              {{ interested.length }}
            </span>
            <button
              type="button"
              class="pd-interest"
              :class="{ 'is-active': isInterested }"
              :disabled="togglingInterest"
              @click="toggleInterest"
            >
              {{ isInterested ? 'Interested ✓' : "I'm interested" }}
            </button>
            <a v-if="publicUrl && isApproved" :href="publicUrl" class="pd-publiclink" target="_blank" rel="noopener">
              View public page ↗
            </a>
          </div>
        </header>

        <div class="pd-columns">
          <!-- Main column -->
          <div class="pd-main">
            <section class="pd-card">
              <h2 class="pd-card__title">About this project</h2>
              <p v-if="project.short_description" class="pd-lede">{{ project.short_description }}</p>
              <div v-if="renderedDescription" class="pd-prose" v-html="renderedDescription"></div>
              <p v-else-if="!project.short_description" class="pd-empty">No description yet.</p>
            </section>

            <section v-if="galleryUrls.length > 1" class="pd-card">
              <h2 class="pd-card__title">Photos</h2>
              <div class="pd-gallery">
                <img v-for="img in galleryUrls" :key="img.id" :src="img.src" alt="" />
              </div>
            </section>

            <!-- Edit -->
            <section v-if="canManage" class="pd-card pd-card--edit">
              <div class="pd-card__head">
                <h2 class="pd-card__title">Edit project</h2>
                <button type="button" class="pd-toggle" @click="isEditing = !isEditing">
                  {{ isEditing ? 'Close' : 'Edit details' }}
                </button>
              </div>

              <form v-if="isEditing" class="pd-form" @submit.prevent="save">
                <ProjectForm ref="projectForm" v-model="form" :gardens="pitchGardens" :errors="errors" />
                <div class="pd-form__footer">
                  <button type="button" class="pd-cancel" @click="isEditing = false">Cancel</button>
                  <button type="submit" class="pd-save" :disabled="isSaving || projectForm?.isUploading">
                    {{ isSaving ? 'Saving…' : 'Save changes' }}
                  </button>
                </div>
              </form>
            </section>
          </div>

          <!-- Side column -->
          <aside class="pd-side">
            <!-- Review workflow -->
            <section v-if="canReview" class="pd-card">
              <h2 class="pd-card__title">Review status</h2>
              <p class="pd-hint">
                Only an <strong>approved</strong> project is visible to visitors who are not signed in.
              </p>
              <div class="pd-review">
                <button
                  v-for="opt in projectReviewOptions"
                  :key="opt.value"
                  type="button"
                  class="pd-review__btn"
                  :class="{ 'is-current': reviewStatus === opt.value }"
                  :disabled="reviewing || reviewStatus === opt.value"
                  @click="setReviewStatus(opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </section>
            <section v-else class="pd-card">
              <h2 class="pd-card__title">Review status</h2>
              <p class="pd-hint">
                <span class="pd-status" :class="`pd-status--${reviewStatus.toLowerCase()}`">{{ reviewLabel }}</span>
              </p>
              <p class="pd-hint">
                Managers of {{ gardenName || 'the garden this project is pitched to' }} approve projects
                for the public site.
              </p>
            </section>

            <!-- People -->
            <template v-if="canManage">
              <section class="pd-card">
                <h2 class="pd-card__title">Managers</h2>
                <ul v-if="managers.length" class="pd-people">
                  <li v-for="m in managers" :key="m.id" class="pd-person">
                    <span class="pd-avatar">{{ initials(m) }}</span>
                    <span class="pd-person__name">{{ userName(m) }}</span>
                    <span class="pd-person__tag">Manager</span>
                  </li>
                </ul>
                <p v-else class="pd-empty">No managers yet.</p>
              </section>

              <section class="pd-card">
                <h2 class="pd-card__title">Interested ({{ interested.length }})</h2>
                <ul v-if="interested.length" class="pd-people">
                  <li v-for="p in interested" :key="p.id" class="pd-person">
                    <span class="pd-avatar">{{ initials(p) }}</span>
                    <span class="pd-person__name">{{ userName(p) }}</span>
                    <button
                      type="button"
                      class="pd-promote"
                      :disabled="promotingId === p.id"
                      @click="promote(p)"
                    >
                      {{ promotingId === p.id ? 'Promoting…' : 'Make manager' }}
                    </button>
                  </li>
                </ul>
                <p v-else class="pd-empty">No one has expressed interest yet.</p>
              </section>
            </template>
            <section v-else class="pd-card">
              <h2 class="pd-card__title">Support</h2>
              <p class="pd-hint">
                <strong>{{ interested.length }}</strong>
                {{ interested.length === 1 ? 'steward is' : 'stewards are' }} interested in this project.
              </p>
            </section>
          </aside>
        </div>
      </template>
    </div>
  </ManageLayout>
</template>

<style scoped>
.pd {
  min-width: 0;
}

.pd__state {
  color: #6b7280;
  font-style: italic;
  padding: 3rem 1rem;
  text-align: center;
}

.pd__back {
  display: inline-block;
  color: #376451;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 1rem;
}

.pd__back:hover {
  text-decoration: underline;
}

/* ── Hero ── */
.pd-hero {
  position: relative;
  height: 260px;
  border-radius: 14px;
  background-size: cover;
  background-position: center;
  border: 1px solid #e2dccb;
}

.pd-hero--empty {
  background: linear-gradient(135deg, #8aa37c, #376451);
}

.pd-hero__flags {
  position: absolute;
  top: 0.9rem;
  left: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pd-status {
  display: inline-block;
  padding: 0.15rem 0.7rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background-color: #f4f1e4;
  color: #4a5a45;
  -webkit-text-fill-color: currentColor;
}

.pd-status--created { background-color: #fbe6a2; color: #6b4e00; }
.pd-status--approved { background-color: #cfeacd; color: #1f3d22; }
.pd-status--rejected { background-color: #f6cfcf; color: #7a1f1f; }
.pd-status--completed { background-color: #cfe0ea; color: #1f3a4d; }
.pd-status--archived { background-color: #ddd8c8; color: #4a4a3f; }

/* ── Head ── */
.pd-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin: 1.25rem 0 1.75rem;
}

.pd-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 800;
  color: #376451;
  line-height: 1.1;
  margin: 0 0 0.4rem;
}

.pd-meta {
  color: #6b7280;
  margin: 0;
  font-size: 0.95rem;
}

.pd-meta strong {
  color: #344a34;
}

.pd-head__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.pd-count {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 700;
  color: #8aa37c;
}

.pd-count svg {
  width: 1.1rem;
  height: 1.1rem;
}

.pd-interest,
.pd-toggle,
.pd-promote,
.pd-review__btn,
.pd-save {
  -webkit-text-fill-color: currentColor;
}

.pd-interest {
  background-color: #cfeacd;
  color: #1f3d22;
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.2rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.pd-interest:hover:not(:disabled) { background-color: #b9dfb6; }
.pd-interest.is-active { background-color: #86b153; color: #14250f; }
.pd-interest:disabled { opacity: 0.6; cursor: not-allowed; }

.pd-publiclink {
  color: #376451;
  font-weight: 600;
  text-decoration: underline;
  font-size: 0.9rem;
}

/* ── Columns ── */
.pd-columns {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 900px) {
  .pd-columns {
    grid-template-columns: 1fr;
  }
}

.pd-main,
.pd-side {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}

.pd-card {
  background-color: #ffffff;
  border: 1px solid #e2dccb;
  border-radius: 14px;
  padding: 1.25rem 1.4rem 1.5rem;
}

.pd-card--edit {
  background-color: #3c4a2c;
  border-color: #56663b;
  color: #f4f1e4;
}

.pd-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.pd-card__title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #344a34;
  margin: 0 0 0.75rem;
}

.pd-card--edit .pd-card__title {
  color: #f4f1e4;
  margin-bottom: 0;
}

.pd-lede {
  color: #4a5a45;
  font-size: 1.02rem;
  line-height: 1.6;
  margin: 0 0 0.75rem;
  white-space: pre-line;
}

.pd-prose {
  color: #4a5a45;
  line-height: 1.65;
}

.pd-prose :deep(p) { margin: 0 0 0.85rem; }
.pd-prose :deep(ul),
.pd-prose :deep(ol) { margin: 0 0 0.85rem 1.2rem; list-style: revert; }
.pd-prose :deep(h1),
.pd-prose :deep(h2),
.pd-prose :deep(h3) { font-weight: 700; color: #344a34; margin: 1.2rem 0 0.5rem; }
.pd-prose :deep(a) { color: #376451; text-decoration: underline; }
.pd-prose :deep(img) { max-width: 100%; border-radius: 8px; }

.pd-empty {
  color: #6b7280;
  font-style: italic;
  margin: 0;
}

.pd-hint {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0 0 0.85rem;
}

.pd-hint strong { color: #344a34; }

.pd-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.6rem;
}

.pd-gallery img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
}

/* ── Review ── */
.pd-review {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pd-review__btn {
  border: 1px solid #c7cdbb;
  background-color: transparent;
  color: #4a5a45;
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pd-review__btn:hover:not(:disabled) {
  background-color: rgba(138, 163, 124, 0.15);
  border-color: #8aa37c;
}

.pd-review__btn.is-current {
  background-color: #86b153;
  border-color: #86b153;
  color: #14250f;
  cursor: default;
  opacity: 1;
}

.pd-review__btn:disabled:not(.is-current) {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── People ── */
.pd-people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pd-person {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  border-radius: 0.5rem;
  background-color: rgba(108, 138, 106, 0.08);
  border: 1px solid #e2dccb;
}

.pd-avatar {
  flex-shrink: 0;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 999px;
  background-color: #8aa37c;
  color: #14250f;
  -webkit-text-fill-color: currentColor;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.pd-person__name {
  flex: 1;
  min-width: 0;
  color: #344a34;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pd-person__tag {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  color: #2f5233;
  background-color: #d7e8c8;
  -webkit-text-fill-color: currentColor;
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
}

.pd-promote {
  flex-shrink: 0;
  background-color: transparent;
  border: 1px solid #8aa37c;
  color: #376451;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.4rem;
  padding: 0.2rem 0.55rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pd-promote:hover:not(:disabled) {
  background-color: #86b153;
  color: #14250f;
}

.pd-promote:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Edit form ── */
.pd-form {
  margin-top: 1.25rem;
}

.pd-form__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.75rem;
}

.pd-toggle {
  background-color: transparent;
  border: 1px solid #a7c080;
  color: #d7e8c8;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 0.4rem;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
}

.pd-toggle:hover {
  background-color: #86b153;
  color: #1f2a14;
}

.pd-cancel {
  background: none;
  border: none;
  color: #f4f1e4;
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.95rem;
}

.pd-save {
  background-color: #86b153;
  color: #1f2a14;
  font-weight: 700;
  padding: 0.7rem 1.6rem;
  border-radius: 0.6rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.pd-save:hover:not(:disabled) {
  background-color: #97c264;
  transform: translateY(-1px);
}

.pd-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<style>
html.dark .pd__state,
html.dark .pd-meta,
html.dark .pd-empty,
html.dark .pd-hint,
html.dark .pd-prose {
  color: #a0a8a0;
}

html.dark .pd__back,
html.dark .pd-publiclink {
  color: #c8dbbf;
}

html.dark .pd-title {
  color: #c8dbbf;
}

html.dark .pd-meta strong,
html.dark .pd-hint strong,
html.dark .pd-person__name,
html.dark .pd-prose h1,
html.dark .pd-prose h2,
html.dark .pd-prose h3 {
  color: #e6f0db;
}

html.dark .pd-card {
  background-color: #344a34;
  border-color: #3d4d36;
}

html.dark .pd-card--edit {
  background-color: #3c4a2c;
  border-color: #56663b;
}

html.dark .pd-card__title {
  color: #f5f5f5;
}

html.dark .pd-lede {
  color: #d8e0d4;
}

html.dark .pd-hero {
  border-color: #3d4d36;
}

html.dark .pd-person {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: #3d4d36;
}

html.dark .pd-review__btn {
  border-color: #56663b;
  color: #c2cbbb;
}

html.dark .pd-promote {
  color: #d7e8c8;
  border-color: #a7c080;
}

html.dark .pd-prose a {
  color: #c8dbbf;
}
</style>
