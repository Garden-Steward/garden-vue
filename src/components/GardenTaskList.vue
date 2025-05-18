<script setup>
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useGardenTaskStore } from '@/stores';
import GardenTask from '@/components/modals/GardenTask.vue';

const props = defineProps({
  garden: {
    type: Object,
    required: true
  },
  editor: {
    type: Boolean,
    default: false
  }
});

const gardenTaskStore = useGardenTaskStore();
const { gardenTasks } = storeToRefs(gardenTaskStore);

// Fetch tasks when garden changes
watch(() => props.garden?.id, (newId) => {
  if (newId) {
    console.log("Fetching tasks for garden:", newId);
    gardenTaskStore.getGardenTasks(newId);
  }
}, { immediate: true });

const tasks = computed(() => {
  console.log("gardenTasks value:", gardenTasks.value);
  if (!gardenTasks.value) return [];
  const allTasks = Array.isArray(gardenTasks.value) ? gardenTasks.value : [];
  return allTasks.filter(task => {
    const status = task.attributes?.status;
    return status !== 'ABANDONED' && status !== 'SKIPPED';
  });
});
</script>

<template>
  <div class="bg-purple-100 p-1 md:p-6 rounded-lg shadow-md mb-4 cursor-pointer">
    
    <!-- Headers for desktop -->
    <div v-if="tasks.length" class="hidden md:grid md:grid-cols-12 md:gap-4 mb-2">
      <div class="col-span-4"></div>
      <div class="col-span-4"></div>
      <div class="col-span-4 flex justify-between text-sm text-gray-600">
        <span>Status</span>
        <span>Category</span>
      </div>
    </div>
    
    <div v-if="tasks.length" class="space-y-4">
      <div v-for="task in tasks" :key="task.id" class="ml-3">
        <GardenTask 
          v-bind="task.attributes" 
          :id="task.id"
          :garden="garden.id"
          :editor="editor"
        />
      </div>
    </div>
    
    <div v-else class="text-gray-500 italic">
      No tasks available at this time
    </div>

    <!-- Create new task button for editors -->
    <div v-if="editor" class="mt-4">
      <GardenTask 
        :garden="garden.id"
        :editor="editor"
      />
    </div>
  </div>
</template> 