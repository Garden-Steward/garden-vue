<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  siteKey: { type: String, required: true }
});

const emit = defineEmits(['verified', 'error', 'expired']);

const containerRef = ref(null);
const widgetId = ref(null);
let scriptLoaded = false;

const loadScript = () => {
  if (scriptLoaded || window.hcaptcha) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=hcpInit';
    script.async = true;
    script.defer = true;
    window.hcpInit = () => { scriptLoaded = true; resolve(); };
    document.head.appendChild(script);
  });
};

const renderWidget = async () => {
  if (!containerRef.value) return;
  await loadScript();
  if (widgetId.value !== null) return;
  widgetId.value = window.hcaptcha.render(containerRef.value, {
    sitekey: props.siteKey,
    theme: 'dark',
    size: 'compact',
    callback: (token) => emit('verified', token),
    'error-callback': () => emit('error'),
    'expired-callback': () => emit('expired'),
  });
};

onMounted(() => renderWidget());

onUnmounted(() => {
  if (widgetId.value !== null && window.hcaptcha) {
    window.hcaptcha.reset(widgetId.value);
    widgetId.value = null;
  }
});

const reset = () => {
  if (widgetId.value !== null && window.hcaptcha) {
    window.hcaptcha.reset(widgetId.value);
  }
};

defineExpose({ reset });
</script>

<template>
  <div ref="containerRef" class="hcaptcha-wrap"></div>
</template>

<style scoped>
.hcaptcha-wrap { display: flex; justify-content: center; min-height: 74px; }
</style>