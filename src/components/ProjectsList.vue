<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useProjectsStore, useEventStore, useAlertStore } from '@/stores';
import Project from '@/components/modals/Project.vue';
import ProjectReviewDrawer from '@/components/ProjectReviewDrawer.vue';
import LinkVolunteerDayModal from '@/components/modals/LinkVolunteerDayModal.vue';
import { normalizeReviewStatus, projectCategoryOptions } from '@/_config/GardenConfig';
import {
  categoryLook, imageStyle, hasPhoto, personName, firstName, initials, avatarStyle,
  timeAgo, daysWaiting, waitingLabel, shortDate, dayChip, reviewTab, stageOf, inGarden
} from '@/helpers/project-review';

/*
 * Manage › Projects (Claude Design "Projects Admin", boards 1a–1c).
 * Scan in the list, decide in the drawer: rows here carry no decision
 * buttons. A pending row opens ProjectReviewDrawer, deep-linked as
 * ?review=<documentId>. The parent (GardenDetail) loads the projects so the
 * sidebar can show the pending count before this tab is opened.
 */
const props = defineProps({
  garden: { type: Object, required: true },
  editor: { type: Boolean, default: false }
});

const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const eventStore = useEventStore();
const alertStore = useAlertStore();
const { projects } = storeToRefs(projectsStore);
const { volunteerDays } = storeToRefs(eventStore);

const tab = ref('review');
const category = ref('all');
const eventId = ref('all');
const sort = ref('default'); // review: oldest first; others: newest first
const menuFor = ref(null);
const reviewingId = ref(null);
const lastDecision = ref(null); // { verb, title, projectId, at }

const allProjects = computed(() => (Array.isArray(projects.value) ? projects.value : [])
  .filter(p => inGarden(p, props.garden)));

const byTab = computed(() => {
  const groups = { review: [], waiting: [], active: [], completed: [], archived: [] };
  for (const p of allProjects.value) groups[reviewTab(p)].push(p);
  return groups;
});

const tabs = computed(() => [
  { id: 'review', label: 'Needs review', count: byTab.value.review.length },
  { id: 'active', label: 'Active', count: byTab.value.active.length },
  { id: 'completed', label: 'Completed', count: byTab.value.completed.length },
  { id: 'archived', label: 'Archived', count: byTab.value.archived.length }
]);

const events = computed(() => (Array.isArray(volunteerDays.value?.days) ? volunteerDays.value.days : []));

const filtersOn = computed(() => category.value !== 'all' || eventId.value !== 'all');

function applyFilters(list, oldestFirst) {
  let out = list;
  if (category.value !== 'all') out = out.filter(p => p.category === category.value);
  if (eventId.value !== 'all') {
    const id = Number(eventId.value);
    out = out.filter(p => (p.related_events || []).some(e => (e?.id ?? e) === id));
  }
  const asc = sort.value === 'default' ? oldestFirst : sort.value === 'asc';
  return [...out].sort((a, b) => {
    const d = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    return asc ? d : -d;
  });
}

// The drawer always walks the whole queue, oldest first, whatever the filters.
const queue = computed(() => [...byTab.value.review]
  .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)));
const reviewRows = computed(() => applyFilters(byTab.value.review, true));
const waitingRows = computed(() => applyFilters(byTab.value.waiting, false));
const otherRows = computed(() => applyFilters(byTab.value[tab.value] || [], false));

const sortLabel = computed(() => (tab.value === 'review' ? 'Oldest first' : 'Newest first'));

const emptyCopy = {
  active: 'No active projects. Approved pitches show up here.',
  completed: 'Nothing finished yet. Mark a project complete from its menu.',
  archived: 'Archived and denied projects are kept here.'
};

const lastLine = computed(() => {
  const d = lastDecision.value;
  if (!d) return '';
  return `You ${d.verb} ${d.title} ${timeAgo(d.at)}.`;
});

// ── Drawer + deep link ──
function openReview(project) {
  menuFor.value = null;
  reviewingId.value = project.id;
}

function closeReview() {
  reviewingId.value = null;
}

