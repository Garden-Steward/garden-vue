<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps({
  photos: { type: Array, required: true },
  label: { type: String, required: true },
  to: { type: String, default: null }
});

const backButton = ref(null);
const committedIndex = ref(0);
const frontFailed = ref(false);
const message = ref('');
const busy = ref(false);
const current = computed(() => props.photos[committedIndex.value]);
const frontComponent = computed(() => {
  if (props.to) return RouterLink;
  return 'div';
});
const next = computed(() => props.photos[(committedIndex.value + 1) % props.photos.length]);
const sourceKey = computed(() => props.photos.map(photo => photo.src).join('\u001f'));
const state = { phase: 'idle', pointer: null, generation: 0, animations: [] };

function releasePointer() {
  const id = state.pointer?.id;
  state.pointer = null;
  if (id != null && backButton.value?.hasPointerCapture(id)) backButton.value.releasePointerCapture(id);
}

function resetMotion() {
  releasePointer();
  for (const animation of state.animations) animation.cancel();
  state.animations = [];
  if (backButton.value) {
    backButton.value.style.transform = '';
    backButton.value.style.zIndex = '';
  }
  state.phase = 'idle';
  busy.value = false;
}

function cancelGesture(event) {
  if (state.phase !== 'dragging') return;
  if (event?.pointerId != null && event.pointerId !== state.pointer?.id) return;
  resetMotion();
}

function disposeMotion() {
  state.generation += 1;
  resetMotion();
}

function beginDrag(event) {
  if (state.phase !== 'idle' || !event.isPrimary || event.button !== 0 || props.photos.length < 2) return;
  const matrix = new DOMMatrixReadOnly(getComputedStyle(backButton.value).transform);
  state.phase = 'dragging';
  state.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, baseX: matrix.m41, baseY: matrix.m42 };
  backButton.value.setPointerCapture(event.pointerId);
}

function moveDrag(event) {
  const pointer = state.pointer;
  if (state.phase !== 'dragging' || pointer?.id !== event.pointerId) return;
  pointer.dx = event.clientX - pointer.x;
  pointer.dy = event.clientY - pointer.y;
  if (Math.hypot(pointer.dx, pointer.dy) <= 8) return;
  backButton.value.style.zIndex = '2';
  backButton.value.style.transform = `translate(${pointer.baseX + pointer.dx}px, ${pointer.baseY + pointer.dy}px) rotate(0deg)`;
}

function endDrag(event) {
  const pointer = state.pointer;
  if (state.phase !== 'dragging' || pointer?.id !== event.pointerId) return;
  const distance = Math.hypot(pointer.dx, pointer.dy);
  if (distance < 8) {
    state.phase = 'idle';
    releasePointer();
    advance('activation');
  } else if (pointer.dx < -12 && pointer.dy > 12) {
    state.phase = 'idle';
    releasePointer();
    advance('drag');
  } else {
    cancelGesture();
  }
}

function onBackClick(event) {
  // Pointer activation is handled on release; the native click remains for keyboard and assistive use.
  if (event.detail !== 0) return;
  advance('activation');
}

function onKeydown(event) {
  if (event.key === 'Escape') cancelGesture();
}

