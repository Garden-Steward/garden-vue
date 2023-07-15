<script setup>
import GardenTask from '@/components/modals/GardenTask.vue'

const props = defineProps({
   title: String,
   blurb: String,
   endText: String,
   startDatetime: String,
   createdAt: String,
   updatedAt: String,
   publishedAt: String,
   daysJournal: String,
   id: Number,
   garden: Number,
   interests: Array,
   interest: String,
   task: Object,
   disabled: Boolean,
   status: String,
   overview: String,
   type: String,
   garden_tasks: Array
 });
 console.log("garden tasks: ", props.endText, props.garden_tasks)
</script>

<template>
  <div v-if="garden_tasks.length">
    <div v-for="task in garden_tasks" :key="task.id">
      <GardenTask v-bind="task" :startDatetime="startDatetime" :garden="garden" :dayId="id" />
    </div>
  </div>
  <GardenTask :startDatetime="startDatetime" :garden="garden" :dayId="id" />
</template>