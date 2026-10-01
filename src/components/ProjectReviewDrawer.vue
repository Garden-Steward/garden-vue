<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import MarkdownIt from 'markdown-it';
import StaticPinMap from '@/components/StaticPinMap.vue';
import ProjectDecisionBar from '@/components/ProjectDecisionBar.vue';
import { useProjectsStore, useAlertStore } from '@/stores';
import { normalizeReviewStatus } from '@/_config/GardenConfig';
import {
  categoryLook, imageStyle, personName, firstName, initials, avatarStyle, timeAgo
} from '@/helpers/project-review';

/*
 * Review drawer (design boards 1d–1h). Opens over the Projects list with the
 * public preview first and the decision bar last. Approve & next, Request
 * changes and Deny all call the review endpoint; the pitcher isn't emailed
 * until the undo window closes, so Undo here really takes it back.
 * Below 768px it becomes a full-screen sheet.
 */
const props = defineProps({
  // Pending (CREATED) projects, oldest first.
  queue: { type: Array, required: true },
  currentId: { type: Number, default: null },
  garden: { type: Object, required: true },
  // Every project on the garden, for the pitcher's history.
  allProjects: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:currentId', 'close', 'decided', 'undone']);

const projectsStore = useProjectsStore();
const alertStore = useAlertStore();
const md = new MarkdownIt();

const busy = ref(false);
const toast = ref(null); // { text, projectId }

const index = computed(() => props.queue.findIndex(p => p.id === props.currentId));
const project = computed(() => props.queue[index.value] || null);
const pitcher = computed(() => project.value?.created_by || null);
const pitcherFirst = computed(() => firstName(pitcher.value));
const look = computed(() => categoryLook(project.value?.category));

const gallery = computed(() => (project.value?.featured_gallery || []).slice(0, 3).map(img => ({
  id: img.id,
  url: img.formats?.small?.url || img.formats?.thumbnail?.url || img.url
})));

const descriptionHtml = computed(() => (project.value?.description ? md.render(project.value.description) : ''));

const hasPin = computed(() => Number.isFinite(project.value?.latitude) && Number.isFinite(project.value?.longitude));

const memberSince = computed(() => {
  const created = pitcher.value?.createdAt;
  if (!created) return '';
  return `Member since ${new Date(created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
});

// What this garden already knows about the pitcher, from its own project list.
const history = computed(() => {
  const uid = pitcher.value?.id;
  if (!uid) return 'No account on file for this pitch.';
  const others = props.allProjects.filter(p => p.id !== project.value?.id && p.created_by?.id === uid);
  if (!others.length) return 'This is their first pitch here.';
  const led = others.filter(p => ['APPROVED', 'COMPLETED'].includes(normalizeReviewStatus(p.review_status)));
  const parts = [`${others.length} earlier pitch${others.length === 1 ? '' : 'es'} here`];
  if (led.length) parts.push(`including ${led.slice(0, 2).map(p => p.title).join(' and ')}`);
  return `${parts.join(', ')}.`;
});

function go(delta) {
  const next = props.queue[index.value + delta];
  if (next) {
    toast.value = null;
    emit('update:currentId', next.id);
  }
}

async function decide(action, { reasonCode, note } = {}) {
  const current = project.value;
  if (!current || busy.value) return;

  busy.value = true;
  const at = index.value;
  let updated;
  try {
    ({ project: updated } = await projectsStore.decide(current.id, action, { reasonCode, note }));
  } catch (err) {
    alertStore.error(err?.status === 409
      ? 'Someone already reviewed this pitch. The list has been refreshed.'
      : (err?.message || 'Could not save your decision. Please try again.'));
    if (err?.status === 409) projectsStore.getProjects(props.garden);
    busy.value = false;
    return;
  }
  busy.value = false;

  const first = firstName(current.created_by);
  const text = action === 'approve'
    ? `Approved ${current.title}. It's now on ${props.garden.title}'s public page.`
    : action === 'request_changes'
      ? `Sent to ${first}. ${current.title} is waiting on them until they resubmit.`
      : `Denied ${current.title}. ${first} gets your reason by email.`;
  toast.value = { text, projectId: current.id };
  emit('decided', { project: current, action });

  // The decided project leaves the queue; stay at the same position. Move on
  // before patching the cache so the drawer never renders without a project.
  const remaining = props.queue.filter(p => p.id !== current.id);
  if (remaining.length) {
    emit('update:currentId', remaining[Math.min(at, remaining.length - 1)].id);
  } else {
    emit('close');
  }
  projectsStore.patchCached(current.id, updated);
}

async function undo() {
  const id = toast.value?.projectId;
  if (!id || busy.value) return;
  busy.value = true;
  try {
    const restored = await projectsStore.undoDecision(id);
    toast.value = null;
    emit('undone', id);
    emit('update:currentId', id);
    projectsStore.patchCached(id, restored);
  } catch (err) {
    alertStore.error(err?.message || 'That decision can no longer be undone.');
  } finally {
    busy.value = false;
  }
}

function onKey(e) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div class="rd-scrim" @click="emit('close')"></div>
    <aside v-if="project" class="rd" role="dialog" aria-modal="true" :aria-label="`Review ${project.title}`">
      <header class="rd-head">
        <button type="button" class="rd-close rd-close--mobile" aria-label="Close" @click="emit('close')">×</button>
        <div class="rd-head__title">
          <span class="rd-eyebrow">Needs review</span>
          <span class="rd-pos">{{ index + 1 }} of {{ queue.length }}<span class="rd-pos__suffix"> · public preview</span></span>
        </div>
        <button type="button" class="rd-nav" :disabled="index <= 0" aria-label="Previous pitch" @click="go(-1)">‹</button>
        <button type="button" class="rd-nav" :disabled="index >= queue.length - 1" aria-label="Next pitch" @click="go(1)">›</button>
        <router-link
          v-if="project.documentId"
          :to="{ name: 'manage-project', params: { documentId: project.documentId } }"
          class="rd-full"
        >Open full page ↗</router-link>
        <button type="button" class="rd-close rd-close--desktop" aria-label="Close" @click="emit('close')">×</button>
      </header>

      <div v-if="toast" class="rd-toast" role="status">
        <span class="rd-toast__check">✓</span>
        <span class="rd-toast__text">{{ toast.text }}</span>
        <button type="button" class="rd-toast__undo" :disabled="busy" @click="undo">Undo</button>
      </div>

      <div class="rd-body">
        <div class="rd-hero" :style="imageStyle(project, { hero: true })">
          <span v-if="!project.hero_image?.url" class="rd-hero__word" :style="{ color: look.bg }">{{ project.category }}</span>
          <div class="rd-hero__pills">
            <span v-if="project.category" class="rd-pill" :style="{ background: look.bg, color: look.fg }">{{ project.category }}</span>
            <span class="rd-pill rd-pill--planning">Planning</span>
          </div>
        </div>

        <div class="rd-titleblock">
          <h3 class="rd-title">{{ project.title }}</h3>
          <div class="rd-byline">
            <span class="rd-av rd-av--sm" :style="avatarStyle(pitcher)">{{ initials(pitcher) }}</span>
            <span>Pitched by <b>{{ personName(pitcher) || 'a visitor' }}</b> · {{ timeAgo(project.createdAt) }}</span>
          </div>
        </div>

        <p v-if="project.short_description" class="rd-lede">{{ project.short_description }}</p>
        <div v-if="descriptionHtml" class="rd-desc" v-html="descriptionHtml"></div>

        <div v-if="gallery.length" class="rd-gallery">
          <div v-for="img in gallery" :key="img.id" class="rd-gallery__img" :style="{ backgroundImage: `url(&quot;${img.url}&quot;)` }"></div>
        </div>

        <div class="rd-cards">
          <div class="rd-card rd-card--loc">
            <div class="rd-map">
              <StaticPinMap v-if="hasPin" :key="project.id" :latitude="project.latitude" :longitude="project.longitude" />
              <span v-else class="rd-map__pin"></span>
            </div>
            <div class="rd-card__pad">
              <span class="rd-loc__name">{{ hasPin ? 'Pinned on the map' : 'No spot pinned yet' }}</span>
              <span class="rd-muted">{{ garden.title }}</span>
            </div>
          </div>
          <div class="rd-card rd-card__pad rd-card--who">
            <span class="rd-label">About the pitcher</span>
            <div class="rd-who">
              <span class="rd-av" :style="avatarStyle(pitcher)">{{ initials(pitcher) }}</span>
              <div class="rd-who__text">
                <span class="rd-who__name">{{ personName(pitcher) || 'Unknown' }}</span>
                <span v-if="memberSince" class="rd-muted">{{ memberSince }}</span>
              </div>
            </div>
            <span class="rd-muted rd-history">{{ history }}</span>
          </div>
        </div>
      </div>

      <footer class="rd-foot">
        <ProjectDecisionBar :key="project.id" :pitcher-first="pitcherFirst" :busy="busy" @decide="decide" />
      </footer>
    </aside>
  </Teleport>
</template>

<style scoped>
/* The drawer is the public preview, so it keeps the cream page palette in both themes. */
.rd-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(12, 20, 12, 0.5);
}

.rd {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 61;
  width: min(680px, 100vw);
  background: #f7f1e3;
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.4);
  font-family: 'Roboto', sans-serif;
}

.rd-head {
  flex: none;
  background: #1f2d1a;
  padding: 14px 18px 14px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #3d4d36;
}

.rd-head__title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rd-eyebrow,
.rd-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8aa37c;
}

.rd-label { color: #6c8a6a; }

.rd-pos {
  font-size: 15px;
  font-weight: 700;
  color: #f5f5f5;
}

.rd-nav,
.rd-close {
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 9999px;
  border: 1px solid #3d4d36;
  background: transparent;
  color: #f5f5f5;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.rd-nav:disabled { opacity: 0.35; cursor: default; }

.rd-close {
  border: none;
  background: #2a3826;
  font-size: 20px;
}

.rd-close--mobile { display: none; }

.rd-full {
  font-size: 14px;
  font-weight: 700;
  padding: 0 10px;
  white-space: nowrap;
  color: #c8dbbf;
  text-decoration: none;
}

.rd-full:hover { color: #f5f5f5; }

.rd-toast {
  flex: none;
  background: #8aa37c;
  color: #14281a;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.rd-toast__check {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 9999px;
  background: #14281a;
  color: #8aa37c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
}

.rd-toast__text { flex: 1; font-weight: 700; }

.rd-toast__undo {
  background: none;
  border: none;
  color: #14281a;
  font-weight: 700;
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
}

.rd-body {
  flex: 1;
  overflow: auto;
  padding: 22px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.rd-hero {
  position: relative;
  aspect-ratio: 3 / 1;
  flex: none;
  border-radius: 14px;
  overflow: hidden;
}

.rd-hero__word {
  position: absolute;
  right: 16px;
  bottom: -18px;
  font-family: 'DM Serif Display', serif;
  font-size: 96px;
  line-height: 1;
  white-space: nowrap;
  opacity: 0.75;
}

.rd-hero__pills {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 9999px;
  background: rgba(20, 40, 26, 0.35);
  backdrop-filter: blur(8px);
}

.rd-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
}

.rd-pill--planning { background: #F9E2D1; color: #7c3a12; }

.rd-titleblock {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rd-title {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 34px;
  line-height: 1.1;
  color: #376451;
}

.rd-byline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #4b5563;
}

.rd-byline b { color: #1a1a1a; }

.rd-av {
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rd-av--sm { width: 26px; height: 26px; font-size: 10px; }

.rd-lede {
  margin: 0;
  font-size: 16px;
  line-height: 1.65;
  color: #1a1a1a;
}

.rd-desc {
  font-size: 15px;
  line-height: 1.65;
  color: #1a1a1a;
}

.rd-desc :deep(p) { margin: 0 0 0.75em; }

.rd-gallery {
  display: flex;
  gap: 8px;
}

.rd-gallery__img {
  width: 140px;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  background-color: #e4dccb;
  background-size: cover;
  background-position: center;
}

.rd-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.rd-card {
  background: #fff;
  border: 1px solid #dcd3c0;
  border-radius: 12px;
  overflow: hidden;
}

.rd-card__pad {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rd-card--who { gap: 10px; padding: 14px; }

.rd-map {
  position: relative;
  height: 100px;
  background-color: #e9ecdc;
  background-image:
    radial-gradient(ellipse 26% 34% at 70% 70%, #bcd4d4 0 97%, transparent 100%),
    linear-gradient(28deg, transparent 47%, #fff 47% 49.5%, transparent 49.5%),
    repeating-linear-gradient(0deg, transparent 0 30px, rgba(255, 255, 255, 0.75) 30px 32px),
    repeating-linear-gradient(90deg, transparent 0 38px, rgba(255, 255, 255, 0.75) 38px 40px);
}

.rd-map :deep(> div) { height: 100%; }

.rd-map__pin {
  position: absolute;
  left: 44%;
  top: 38%;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  background: #064e3b;
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  opacity: 0.35;
}

.rd-loc__name {
  font-weight: 700;
  font-size: 14px;
  color: #064e3b;
}

.rd-muted {
  font-size: 13px;
  color: #4b5563;
}

.rd-history { line-height: 1.5; }

.rd-who {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rd-who__text {
  display: flex;
  flex-direction: column;
}

.rd-who__name {
  font-weight: 700;
  font-size: 15px;
  color: #1a1a1a;
}

.rd-foot {
  flex: none;
  background: #1f2d1a;
  border-top: 1px solid #3d4d36;
  padding: 16px 24px 20px;
}

/* ── Mobile: full-screen sheet (1h) ── */
@media (max-width: 767px) {
  .rd { width: 100vw; }
  .rd-head { padding: 10px 12px 10px 8px; gap: 4px; }
  .rd-close--mobile { display: flex; align-items: center; justify-content: center; background: transparent; font-size: 22px; }
  .rd-close--desktop,
  .rd-full,
  .rd-pos__suffix { display: none; }
  .rd-body { padding: 0 0 18px; gap: 12px; }
  .rd-hero { aspect-ratio: 4 / 3; border-radius: 0; }
  .rd-hero__word { font-size: 64px; bottom: -14px; right: 10px; }
  .rd-titleblock,
  .rd-lede,
  .rd-desc,
  .rd-gallery,
  .rd-cards { margin: 0 18px; }
  .rd-title { font-size: 28px; }
  .rd-cards { grid-template-columns: 1fr; }
  .rd-gallery__img { width: auto; flex: 1; }
  .rd-foot { padding: 14px 16px 24px; }
}
</style>