async function advance(origin) {
  if (state.phase !== 'idle' || props.photos.length < 2) return;
  state.phase = 'loading';
  busy.value = true;
  message.value = '';
  const generation = state.generation;
  const expectedSources = sourceKey.value;
  const nextIndex = (committedIndex.value + 1) % props.photos.length;
  const incoming = new Image();
  const back = backButton.value;
  const front = back?.parentElement?.querySelector('.photo-stack__front');
  const start = getComputedStyle(back).transform;
  try {
    incoming.src = props.photos[nextIndex].src;
    await incoming.decode();
    if (generation !== state.generation || expectedSources !== sourceKey.value) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      let settleStart = start;
      if (origin === 'activation') {
        state.phase = 'spreading';
        const spread = back.animate(
          [{ transform: start }, { transform: 'translate(16%, -16%) rotate(5deg)' }],
          { duration: 230, easing: 'ease-out', fill: 'forwards' }
        );
        state.animations.push(spread);
        await spread.finished;
        if (generation !== state.generation || expectedSources !== sourceKey.value) return;
        settleStart = 'translate(16%, -16%) rotate(5deg)';
      }
      back.style.zIndex = '2';
      state.phase = 'settling';
      const settle = back.animate(
        [{ transform: settleStart }, { transform: 'translate(0, 0) rotate(0deg)' }],
        { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }
      );
      state.animations.push(settle);
      if (front) {
        state.animations.push(front.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'translate(12px, -12px) rotate(3deg)' }],
          { duration: 380, easing: 'ease-out', fill: 'forwards' }
        ));
      }
      await settle.finished;
      if (generation !== state.generation || expectedSources !== sourceKey.value) return;
    }
    frontFailed.value = false;
    committedIndex.value = nextIndex;
  } catch {
    if (generation === state.generation && expectedSources === sourceKey.value) message.value = 'This photo could not be shown. Try the back photo again.';
  } finally {
    if (generation === state.generation && expectedSources === sourceKey.value) resetMotion();
  }
}

watch(sourceKey, () => {
  disposeMotion();
  committedIndex.value = 0;
  frontFailed.value = false;
  message.value = '';
});

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  disposeMotion();
});
</script>

<template>
  <div v-if="photos.length" class="photo-stack" :class="{ 'photo-stack--single': photos.length === 1 }">
    <div class="photo-stack__stage">
      <button
        v-if="photos.length > 1"
        ref="backButton"
        type="button"
        class="photo-stack__back"
        :aria-label="`Bring next photo to front for ${label}`"
        :aria-disabled="busy"
        aria-description="Drag the back photo into front, tap it, or press Enter or Space."
        @pointerdown="beginDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="cancelGesture"
        @lostpointercapture="cancelGesture"
        @click="onBackClick"
      >
        <img :src="next.src" alt="" loading="lazy" draggable="false" />
      </button>
      <component :is="frontComponent" :to="to || undefined" class="photo-stack__front" :aria-label="to && label">
        <img v-if="!frontFailed" :src="current.src" :alt="current.alt" loading="lazy" draggable="false" @error="frontFailed = true" />
        <span v-else class="photo-stack__fallback" role="img" :aria-label="`Photo unavailable for ${label}`">Photo unavailable</span>
      </component>
    </div>
    <div v-if="photos.length > 1" class="photo-stack__controls">
      <span role="status" aria-live="polite">{{ committedIndex + 1 }} / {{ photos.length }}</span>
    </div>
    <span v-if="message" class="photo-stack__error" role="status">{{ message }}</span>
  </div>
</template>

<style scoped>
.photo-stack { min-width: 0; padding: 42px 30px 0 0; color: var(--gs-ink); font: 16px/1.45 var(--gs-body-font); }
.photo-stack--single { padding: 0; }
.photo-stack__stage { position: relative; isolation: isolate; width: 100%; }
.photo-stack__front, .photo-stack__back { display: block; width: 100%; aspect-ratio: 4 / 3; }
.photo-stack__front { position: relative; z-index: 1; overflow: hidden; color: inherit; text-decoration: none; background: var(--gs-sage); }
.photo-stack__front img, .photo-stack__back img { display: block; width: 100%; height: 100%; object-fit: cover; }
.photo-stack__back { position: absolute; inset: 0; z-index: 0; padding: 7px; border: 0; border-radius: 0; background: var(--gs-ink); transform: translate(28px, -28px) rotate(3deg); touch-action: none; cursor: grab; user-select: none; }
.photo-stack__back:active { cursor: grabbing; }
.photo-stack__back img { pointer-events: none; }
.photo-stack__back:focus-visible { outline: 3px solid var(--gs-ink); outline-offset: 5px; }
.photo-stack__controls { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.photo-stack__error { display: block; color: var(--gs-ink); margin-top: 8px; }
.photo-stack__fallback { display: grid; place-items: center; width: 100%; height: 100%; color: var(--gs-muted); }
@media (max-width: 760px) {
  .photo-stack { padding: 37px 26px 0 0; }
  .photo-stack--single { padding: 0; }
  .photo-stack__back { transform: translate(22px, -22px) rotate(2deg); }
}
</style>
