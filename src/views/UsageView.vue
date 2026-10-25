<script setup>
import { storeToRefs } from 'pinia';
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUsageStore } from '@/stores';
import ManageLayout from '@/components/ManageLayout.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const route = useRoute();
const router = useRouter();
const usageStore = useUsageStore();
const { orgs, orgsLoaded, report, reportLoading, reportNotFound, reportError } = storeToRefs(usageStore);

const selectedId = computed(() => route.query.org || orgs.value[0]?.documentId || null);
const selectedKnown = computed(() => orgs.value.some((o) => o.documentId === selectedId.value));

// Registered in setup (not after an await) so Vue stops it on unmount.
// Waits for the org list so the default org is known before the first load.
watch([selectedId, orgsLoaded], ([id, loaded]) => {
    if (loaded && id) usageStore.loadReport(id, 6);
}, { immediate: true });

onMounted(() => usageStore.loadOrgs());

const retry = () => {
    if (selectedId.value) usageStore.loadReport(selectedId.value, 6);
};

const onPick = (event) => {
    router.replace({ query: { ...route.query, org: event.target.value } });
};

const monthLabel = (period) => {
    const [y, m] = String(period).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    });
};

const resetLabel = computed(() => (report.value?.resetsAt
    ? new Date(report.value.resetsAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    })
    : ''));

