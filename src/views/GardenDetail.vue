<script>
import { storeToRefs } from 'pinia';
import { useRoute } from "vue-router";

import { useAuthStore, useGardensStore, useVolunteerDaysStore, useSMSCampaignStore } from '@/stores';

import {VolunteerDayModal} from '@/components/modals'
import {SmsCampaignModal} from '@/components/modals'
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
    const campaignStore = useSMSCampaignStore();  
    const route = useRoute()
    gardensStore.getSlug(route.params.slug)
    volunteerDaysStore.getByGarden(route.params.slug)
    campaignStore.getByGarden(route.params.slug)
    const { garden } = storeToRefs(gardensStore);
    const { volunteerDays } = storeToRefs(volunteerDaysStore);
    const { smsCampaigns } = storeToRefs(campaignStore);
    
    console.log("smsCampaigns: ", smsCampaigns, garden);
    
    return {user, garden, volunteerDays, smsCampaigns}
  },

  data() {
    return {
      showModal: true
    }
  },
  components: {
    VolunteerDayModal,
    SmsCampaignModal,
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
              <div v-for="volunteer in garden.attributes.volunteers.data" :key="volunteer.id">
                  <Volunteer v-bind="volunteer.attributes" :id="volunteer.id" :interests="garden.attributes.interests" :garden="garden.id"/>
              </div>
            </div>
          </article>

          <div class="flex">
            <div class="w-1/2 p-4">
              <!-- Left Column Content -->
              <div class="bg-gray-200 p-2">
                <h3 class="text-2xl text-brown-800">Events</h3>
                <ul v-if="volunteerDays">
                  <h3 class="text-l text-brown-800">Historic Events Count: ({{ volunteerDays.days.length }})
                  </h3> 
                  <VolunteerDayModal :garden="garden.id" :interests="garden.attributes.interests">
                    <div class="pb-3">
                      <div class="text-lg font-bold">Create a new Event</div>
                    </div>
                  </VolunteerDayModal>

                  <div class="grid grid-cols-1 gap-2">
                    <div class="ml-10 m-2" v-for="day in volunteerDays.days" :key="day.id">
                      <div>
                        <VolunteerDayModal v-bind="day" :garden="garden.id" :interests="garden.attributes.interests"/>
                        <VolunteerDayTasks v-bind="day" :garden="garden.id"/>
                      </div>
                    </div>
                  </div>
                </ul>
              </div>
            </div>
            <div class="w-1/2 p-4">
              <!-- Right Column Content -->

              <div class="bg-gray-300 p-2">
                <h3 class="text-2xl text-brown-800">SMS Campaigns ({{ smsCampaigns.length }})</h3>
                <SmsCampaignModal :garden="garden.id" :interests="garden.attributes.interests">
                  <div class="pb-3">
                    <div class="text-lg font-bold">Create a new Group SMS</div>
                  </div>
                </SmsCampaignModal>

                <div v-if="smsCampaigns">
                  <div class="grid grid-cols-1 gap-2">
                    <div class="ml-10 m-2" v-for="campaign in smsCampaigns" :key="campaign.id">
                      <div>
                        <!-- {{ campaign.createdAt }} // Sent to: {{ campaign.sent.length }} -->
                        <SmsCampaignModal v-bind="campaign" :garden="garden.id" :interests="garden.attributes.interests"/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="volunteerDays.loading" class="spinner-border spinner-border-sm"></div>
          <div v-if="volunteerDays.error" class="text-danger">Error loading volunteer days: {{volunteerDays.error}}</div>
          <div v-if="smsCampaigns.loading" class="spinner-border spinner-border-sm"></div>
          <div v-if="smsCampaigns.error" class="text-danger">Error loading sms campaigns: {{smsCampaigns.error}}</div>

        </div>
        <div v-if="garden.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="garden.error" class="text-danger">Error loading gardens: {{garden.error}}</div>

    </div>

</template>



