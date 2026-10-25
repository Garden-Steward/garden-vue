<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import ManageLayout from '@/components/ManageLayout.vue';
import CalendarExportButton from '@/components/CalendarExportButton.vue';
import { useAuthStore } from '@/stores';
import { fetchWrapper } from '@/helpers';
import { calendarDays, civilDate, pacificDateKey, readConfirmedEventKeys, readScheduleEvents, scheduleTimeZone, shiftCalendar } from '@/helpers/schedule-calendar';

const { user } = storeToRefs(useAuthStore());
const state = ref({ phase: 'loading', events: [] });
const confirmation = ref({ phase: 'idle', keys: new Set() });
const view = ref('month');
const today = ref(pacificDateKey(new Date()));
const anchor = ref(today.value);
const garden = ref('all');
const selected = ref(null);
const dialog = ref(null);
let eventGeneration = 0;
let confirmationGeneration = 0;
let previousTrigger;

async function loadEvents() {
    const generation = ++eventGeneration;
    state.value = { phase: 'loading', events: [] };
    closeEvent();
    try {
        const events = await readScheduleEvents(
            (page, pageSize) => fetchWrapper.get(`${import.meta.env.VITE_API_URL}/api/volunteer-days/public?pagination[page]=${page}&pagination[pageSize]=${pageSize}`),
            () => generation === eventGeneration
        );
        if (generation !== eventGeneration) return;
        state.value = { phase: 'ready', events };
    } catch (error) {
        if (generation !== eventGeneration) return;
        state.value = { phase: 'error', events: [] };
    }
}

async function loadConfirmations(currentUser) {
    const generation = ++confirmationGeneration;
    confirmation.value = { phase: 'idle', keys: new Set() };
    if (!currentUser?.id) return;
    confirmation.value = { phase: 'loading', keys: new Set() };
    try {
        const keys = await readConfirmedEventKeys(
            (page, pageSize) => fetchWrapper.get(`${import.meta.env.VITE_API_URL}/api/volunteer-days?filters[confirmed][id][$eq]=${encodeURIComponent(currentUser.id)}&fields[0]=id&fields[1]=documentId&status=published&pagination[page]=${page}&pagination[pageSize]=${pageSize}`),
            () => generation === confirmationGeneration
        );
        if (generation !== confirmationGeneration) return;
        confirmation.value = { phase: 'ready', keys };
    } catch (error) {
        if (generation !== confirmationGeneration) return;
        confirmation.value = { phase: 'error', keys: new Set() };
    }
}

watch(() => user.value?.id, () => loadConfirmations(user.value), { immediate: true });
loadEvents();
onBeforeUnmount(() => {
    eventGeneration += 1;
    confirmationGeneration += 1;
    dialog.value?.close();
});

