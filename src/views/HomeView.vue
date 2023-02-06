<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useGardensStore } from '@/stores';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
console.log("gardens: ", gardens);
gardensStore.getAll();
const rowClick = (slug) => {
    window.location=`/gardens/${slug}`
}
</script>

<template>
    <div>
        <h1 class="text-3xl font-bold mb-5">Hi {{user?.firstName}}!</h1>
        <h3>Gardens:</h3>
        <!-- <ul >
            <li v-for="garden in gardens" :key="garden.id">{{garden.make}} {{garden.model}}</li>
        </ul> -->
        <table class="table-auto" v-if="gardens.length">
            <thead>
                <tr class="">
                    <th class="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">Title</th>
                    <th class="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">Blurb</th>
                    <th class="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">SMS Starter</th>
                </tr>
            </thead>
            <tbody>

                <tr v-for="garden in gardens" :key="garden.id" @click="rowClick(garden.attributes.slug)">
                    <td class="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">{{ garden.attributes.title }}</td>
                    <td class="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">{{ garden.attributes.blurb }}</td>
                    <td class="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">{{ garden.attributes.sms_slug }}</td>
                </tr>
            </tbody>
        </table>
        <div v-if="gardens.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="gardens.error" class="text-danger">Error loading gardens: {{gardens.error}}</div>
    </div>
</template>
