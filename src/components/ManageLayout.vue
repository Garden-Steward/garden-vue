<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useGardensStore, useAuthStore, useUsageStore } from '@/stores';
import PitchProject from '@/components/modals/PitchProject.vue';

const route = useRoute();
const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
const usageStore = useUsageStore();
const { orgs: usageOrgs } = storeToRefs(usageStore);
watch(user, (currentUser) => {
  if (!currentUser) return;
  gardensStore.getAll();
  usageStore.loadOrgs();
}, { immediate: true });

const showPitch = ref(false);
const pendingPitch = ref(false);
let pitchTrigger = null;
const sidebarOpen = ref(true);
const isMobile = ref(false);
const openButton = ref(null);
const closeButton = ref(null);
const sidebarRole = computed(() => {
  if (isMobile.value) return 'dialog';
  return undefined;
});
const sidebar = ref(null);
const blockedElements = new Map();
let previousBodyOverflow = '';
let backgroundBlocked = false;
let mobileQuery;

const restoreBackground = () => {
  if (!backgroundBlocked) return;
  backgroundBlocked = false;
  for (const [element, wasInert] of blockedElements) {
    element.inert = wasInert;
  }
  blockedElements.clear();
  document.body.style.overflow = previousBodyOverflow;
};

const blockBackground = () => {
  if (backgroundBlocked) return;
  backgroundBlocked = true;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const content = document.querySelector('.manage-shell__content');
  const siblings = document.querySelectorAll('.app-container > :not(.app-viewport)');
  for (const element of [content, ...siblings]) {
    if (!element) continue;
    blockedElements.set(element, element.inert);
    element.inert = true;
  }
};

watch([sidebarOpen, isMobile], async () => {
  if (sidebarOpen.value && isMobile.value) {
    blockBackground();
    await nextTick();
    if (sidebarOpen.value && isMobile.value) closeButton.value?.focus();
  } else {
    restoreBackground();
  }
});

const closeSidebar = async (returnFocus = true) => {
  if (!sidebarOpen.value) return;
  sidebarOpen.value = false;
  await nextTick();
  if (returnFocus) openButton.value?.focus();
};

const openSidebar = async () => {
  if (sidebarOpen.value) return;
  sidebarOpen.value = true;
  await nextTick();
  if (sidebarOpen.value) closeButton.value?.focus();
};

const updateMobile = () => {
  isMobile.value = mobileQuery.matches;
  if (!isMobile.value || !sidebarOpen.value) return;
  if (sidebar.value?.contains(document.activeElement)) {
    closeSidebar();
  } else {
    sidebarOpen.value = false;
  }
};

const openPitch = async (event) => {
  if (!user.value) {
    pendingPitch.value = true;
    if (isMobile.value && sidebarOpen.value) await closeSidebar(false);
    authStore.openLoginModal(route.fullPath);
    return;
  }
  if (event?.currentTarget instanceof HTMLElement) {
    pitchTrigger = event.currentTarget;
  } else if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
    pitchTrigger = document.activeElement;
  } else {
    pitchTrigger = null;
  }
  if (isMobile.value && sidebarOpen.value) closeSidebar(false);
  showPitch.value = true;
};

watch(() => authStore.loginModalOpen, async (open) => {
  if (open || !pendingPitch.value) return;
  pendingPitch.value = false;
  if (user.value) {
    await nextTick();
    openPitch();
  }
});

watch(showPitch, async (open) => {
  await nextTick();
  if (showPitch.value !== open) return;
  if (open) {
    const panel = document.querySelector('#modals .pitch-panel');
    const firstField = panel?.querySelector('form input:not([type="hidden"])');
    if (firstField) {
      firstField.focus();
    } else {
      panel?.querySelector('button')?.focus();
    }
    return;
  }
  if (pitchTrigger?.isConnected && pitchTrigger.getClientRects().length && !pitchTrigger.closest('[inert]')) {
    pitchTrigger.focus();
  } else if (!sidebarOpen.value) {
    openButton.value?.focus();
  } else {
    closeButton.value?.focus();
  }
  pitchTrigger = null;
});

const onKeydown = (event) => {
  if (!sidebarOpen.value || showPitch.value) return;
  if (event.key === 'Escape') {
    if (isMobile.value || sidebar.value?.contains(document.activeElement)) {
      event.preventDefault();
      closeSidebar();
    }
    return;
  }
  if (!isMobile.value || event.key !== 'Tab') return;
  const focusable = [...sidebar.value.querySelectorAll('a[href], button:not([disabled])')].filter(element => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 820px)');
  updateMobile();
  mobileQuery.addEventListener('change', updateMobile);
  document.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  mobileQuery?.removeEventListener('change', updateMobile);
  document.removeEventListener('keydown', onKeydown);
  restoreBackground();
});

