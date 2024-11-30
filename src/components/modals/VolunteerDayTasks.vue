<script setup>
import GardenTask from '@/components/modals/GardenTask.vue'

defineProps({
   title: String,
   blurb: String,
   endText: String,
   startDatetime: String,
   createdAt: String,
   updatedAt: String,
   publishedAt: String,
   content: String,
   id: Number,
   garden: Number,
   interests: Array,
   interest: String,
   task: Object,
   disabled: Boolean,
   status: String,
   overview: String,
   type: String,
   garden_tasks: Array,
   editor: Boolean
 });
//  console.log("garden tasks: ", endText, garden_tasks)
</script>

<template>
  <div v-if="garden_tasks?.length">
    <h3 class="text-lg">Prepare for the day:</h3>
    <div v-for="task in garden_tasks" :key="task.id" class="ml-3 mt-3">
      <GardenTask v-bind="task" :startDatetime="startDatetime" :garden="garden" :dayId="id" />
    </div>
  </div>
  <div class="clear-both mb-4">
    <GardenTask :startDatetime="startDatetime" :garden="garden" :dayId="id" />
  </div>
</template>