<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useGardensStore, useAuthStore } from '@/stores';
import PitchProject from '@/components/modals/PitchProject.vue';

const route = useRoute();
const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
const authStore = useAuthStore();
const { user } = storeToRefs(authStore);
watch(user, (currentUser) => {
  if (!currentUser) return;
  gardensStore.getAll();
}, { immediate: true });

const showPitch = ref(false);
const pendingPitch = ref(false);
const main = ref(null);
let pitchTrigger = null;

const openPitch = async (event) => {
  if (event?.currentTarget instanceof HTMLElement) {
    pitchTrigger = event.currentTarget;
  } else if (!pitchTrigger && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
    pitchTrigger = document.activeElement;
  }
  if (!user.value) {
    pendingPitch.value = true;
    authStore.openLoginModal(route.fullPath);
    return;
  }
  showPitch.value = true;
};

watch(() => authStore.loginModalOpen, async (open) => {
  if (open || !pendingPitch.value) return;
  pendingPitch.value = false;
  if (user.value) {
    await nextTick();
    openPitch();
  } else {
    pitchTrigger = null;
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
  } else {
    main.value?.focus();
  }
  pitchTrigger = null;
});

const isGardenManager = (garden) => (garden.managers || []).some(manager => (manager.id || manager) === user.value?.id);
const isGardenVolunteer = (garden) => (garden.volunteers || []).some(volunteer => (volunteer.id || volunteer) === user.value?.id);
const pitchGardens = computed(() => {
  if (!Array.isArray(gardens.value)) return [];
  return gardens.value.filter(garden => isGardenManager(garden) || isGardenVolunteer(garden));
});

const onPitchCreated = (created) => {
  const key = created?.documentId || created?.id;
  if (key) window.location = `/manage/project/${key}`;
};
</script>

<template>
  <div class="manage-shell">
    <div class="manage-shell__content">
      <div ref="main" class="manage-shell__main" tabindex="-1"><slot :open-pitch="openPitch" /></div>
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
  min-width: 0;
  min-height: 100%;
  background: var(--manage-paper);
  color: var(--manage-ink);
  font: 18px/1.55 var(--gs-body-font);
}
.manage-shell__content { min-width: 0; min-height: 70vh; background: var(--manage-paper); overflow-wrap: anywhere; }
.manage-shell__main { padding: 42px 45px 55px; }
@media (max-width: 1200px) { .manage-shell__main { padding: 35px 30px 50px; } }
@media (max-width: 820px) { .manage-shell__main { padding: 30px 21px 40px; } }
</style>
