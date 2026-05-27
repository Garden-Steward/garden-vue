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
eventStore.getUserEvents();
gardenTaskStore.getUserTasks();
projectsStore.getUserProjects();

const rowClick = (slug) => {
    window.location = `/manage/gardens/${slug}`;
};

const viewEventClick = (id) => {
    window.location = `/d/${id}`;
};

const viewProjectClick = (id) => {
    window.location = `/manage/project/${id}`;
};

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

// ── Image helper ───────────────────────────────────────
const getImageUrl = (image) => {
    if (!image) return '';
    const url = image.formats?.medium?.url || image.formats?.small?.url || image.url;
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${import.meta.env.VITE_API_URL}${url}`;
};

// State for how many events to show per section
const latestEventsToShow = ref(3);
const upcomingEventsToShow = ref(3);

// Helper function to normalize event data (handle both Strapi format and normalized format)
const normalizeEvent = (event) => {
    if (event.attributes) {
        return { ...event.attributes, id: event.id };
    }
    return event;
};

// Helper: check if user is a manager of a garden
const isManager = (garden) => {
    const managers = garden.attributes?.managers?.data || [];
    return managers.some(manager => {
        const managerId = manager.id || manager;
        return managerId === user.value?.id;
    });
};

// Helper: check if user is a volunteer (member) of a garden
const isVolunteer = (garden) => {
    const volunteers = garden.attributes?.volunteers?.data || [];
    return volunteers.some(volunteer => {
        const volunteerId = volunteer.id || volunteer;
        return volunteerId === user.value?.id;
    });
};

// Gardens where the user is a manager
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
const managersCount = (garden) => garden.attributes?.managers?.data?.length || 0;
const volunteersCount = (garden) => garden.attributes?.volunteers?.data?.length || 0;

// "Draft" badge — only when the API explicitly reports an unpublished garden.
const isDraft = (garden) =>
    garden.attributes && 'publishedAt' in garden.attributes && !garden.attributes.publishedAt;

// ── Cross-garden tasks ─────────────────────────────────
const userActiveTasks = computed(() =>
    Array.isArray(userTasks.value) ? userTasks.value : []
);

const taskGarden = (task) => {
    const g = task.attributes?.garden?.data || task.attributes?.garden;
    if (!g) return { title: '', slug: '' };
    return {
        title: g.attributes?.title || g.title || '',
        slug: g.attributes?.slug || g.slug || ''
    };
};

// ── Cross-garden projects ──────────────────────────────
const userProjectsList = computed(() =>
    Array.isArray(userProjects.value) ? userProjects.value : []
);

const projectGarden = (project) => {
    const g = project.attributes?.garden?.data || project.attributes?.garden;
    if (!g) return { title: '', slug: '' };
    return {
        title: g.attributes?.title || g.title || '',
        slug: g.attributes?.slug || g.slug || ''
    };
};

// Relation ids from a Strapi m2m field (handles { data: [...] } or a plain array).
const relationIds = (rel) => {
    const arr = rel?.data || rel || [];
    return (Array.isArray(arr) ? arr : []).map(x => x.id ?? x);
};

const projectCreatorId = (project) => {
    const cb = project.attributes?.created_by;
    return cb?.data?.id ?? cb?.id ?? cb ?? null;
};
const isProjectCreator = (project) => {
    const id = projectCreatorId(project);
    return id != null && id === user.value?.id;
};
const isProjectManager = (project) =>
    relationIds(project.attributes?.managers).includes(user.value?.id);
const isProjectInterested = (project) =>
    relationIds(project.attributes?.interested).includes(user.value?.id);

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
    const ids = relationIds(project.attributes?.interested);
    const next = ids.includes(user.value?.id)
        ? ids.filter(id => id !== user.value?.id)
        : [...ids, user.value?.id];
    try {
        await projectsStore.update(project.id, { interested: next });
        await projectsStore.getUserProjects();
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
    return volunteerDays.value.days.map(normalizeEvent);
});

const eventGardenId = (event) => {
    const g = event.garden?.data || event.garden;
    if (!g) return null;
    if (typeof g === 'number') return g;
    return g.id ?? g.attributes?.id ?? null;
};

// Edit is only offered for events whose garden the user manages.
const canEditEvent = (event) => {
    const gid = eventGardenId(event);
    return gid != null && managedGardenIds.value.includes(gid);
};

const eventGarden = (event) => {
    const g = event.garden?.data || event.garden;
    if (!g) return '';
    return g.attributes?.title || g.title || '';
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
    alertStore.success(`Request to manage "${garden.attributes?.title}" is coming soon.`);
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
        <!-- ── Header ── -->
        <header class="dash-header">
            <div class="dash-header__main">
                <h1 class="gardens-title">Hi {{ user?.firstName }}!</h1>
                <p class="dash-stats">
                    {{ managedGardens.length }} Managed, {{ memberGardens.length }} Volunteer, {{ userActiveTasks.length }} Active Tasks
                </p>
            </div>
            <div class="dash-header__actions">
                <button type="button" class="dash-btn dash-btn--primary" @click="openPitch">Pitch a project</button>
                <a class="dash-btn dash-btn--ghost" href="/join">Apply for a new garden</a>
            </div>
        </header>

        <!-- ── My active tasks ── -->
        <section v-if="userActiveTasks.length" class="dash-section">
            <h3 class="gardens-section-heading">My active tasks</h3>
            <div class="dash-grid dash-grid--tasks">
                <a
                    v-for="task in userActiveTasks"
                    :key="task.id"
                    class="task-card"
                    :href="taskGarden(task).slug ? `/manage/gardens/${taskGarden(task).slug}#tasks` : undefined"
                >
                    <div class="task-card__head">
                        <span class="task-card__title">{{ task.attributes?.title }}</span>
                        <span v-if="task.attributes?.type" :class="getRecurringTaskTypeBadgeClasses(task.attributes.type)">
                            {{ getRecurringTaskTypeDisplayLabel(task.attributes.type) }}
                        </span>
                    </div>
                    <span class="task-card__status">{{ getTaskStatusOption(task.attributes?.status).label }}</span>
                    <span v-if="taskGarden(task).title" class="task-card__garden">{{ taskGarden(task).title }}</span>
                </a>
            </div>
        </section>

        <!-- ── Gardens I manage ── -->
        <h3 class="gardens-section-heading">Gardens I manage</h3>
        <div class="dash-grid dash-grid--gardens">
            <div
                v-for="garden in managedGardens"
                :key="garden.id"
                class="garden-card"
                @click="rowClick(garden.attributes.slug)"
            >
                <div
                    class="garden-card__media"
                    :class="{ 'garden-card__media--empty': !getImageUrl(garden.attributes?.hero_image) }"
                    :style="getImageUrl(garden.attributes?.hero_image) ? { backgroundImage: `url(${getImageUrl(garden.attributes.hero_image)})` } : null"
                ></div>
                <div class="garden-card__body">
                    <h4 class="garden-card__title">{{ garden.attributes?.title }}</h4>
                    <p class="garden-card__blurb">{{ garden.attributes?.blurb }}</p>
                    <div class="garden-card__badges">
                        <span class="dash-badge dash-badge--manager">Manager</span>
                        <span v-if="isDraft(garden)" class="dash-badge dash-badge--draft">Draft</span>
                    </div>
                    <div class="garden-card__footer">
                        <span class="garden-card__counts">{{ managersCount(garden) }} Managers, {{ volunteersCount(garden) }} Volunteers</span>
                        <a class="dash-link" :href="`/manage/gardens/${garden.attributes?.slug}`" @click.stop>Edit</a>
                    </div>
                </div>
            </div>

            <a class="garden-card garden-card--apply" href="/join">
                <span class="garden-card--apply__plus">+</span>
                <span>Apply for a new garden</span>
            </a>
        </div>

        <!-- ── Gardens I volunteer at ── -->
        <h3 class="gardens-section-heading mt-8">Gardens I volunteer at</h3>
        <div v-if="memberGardens.length" class="dash-grid dash-grid--gardens">
            <div
                v-for="garden in memberGardens"
                :key="garden.id"
                class="garden-card"
                @click="rowClick(garden.attributes.slug)"
            >
                <div
                    class="garden-card__media"
                    :class="{ 'garden-card__media--empty': !getImageUrl(garden.attributes?.hero_image) }"
                    :style="getImageUrl(garden.attributes?.hero_image) ? { backgroundImage: `url(${getImageUrl(garden.attributes.hero_image)})` } : null"
                ></div>
                <div class="garden-card__body">
                    <h4 class="garden-card__title">{{ garden.attributes?.title }}</h4>
                    <p class="garden-card__blurb">{{ garden.attributes?.blurb }}</p>
                    <div class="garden-card__badges">
                        <span class="dash-badge dash-badge--volunteer">Volunteer</span>
                        <span v-if="isDraft(garden)" class="dash-badge dash-badge--draft">Draft</span>
                    </div>
                    <div class="garden-card__footer">
                        <span class="garden-card__counts">{{ managersCount(garden) }} Managers, {{ volunteersCount(garden) }} Volunteers</span>
                        <button type="button" class="dash-link" @click.stop="requestToManage(garden)">Request to manage</button>
                    </div>
                </div>
            </div>
        </div>
        <p v-else-if="!gardens.loading" class="dash-empty">You are not volunteering at any gardens yet.</p>

        <!-- ── My projects ── -->
        <h3 class="gardens-section-heading mt-8">My projects</h3>
        <p v-if="!userProjectsList.length && !userProjects.loading" class="dash-empty">
            You haven't pitched or been added to any projects yet.
        </p>
        <div class="dash-grid dash-grid--projects">
            <div
                v-for="project in userProjectsList"
                :key="project.id"
                class="project-card project-card--clickable"
                @click="viewProjectClick(project.id)"
            >
                <div class="project-card__head">
                    <span class="project-card__title">{{ project.attributes?.title }}</span>
                    <span v-if="project.attributes?.category" :class="getProjectCategoryBadgeClasses(project.attributes.category)">
                        {{ project.attributes.category }}
                    </span>
                </div>
                <p v-if="projectGarden(project).title" class="project-card__garden">{{ projectGarden(project).title }}</p>
                <div class="project-card__footer">
                    <span v-if="projectOwnership(project)" class="project-card__ownership">{{ projectOwnership(project) }}</span>
                    <span class="project-card__actions">
                        <a
                            v-if="projectGarden(project).slug && project.attributes?.slug"
                            class="dash-link"
                            :href="`/gardens/${projectGarden(project).slug}/p/${project.attributes.slug}`"
                            @click.stop
                        >View</a>
                        <button
                            v-if="canExpressInterest(project)"
                            type="button"
                            class="dash-link"
                            :class="{ 'dash-link--active': isProjectInterested(project) }"
                            :disabled="togglingInterestId === project.id"
                            @click.stop="toggleInterest(project)"
                        >{{ isProjectInterested(project) ? 'Interested ✓' : 'Interested' }}</button>
                        <a
                            v-if="canManageProject(project)"
                            class="dash-link"
                            :href="`/manage/project/${project.id}`"
                            @click.stop
                        >Edit</a>
                    </span>
                </div>
            </div>

            <button type="button" class="project-card project-card--pitch" @click="openPitch">
                <span class="project-card--pitch__plus">+</span>
                <span>Pitch a project</span>
            </button>
        </div>

        <div v-if="gardens.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="gardens.error" class="text-danger">Error loading gardens: {{ gardens.error }}</div>
      </main>

      <!-- ── Right events panel ── -->
      <aside class="dash-events-panel">
          <h2 class="dash-events-panel__title">Events</h2>

          <p class="dash-events-panel__label">Upcoming Events</p>
          <div v-if="upcomingEvents.length" class="events-stack">
              <div v-for="event in displayedUpcomingEvents" :key="event.id" class="event-card" @click="viewEventClick(event.id)">
                  <a class="event-card__title" :href="`/d/${event.id}`" @click.stop>{{ event.title }}</a>
                  <dl class="event-card__meta">
                      <div><dt>Date:</dt><dd>{{ formatDate(event.startDatetime) }}</dd></div>
                      <div v-if="eventGarden(event)"><dt>Garden:</dt><dd>{{ eventGarden(event) }}</dd></div>
                      <div v-if="event.accessibility"><dt>Accessibility:</dt><dd>{{ event.accessibility }}</dd></div>
                  </dl>
                  <button type="button" class="event-card__rsvp" @click.stop="rsvp(event)">RSVP</button>
                  <a v-if="canEditEvent(event)" class="event-card__edit" :href="`/manage/events/${event.id}/edit`" @click.stop>Edit</a>
              </div>
              <button v-if="hasMoreUpcomingEvents" class="btn-load-more" @click="loadMoreUpcomingEvents">Load More</button>
          </div>
          <p v-else class="dash-events-panel__empty">No upcoming events.</p>

          <p class="dash-events-panel__label">Latest Events</p>
          <div v-if="latestEvents.length" class="events-stack">
              <div v-for="event in latestEvents" :key="event.id" class="event-card" @click="viewEventClick(event.id)">
                  <a class="event-card__title" :href="`/d/${event.id}`" @click.stop>{{ event.title }}</a>
                  <dl class="event-card__meta">
                      <div><dt>Date:</dt><dd>{{ formatDate(event.startDatetime) }}</dd></div>
                      <div v-if="eventGarden(event)"><dt>Garden:</dt><dd>{{ eventGarden(event) }}</dd></div>
                      <div v-if="event.accessibility"><dt>Accessibility:</dt><dd>{{ event.accessibility }}</dd></div>
                  </dl>
                  <span class="event-card__attended">Attended</span>
                  <a v-if="canEditEvent(event)" class="event-card__edit" :href="`/manage/events/${event.id}/edit`" @click.stop>Edit</a>
              </div>
              <button v-if="hasMoreLatestEvents" class="btn-load-more" @click="loadMoreLatestEvents">Load More</button>
          </div>
          <p v-else class="dash-events-panel__empty">No past events yet.</p>
      </aside>
    </div>
  </ManageLayout>
</template>

<style scoped>
/* ── Content split: main | events ── */
.dash-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 1.5rem;
    align-items: start;
}