const isGardenManager = (g) => (g.managers || []).some(m => (m.id || m) === user.value?.id);
const isGardenVolunteer = (g) => (g.volunteers || []).some(v => (v.id || v) === user.value?.id);
const pitchGardens = computed(() => {
  if (!Array.isArray(gardens.value)) return [];
  return gardens.value.filter(g => isGardenManager(g) || isGardenVolunteer(g));
});

const onPitchCreated = (created) => {
  const key = created?.documentId || created?.id;
  if (key) window.location = `/manage/project/${key}`;
};

const navIconPaths = {
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  project: 'M4 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z',
  leaf: 'M12 20V10 M12 10c0-3-2-5-6-5 0 3 2 5 6 5z M12 10c0-3 2-5 6-5 0 3-2 5-6 5z',
  calendar: 'M8 7V3 M16 7V3 M4 11h16 M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  chart: 'M4 20V11 M10 20V4 M16 20v-6 M3 20h18',
  people: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M22 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  mail: 'M4 5h16v14H4z M4 6l8 7 8-7'
};

const navItems = computed(() => {
  let overviewHref = '/';
  let projectsHref = '/projects';
  let plantsHref;
  if (user.value) {
    overviewHref = '/manage';
    projectsHref = '/manage/projects';
    plantsHref = '/manage/plants';
  }
  const items = [
    { label: 'Overview', icon: 'grid', href: overviewHref, active: route.path === '/manage' || route.path === '/' },
    { label: 'Schedule', icon: 'calendar' },
    { label: 'Projects', icon: 'project', href: projectsHref, active: route.path.startsWith('/manage/project') || route.path === '/projects' },
    { label: 'People', icon: 'people' },
    { label: 'Plants', icon: 'leaf', href: plantsHref, active: route.path.startsWith('/manage/plant') }
  ];
  if (user.value && usageOrgs.value.length) {
    items.push({ label: 'Usage', icon: 'chart', href: '/manage/usage', active: route.path.startsWith('/manage/usage') });
  }
  items.push({ label: 'Events', icon: 'calendar', href: '/events', active: route.path === '/events' });
  items.push({ label: 'Newsletter', icon: 'mail' });
  return items;
});

const pageLabel = computed(() => {
  const labels = { '/': 'Overview', '/manage': 'Overview', '/gardens': 'Gardens', '/projects': 'Projects', '/events': 'Events', '/blog': 'Blog', '/about': 'About' };
  if (labels[route.path]) return labels[route.path];
  if (route.path.startsWith('/manage/')) return route.path.split('/')[2].replace(/^./, letter => letter.toUpperCase());
  return 'Overview';
});

</script>

<template>
  <div class="manage-shell" :class="{ 'manage-shell--collapsed': !sidebarOpen, 'manage-shell--drawer': isMobile && sidebarOpen }">
    <Teleport to="body" :disabled="!isMobile">
      <div v-if="isMobile && sidebarOpen" class="manage-shell__backdrop" aria-hidden="true" @click="closeSidebar"></div>
    </Teleport>
    <div class="manage-shell__grid">
      <Teleport to="body" :disabled="!isMobile">
        <aside v-show="sidebarOpen" id="manage-sidebar" ref="sidebar" class="dash-sidebar" :role="sidebarRole" :aria-modal="isMobile && sidebarOpen" aria-label="Workspace menu">
          <div class="dash-sidebar__head">
            <span class="dash-sidebar__title">Your workspace</span>
            <button ref="closeButton" type="button" class="manage-shell__icon-button" aria-label="Close sidebar" aria-controls="manage-sidebar" :aria-expanded="sidebarOpen" @click="closeSidebar">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 9l-3 3 3 3" /></svg>
            </button>
          </div>
          <nav class="dash-nav" aria-label="Workspace pages">
            <a v-for="item in navItems" :key="item.label" class="dash-nav__item"
              :class="{ 'dash-nav__item--active': item.active, 'dash-nav__item--desktop-only': item.desktopOnly }"
              :href="item.href || undefined" :aria-current="item.active && 'page'">
              <svg class="dash-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path :d="navIconPaths[item.icon]" />
              </svg>
              <span>{{ item.label }}</span>
            </a>
          </nav>
          <div class="dash-sidebar__bottom">
            <button type="button" class="dash-btn dash-sidebar__cta" @click="openPitch">+ Pitch a Project</button>
            <p>East Bay<br>Permaculture Guild</p>
            <span>A little care, close to home.</span>
          </div>
        </aside>
      </Teleport>
      <div class="manage-shell__content">
        <div class="manage-shell__breadcrumb">
          <button v-if="!sidebarOpen" ref="openButton" type="button" class="manage-shell__icon-button" aria-label="Open sidebar" aria-controls="manage-sidebar" :aria-expanded="sidebarOpen" @click="openSidebar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M13 9l3 3-3 3" /></svg>
          </button>
          <span>Your workspace</span><span aria-hidden="true"> / </span><span>{{ pageLabel }}</span>
        </div>
        <div class="manage-shell__main"><slot :open-pitch="openPitch" /></div>
      </div>
    </div>
    <PitchProject v-if="user" v-model="showPitch" :gardens="pitchGardens" @created="onPitchCreated" />
  </div>
