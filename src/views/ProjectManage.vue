<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { storeToRefs } from 'pinia';
import MarkdownIt from 'markdown-it';
import { useProjectsStore, useGardensStore, useAuthStore, useAlertStore } from '@/stores';
import {
  projectCategoryOptions,
  getProjectCategoryOverlayClasses,
  getProjectStatusOverlayClasses,
  resolveProjectStatus,
  projectReviewOptions,
  projectReviewLabel,
  normalizeReviewStatus
} from '@/_config/GardenConfig';
import ManageLayout from '@/components/ManageLayout.vue';
import StaticPinMap from '@/components/StaticPinMap.vue';
import ProjectLocationModal from '@/components/modals/ProjectLocationModal.vue';

/*
 * One project page, two modes. Members see a page built for taking part
 * (interest, volunteer days, where to meet). Leads see the same page with an
 * "Edit project" control; editing happens in place on each card and is held
 * as a draft until "Save changes". Interest, review status, new leads and
 * unlinking a volunteer day save right away — they aren't project edits.
 */
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

// The store blanks `project` while re-fetching after a save; keep showing the
// last loaded copy so the page doesn't flash a spinner.
const current = ref(null);
watch(project, (p) => { if (p?.id) current.value = p; }, { immediate: true });

const apiUrl = (url) => (!url ? '' : url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`);

const userName = (u) => {
  if (!u) return '';
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return full || u.username || u.name || u.email || `User ${u.id}`;
};

const initials = (u) => {
  const parts = userName(u).split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

// Soft brand tints for avatars, picked by user id so a person keeps a color.
const AVATAR_TINTS = [
  { bg: '#8aa37c', fg: '#14281a' },
  { bg: '#F9E2D1', fg: '#7c3a12' },
  { bg: '#c8dbbf', fg: '#064e3b' },
  { bg: '#fed7aa', fg: '#7c2d12' },
  { bg: '#376451', fg: '#f7f1e3' }
];
const avatarStyle = (u) => {
  const t = AVATAR_TINTS[Math.abs(Number(u?.id) || 0) % AVATAR_TINTS.length];
  return { backgroundColor: t.bg, color: t.fg };
};

// ── People ──
const managers = ref([]);
const interested = ref([]);
const promotingId = ref(null);
const reviewing = ref(false);
const togglingInterest = ref(false);
const showAddLead = ref(false);

const owner = computed(() => {
  const cb = current.value?.created_by;
  return (cb && typeof cb === 'object') ? cb : null;
});
// The owner is listed first, so drop them from the other leads.
const coLeads = computed(() => managers.value.filter(m => m.id !== owner.value?.id));
const people = computed(() => [
  ...(owner.value ? [{ user: owner.value, role: 'Project lead' }] : []),
  ...coLeads.value.map(m => ({ user: m, role: owner.value ? 'Co-lead' : 'Project lead' }))
]);
const promotable = computed(() => {
  const leadIds = new Set(people.value.map(p => p.user.id));
  return interested.value.filter(u => !leadIds.has(u.id));
});

// ── Permissions ──
const isGardenManager = (garden) => (garden.managers || []).some(m => (m.id || m) === user.value?.id);
const isVolunteer = (garden) => (garden.volunteers || []).some(v => (v.id || v) === user.value?.id);
const isProjectManager = computed(() => managers.value.some(m => (m.id || m) === user.value?.id));
const isCreator = computed(() => !!owner.value && owner.value.id === user.value?.id);
// Project leads: the owner (whoever pitched it), its managers, and admins.
const isLead = computed(() =>
  !!user.value && (authStore.isAdmin || isProjectManager.value || isCreator.value)
);

// ── Garden ──
const garden = computed(() => {
  const g = current.value?.garden;
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
// Gardens a lead can move the project to (the ones they manage or volunteer at).
const gardenOptions = computed(() => {
  const list = Array.isArray(gardens.value) ? gardens.value.filter(g => isGardenManager(g) || isVolunteer(g)) : [];
  if (garden.value && !list.some(g => g.id === garden.value.id)) list.unshift(garden.value);
  return list;
});

// ── Draft (edit mode) ──
const editing = ref(false);
const savedNotice = ref(false);
const isSaving = ref(false);
const isUploading = ref(false);
const showPhotos = ref(false);
const showLocation = ref(false);
const titleError = ref(false);
const draft = ref(null);
let snapshot = '';

const toDraft = (p) => ({
  title: p.title || '',
  category: p.category || 'Community',
  short_description: p.short_description || '',
  description: p.description || '',
  garden: garden.value?.id ?? null,
  hero_image: p.hero_image || null,
  featured_gallery: Array.isArray(p.featured_gallery) ? [...p.featured_gallery] : [],
  location: (p.latitude != null && p.longitude != null)
    ? { latitude: p.latitude, longitude: p.longitude }
    : null
});

const isDirty = computed(() => editing.value && !!draft.value && JSON.stringify(draft.value) !== snapshot);

const startEdit = () => {
  draft.value = toDraft(current.value);
  snapshot = JSON.stringify(draft.value);
  titleError.value = false;
  savedNotice.value = false;
  showPhotos.value = false;
  editing.value = true;
};

const cancelEdit = () => {
  if (isDirty.value && !window.confirm('Discard your changes to this project?')) return;
  editing.value = false;
  draft.value = null;
};

// What the page shows: the draft while editing, the saved project otherwise.
const shown = computed(() => (editing.value && draft.value) ? draft.value : current.value || {});

const buildFromProject = (p) => {
  managers.value = Array.isArray(p.managers) ? [...p.managers] : [];
  interested.value = Array.isArray(p.interested) ? [...p.interested] : [];
};

// Pick up a role changed in Strapi since login, so admins get lead access.
authStore.refreshRole();

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
    buildFromProject(p);
  })
  .catch(() => { /* store sets project.error */ });

const save = async () => {
  const d = draft.value;
  if (!d.title.trim()) {
    titleError.value = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  isSaving.value = true;
  try {
    await projectsStore.update(documentId.value, {
      title: d.title.trim(),
      category: d.category,
      short_description: d.short_description.trim(),
      description: d.description,
      garden: d.garden || null,
      hero_image: d.hero_image || d.featured_gallery[0] || null,
      featured_gallery: d.featured_gallery,
      latitude: d.location?.latitude ?? null,
      longitude: d.location?.longitude ?? null
    });
    const refreshed = await projectsStore.findByDocumentId(documentId.value);
    if (refreshed) buildFromProject(refreshed);
    editing.value = false;
    draft.value = null;
    savedNotice.value = true;
  } catch (err) {
    alertStore.error('Could not save the project. Please try again.');
  } finally {
    isSaving.value = false;
  }
};

// Leaving with unsaved edits needs a guard, in-app and on tab close.
onBeforeRouteLeave(() => {
  if (isDirty.value && !window.confirm('You have unsaved changes to this project. Leave anyway?')) return false;
  return true;
});
const onBeforeUnload = (e) => {
  if (!isDirty.value) return;
  e.preventDefault();
  e.returnValue = '';
};
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload));

// ── Photos ──
const coverInput = ref(null);
const galleryInput = ref(null);

const imageUrl = (img, size = 'large') => apiUrl(
  img?.formats?.[size]?.url || img?.formats?.medium?.url || img?.formats?.small?.url || img?.url
);
const heroUrl = computed(() => imageUrl(shown.value.hero_image || shown.value.featured_gallery?.[0]));
const galleryCount = computed(() => (shown.value.featured_gallery || []).length);

const uploadImages = async (fileList) => {
  const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
  const uploaded = [];
  if (!files.length) return uploaded;
  isUploading.value = true;
  try {
    for (const file of files) {
      const fd = new FormData();
      fd.append('files', file);
      const img = await projectsStore.uploadImage(fd);
      if (img?.id) uploaded.push(img);
    }
  } catch (err) {
    // store surfaces its own error alert
  } finally {
    isUploading.value = false;
  }
  return uploaded;
};

const onCoverPicked = async (e) => {
  const [img] = await uploadImages(e.target.files);
  e.target.value = '';
  if (!img) return;
  draft.value.hero_image = img;
  draft.value.featured_gallery = [img, ...draft.value.featured_gallery];
};

const onGalleryPicked = async (e) => {
  const imgs = await uploadImages(e.target.files);
  e.target.value = '';
  if (imgs.length) draft.value.featured_gallery = [...draft.value.featured_gallery, ...imgs];
};

const onHeroDrop = async (e) => {
  if (!editing.value) return;
  const [img] = await uploadImages(e.dataTransfer?.files);
  if (!img) return;
  draft.value.hero_image = img;
  draft.value.featured_gallery = [img, ...draft.value.featured_gallery];
};

const makeCover = (img) => { draft.value.hero_image = img; };
const removePhoto = (img) => {
  draft.value.featured_gallery = draft.value.featured_gallery.filter(p => p.id !== img.id);
  if (draft.value.hero_image?.id === img.id) draft.value.hero_image = draft.value.featured_gallery[0] || null;
};
const isCover = (img) => (draft.value?.hero_image?.id ?? draft.value?.featured_gallery?.[0]?.id) === img.id;

// Photos beyond the cover, shown to everyone below the volunteer days.
const extraPhotos = computed(() => {
  const coverId = current.value?.hero_image?.id ?? current.value?.featured_gallery?.[0]?.id;
  return (current.value?.featured_gallery || []).filter(img => img.id !== coverId);
});

// Empty hero: a category-tinted dot pattern with the category as a big word.
const HERO_TINTS = {
  planting:       { bg: '#dcf5e3', dot: '#86efac', word: '#86efac' },
  infrastructure: { bg: '#fdeedb', dot: '#fdc98f', word: '#fed7aa' },
  community:      { bg: '#dbf0fb', dot: '#8fd3f5', word: '#a9dcf5' },
  art:            { bg: '#fde4d0', dot: '#fbb37c', word: '#fdc49b' },
  event:          { bg: '#fdf4d3', dot: '#f9d86b', word: '#fbe39a' },
  education:      { bg: '#d5f3ef', dot: '#7fd8cc', word: '#a3e4db' }
};
const heroTint = computed(() => HERO_TINTS[String(shown.value.category || '').toLowerCase()] || HERO_TINTS.community);
const heroStyle = computed(() => (heroUrl.value
  ? { backgroundImage: `url(${heroUrl.value})` }
  : {
      backgroundColor: heroTint.value.bg,
      backgroundImage: `radial-gradient(circle, ${heroTint.value.dot} 0 2.5px, transparent 3px)`,
      backgroundSize: '22px 22px'
    }));

// ── Status ──
const reviewStatus = computed(() => normalizeReviewStatus(current.value?.review_status));
const isApproved = computed(() => reviewStatus.value === 'APPROVED');
const lifeStage = computed(() => resolveProjectStatus(current.value));

const setReviewStatus = async (status) => {
  if (reviewing.value || status === reviewStatus.value) return;
  reviewing.value = true;
  try {
    await projectsStore.review(current.value.id, status);
    alertStore.success(
      status === 'APPROVED'
        ? 'Project approved. It is now visible to the public.'
        : `Project marked ${projectReviewLabel(status).toLowerCase()}.`
    );
  } catch (err) {
    alertStore.error('Could not update the review status. Please try again.');
  } finally {
    reviewing.value = false;
  }
};

// ── Byline ──
const createdOn = computed(() => {
  const d = current.value?.createdAt ? new Date(current.value.createdAt) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
});

const renderedDescription = computed(() => (current.value?.description ? md.render(current.value.description) : ''));

// ── Interest ──
const isInterested = computed(() => interested.value.some(u => (u.id || u) === user.value?.id));
const interestStack = computed(() => interested.value.slice(0, 4));
const interestOverflow = computed(() => Math.max(0, interested.value.length - 4));
const interestLine = computed(() => {
  const others = interested.value.length - (isInterested.value ? 1 : 0);
  const noun = others === 1 ? 'neighbor' : 'neighbors';
  if (isInterested.value) return others ? `You and ${others} ${noun} are interested` : "You're interested";
  if (!others) return isLead.value ? 'No one has said they\'re interested yet' : 'Be the first to say you\'re interested';
  return `${others} ${noun} ${others === 1 ? 'is' : 'are'} interested`;
});

const toggleInterest = async () => {
  if (togglingInterest.value) return;
  togglingInterest.value = true;
  try {
    // Patched by the store; re-fetching would blank the page.
    await projectsStore.toggleInterest(current.value.id);
    interested.value = Array.isArray(current.value.interested) ? [...current.value.interested] : [];
  } catch (e) {
    // store surfaces its own error alert
  } finally {
    togglingInterest.value = false;
  }
};

const publicUrl = computed(() => {
  const slug = garden.value?.slug;
  if (!slug || !current.value?.slug) return '';
  return `/gardens/${slug}/p/${current.value.slug}`;
});

const copyLink = async () => {
  const url = `${window.location.origin}${publicUrl.value || route.fullPath}`;
  try {
    await navigator.clipboard.writeText(url);
    alertStore.success('Link copied.');
  } catch (e) {
    alertStore.error('Could not copy the link.');
  }
};

// Persists immediately, independent of the page's Save.
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
    alertStore.error('Could not add this lead. Please try again.');
  } finally {
    promotingId.value = null;
  }
};

// ── Volunteer days ──
const showPast = ref(false);
const unlinkingId = ref(null);
const linkedEvents = computed(() =>
  (current.value?.related_events || [])
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
const eventMonth = (e) => (e.start ? e.start.toLocaleDateString(undefined, { month: 'short' }).toUpperCase() : '—');
const eventDay = (e) => (e.start ? e.start.getDate() : '?');
const eventWhen = (e) => {
  if (!e.start) return 'Date to be announced';
  const day = e.start.toLocaleDateString(undefined, { weekday: 'long' });
  const time = e.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return [day, e.endText ? `${time} – ${e.endText}` : time, garden.value?.title].filter(Boolean).join(' · ');
};
const eventGoing = (e) => {
  const n = Array.isArray(e.confirmed) ? e.confirmed.length : 0;
  return n ? `${n} going` : '';
};

// Unlinking saves right away, like posting an update would; it isn't held
// for the page-level Save.
const unlink = async (e) => {
  if (unlinkingId.value) return;
  unlinkingId.value = e.id;
  const remaining = (current.value.related_events || []).filter(x => x.id !== e.id);
  try {
    await projectsStore.update(documentId.value, { related_events: remaining.map(x => x.id) });
    current.value.related_events = remaining;
  } catch (err) {
    alertStore.error('Could not unlink this volunteer day. Please try again.');
  } finally {
    unlinkingId.value = null;
  }
};

// ── Location ──
const location = computed(() => {
  const loc = editing.value ? draft.value?.location : (
    current.value?.latitude != null && current.value?.longitude != null
      ? { latitude: current.value.latitude, longitude: current.value.longitude }
      : null
  );
  if (loc) return loc;
  // No pin yet: fall back to the garden itself.
  return garden.value?.latitude != null && garden.value?.longitude != null
    ? { latitude: garden.value.latitude, longitude: garden.value.longitude }
    : null;
});
const hasOwnPin = computed(() => editing.value ? !!draft.value?.location : current.value?.latitude != null);
const mapsUrl = computed(() => (location.value
  ? `https://www.google.com/maps/search/?api=1&query=${location.value.latitude},${location.value.longitude}`
  : ''));
