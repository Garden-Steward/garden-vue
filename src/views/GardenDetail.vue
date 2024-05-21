<script setup>
import { onUpdated, ref } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore, useGardensStore, useVolunteerDaysStore, useSMSCampaignStore, useUGInterestsStore, useAlertStore } from '@/stores';
import VolunteerDayModal from '@/components/modals/VolunteerDayModal.vue';
import SmsCampaignModal from '@/components/modals/SmsCampaignModal.vue';
import VolunteerDayTasks from '@/components/modals/VolunteerDayTasks.vue';
import Volunteer from '@/components/VolunteerDetail.vue';
import ScheduleDays from '@/components/ScheduleDays.vue';
import { Vue3SlideUpDown } from 'vue3-slide-up-down';

const authStore = useAuthStore();
const gardensStore = useGardensStore();
const volunteerDaysStore = useVolunteerDaysStore();
const campaignStore = useSMSCampaignStore();
const interestStore = useUGInterestsStore();
const alertStore = useAlertStore();
const route = useRoute();

const { user } = storeToRefs(authStore);
const { garden } = storeToRefs(gardensStore);
const { volunteerDays } = storeToRefs(volunteerDaysStore);
const { smsCampaigns } = storeToRefs(campaignStore);

gardensStore.getSlug(route.params.slug);
volunteerDaysStore.getByGarden(route.params.slug);
campaignStore.getByGarden(route.params.slug);

const showVol = ref(false);
const showEvent = ref(true);
const showCamp = ref(true);
let editor = ref(false);

onUpdated(() => {
  editor.value = garden.value.loading !== true && garden.value.attributes.managers.data.some(manager => manager.id === user.value.id);
  console.log('editor updated, ', editor.value);
});

const clearTemp = async () => {
  const gardenObject = garden.value;
  const resp = await interestStore.cleartemp(gardenObject.id);
  console.log(resp);
  alertStore.success('All Temporary Interests have been cleared.');
};

const toggleShowVol = () => {
  showVol.value = !showVol.value;
};

const toggleShowEvent = () => {
  showEvent.value = !showEvent.value;
};

const toggleShowCamp = () => {
  showCamp.value = !showCamp.value;
};

const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

if (isMobile()) {
  showEvent.value = false;
  showCamp.value = false;
}
</script>

<template>
    <div class="bg-custom-light p-5 rounded-lg mx-auto">
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
                <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-2 relative">
                  <a @click="clearTemp" class="absolute top-0 right-0">Clear Temps</a>
                  <div v-for="volunteer in garden.attributes.volunteers.data" :key="volunteer.id">
                      <Volunteer v-bind="volunteer.attributes" :id="volunteer.id" :interests="garden.attributes.interests" :garden="garden.id" :editor="editor"/>
                  </div>
                </div>
              </Vue3SlideUpDown>
            </article>

          </div>

          <ScheduleDays :garden="garden" :volunteers="garden.attributes.volunteers.data" :editor="editor"/>

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
                  <VolunteerDayModal :garden="garden.id" :interests="garden.attributes.interests" :editor="editor" >
                  </VolunteerDayModal>
                  <Vue3SlideUpDown v-model="showEvent">
                    <div class="grid grid-cols-1 gap-2">
                      <div class="ml-10 m-2" v-for="day in volunteerDays.days" :key="day.id">
                        <div>
                          <VolunteerDayModal v-bind="day" :garden="garden.id" :interests="garden.attributes.interests" :editor="editor" :key="garden.id"/>
                          <VolunteerDayTasks v-bind="day" :garden="garden.id" :editor="editor"/>
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
                <SmsCampaignModal :garden="garden.id" :interests="garden.attributes.interests" :editor="editor">
                    <div class="text-lg font-bold">Create a new Group SMS</div>
                </SmsCampaignModal>

                <div v-if="smsCampaigns?.length">
                  <div class="grid grid-cols-1 gap-2">
                      <Vue3SlideUpDown v-model="showCamp">
                        <div class="ml-10 m-2" v-for="(campaign, index) in smsCampaigns.slice(0, 20)" :key="campaign.id">
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

<script>
export default {
  components: {
    VolunteerDayModal,
    SmsCampaignModal,
    VolunteerDayTasks,
    Volunteer,
    Vue3SlideUpDown,
    ScheduleDays
  }
};
</script>
