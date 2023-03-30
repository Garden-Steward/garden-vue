<script>
import { storeToRefs } from 'pinia';
import { useRoute } from "vue-router";

import { useAuthStore, useGardensStore, useVolunteerDaysStore } from '@/stores';

import {VolunteerDayModal} from '@/components/modals'
import { VolunteerDayTasks } from '@/components'

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
    
    console.log("volunteerdays: ", volunteerDays, garden);
    
    return {user, garden, volunteerDays}
  },

  data() {
    return {
      showModal: true
    }
  },
  components: {
    VolunteerDayModal,
    VolunteerDayTasks
  },
  methods: {
    checkLoginState() {
      // this.userStore.checkLoginState()
    },
    clickVolunteer(volunteer) {
      console.log('volunteer clicked', volunteer)
    }
  }
}
</script>

<template>
    <div>
        <h1 class="text-3xl font-bold mb-5">Hi {{user?.firstName}}!</h1>
        <div class="table-auto" v-if="garden.attributes">
          <h1 class="font-medium leading-tight text-5xl mt-0 mb-2 text-blue-600">{{ garden.attributes.title }}</h1>
          <ul v-if="garden.attributes.volunteers.data.length">
            <h3 class="text-2xl text-brown-800">Volunteers ({{ garden.attributes.volunteers.data.length }})
            </h3> 
            
            <div class="grid grid-cols-6 gap-6 ml-2">
              <!-- <li class="ml-10 m-3" v-for="volunteer in garden.attributes.volunteers.data" :key="volunteer.id">{{volunteer.attributes.firstName}} {{volunteer.attributes.lastName}}</li> -->
              <div v-for="volunteer in garden.attributes.volunteers.data" :key="volunteer.id" class="m-2 border-r-4 border rounded p-2 bg-slate-100 hover:opacity-75 cursor-pointer"  @click="clickVolunteer({volunteer})">
                  <span class="underline text-m">{{ volunteer.attributes.firstName }}  {{volunteer.attributes.lastName}}</span>
              </div>
            </div>


          </ul>

          <ul v-if="volunteerDays">
            <h3 class="text-2xl text-brown-800">Events ({{ volunteerDays.length }})
            </h3> 
            <div class="grid grid-cols-1 gap-4">
              <div class="ml-10 m-3" v-for="day in volunteerDays" :key="day.id">
                <VolunteerDayModal v-bind="day" :id="day.id" :garden="garden.id" :interests="garden.attributes.interests"/>
                <VolunteerDayTasks v-bind="day" :id="day.id" />
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

</template>



