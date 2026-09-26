<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import MarkdownIt from 'markdown-it';
import { useProjectsStore, useGardensStore, useAuthStore, useAlertStore } from '@/stores';
import {
  getProjectCategoryBadgeClasses,
  projectReviewOptions,
  projectReviewLabel,
  normalizeReviewStatus
} from '@/_config/GardenConfig';
import ManageLayout from '@/components/ManageLayout.vue';
import ProjectForm from '@/components/form/ProjectForm.vue';

const route = useRoute();
const router = useRouter();
// documentId is the stable key in v5 — the numeric id changes on every
// publish (i.e. every save). All-digit params are legacy numeric links.
const routeKey = String(route.params.documentId || '');
const isLegacyNumericLink = /^\d+$/.test(routeKey);
const documentId = ref(isLegacyNumericLink ? null : routeKey);

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
// Single-column layout only; the wide layout always shows both lists.
const managersOpen = ref(false);
const interestedOpen = ref(false);

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
const isProjectManager = computed(() =>
  managers.value.some(m => (m.id || m) === user.value?.id)
);
const isCreator = computed(() => {
  const cb = project.value?.created_by;
  const id = (cb && typeof cb === 'object') ? cb.id : cb;
  return !!id && id === user.value?.id;
});
// Project leads: the owner (whoever pitched it), its managers, and admins.
// Only leads can edit the project, change its status, and see who is
// interested; everyone else sees the status and the interest count.
const isLead = computed(() =>
  !!user.value && (authStore.isAdmin || isProjectManager.value || isCreator.value)
);
const owner = computed(() => {
  const cb = project.value?.created_by;
  return (cb && typeof cb === 'object') ? cb : null;
});
// The owner is shown separately, so drop them from the leads list.
const leads = computed(() => managers.value.filter(m => m.id !== owner.value?.id));

// ── Display helpers ──
const reviewStatus = computed(() => normalizeReviewStatus(project.value?.review_status));
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

const apiUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`);

// ── Garden ──
const garden = computed(() => {
  const g = project.value?.garden;
  return (g && typeof g === 'object') ? g : null;
});
const gardenThumb = computed(() => {
  const img = garden.value?.hero_image;
  return apiUrl(img?.formats?.thumbnail?.url || img?.formats?.small?.url || img?.url);
});
// The populated garden carries no managers; ManageLayout's garden list does.
const canManageGarden = computed(() => {
  if (!user.value || !garden.value) return false;
  if (authStore.isAdmin) return true;
  const full = Array.isArray(gardens.value) ? gardens.value.find(x => x.id === garden.value.id) : null;
  return !!full && isGardenManager(full);
});

// ── Volunteer days linked to this project ──
const PAST_PREVIEW = 3;
const showAllPast = ref(false);
const linkedEvents = computed(() =>
  (project.value?.related_events || [])
    .filter(e => e && !e.disabled)
    .map(e => ({ ...e, start: e.startDatetime ? new Date(e.startDatetime) : null }))
);
const upcomingEvents = computed(() => {
  const now = Date.now();
  return linkedEvents.value
    .filter(e => e.start && e.start.getTime() >= now)
    .sort((a, b) => a.start - b.start);
});
const pastEvents = computed(() => {
  const now = Date.now();
  return linkedEvents.value
    .filter(e => !e.start || e.start.getTime() < now)
    .sort((a, b) => (b.start || 0) - (a.start || 0));
});
const visiblePastEvents = computed(() =>
  showAllPast.value ? pastEvents.value : pastEvents.value.slice(0, PAST_PREVIEW)
);
const eventWhen = (e) => (!e.start ? 'Date TBD' : e.start.toLocaleString(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
}));
const eventThumb = (e) => {
  const img = e.hero_image;
  return apiUrl(img?.formats?.thumbnail?.url || img?.url);
};

const publicUrl = computed(() => {
  const g = project.value?.garden;
  const slug = (g && typeof g === 'object') ? g.slug : null;
  if (!slug || !project.value?.slug) return '';
  return `/gardens/${slug}/p/${project.value.slug}`;
});

const reviewStatusClass = computed(() => `pd-status--${reviewStatus.value.toLowerCase()}`);

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

// Pick up a role changed in Strapi since login, so admins get lead access.
authStore.refreshRole();

// ManageLayout already loads gardens; reused here for the reviewer check.
const load = isLegacyNumericLink
  ? projectsStore.findById(Number(routeKey))
  : projectsStore.findByDocumentId(routeKey);
load
  .then(p => {
    if (!p) return;
    if (p.documentId && p.documentId !== routeKey) {
      documentId.value = p.documentId;
      router.replace({ name: 'manage-project', params: { documentId: p.documentId } });
    }
    buildForm(p);
  })
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
    await projectsStore.update(documentId.value, payload);
    const refreshed = await projectsStore.findByDocumentId(documentId.value);
    if (refreshed) buildForm(refreshed);
    isEditing.value = false;
    alertStore.success('Project saved.');
  } catch (err) {
    alertStore.error('Could not save the project. Please try again.');
  } finally {
    isSaving.value = false;
  }
};

// APPROVED is what makes a project public.
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
    // Patched by the store; re-fetching would blank the page.
    await projectsStore.toggleInterest(project.value.id);
    interested.value = Array.isArray(project.value.interested) ? [...project.value.interested] : [];
  } catch (e) {
    // store surfaces its own error alert
  } finally {
    togglingInterest.value = false;
  }
};

// Persists immediately, independent of the form's Save.
const promote = async (person) => {
  if (promotingId.value) return;
  promotingId.value = person.id;
  const nextManagers = [...managers.value, person];
  const nextInterested = interested.value.filter(u => u.id !== person.id);
  try {
    await projectsStore.update(documentId.value, {
      managers: nextManagers.map(u => u.id),
      interested: nextInterested.map(u => u.id)
    });
    managers.value = nextManagers;
    interested.value = nextInterested;
    alertStore.success(`${userName(person)} is now a project lead.`);
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
            <span class="pd-status" :class="reviewStatusClass">{{ reviewLabel }}</span>
          </div>
        </div>

        <!-- Title block -->
        <header class="pd-head">
          <div class="pd-head__main">
            <h1 class="pd-title">{{ project.title }}</h1>
            <p class="pd-meta">
              Pitched by <strong>{{ pitchedBy }}</strong>
              <span v-if="gardenName"> · <em>@ <router-link v-if="garden?.slug" :to="`/gardens/${garden.slug}`" class="pd-meta__link">{{ gardenName }}</router-link><template v-else>{{ gardenName }}</template></em></span>
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

        <!-- Wide containers: main + side columns. Narrower (tablet/phone):
             .pd-main/.pd-side flatten via display: contents and the cards
             reorder into one column — About, Review, People, Photos, Edit. -->
        <div class="pd-columns">
          <!-- Main column -->
          <div class="pd-main">
            <section class="pd-card pd-o-about">
              <h2 class="pd-card__title">About this project</h2>
              <p v-if="project.short_description" class="pd-lede">{{ project.short_description }}</p>
              <div v-if="renderedDescription" class="pd-prose" v-html="renderedDescription"></div>
              <p v-else-if="!project.short_description" class="pd-empty">No description yet.</p>
            </section>

            <!-- Volunteer days linked from the Event Manager -->
            <section class="pd-card pd-o-events">
              <h2 class="pd-card__title">
                Volunteer days
                <span v-if="linkedEvents.length" class="pd-collapse__count">{{ linkedEvents.length }}</span>
              </h2>

              <template v-if="linkedEvents.length">
                <h3 v-if="upcomingEvents.length" class="pd-subhead">Upcoming</h3>
                <ul v-if="upcomingEvents.length" class="pd-events">
                  <li v-for="e in upcomingEvents" :key="e.id" class="pd-event">
                    <router-link :to="`/d/${e.id}`" class="pd-event__link">
                      <span class="pd-event__thumb" :style="eventThumb(e) ? { backgroundImage: `url(${eventThumb(e)})` } : null"></span>
                      <span class="pd-event__body">
                        <span class="pd-event__title">{{ e.title }}</span>
                        <span class="pd-event__when">{{ eventWhen(e) }}</span>
                      </span>
                      <span v-if="e.canceled" class="pd-event__tag">Canceled</span>
                    </router-link>
                    <router-link v-if="canManageGarden" :to="`/manage/events/${e.id}/edit`" class="pd-event__edit">Edit</router-link>
                  </li>
                </ul>

                <h3 v-if="pastEvents.length" class="pd-subhead">Past</h3>
                <ul v-if="pastEvents.length" class="pd-events">
                  <li v-for="e in visiblePastEvents" :key="e.id" class="pd-event is-past">
                    <router-link :to="`/d/${e.id}`" class="pd-event__link">
                      <span class="pd-event__thumb" :style="eventThumb(e) ? { backgroundImage: `url(${eventThumb(e)})` } : null"></span>
                      <span class="pd-event__body">
                        <span class="pd-event__title">{{ e.title }}</span>
                        <span class="pd-event__when">{{ eventWhen(e) }}</span>
                      </span>
                      <span v-if="e.canceled" class="pd-event__tag">Canceled</span>
                    </router-link>
                    <router-link v-if="canManageGarden" :to="`/manage/events/${e.id}/edit`" class="pd-event__edit">Edit</router-link>
                  </li>
                </ul>
                <button
                  v-if="pastEvents.length > PAST_PREVIEW"
                  type="button"
                  class="pd-more"
                  @click="showAllPast = !showAllPast"
                >
                  {{ showAllPast ? 'Show fewer' : `Show all ${pastEvents.length} past days` }}
                </button>
              </template>
              <template v-else>
                <p class="pd-empty">No volunteer days linked yet.</p>
                <p v-if="canManageGarden" class="pd-hint pd-hint--after">
                  Link this project to a volunteer day from the event's editor.
                </p>
              </template>
            </section>

            <section v-if="galleryUrls.length > 1" class="pd-card pd-o-photos">
              <h2 class="pd-card__title">Photos</h2>
              <div class="pd-gallery">
                <img v-for="img in galleryUrls" :key="img.id" :src="img.src" alt="" />
              </div>
            </section>

            <!-- Edit -->
            <section v-if="isLead" class="pd-card pd-card--edit pd-o-edit">
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
            <!-- Garden -->
            <section class="pd-card pd-o-garden">
              <h2 class="pd-card__title">Garden</h2>
              <template v-if="garden">
                <component
                  :is="garden.slug ? 'router-link' : 'div'"
                  :to="garden.slug ? `/gardens/${garden.slug}` : undefined"
                  class="pd-garden"
                >
                  <span class="pd-garden__thumb" :style="gardenThumb ? { backgroundImage: `url(${gardenThumb})` } : null"></span>
                  <span class="pd-garden__body">
                    <span class="pd-garden__title">{{ garden.title }}</span>
                    <span v-if="garden.blurb" class="pd-garden__blurb">{{ garden.blurb }}</span>
                  </span>
                </component>
                <router-link v-if="canManageGarden && garden.slug" :to="`/manage/gardens/${garden.slug}`" class="pd-publiclink">
                  Manage garden →
                </router-link>
              </template>
              <p v-else class="pd-empty">Independent — not attached to a garden.</p>
            </section>

            <!-- Review workflow -->
            <section v-if="isLead" class="pd-card pd-o-review">
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
            <section v-else class="pd-card pd-o-review">
              <h2 class="pd-card__title">Review status</h2>
              <p class="pd-hint">
                <span class="pd-status" :class="reviewStatusClass">{{ reviewLabel }}</span>
              </p>
              <p class="pd-hint">
                Project leads set the status. Only approved projects appear on the public site.
              </p>
            </section>

            <!-- People. Collapsed by default in the single-column layout; the
                 wide layout always shows the lists and hides the toggle. -->
            <section class="pd-card pd-collapse pd-o-managers" :class="{ 'is-open': managersOpen }">
              <h2 class="pd-card__title">
                <button
                  type="button"
                  class="pd-collapse__head"
                  :aria-expanded="managersOpen"
                  @click="managersOpen = !managersOpen"
                >
                  <span>Project leads <span class="pd-collapse__count">{{ leads.length + (owner ? 1 : 0) }}</span></span>
                  <span v-if="owner || leads.length" class="pd-stack" aria-hidden="true">
                    <span v-if="owner" class="pd-avatar">{{ initials(owner) }}</span>
                    <span v-for="m in leads.slice(0, owner ? 3 : 4)" :key="m.id" class="pd-avatar">{{ initials(m) }}</span>
                  </span>
                  <svg class="pd-collapse__chev" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                  </svg>
                </button>
              </h2>
              <div class="pd-collapse__body">
                <ul v-if="owner || leads.length" class="pd-people">
                  <li v-if="owner" class="pd-person">
                    <span class="pd-avatar">{{ initials(owner) }}</span>
                    <span class="pd-person__name">{{ userName(owner) }}</span>
                    <span class="pd-person__tag">Owner</span>
                  </li>
                  <li v-for="m in leads" :key="m.id" class="pd-person">
                    <span class="pd-avatar">{{ initials(m) }}</span>
                    <span class="pd-person__name">{{ userName(m) }}</span>
                    <span class="pd-person__tag">Lead</span>
                  </li>
                </ul>
                <p v-else class="pd-empty">No project leads yet.</p>
              </div>
            </section>

            <!-- Leads see who is interested (and can promote them); everyone
                 else only sees the count. -->
            <section v-if="isLead" class="pd-card pd-collapse pd-o-interested" :class="{ 'is-open': interestedOpen }">
              <h2 class="pd-card__title">
                <button
                  type="button"
                  class="pd-collapse__head"
                  :aria-expanded="interestedOpen"
                  @click="interestedOpen = !interestedOpen"
                >
                  <span>Interested <span class="pd-collapse__count">{{ interested.length }}</span></span>
                  <span v-if="interested.length" class="pd-stack" aria-hidden="true">
                    <span v-for="p in interested.slice(0, 4)" :key="p.id" class="pd-avatar">{{ initials(p) }}</span>
                  </span>
                  <svg class="pd-collapse__chev" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                  </svg>
                </button>
              </h2>
              <div class="pd-collapse__body">
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
                      {{ promotingId === p.id ? 'Promoting…' : 'Make lead' }}
                    </button>
                  </li>
                </ul>
                <p v-else class="pd-empty">No one has expressed interest yet.</p>
              </div>
            </section>
            <section v-else class="pd-card pd-o-interested">
              <h2 class="pd-card__title">Interested</h2>
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

/* ── Columns ──
   Sized off the page's own width (container query), not the viewport: the
   manage sidebar eats ~300px, so a 1000px tablet only leaves ~600px here. */
.pd {
  container: pd / inline-size;
}

.pd-columns {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pd-main,
.pd-side {
  display: contents;
}

.pd-o-about { order: 1; }
.pd-o-garden { order: 2; }
.pd-o-events { order: 3; }
.pd-o-review { order: 4; }
.pd-o-managers { order: 5; }
.pd-o-interested { order: 6; }
.pd-o-photos { order: 7; }
.pd-o-edit { order: 8; }

@container pd (min-width: 880px) {
  .pd-columns {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    gap: 1.5rem;
    align-items: start;
  }

  .pd-main,
  .pd-side {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 0;
  }
}

@container pd (max-width: 560px) {
  .pd-hero {
    height: 180px;
  }

  .pd-card {
    padding: 1rem 1rem 1.15rem;
  }
}

.pd-card {
  background-color: #ffffff;
  border: 1px solid #e2dccb;
  border-radius: 14px;
  padding: 1.25rem 1.4rem 1.5rem;
}

.pd-card--edit {
  background-color: #d2e4c8;
  border-color: #a8c49a;
  color: #1a2617;
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
  color: #1a2617;
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
  margin: 0;
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

/* ── Collapsible people cards ── */
.pd-collapse {
  padding-top: 0.9rem;
  padding-bottom: 0.9rem;
}

.pd-collapse .pd-card__title {
  margin: 0;
}

.pd-collapse__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-text-fill-color: currentColor;
}

.pd-collapse__head > span:first-child {
  flex: 1;
}

.pd-collapse__count {
  display: inline-block;
  margin-left: 0.25rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background-color: #eef3e8;
  color: #4a5a45;
  font-size: 0.8rem;
  font-weight: 700;
  vertical-align: middle;
}

.pd-stack {
  display: inline-flex;
}

.pd-stack .pd-avatar {
  width: 1.7rem;
  height: 1.7rem;
  font-size: 0.65rem;
  border: 2px solid #ffffff;
}

.pd-stack .pd-avatar + .pd-avatar {
  margin-left: -0.45rem;
}

.pd-collapse__chev {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: #6b7280;
  transition: transform 0.2s ease;
}

.pd-collapse.is-open .pd-collapse__chev {
  transform: rotate(180deg);
}

.pd-collapse__body {
  display: none;
  margin-top: 0.9rem;
}

.pd-collapse.is-open .pd-collapse__body {
  display: block;
}

/* Full-width in the single column, so lay people out as a grid of chips. */
.pd-collapse .pd-people {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

@container pd (min-width: 880px) {
  .pd-collapse {
    padding-top: 1.25rem;
    padding-bottom: 1.5rem;
  }

  .pd-collapse .pd-card__title {
    margin-bottom: 0.75rem;
  }

  .pd-collapse__head {
    cursor: default;
    pointer-events: none;
  }

  .pd-stack,
  .pd-collapse__chev {
    display: none;
  }

  .pd-collapse__body,
  .pd-collapse.is-open .pd-collapse__body {
    display: block;
    margin-top: 0;
  }

  .pd-collapse .pd-people {
    display: flex;
  }
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
  border: 1px solid #5a6f50;
  color: #2f4a2a;
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
  color: #2f4a2a;
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

/* ── Garden ── */
.pd-garden {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem;
  margin-bottom: 0.75rem;
  border-radius: 0.6rem;
  border: 1px solid #e2dccb;
  background-color: rgba(108, 138, 106, 0.08);
  text-decoration: none;
  color: inherit;
}

a.pd-garden:hover { border-color: #a8c49a; }

.pd-garden__thumb,
.pd-event__thumb {
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  background-color: #d7e8c8;
  background-size: cover;
  background-position: center;
}

.pd-garden__body,
.pd-event__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pd-garden__title,
.pd-event__title {
  color: #344a34;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pd-garden__blurb {
  color: #6b7280;
  font-size: 0.85rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pd-meta__link {
  color: inherit;
  text-decoration: underline;
}

/* ── Volunteer days ── */
.pd-subhead {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #6b7280;
  margin: 0.25rem 0 0.5rem;
}

.pd-events {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pd-event {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.5rem 0.6rem;
  border-radius: 0.6rem;
  border: 1px solid #e2dccb;
  background-color: rgba(108, 138, 106, 0.08);
}

.pd-event.is-past { opacity: 0.8; }

.pd-event__link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
}

.pd-event__link:hover .pd-event__title { text-decoration: underline; }

.pd-event__when {
  color: #6b7280;
  font-size: 0.85rem;
}

.pd-event__tag {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  color: #7f1d1d;
  background-color: #fde2e2;
  -webkit-text-fill-color: currentColor;
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
}

.pd-event__edit {
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #376451;
  text-decoration: underline;
}

.pd-more {
  background: none;
  border: 0;
  padding: 0;
  color: #376451;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: underline;
  cursor: pointer;
}

.pd-hint--after { margin: 0.5rem 0 0; }
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
  color: #f4f1e4;
}

html.dark .pd-toggle {
  border-color: #a7c080;
  color: #d7e8c8;
}

html.dark .pd-toggle:hover {
  color: #1f2a14;
}

html.dark .pd-cancel {
  color: #f4f1e4;
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

html.dark .pd-collapse__count {
  background-color: rgba(255, 255, 255, 0.1);
  color: #d7e8c8;
}

html.dark .pd-stack .pd-avatar {
  border-color: #344a34;
}

html.dark .pd-collapse__chev {
  color: #a0a8a0;
}

html.dark .pd-promote {
  color: #d7e8c8;
  border-color: #a7c080;
}

html.dark .pd-prose a {
  color: #c8dbbf;
}

html.dark .pd-garden,
html.dark .pd-event {
  background-color: rgba(255, 255, 255, 0.05);
  border-color: #3d4d36;
}

html.dark .pd-garden__title,
html.dark .pd-event__title {
  color: #e6f0db;
}

html.dark .pd-garden__blurb,
html.dark .pd-event__when,
html.dark .pd-subhead {
  color: #a0a8a0;
}

html.dark .pd-event__edit,
html.dark .pd-more {
  color: #c8dbbf;
}

html.dark .pd-garden__thumb,
html.dark .pd-event__thumb {
  background-color: #3c4a2c;
}
</style>
