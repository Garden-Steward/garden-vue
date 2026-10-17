<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores';

// Small "Member" control on a garden page: mute the garden's group texts, or
// leave it. Renders nothing unless the signed-in user belongs to the garden.
const props = defineProps({
  gardenSlug: { type: String, required: true },
  gardenTitle: { type: String, default: 'this garden' },
});

const authStore = useAuthStore();
const { user, auth } = storeToRefs(authStore);

const state = ref(null); // { member, manager, muted }
const open = ref(false);
const confirmingLeave = ref(false);
const busy = ref(false);
const error = ref('');
const root = ref(null);

const base = computed(() => `${import.meta.env.VITE_API_URL}/api/gardens/${encodeURIComponent(props.gardenSlug)}/membership`);

// Plain fetch rather than fetchWrapper: that one signs the user out on a 403,
// and a member menu that can't load should just stay hidden.
async function call(path = '', body) {
  const res = await fetch(`${base.value}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${auth.value?.accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || 'Something went wrong. Try again.');
  return json?.data;
}

async function load() {
  state.value = null;
  if (!user.value || !auth.value?.accessToken || !props.gardenSlug) return;
  try {
    state.value = await call();
  } catch {
    state.value = null;
  }
}
watch([() => props.gardenSlug, () => user.value?.id], load, { immediate: true });

const visible = computed(() => !!state.value && (state.value.member || state.value.manager));

async function toggleMute() {
  busy.value = true;
  error.value = '';
  try {
    state.value = await call('/mute', { muted: !state.value.muted });
    open.value = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function leave() {
  busy.value = true;
  error.value = '';
  try {
    state.value = await call('/leave', {});
    open.value = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

function toggleOpen() {
  open.value = !open.value;
  confirmingLeave.value = false;
  error.value = '';
}

function onDocClick(e) {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false;
}
function onKey(e) {
  if (e.key === 'Escape') open.value = false;
}
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
  } else {
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div v-if="visible" ref="root" class="gmm">
    <button
      type="button"
      class="gmm-pill"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="toggleOpen"
    >
      <svg class="gmm-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      {{ state.manager ? 'Manager' : 'Member' }}<template v-if="state.muted"> · muted</template>
      <svg class="gmm-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M5 6L0 0h10z" /></svg>
    </button>

    <div v-if="open" class="gmm-menu" role="menu">
      <template v-if="!confirmingLeave">
        <button type="button" class="gmm-item" role="menuitem" :disabled="busy" @click="toggleMute">
          <span class="gmm-item-title">{{ state.muted ? 'Unmute updates' : 'Mute updates' }}</span>
          <span class="gmm-item-text">
            {{ state.muted
              ? `Get ${gardenTitle}'s workday texts again.`
              : `Stop ${gardenTitle}'s workday texts. You stay a member.` }}
          </span>
        </button>
        <button
          v-if="!state.manager"
          type="button"
          class="gmm-item gmm-item--danger"
          role="menuitem"
          :disabled="busy"
          @click="confirmingLeave = true"
        >
          <span class="gmm-item-title">Leave garden</span>
          <span class="gmm-item-text">Come off the volunteer list.</span>
        </button>
        <p v-else class="gmm-note">Managers can't leave from here. Ask another manager to remove you.</p>
      </template>

      <div v-else class="gmm-confirm">
        <p class="gmm-confirm-text">
          Leave {{ gardenTitle }}? You'll stop getting its texts and come off its volunteer list. Tasks you've taken on stay with you.
        </p>
        <div class="gmm-confirm-actions">
          <button type="button" class="gmm-btn" :disabled="busy" @click="confirmingLeave = false">Cancel</button>
          <button type="button" class="gmm-btn gmm-btn--danger" :disabled="busy" @click="leave">
            {{ busy ? 'Leaving…' : 'Leave' }}
          </button>
        </div>
      </div>

      <p v-if="error" class="gmm-error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<style>
.gmm {
  position: relative;
  display: inline-block;
  font-family: Roboto, system-ui, sans-serif;
}

.gmm .gmm-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #c8d0c0;
  border-radius: 9999px;
  background-color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #376451;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.gmm .gmm-pill:hover {
  border-color: #376451;
  background-color: #f3f5ef;
}

.dark .gmm .gmm-pill {
  background-color: transparent;
  border-color: #6c8a6a;
  color: #c5d4b8;
}

.dark .gmm .gmm-pill:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.gmm-icon {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.gmm-caret {
  width: 8px;
  height: 5px;
  fill: currentColor;
}

.gmm-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 30;
  width: 272px;
  padding: 6px;
  border: 1px solid #c8d0c0;
  border-radius: 12px;
  background-color: #ffffff;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14);
}

.dark .gmm-menu {
  background-color: #2d3e26;
  border-color: #3d4d36;
}

.gmm-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: none;
  text-align: left;
  cursor: pointer;
}

.gmm .gmm-item:hover:not(:disabled) {
  background-color: #f3f5ef;
}

.dark .gmm .gmm-item:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.06);
}

.gmm-item-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1f2a1f;
}

.dark .gmm-item-title {
  color: #f5f5f5;
}

.gmm-item--danger .gmm-item-title {
  color: #b42318;
}

.dark .gmm-item--danger .gmm-item-title {
  color: #f6a39a;
}

.gmm-item-text,
.gmm-note,
.gmm-confirm-text {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #4b5563;
}

.dark .gmm-item-text,
.dark .gmm-note,
.dark .gmm-confirm-text {
  color: #d0d0d0;
}

.gmm-note {
  margin: 0;
  padding: 8px 12px;
}

.gmm-confirm {
  padding: 8px 10px 6px;
}

.gmm-confirm-text {
  margin: 0 0 12px;
}

.gmm-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.gmm-btn {
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid #c8d0c0;
  border-radius: 9999px;
  background: none;
  font-size: 0.875rem;
  font-weight: 600;
  color: #376451;
  cursor: pointer;
}

.gmm .gmm-btn--danger {
  border-color: #b42318;
  background-color: #b42318;
  color: #ffffff;
}

.dark .gmm-btn {
  color: #c5d4b8;
  border-color: #6c8a6a;
}

.dark .gmm .gmm-btn--danger {
  border-color: #f6a39a;
  background-color: #f6a39a;
  color: #1f2a1f;
}

.gmm-item:disabled,
.gmm-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.gmm-error {
  margin: 6px 12px 4px;
  font-size: 0.8125rem;
  color: #b42318;
}

.gmm-pill:focus-visible,
.gmm-item:focus-visible,
.gmm-btn:focus-visible {
  outline: 3px solid #8aa37c;
  outline-offset: 2px;
}
</style>
