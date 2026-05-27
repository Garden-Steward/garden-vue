<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useProjectsStore, useGardensStore, useAuthStore, useAlertStore } from '@/stores';
import ProjectForm from '@/components/form/ProjectForm.vue';

const route = useRoute();
const projectId = route.params.id;

const projectsStore = useProjectsStore();
const gardensStore = useGardensStore();
const authStore = useAuthStore();
const alertStore = useAlertStore();
const { project } = storeToRefs(projectsStore);
const { gardens } = storeToRefs(gardensStore);
const { user } = storeToRefs(authStore);

const form = ref({
  title: '',
  short_description: '',
  category: 'Community',
  garden: '',
  featured_gallery: [],
  location: null
});
const errors = ref({ title: false });
const isSaving = ref(false);
const projectForm = ref(null);

// People relations (managed separately from the editable form fields).
const managers = ref([]);
const interested = ref([]);
const promotingId = ref(null);

const userName = (u) => {
  if (!u) return '';
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return full || u.username || u.name || u.email || `User ${u.id}`;
};

// ── Garden options (gardens the user manages or volunteers at) ──
const isManager = (garden) => {
  const managers = garden.attributes?.managers?.data || [];
  return managers.some(m => (m.id || m) === user.value?.id);
};
const isVolunteer = (garden) => {
  const volunteers = garden.attributes?.volunteers?.data || [];
  return volunteers.some(v => (v.id || v) === user.value?.id);
};
const pitchGardens = computed(() => {
  if (!Array.isArray(gardens.value) || !user.value) return [];
  return gardens.value.filter(g => isManager(g) || isVolunteer(g));
});

const buildForm = (p) => {
  const attrs = p?.attributes || {};
  const g = attrs.garden;
  const gardenId = g?.data?.id ?? g?.id ?? (typeof g === 'number' ? g : '');
  form.value = {
    title: attrs.title || '',
    short_description: attrs.short_description || '',
    category: attrs.category || 'Community',
    garden: gardenId || '',
    featured_gallery: Array.isArray(attrs.featured_gallery) ? [...attrs.featured_gallery] : [],
    location: attrs.location || null
  };
  managers.value = Array.isArray(attrs.managers) ? [...attrs.managers] : [];
  interested.value = Array.isArray(attrs.interested) ? [...attrs.interested] : [];
};

// Load gardens (for the association dropdown) and the project itself.
gardensStore.getAll();
projectsStore.findById(projectId)
  .then(p => { if (p) buildForm(p); })
  .catch(() => { /* store sets project.error */ });

const save = async () => {
  const valid = !!form.value.title.trim();
  errors.value = { title: !valid };
  if (!valid) return;
  isSaving.value = true;
  try {
    const gallery = form.value.featured_gallery || [];
    const payload = {
      title: form.value.title.trim(),
      short_description: form.value.short_description?.trim() || '',
      category: form.value.category,
      garden: form.value.garden || null,
      featured_gallery: gallery,
      hero_image: gallery[0] || null,
      location: form.value.location || null
    };
    await projectsStore.update(projectId, payload);
    alertStore.success('Project saved.');
  } catch (err) {
    alertStore.error('Could not save the project. Please try again.');
  } finally {
    isSaving.value = false;
  }
};

// Promote an interested person to a manager: add to managers, drop from
// interested, and persist immediately (independent of the form's Save).
const promote = async (person) => {
  if (promotingId.value) return;
  promotingId.value = person.id;
  const nextManagers = [...managers.value, person];
  const nextInterested = interested.value.filter(u => u.id !== person.id);
  try {
    await projectsStore.update(projectId, {
      managers: nextManagers.map(u => u.id),
      interested: nextInterested.map(u => u.id)
    });
    managers.value = nextManagers;
    interested.value = nextInterested;
    alertStore.success(`${userName(person)} is now a manager.`);
  } catch (err) {
    alertStore.error('Could not promote this person. Please try again.');
  } finally {
    promotingId.value = null;
  }
};
</script>