</template>

<style scoped>
.manage-shell {
  --manage-paper: var(--gs-paper);
  --manage-ink: var(--gs-ink);
  --manage-muted: var(--gs-muted);
  --manage-rule: var(--gs-rule);
  --manage-sage: var(--gs-sage);
  background: var(--manage-paper);
  min-width: 0;
  min-height: 100%;
}
.manage-shell__grid { display: grid; grid-template-columns: 218px minmax(0, 1fr); align-items: start; min-width: 0; background: var(--manage-sage); color: var(--manage-ink); font-family: var(--gs-body-font); font-size: 18px; line-height: 1.55; }
.manage-shell--collapsed .manage-shell__grid { grid-template-columns: minmax(0, 1fr); }
.manage-shell__content { min-width: 0; min-height: 100vh; background: var(--manage-paper); overflow-wrap: anywhere; }
.manage-shell__main { padding: 42px 45px 55px; }
.manage-shell__breadcrumb { display: flex; align-items: center; gap: 12px; min-height: 61px; padding: 16px 38px; border-bottom: 1px solid var(--manage-rule); color: var(--manage-muted); font-size: 15px; }
.manage-shell__icon-button { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; padding: 6px; color: var(--manage-ink); border: 1px solid var(--manage-rule); background: transparent; cursor: pointer; flex-shrink: 0; }
.manage-shell__icon-button svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
.dash-sidebar {
  --manage-paper: var(--gs-paper);
  --manage-ink: var(--gs-ink);
  --manage-muted: var(--gs-muted);
  --manage-rule: var(--gs-rule);
  --manage-sage: var(--gs-sage);
  color: var(--manage-ink);
  font-family: var(--gs-body-font);
  font-size: 18px;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px 19px;
  background: var(--manage-sage);
  border-right: 1px solid #bdc7ad;
  min-width: 0;
  min-height: 100vh;
  overflow-wrap: anywhere;
}
.dash-sidebar__head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.dash-sidebar__title { font: 400 16px/1.3 var(--gs-body-font); color: var(--manage-muted); }
.dash-nav { display: flex; flex-direction: column; gap: 5px; }
.dash-nav__item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; min-height: 44px; border-radius: 30px; color: var(--manage-ink); font-size: 18px; text-decoration: none; }
.dash-nav__item:hover, .dash-nav__item--active { background: var(--manage-paper); color: var(--manage-ink); }
.dash-nav__item:not([href]) { opacity: .65; cursor: default; }
.dash-nav__icon { width: 21px; height: 21px; flex-shrink: 0; }
.dash-btn { display: inline-flex; justify-content: center; align-items: center; padding: 10px 16px; border: 1px solid var(--manage-ink); font-size: 18px; cursor: pointer; }
.dash-btn--primary { background: var(--manage-ink); color: var(--manage-paper); }
.dash-sidebar__cta { width: 100%; border-color: #869c77; background: transparent; color: var(--manage-ink); font: 400 16px/1.4 var(--gs-body-font); }
.dash-sidebar__cta:hover { background: var(--manage-paper); }
.dash-sidebar__bottom { margin-top: auto; color: var(--manage-muted); }
.dash-sidebar__bottom p { margin: 24px 0 8px; font-size: 21px; line-height: 1.25; color: var(--manage-ink); }
.dash-sidebar__bottom span { font-size: 15px; }
@media (max-width: 1200px) { .manage-shell__main { padding: 35px 30px 50px; } .manage-shell__breadcrumb { padding-left: 30px; padding-right: 30px; } }
.manage-shell__backdrop { display: none; }
@media (max-width: 820px) {
  .manage-shell__grid, .manage-shell--collapsed .manage-shell__grid { grid-template-columns: minmax(0, 1fr); }
  .manage-shell__backdrop { display: block; position: fixed; inset: 0; z-index: 100000; background: rgba(0, 20, 10, .55); }
  .dash-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 100001; width: min(85vw, 350px); min-height: 0; overflow-y: auto; }
  .dash-nav__item--desktop-only { display: none; }
  .manage-shell__breadcrumb { padding: 16px 21px; }
  .manage-shell__main { padding: 30px 21px 40px; }
}
</style>
