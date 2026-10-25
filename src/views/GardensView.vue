<script setup>
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

import {
    useAuthStore,
    useGardensStore,
    useEventStore,
    useGardenTaskStore,
    useProjectsStore,
    useAlertStore
} from '@/stores';
import {
    getTaskStatusOption,
    getRecurringTaskTypeBadgeClasses,
    getRecurringTaskTypeDisplayLabel,
    getProjectCategoryBadgeClasses
} from '@/_config/GardenConfig';
import ManageLayout from '@/components/ManageLayout.vue';
import EmailLink from '@/components/EmailLink.vue';
import PhotoStack from '@/components/PhotoStack.vue';
import { toPhotoSet } from '@/helpers/image-utils';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
const eventStore = useEventStore();
const { volunteerDays } = storeToRefs(eventStore);
const gardenTaskStore = useGardenTaskStore();
const { userTasks } = storeToRefs(gardenTaskStore);
const projectsStore = useProjectsStore();
const { userProjects } = storeToRefs(projectsStore);
const alertStore = useAlertStore();

// Gardens are fetched by ManageLayout (for the pitch dropdown); we read the
// shared store ref here for the manage/volunteer sections.
const eventsState = ref('loading');
eventStore.getUserEvents().then(() => {
    eventsState.value = 'ready';
}).catch(() => {
    eventsState.value = 'error';
});
Promise.allSettled([
    gardenTaskStore.getUserTasks(),
    projectsStore.getUserProjects()
]);

const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const taskPhotos = (task) => toPhotoSet([task.primary_image], `Photo for ${task.title}`);
const gardenPhotos = (garden) => toPhotoSet([garden.hero_image], `Photo of ${garden.title}`);
const projectPhotos = (project) => toPhotoSet([project.hero_image, ...(project.featured_gallery || [])], `Photo for ${project.title}`);
const projectHref = (project) => `/manage/project/${project.documentId || project.id}`;

// State for how many events to show per section
const latestEventsToShow = ref(3);
const upcomingEventsToShow = ref(3);

// Strapi v5 events are flat already.
const normalizeEvent = (event) => event;

// Helper: check if user is a manager of a garden
const isManager = (garden) => {
    const managers = garden.managers || [];
    return managers.some(manager => {
        const managerId = manager.id || manager;
        return managerId === user.value?.id;
    });
};

// Helper: check if user is a volunteer (member) of a garden
const isVolunteer = (garden) => {
    const volunteers = garden.volunteers || [];
    return volunteers.some(volunteer => {
        const volunteerId = volunteer.id || volunteer;
        return volunteerId === user.value?.id;
    });
};

const collectionState = (value) => {
    if (value?.error) return 'error';
    if (Array.isArray(value)) return 'ready';
    return 'loading';
};
const gardensState = computed(() => collectionState(gardens.value));
const tasksState = computed(() => collectionState(userTasks.value));
const projectsState = computed(() => collectionState(userProjects.value));

const managedGardens = computed(() => {
    if (!gardens.value || !Array.isArray(gardens.value) || !user.value) return [];
    return gardens.value.filter(isManager);
});

// Gardens where the user is a volunteer but NOT a manager
const memberGardens = computed(() => {
    if (!gardens.value || !Array.isArray(gardens.value) || !user.value) return [];
    return gardens.value.filter(g => isVolunteer(g) && !isManager(g));
});

// Garden counts shown on each card
const managersCount = (garden) => garden.managers?.length || 0;
const volunteersCount = (garden) => garden.volunteers?.length || 0;

// "Draft" badge — only when the API explicitly reports an unpublished garden.
const isDraft = (garden) =>
    'publishedAt' in garden && !garden.publishedAt;

// ── Cross-garden tasks ─────────────────────────────────
const userActiveTasks = computed(() =>
    Array.isArray(userTasks.value) ? userTasks.value : []
);

const taskGarden = (task) => {
    const g = task.garden;
    if (!g) return { title: '', slug: '' };
    return {
        title: g.title || '',
        slug: g.slug || ''
    };
};

const taskHref = (task) => {
    const slug = taskGarden(task).slug;
    if (!slug) return undefined;
    return `/manage/gardens/${slug}#tasks`;
};