watch(reviewingId, (id) => {
  const documentId = id ? allProjects.value.find(p => p.id === id)?.documentId : null;
  const query = { ...route.query };
  if (documentId) query.review = documentId;
  else delete query.review;
  if (query.review !== route.query.review) router.replace({ query, hash: route.hash });
});

// Open ?review=<documentId> once the projects have loaded.
watch([() => route.query.review, allProjects], ([documentId]) => {
  if (!documentId || reviewingId.value) return;
  const target = allProjects.value.find(p => p.documentId === documentId);
  if (!target) return;
  if (normalizeReviewStatus(target.review_status) === 'CREATED') {
    tab.value = 'review';
    reviewingId.value = target.id;
  }
}, { immediate: true });

function onDecided({ project, action }) {
  const verb = action === 'approve' ? 'approved' : action === 'request_changes' ? 'requested changes on' : 'denied';
  lastDecision.value = { verb, title: project.title, projectId: project.id, at: new Date() };
}

function onUndone(id) {
  if (lastDecision.value?.projectId === id) lastDecision.value = null;
}

async function undoLast() {
  const id = lastDecision.value?.projectId;
  if (!id) return;
  try {
    projectsStore.patchCached(id, await projectsStore.undoDecision(id));
    lastDecision.value = null;
  } catch (err) {
    alertStore.error(err?.message || 'That decision can no longer be undone.');
  }
}

// The server allows undo for 10 minutes.
const canUndoLast = computed(() => lastDecision.value && Date.now() - lastDecision.value.at < 10 * 60 * 1000);

// ── Row menu (1b) ──
function toggleMenu(id) {
  menuFor.value = menuFor.value === id ? null : id;
}

function publicRoute(p) {
  if (!props.garden?.slug || !p.slug) return null;
  return { name: 'project-public', params: { gardenSlug: props.garden.slug, projectSlug: p.slug } };
}

function editRoute(p) {
  return p.documentId ? { name: 'manage-project', params: { documentId: p.documentId } } : null;
}

async function setStatus(p, status, message) {
  menuFor.value = null;
  try {
    await projectsStore.review(p.id, status);
    alertStore.success(message);
  } catch {
    // handleError already alerted.
  }
}

const linkingProject = ref(null);

function linkDay(p) {
  menuFor.value = null;
  linkingProject.value = p;
}

function onDayLinked({ related_events }) {
  if (linkingProject.value) linkingProject.value.related_events = related_events;
}

function onDocClick(e) {
  if (menuFor.value != null && !e.target.closest('.pa-menu-wrap')) menuFor.value = null;
}

function onKey(e) {
  if (e.key === 'Escape') menuFor.value = null;
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  window.removeEventListener('keydown', onKey);
});

watch(tab, () => { menuFor.value = null; sort.value = 'default'; });

const waitingNote = (p) => {
  const note = (p.review_note || '').trim();
  if (!note) return '';
  return note.length > 90 ? `${note.slice(0, 88).trimEnd()}…` : note;
};
</script>

