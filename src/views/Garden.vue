<script>
import { storeToRefs } from 'pinia';
import { useRoute } from "vue-router";

import { useAuthStore, useGardensStore, useVolunteerDaysStore } from '@/stores';

import {VolunteerDayModal} from '@/components/modals'

export default {
  name: "GardenView",
  setup() {
    // initialize the store
    const authStore = useAuthStore();
    const { user } = storeToRefs(authStore);
    const gardensStore = useGardensStore();  
    const volunteerDaysStore = useVolunteerDaysStore();  
    const route = useRoute()
    gardensStore.getSlug(route.params.slug)
    volunteerDaysStore.getByGarden(route.params.slug)
    const { garden } = storeToRefs(gardensStore);
    const { volunteerDays } = storeToRefs(volunteerDaysStore);
    console.log("volunteerdays: ", volunteerDays);
    
    return {user, garden, volunteerDays}
  },

  data() {
    return {
      showModal: true
    }
  },
  components: {
    VolunteerDayModal
  },
  methods: {
    checkLoginState() {
      // this.userStore.checkLoginState()
    }
  }
}
</script>

<template>
    <div>
        <h1 class="text-3xl font-bold mb-5">Hi {{user?.firstName}}!</h1>
        <div class="table-auto" v-if="garden.id">
          <h1 class="font-medium leading-tight text-5xl mt-0 mb-2 text-blue-600">{{ garden.attributes.title }}</h1>
          <ul v-if="garden.attributes.volunteers.data.length">
            <h3 class="text-2xl text-brown-800">Volunteers ({{ garden.attributes.volunteers.data.length }})
            </h3> 
            
            <li class="ml-10 m-3" v-for="volunteer in garden.attributes.volunteers.data" :key="volunteer.id">{{volunteer.attributes.firstName}} {{volunteer.attributes.lastName}}</li>
          </ul>

          <ul v-if="volunteerDays">
            <h3 class="text-2xl text-brown-800">Volunteer Days ({{ volunteerDays.length }})
            </h3> 
            <div class="grid grid-cols-4 gap-4">
              <div class="ml-10 m-3" v-for="day in volunteerDays" :key="day.id">
                <VolunteerDayModal v-bind="day.attributes" :id="day.id" :garden="garden.id"/>
              </div>
            </div>
          </ul>
          <div v-if="volunteerDays.loading" class="spinner-border spinner-border-sm"></div>
          <div v-if="volunteerDays.error" class="text-danger">Error loading volunteer days: {{volunteerDays.error}}</div>

            <VolunteerDayModal :garden="garden.id">
              <div class="pb-3">
                <div class="text-lg font-bold">Create a new Volunteer Day</div>
              </div>
            </VolunteerDayModal>

        </div>
        <div v-if="garden.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="garden.error" class="text-danger">Error loading gardens: {{garden.error}}</div>

    </div>

    <!-- Modal -->
    <div class="modal fade fixed top-0 left-0 hidden w-full h-full outline-none overflow-x-hidden overflow-y-auto"
      id="volunteerDayModal" tabindex="-1" aria-labelledby="volunteerDayModalLabel" aria-hidden="true">
      <div class="modal-dialog relative w-auto pointer-events-none">
        <div
          class="modal-content border-none shadow-lg relative flex flex-col w-full pointer-events-auto bg-white bg-clip-padding rounded-md outline-none text-current">
          <div
            class="modal-header flex flex-shrink-0 items-center justify-between p-4 border-b border-gray-200 rounded-t-md">
            <h5 class="text-xl font-medium leading-normal text-gray-800" id="volunteerDayModalLabel">Volunteer Day</h5>
            <button type="button"
              class="btn-close box-content w-4 h-4 p-1 text-black border-none rounded-none opacity-50 focus:shadow-none focus:outline-none focus:opacity-100 hover:text-black hover:opacity-75 hover:no-underline"
              data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body relative p-4">
            Modal body text goes here.
          </div>
          
        </div>
      </div>
    </div>
</template>



