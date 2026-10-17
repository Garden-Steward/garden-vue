<script setup>
/**
 * The strip that makes a page read as a section of its garden's site:
 * breadcrumb, garden identity, and the garden's section tabs.
 *
 * Sections on the garden page are anchors (#about, #projects, #events), so
 * the tabs link there; GardenPublic scrolls to the hash once it loads.
 */
import { computed } from 'vue';

const props = defineProps({
  garden: { type: Object, required: true },
  // Which tab is current: 'about' | 'projects' | 'events' | 'tasks' | null
  current: { type: String, default: null },
  // The page's own title, shown as the last breadcrumb
  pageTitle: { type: String, default: '' },
});

const base = computed(() => `/gardens/${props.garden.slug}`);

const tabs = computed(() => [
  { key: 'about', label: 'About', to: `${base.value}#about` },
  { key: 'projects', label: 'Projects', to: `${base.value}#projects` },
  { key: 'events', label: 'Events', to: `${base.value}#events` },
  { key: 'tasks', label: 'Tasks', to: `${base.value}/tasks` },
]);

const sectionLabel = computed(() => tabs.value.find((t) => t.key === props.current)?.label);
const sectionLink = computed(() => tabs.value.find((t) => t.key === props.current)?.to);

const thumb = computed(() => props.garden.hero_image?.formats?.thumbnail?.url || props.garden.hero_image?.url || null);

const subtitle = computed(() => [props.garden.organization?.title].filter(Boolean).join(' · '));
</script>

<template>
  <div class="gp-ctx">
    <div class="gp-ctx-inner">
      <nav class="gp-ctx-crumbs" aria-label="Breadcrumb">
        <router-link to="/gardens">Gardens</router-link>
        <span aria-hidden="true">/</span>
        <router-link :to="base">{{ garden.title }}</router-link>
        <template v-if="sectionLabel">
          <span aria-hidden="true">/</span>
          <router-link :to="sectionLink">{{ sectionLabel }}</router-link>
        </template>
        <template v-if="pageTitle">
          <span aria-hidden="true">/</span>
          <span class="gp-ctx-crumb-current" aria-current="page">{{ pageTitle }}</span>
        </template>
      </nav>

      <div class="gp-ctx-row">
        <router-link :to="base" class="gp-ctx-garden">
          <img v-if="thumb" :src="thumb" alt="" class="gp-ctx-thumb" />
          <span v-else class="gp-ctx-thumb gp-ctx-thumb--empty" aria-hidden="true">
            <svg class="gp-icon" viewBox="0 0 24 24"><path d="M12 21V11" /><path d="M12 11C12 6 8 4 4 4c0 5 3 7 8 7z" /><path d="M12 13c0-4 3-6 8-6 0 4-3 6-8 6z" /></svg>
          </span>
          <span class="gp-ctx-name">
            <span class="gp-ctx-title">{{ garden.title }}</span>
            <span v-if="subtitle" class="gp-ctx-sub">{{ subtitle }}</span>
          </span>
        </router-link>

        <nav class="gp-ctx-tabs" aria-label="Garden sections">
          <router-link
            v-for="tab in tabs"
            :key="tab.key"
            :to="tab.to"
            class="gp-ctx-tab"
            :class="{ 'gp-ctx-tab--current': tab.key === current }"
            :aria-current="tab.key === current ? 'page' : undefined"
          >{{ tab.label }}</router-link>
          <router-link :to="base" class="gp-ctx-tab gp-ctx-visit">
            Visit garden
            <svg class="gp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </router-link>
        </nav>
      </div>
    </div>
  </div>
</template>

<style>
.gp-ctx {
  background-color: #f3ece0;
  border-bottom: 1px solid #e0d6c4;
  font-family: Roboto, system-ui, sans-serif;
}

.dark .gp-ctx {
  background-color: #344a34;
  border-bottom-color: #3d4d36;
}

.gp-ctx-inner {
  box-sizing: border-box;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 24px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gp-ctx-crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.8125rem;
  color: #4b5563;
}

.gp-ctx-crumbs a,
.gp-ctx-crumbs a:hover {
  color: #4b5563;
  text-decoration: none;
}

.gp-ctx-crumbs a:hover {
  text-decoration: underline;
}

.gp-ctx-crumb-current {
  color: #1f2a1f;
  font-weight: 700;
}

.dark .gp-ctx-crumbs,
.dark .gp-ctx-crumbs a {
  color: #a8b89e;
}

.dark .gp-ctx-crumb-current {
  color: #f5f5f5;
}

.gp-ctx-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 24px;
}

.gp-ctx-garden,
.gp-ctx-garden:hover {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  color: #1f2a1f;
  text-decoration: none;
}

.gp-ctx-thumb {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ffffff;
}

.gp-ctx-thumb--empty {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #6c8a6a;
  color: #f7f1e3;
}

.gp-ctx-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.gp-ctx-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 700;
  font-size: 1.375rem;
  line-height: 1.1;
  color: #376451;
}

.gp-ctx-sub {
  font-size: 0.8125rem;
  color: #4b5563;
}

.dark .gp-ctx-title {
  color: #f5f5f5;
}

.dark .gp-ctx-sub {
  color: #a8b89e;
}

.gp-ctx-tabs {
  display: flex;
  flex-wrap: wrap;
  align-self: flex-end;
  gap: 2px;
}

.gp-ctx-tab,
.gp-ctx-tab:hover {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 14px;
  border-bottom: 3px solid transparent;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #4b5563;
  text-decoration: none;
}

.gp-ctx-tab:hover {
  color: #064e3b;
}

.gp-ctx-tab--current,
.gp-ctx-tab--current:hover {
  color: #064e3b;
  border-bottom-color: #064e3b;
}

.gp-ctx-visit,
.gp-ctx-visit:hover {
  color: #064e3b;
}

.gp-ctx-visit .gp-icon {
  width: 16px;
  height: 16px;
}

.dark .gp-ctx-tab {
  color: #a8b89e;
}

.dark .gp-ctx-tab--current,
.dark .gp-ctx-visit,
.dark .gp-ctx-tab:hover {
  color: #c5d4b8;
  border-bottom-color: currentColor;
}

.dark .gp-ctx-visit {
  border-bottom-color: transparent;
}

.gp-ctx-tab:focus-visible,
.gp-ctx-garden:focus-visible {
  outline: 3px solid #8aa37c;
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .gp-ctx-inner {
    padding: 10px 16px 0;
  }

  .gp-ctx-tabs {
    align-self: stretch;
    flex-wrap: nowrap;
    overflow-x: auto;
    margin: 0 -16px;
    padding: 0 6px;
  }

  .gp-ctx-tab {
    padding: 0 10px;
    white-space: nowrap;
  }

  .gp-ctx-visit {
    display: none;
  }
}
</style>