// ── Cross-garden projects ──────────────────────────────
const userProjectsList = computed(() =>
    Array.isArray(userProjects.value) ? userProjects.value : []
);

const projectGarden = (project) => {
    const g = project.garden;
    if (!g) return { title: '', slug: '' };
    return {
        title: g.title || '',
        slug: g.slug || ''
    };
};

// Relation ids from a Strapi v5 relation array (or a plain array of ids).
const relationIds = (rel) => {
    const arr = Array.isArray(rel) ? rel : [];
    return arr.map(x => x.id ?? x);
};

const projectCreatorId = (project) => {
    const cb = project.created_by;
    return cb?.id ?? cb ?? null;
};
const isProjectCreator = (project) => {
    const id = projectCreatorId(project);
    return id != null && id === user.value?.id;
};
const isProjectManager = (project) =>
    relationIds(project.managers).includes(user.value?.id);
const isProjectInterested = (project) =>
    projectsStore.interestState(project).isInterested;

// The Interested toggle only applies to projects the user neither manages nor created.
const canExpressInterest = (project) => !isProjectManager(project) && !isProjectCreator(project);
const canManageProject = (project) => isProjectManager(project) || isProjectCreator(project);

// Ownership label — degrades to null until created_by/managers ship.
const projectOwnership = (project) => {
    if (isProjectCreator(project)) return 'Created by you';
    if (isProjectManager(project)) return 'You manage';
    if (isProjectInterested(project)) return 'Interested';
    return null;
};

const togglingInterestId = ref(null);
const toggleInterest = async (project) => {
    if (togglingInterestId.value) return;
    togglingInterestId.value = project.id;
    try {
        await projectsStore.toggleInterest(project.id);
    } catch (e) {
        // store surfaces its own error alert
    } finally {
        togglingInterestId.value = null;
    }
};

// ── Events (all of the user's events, across every garden they're in) ──
const managedGardenIds = computed(() => managedGardens.value.map(garden => garden.id));

