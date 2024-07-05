<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useGardensStore, useEventStore } from '@/stores';

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);
const eventStore = useEventStore();
const { volunteerDays } = storeToRefs(eventStore);
gardensStore.getAll(user.value.id);
eventStore.getUserEvents();

const rowClick = (slug) => {
    window.location=`/gardens/${slug}`
}

const displayDate = (date) => {
    return new Date(date).toLocaleDateString();
}

const volunteerDayClick = (id) => {
    window.location=`/d/${id}`
}
</script>

<template>
    <div class="bg-custom-light p-5 rounded-lg mx-auto">
        <h1 class="text-lg font-bold mb-5">Hi {{user?.firstName}}!</h1>
        <h3 class="text-3xl font-bold mb-2 mt-2">Garden Projects:</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-2" v-if="gardens">
              <div v-for="garden in gardens" :key="garden.id" 
              class="m-3 p-4 border-r-4 border rounded p-2 bg-white hover:opacity-70 cursor-pointer hover:bg-yellow-300"  
              @click="rowClick(garden.attributes.slug)">
                  <span class="text-xl font-bold">{{ garden.attributes?.title }}</span>
                  <p class="text-m mb-2">{{ garden.attributes?.blurb }}</p>
                  <p class="text-m">Managers: {{ garden.attributes?.managers?.data?.length }}</p>
              </div>
              <a class="m-3 p-4 border-r-4 border rounded p-2 bg-white hover:opacity-70 cursor-pointer hover:bg-yellow-300 hover:no-underline"  
              href="/apply">
                  <span class="text-5xl font-bold">+</span>
                  <p class="text-m mb-2">Apply for a new garden</p>
            </a>
        </div>

        <div v-if="volunteerDays.days?.length">
            <h3 class="text-3xl font-bold mb-2 mt-2">Upcoming Events:</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div v-for="day in volunteerDays.days" :key="day.id" 
                class="m-3 p-4 border-r-4 border rounded p-2 bg-white hover:opacity-70 cursor-pointer hover:bg-yellow-300"  
            @click="volunteerDayClick(day.id)">
                <span class="text-xl font-bold">{{ day.title }}</span>
                <p class="text-m mb-2">{{ day.blurb }}</p>
                <p class="text-m">{{ displayDate(day.startDatetime) }}</p>
                </div>
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