<template>
  <div class="pa">
    <div class="pa-head">
      <h2 class="pa-h2">Projects</h2>
      <div v-if="editor && garden?.id" class="pa-new">
        <Project :garden="garden.id" :garden-slug="garden?.slug" :editor="editor" />
      </div>
    </div>

    <div class="pa-bar">
      <div class="pa-tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="tab === t.id"
          class="pa-tab"
          :class="{ 'is-on': tab === t.id }"
          @click="tab = t.id"
        >
          {{ t.label }}<span class="pa-tab__count">{{ t.count }}</span>
        </button>
      </div>
      <div class="pa-filters">
        <label class="pa-chip">
          <span class="sr-only">Category</span>
          <select v-model="category" class="pa-chip__select">
            <option value="all">Category: All</option>
            <option v-for="c in projectCategoryOptions" :key="c.value" :value="c.value">Category: {{ c.label }}</option>
          </select>
        </label>
        <label class="pa-chip">
          <span class="sr-only">Volunteer day</span>
          <select v-model="eventId" class="pa-chip__select">
            <option value="all">Volunteer day: Any</option>
            <option v-for="e in events" :key="e.id" :value="String(e.id)">{{ dayChip(e) }} · {{ e.title || 'Volunteer day' }}</option>
          </select>
        </label>
        <label class="pa-chip">
          <span class="sr-only">Sort</span>
          <select v-model="sort" class="pa-chip__select">
            <option value="default">Sort: {{ sortLabel }}</option>
            <option v-if="tab === 'review'" value="desc">Sort: Newest first</option>
            <option v-else value="asc">Sort: Oldest first</option>
          </select>
        </label>
      </div>
    </div>

    <!-- ── Needs review (1a) ── -->
    <template v-if="tab === 'review'">
      <template v-if="reviewRows.length">
        <p class="pa-help">Oldest first. Open a pitch to read it before deciding.</p>
        <div class="pa-rows">
          <button
            v-for="p in reviewRows"
            :key="p.id"
            type="button"
            class="pa-row pa-row--review"
            :class="{ 'is-selected': reviewingId === p.id }"
            @click="openReview(p)"
          >
            <span class="pa-thumb" :style="imageStyle(p)">
              <span v-if="!hasPhoto(p)" class="pa-thumb__letter" :style="{ color: categoryLook(p.category).letterFg }">{{ (p.category || p.title || '?')[0] }}</span>
            </span>
            <span class="pa-main">
              <span class="pa-title">{{ p.title }}</span>
              <span class="pa-sub">
                <span class="pa-av pa-av--xs" :style="avatarStyle(p.created_by)">{{ initials(p.created_by) }}</span>
                Pitched by {{ personName(p.created_by) || 'a visitor' }} · {{ timeAgo(p.createdAt) }}
              </span>
            </span>
            <span class="pa-col-cat">
              <span v-if="p.category" class="pa-pill" :style="{ background: categoryLook(p.category).bg, color: categoryLook(p.category).fg }">{{ p.category }}</span>
            </span>
            <span class="pa-wait" :class="{ 'is-old': daysWaiting(p.createdAt) >= 9 }">{{ waitingLabel(p.createdAt) }}</span>
            <span class="pa-cue">Review →</span>
          </button>
        </div>
      </template>

      <div v-else-if="filtersOn && byTab.review.length" class="pa-empty-line">No pitches match these filters.</div>

      <!-- All caught up (1c) -->
      <div v-else class="pa-caught">
        <div class="pa-caught__mark">✓</div>
        <h3 class="pa-caught__h">All caught up</h3>
        <p class="pa-caught__p">No pitches are waiting. New ones from the community land here, and we'll email you when one arrives.</p>
        <span v-if="lastLine" class="pa-caught__last">
          {{ lastLine }}
          <button v-if="canUndoLast" type="button" class="pa-linkbtn" @click="undoLast">Undo</button>
        </span>
        <button type="button" class="pa-outline" @click="tab = 'active'">See active projects</button>
      </div>

      <!-- Waiting on pitcher -->
      <div v-if="waitingRows.length" class="pa-waiting">
        <div class="pa-waiting__head">
          <span class="pa-eyebrow">Waiting on pitcher · {{ waitingRows.length }}</span>
          <span class="pa-help">Changes requested. These come back to the queue when the pitcher resubmits.</span>
        </div>
        <component
          :is="editRoute(p) ? 'router-link' : 'div'"
          v-for="p in waitingRows"
          :key="p.id"
          :to="editRoute(p)"
          class="pa-row pa-row--waiting"
        >
          <span class="pa-thumb pa-thumb--sm" :style="imageStyle(p)">
            <span v-if="!hasPhoto(p)" class="pa-thumb__letter" :style="{ color: categoryLook(p.category).letterFg }">{{ (p.category || p.title || '?')[0] }}</span>
          </span>
          <span class="pa-main">
            <span class="pa-title pa-title--dim">{{ p.title }}</span>
            <span class="pa-sub">
              Changes requested {{ timeAgo(p.reviewed_at || p.updatedAt) }}<template v-if="waitingNote(p)"> · “{{ waitingNote(p) }}”</template>
            </span>
          </span>
          <span class="pa-col-cat">
            <span v-if="p.category" class="pa-pill" :style="{ background: categoryLook(p.category).bg, color: categoryLook(p.category).fg }">{{ p.category }}</span>
          </span>
          <span class="pa-waiting__on">Waiting on {{ firstName(p.created_by) }}</span>
        </component>
      </div>
    </template>

    <!-- ── Active / Completed / Archived (1b) ── -->
    <template v-else>
      <template v-if="otherRows.length">
        <div class="pa-cols" aria-hidden="true">
          <span></span><span>Project</span><span class="pa-col-cat">Category</span><span class="pa-col-lead">Lead</span><span class="pa-col-interest">Interest</span><span class="pa-days">Volunteer days</span><span>Stage</span><span></span>
        </div>
        <div class="pa-rows">
          <div
            v-for="p in otherRows"
            :key="p.id"
            class="pa-row pa-row--table"
            :class="{ 'is-selected': menuFor === p.id }"
          >
            <span class="pa-thumb" :style="imageStyle(p)">
              <span v-if="!hasPhoto(p)" class="pa-thumb__letter" :style="{ color: categoryLook(p.category).letterFg }">{{ (p.category || p.title || '?')[0] }}</span>
            </span>
            <span class="pa-main">
              <router-link v-if="editRoute(p)" :to="editRoute(p)" class="pa-title pa-title--link">{{ p.title }}</router-link>
              <span v-else class="pa-title">{{ p.title }}</span>
              <span class="pa-sub">Pitched by {{ personName(p.created_by) || 'a visitor' }} · {{ shortDate(p.createdAt) }}</span>
            </span>
            <span class="pa-col-cat">
              <span v-if="p.category" class="pa-pill" :style="{ background: categoryLook(p.category).bg, color: categoryLook(p.category).fg }">{{ p.category }}</span>
            </span>
            <span class="pa-col-lead">
              <span class="pa-av" :style="avatarStyle(p.created_by)" :title="personName(p.created_by)">{{ initials(p.created_by) }}</span>
            </span>
            <span class="pa-col-interest">♥ {{ (p.interested || []).length }}</span>
            <span class="pa-days">
              <span v-for="e in (p.related_events || []).slice(0, 2)" :key="e.id" class="pa-day" :title="e.title">{{ dayChip(e) }}</span>
              <span v-if="(p.related_events || []).length > 2" class="pa-day">+{{ p.related_events.length - 2 }}</span>
              <span v-if="!(p.related_events || []).length" class="pa-none">None linked</span>
            </span>
            <span class="pa-col-stage">
              <span class="pa-pill" :style="stageOf(p).style">{{ stageOf(p).label }}</span>
            </span>
            <span class="pa-menu-wrap">
              <button
                type="button"
                class="pa-dots"
                :class="{ 'is-on': menuFor === p.id }"
                :aria-expanded="menuFor === p.id"
                :aria-label="`Actions for ${p.title}`"
                @click="toggleMenu(p.id)"
              >⋯</button>
              <div v-if="menuFor === p.id" class="pa-menu" role="menu">
                <router-link v-if="publicRoute(p) && ['APPROVED', 'COMPLETED'].includes(normalizeReviewStatus(p.review_status))" :to="publicRoute(p)" target="_blank" class="pa-menu__item pa-menu__item--strong" role="menuitem">View public page ↗</router-link>
                <router-link v-if="editRoute(p)" :to="{ ...editRoute(p), query: { action: 'edit' } }" class="pa-menu__item" role="menuitem">Edit project</router-link>
                <template v-if="editor">
                  <button v-if="tab === 'active'" type="button" class="pa-menu__item" role="menuitem" @click="linkDay(p)">Link a volunteer day</button>
                  <button v-if="tab === 'active'" type="button" class="pa-menu__item" role="menuitem" @click="setStatus(p, 'COMPLETED', `${p.title} marked completed.`)">Mark completed</button>
                  <button v-if="tab === 'completed'" type="button" class="pa-menu__item" role="menuitem" @click="setStatus(p, 'APPROVED', `${p.title} is active again.`)">Reopen</button>
                  <button v-if="normalizeReviewStatus(p.review_status) === 'ARCHIVED'" type="button" class="pa-menu__item" role="menuitem" @click="setStatus(p, 'APPROVED', `${p.title} restored to active.`)">Restore to active</button>
                  <template v-if="tab !== 'archived'">
                    <span class="pa-menu__rule"></span>
                    <button type="button" class="pa-menu__item pa-menu__item--quiet" role="menuitem" @click="setStatus(p, 'ARCHIVED', `${p.title} archived.`)">Archive</button>
                  </template>
                </template>
              </div>
            </span>
          </div>
        </div>
      </template>
      <div v-else-if="filtersOn && byTab[tab].length" class="pa-empty-line">No projects match these filters.</div>
      <div v-else class="pa-empty-card">
        <span class="pa-eyebrow">{{ tabs.find(t => t.id === tab)?.label }}, empty</span>
        <span>{{ emptyCopy[tab] }}</span>
      </div>
    </template>

    <LinkVolunteerDayModal
      v-if="linkingProject && garden?.slug"
      :project="linkingProject"
      :garden-slug="garden.slug"
      :garden-title="garden.title"
      @linked="onDayLinked"
      @close="linkingProject = null"
    />

    <ProjectReviewDrawer
      v-if="reviewingId && queue.some(p => p.id === reviewingId)"
      v-model:current-id="reviewingId"
      :queue="queue"
      :garden="garden"
      :all-projects="allProjects"
      @close="closeReview"
      @decided="onDecided"
      @undone="onUndone"
    />
  </div>
