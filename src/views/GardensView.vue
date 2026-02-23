<script setup>
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

import { useAuthStore, useGardensStore, useEventStore } from '@/stores';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
const eventStore = useEventStore();
const { volunteerDays } = storeToRefs(eventStore);
gardensStore.getAll(user.value.id);
eventStore.getUserEvents();

const rowClick = (slug) => {
    window.location=`/manage/gardens/${slug}`
}

const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

const manageEventClick = (id) => {
    window.location=`/manage/events/${id}/edit`
}

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

// Gardens the user is neither a manager nor a volunteer of
const otherGardens = computed(() => {
    if (!gardens.value || !Array.isArray(gardens.value) || !user.value) return [];
    return gardens.value.filter(g => !isManager(g) && !isVolunteer(g));
});

// Get all garden IDs where the user is a manager (from gardens store)
const managedGardenIds = computed(() => {
    return managedGardens.value.map(garden => garden.id);
});

// Filter events to only show those where the user is a manager
const manageableEvents = computed(() => {
    if (!volunteerDays.value?.days || !Array.isArray(volunteerDays.value.days) || !user.value || managedGardenIds.value.length === 0) {
        return [];
    }

    return volunteerDays.value.days
        .map(normalizeEvent)
        .filter(event => {
            const garden = event.garden?.data || event.garden;
            if (!garden) return false;

            let gardenId = null;
            if (typeof garden === 'number') {
                gardenId = garden;
            } else if (garden.id) {
                gardenId = garden.id;
            } else if (garden.attributes?.id) {
                gardenId = garden.attributes.id;
            }

            return gardenId && managedGardenIds.value.includes(gardenId);
        });
});

// Separate into upcoming and recent (past) events
const upcomingEvents = computed(() => {
    const now = new Date();
    return manageableEvents.value
        .filter(event => {
            if (!event.startDatetime) return false;
            return new Date(event.startDatetime) >= now;
        })
        .sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
});

// Get displayed upcoming events (limited by upcomingEventsToShow)
const displayedUpcomingEvents = computed(() => {
    return upcomingEvents.value.slice(0, upcomingEventsToShow.value);
});

// Check if there are more upcoming events to load
const hasMoreUpcomingEvents = computed(() => {
    return upcomingEvents.value.length > upcomingEventsToShow.value;
});

// Load more upcoming events
const loadMoreUpcomingEvents = () => {
    upcomingEventsToShow.value += 2;
};

// Get all past events (sorted by most recent first)
const allPastEvents = computed(() => {
    const now = new Date();
    return manageableEvents.value
        .filter(event => {
            if (!event.startDatetime) return false;
            return new Date(event.startDatetime) < now;
        })
        .sort((a, b) => new Date(b.startDatetime) - new Date(a.startDatetime));
});

// Get displayed latest events (limited by latestEventsToShow)
const latestEvents = computed(() => {
    return allPastEvents.value.slice(0, latestEventsToShow.value);
});

// Check if there are more events to load
const hasMoreLatestEvents = computed(() => {
    return allPastEvents.value.length > latestEventsToShow.value;
});

// Load more latest events
const loadMoreLatestEvents = () => {
    latestEventsToShow.value += 2;
};
</script>

