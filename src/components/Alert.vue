<script setup>
import { storeToRefs } from 'pinia';
import { watch, onBeforeUnmount } from 'vue';
import { useAlertStore } from '@/stores';
const alertStore = useAlertStore();
const { alert } = storeToRefs(alertStore);

let autoDismissTimeout = null;

watch(alert, (newAlert) => {
  // Clear any existing timeout
  if (autoDismissTimeout) {
    clearTimeout(autoDismissTimeout);
    autoDismissTimeout = null;
  }
  
  // Auto-dismiss all alerts after 3 seconds
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
    <div v-if="alert" class="container">
        <div class="m-3">
            <div class="alert alert-dismissable" :class="alert.type">
                <button @click="alertStore.clear()" class="btn btn-link close">&times;</button>
                {{alert.message}}
            </div>
        </div>
    </div>
</template>