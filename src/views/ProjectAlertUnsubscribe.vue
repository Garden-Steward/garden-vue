<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectAlertsStore } from '@/stores';

const route = useRoute();
const alertsStore = useProjectAlertsStore();

const state = ref('working');
const label = ref('');

onMounted(async () => {
  const token = route.query.token;
  if (!token) {
    state.value = 'invalid';
    return;
  }
  try {
    const res = await alertsStore.unsubscribe(String(token));
    label.value = res?.label || '';
    state.value = 'done';
  } catch (e) {
    state.value = 'invalid';
  }
});
</script>

<template>
  <div class="unsub">
    <div class="unsub-card">
      <template v-if="state === 'working'">
        <p class="unsub-body">Unsubscribing…</p>
      </template>
      <template v-else-if="state === 'done'">
        <h1 class="unsub-title">You're unsubscribed</h1>
        <p class="unsub-body">
          We won't email you about new projects{{ label ? ` in ${label}` : '' }} anymore.
        </p>
        <router-link to="/projects" class="unsub-link">Changed your mind? Sign up again on the projects page.</router-link>
      </template>
      <template v-else>
        <h1 class="unsub-title">That link didn't work</h1>
        <p class="unsub-body">This unsubscribe link isn't valid. Try the link in your most recent alert email.</p>
        <router-link to="/projects" class="unsub-link">Go to projects</router-link>
      </template>
    </div>
  </div>
</template>

<style scoped>
.unsub {
  background: #f7f1e3;
  min-height: 100vh;
  padding: 32px 16px;
}

html.dark .unsub {
  background: #121a12;
}

.unsub-card {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border: 1px solid #dcd3c0;
  border-radius: 14px;
}

html.dark .unsub-card {
  background: #1f2d1a;
  border-color: #3d4d36;
}

.unsub-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 22px;
  font-weight: 700;
  color: #064e3b;
  margin: 0 0 8px;
}

html.dark .unsub-title {
  color: #c8dbbf;
}

.unsub-body {
  font-size: 14.5px;
  line-height: 1.5;
  color: #4b5563;
  margin: 0 0 12px;
}

html.dark .unsub-body {
  color: #cfd8c8;
}

.unsub-link {
  font-size: 14px;
  font-weight: 700;
  color: #064e3b;
}

html.dark .unsub-link {
  color: #8aa37c;
}
</style>