<template>
    <div class="bg-custom-light p-5 rounded-lg mx-auto">
        <h1 class="text-lg font-bold mb-5">Hi {{user?.firstName}}!</h1>

        <!-- Gardens You Manage -->
        <h3 class="text-2xl font-bold mb-2 mt-4">Gardens you Manage ({{ managedGardens.length }})</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2" v-if="managedGardens.length">
            <div v-for="garden in managedGardens" :key="garden.id"
                class="garden-card garden-card--managed"
                @click="rowClick(garden.attributes.slug)">
                <span class="text-xl font-bold">{{ garden.attributes?.title }}</span>
                <p class="text-m mb-2">{{ garden.attributes?.blurb }}</p>
                <p class="text-m">Managers: {{ garden.attributes?.managers?.data?.length }}</p>
            </div>
            <a class="garden-card garden-card--managed hover:no-underline" href="/apply">
                <span class="text-5xl font-bold">+</span>
                <p class="text-m mb-2">Apply for a new garden</p>
            </a>
        </div>
        <div v-else-if="!gardens.loading" class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <p class="text-gray-500 italic m-3">You are not managing any gardens yet.</p>
            <a class="garden-card garden-card--managed hover:no-underline" href="/apply">
                <span class="text-5xl font-bold">+</span>
                <p class="text-m mb-2">Apply for a new garden</p>
            </a>
        </div>

        <!-- Gardens You Are a Member Of -->
        <h3 class="text-2xl font-bold mb-2 mt-6">Gardens you are a member of ({{ memberGardens.length }})</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2" v-if="memberGardens.length">
            <div v-for="garden in memberGardens" :key="garden.id"
                class="garden-card garden-card--greyed">
                <span class="text-xl font-bold">{{ garden.attributes?.title }}</span>
                <p class="text-m mb-2">{{ garden.attributes?.blurb }}</p>
                <p class="text-m">Managers: {{ garden.attributes?.managers?.data?.length }}</p>
            </div>
        </div>
        <p v-else-if="!gardens.loading" class="text-gray-500 italic m-3">You are not a member of any other gardens.</p>

        <!-- Other Gardens -->
        <h3 class="text-2xl font-bold mb-2 mt-6">Other Gardens ({{ otherGardens.length }})</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2" v-if="otherGardens.length">
            <div v-for="garden in otherGardens" :key="garden.id"
                class="garden-card garden-card--greyed">
                <span class="text-xl font-bold">{{ garden.attributes?.title }}</span>
                <p class="text-m mb-2">{{ garden.attributes?.blurb }}</p>
                <p class="text-m">Managers: {{ garden.attributes?.managers?.data?.length }}</p>
            </div>
        </div>
        <p v-else-if="!gardens.loading" class="text-gray-500 italic m-3">No other gardens found.</p>

        <!-- Upcoming Events and Latest Events -->
        <section v-if="upcomingEvents.length > 0 || latestEvents.length > 0" class="garden-section two-column-section mt-6">
            <div class="two-column-layout">
                <!-- Left: Upcoming Events -->
                <div class="column-content">
                    <h2 v-if="upcomingEvents.length > 0" class="section-title">Upcoming Events</h2>
                    <div v-if="upcomingEvents.length > 0" class="events-list">
                        <div
                            v-for="event in displayedUpcomingEvents"
                            :key="event.id"
                            class="event-item"
                            @click="manageEventClick(event.id)"
                        >
                            <div class="event-link">
                                <h3 class="event-title">{{ event.title }}</h3>
                                <p class="event-date">{{ formatDate(event.startDatetime) }}</p>
                                <div v-if="event.blurb" class="event-description" v-html="event.blurb"></div>
                            </div>
                        </div>
                    </div>
                    <button
                        v-if="upcomingEvents.length > 0 && hasMoreUpcomingEvents"
                        @click="loadMoreUpcomingEvents"
                        class="btn-load-more"
                    >
                        Load More
                    </button>

                    <div v-if="upcomingEvents.length === 0 && latestEvents.length === 0 && !volunteerDays.loading" class="section-empty">
                        <p>No events scheduled at this time.</p>
                    </div>
                </div>

                <!-- Right: Latest Events -->
                <div class="column-content">
                    <div v-if="latestEvents.length > 0">
                        <h2 class="section-title">
                            <span v-if="upcomingEvents.length > 0">Latest Events</span>
                            <span v-else>Events</span>
                        </h2>
                        <div class="events-list">
                            <div
                                v-for="event in latestEvents"
                                :key="event.id"
                                class="event-item"
                                @click="manageEventClick(event.id)"
                            >
                                <div class="event-link">
                                    <h3 class="event-title">{{ event.title }}</h3>
                                    <p class="event-date">{{ formatDate(event.startDatetime) }}</p>
                                    <div v-if="event.blurb" class="event-description" v-html="event.blurb"></div>
                                </div>
                            </div>
                        </div>
                        <button
                            v-if="hasMoreLatestEvents"
                            @click="loadMoreLatestEvents"
                            class="btn-load-more"
                        >
                            Load More
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <div v-if="gardens.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="gardens.error" class="text-danger">Error loading gardens: {{gardens.error}}</div>
    </div>
</template>

<style scoped>
/* Garden Cards */
.garden-card {
    margin: 0.75rem;
    padding: 1rem;
    border-right-width: 4px;
    border-width: 1px;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.garden-card--managed {
    background-color: white;
    border-color: #e5e7eb;
}

.garden-card--managed:hover {
    opacity: 0.7;
    background-color: #fde047;
}

.garden-card--greyed {
    background-color: #f3f4f6;
    border-color: #d1d5db;
    opacity: 0.6;
    color: #6b7280;
    cursor: default;
}

.garden-card--greyed .text-xl {
    color: #6b7280;
}

/* Sections */
.garden-section {
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 16px;
    padding: 40px 50px;
    margin-bottom: 30px;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

/* Two-column section with dark green background */
.two-column-section {
    background-color: rgba(108, 138, 106, 0.15);
}

.two-column-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 50px;
}

.column-content {
    min-width: 0; /* Allow content to shrink */
}

.garden-section .section-title,
.section-title {
    font-size: 1.75rem;
    font-weight: 300;
    font-family: Georgia, "Times New Roman", Times, serif;
    margin-bottom: 24px;
    color: #344a34 !important;
}

.section-empty {
    color: #888;
    font-style: italic;
}

/* Events List */
.events-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.event-item {
    border-left: 4px solid #8aa37c;
    padding: 12px 20px;
    margin: 0 -20px;
    border-radius: 8px;
    transition: all 0.3s ease;
    cursor: pointer;
    background-color: rgba(138, 163, 124, 0.1);
}

.event-item:hover {
    background-color: rgba(108, 138, 106, 0.25);
}

.event-link {
    display: block;
    text-decoration: none;
    transition: all 0.3s ease;
    color: inherit;
}

.event-item .event-title,
.event-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: #344a34 !important;
}

.event-link:hover .event-title {
    color: #8aa37c;
}

.event-item .event-date,
.event-date {
    font-size: 1rem;
    color: #FFFFFF !important;
    margin-bottom: 12px;
}

.event-description {
    color: #4a4a4a;
    margin-top: 8px;
}

.btn-load-more {
    display: inline-block;
    padding: 8px 16px;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    border-radius: 6px;
    transition: all 0.3s ease;
    background-color: transparent;
    color: #8aa37c;
    border: 1px solid #8aa37c;
    cursor: pointer;
    margin-top: 12px;
}

.btn-load-more:hover {
    background-color: #8aa37c;
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(138, 163, 124, 0.3);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .garden-section {
        padding: 24px;
    }
    
    .two-column-layout {
        grid-template-columns: 1fr;
        gap: 30px;
    }
}
</style>
