<script setup>
import { useUGInterestsStore } from '@/stores';
import { ref } from 'vue';

const props = defineProps({
  id: Number,
  createdAt: String,
  updatedAt: String,
  publishedAt: String,
  user: Number,
  tag: String,
  ugArr: Array,
  garden: Number,
  editor: Boolean
})
const ugInterests = useUGInterestsStore();  

let ugInfo = props.ugArr.find((ug)=>ug.interest === props.id)
let ugBool = ref(ugInfo ? true : false)
const ignoreElRef = ref()
// console.log("uGarr: ", props.ugArr, ugBool, props.id);
const toggleInterest = () => {
  ugBool.value = !ugBool.value;
  if (ugBool.value) {
    ugInterests.register({"user":props.user,"interest":props.id, "garden":props.garden})
  } else {
    ugInterests.delete(ugInfo.id)
  }
}
</script>

<template>
          <input type="checkbox" 
            :id="props.id"
            v-model="ugBool"
            @click="toggleInterest"
            :disabled="!props.editor">
          <label class="text-sm p-1 ml-1" :for="props.id" @click="toggleInterest" ref="ignoreElRef">{{ props.tag }}</label>
          
          
</template>
