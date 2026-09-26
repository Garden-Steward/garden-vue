<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  siteKey: { type: String, required: true }
});

const emit = defineEmits(['verified', 'error', 'expired']);

const containerRef = ref(null);
const widgetId = ref(null);

// Shared across instances so reopening the modal doesn't inject the script twice.
let scriptPromise = null;

const loadScript = () => {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=turnstileInit';
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    window.turnstileInit = () => resolve();
    document.head.appendChild(script);
  });
  return scriptPromise;
};

const renderWidget = async () => {
  if (!containerRef.value) return;
  try {
    await loadScript();
  } catch {
    emit('error');
    return;
  }
  if (widgetId.value !== null || !containerRef.value) return;
  widgetId.value = window.turnstile.render(containerRef.value, {
    sitekey: props.siteKey,
    theme: 'auto',
    callback: (token) => emit('verified', token),
    'error-callback': () => emit('error'),
    'expired-callback': () => emit('expired'),
  });
};

onMounted(() => renderWidget());

onUnmounted(() => {
  if (widgetId.value !== null && window.turnstile) {
    window.turnstile.remove(widgetId.value);
    widgetId.value = null;
  }
});

const reset = () => {
  if (widgetId.value !== null && window.turnstile) {
    window.turnstile.reset(widgetId.value);
  }
};

defineExpose({ reset });
</script>

<template>
  <div ref="containerRef" class="turnstile-wrap"></div>
</template>

<style scoped>
.turnstile-wrap { display: flex; justify-content: center; min-height: 65px; }
</style>