const onLocationSaved = (loc) => { draft.value.location = loc; };
</script>

<template>
  <ManageLayout>
    <div class="pp">
      <div v-if="!current && project.loading" class="pp__state">Loading project…</div>
      <div v-else-if="!current && project.error" class="pp__state">
        Project not found.
        <a href="/manage/projects" class="pp__back">Back to projects</a>
      </div>

      <template v-else-if="current">
        <!-- Edit bar -->
        <div v-if="editing" class="pp-editbar">
          <span class="pp-editbar__dot" aria-hidden="true"></span>
          <div class="pp-editbar__text">
            <span class="pp-editbar__title">Editing {{ current.title }}</span>
            <span class="pp-editbar__sub">Volunteers won't see changes until you save. Edits are made in place on each card.</span>
          </div>
          <button type="button" class="pp-editbar__cancel" :disabled="isSaving" @click="cancelEdit">Cancel</button>
          <button type="button" class="pp-editbar__save" :disabled="isSaving || isUploading" @click="save">
            {{ isSaving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
        <div v-else-if="savedNotice" class="pp-saved" role="status">
          Changes saved. This is what volunteers see now.
          <button type="button" class="pp-saved__x" aria-label="Dismiss" @click="savedNotice = false">×</button>
        </div>

        <router-link to="/manage/projects" class="pp__back">← All projects</router-link>

        <!-- Hero -->
        <div
          class="pp-hero"
          :class="{ 'pp-hero--empty': !heroUrl, 'pp-hero--editing': editing }"
          :style="heroStyle"
          @dragover.prevent
          @drop.prevent="onHeroDrop"
        >
          <div v-if="heroUrl" class="pp-hero__shade" aria-hidden="true"></div>
          <span v-else class="pp-hero__word" :style="{ color: heroTint.word }" aria-hidden="true">{{ shown.category }}</span>
          <div class="pp-hero__flags">
            <span v-if="shown.category" :class="getProjectCategoryOverlayClasses(shown.category)">{{ shown.category }}</span>
            <span v-if="lifeStage" :class="getProjectStatusOverlayClasses(lifeStage)">{{ lifeStage }}</span>
            <span v-if="!isApproved" class="pp-hero__review">{{ projectReviewLabel(reviewStatus) }}</span>
          </div>

          <template v-if="editing">
            <div class="pp-hero__dash" aria-hidden="true"></div>
            <div v-if="heroUrl" class="pp-hero__actions">
              <button type="button" class="pp-hero__ghost" @click="showPhotos = !showPhotos">
                Manage photos · {{ galleryCount }}
              </button>
              <button type="button" class="pp-hero__solid" :disabled="isUploading" @click="coverInput?.click()">
                {{ isUploading ? 'Uploading…' : 'Change cover photo' }}
              </button>
            </div>
            <div v-else class="pp-hero__empty-cta">
              <button type="button" class="pp-hero__add" :disabled="isUploading" @click="coverInput?.click()">
                {{ isUploading ? 'Uploading…' : 'Add a cover photo' }}
              </button>
              <span class="pp-hero__add-hint">or drop an image here · wide shots crop best</span>
            </div>
            <input ref="coverInput" type="file" accept="image/*" class="hidden" @change="onCoverPicked" />
          </template>
        </div>

        <!-- Photo manager (edit mode) -->
        <div v-if="editing && showPhotos" class="pp-photos">
          <div v-for="img in draft.featured_gallery" :key="img.id" class="pp-photos__item">
            <img :src="imageUrl(img, 'small')" alt="" />
            <span v-if="isCover(img)" class="pp-photos__cover">Cover</span>
            <div class="pp-photos__tools">
              <button v-if="!isCover(img)" type="button" @click="makeCover(img)">Make cover</button>
              <button type="button" @click="removePhoto(img)">Remove</button>
            </div>
          </div>
          <button type="button" class="pp-photos__add" :disabled="isUploading" @click="galleryInput?.click()">
            {{ isUploading ? 'Uploading…' : '+ Add photos' }}
          </button>
          <input ref="galleryInput" type="file" accept="image/*" multiple class="hidden" @change="onGalleryPicked" />
        </div>

        <!-- Title row -->
        <div class="pp-head">
          <div class="pp-head__main">
            <h1 v-if="!editing" class="pp-title">{{ current.title }}</h1>
            <template v-else>
              <input
                v-model="draft.title"
                class="pp-title pp-title--input"
                :class="{ 'is-error': titleError }"
                aria-label="Project title"
                @input="titleError = false"
              />
              <p v-if="titleError" class="pp-error">Give the project a title.</p>
              <div class="pp-cats" role="radiogroup" aria-label="Category">
                <span class="pp-eyebrow">Category</span>
                <button
                  v-for="opt in projectCategoryOptions"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="draft.category === opt.value"
                  :class="[getProjectCategoryOverlayClasses(opt.value), 'pp-cat', { 'is-on': draft.category === opt.value }]"
                  @click="draft.category = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </template>

            <div class="pp-byline">
              <span v-if="owner" class="pp-avatar pp-avatar--sm" :style="avatarStyle(owner)">{{ initials(owner) }}</span>
              <span>
                Pitched by <b>{{ owner ? userName(owner) : 'a steward' }}</b>
                <template v-if="garden">
                  at <router-link v-if="garden.slug" :to="`/gardens/${garden.slug}`" class="pp-link">{{ garden.title }}</router-link><template v-else>{{ garden.title }}</template>
                </template>
                <template v-if="createdOn"> · {{ createdOn }}</template>
              </span>
            </div>
          </div>

          <div v-if="isLead && !editing" class="pp-head__actions">
            <label class="pp-review">
              Review
              <select
                :value="reviewStatus"
                :disabled="reviewing"
                class="pp-review__select"
                @change="setReviewStatus($event.target.value)"
              >
                <option v-for="opt in projectReviewOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </label>
            <button type="button" class="pp-btn" @click="startEdit">Edit project</button>
          </div>
        </div>

        <div class="pp-grid">
          <div class="pp-main">
            <!-- Interest -->
            <div v-if="!editing" class="pp-card pp-interest">
              <div v-if="interested.length" class="pp-stack" aria-hidden="true">
                <span v-for="p in interestStack" :key="p.id" class="pp-avatar" :style="avatarStyle(p)">{{ initials(p) }}</span>
                <span v-if="interestOverflow" class="pp-avatar pp-avatar--more">+{{ interestOverflow }}</span>
              </div>
              <div class="pp-interest__text">
                <span class="pp-interest__line">{{ interestLine }}</span>
                <span v-if="isLead && !interested.length" class="pp-interest__sub">
                  Share this project to find helpers.
                  <button type="button" class="pp-link pp-linkbtn" @click="copyLink">Copy link</button>
                </span>
                <span v-else class="pp-interest__sub">Interested neighbors hear first when a volunteer day is posted.</span>
              </div>
              <button
                type="button"
                class="pp-interest__btn"
                :class="{ 'is-on': isInterested }"
                :disabled="togglingInterest"
                @click="toggleInterest"
              >
                {{ isInterested ? "You're in" : "I'm interested" }}
              </button>
            </div>

            <!-- About -->
            <section class="pp-card">
              <h2 class="pp-card__title">About this project</h2>
              <template v-if="!editing">
                <p v-if="current.short_description" class="pp-lede">{{ current.short_description }}</p>
                <div v-if="renderedDescription" class="pp-prose" v-html="renderedDescription"></div>
                <p v-if="!current.short_description && !renderedDescription" class="pp-empty">No description yet.</p>
              </template>
              <template v-else>
                <textarea
                  v-model="draft.short_description"
                  class="pp-textarea"
                  rows="4"
                  maxlength="350"
                  placeholder="What is this project, and why does it matter?"
                  aria-label="Summary"
                ></textarea>
                <span class="pp-count">{{ draft.short_description.length }}/350</span>
                <label class="pp-eyebrow" for="pp-more">More detail (optional, Markdown)</label>
                <textarea
                  id="pp-more"
                  v-model="draft.description"
                  class="pp-textarea pp-textarea--long"
                  rows="6"
                  placeholder="Plans, materials, what help is needed…"
                ></textarea>
              </template>
            </section>

            <!-- Volunteer days -->
            <section class="pp-card">
              <div class="pp-card__head">
                <h2 class="pp-card__title">Upcoming volunteer days</h2>
                <router-link
                  v-if="editing && canManageGarden && garden?.slug"
                  :to="`/manage/gardens/${garden.slug}`"
                  class="pp-dashbtn"
                >
                  + Link a volunteer day
                </router-link>
              </div>

              <ul v-if="upcomingEvents.length" class="pp-days">
                <li v-for="e in upcomingEvents" :key="e.id" class="pp-day">
                  <div class="pp-day__date">
                    <span class="pp-day__mon">{{ eventMonth(e) }}</span>
                    <span class="pp-day__num">{{ eventDay(e) }}</span>
                  </div>
                  <div class="pp-day__body">
                    <router-link :to="`/d/${e.id}`" class="pp-day__title">{{ e.title }}</router-link>
                    <span class="pp-day__when">{{ eventWhen(e) }}</span>
                    <span v-if="e.canceled" class="pp-day__going pp-day__going--off">Canceled</span>
                    <span v-else-if="eventGoing(e)" class="pp-day__going">{{ eventGoing(e) }}</span>
                  </div>
                  <router-link v-if="!editing && !e.canceled" :to="`/d/${e.id}`" class="pp-outline">RSVP</router-link>
                  <button
                    v-if="editing"
                    type="button"
                    class="pp-unlink"
                    :disabled="unlinkingId === e.id"
                    @click="unlink(e)"
                  >
                    {{ unlinkingId === e.id ? 'Unlinking…' : 'Unlink' }}
                  </button>
                </li>
              </ul>
              <p v-else-if="isLead" class="pp-empty">
                No volunteer days linked.
                <template v-if="canManageGarden && garden?.slug">
                  <router-link :to="`/manage/gardens/${garden.slug}`" class="pp-link">Link a volunteer day</router-link>
                  from its event editor.
                </template>
              </p>
              <p v-else class="pp-empty pp-empty--warm">
                No volunteer days yet. Tap <b>I'm interested</b> and we'll let you know when one is posted.
              </p>

              <template v-if="pastEvents.length">
                <button type="button" class="pp-more" @click="showPast = !showPast">
                  {{ showPast ? 'Hide past days' : `Past days (${pastEvents.length})` }}
                </button>
                <ul v-if="showPast" class="pp-past">
                  <li v-for="e in pastEvents" :key="e.id">
                    <router-link :to="`/d/${e.id}`" class="pp-link">{{ e.title }}</router-link>
                    <span class="pp-past__when"> · {{ e.start ? e.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unknown' }}</span>
                    <button
                      v-if="editing"
                      type="button"
                      class="pp-unlink pp-unlink--sm"
                      :disabled="unlinkingId === e.id"
                      @click="unlink(e)"
                    >
                      Unlink
                    </button>
                  </li>
                </ul>
              </template>
            </section>

            <!-- Photos beyond the cover -->
            <section v-if="!editing && extraPhotos.length" class="pp-card">
              <h2 class="pp-card__title">Photos</h2>
              <div class="pp-gallery">
                <img v-for="img in extraPhotos" :key="img.id" :src="imageUrl(img, 'small')" alt="" />
              </div>
            </section>
          </div>

          <aside class="pp-side">
            <!-- Location -->
            <section v-if="location || isLead" class="pp-card pp-card--side">
              <div class="pp-card__head">
                <h2 class="pp-card__title pp-card__title--side">Location</h2>
                <button v-if="editing" type="button" class="pp-link pp-linkbtn" @click="showLocation = true">Set location</button>
              </div>
              <div v-if="location" class="pp-map">
                <StaticPinMap :latitude="location.latitude" :longitude="location.longitude" />
                <button v-if="editing" type="button" class="pp-map__move" @click="showLocation = true">Move pin</button>
              </div>
              <div v-else class="pp-map pp-map--empty">
                <button v-if="editing" type="button" class="pp-map__move pp-map__move--empty" @click="showLocation = true">Drop a pin</button>
                <span v-else class="pp-empty">No meeting spot yet.</span>
              </div>
              <div class="pp-place">
                <span class="pp-place__name">{{ hasOwnPin ? `At ${garden?.title || 'the project site'}` : (garden?.title || 'No location set') }}</span>
                <span v-if="!hasOwnPin && location" class="pp-place__sub">Pin shows the garden. Leads can set the exact meeting spot.</span>
              </div>
              <a v-if="!editing && mapsUrl" :href="mapsUrl" target="_blank" rel="noopener" class="pp-link">Open in Maps →</a>
            </section>

            <!-- People -->
            <section class="pp-card pp-card--side">
              <div class="pp-card__head">
                <h2 class="pp-card__title pp-card__title--side">People</h2>
                <button
                  v-if="editing"
                  type="button"
                  class="pp-link pp-linkbtn"
                  :aria-expanded="showAddLead"
                  @click="showAddLead = !showAddLead"
                >
                  {{ showAddLead ? 'Done' : '+ Add lead' }}
                </button>
              </div>
              <ul v-if="people.length" class="pp-people">
                <li v-for="p in people" :key="p.user.id" class="pp-person">
                  <span class="pp-avatar" :style="avatarStyle(p.user)">{{ initials(p.user) }}</span>
                  <span class="pp-person__body">
                    <span class="pp-person__name">{{ userName(p.user) }}</span>
                    <span class="pp-person__role">{{ p.role }}</span>
                  </span>
                </li>
              </ul>
              <p v-else-if="isLead" class="pp-empty">No leads yet. Add one from the people who are interested.</p>
              <p v-else class="pp-empty pp-empty--warm">
                Looking for a project lead.
                <button v-if="!isInterested" type="button" class="pp-link pp-linkbtn" @click="toggleInterest">Offer to lead</button>
              </p>

              <div v-if="editing && showAddLead" class="pp-addlead">
                <span class="pp-eyebrow">From people who are interested</span>
                <ul v-if="promotable.length" class="pp-people">
                  <li v-for="p in promotable" :key="p.id" class="pp-person">
                    <span class="pp-avatar" :style="avatarStyle(p)">{{ initials(p) }}</span>
                    <span class="pp-person__body"><span class="pp-person__name">{{ userName(p) }}</span></span>
                    <button type="button" class="pp-promote" :disabled="promotingId === p.id" @click="promote(p)">
                      {{ promotingId === p.id ? 'Adding…' : 'Make lead' }}
                    </button>
                  </li>
                </ul>
                <p v-else class="pp-empty">No one else has said they're interested yet.</p>
              </div>

              <div v-if="current.volunteer_count" class="pp-people__foot">
                {{ current.volunteer_count }} {{ current.volunteer_count === 1 ? 'volunteer has' : 'volunteers have' }} worked on this project
              </div>
            </section>

            <!-- Garden -->
            <section class="pp-card pp-card--side pp-garden">
              <template v-if="!editing">
                <template v-if="garden">
                  <span class="pp-garden__thumb" :style="gardenThumb ? { backgroundImage: `url(${gardenThumb})` } : null"></span>
                  <div class="pp-garden__body">
                    <span class="pp-eyebrow pp-eyebrow--muted">Garden</span>
                    <router-link v-if="garden.slug" :to="`/gardens/${garden.slug}`" class="pp-garden__title">{{ garden.title }}</router-link>
                    <span v-else class="pp-garden__title">{{ garden.title }}</span>
                    <span v-if="garden.blurb" class="pp-garden__blurb">{{ garden.blurb }}</span>
                    <router-link v-if="canManageGarden && garden.slug" :to="`/manage/gardens/${garden.slug}`" class="pp-link pp-garden__manage">Manage garden →</router-link>
                  </div>
                </template>
                <div v-else class="pp-garden__body">
                  <span class="pp-eyebrow pp-eyebrow--muted">Garden</span>
                  <span class="pp-empty">Independent, not part of a garden.</span>
                </div>
              </template>
              <div v-else class="pp-garden__body pp-garden__body--full">
                <label class="pp-eyebrow" for="pp-garden">Garden</label>
                <select id="pp-garden" v-model="draft.garden" class="pp-select">
                  <option :value="null">Independent (no garden)</option>
                  <option v-for="g in gardenOptions" :key="g.id" :value="g.id">{{ g.title }}</option>
                </select>
              </div>
            </section>

            <a v-if="publicUrl && isApproved && !editing" :href="publicUrl" class="pp-link pp-public" target="_blank" rel="noopener">
              View public page ↗
            </a>
          </aside>
        </div>

        <ProjectLocationModal
          v-if="editing"
          v-model="showLocation"
          :location="draft.location"
          :garden="garden"
          @save="onLocationSaved"
        />
      </template>
    </div>
  </ManageLayout>
</template>

<style scoped>
.pp {
  min-width: 0;
  container: pp / inline-size;
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: #1a1a1a;
}

.pp button { -webkit-text-fill-color: currentColor; font-family: inherit; }

.pp__state {
  color: #6b7280;
  font-style: italic;
  padding: 3rem 1rem;
  text-align: center;
}

.pp__back {
  align-self: flex-start;
  color: #064e3b;
  font-weight: 700;
  font-size: 15px;
  text-decoration: none;
}
.pp__back:hover { color: #376451; text-decoration: underline; }

.pp-link {
  color: #064e3b;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
}
.pp-link:hover { color: #376451; text-decoration: underline; }

.pp-linkbtn {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.pp-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #064e3b;
}
.pp-eyebrow--muted { color: #6c8a6a; }

/* ── Edit bar ── */
.pp-editbar {
  position: sticky;
  top: 0;
  z-index: 15;
  background: #064e3b;
  color: #f7f1e3;
  border-radius: 12px;
  padding: 12px 14px 12px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 6px 18px rgba(6, 78, 59, 0.25);
}

.pp-editbar__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: #F9E2D1;
}

.pp-editbar__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pp-editbar__title { font-weight: 700; font-size: 15px; }
.pp-editbar__sub { font-size: 13px; color: #c8dbbf; }

.pp-editbar__cancel,
.pp-editbar__save {
  flex: none;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.pp-editbar__cancel {
  background: transparent;
  color: #f7f1e3;
  border: 1px solid #6c8a6a;
  padding: 9px 18px;
}

.pp-editbar__save {
  background: #f7f1e3;
  color: #064e3b;
  border: none;
  padding: 10px 20px;
}

.pp-editbar__save:disabled,
.pp-editbar__cancel:disabled { opacity: 0.6; cursor: not-allowed; }

.pp-saved {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #c8dbbf;
  color: #064e3b;
  border-radius: 12px;
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 700;
}

.pp-saved__x {
  margin-left: auto;
  background: none;
  border: 0;
  font-size: 18px;
  line-height: 1;
  color: #064e3b;
  cursor: pointer;
}

/* ── Hero ── */
.pp-hero {
  position: relative;
  aspect-ratio: 3 / 1;
  border-radius: 16px;
  overflow: hidden;
  background-color: #e4dccb;
  background-size: cover;
  background-position: center 40%;
}

.pp-hero--empty { background-size: 22px 22px; background-position: 0 0; }

.pp-hero__shade {
  position: absolute;
  inset: 0 0 auto 0;
  height: 45%;
  background: linear-gradient(rgba(20, 40, 26, 0.45), transparent);
}

.pp-hero__word {
  position: absolute;
  right: 16px;
  bottom: -0.22em;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(56px, 11cqi, 120px);
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
}

.pp-hero__flags {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 5px;
  border-radius: 9999px;
  background: rgba(20, 40, 26, 0.35);
  backdrop-filter: blur(8px);
}

.pp-hero__review {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  background: #f7f1e3;
  color: #4b5563;
}

.pp-hero__dash {
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(247, 241, 227, 0.85);
  border-radius: 10px;
  pointer-events: none;
}

.pp-hero--empty .pp-hero__dash { border-color: #6c8a6a; }

.pp-hero__actions {
  position: absolute;
  right: 22px;
  bottom: 22px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.pp-hero__ghost,
.pp-hero__solid {
  border: none;
  border-radius: 9999px;
  padding: 10px 16px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

.pp-hero__ghost {
  background: rgba(20, 40, 26, 0.55);
  backdrop-filter: blur(8px);
  color: #f7f1e3;
}

.pp-hero__solid {
  background: #f7f1e3;
  color: #064e3b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.pp-hero__empty-cta {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: rgba(247, 241, 227, 0.92);
  padding: 14px 22px;
  border-radius: 12px;
  max-width: calc(100% - 48px);
  text-align: center;
}

.pp-hero__add {
  background: #064e3b;
  color: #fff;
  border: none;
  font-weight: 700;
  font-size: 14px;
  padding: 9px 18px;
  border-radius: 9999px;
  cursor: pointer;
}

.pp-hero__add-hint { font-size: 12px; color: #4b5563; }

.pp-hero__solid:disabled,
.pp-hero__add:disabled { opacity: 0.6; cursor: wait; }

/* ── Photo manager ── */
.pp-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px;
  border: 1.5px dashed #8aa37c;
  border-radius: 12px;
  background: #fdfbf6;
}

.pp-photos__item {
  position: relative;
  width: 140px;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  background: #e4dccb;
}

.pp-photos__item img { width: 100%; height: 100%; object-fit: cover; }

.pp-photos__cover {
  position: absolute;
  top: 6px;
  left: 6px;
  background: #064e3b;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
}

.pp-photos__tools {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  padding: 6px;
  background: linear-gradient(transparent, rgba(20, 40, 26, 0.6));
}

.pp-photos__tools button {
  background: #f7f1e3;
  color: #064e3b;
  border: none;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  cursor: pointer;
}

.pp-photos__add {
  width: 140px;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  border: 1.5px dashed #8aa37c;
  background: transparent;
  color: #064e3b;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

/* ── Title row ── */
.pp-head {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.pp-head__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pp-title {
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: clamp(34px, 5cqi, 52px);
  line-height: 1.05;
  color: #376451;
}

.pp-title--input {
  background: #fff;
  border: 1.5px dashed #8aa37c;
  border-radius: 10px;
  padding: 2px 12px;
  margin-left: -13px;
  width: calc(100% + 13px);
  box-sizing: border-box;
  outline: none;
}
.pp-title--input:focus { border-style: solid; border-color: #064e3b; }
.pp-title--input.is-error { border-color: #dc2626; }

.pp-error { margin: -6px 0 0; color: #b91c1c; font-size: 14px; font-weight: 700; }

.pp-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.pp-cats .pp-eyebrow { margin-right: 6px; }

.pp-cat {
  border: none;
  cursor: pointer;
  font-size: 13px;
  padding: 6px 12px;
  opacity: 0.55;
  box-shadow: none;
  transition: opacity 0.15s ease;
}
.pp-cat:hover { opacity: 0.85; }
.pp-cat.is-on {
  opacity: 1;
  box-shadow: 0 0 0 2px #f7f1e3, 0 0 0 4px #064e3b;
}

.pp-byline {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  color: #4b5563;
}
.pp-byline b { color: #1a1a1a; }
.pp-byline .pp-link { font-size: inherit; }

.pp-head__actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
}

.pp-review {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  border: 1px solid #c3cdb8;
  border-radius: 9999px;
  padding: 4px 6px 4px 12px;
  background: #fff;
  font-size: 13px;
  color: #4b5563;
  margin: 0;
}

.pp-review__select {
  border: none;
  background: #c8dbbf;
  color: #064e3b;
  font-weight: 700;
  font-size: 13px;
  border-radius: 9999px;
  padding: 5px 8px;
  outline: none;
  cursor: pointer;
}

.pp-btn {
  background: #064e3b;
  color: #fff;
  border: none;
  border-radius: 9999px;
  padding: 10px 20px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  white-space: nowrap;
}
.pp-btn:hover { background: #376451; }

/* ── Layout ── */
.pp-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;
}

.pp-main,
.pp-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.pp-card {
  background: #fff;
  border: 1px solid #dcd3c0;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pp-card--side { padding: 20px; }

.pp-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pp-card__title {
  flex: 1;
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 22px;
  font-weight: 700;
  color: #376451;
}
.pp-card__title--side { font-size: 20px; }

.pp-lede {
  margin: 0;
  font-size: 16px;
  line-height: 1.65;
  max-width: 68ch;
  white-space: pre-line;
}

.pp-prose { font-size: 16px; line-height: 1.65; max-width: 68ch; }
.pp-prose :deep(p) { margin: 0 0 0.85rem; }
.pp-prose :deep(ul),
.pp-prose :deep(ol) { margin: 0 0 0.85rem 1.2rem; list-style: revert; }
.pp-prose :deep(h1),
.pp-prose :deep(h2),
.pp-prose :deep(h3) { font-weight: 700; color: #376451; margin: 1.2rem 0 0.5rem; }
.pp-prose :deep(a) { color: #064e3b; text-decoration: underline; }
.pp-prose :deep(img) { max-width: 100%; border-radius: 8px; }

.pp-empty { margin: 0; font-size: 14px; color: #4b5563; }
.pp-empty--warm { color: #1a1a1a; font-size: 15px; }

.pp-textarea {
  font-size: 16px;
  line-height: 1.65;
  color: #1a1a1a;
  border: 1.5px dashed #8aa37c;
  border-radius: 10px;
  padding: 10px 12px;
  min-height: 120px;
  resize: vertical;
  outline: none;
  background: #fdfbf6;
  font-family: inherit;
}
.pp-textarea:focus { border-style: solid; border-color: #064e3b; }
.pp-textarea--long { font-size: 15px; min-height: 140px; }

.pp-count { align-self: flex-end; margin-top: -8px; font-size: 12px; color: #6c8a6a; }

.pp-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}
.pp-gallery img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 10px;
}

/* ── Interest ── */
.pp-interest {
  flex-direction: row;
  align-items: center;
  gap: 20px;
  padding: 20px 24px;
}

.pp-stack { display: flex; padding-right: 10px; }
.pp-stack .pp-avatar { border: 3px solid #fff; margin-right: -10px; }

.pp-interest__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pp-interest__line { font-weight: 700; font-size: 16px; color: #064e3b; }
.pp-interest__sub { font-size: 14px; color: #4b5563; }

.pp-interest__btn {
  flex: none;
  background: #064e3b;
  color: #fff;
  border: 1.5px solid #064e3b;
  border-radius: 9999px;
  padding: 11px 22px;
  min-height: 44px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  white-space: nowrap;
}
.pp-interest__btn.is-on { background: #f3ece0; color: #064e3b; }
.pp-interest__btn:disabled { opacity: 0.6; cursor: wait; }

.pp-avatar {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  -webkit-text-fill-color: currentColor;
  box-sizing: border-box;
}
.pp-avatar--sm { width: 30px; height: 30px; font-size: 12px; }
.pp-avatar--more { background: #f3ece0; color: #376451; }

/* ── Volunteer days ── */
.pp-dashbtn {
  flex: none;
  border: 1.5px dashed #8aa37c;
  color: #064e3b;
  font-weight: 700;
  font-size: 14px;
  padding: 7px 14px;
  border-radius: 9999px;
  white-space: nowrap;
  text-decoration: none;
}
.pp-dashbtn:hover { background: #f3ece0; color: #064e3b; }

.pp-days {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pp-day {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px;
  border-radius: 12px;
  background: #f3ece0;
  margin: 0;
}

.pp-day__date {
  flex: none;
  width: 62px;
  height: 66px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #dcd3c0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pp-day__mon { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: #6c8a6a; }
.pp-day__num {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: 26px;
  color: #064e3b;
  line-height: 1;
}

.pp-day__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pp-day__title { font-weight: 700; font-size: 16px; color: #064e3b; text-decoration: none; }
.pp-day__title:hover { text-decoration: underline; color: #064e3b; }
.pp-day__when { font-size: 14px; color: #4b5563; }
.pp-day__going { font-size: 13px; font-weight: 700; color: #6c8a6a; }
.pp-day__going--off { color: #b91c1c; }

.pp-outline {
  flex: none;
  border: 1.5px solid #064e3b;
  color: #064e3b;
  font-weight: 700;
  font-size: 14px;
  padding: 8px 18px;
  border-radius: 9999px;
  white-space: nowrap;
  text-decoration: none;
}
.pp-outline:hover { background: #064e3b; color: #fff; }

.pp-unlink {
  flex: none;
  color: #4b5563;
  font-weight: 700;
  font-size: 13px;
  padding: 8px 12px;
  border: 1px solid #dcd3c0;
  border-radius: 9999px;
  background: #fff;
  white-space: nowrap;
  cursor: pointer;
}
.pp-unlink--sm { padding: 2px 10px; font-size: 12px; margin-left: 8px; }
.pp-unlink:disabled { opacity: 0.6; cursor: wait; }

.pp-more {
  align-self: flex-start;
  background: none;
  border: 0;
  padding: 0;
  color: #064e3b;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

.pp-past {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}
.pp-past li { margin: 0; }
.pp-past__when { color: #4b5563; }

/* ── Location ── */
.pp-map {
  position: relative;
  height: 150px;
  border-radius: 10px;
  overflow: hidden;
  background: #e9ecdc;
}

.pp-map--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pp-map__move {
  position: absolute;
  inset: 0;
  z-index: 500;
  border: 0;
  background: rgba(6, 78, 59, 0.45);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
}
.pp-map__move--empty { background: rgba(6, 78, 59, 0.2); color: #064e3b; }

.pp-place { display: flex; flex-direction: column; gap: 2px; }
.pp-place__name { font-weight: 700; font-size: 15px; color: #064e3b; }
.pp-place__sub { font-size: 13px; color: #4b5563; }

/* ── People ── */
.pp-people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pp-person {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.pp-person__body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pp-person__name {
  font-weight: 700;
  font-size: 15px;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pp-person__role { font-size: 13px; color: #4b5563; }

.pp-people__foot {
  border-top: 1px solid #e0d7c4;
  padding-top: 12px;
  font-size: 14px;
  color: #4b5563;
}

.pp-addlead {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1.5px dashed #8aa37c;
  border-radius: 10px;
  padding: 12px;
  background: #fdfbf6;
}

.pp-promote {
  flex: none;
  background: #fff;
  border: 1px solid #c3cdb8;
  color: #064e3b;
  font-size: 13px;
  font-weight: 700;
  border-radius: 9999px;
  padding: 5px 12px;
  cursor: pointer;
}
.pp-promote:disabled { opacity: 0.6; cursor: wait; }

/* ── Garden ── */
.pp-garden {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.pp-garden__thumb {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background-color: #c8dbbf;
  background-size: cover;
  background-position: center;
}

.pp-garden__body { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pp-garden__body--full { flex: 1; gap: 8px; }
.pp-garden__title { font-weight: 700; font-size: 15px; color: #064e3b; text-decoration: none; }
.pp-garden__title:hover { text-decoration: underline; color: #064e3b; }
.pp-garden__blurb {
  font-size: 13px;
  color: #4b5563;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pp-garden__manage { margin-top: 4px; font-size: 13px; }

.pp-select {
  width: 100%;
  background: #fff;
  border: 1.5px dashed #8aa37c;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 15px;
  color: #1a1a1a;
}

.pp-public { align-self: flex-start; }

/* ── Narrow: one column. The interest strip becomes a bar pinned to the
   bottom of the screen, so the main action stays in reach. ── */
@container pp (max-width: 900px) {
  .pp-grid { display: flex; flex-direction: column; gap: 18px; }
  .pp-main, .pp-side { display: contents; }

  .pp-head { flex-direction: column; gap: 12px; }
  .pp-head__actions { padding-top: 0; flex-wrap: wrap; }

  .pp-interest {
    order: 99;
    position: sticky;
    bottom: 0;
    z-index: 10;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 12px;
    background: #f7f1e3;
    border-color: #e0d7c4;
    box-shadow: 0 -6px 18px rgba(20, 40, 26, 0.08);
  }
  .pp-interest__sub { display: none; }
  .pp-interest__line { font-size: 13px; }
  .pp-interest__btn { padding: 11px 18px; font-size: 14px; }
  .pp-stack .pp-avatar { width: 32px; height: 32px; font-size: 11px; border-width: 2px; border-color: #f7f1e3; margin-right: -8px; }
  .pp-stack .pp-avatar:nth-child(n+4) { display: none; }
}

@container pp (max-width: 560px) {
  .pp-hero { aspect-ratio: 4 / 3; border-radius: 12px; }
  .pp-card { padding: 16px; }
  .pp-day { gap: 12px; padding: 12px; flex-wrap: wrap; }
  .pp-day__date { width: 52px; height: 56px; }
  .pp-day__num { font-size: 22px; }
  .pp-editbar { flex-wrap: wrap; gap: 10px; padding: 12px 14px; }
  .pp-editbar__sub { display: none; }
  .pp-editbar__text { flex-basis: calc(100% - 24px); }
  .pp-editbar__cancel { margin-left: auto; }
  .pp-photos__item, .pp-photos__add { width: calc(50% - 5px); }
}
</style>

<style>
/* Dark theme: keep the cream/forest identity, flip surfaces. */
html.dark .pp { color: #f4f1e4; }
html.dark .pp-card { background: #344a34; border-color: #3d4d36; }
html.dark .pp-title,
html.dark .pp-card__title { color: #c8dbbf; }
html.dark .pp-title--input,
html.dark .pp-textarea,
html.dark .pp-select { background: #2a3b2a; color: #f4f1e4; }
html.dark .pp-byline,
html.dark .pp-empty,
html.dark .pp-interest__sub,
html.dark .pp-day__when,
html.dark .pp-place__sub,
html.dark .pp-person__role,
html.dark .pp-garden__blurb,
html.dark .pp-people__foot,
html.dark .pp-past__when { color: #a0a8a0; }
html.dark .pp-byline b,
html.dark .pp-person__name,
html.dark .pp-empty--warm,
html.dark .pp-lede,
html.dark .pp-prose { color: #e6f0db; }
html.dark .pp-link,
html.dark .pp__back,
html.dark .pp-more,
html.dark .pp-eyebrow,
html.dark .pp-interest__line,
html.dark .pp-day__title,
html.dark .pp-place__name,
html.dark .pp-garden__title,
html.dark .pp-dashbtn { color: #c8dbbf; }
html.dark .pp-day { background: rgba(255, 255, 255, 0.05); }
html.dark .pp-day__date { background: #2a3b2a; border-color: #3d4d36; }
html.dark .pp-day__num { color: #e6f0db; }
html.dark .pp-outline { color: #c8dbbf; border-color: #c8dbbf; }
html.dark .pp-review { background: #2a3b2a; border-color: #56663b; color: #c2cbbb; }
html.dark .pp-stack .pp-avatar { border-color: #344a34; }
html.dark .pp-addlead,
html.dark .pp-photos { background: rgba(255, 255, 255, 0.04); }
html.dark .pp-people__foot { border-color: #3d4d36; }
@container pp (max-width: 900px) {
  html.dark .pp-interest { background: #2d3e26; border-color: #3d4d36; }
}
</style>
