<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useAuthStore, useProjectsStore } from '@/stores';
import { participationRequest } from '@/helpers/participation';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  projectId: { type: [String, Number], required: true },
  projectTitle: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'done']);
const auth = useAuthStore();
const projects = useProjectsStore();
const dialog = ref(null);
const heading = ref(null);
const busy = ref(false);
const done = ref(false);
const error = ref('');
let generation = 0;
let opener;
const close = () => emit('update:modelValue', false);
async function show() {
  await nextTick();
  if (!dialog.value || !props.modelValue || auth.loginModalOpen) return;
  if (!dialog.value.open) dialog.value.showModal();
  heading.value?.focus();
}
watch([() => props.modelValue, () => props.projectId, () => auth.user?.id], ([open], previous) => {
  generation++; busy.value = false; done.value = false; error.value = '';
  if (!open) { dialog.value?.close(); opener?.focus(); return; }
  if (!previous?.[0]) opener = document.activeElement;
  show();
}, { immediate: true });
watch(() => auth.loginModalOpen, open => {
  if (open) { generation++; busy.value = false; dialog.value?.close(); }
  else if (props.modelValue) show();
});
async function submit() {
  if (busy.value || !auth.user) return;
  const current = generation;
  const projectId = props.projectId;
  const token = auth.auth.accessToken;
  busy.value = true; error.value = '';
  try {
    const result = await participationRequest(import.meta.env.VITE_API_URL, `/projects/${projectId}/express-interest`, { method: 'POST', token, body: {} });
    if (current !== generation || !props.modelValue || props.projectId !== projectId || auth.auth.accessToken !== token) return;
    if (!Number.isSafeInteger(result.count) || result.count < 1 || result.isInterested !== true) throw new Error('Your interest has not been saved yet. Please try again.');
    projects.patchInterest(projectId, result);
    done.value = true; emit('done', projectId);
    await nextTick(); heading.value?.focus();
  } catch (failure) { if (current === generation) error.value = failure.message; }
  finally { if (current === generation) busy.value = false; }
}
onBeforeUnmount(() => { generation++; dialog.value?.close(); });
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="interest-dialog" aria-labelledby="interest-heading" @cancel.prevent="close">
      <button type="button" class="interest-close" aria-label="Close project interest" @click="close">×</button>
      <p class="interest-caption">{{ projectTitle }}</p>
      <h2 id="interest-heading" ref="heading" tabindex="-1"><span v-if="done">You’re interested.</span><span v-else>Find your place in this project.</span></h2>
      <template v-if="done"><p>Your interest is saved. Visit the project to see what’s happening next.</p><button type="button" class="interest-primary" @click="close">Done</button></template>
      <template v-else-if="!auth.user"><p>Sign in to let the project organizers know you’re interested.</p><div class="interest-actions"><button type="button" class="interest-primary" @click="auth.openLoginModal()">Sign in</button><router-link to="/schedule" @click="close">New here? Find an event to join ↗</router-link></div></template>
      <template v-else><p>Let the project organizers know you’d like to take part.</p><button type="button" class="interest-primary" :disabled="busy" @click="submit">I’m interested</button></template>
      <p v-if="error" class="interest-error" role="alert">{{ error }}</p>
    </dialog>
  </Teleport>
</template>

<style scoped>
.interest-dialog { box-sizing: border-box; width: min(540px, calc(100% - 28px)); max-height: calc(100dvh - 28px); padding: clamp(24px, 5vw, 42px); margin: auto; overflow: auto; border: 1px solid #a4b08c; background: #f1f2d5; color: #024023; font: 20px/1.5 'Gill Sans Local', 'Gill Sans', sans-serif; }
.interest-dialog::backdrop { background: rgb(18 36 22 / 55%); }
.interest-dialog h2 { margin: 22px 0; font: 400 40px/1.12 Georgia, serif; outline: none; }
.interest-caption { color: #53664c; margin: 0; padding-right: 40px; }
.interest-dialog button { padding: 12px 18px; border: 1px solid #024023; font: inherit; cursor: pointer; }
.interest-dialog .interest-close { float: right; min-width: 44px; min-height: 44px; padding: 0; background: transparent; font-size: 28px; }
.interest-dialog .interest-primary { background: #024023; color: #f1f2d5; }
.interest-dialog button:disabled { opacity: .55; cursor: wait; }
.interest-actions { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
.interest-actions a { color: inherit; text-underline-offset: 4px; }
.interest-error { color: #962f28; }
</style>