.dash-main {
    min-width: 0;
}

@media (max-width: 1100px) {
    .dash-content {
        grid-template-columns: 1fr;
    }
}

/* ── Header ── */
.dash-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
}

.gardens-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    color: #376451;
    line-height: 1.15;
    letter-spacing: -0.02em;
    margin: 0 0 0.35rem;
}

.dash-stats {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
}

.dash-header__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
}

.dash-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.55rem 1.1rem;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    border: 1px solid transparent;
}

.dash-btn--primary {
    background-color: #86b153;
    color: #1f2a14;
}

.dash-btn--primary:hover {
    background-color: #97c264;
}

.dash-btn--ghost {
    background-color: transparent;
    border-color: #8aa37c;
    color: #376451;
}

.dash-btn--ghost:hover {
    background-color: rgba(138, 163, 124, 0.15);
}

/* ── Section headings ── */
.gardens-section-heading {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #344a34;
    margin: 1.25rem 0 0.85rem;
}

.dash-section {
    margin-bottom: 0.5rem;
}

.dash-empty {
    color: #6b7280;
    font-style: italic;
    margin: 0.25rem 0 0.5rem;
}

/* ── Grids ── */
.dash-grid {
    display: grid;
    gap: 1rem;
}

.dash-grid--tasks {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.dash-grid--gardens {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.dash-grid--projects {
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
}

/* ── Task cards ── */
.task-card {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background-color: #ffffff;
    border: 1px solid #e2dccb;
    border-left: 4px solid #8aa37c;
    text-decoration: none;
    color: #344a34;
    transition: all 0.2s ease;
}

.task-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(138, 163, 124, 0.2);
}

.task-card__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
}