const dashboardEvents = computed(() => {
    if (!volunteerDays.value?.days || !Array.isArray(volunteerDays.value.days) || !user.value) {
        return [];
    }
    // Deduplicate by event id — Strapi v5 nested populate can return duplicates
    const seen = new Set();
    return volunteerDays.value.days.filter(event => {
        if (!event || seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
    }).map(normalizeEvent);
});

const eventGardenId = (event) => {
    const g = event.garden;
    if (!g) return null;
    if (typeof g === 'number') return g;
    return g.id ?? null;
};

// Edit is only offered for events whose garden the user manages.
const canEditEvent = (event) => {
    const gid = eventGardenId(event);
    return gid != null && managedGardenIds.value.includes(gid);
};

const eventGarden = (event) => {
    const g = event.garden;
    if (!g) return '';
    return g.title || '';
};

const upcomingEvents = computed(() => {
    const now = new Date();
    return dashboardEvents.value
        .filter(event => event.startDatetime && new Date(event.startDatetime) >= now)
        .sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
});

const displayedUpcomingEvents = computed(() => upcomingEvents.value.slice(0, upcomingEventsToShow.value));
const hasMoreUpcomingEvents = computed(() => upcomingEvents.value.length > upcomingEventsToShow.value);
const loadMoreUpcomingEvents = () => { upcomingEventsToShow.value += 2; };

const allPastEvents = computed(() => {
    const now = new Date();
    return dashboardEvents.value
        .filter(event => event.startDatetime && new Date(event.startDatetime) < now)
        .sort((a, b) => new Date(b.startDatetime) - new Date(a.startDatetime));
});

const latestEvents = computed(() => allPastEvents.value.slice(0, latestEventsToShow.value));
const hasMoreLatestEvents = computed(() => allPastEvents.value.length > latestEventsToShow.value);
const loadMoreLatestEvents = () => { latestEventsToShow.value += 2; };

// ── Actions ────────────────────────────────────────────
// Placeholder until a manage-request endpoint exists (see plan: deferred).
const requestToManage = (garden) => {
    alertStore.success(`Request to manage "${garden.title}" is coming soon.`);
};

const rsvp = async (event) => {
    try {
        await eventStore.rsvpEvent({ id: event.id });
        alertStore.success('RSVP recorded.');
    } catch (e) {
        // store surfaces its own error alert
    }
};
</script>

<template>
  <ManageLayout v-slot="{ openPitch }">
    <div class="dash-content">
      <main class="dash-main">
        <header class="dash-header">
            <div class="dash-header__main">
                <h1 class="gardens-title">Hi {{ user?.firstName }}!</h1>
                <p v-if="gardensState === 'ready' && tasksState === 'ready'" class="dash-stats">
                    {{ managedGardens.length }} Managed, {{ memberGardens.length }} Volunteer, {{ userActiveTasks.length }} Active Tasks
                </p>
            </div>
            <div class="dash-header__actions">
                <button type="button" class="dash-btn dash-btn--primary" @click="openPitch">Pitch a project</button>
                <EmailLink subject="Adding a garden to Garden Steward" class="dash-btn dash-btn--ghost">Request a new garden</EmailLink>
            </div>
        </header>

        <section class="dash-section">
            <h3 class="gardens-section-heading">My active tasks</h3>
            <p v-if="tasksState === 'loading'" class="dash-empty">Loading tasks…</p>
            <p v-else-if="tasksState === 'error'" class="dash-empty" role="alert">Could not load tasks.</p>
            <p v-else-if="!userActiveTasks.length" class="dash-empty">No active tasks yet.</p>
            <div v-if="userActiveTasks.length" class="dash-grid dash-grid--tasks">
                <article v-for="task in userActiveTasks" :key="task.id" class="task-card" :class="{ 'task-card--text-only': !taskPhotos(task).length }">
                    <PhotoStack v-if="taskPhotos(task).length" :photos="taskPhotos(task)" :label="task.title" :to="taskHref(task) || null" />
                    <div class="task-card__body">
                        <div class="task-card__head">
                            <a v-if="taskHref(task)" class="task-card__title" :href="taskHref(task)">{{ task.title }}</a>
                            <span v-else class="task-card__title">{{ task.title }}</span>
                            <span v-if="task.type" class="dash-soft-tag" :class="getRecurringTaskTypeBadgeClasses(task.type)">{{ getRecurringTaskTypeDisplayLabel(task.type) }}</span>
                        </div>
                        <span class="task-card__status">{{ getTaskStatusOption(task.task_status).label }}</span>
                        <span v-if="taskGarden(task).title" class="task-card__garden">{{ taskGarden(task).title }}</span>
                    </div>
                </article>
            </div>
        </section>
        <h3 class="gardens-section-heading">Gardens I manage</h3>
        <p v-if="gardensState === 'loading'" class="dash-empty">Loading gardens…</p>
        <p v-else-if="gardensState === 'error'" class="dash-empty" role="alert">Could not load gardens.</p>
        <p v-else-if="!managedGardens.length" class="dash-empty">You do not manage any gardens yet.</p>
        <div v-if="gardensState === 'ready'" class="dash-grid dash-grid--gardens">
            <article v-for="garden in managedGardens" :key="garden.id" class="garden-card" :class="{ 'garden-card--text-only': !gardenPhotos(garden).length }">
                <PhotoStack v-if="gardenPhotos(garden).length" :photos="gardenPhotos(garden)" :label="garden.title" :to="`/manage/gardens/${garden.slug}`" />
                <div class="garden-card__body">
                    <h4 class="garden-card__title"><a :href="`/manage/gardens/${garden.slug}`">{{ garden.title }}</a></h4>
                    <p class="garden-card__blurb">{{ garden.blurb }}</p>
                    <div class="garden-card__badges">
                        <span class="dash-badge dash-badge--manager">Manager</span>
                        <span v-if="isDraft(garden)" class="dash-badge dash-badge--draft">Draft</span>
                    </div>
                    <div class="garden-card__footer">
                        <span class="garden-card__counts">{{ managersCount(garden) }} Managers, {{ volunteersCount(garden) }} Volunteers</span>
                        <a class="dash-link" :href="`/manage/gardens/${garden.slug}`">Edit</a>
                    </div>
                </div>
            </article>

            <EmailLink subject="Adding a garden to Garden Steward" class="garden-card garden-card--apply">
                <span class="garden-card--apply__plus">+</span>
                <span>Request a new garden</span>
            </EmailLink>
        </div>
        <h3 class="gardens-section-heading mt-8">Gardens I volunteer at</h3>
        <p v-if="gardensState === 'loading'" class="dash-empty">Loading gardens…</p>
        <p v-else-if="gardensState === 'error'" class="dash-empty" role="alert">Could not load gardens.</p>
        <div v-else-if="memberGardens.length" class="dash-grid dash-grid--gardens">
            <article v-for="garden in memberGardens" :key="garden.id" class="garden-card" :class="{ 'garden-card--text-only': !gardenPhotos(garden).length }">
                <PhotoStack v-if="gardenPhotos(garden).length" :photos="gardenPhotos(garden)" :label="garden.title" :to="`/manage/gardens/${garden.slug}`" />
                <div class="garden-card__body">
                    <h4 class="garden-card__title"><a :href="`/manage/gardens/${garden.slug}`">{{ garden.title }}</a></h4>
                    <p class="garden-card__blurb">{{ garden.blurb }}</p>
                    <div class="garden-card__badges">
                        <span class="dash-badge dash-badge--volunteer">Volunteer</span>
                        <span v-if="isDraft(garden)" class="dash-badge dash-badge--draft">Draft</span>
                    </div>
                    <div class="garden-card__footer">
                        <span class="garden-card__counts">{{ managersCount(garden) }} Managers, {{ volunteersCount(garden) }} Volunteers</span>
                        <button type="button" class="dash-link" @click="requestToManage(garden)">Request to manage</button>
                    </div>
                </div>
            </article>
        </div>
        <p v-else class="dash-empty">You are not volunteering at any gardens yet.</p>
        <h3 class="gardens-section-heading mt-8">My projects</h3>
        <p v-if="projectsState === 'loading'" class="dash-empty">Loading projects…</p>
        <p v-else-if="projectsState === 'error'" class="dash-empty" role="alert">Could not load projects.</p>
        <p v-else-if="!userProjectsList.length" class="dash-empty">You haven't pitched or been added to any projects yet.</p>
        <div v-if="projectsState === 'ready'" class="dash-grid dash-grid--projects">
            <article v-for="project in userProjectsList" :key="project.id" class="project-card" :class="{ 'project-card--text-only': !projectPhotos(project).length }">
                <PhotoStack v-if="projectPhotos(project).length" :photos="projectPhotos(project)" :label="project.title" :to="projectHref(project)" />
                <div class="project-card__body">
                    <div class="project-card__head">
                        <a class="project-card__title" :href="projectHref(project)">{{ project.title }}</a>
                        <span v-if="project.category" class="dash-soft-tag" :class="getProjectCategoryBadgeClasses(project.category)">{{ project.category }}</span>
                    </div>
                    <p v-if="projectGarden(project).title" class="project-card__garden">{{ projectGarden(project).title }}</p>
                    <div class="project-card__footer">
                        <span v-if="projectOwnership(project)" class="project-card__ownership">{{ projectOwnership(project) }}</span>
                        <span class="project-card__actions">
                            <a v-if="projectGarden(project).slug && project.slug" class="dash-link" :href="`/gardens/${projectGarden(project).slug}/p/${project.slug}`">View</a>
                            <button v-if="canExpressInterest(project)" type="button" class="dash-link" :class="{ 'dash-link--active': isProjectInterested(project) }" :disabled="togglingInterestId === project.id" @click="toggleInterest(project)"><span v-if="isProjectInterested(project)">Interested ✓</span><span v-else>Interested</span></button>
                            <a v-if="canManageProject(project)" class="dash-link" :href="projectHref(project)">Edit</a>
                        </span>
                    </div>
                </div>
            </article>

            <button type="button" class="project-card project-card--pitch" @click="openPitch">
                <span class="project-card--pitch__plus">+</span>
                <span>Pitch a project</span>
            </button>
        </div>

      </main>

      <section class="dash-events-panel" aria-label="Events">
          <h2 class="dash-events-panel__title">Events</h2>

          <p v-if="eventsState === 'loading'" class="dash-events-panel__empty">Loading events…</p>
          <p v-else-if="eventsState === 'error'" class="dash-events-panel__empty" role="alert">Could not load events.</p>
          <template v-else>
          <p class="dash-events-panel__label">Upcoming Events</p>
          <div v-if="upcomingEvents.length" class="events-stack">
              <div v-for="event in displayedUpcomingEvents" :key="event.id" class="event-card">
                  <a class="event-card__title" :href="`/d/${event.id}`">{{ event.title }}</a>
                  <dl class="event-card__meta">
                      <div><dt>Date:</dt><dd>{{ formatDate(event.startDatetime) }}</dd></div>
                      <div v-if="eventGarden(event)"><dt>Garden:</dt><dd>{{ eventGarden(event) }}</dd></div>
                      <div v-if="event.accessibility"><dt>Accessibility:</dt><dd>{{ event.accessibility }}</dd></div>
                  </dl>
                  <button type="button" class="event-card__rsvp" @click="rsvp(event)">RSVP</button>
                  <a v-if="canEditEvent(event)" class="event-card__edit" :href="`/manage/events/${event.id}/edit`">Edit</a>
              </div>
              <button v-if="hasMoreUpcomingEvents" class="btn-load-more" @click="loadMoreUpcomingEvents">Load More</button>
          </div>
          <p v-else class="dash-events-panel__empty">No upcoming events.</p>

          <p class="dash-events-panel__label">Latest Events</p>
          <div v-if="latestEvents.length" class="events-stack">
              <div v-for="event in latestEvents" :key="event.id" class="event-card">
                  <a class="event-card__title" :href="`/d/${event.id}`">{{ event.title }}</a>
                  <dl class="event-card__meta">
                      <div><dt>Date:</dt><dd>{{ formatDate(event.startDatetime) }}</dd></div>
                      <div v-if="eventGarden(event)"><dt>Garden:</dt><dd>{{ eventGarden(event) }}</dd></div>
                      <div v-if="event.accessibility"><dt>Accessibility:</dt><dd>{{ event.accessibility }}</dd></div>
                  </dl>
                  <span class="event-card__attended">Past event</span>
                  <a v-if="canEditEvent(event)" class="event-card__edit" :href="`/manage/events/${event.id}/edit`">Edit</a>
              </div>
              <button v-if="hasMoreLatestEvents" class="btn-load-more" @click="loadMoreLatestEvents">Load More</button>
          </div>
          <p v-else class="dash-events-panel__empty">No past events yet.</p>
          </template>
      </section>
    </div>
  </ManageLayout>
</template>

<style scoped>
.dash-content { min-width: 0; overflow-wrap: anywhere; }
.dash-main { min-width: 0; }
.dash-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 20px; padding: 14px 0 28px; border-bottom: 1px solid var(--manage-rule); }
.gardens-title { font: 400 clamp(42px, 4.8vw, 76px)/1.08 var(--gs-heading-font); color: var(--manage-ink); margin: 0 0 8px; letter-spacing: -.025em; }
.dash-stats, .dash-empty { color: var(--manage-muted); font-size: 18px; margin: 0; }
.dash-header__actions, .project-card__actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.dash-btn, .dash-link, .event-card__edit, .event-card__rsvp, .btn-load-more { display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--manage-ink); background: transparent; color: var(--manage-ink); padding: 7px 13px; text-decoration: none; font-size: 17px; line-height: 1.3; cursor: pointer; }
.dash-btn--primary { background: var(--manage-ink); color: var(--manage-paper); }
.dash-link:hover, .dash-btn--ghost:hover, .event-card__edit:hover, .event-card__rsvp:hover, .btn-load-more:hover { background: var(--manage-sage); color: var(--manage-ink); }
.dash-link:disabled { opacity: .55; cursor: not-allowed; }
.dash-link--active { background: var(--manage-sage); }
.gardens-section-heading, .dash-events-panel__title { font: 400 clamp(32px, 3vw, 52px)/1.15 var(--gs-heading-font); color: var(--manage-ink); margin: 0 0 18px; letter-spacing: -.02em; }
.gardens-section-heading { padding-top: 38px; border-top: 1px solid var(--manage-rule); }
.dash-section .gardens-section-heading { border-top: 0; }
.dash-grid { display: grid; min-width: 0; }
.dash-grid--tasks { display: block; }
.task-card { border: 0; border-top: 1px solid var(--manage-rule); border-radius: 0; background: transparent; box-shadow: none; text-decoration: none; }
.task-card__head, .project-card__head, .garden-card__footer, .project-card__footer { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.task-card__status, .task-card__garden, .garden-card__counts, .project-card__garden, .project-card__ownership { color: var(--manage-muted); font-size: 17px; }
.dash-grid--gardens, .dash-grid--projects { display: block; }
.task-card, .garden-card, .project-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: clamp(24px, 3vw, 50px); min-width: 0; padding: 32px 0; color: var(--manage-ink); }
.garden-card, .project-card { border-bottom: 1px solid var(--manage-rule); }
.task-card--text-only, .garden-card--text-only, .project-card--text-only { grid-template-columns: minmax(0, 1fr); }

