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
          <div class="flex items-center mb-2">
            <input type="checkbox" 
              :id="props.id"
              v-model="ugBool"
              @click="toggleInterest"
              :disabled="!props.editor"
              class="w-4 h-4 text-custom-green bg-[rgba(26,26,26,0.8)] border-[#3d4d36] rounded focus:ring-custom-green focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <label class="text-sm p-1 ml-2 text-[#f5f5f5] cursor-pointer" :for="props.id" @click="toggleInterest" ref="ignoreElRef">{{ props.tag }}</label>
          </div>
</template>