.task-card__title {
    font-weight: 700;
    font-size: 1.05rem;
}

.task-card__status {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
}

.task-card__garden {
    font-size: 0.9rem;
    color: #6b7280;
}

/* ── Garden cards ── */
.garden-card {
    display: flex;
    flex-direction: column;
    border-radius: 0.75rem;
    overflow: hidden;
    background-color: #ffffff;
    border: 1px solid #e2dccb;
    cursor: pointer;
    transition: all 0.2s ease;
}

.garden-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(138, 163, 124, 0.2);
    border-color: #8aa37c;
}

.garden-card__media {
    height: 140px;
    background-size: cover;
    background-position: center;
}

.garden-card__media--empty {
    background: linear-gradient(135deg, #8aa37c, #376451);
}

.garden-card__body {
    padding: 0.85rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.garden-card__title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #344a34;
    margin: 0;
}

.garden-card__blurb {
    font-size: 0.9rem;
    color: #6b7280;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.garden-card__badges {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.dash-badge {
    display: inline-block;
    padding: 0.15rem 0.65rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
}

/*
 * WebKit paints -webkit-text-fill-color over `color`, and the property is
 * inherited — re-anchor the fill so dark-on-light pills don't render white.
 */
.dash-badge,
.event-card__attended,
.task-card__head span,
.project-card__head span {
    -webkit-text-fill-color: currentColor;
}

.dash-badge--manager {
    background-color: #d7e8c8;
    color: #2f5233;
}

.dash-badge--volunteer {
    background-color: #cfe0f0;
    color: #234e6e;
}

.dash-badge--draft {
    background-color: #e5e7eb;
    color: #6b7280;
}

.garden-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.2rem;
}

