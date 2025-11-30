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
    <div class="bg-custom-light p-5 rounded-lg md:w-1/2 mx-auto">
        <h1 class="text-2xl text-center">Welcome {{ user.firstName }} {{ user.lastName }}</h1>
        <div class="text-lg mt-6 max-w-md w-full mx-auto mt-8 mb-4">
            Garden Steward is a community-driven, open-source project developing SMS-based software for managing volunteer events, watering schedules, and harvest coordination. Since 2022, we've partnered with the Oakland Urban Farming Project (OUFP) to foster urban agriculture. Join us by either setting up your own decentralized Garden Steward instance or participating in our existing network. Our cooperative approach empowers local communities to cultivate sustainable urban green spaces efficiently.
        </div>
        <p class="text-lg mt-5">Thank you for helping out with your garden! This app is currently in <strong>Beta</strong> so feedback is encouraged. Feedback & Support email: <a href="mailto:volunteer@oufp.org" class="underline mb-10">volunteer@oufp.org</a> - screenshots helpful</p>

        <p class="text-md mb-2">Bio: {{ user.bio? user.bio : 'No bio yet' }}</p>
        <p class="text-md mb-2">You're a member of <router-link to="/manage/gardens" class="font-bold">{{ gardens.length }} gardens.</router-link></p>
        <p><a href="/manage/gardens" class="hover:underline text-slate-50 mt-3 btn btn-secondary bg-custom-green hover:bg-custom-green active:bg-custom-green border-white">
              View Gardens
          </a></p>
    </div>
</template>
