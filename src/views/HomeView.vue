<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useGardensStore } from '@/stores';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
console.log("gardens: ", gardens);
gardensStore.getAll();
</script>

<template>
    <div>
        <h1 class="text-3xl font-bold mb-5">Hi {{user?.firstName}}!</h1>
        <h3>Welcome!</h3>
    </div>
</template>
