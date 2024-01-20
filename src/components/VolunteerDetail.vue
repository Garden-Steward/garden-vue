<script setup>
import VolunteerInterest from '@/components/VolunteerInterest.vue'
import { backendHelper } from '@/helpers';
import { ref, onMounted, onUnmounted } from 'vue';
import { format } from 'date-fns'

const dropDown = ref(0);
let root = ref(null);

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

let ugArr, basicUgArr
if (props.u_g_interests.data) {
  ugArr = props.u_g_interests.data.filter((ugi)=> ugi.attributes.interest && ugi.attributes.garden.data.id == props.garden)
  basicUgArr = ugArr.map((ugi)=> {
      return ugi.attributes.interest.data.id
  })
  ugArr = ugArr.map((ugi)=> {
      return {interest: ugi.attributes.interest.data.id, id: ugi.id}
  })
  console.log(ugArr)
}
const prettyDay = format(new Date(props.createdAt), 'PPP');

const clickVolunteer = (volunteer) => {
  console.log('volunteer clicked', volunteer)
}
const requestRegistration = (id) => {
  console.log('request reg clicked', id)
  backendHelper.requestRegistration(id).then((res)=> {
    console.log("vd resp: ", res);
  });
}
const toggleDropdown = () => {
  if (dropDown.value == false) {
    setTimeout(()=> {
      dropDown.value = true;
    }, 200);
  }
}
let displayName = (props.firstName || props.lastName) ? `${props.firstName} ${props.lastName}` : props.phoneNumber;
const handleClickOutside = (event) => {
    if (!root?.value?.$el?.contains(event.target) && dropDown.value == true) {
      dropDown.value = false;
    }
  };

onMounted(() => {

  window.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
});

</script>

<template>
  <div ref="root" class="m-2 border-r-4 border rounded bg-slate-100">
    <div @click="toggleDropdown" class="cursor-pointer p-3">
      <div class="flex items-center justify-between">
        <div class="flex-1 pr-4">
          <span>{{ displayName }}</span>
          <div><span v-for="interest in interests" :key="interest.id" :value="interest.tag">
            {{ basicUgArr && basicUgArr.find(ug => ug == interest.id) ? interest.tag.charAt(0) : '' }}
          </span></div>
        </div>
        <div class="cursor-pointer">
          <svg
            class="pl-2 w-6 h-6 fill-current inline-block mr-1"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path v-if="!dropDown" d="M10 3l-7 9h14l-7-9z" /><path v-else d="M10 17l-7-9h14z" />
          </svg>
        </div>
      </div>
    </div>
    <div v-show="dropDown" class="absolute mt-2 p-2 bg-white border rounded-lg shadow-lg">
      <h2 class="hover:opacity-75 cursor-pointer"  @click="clickVolunteer({id, email})"></h2>
        <p><span class="font-semibold py-2">Registered:</span> {{ prettyDay }}</p>
        <p><span class="font-semibold py-2">Email:</span> {{ email }}</p>
        <p><span class="font-semibold py-2">Phone:</span> {{ phoneNumber }}</p>
        <p><span class="font-semibold py-3">Interests:</span></p>
        <div v-for="interest in interests" :key="interest.id" :value="interest.tag">
          <VolunteerInterest v-bind="interest" :ugArr="ugArr" :garden="props.garden" :user="props.id"></VolunteerInterest>
        </div>
        <div v-if="email =='test@test.com'">
          <button @click="requestRegistration({id})" class='bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-black py-1 px-3 border border-blue-500 hover:border-transparent rounded' href="#">Request Complete Registration</button>
        </div>
    </div>
        
  </div>
</template>