<template>
  <div class="pm-wrapper">
    <div v-if="project.loading" class="pm-state">Loading project…</div>
    <div v-else-if="project.error" class="pm-state">
      Project not found.
      <a href="/manage" class="pm-back">Back to dashboard</a>
    </div>

    <div v-else class="pm-panel">
      <div class="pm-head">
        <h1 class="pm-title">Edit Project</h1>
        <a href="/manage" class="pm-back">← Dashboard</a>
      </div>

      <form @submit.prevent="save">
        <ProjectForm ref="projectForm" v-model="form" :gardens="pitchGardens" :errors="errors" />

        <div class="pm-footer">
          <a href="/manage" class="pm-cancel">Cancel</a>
          <button type="submit" class="pm-save" :disabled="isSaving || projectForm?.isUploading">
            {{ isSaving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </form>

      <!-- People -->
      <div class="pm-people">
        <!-- Managers -->
        <section class="pm-people__col">
          <h3 class="pm-people__title">Managers</h3>
          <ul v-if="managers.length" class="pm-people__list">
            <li v-for="m in managers" :key="m.id" class="pm-person">
              <span class="pm-person__name">{{ userName(m) }}</span>
              <span class="pm-person__tag">Manager</span>
            </li>
          </ul>
          <p v-else class="pm-people__empty">No managers yet.</p>
        </section>

        <!-- Interested -->
        <section class="pm-people__col">
          <h3 class="pm-people__title">Interested</h3>
          <ul v-if="interested.length" class="pm-people__list">
            <li v-for="p in interested" :key="p.id" class="pm-person">
              <span class="pm-person__name">{{ userName(p) }}</span>
              <button
                type="button"
                class="pm-promote"
                :disabled="promotingId === p.id"
                @click="promote(p)"
              >
                {{ promotingId === p.id ? 'Promoting…' : 'Promote to manager' }}
              </button>
            </li>
          </ul>
          <p v-else class="pm-people__empty">No one has expressed interest yet.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pm-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.pm-state {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 3rem 1rem;
}

.pm-panel {
  background-color: #3c4a2c;
  color: #f4f1e4;
  border: 1px solid #56663b;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

@media (min-width: 768px) {
  .pm-panel {
    padding: 2.5rem;
  }
}

.pm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.pm-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.6rem, 4vw, 2.25rem);
  font-weight: 800;
  color: #f4f1e4;
  line-height: 1.1;
  margin: 0;
}

.pm-back {
  color: #c8dbbf;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
}

.pm-back:hover {
  color: #ffffff;
  text-decoration: underline;
}

.pm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2rem;
}

.pm-cancel {
  color: #f4f1e4;
  text-decoration: underline;
  font-size: 1rem;
}

.pm-cancel:hover {
  color: #ffffff;
}

.pm-save {
  background-color: #86b153;
  color: #1f2a14;
  font-weight: 700;
  padding: 0.7rem 1.6rem;
  border-radius: 0.6rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.pm-save:hover:not(:disabled) {
  background-color: #97c264;
  transform: translateY(-1px);
}

.pm-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── People (managers + interested) ── */
.pm-people {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(244, 241, 228, 0.15);
}

@media (max-width: 640px) {
  .pm-people {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

.pm-people__title {
  font-weight: 700;
  font-size: 1.1rem;
  color: #f4f1e4;
  margin: 0 0 0.85rem;
}

.pm-people__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pm-people__empty {
  color: rgba(244, 241, 228, 0.6);
  font-style: italic;
  margin: 0;
}

.pm-person {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  background-color: rgba(244, 241, 228, 0.06);
  border: 1px solid rgba(244, 241, 228, 0.12);
}

.pm-person__name {
  color: #f4f1e4;
  font-weight: 600;
}

.pm-person__tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: #2f5233;
  background-color: #d7e8c8;
  -webkit-text-fill-color: currentColor;
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
}

.pm-promote {
  flex-shrink: 0;
  background-color: transparent;
  border: 1px solid #a7c080;
  color: #d7e8c8;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 0.4rem;
  padding: 0.25rem 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pm-promote:hover:not(:disabled) {
  background-color: #86b153;
  color: #1f2a14;
}

.pm-promote:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
