<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useGardensStore, useAuthStore } from '@/stores';
import PitchProject from '@/components/modals/PitchProject.vue';

/*
 * Shared shell for the authenticated "manage" area: the left sidebar (nav +
 * Pitch a Project CTA) and the outer page background. Pages render their own
 * content into the default slot; the slot is given an `openPitch` handler so
 * in-page buttons can trigger the same pitch modal the sidebar owns.
 */
const route = useRoute();
const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

// Gardens are needed for the pitch modal's association dropdown on every page.
gardensStore.getAll();

const showPitch = ref(false);
const openPitch = () => { showPitch.value = true; };

const isGardenManager = (g) => (g.attributes?.managers?.data || []).some(m => (m.id || m) === user.value?.id);
const isGardenVolunteer = (g) => (g.attributes?.volunteers?.data || []).some(v => (v.id || v) === user.value?.id);
const pitchGardens = computed(() =>
  Array.isArray(gardens.value) ? gardens.value.filter(g => isGardenManager(g) || isGardenVolunteer(g)) : []
);

const onPitchCreated = (created) => {
  if (created?.id) window.location = `/manage/project/${created.id}`;
};

const navIconPaths = {
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  project: 'M4 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z',
  leaf: 'M12 20V10 M12 10c0-3-2-5-6-5 0 3 2 5 6 5z M12 10c0-3 2-5 6-5 0 3-2 5-6 5z',
  tasks: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 012-2h2a2 2 0 012 2v1H9z M9 13l2 2 4-4',
  calendar: 'M8 7V3 M16 7V3 M4 11h16 M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z'
};

const navItems = computed(() => [
  { label: 'Dashboard', icon: 'grid', href: '/manage', active: route.path === '/manage' },
  { label: 'Projects', icon: 'project', href: '/manage/projects', active: route.path.startsWith('/manage/project') },
  { label: 'Gardens', icon: 'leaf', href: '/gardens', active: route.path.startsWith('/gardens') || route.path.startsWith('/manage/gardens'), desktopOnly: true },
  { label: 'Tasks', icon: 'tasks', active: false, desktopOnly: true },
  { label: 'Events', icon: 'calendar', active: false, desktopOnly: true }
]);
</script>

<template>
  <div class="manage-shell">
    <div class="manage-shell__grid">
      <!-- Sidebar -->
      <aside class="dash-sidebar">
        <div class="dash-sidebar__head">
          <h2 class="dash-sidebar__title">Your Dashboard</h2>
          <p class="dash-sidebar__subtitle">Steward</p>
        </div>
        <nav class="dash-nav">
          <a
            v-for="item in navItems"
            :key="item.label"
            class="dash-nav__item"
            :class="{ 'dash-nav__item--active': item.active, 'dash-nav__item--desktop-only': item.desktopOnly }"
            :href="item.href || undefined"
          >
            <svg class="dash-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path :d="navIconPaths[item.icon]" />
            </svg>
            <span>{{ item.label }}</span>
          </a>
        </nav>
        <button type="button" class="dash-btn dash-btn--primary dash-sidebar__cta" @click="openPitch">
          + Pitch a Project
        </button>
      </aside>

      <!-- Page content -->
      <div class="manage-shell__content">
        <slot :open-pitch="openPitch" />
      </div>
    </div>

    <PitchProject v-model="showPitch" :gardens="pitchGardens" @created="onPitchCreated" />
  </div>
</template>

<style scoped>
.manage-shell {
  background-color: #f7f1e3;
  border-radius: 16px;
  padding: 1.75rem 1.5rem;
  margin: 0 auto;
  min-height: 100%;
}

.manage-shell__grid {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.manage-shell__content {
  min-width: 0;
}

@media (max-width: 820px) {
  .manage-shell__grid {
    grid-template-columns: 1fr;
  }

  .dash-sidebar {
    position: static;
    min-height: unset;
  }

  .dash-nav__item--desktop-only {
    display: none;
  }
}

/* ── Sidebar ── */
.dash-sidebar {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background-color: rgba(108, 138, 106, 0.1);
  border: 1px solid #e2dccb;
  border-radius: 14px;
  padding: 1.25rem 1rem;
  min-height: 70vh;
}

.dash-sidebar__title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #344a34;
  margin: 0;
}

.dash-sidebar__subtitle {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0.15rem 0 0;
}

.dash-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dash-nav__item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.75rem;
  border-radius: 0.6rem;
  color: #4a5a45;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.dash-nav__item:hover {
  background-color: rgba(138, 163, 124, 0.18);
}

.dash-nav__item--active {
  background-color: #d7e8c8;
  color: #2f5233;
}

.dash-nav__icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.dash-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.dash-btn--primary {
  background-color: #86b153;
  color: #1f2a14;
}

.dash-btn--primary:hover {
  background-color: #97c264;
}

.dash-sidebar__cta {
  width: 100%;
  margin-top: auto;
}
</style>

<style>
html.dark .manage-shell {
  background-color: #2d3e26;
}

html.dark .dash-sidebar {
  background-color: rgba(255, 255, 255, 0.04);
  border-color: #3d4d36;
}

html.dark .dash-sidebar__title {
  color: #c8dbbf;
}

html.dark .dash-sidebar__subtitle {
  color: #a0a8a0;
}

html.dark .dash-nav__item {
  color: #c2cbbb;
}

html.dark .dash-nav__item:hover {
  background-color: rgba(138, 163, 124, 0.18);
}

html.dark .dash-nav__item--active {
  background-color: rgba(138, 163, 124, 0.3);
  color: #e6f0db;
}
</style>