const meteringLabel = computed(() => (report.value?.meteringStartedAt
    ? new Date(`${report.value.meteringStartedAt}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
    })
    : ''));

const used = computed(() => report.value?.current.units || 0);
const free = computed(() => report.value?.freeUnits || 500);
const isOver = computed(() => used.value > free.value);
const barWidth = computed(() => `${Math.min(100, (used.value / free.value) * 100)}%`);

const categoryRows = computed(() => {
    const c = report.value?.current.byCategory;
    return [
        { key: 'broadcast', label: 'Broadcasts', units: c?.broadcast.units || 0 },
        { key: 'reminder', label: 'Reminders', units: c?.reminder.units || 0 },
        { key: 'transactional', label: 'Replies & transactional', units: c?.transactional.units || 0 }
    ];
});
</script>

<template>
  <ManageLayout>
    <div class="usage-page">
      <div v-if="!orgsLoaded || reportLoading">
        <LoadingSpinner :centered="true" size="md" />
      </div>

      <div v-else-if="reportNotFound" class="usage-card usage-empty">
        <h1 class="usage-title">Organization not found</h1>
        <p class="usage-muted"><a href="/manage" class="usage-link">Back to your dashboard</a></p>
      </div>

      <div v-else-if="reportError" class="usage-card usage-empty">
        <p class="usage-muted">Couldn't load usage right now.</p>
        <button type="button" class="usage-link" @click="retry">Try again</button>
      </div>

      <div v-else-if="orgs.length === 0 && !route.query.org" class="usage-card usage-empty">
        <p class="usage-muted">You don't manage any gardens that belong to an organization</p>
      </div>

      <template v-else-if="report">
        <header class="usage-header">
          <div>
            <h1 class="usage-title">{{ report.organization?.title || 'Organization' }}</h1>
            <p class="usage-muted">SMS usage, {{ monthLabel(report.period) }} (UTC)</p>
          </div>
          <select
            v-if="orgs.length > 1"
            class="usage-select"
            :value="selectedId"
            aria-label="Organization"
            @change="onPick"
          >
            <option v-if="!selectedKnown" :value="selectedId">(other)</option>
            <option v-for="o in orgs" :key="o.documentId" :value="o.documentId">
              {{ o.title || 'Untitled organization' }}
            </option>
          </select>
        </header>

        <section class="usage-card">
          <div class="usage-meter-label">
            <span class="usage-big">{{ used }} of {{ free }} free texts this month</span>
            <span v-if="isOver" class="usage-over-tag">Over the free tier</span>
          </div>
          <div class="usage-meter" role="progressbar" :aria-valuenow="used" aria-valuemin="0" :aria-valuemax="free">
            <div class="usage-meter__fill" :class="{ 'usage-meter--over': isOver }" :style="{ width: barWidth }"></div>
          </div>
          <p v-if="report.enforced === false" class="usage-notice">
            For your information only. Nothing is paused or charged yet.
          </p>
          <p class="usage-muted">Resets on {{ resetLabel }} (UTC)</p>
        </section>

        <h2 class="usage-heading">By category</h2>
        <section class="usage-card">
          <ul class="usage-list">
            <li v-for="row in categoryRows" :key="row.key" class="usage-row">
              <span>{{ row.label }}</span>
              <span class="usage-num">{{ row.units }} texts</span>
            </li>
          </ul>
          <p class="usage-muted usage-small">
            Login codes &amp; system texts (not counted): {{ report.current.nonBillable.units }}
          </p>
        </section>

        <h2 class="usage-heading">By garden</h2>
        <section class="usage-card">
          <table class="usage-table">
            <thead>
              <tr><th>Garden</th><th class="usage-right">Texts</th></tr>
            </thead>
            <tbody>
              <tr v-for="g in report.current.byGarden" :key="g.gardenDocumentId || 'unassigned'">
                <td>{{ g.title === null ? 'Unassigned' : g.title }}</td>
                <td class="usage-right usage-num">{{ g.units }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <h2 class="usage-heading">History</h2>
        <section class="usage-card">
          <table class="usage-table">
            <thead>
              <tr><th>Month</th><th class="usage-right">Texts</th></tr>
            </thead>
            <tbody>
              <tr v-for="h in report.history" :key="h.period">
                <td>
                  {{ monthLabel(h.period) }}
                  <span v-if="h.partial" class="usage-tag">Partial: metering began {{ meteringLabel }}</span>
                </td>
                <td class="usage-right usage-num">{{ h.units }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <p class="usage-muted usage-small usage-footnote">
          A long text or a picture message counts as more than one text.
        </p>
      </template>
    </div>
  </ManageLayout>
</template>

<style scoped>
.usage-page {
    max-width: 64rem;
    color: var(--gs-ink);
    font: 18px/1.55 var(--gs-body-font);
    overflow-wrap: anywhere;
}

.usage-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
}

.usage-title {
    font-family: var(--gs-heading-font);
    font-size: clamp(42px, 4.8vw, 72px);
    font-weight: 400;
    color: var(--gs-ink);
    line-height: 1.08;
    letter-spacing: -0.02em;
    margin: 0 0 0.35rem;
}

.usage-heading {
    font-family: var(--gs-heading-font);
    font-size: 2rem;
    font-weight: 400;
    color: var(--gs-ink);
    margin: 1.75rem 0 0.85rem;
}

.usage-muted {
    color: var(--gs-muted);
    margin: 0;
}

.usage-small {
    font-size: 0.875rem;
    margin-top: 0.75rem;
}

.usage-footnote {
    margin-top: 1.5rem;
}

.usage-link {
    color: var(--gs-ink);
    text-decoration: underline;
}

.usage-card {
    background: var(--gs-sage);
    border: 1px solid var(--gs-rule);
    border-radius: 0;
    padding: clamp(18px, 2vw, 26px);
}

.usage-empty {
    text-align: center;
}

.usage-select {
    padding: 0.5rem 0.9rem;
    max-width: 100%;
    border-radius: 0;
    border: 1px solid var(--gs-rule);
    background: var(--gs-paper);
    color: var(--gs-ink);
    font-family: var(--gs-body-font);
    font-weight: 600;
}

.usage-meter-label {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
}

.usage-big {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--gs-ink);
}

.usage-over-tag {
    font-size: 0.85rem;
    font-weight: 700;
    color: #c1272d;
}

.usage-meter {
    height: 0.85rem;
    border-radius: 0;
    background: var(--gs-paper);
    overflow: hidden;
}

.usage-meter__fill {
    height: 100%;
    border-radius: 0;
    background: var(--gs-ink);
    transition: width 0.3s ease;
}

.usage-meter__fill.usage-meter--over {
    background: #F2AB27;
}

.usage-notice {
    margin: 0.85rem 0 0.35rem;
    color: var(--gs-ink);
    font-size: 0.95rem;
}

.usage-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.usage-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--gs-rule);
}

.usage-row:last-child {
    border-bottom: 0;
}

.usage-num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.usage-table {
    width: 100%;
    border-collapse: collapse;
}

.usage-table th {
    text-align: left;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--gs-muted);
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--gs-rule);
}

.usage-table td {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--gs-rule);
}

.usage-table tr:last-child td {
    border-bottom: 0;
}

.usage-right {
    text-align: right !important;
    white-space: nowrap;
}

.usage-table .usage-right {
    width: 1%;
    padding-left: 1rem;
}

.usage-tag {
    display: inline-block;
    margin-left: 0.5rem;
    padding: 0.1rem 0.55rem;
    border-radius: 0;
    background: var(--gs-paper);
    color: var(--gs-ink);
    font-size: 0.75rem;
    font-weight: 600;
}

.usage-select:focus-visible,
.usage-link:focus-visible {
    outline: 2px solid var(--gs-ink);
    outline-offset: 4px;
}
</style>

<style>
html.dark .usage-title,
html.dark .usage-heading,
html.dark .usage-big,
html.dark .usage-link {
    color: #c8dbbf;
}

html.dark .usage-muted,
html.dark .usage-table th {
    color: #a0a8a0;
}

html.dark .usage-card {
    background-color: #344a34;
    border-color: #3d4d36;
    color: #f5f5f5;
}

html.dark .usage-notice {
    color: #c2cbbb;
}

html.dark .usage-select {
    background-color: #344a34;
    border-color: #8aa37c;
    color: #c8dbbf;
}

html.dark .usage-meter {
    background-color: #3d4d36;
}

html.dark .usage-meter__fill {
    background-color: #8aa37c;
}

html.dark .usage-meter__fill.usage-meter--over {
    background-color: #f59e0b;
}

html.dark .usage-over-tag {
    color: #f59e0b;
}

html.dark .usage-row,
html.dark .usage-table th,
html.dark .usage-table td {
    border-color: #3d4d36;
}

html.dark .usage-tag {
    background-color: rgba(138, 163, 124, 0.25);
    color: #c8dbbf;
}
</style>
