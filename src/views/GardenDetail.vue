<script>
import { storeToRefs } from 'pinia';
import { useRoute } from "vue-router";

import { useAuthStore, useGardensStore, useVolunteerDaysStore } from '@/stores';

import {VolunteerDayModal} from '@/components/modals'
import { VolunteerDayTasks } from '@/components'
import Volunteer from '@/components/VolunteerDetail.vue'

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
    VolunteerDayTasks,
    Volunteer
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
        <div class="table-auto" v-if="garden.attributes">
          <h1 class="font-medium leading-tight text-5xl mt-0 mb-2 text-blue-600">{{ garden.attributes.title }}</h1>

          <article v-if="garden.attributes.volunteers.data.length">
            <h3 class="text-2xl text-brown-800">Volunteers ({{ garden.attributes.volunteers.data.length }})
            </h3> 
            <div class="grid grid-cols-4 gap-3 ml-2">
              <div v-for="volunteer in garden.attributes.volunteers.data" :key="volunteer.id" class="m-2 border-r-4 border rounded p-2 bg-slate-100">
                  <Volunteer v-bind="volunteer.attributes" :id="volunteer.id" :interests="garden.attributes.interests" :garden="garden.id"/>
              </div>
            </div>
          </article>

          <ul v-if="volunteerDays">
            <h3 class="text-2xl text-brown-800">Events ({{ volunteerDays.days.length }})
            </h3> 
            <div class="grid grid-cols-1 gap-4">
              <div class="ml-10 m-3" v-for="day in volunteerDays.days" :key="day.id">
                <div>
                  <VolunteerDayModal v-bind="day" :garden="garden.id" :interests="garden.attributes.interests"/>
                  <VolunteerDayTasks v-bind="day" :garden="garden.id"/>
                </div>
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



