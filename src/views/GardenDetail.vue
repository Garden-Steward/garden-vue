<script>
import { storeToRefs } from 'pinia';
import { useRoute } from "vue-router";
import { ref } from "vue";
import { Vue3SlideUpDown } from "vue3-slide-up-down";


import { useAuthStore, useGardensStore, useVolunteerDaysStore, useSMSCampaignStore } from '@/stores';

import {VolunteerDayModal} from '@/components/modals'
import {SmsCampaignModal} from '@/components/modals'
import { VolunteerDayTasks } from '@/components'
import Volunteer from '@/components/VolunteerDetail.vue'
import ScheduleDays from '@/components/ScheduleDays.vue'

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
    const showVol = ref(false);
    const showEvent = ref(true);
    const showCamp = ref(true);

    console.log("volunteerDays: ", volunteerDays, garden);
    
    return {user, garden, volunteerDays, smsCampaigns, showVol, showEvent, showCamp}
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
    Volunteer,
    Vue3SlideUpDown,
    ScheduleDays
},
  methods: {
    checkLoginState() {
      // this.userStore.checkLoginState()
    },
    toggleShowVol() {
      this.showVol = !this.showVol;
    },
    toggleShowEvent() {
      this.showEvent = !this.showEvent;
    },
    toggleShowCamp() {
      this.showCamp = !this.showCamp;
    },
    isMobile() {
      if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return true;
      } else {
        return false;
      }
    }
  },
  created() {
            if (this.isMobile()) {
              this.showEvent = false;
              this.showCamp = false;
            }
          }
}
</script>

<template>
    <div>
        <h1 class="text-3xl font-bold mb-5">Hi {{user?.firstName}}!</h1>
        <div class="table-auto" v-if="garden.attributes">
          <h1 class="font-medium leading-tight text-5xl mt-0 mb-2 text-white-600 p-3">{{ garden.attributes.title }}</h1>
          <p class="font-medium leading-tight text-l mt-0 mb-2 text-black p-4"><span class="f">Welcome Text</span>: {{ garden.attributes.welcome_text }}</p>
          <div class="container mx-auto mb-3">
            <article v-if="garden.attributes.volunteers?.data.length" class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-2xl font-bold cursor-pointer " @click="toggleShowVol">Volunteers ({{ garden.attributes.volunteers.data.length }})
                  <svg
                    class="pl-2 w-6 h-6 fill-current inline-block mr-1"
                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path v-if="!showVol" d="M10 3l-7 9h14l-7-9z" /><path v-else d="M10 17l-7-9h14z" />
                  </svg>
              </h3> 
              <Vue3SlideUpDown v-model="showVol">
                <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  <div v-for="volunteer in garden.attributes.volunteers.data" :key="volunteer.id">
                      <Volunteer v-bind="volunteer.attributes" :id="volunteer.id" :interests="garden.attributes.interests" :garden="garden.id"/>
                  </div>
                </div>
              </Vue3SlideUpDown>
            </article>

          </div>

          <ScheduleDays :garden="garden.id" :volunteers="garden.attributes.volunteers.data" />

          <div class="container mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Left Column Content -->
              <div class="bg-gray-200 p-2 mb-3">
                <ul v-if="volunteerDays">
                  <h3 class="text-2xl text-brown-800 p-1" @click="toggleShowEvent">Events ({{ volunteerDays.days?.length }})
                    <svg
                      class="pl-2 w-6 h-6 fill-current inline-block mr-1"
                      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path v-if="!showEvent" d="M10 3l-7 9h14l-7-9z" /><path v-else d="M10 17l-7-9h14z" />
                    </svg>

                  </h3> 
                  <VolunteerDayModal :garden="garden.id" :interests="garden.attributes.interests">
                    <div class="pb-3">
                      <div class="text-lg font-bold">Create a new Event</div>
                    </div>
                  </VolunteerDayModal>
                  <Vue3SlideUpDown v-model="showEvent">
                    <div class="grid grid-cols-1 gap-2">
                      <div class="ml-10 m-2" v-for="day in volunteerDays.days" :key="day.id">
                        <div>
                          <VolunteerDayModal v-bind="day" :garden="garden.id" :interests="garden.attributes.interests"/>
                          <VolunteerDayTasks v-bind="day" :garden="garden.id"/>
                        </div>
                      </div>
                    </div>
                  </Vue3SlideUpDown>
                </ul>
              </div>
              <!-- Right Column Content -->

              <div class="bg-gray-300 p-2 mb-3">
                <h3 class="text-2xl text-brown-800 p-1" @click="toggleShowCamp">SMS Campaigns ({{ smsCampaigns.length }})
                  <svg
                    class="pl-2 w-6 h-6 fill-current inline-block mr-1"
                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path v-if="!showCamp" d="M10 3l-7 9h14l-7-9z" /><path v-else d="M10 17l-7-9h14z" />
                  </svg>

                </h3>
                <SmsCampaignModal :garden="garden.id" :interests="garden.attributes.interests">
                  <div class="pb-3">
                    <div class="text-lg font-bold">Create a new Group SMS</div>
                  </div>
                </SmsCampaignModal>

                <div v-if="smsCampaigns">
                  <div class="grid grid-cols-1 gap-2">
                      <Vue3SlideUpDown v-model="showCamp">
                        <div class="ml-10 m-2" v-for="campaign in smsCampaigns" :key="campaign.id">
                            <SmsCampaignModal v-bind="campaign" :garden="garden.id" :interests="garden.attributes.interests"/>
                        </div>
                      </Vue3SlideUpDown>
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



