<script setup>
import { computed, onMounted, watch } from 'vue';
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

// Fetch tasks when component mounts or garden changes
onMounted(() => {
  if (props.garden?.id) {
    gardenTaskStore.getGardenTasks(props.garden.id);
  }
});

watch(() => props.garden?.id, (newId) => {
  if (newId) {
    gardenTaskStore.getGardenTasks(newId);
  }
});

const tasks = computed(() => {
  console.log("gardenTasks: ", gardenTasks.value)
  return gardenTasks.value || [];
});
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-md mb-4">
    <h3 class="text-2xl font-bold mb-4">Available Tasks</h3>
    
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