</template>

<style scoped>
/* Light theme; dark overrides are in the unscoped block below. */
.pa {
  --pa-heading: #376451;
  --pa-text: #1a1a1a;
  --pa-body: #344a34;
  --pa-muted: #6b7280;
  --pa-row: #faf7ef;
  --pa-row-on: #f3ece0;
  --pa-line: #e2dccb;
  --pa-accent: #8aa37c;
  --pa-ink: #14281a;
  --pa-count: #ece5d4;
  --pa-count-fg: #4b5563;
  --pa-day-bg: #f3ece0;
  --pa-day-fg: #376451;
  --pa-old: #b45309;
  --pa-link: #376451;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  /* Rows respond to the panel's width, not the viewport's: the sidebar takes a share. */
  container-type: inline-size;
}

.pa-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pa-h2 {
  margin: 0;
  flex: 1;
  font-family: 'Playfair Display', serif;
  font-size: 30px;
  color: var(--pa-heading);
}

/* Project.vue's create button carries Tailwind utilities; override them. */
.pa-new :deep(button) {
  background: #8aa37c !important;
  color: #14281a !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  padding: 12px 20px !important;
  border-radius: 9999px !important;
  box-shadow: none !important;
}

.pa-bar {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 8px 20px;
  border-bottom: 1px solid var(--pa-line);
}

