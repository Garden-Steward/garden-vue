<script setup>
import VolunteerInterest from '@/components/VolunteerInterest.vue'

const props = defineProps({
  id: String,
  garden: Number,
  firstName: String,
  lastName: String,
  interests: Array,
  u_g_interests: Array
})
let ugArr 
if (props.u_g_interests) {
  ugArr = props.u_g_interests.data.map((ugi)=> {
    if (ugi.attributes.interest.data && ugi.attributes.interest.data) {
      return ugi.attributes.interest.data.id
    }
  })
}

const clickVolunteer = (volunteer) => {
  console.log('volunteer clicked', volunteer)
}

</script>

<template>
    <div>
        <h2 class="hover:opacity-75 cursor-pointer"  @click="clickVolunteer({volunteer})">{{ firstName }} {{ lastName }}</h2>
        <div v-for="interest in interests" :key="interest.id" :value="interest.tag">
          <VolunteerInterest v-bind="interest" :ugArr="ugArr"></VolunteerInterest>
        </div>
        
    </div>
</template>