.task-card__body, .garden-card__body, .project-card__body { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.task-card__title, .garden-card__title, .project-card__title { font: 400 clamp(32px, 3vw, 52px)/1.15 var(--gs-heading-font); margin: 0; color: var(--manage-ink); }
.garden-card__blurb { font-size: clamp(18px, 1.4vw, 23px); line-height: 1.55; margin: 0; }
.garden-card__badges { display: flex; flex-wrap: wrap; gap: 8px; }
.dash-badge { display: inline-block; padding: 3px 9px; font-size: 15px; background: var(--manage-sage); color: var(--manage-ink); }
.dash-badge--draft { background: #dedbce; color: #344a34; }
.dash-badge, .event-card__attended, .task-card__head span, .project-card__head span { -webkit-text-fill-color: currentColor; }
.task-card .dash-soft-tag, .project-card .dash-soft-tag { background: var(--manage-sage); border-color: var(--manage-rule); color: var(--manage-ink); font: 16px/1.3 var(--gs-body-font); padding: 5px 10px; }
.garden-card__footer, .project-card__footer { align-items: flex-end; margin-top: auto; }
.garden-card--apply, .project-card--pitch { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 12px; text-align: center; background: var(--manage-sage); text-decoration: none; font-size: 18px; cursor: pointer; }
.garden-card--apply__plus, .project-card--pitch__plus { font-size: 32px; }
.project-card--pitch { width: 100%; border: 0; border-bottom: 1px solid var(--manage-rule); }
.dash-events-panel { margin-top: 54px; padding-top: 28px; border-top: 1px solid var(--manage-rule); }
.dash-events-panel__label { font-size: 18px; margin: 25px 0 12px; color: var(--manage-muted); }
.dash-events-panel__empty { font-size: 18px; color: var(--manage-muted); }
.events-stack { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 16px; }
.event-card { padding: 18px 0; border-top: 1px solid var(--manage-rule); min-width: 0; }
.event-card__title { display: block; font: 400 clamp(25px, 2vw, 34px)/1.2 var(--gs-heading-font); color: var(--manage-ink); text-decoration: none; }
.event-card__meta { margin: 12px 0; color: var(--manage-muted); font-size: 17px; }
.event-card__meta div { display: flex; gap: 7px; flex-wrap: wrap; }
.event-card__meta dt { font-weight: 600; }
.event-card__meta dd { margin: 0; }
.event-card__edit, .event-card__rsvp, .event-card__attended { margin: 4px 8px 0 0; font-size: 16px; }
.event-card__attended { display: inline-block; padding: 7px 13px; background: var(--manage-sage); color: var(--manage-ink); }
.btn-load-more { align-self: start; }
@media (max-width: 820px) {
    .task-card, .garden-card, .project-card { grid-template-columns: minmax(0, 1fr); gap: 25px; padding: 24px 0 30px; }
    .task-card__title, .garden-card__title, .project-card__title { font-size: 34px; }
    .gardens-title { font-size: 42px; }
}
.task-card__title, .garden-card__title a, .project-card__title { color: var(--manage-ink); text-decoration: none; }
.task-card__title:hover, .garden-card__title a:hover, .project-card__title:hover { text-decoration: underline; }
.garden-card__title { margin: 0; }
</style>