.pa-tabs {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  max-width: 100%;
}

.pa-tab {
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  padding: 10px 2px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--pa-muted);
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.pa-tab.is-on {
  color: var(--pa-text);
  border-bottom-color: var(--pa-accent);
}

.pa-tab__count {
  background: var(--pa-count);
  color: var(--pa-count-fg);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 9999px;
}

.pa-tab.is-on .pa-tab__count {
  background: var(--pa-accent);
  color: var(--pa-ink);
}

.pa-filters {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
}

.pa-chip {
  margin: 0;
  position: relative;
}

.pa-chip__select {
  appearance: none;
  border: 1px solid var(--pa-line);
  background: transparent;
  color: var(--pa-body);
  font-size: 13px;
  padding: 8px 28px 8px 12px;
  border-radius: 9999px;
  cursor: pointer;
  max-width: 220px;
  text-overflow: ellipsis;
}

.pa-chip::after {
  content: '▾';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--pa-muted);
  pointer-events: none;
}

.pa-chip__select:hover,
.pa-chip__select:focus { border-color: var(--pa-accent); outline: none; }

.pa-help {
  margin: 0;
  font-size: 13px;
  color: var(--pa-muted);
}

.pa-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pa-row {
  display: grid;
  gap: 18px;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 12px 16px 12px 12px;
  background: var(--pa-row);
  border: 1px solid var(--pa-line);
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  font: inherit;
}

