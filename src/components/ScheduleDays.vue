<script setup>

import { Vue3SlideUpDown } from "vue3-slide-up-down";
import { ref } from 'vue';
import { useWeekSchedulerStore } from '@/stores';
import { storeToRefs } from 'pinia';
import UserProfileDisplay from "./UserProfileDisplay.vue";

const showDays = ref(false);
const showAddUserDropdown = ref(false);
const searchQuery = ref('');
const filteredUsers = ref([]);

const toggleShow = () => {
      showDays.value = !showDays.value;
}

const props = defineProps({
   id: Number,
   garden: Object,
   user: Object,
   editor: Boolean,
   volunteers: Array,
 });
//  const editor = garden.data.managers
const weekSchedulerStore = useWeekSchedulerStore();  
weekSchedulerStore.find(props.garden.id);

const { weekscheduler } = storeToRefs(weekSchedulerStore);

let focusSchedule = null;
const editMode = ref(null);

const toggleEditMode = (day) => {
  if (editMode.value === day) {
    editMode.value = null; // Exit edit mode
  } else {
    editMode.value = day; // Enter edit mode for the specified day
  }
}
const toggleAddUserDropdown = (day,id) => {
  focusSchedule = id;
  showAddUserDropdown.value = !showAddUserDropdown.value;
}
const deleteUser = (userId, schedId) => {
  let addData = {"backup_volunteers": {"disconnect": [userId]}};

  weekSchedulerStore.update(schedId, addData);

}
const addUserToSchedule = (user, schedId) => {
  console.log("adding user: ", user, schedId);
  // document.getElementById("userSearch").value = "";
  let addData = {"backup_volunteers": {"connect": [user.id]}};

  weekSchedulerStore.update(schedId, addData);

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
      
        <div class="mb-4" v-for="(daySchedules, day) in weekscheduler" :key="day">
          <h2 class="text-lg font-bold mb-2 flex">{{ day }}
            <span v-if="editor" @click="toggleEditMode(day)" class="text-blue-500 text-sm flex items-right text-right flex ml-3 mt-1 cursor-pointer">
            edit</span>
          </h2>
          <div v-if="editMode == day" class="bg-gray-100 mb-2 rounded-md">
            <div v-for="sched in daySchedules" :key="sched.id">
              <div class="bg-gray-100 p-4 rounded-md mb-2">
                <h3 class="text-md font-semibold mb-2">{{ sched.recurring_task.data.attributes.title }}</h3>
                <div class="flex flex-wrap -mx-2">
                  <div class="px-2 mb-2 flex" v-for='volunteer of sched.backup_volunteers.data' :key='volunteer.id'>
                    <UserProfileDisplay :volunteer="volunteer.attributes" />
    
                    <!-- Negative icon to delete user -->
                    <button @click="deleteUser(volunteer.id, sched.id)" class="ml-2 text-red-500">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M2 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4zm3 6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10z" clip-rule="evenodd"/>
                      </svg>
                    </button>
    
                  </div>

                  <button @click="toggleAddUserDropdown(sched.day, sched.id)" class="flex items-center mt-2 text-green-500">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" d="M10 18a1 1 0 0 1-1-1v-6H3a1 1 0 1 1 0-2h6V3a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 0 1-1 1z"/>
                    </svg>
                    Add Volunteer
                  </button>
                </div>
              </div>
              <div v-if="showAddUserDropdown && sched.id == focusSchedule" ref="dropdown" class="absolute bg-gray-300 rounded-md p-2 w-120">
  
                <input v-model="searchQuery" @input="filterUsers" placeholder="Search user..." class="w-full border-b focus:outline-none p-2" />
  
                <ul v-if="filteredUsers.length > 0" class="py-2">
                  <li v-for="user in filteredUsers" :key="user.id" @click="addUserToSchedule(user,sched.id)" class="px-4 py-2 cursor-pointer hover:bg-gray-200">{{ user.attributes.firstName }} {{ user.attributes.lastName }}</li>
                </ul>
                <p v-else class="p-2">No matching users</p>
              </div>
            </div>

          </div>

          <div v-else>
    
            <div v-for="sched in daySchedules" :key="sched.id">
              <div class="bg-gray-100 p-4 rounded-md mb-2">
                <h3 class="text-md font-semibold mb-2">{{ sched.recurring_task.data.attributes.title }}</h3>
      
                <div class="flex flex-wrap -mx-2">
                  <div class="px-2 mb-2 flex" v-for='volunteer of sched.backup_volunteers.data' :key="volunteer.id">
                    <UserProfileDisplay :volunteer="volunteer.attributes" />
                  </div>
                </div>
              </div>
            
            </div>

          </div>

        </div>
      </Vue3SlideUpDown>
    </div>
  </div>
</template>

<style>
/* ... (previous styles remain unchanged) ... */
/* .absolute {
  display: none;
} */

.relative:hover .absolute {
  display: block;
}
</style>