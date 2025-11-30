<script setup>

import { ref } from 'vue';
import { useWeekSchedulerStore } from '@/stores';
import { storeToRefs } from 'pinia';
import UserProfileDisplay from "./UserProfileDisplay.vue";

const showAddUserDropdown = ref(false);
const searchQuery = ref('');
const filteredUsers = ref([]);

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
const addUserToSchedule = (volunteer, schedId) => {
  let addData = {"backup_volunteers": {"connect": [volunteer.id]}};

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
    <div>
        <div class="mb-4" v-for="day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']" :key="day">
          <h2 class="text-lg font-bold mb-1 flex">{{ day }}
            <span v-if="editor" @click="toggleEditMode(day)" class="text-blue-500 text-sm flex items-right text-right flex ml-3 mt-1 cursor-pointer">
            edit</span>
          </h2>
          <div v-if="editMode == day" class="bg-gray-100 mb-1 rounded-md">
            <div v-for="sched in (weekscheduler[day] || [])" :key="sched.id">
              <div v-if="sched.recurring_task?.data?.attributes?.scheduler_type !== 'No Schedule'" class="bg-gray-100 p-2 pl-4 rounded-md mb-1">
                <div class="flex flex-col md:flex-row md:items-center">
                  <h3 class="text-sm font-semibold mb-1 md:mb-0 md:w-1/4">{{ sched.recurring_task?.data?.attributes?.title }}</h3>
                  <div class="flex flex-wrap md:w-3/4 md:pl-2">
                    <div v-for='volunteer of sched.backup_volunteers?.data || []' :key='volunteer?.id' class="flex items-center mr-1">
                      <UserProfileDisplay v-if="volunteer?.attributes" :volunteer="volunteer.attributes" />
                      <button v-if="editMode === day" @click="deleteUser(volunteer.id, sched.id)" class="ml-1 text-red-500">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fill-rule="evenodd" d="M2 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4zm3 6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10z" clip-rule="evenodd"/>
                        </svg>
                      </button>
                    </div>
                    <button v-if="editMode === day" @click="toggleAddUserDropdown(sched.day, sched.id)" class="flex items-center text-green-500">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M10 18a1 1 0 0 1-1-1v-6H3a1 1 0 1 1 0-2h6V3a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 0 1-1 1z"/>
                      </svg>
                      Add
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="showAddUserDropdown && sched.id == focusSchedule" ref="dropdown" class="absolute bg-gray-300 rounded-md p-2 w-120">
  
                <input v-model="searchQuery" @input="filterUsers" placeholder="Search user..." class="w-full border-b focus:outline-none p-2" />
  
                <ul v-if="filteredUsers.length > 0" class="py-2">
                  <li v-for="volunteer in filteredUsers" :key="volunteer.id" @click="addUserToSchedule(volunteer,sched.id)" class="px-4 py-2 cursor-pointer hover:bg-gray-200">{{ volunteer.attributes.firstName }} {{ volunteer.attributes.lastName }}</li>
                </ul>
                <p v-else class="p-2">No matching users</p>
              </div>
            </div>

          </div>

          <div v-else>
            <div v-if="weekscheduler[day] && weekscheduler[day].length > 0">
              <div v-for="sched in weekscheduler[day]" :key="sched.id">
                <div v-if="sched.recurring_task?.data?.attributes?.scheduler_type !== 'No Schedule'" class="bg-gray-100 p-2 pl-4 rounded-md mb-1">
                  <div class="flex flex-col md:flex-row md:items-center">
                    <h3 class="text-sm font-semibold mb-1 md:mb-0 md:w-1/4">{{ sched.recurring_task?.data?.attributes?.title }}</h3>
                    <div class="flex flex-wrap md:w-3/4 md:pl-2">
                      <div v-for='volunteer of sched.backup_volunteers?.data || []' :key="volunteer?.id" class="flex items-center mr-1">
                        <UserProfileDisplay v-if="volunteer?.attributes" :volunteer="volunteer.attributes" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="bg-gray-100 p-2 pl-4 rounded-md mb-1">
              <p class="text-gray-500 italic text-sm">No tasks scheduled for this day</p>
            </div>
          </div>

        </div>
    </div>
    <!-- Add this new link section -->
    <div class="text-center mt-4">
      <router-link 
        :to="`/manage/gardens/${props.garden.id}/messages`" 
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        View Task Messages
      </router-link>
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