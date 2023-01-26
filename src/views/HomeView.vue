<script setup>
import { storeToRefs } from 'pinia';

import { useAuthStore, useVehiclesStore } from '@/stores';

const authStore = useAuthStore();
const { user: authUser } = storeToRefs(authStore);

const vehiclesStore = useVehiclesStore();
const { vehicles } = storeToRefs(vehiclesStore);

vehiclesStore.getAll();
console.log(vehicles)
</script>

<template>
    <div>
        <h1 class="text-3xl font-bold mb-5">Hi {{authUser?.firstName}}!</h1>
        <h3>Vehicles from secure api end point:</h3>
        <!-- <ul >
            <li v-for="vehicle in vehicles" :key="vehicle.id">{{vehicle.make}} {{vehicle.model}}</li>
        </ul> -->
        <table class="table-auto" v-if="vehicles.length">
            <thead>
                <tr class="">
                    <th></th>
                    <th class="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">Make</th>
                    <th class="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">Model</th>
                    <th class="border-b dark:border-slate-600 font-medium p-4 pl-8 pt-0 pb-3 text-slate-400 dark:text-slate-200 text-left">Year</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="vehicle in vehicles" :key="vehicle.id">
                    <td><img v-bind:src=vehicle.thumbnail /></td>
                    <td class="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">{{ vehicle.make }}</td>
                    <td class="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">{{ vehicle.model }}</td>
                    <td class="border-b border-slate-100 dark:border-slate-700 p-4 pl-8 text-slate-500 dark:text-slate-400">{{ vehicle.year }}</td>
                </tr>
            </tbody>
        </table>
        <div v-if="vehicles.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="vehicles.error" class="text-danger">Error loading vehicles: {{vehicles.error}}</div>
    </div>
</template>
