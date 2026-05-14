<script setup>
import { computed, watch, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useAlertStore } from '@/stores';

const alertStore = useAlertStore();
const { alert } = storeToRefs(alertStore);

let autoDismissTimeout = null;

const bubbleClass = computed(() => {
  const a = alert.value;
  if (!a) return '';
  if (a.type === 'alert-danger') {
    return [
      'border',
      'bg-red-50 text-red-950 border-red-200',
      'dark:bg-red-950/95 dark:text-red-100 dark:border-red-500/45',
    ].join(' ');
  }
  return [
    'border',
    'bg-emerald-50 text-emerald-950 border-emerald-200',
    'dark:bg-emerald-950/90 dark:text-emerald-100 dark:border-emerald-500/40',
  ].join(' ');
});

watch(alert, (newAlert) => {
  if (autoDismissTimeout) {
    clearTimeout(autoDismissTimeout);
    autoDismissTimeout = null;
  }

  if (newAlert) {
    autoDismissTimeout = setTimeout(() => {
      alertStore.clear();
      autoDismissTimeout = null;
    }, 3000);
  }
});

onBeforeUnmount(() => {
  if (autoDismissTimeout) {
    clearTimeout(autoDismissTimeout);
  }
});
</script>

<template>
  <div v-if="alert" class="alert-container">
    <div class="mx-auto max-w-3xl px-4 pt-3">
      <div
        role="alert"
        class="pointer-events-auto relative rounded-lg px-4 py-3 pr-11 text-sm leading-snug shadow-lg sm:text-base"
        :class="bubbleClass"
      >
        <button
          type="button"
          class="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-2xl leading-none text-current opacity-60 hover:bg-black/10 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current dark:hover:bg-white/10"
          aria-label="Dismiss"
          @click="alertStore.clear()"
        >
          &times;
        </button>
        {{ alert.message }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100000;
  pointer-events: none;
}

</style>