.garden-card__counts {
    font-size: 0.8rem;
    color: #6b7280;
}

.dash-link {
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 0.4rem;
    padding: 0.2rem 0.7rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #376451;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
}

.dash-link:hover {
    background-color: #f3ece0;
    border-color: #8aa37c;
}

.dash-link--active {
    background-color: #d7e8c8;
    border-color: #8aa37c;
    color: #2f5233;
}

.dash-link:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.garden-card--apply {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 200px;
    border: 1px dashed #c7cdbb;
    background-color: transparent;
    color: #376451;
    cursor: pointer;
    text-decoration: none;
    font-weight: 600;
}

.garden-card--apply:hover {
    background-color: rgba(138, 163, 124, 0.1);
    border-color: #8aa37c;
}

.garden-card--apply__plus {
    font-size: 2.5rem;
    line-height: 1;
    font-weight: 300;
}

/* ── Project cards ── */
.project-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background-color: #ffffff;
    border: 1px solid #e2dccb;
}

.project-card--clickable {
    cursor: pointer;
    transition: all 0.2s ease;
}

.project-card--clickable:hover {
    border-color: #8aa37c;
    box-shadow: 0 4px 12px rgba(138, 163, 124, 0.2);
}

.project-card__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
}

.project-card__title {
    font-weight: 700;
    font-size: 1.05rem;
    color: #344a34;
}

