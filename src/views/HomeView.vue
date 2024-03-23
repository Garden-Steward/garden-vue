<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useGardensStore } from '@/stores';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
console.log("gardens: ", gardens, user.value);

gardensStore.getAll(user.value.id);
</script>

<template>
    <div class="bg-yellow-200 p-5 rounded-lg md:w-1/2 mx-auto">
        <h1 class="text-2xl">Welcome to Garden Steward!</h1>
        <p class="text-md mb-5">Hi there {{ user.firstName }} {{ user.lastName }}!</p>
        <p class="text-md mb-2">Bio: {{ user.bio? user.bio : 'No bio yet' }}</p>
        <p class="text-md mb-2">You're a member of <router-link to="/gardens" class="font-bold">{{ gardens.length }} gardens.</router-link></p>
    </div>
</template>
