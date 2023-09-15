<script setup>
import VolunteerInterest from '@/components/VolunteerInterest.vue'
import { backendHelper } from '@/helpers';

const props = defineProps({
  id: Number,
  garden: Number,
  firstName: String,
  email: String,
  lastName: String,
  phoneNumber: String,
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
const requestRegistration = (id) => {
  console.log('request reg clicked', id)
  backendHelper.requestRegistration(id).then((res)=> {
    console.log("vd resp: ", res);
  });
  
}
</script>

<template>
    <div>
        <h2 class="hover:opacity-75 cursor-pointer"  @click="clickVolunteer({id, email})">{{ firstName }} {{ lastName }}</h2>
        <div v-for="interest in interests" :key="interest.id" :value="interest.tag">
          <VolunteerInterest v-bind="interest" :ugArr="ugArr" :garden="props.garden" :user="props.id"></VolunteerInterest>
        </div>
        <div v-if="email =='test@test.com'">
          <button @click="requestRegistration({id})" class='bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-black py-1 px-3 border border-blue-500 hover:border-transparent rounded' href="#">Request Complete Registration</button>
        </div>
        
    </div>
</template>