.pa-row--review {
  grid-template-columns: 56px minmax(0, 1fr) 140px 130px auto;
  cursor: pointer;
}

.pa-row--review:hover,
.pa-row--review:focus-visible {
  background: var(--pa-row-on);
  border-color: #6c8a6a;
  outline: none;
}

.pa-row.is-selected {
  background: var(--pa-row-on);
  border-color: var(--pa-accent);
}

.pa-thumb {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pa-thumb--sm {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  opacity: 0.8;
}

.pa-thumb__letter {
  font-family: 'DM Serif Display', serif;
  font-size: 26px;
}

.pa-thumb--sm .pa-thumb__letter { font-size: 19px; }

.pa-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pa-title {
  font-weight: 700;
  font-size: 16px;
  color: var(--pa-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pa-title--dim { font-size: 15px; color: var(--pa-body); }

.pa-title--link { text-decoration: none; }

.pa-title--link:hover { text-decoration: underline; color: var(--pa-text); }

.pa-sub {
  font-size: 13px;
  color: var(--pa-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pa-av {
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pa-av--xs { width: 20px; height: 20px; font-size: 9px; }

.pa-col-cat { justify-self: start; }

.pa-pill {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  white-space: nowrap;
}

.pa-wait {
  font-size: 13px;
  color: var(--pa-muted);
}

.pa-wait.is-old { color: var(--pa-old); }

.pa-cue {
  justify-self: end;
  font-size: 14px;
  font-weight: 700;
  color: var(--pa-link);
  padding: 8px 14px;
  border-radius: 9999px;
  white-space: nowrap;
}

.pa-row--review:hover .pa-cue,
.pa-row--review.is-selected .pa-cue {
  background: var(--pa-accent);
  color: var(--pa-ink);
}

/* Waiting on pitcher */
.pa-waiting {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
}

.pa-waiting__head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  border-top: 1px solid var(--pa-line);
  padding-top: 16px;
}

.pa-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--pa-accent);
}

.pa-row--waiting {
  grid-template-columns: 40px minmax(0, 1fr) 140px auto;
  gap: 16px;
  padding: 10px 16px 10px 12px;
  background: transparent;
  border-style: dashed;
}

a.pa-row--waiting:hover { border-color: var(--pa-accent); }

.pa-waiting__on {
  font-size: 13px;
  font-weight: 700;
  color: var(--pa-link);
  border: 1px solid var(--pa-line);
  padding: 6px 12px;
  border-radius: 9999px;
  white-space: nowrap;
}

/* Table tabs */
.pa-cols,
.pa-row--table {
  grid-template-columns: 56px minmax(0, 1fr) 120px 56px 70px 200px 96px 44px;
}

.pa-cols {
  display: grid;
  gap: 18px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pa-muted);
}

.pa-row--table { padding: 12px; }

.pa-col-interest {
  font-size: 14px;
  color: var(--pa-body);
}

.pa-days {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pa-day {
  font-size: 12px;
  font-weight: 700;
  color: var(--pa-day-fg);
  background: var(--pa-day-bg);
  border: 1px solid var(--pa-line);
  padding: 4px 9px;
  border-radius: 9999px;
  white-space: nowrap;
}

.pa-none {
  font-size: 13px;
  color: var(--pa-muted);
  font-style: italic;
}

.pa-col-stage { justify-self: start; }

.pa-menu-wrap { position: relative; }

.pa-dots {
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  border: 1px solid var(--pa-line);
  background: transparent;
  color: var(--pa-body);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.pa-dots.is-on {
  border-color: var(--pa-accent);
  background: var(--pa-row-on);
}

.pa-menu {
  position: absolute;
  right: 0;
  top: 48px;
  z-index: 20;
  width: 220px;
  background: #f7f1e3;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
  padding: 6px;
  display: flex;
  flex-direction: column;
}

.pa-menu__item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 11px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  color: #1a1a1a;
  text-decoration: none;
  cursor: pointer;
}

.pa-menu__item:hover { background: #f3ece0; color: #1a1a1a; }

.pa-menu__item--strong { color: #064e3b; font-weight: 700; }

.pa-menu__item--quiet { color: #4b5563; }

.pa-menu__rule {
  height: 1px;
  background: #dcd3c0;
  margin: 4px 6px;
}

/* Empty states */
.pa-caught {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 0 16px;
  text-align: center;
}

.pa-caught__mark {
  width: 96px;
  height: 96px;
  border-radius: 9999px;
  background: var(--pa-row);
  border: 1px solid var(--pa-line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: var(--pa-accent);
}

.pa-caught__h {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 34px;
  color: var(--pa-heading);
}

.pa-caught__p {
  margin: 0;
  max-width: 440px;
  font-size: 16px;
  line-height: 1.6;
  color: var(--pa-body);
}

.pa-caught__last {
  font-size: 14px;
  color: var(--pa-muted);
}

.pa-linkbtn {
  background: none;
  border: none;
  padding: 0 0 0 4px;
  color: var(--pa-link);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.pa-outline {
  margin-top: 6px;
  background: transparent;
  border: 1px solid var(--pa-accent);
  color: var(--pa-link);
  font-weight: 700;
  font-size: 15px;
  padding: 12px 22px;
  border-radius: 9999px;
  cursor: pointer;
}

.pa-empty-card {
  align-self: flex-start;
  max-width: 360px;
  background: var(--pa-row);
  border: 1px solid var(--pa-line);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--pa-body);
}

.pa-empty-line {
  font-size: 14px;
  font-style: italic;
  color: var(--pa-muted);
}

/* ── Narrow panels: drop the secondary columns ── */
@container (max-width: 1040px) {
  .pa-cols,
  .pa-row--table { grid-template-columns: 56px minmax(0, 1fr) 120px 160px 96px 44px; }
  .pa-cols .pa-col-lead,
  .pa-cols .pa-col-interest,
  .pa-row--table .pa-col-lead,
  .pa-row--table .pa-col-interest { display: none; }
}

@container (max-width: 760px) {
  .pa-cols { display: none; }
  .pa-row--table { grid-template-columns: 56px minmax(0, 1fr) 96px 44px; }
  .pa-row--table .pa-col-cat,
  .pa-row--table .pa-days { display: none; }
  .pa-row--review { grid-template-columns: 56px minmax(0, 1fr) 120px auto; }
  .pa-row--review .pa-cue { display: none; }
}

@container (max-width: 640px) {
  .pa-filters { margin-left: 0; }
  .pa-row--review { grid-template-columns: 56px minmax(0, 1fr); gap: 12px; }
  .pa-row--review .pa-col-cat,
  .pa-row--review .pa-cue { display: none; }
  .pa-row--review .pa-wait { grid-column: 2; margin-top: -8px; }
  .pa-row--waiting { grid-template-columns: 40px minmax(0, 1fr); }
  .pa-row--waiting .pa-col-cat,
  .pa-row--waiting .pa-waiting__on { display: none; }
  .pa-row--table { grid-template-columns: 56px minmax(0, 1fr) 44px; gap: 12px; }
  .pa-row--table .pa-col-stage { display: none; }
}
</style>

<!--
  Dark overrides live in a plain (non-scoped) block with a literal
  "html.dark ..." selector: `:global(.dark) .x` doesn't survive this
  project's production CSS minification (see GardenDetail.vue).
-->
<style>
html.dark .pa {
  --pa-heading: #c8dbbf;
  --pa-text: #f5f5f5;
  --pa-body: #d0d0d0;
  --pa-muted: #a0b8a0;
  --pa-row: #1f2d1a;
  --pa-row-on: #2a3826;
  --pa-line: #3d4d36;
  --pa-count: #3d4d36;
  --pa-count-fg: #d0d0d0;
  --pa-day-bg: #2a3826;
  --pa-day-fg: #c8dbbf;
  --pa-old: #F9E2D1;
  --pa-link: #c8dbbf;
}

html.dark .pa-chip__select option {
  background: #1f2d1a;
  color: #f5f5f5;
}
</style>
