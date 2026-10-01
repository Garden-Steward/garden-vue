<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { fetchWrapper } from '@/helpers';
import { useProjectsStore, useAlertStore } from '@/stores';
import { dayChip } from '@/helpers/project-review';

/*
 * Pick one of the garden's upcoming volunteer days and link it to a project.
 * Only for projects that belong to a garden: the days come from that garden.
 * The event editor links the same relation from the other side.
 */
const props = defineProps({
  // Needs id, documentId, title and related_events.
  project: { type: Object, required: true },
  gardenSlug: { type: String, required: true },
  gardenTitle: { type: String, default: '' }
});

const emit = defineEmits(['close', 'linked']);

const projectsStore = useProjectsStore();
const alertStore = useAlertStore();

const days = ref(null); // null while loading
const loadError = ref(false);
const linkingId = ref(null);

const linkedIds = computed(() => new Set((props.project.related_events || []).map(e => e?.id ?? e)));

const upcoming = computed(() => {
  if (!Array.isArray(days.value)) return [];
  const now = Date.now();
  return days.value
    .filter(d => !d.disabled && !d.canceled && !linkedIds.value.has(d.id))
    .filter(d => !d.startDatetime || new Date(d.startDatetime).getTime() >= now)
    .sort((a, b) => new Date(a.startDatetime || 8.64e15) - new Date(b.startDatetime || 8.64e15));
});

function when(d) {
  if (!d.startDatetime) return 'Date to be announced';
  return `${dayChip(d)} · ${new Date(d.startDatetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

async function load() {
  try {
    // Newest first; 100 reaches well past every upcoming day.
    const res = await fetchWrapper.get(`${import.meta.env.VITE_API_URL}/api/volunteer-days/garden/${encodeURIComponent(props.gardenSlug)}?pagination[page]=1&pagination[pageSize]=100`);
    days.value = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  } catch {
    loadError.value = true;
    days.value = [];
  }
}

async function link(day) {
  if (linkingId.value) return;
  linkingId.value = day.id;
  const next = [...(props.project.related_events || []), day];
  try {
    await projectsStore.update(props.project.documentId || props.project.id, { related_events: next });
    emit('linked', { day, related_events: next });
    alertStore.success(`Linked ${day.title || 'the volunteer day'} to ${props.project.title}.`);
    emit('close');
  } catch {
    alertStore.error('Could not link this volunteer day. Please try again.');
  } finally {
    linkingId.value = null;
  }
}

function onKey(e) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => {
  load();
  window.addEventListener('keydown', onKey);
});
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <div class="lv-scrim" @click="emit('close')"></div>
    <div class="lv" role="dialog" aria-modal="true" aria-labelledby="lv-title">
      <div class="lv-head">
        <div class="lv-head__text">
          <span class="lv-eyebrow">{{ project.title }}</span>
          <h2 id="lv-title" class="lv-title">Link a volunteer day</h2>
        </div>
        <button type="button" class="lv-x" aria-label="Close" @click="emit('close')">×</button>
      </div>

      <div class="lv-body">
        <p v-if="days === null" class="lv-note">Loading volunteer days…</p>
        <p v-else-if="loadError" class="lv-note">Couldn't load this garden's volunteer days. Close this and try again.</p>
        <template v-else-if="upcoming.length">
          <p class="lv-note">Upcoming at {{ gardenTitle || 'this garden' }}.</p>
          <ul class="lv-list">
            <li v-for="d in upcoming" :key="d.id" class="lv-row">
              <div class="lv-row__text">
                <span class="lv-row__title">{{ d.title || 'Volunteer day' }}</span>
                <span class="lv-row__when">{{ when(d) }}</span>
              </div>
              <button type="button" class="lv-link" :disabled="!!linkingId" @click="link(d)">
                {{ linkingId === d.id ? 'Linking…' : 'Link' }}
              </button>
            </li>
          </ul>
        </template>
        <p v-else class="lv-note">
          No upcoming volunteer days at {{ gardenTitle || 'this garden' }} that aren't already linked.
          <router-link :to="`/manage/gardens/${gardenSlug}#events`" class="lv-a" @click="emit('close')">Schedule one from the garden's Events tab</router-link>.
        </p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Cream dialog, same in both themes, like the review drawer and row menu. */
.lv-scrim {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(12, 20, 12, 0.5);
}

.lv {
  position: fixed;
  z-index: 71;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, calc(100vw - 32px));
  max-height: min(640px, calc(100vh - 32px));
  display: flex;
  flex-direction: column;
  background: #f7f1e3;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.lv-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 20px 12px 24px;
}

.lv-head__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lv-eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6c8a6a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lv-title {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 26px;
  color: #376451;
}

.lv-x {
  width: 40px;
  height: 40px;
  flex: none;
  border: none;
  border-radius: 9999px;
  background: #ece5d4;
  color: #1a1a1a;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.lv-body {
  overflow: auto;
  padding: 0 24px 24px;
}

.lv-note {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #4b5563;
}

.lv-a {
  color: #064e3b;
  font-weight: 700;
}

.lv-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #dcd3c0;
  border-radius: 12px;
  margin: 0;
}

.lv-row__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lv-row__title {
  font-weight: 700;
  font-size: 15px;
  color: #1a1a1a;
}

.lv-row__when {
  font-size: 13px;
  color: #4b5563;
}

.lv-link {
  flex: none;
  min-height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 9999px;
  background: #8aa37c;
  color: #14281a;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

.lv-link:disabled { opacity: 0.6; cursor: default; }
</style>