.project-card__garden {
    font-size: 0.9rem;
    color: #6b7280;
    margin: 0;
}

.project-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: auto;
}

.project-card__ownership {
    font-size: 0.85rem;
    color: #6b7280;
}

.project-card__actions {
    display: flex;
    gap: 0.4rem;
}

.project-card--pitch {
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 0.35rem;
    min-height: 110px;
    border: 1px dashed #c7cdbb;
    background-color: transparent;
    color: #376451;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.project-card--pitch:hover {
    background-color: rgba(138, 163, 124, 0.1);
    border-color: #8aa37c;
}

.project-card--pitch__plus {
    font-size: 1.75rem;
    line-height: 1;
    font-weight: 300;
}

/* ── Events panel ── */
.dash-events-panel {
    position: sticky;
    top: 1rem;
    background-color: rgba(108, 138, 106, 0.1);
    border: 1px solid #e2dccb;
    border-radius: 14px;
    padding: 1.25rem;
}

.dash-events-panel__title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: #344a34;
    margin: 0 0 1rem;
}

.dash-events-panel__label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #8aa37c;
    margin: 1.25rem 0 0.6rem;
}

.dash-events-panel__label:first-of-type {
    margin-top: 0;
}

.dash-events-panel__empty {
    font-size: 0.85rem;
    color: #6b7280;
    font-style: italic;
    margin: 0;
}

