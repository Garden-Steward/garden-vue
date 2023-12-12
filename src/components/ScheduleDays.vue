<script setup>

import { Vue3SlideUpDown } from "vue3-slide-up-down";
import { ref } from "vue";
import { useWeekSchedulerStore } from '@/stores';
import { storeToRefs } from 'pinia';

const showDays = ref(false);
const showAddUserDropdown = ref(false);
const searchQuery = ref('');
const filteredUsers = ref([]);

const toggleShow = () => {
      showDays.value = !showDays.value;
}

const props = defineProps({
   id: Number,
   garden: Number,
   volunteers: Array,
 });


const weekScheduler = useWeekSchedulerStore();  
weekScheduler.find(props.garden);

const { weekscheduler } = storeToRefs(weekScheduler);
const generateInitials = (user) => {
  const name = user.attributes.username.split(' ');
  const initials = name[0].charAt(0) + name[name.length-1].charAt(0);
  return initials.toUpperCase();
}
const editMode = ref(null);

const toggleEditMode = (day) => {
  if (editMode.value === day) {
    editMode.value = null; // Exit edit mode
  } else {
    editMode.value = day; // Enter edit mode for the specified day
  }
  console.log(editMode);
}
const toggleAddUserDropdown = () => {
  console.log('vols: ',props.volunteers);
  showAddUserDropdown.value = !showAddUserDropdown.value;
}
const deleteUser = (userId) => {
  console.log('delete user: ', userId)
}
const addUserToSchedule = (user, schedId) => {
  // Logic to add user to schedule
  // ...
  console.log("adding user: ", user, schedId);
  document.getElementById("userSearch").value = "";
  let addData = {"backup_volunteers": {"connect": [user.id]}};

  weekScheduler.update(schedId, addData);

  showAddUserDropdown.value = false; // Hide dropdown after selecting a user
}
const filterUsers = () => {

  filteredUsers.value = props.volunteers.filter(user =>
    user.attributes.firstName?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    user.attributes.lastName?.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
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
          <button @click="toggleEditMode(sched.attributes.day)" class="text-blue-500 flex items-right">
            Edit
          </button>
          <div v-if="editMode == sched.attributes.day" class="bg-gray-100 p-4 rounded-md">
            <h3 class="text-md font-semibold mb-2">{{ sched.attributes.recurring_task.data.attributes.title }}</h3>
            <div class="flex space-x-4">
              <div v-for='volunteer of sched.attributes.backup_volunteers.data' :key='volunteer.id' class="flex items-center">
              
                <!-- User Profile -->
                <div :class="'bg-'+ volunteer.attributes.color +'-500'" class="h-10 w-10 rounded-full flex items-center justify-center">
                  <span class="text-white font-bold uppercase">{{ generateInitials(volunteer) }}</span>
                </div>
                <span class="ml-2">{{ volunteer.attributes.username }}</span>
  
                <!-- Negative icon to delete user -->
                <button @click="deleteUser(volunteer.id)" class="ml-2 text-red-500">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M2 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4zm3 6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10z" clip-rule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Plus icon to addUser method -->
            <button @click="toggleAddUserDropdown(sched.attributes.day)" class="flex items-center mt-2 text-green-500">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M10 18a1 1 0 0 1-1-1v-6H3a1 1 0 1 1 0-2h6V3a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 0 1-1 1z"/>
              </svg>
              Add Volunteer
            </button>
            <!-- Dropdown for addUser -->
            <div v-if="showAddUserDropdown" class="absolute top-full left-0 mt-2 bg-white border rounded-md shadow-lg w-64">
              <input v-model="searchQuery" id="userSearch" @input="filterUsers" placeholder="Search user..." class="w-full border-b focus:outline-none p-2" />

              <ul v-if="filteredUsers.length > 0" class="py-2">
                <li v-for="user in filteredUsers" :key="user.id" @click="addUserToSchedule(user,sched.id)" class="px-4 py-2 cursor-pointer hover:bg-gray-200">{{ user.attributes.firstName }} {{ user.attributes.lastName }}</li>
              </ul>
              <p v-else class="p-2">No matching users</p>
            </div>
          </div>

          <div v-else>
    
            <div class="bg-gray-100 p-4 rounded-md">
              <h3 class="text-md font-semibold mb-2">{{ sched.attributes.recurring_task.data.attributes.title }}</h3>
    
              <div class="flex space-x-4">
                <!-- User Profiles -->
                <div class="flex items-center" v-for='volunteer of sched.attributes.backup_volunteers.data'>
                  <div :class="'bg-'+ volunteer.attributes.color +'-500'" class="h-10 w-10 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold uppercase">{{ generateInitials(volunteer) }}</span>
                  </div>
                  <span class="ml-2">{{ volunteer.attributes.username }}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </Vue3SlideUpDown>
    </div>
  </div>
</template>