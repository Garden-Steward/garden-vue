<script setup>
import { ref, computed } from 'vue'

import { useUGInterestsStore } from '@/stores';


const props = defineProps({
  id: String,
  tag: String,
  ugArr: Array
})
const ugInterests = useUGInterestsStore();  

let ugBool = props.ugArr.find((ug)=>ug === props.id)
ugBool = (ugBool) ? true : false
console.log("uGarr: ", props.ugArr, ugBool, props.id);
const clickInterest = (evt) => {
  console.log('int clicked', evt.target, evt.target.name, evt.target.value, evt.target.id, )
  if (ugBool) {
    console.log('delete')
  } else {
    console.log('register')
    // ugInterests.register({"user":props.id,"interest":evt.target.id, "garden":props.garden})
  }
  // // let intr = props.u_g_interests.find((ugi)=> ugi.tag == interest.tag)
  // // @TODO - if turn off delete, else register
}

</script>

<template>
          <input type="checkbox" 
            :id="props.id"
            v-model="ugBool"
            @click="(event) => clickInterest(event)">
          <label class="text-sm p-1 ml-1" for="{{ props.tag }}">{{ props.tag }}</label>
</template>
