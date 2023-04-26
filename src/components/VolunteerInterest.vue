<script setup>
import { useUGInterestsStore } from '@/stores';


const props = defineProps({
  id: Number,
  createdAt: String,
  updatedAt: String,
  publishedAt: String,
  user: Number,
  tag: String,
  ugArr: Array,
  garden: Number
  
})
const ugInterests = useUGInterestsStore();  

let ugInfo = props.ugArr.find((ug)=>ug.interest === props.id)
let ugBool = (ugInfo) ? true : false
// Each checkbox get sent ugBool 
// console.log("uGarr: ", props.ugArr, ugBool, props.id);
const clickInterest = (evt) => {
  console.log('int clicked', evt.target, evt.target.name, evt.target.value, evt.target.id, )
  if (ugBool) {
    ugInterests.delete(ugInfo.id)
  } else {
    ugInterests.register({"user":props.user,"interest":evt.target.id, "garden":props.garden})
  }
}

</script>

<template>
          <input type="checkbox" 
            :id="props.id"
            v-model="ugBool"
            @click="(event) => clickInterest(event)">
          <label class="text-sm p-1 ml-1" for="{{ props.tag }}">{{ props.tag }}</label>
</template>
