<script setup>
import VolunteerInterest from '@/components/VolunteerInterest.vue'

const props = defineProps({
  id: Number,
  garden: Number,
  firstName: String,
  lastName: String,
  createdAt: String,
  updatedAt: String,
  publishedAt: String,
  interests: Array,
  u_g_interests: Object
})
let ugArr 
if (props.u_g_interests.data) {
  // console.log("u_g_interests: ", props.u_g_interests.data, props.id)
  ugArr = props.u_g_interests.data.filter((ugi)=> ugi.attributes.interest && ugi.attributes.garden.data.id == props.garden)
  ugArr = ugArr.map((ugi)=> {
      return {interest: ugi.attributes.interest.data.id, id: ugi.id}
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
          <VolunteerInterest v-bind="interest" :ugArr="ugArr" :garden="props.garden" :user="props.id"></VolunteerInterest>
        </div>
        
    </div>
</template>