.events-stack {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.event-card {
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    border: 1px solid #e2dccb;
    border-left: 4px solid #8aa37c;
    border-radius: 0.6rem;
    padding: 0.85rem 1rem;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
}

.event-card:hover {
    border-color: #8aa37c;
    box-shadow: 0 4px 12px rgba(138, 163, 124, 0.2);
}

.event-card__title {
    display: inline-block;
    font-size: 1.05rem;
    font-weight: 700;
    color: #344a34;
    margin: 0 0 0.5rem;
    cursor: pointer;
    text-decoration: none;
    /* leave room for the absolutely-positioned RSVP / Attended pill */
    padding-right: 4.5rem;
}

.event-card__title:hover {
    color: #8aa37c;
}

.event-card__edit {
    align-self: flex-end;
    margin-top: 0.6rem;
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 0.4rem;
    padding: 0.12rem 0.6rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: #376451;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.event-card__edit:hover {
    background-color: #f3ece0;
    border-color: #8aa37c;
}

.event-card__meta {
    margin: 0;
    font-size: 0.85rem;
    color: #6b7280;
}

.event-card__meta div {
    display: flex;
    gap: 0.4rem;
}

.event-card__meta dt {
    font-weight: 600;
    min-width: 92px;
}

.event-card__meta dd {
    margin: 0;
}

.event-card__rsvp {
    position: absolute;
    top: 0.85rem;
    right: 1rem;
    background-color: transparent;
    border: 1px solid #8aa37c;
    color: #376451;
    border-radius: 0.4rem;
    padding: 0.2rem 0.7rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.event-card__rsvp:hover {
    background-color: #8aa37c;
    color: #ffffff;
}

.event-card__attended {
    position: absolute;
    top: 0.85rem;
    right: 1rem;
    background-color: #d7e8c8;
    color: #2f5233;
    border-radius: 0.4rem;
    padding: 0.2rem 0.7rem;
    font-size: 0.8rem;
    font-weight: 600;
}

.btn-load-more {
    display: inline-block;
    margin-top: 1rem;
    padding: 8px 16px;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 6px;
    background-color: transparent;
    color: #8aa37c;
    border: 1px solid #8aa37c;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-load-more:hover {
    background-color: #8aa37c;
    color: #ffffff;
}
</style>

<!-- Dark-mode overrides (non-scoped for reliable specificity). -->
<style>
html.dark .gardens-title {
    color: #c8dbbf;
}

html.dark .dash-stats {
    color: #a0a8a0;
}

html.dark .gardens-section-heading {
    color: #c8dbbf;
}

html.dark .dash-empty {
    color: #a0a8a0;
}

html.dark .dash-btn--ghost {
    border-color: #8aa37c;
    color: #c8dbbf;
}

html.dark .dash-btn--ghost:hover {
    background-color: rgba(138, 163, 124, 0.18);
}

html.dark .task-card,
html.dark .garden-card,
html.dark .project-card,
html.dark .event-card {
    background-color: #344a34;
    border-color: #3d4d36;
    color: #f5f5f5;
}

html.dark .task-card__title,
html.dark .garden-card__title,
html.dark .project-card__title,
html.dark .event-card__title {
    color: #f5f5f5;
}

html.dark .task-card__status,
html.dark .task-card__garden,
html.dark .garden-card__blurb,
html.dark .garden-card__counts,
html.dark .project-card__garden,
html.dark .project-card__ownership,
html.dark .event-card__meta {
    color: #c2cbbb;
}

html.dark .task-card:hover,
html.dark .garden-card:hover {
    border-color: #8aa37c;
}

html.dark .garden-card--apply,
html.dark .project-card--pitch {
    border-color: #3d4d36;
    color: #c8dbbf;
}

html.dark .garden-card--apply:hover,
html.dark .project-card--pitch:hover {
    background-color: rgba(138, 163, 124, 0.12);
    border-color: #8aa37c;
}

html.dark .dash-link {
    border-color: #3d4d36;
    color: #c8dbbf;
}

html.dark .dash-link:hover {
    background-color: #3d4d36;
    border-color: #8aa37c;
}

html.dark .dash-link--active {
    background-color: rgba(138, 163, 124, 0.3);
    border-color: #8aa37c;
    color: #e6f0db;
}

html.dark .dash-events-panel {
    background-color: rgba(255, 255, 255, 0.04);
    border-color: #3d4d36;
}

html.dark .dash-events-panel__title {
    color: #c8dbbf;
}

html.dark .dash-events-panel__empty {
    color: #a0a8a0;
}

html.dark .event-card__rsvp {
    color: #c8dbbf;
}

html.dark .event-card__rsvp:hover {
    background-color: #8aa37c;
    color: #1a1a1a;
}

html.dark .event-card__edit {
    border-color: #3d4d36;
    color: #c8dbbf;
}

html.dark .event-card__edit:hover {
    background-color: #3d4d36;
    border-color: #8aa37c;
}
</style>
