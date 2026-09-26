<script setup>
import { computed } from 'vue';
import {
  resolveProjectStatus,
  getProjectStatusOverlayClasses,
  getProjectCategoryOverlayClasses
} from '@/_config/GardenConfig';

// A project linked to a volunteer day. Rendered on the public event page and
// in the event manager — `manage` swaps the link target to the project's
// manage page and shows a remove button.
const props = defineProps({
  project: { type: Object, required: true },
  manage: { type: Boolean, default: false }
});

const emit = defineEmits(['remove']);

const status = computed(() => resolveProjectStatus(props.project));
const isPending = computed(() => props.project?.review_status === 'CREATED');

const imageUrl = computed(() => {
  const img = props.project?.hero_image;
  const url = img?.formats?.small?.url || img?.formats?.medium?.url || img?.url;
  if (!url) return '';
  return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
});

// Pending pitches 404 on the public project page for anyone but their
// managers, so only link out publicly once a project is approved.
const link = computed(() => {
  const p = props.project;
  if (!p) return null;
  if (props.manage) return p.id ? `/manage/project/${p.id}` : null;
  if (isPending.value) return null;
  const gardenSlug = p.garden?.slug;
  return gardenSlug && p.slug ? `/gardens/${gardenSlug}/p/${p.slug}` : null;
});

const formatDate = (value) => {
  if (!value) return null;
  // date-only strings parse as UTC midnight; pin to noon so the day doesn't shift
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const meta = computed(() => {
  const p = props.project;
  const parts = [];
  if (p?.garden?.title) parts.push(p.garden.title);
  const start = formatDate(p?.date_start);
  const end = formatDate(p?.date_end);
  if (start && end) parts.push(`${start} – ${end}`);
  else if (start) parts.push(`Started ${start}`);
  return parts.join(' · ');
});
</script>

<template>
  <article class="ep-card" :class="{ 'ep-card--manage': manage }">
    <component
      :is="link ? 'router-link' : 'div'"
      :to="link || undefined"
      class="ep-photo no-underline"
      :style="imageUrl ? { backgroundImage: `url(${imageUrl})` } : null"
      :aria-label="link ? `Open ${project.title}` : undefined"
    >
      <i v-if="!imageUrl" class="fas fa-seedling ep-photo-fallback" aria-hidden="true"></i>
    </component>

    <div class="ep-body">
      <div class="ep-badges">
        <span :class="getProjectStatusOverlayClasses(status)">{{ status }}</span>
        <span v-if="project.category" :class="getProjectCategoryOverlayClasses(project.category)">
          {{ project.category }}
        </span>
        <span v-if="manage && isPending" class="ep-pending">Awaiting approval</span>
      </div>

      <h3 class="ep-title">
        <router-link v-if="link" :to="link" class="no-underline ep-title-link">{{ project.title }}</router-link>
        <template v-else>{{ project.title }}</template>
      </h3>
      <p v-if="project.short_description" class="ep-desc">{{ project.short_description }}</p>
      <p v-if="meta" class="ep-meta">{{ meta }}</p>

      <div class="ep-actions">
        <router-link v-if="link" :to="link" class="ep-more no-underline">
          {{ manage ? 'Manage project' : 'See the project' }} <span aria-hidden="true">→</span>
        </router-link>
        <button
          v-if="manage"
          type="button"
          class="ep-remove"
          @click="emit('remove', project)"
        >
          Unlink
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.ep-card {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: #fff8f0;
  border: 1px solid #e8d9c4;
  color: #1f2a1c;
}
:global(.dark) .ep-card,
.ep-card--manage {
  background: #2d3e26;
  border-color: #3d4d36;
  color: #f5f5f5;
}

.ep-photo {
  flex: 0 0 auto;
  width: 112px;
  height: 112px;
  border-radius: 0.5rem;
  background-color: #8aa37c;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ep-photo-fallback {
  font-size: 1.75rem;
  color: rgba(255, 255, 255, 0.85);
}

.ep-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ep-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.ep-pending {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0.25rem 0.625rem;
  font-size: 11px;
  font-weight: 700;
  border: 1px dashed currentColor;
  opacity: 0.8;
}
.ep-title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 0;
}
.ep-title-link {
  color: inherit;
}
.ep-title-link:hover {
  text-decoration: underline;
}
.ep-desc {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.4;
  opacity: 0.9;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ep-meta {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}
.ep-actions {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 0.25rem;
}
.ep-more {
  font-weight: 700;
  font-size: 0.9rem;
  color: #4d6b3f;
}
:global(.dark) .ep-more,
.ep-card--manage .ep-more {
  color: #c9d966;
}
.ep-more:hover {
  text-decoration: underline;
}
.ep-remove {
  margin-left: auto;
  font-size: 0.85rem;
  color: #f87171;
}
.ep-remove:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .ep-photo {
    width: 84px;
    height: 84px;
  }
}
</style>
