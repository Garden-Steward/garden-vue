<script setup>
import { storeToRefs } from 'pinia';
// import { router } from '@/helpers';

import { useAuthStore, useGardensStore } from '@/stores';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
console.log("gardens: ", gardens);

gardensStore.getAll(user.gardens);
const rowClick = (slug) => {
    window.location=`/gardens/${slug}`
    // router.push(`/gardens/${slug}`);
}
</script>

<template>
    <div>
        <h1 class="text-3xl font-bold mb-5">Hi {{user?.firstName}}!</h1>
        <h3>Gardens:</h3>
        <!-- <ul >
            <li v-for="garden in gardens" :key="garden.id">{{garden.make}} {{garden.model}}</li>
        </ul> -->
        <div class="grid grid-cols-4 gap-4 ml-2" v-if="gardens">
              <!-- <li class="ml-10 m-3" v-for="volunteer in garden.attributes.volunteers.data" :key="volunteer.id">{{volunteer.attributes.firstName}} {{volunteer.attributes.lastName}}</li> -->
              <div v-for="garden in gardens" :key="garden.id" 
              class="m-3 p-4 border-r-4 border rounded p-2 bg-slate-100 opacity-75 hover:opacity-100 cursor-pointer hover:bg-slate-300"  
              @click="rowClick(garden.attributes.slug)">
                  <span class="underline text-xl">{{ garden.attributes.title }}</span>
                  <p class="text-m">{{ garden.attributes.blurb }}</p>
              </div>
            </div>

        <!-- <table class="table-auto" v-if="gardens.length">
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
        </table> -->
        <div v-if="gardens.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="gardens.error" class="text-danger">Error loading gardens: {{gardens.error}}</div>
    </div>
</template>
