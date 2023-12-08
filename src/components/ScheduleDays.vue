<script setup>

import { Vue3SlideUpDown } from "vue3-slide-up-down";
import { ref } from "vue";
import { useWeekSchedulerStore } from '@/stores';
import { storeToRefs } from 'pinia';

const showDays = ref(false);

const toggleShow = () => {
      showDays.value = !showDays.value;
}
const props = defineProps({
//    title: String,
//    blurb: String,
//    endText: String,
//    startDatetime: String,
//    createdAt: String,
//    updatedAt: String,
//    publishedAt: String,
//    daysJournal: String,
   id: Number,
   garden: Number,
//    interests: Array,
//    interest: String,
//    task: Object,
//    disabled: Boolean,
//    status: String,
//    overview: String,
//    type: String,
//    garden_tasks: Array
 });
const weekScheduler = useWeekSchedulerStore();  
weekScheduler.find(props.garden);

const { weekscheduler } = storeToRefs(weekScheduler);
const generateInitials = (user) => {
  const name = user.attributes.username.split(' ');
  const initials = name[0].charAt(0) + name[name.length-1].charAt(0);
  return initials.toUpperCase();
}
</script>

<template>

  <div class="container mx-auto mb-3">
    <!-- Weekly Schedule Container -->
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h1 class="text-2xl font-bold mb-4 cursor-pointer" @click="toggleShow">Weekly Schedule
        <svg
          class="pl-2 w-6 h-6 fill-current inline-block mr-1"
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path v-if="!showDays" d="M10 3l-7 9h14l-7-9z" /><path v-else d="M10 17l-7-9h14z" />
        </svg>
      </h1>

      <Vue3SlideUpDown v-model="showDays">
      
        <!-- Sunday Header -->
        <div class="mb-4" v-for='sched of weekscheduler'>
          <h2 class="text-lg font-bold mb-2">{{ sched.attributes.day }}</h2>
          <div class="bg-gray-100 p-4 rounded-md">
            <h3 class="text-md font-semibold mb-2">{{ sched.attributes.recurring_task.data.attributes.title }}</h3>
  
            <!-- User Profiles within Water the Garden task -->
            <div class="flex space-x-4">
              <!-- User Profile 1 -->
              <div class="flex items-center" v-for='volunteer of sched.attributes.backup_volunteers.data'>
                <div :class="'bg-'+ volunteer.attributes.color +'-500'" class="h-10 w-10 rounded-full flex items-center justify-center">
                  <span class="text-white font-bold uppercase">{{ generateInitials(volunteer) }}</span>
                </div>
                <span class="ml-2">{{ volunteer.attributes.username }}</span>
              </div>
  
              <!-- User Profile 2 -->
              <!-- <div class="flex items-center">
                <div class="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                  <span class="text-white font-bold uppercase">U2</span>
                </div>
                <span class="ml-2">User 2</span>
              </div> -->
              <!-- Add more user profiles as needed -->
            </div>
          </div>
        </div>
      </Vue3SlideUpDown>
    </div>
  </div>
</template>