const days = computed(() => calendarDays(anchor.value, view.value));
const gardenOptions = computed(() => {
    const options = new Map();
    for (const event of state.value.events) {
        if (event.garden?.slug && event.garden?.title) options.set(event.garden.slug, event.garden.title);
    }
    return [...options].map(([slug, title]) => ({ slug, title })).sort((first, second) => first.title.localeCompare(second.title));
});
const filtered = computed(() => {
    if (garden.value === 'all') return state.value.events;
    return state.value.events.filter(event => event.garden?.slug === garden.value);
});
const eventsByDay = computed(() => {
    const groups = new Map();
    for (const event of filtered.value) {
        if (!groups.has(event.dateKey)) groups.set(event.dateKey, []);
        groups.get(event.dateKey).push(event);
    }
    return groups;
});
const weeks = computed(() => {
    const rows = [];
    for (let index = 0; index < days.value.length; index += 7) rows.push(days.value.slice(index, index + 7));
    return rows;
});
const visibleDays = computed(() => days.value.filter(day => {
    if (view.value === 'month' && day.outside) return false;
    return eventsByDay.value.has(day.key);
}));
const rangeLabel = computed(() => {
    if (view.value === 'month') return civilDate(anchor.value).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const first = days.value[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const last = days.value[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    return `${first} to ${last}`;
});
const previousLabel = computed(() => `Previous ${view.value}`);
const nextLabel = computed(() => `Next ${view.value}`);

function move(direction) {
    today.value = pacificDateKey(new Date());
    anchor.value = shiftCalendar(anchor.value, view.value, direction);
}
function goToToday() {
    today.value = pacificDateKey(new Date());
    anchor.value = today.value;
}
function dayLabel(day) {
    return day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
function weekday(day) {
    return day.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}
function eventTime(event) {
    return new Date(event.startDatetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: scheduleTimeZone, timeZoneName: 'short' });
}
function eventDate(event) {
    return new Date(event.startDatetime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: scheduleTimeZone });
}
function place(event) {
    return event.garden?.title || event.location_name || '';
}
function description(event) {
    if (typeof event.blurb !== 'string') return '';
    return event.blurb.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function isConfirmed(event) {
    return confirmation.value.keys.has(event.documentId);
}
async function openEvent(event, trigger) {
    previousTrigger = trigger.currentTarget;
    selected.value = event;
    await nextTick();
    dialog.value?.showModal();
}
function closeEvent() {
    dialog.value?.close();
}
function onDialogClosed() {
    selected.value = null;
    if (previousTrigger?.isConnected) previousTrigger.focus();
    previousTrigger = null;
}
function closeOnBackdrop(event) {
    if (event.target !== dialog.value) return;
    const bounds = dialog.value.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeEvent();
}
</script>

<template>
    <ManageLayout>
        <main class="schedule-page">
            <header class="schedule-heading">
                <h1>Schedule</h1>
                <p>Plan your next visit. All event times are shown in Pacific time.</p>
            </header>

            <div class="schedule-toolbar">
                <div class="schedule-period">
                    <button type="button" class="schedule-arrow" :aria-label="previousLabel" @click="move(-1)">←</button>
                    <h2 aria-live="polite">{{ rangeLabel }}</h2>
                    <button type="button" class="schedule-arrow" :aria-label="nextLabel" @click="move(1)">→</button>
                    <button type="button" class="schedule-today" @click="goToToday">Today</button>
                </div>
                <div class="schedule-views" role="group" aria-label="Calendar view">
                    <button type="button" :aria-pressed="view === 'month'" @click="view = 'month'">Month</button>
                    <button type="button" :aria-pressed="view === 'week'" @click="view = 'week'">Week</button>
                </div>
            </div>
            <div class="schedule-filter">
                <label for="schedule-garden">Garden</label>
                <select id="schedule-garden" v-model="garden" :disabled="state.phase !== 'ready'">
                    <option value="all">All gardens</option>
                    <option v-for="option in gardenOptions" :key="option.slug" :value="option.slug">{{ option.title }}</option>
                </select>
                <router-link to="/events">See the event timeline ↗</router-link>
            </div>

            <p v-if="state.phase === 'loading'" class="schedule-state" role="status">Loading events…</p>
            <div v-else-if="state.phase === 'error'" class="schedule-state" role="alert">
                <p>Couldn't load the schedule. Try again in a moment.</p>
                <button type="button" class="schedule-action" @click="loadEvents">Try again</button>
            </div>
            <template v-else>
                <p v-if="confirmation.phase === 'error'" class="schedule-confirmation-error" role="status">Your confirmation status couldn't be loaded. <button type="button" @click="loadConfirmations(user)">Try again</button></p>
                <div class="schedule-grid" :class="{ 'schedule-grid--week': view === 'week' }" role="table" :aria-label="`${view} calendar, ${rangeLabel}, Pacific time`">
                    <div class="schedule-weekdays" role="row">
                        <div v-for="name in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="name" role="columnheader">{{ name }}</div>
                    </div>
                    <div class="schedule-days" role="rowgroup">
                        <div v-for="week in weeks" :key="week[0].key" class="schedule-week" role="row">
                        <section v-for="day in week" :key="day.key" class="schedule-day" :class="{ 'schedule-day--outside': view === 'month' && day.outside, 'schedule-day--today': day.key === today }" role="cell" :aria-label="dayLabel(day)">
                            <p class="schedule-day-number"><span v-if="view === 'week'">{{ weekday(day) }} </span>{{ day.day }}<span v-if="day.key === today" class="schedule-sr-only">, today</span></p>
                            <template v-if="view === 'week' || !day.outside">
                                <button v-for="event in eventsByDay.get(day.key) || []" :key="event.documentId" type="button" class="schedule-event" @click="openEvent(event, $event)">
                                    <span class="schedule-event-time">{{ eventTime(event) }}</span>
                                    <strong>{{ event.title }}</strong>
                                    <span v-if="isConfirmed(event)" class="schedule-confirmed">✓ Confirmed</span>
                                </button>
                            </template>
                        </section>
                        </div>
                    </div>
                </div>
                <div class="schedule-agenda" aria-label="Calendar agenda">
                    <section v-for="day in visibleDays" :key="day.key" class="schedule-agenda-day">
                        <h2>{{ dayLabel(day) }}</h2>
                        <button v-for="event in eventsByDay.get(day.key)" :key="event.documentId" type="button" class="schedule-agenda-event" @click="openEvent(event, $event)">
                            <span class="schedule-event-time">{{ eventTime(event) }}<span v-if="place(event)"> · {{ place(event) }}</span></span>
                            <strong>{{ event.title }}</strong>
                            <span v-if="isConfirmed(event)" class="schedule-confirmed">✓ Confirmed</span>
                        </button>
                    </section>
                </div>
                <section v-if="!visibleDays.length" class="schedule-empty">
                    <h2>No events in this view.</h2>
                    <p>Try another month or choose all gardens.</p>
                    <button v-if="garden !== 'all'" type="button" class="schedule-action" @click="garden = 'all'">Show all gardens</button>
                </section>
            </template>

            <Teleport to="body">
                <dialog ref="dialog" class="schedule-dialog" aria-labelledby="schedule-event-title" @close="onDialogClosed" @click="closeOnBackdrop">
                    <template v-if="selected">
                        <button type="button" class="schedule-dialog-close" aria-label="Close event details" @click="closeEvent">×</button>
                        <p class="schedule-dialog-eyebrow">Event details</p>
                        <h2 id="schedule-event-title">{{ selected.title }}</h2>
                        <span v-if="isConfirmed(selected)" class="schedule-confirmed">✓ Confirmed</span>
                        <p>{{ eventDate(selected) }} · {{ eventTime(selected) }}<br>Pacific time · America/Los_Angeles</p>
                        <p v-if="place(selected)">{{ place(selected) }}</p>
                        <p v-if="description(selected)">{{ description(selected) }}</p>
                        <CalendarExportButton :key="selected.id" :event="selected" />
                        <router-link class="schedule-action" :to="`/d/${selected.id}`" @click="closeEvent">Full event details &amp; RSVP ↗</router-link>
                    </template>
                </dialog>
            </Teleport>
        </main>
    </ManageLayout>
</template>

<style scoped>
.schedule-page { min-width: 0; color: var(--gs-ink); font: 18px/1.55 var(--gs-body-font); }
.schedule-heading { margin-bottom: 38px; }
.schedule-heading h1 { margin: 0 0 15px; font: 400 clamp(44px, 4.8vw, 76px)/1.08 var(--gs-heading-font); }
.schedule-heading p { margin: 0; color: var(--gs-muted); font-size: clamp(18px, 1.4vw, 23px); }
.schedule-toolbar, .schedule-period, .schedule-views, .schedule-filter { display: flex; align-items: center; gap: 16px; }
.schedule-toolbar { justify-content: space-between; flex-wrap: wrap; margin-bottom: 22px; }
.schedule-period { flex: 1; flex-wrap: wrap; gap: 12px; }
.schedule-period h2 { margin: 0; font: 400 clamp(26px, 2.3vw, 36px)/1.2 var(--gs-heading-font); }
.schedule-arrow { border: 1px solid var(--gs-rule); background: transparent; color: var(--gs-ink); font-size: 24px; width: 42px; height: 42px; flex-shrink: 0; }
.schedule-today, .schedule-views button { border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; padding: 8px 4px; color: var(--gs-ink); font: inherit; }
.schedule-today { margin-left: 5px; text-decoration: underline; text-underline-offset: 5px; }
.schedule-views button[aria-pressed=true] { border-bottom-color: var(--gs-ink); }
.schedule-filter { margin-bottom: 24px; flex-wrap: wrap; }
.schedule-filter select { background: transparent; border: 1px solid var(--gs-rule); border-radius: 0; padding: 8px 32px 8px 10px; color: var(--gs-ink); font: inherit; max-width: 100%; }
.schedule-filter a { margin-left: auto; color: var(--gs-ink); text-underline-offset: 4px; }
.schedule-grid { border-top: 1px solid var(--gs-rule); border-left: 1px solid var(--gs-rule); }
.schedule-weekdays, .schedule-week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.schedule-weekdays > div { padding: 10px; border-right: 1px solid var(--gs-rule); border-bottom: 1px solid var(--gs-rule); font-size: 15px; }
.schedule-day { min-width: 0; min-height: 128px; padding: 10px 7px; border-right: 1px solid var(--gs-rule); border-bottom: 1px solid var(--gs-rule); }
.schedule-day--outside { background: color-mix(in srgb, var(--gs-sage) 40%, transparent); color: var(--gs-muted); }
.schedule-day--today { box-shadow: inset 0 3px 0 var(--gs-ink); }
.schedule-day-number { margin: 0 0 10px; font-size: 16px; }
.schedule-event { display: block; width: 100%; text-align: left; padding: 9px 8px; margin: 6px 0 0; background: var(--gs-sage); border: 1px solid var(--gs-rule); border-left: 3px solid #7c8c04; border-radius: 2px; color: var(--gs-ink); font: 15px/1.3 var(--gs-body-font); overflow-wrap: anywhere; }
.schedule-event strong, .schedule-agenda-event strong { display: block; font-weight: 400; margin-top: 4px; }
.schedule-event-time { font-size: 13px; color: var(--gs-muted); display: block; }
.schedule-confirmed { display: inline-block; padding: 3px 7px; margin-top: 8px; border: 1px solid #75a365; border-radius: 20px; background: #d7e9d2; color: #024023; font: 14px/1.3 var(--gs-body-font); }
.schedule-grid--week .schedule-day { min-height: 280px; }
.schedule-agenda { display: none; }
.schedule-state, .schedule-empty { padding: 34px 0; border-top: 1px solid var(--gs-rule); }
.schedule-state p, .schedule-empty p { margin: 0 0 18px; color: var(--gs-muted); }
.schedule-empty h2 { margin: 0 0 12px; font: 400 32px/1.2 var(--gs-heading-font); }
.schedule-action { display: inline-block; border: 1px solid var(--gs-ink); padding: 10px 16px; color: var(--gs-paper); background: var(--gs-ink); font: 18px/1.4 var(--gs-body-font); text-decoration: none; border-radius: 2px; }
.schedule-confirmation-error { color: var(--gs-muted); font-size: 16px; }
.schedule-confirmation-error button { background: transparent; border: 0; padding: 0; font: inherit; color: var(--gs-ink); text-decoration: underline; }
.schedule-dialog { position: fixed; inset: 0; width: min(640px, calc(100vw - 36px)); max-height: calc(100vh - 40px); margin: auto; padding: 32px; overflow-y: auto; border: 1px solid var(--gs-rule); border-radius: 2px; background: var(--gs-paper); color: var(--gs-ink); font: 18px/1.55 var(--gs-body-font); }
.schedule-dialog::backdrop { background: rgba(0, 20, 10, .55); }
.schedule-dialog h2 { margin: 10px 24px 18px 0; font: 400 clamp(30px, 3vw, 42px)/1.15 var(--gs-heading-font); overflow-wrap: anywhere; }
.schedule-dialog p { margin: 16px 0; }
.schedule-dialog .schedule-dialog-eyebrow { margin: 0; color: var(--gs-muted); font-size: 15px; }
.schedule-dialog-close { position: absolute; top: 12px; right: 15px; background: transparent; border: 0; color: var(--gs-ink); width: 36px; height: 36px; font: 30px/1 var(--gs-body-font); }
.schedule-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.schedule-page button:focus-visible, .schedule-dialog :focus-visible { outline: 3px solid var(--gs-ink); outline-offset: 3px; }
@media (max-width: 900px) {
    .schedule-toolbar { gap: 18px; }
    .schedule-period { gap: 9px; }
    .schedule-period h2 { order: -1; flex-basis: 100%; }
    .schedule-grid { display: none; }
    .schedule-agenda { display: block; }
    .schedule-agenda-day { padding: 22px 0; border-top: 1px solid var(--gs-rule); }
    .schedule-agenda-day h2 { margin: 0 0 16px; color: var(--gs-muted); font-size: 17px; font-weight: 400; }
    .schedule-agenda-event { width: 100%; display: block; margin: 10px 0 0; padding: 14px; text-align: left; background: transparent; border: 1px solid var(--gs-rule); border-radius: 2px; color: var(--gs-ink); font: 23px/1.3 var(--gs-heading-font); overflow-wrap: anywhere; }
    .schedule-agenda-event .schedule-event-time { font: 16px/1.4 var(--gs-body-font); }
    .schedule-filter a { margin-left: 0; }
}
@media (max-width: 480px) {
    .schedule-heading h1 { font-size: 42px; }
    .schedule-filter { gap: 10px; }
    .schedule-filter select { width: 100%; }
    .schedule-dialog { padding: 25px 22px; }
}
</style>
