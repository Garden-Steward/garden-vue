<script setup>
import { storeToRefs } from 'pinia';
import { ref, watch, } from 'vue';
import { useRoute } from "vue-router";
import { useEventStore } from '@/stores';
import Tiptap from '@/components/Tiptap.vue'

const eventStore = useEventStore();
const route = useRoute()
// const baseUrl = `${import.meta.env.VITE_API_URL}`;

const { event } = storeToRefs(eventStore);
const isLoading = ref(true);

eventStore.findById(route.params.id);

watch(event, async (newEvent) => {
  console.log('newEvent: ', newEvent);
  if (newEvent?.attributes?.content) {
    // await ArticleUtils.processImages();
  }
  isLoading.value = false;
}, { deep: true });

// const truncateExcerpt = (excerpt) => {
//     return `${excerpt?.substring(0, 150)}...`;
// };
</script>

<template>
  <div class="flex flex-col md:flex-row stew font-roboto">
    <div class="flex-1">
      <div class="px-4 py-2 md:px-8 md:py-4"> <!-- Conditional padding for non-mobile screens -->
        <h1 class="text-2xl font-bold mb-4 font-roboto sm:text-3xl">Event Editor</h1>
        <p class="text-md mb-4 font-roboto">Customize your Event Page.</p>
        <div v-if="isLoading">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
        <div v-else>
          <div>
            <label for="title">Title</label>
            <input type="text" id="title" v-model="event.attributes.title" />
            <label for="content">Content</label>
            <textarea id="content" v-model="event.attributes.content" style="height: 200px;"/>
            <Tiptap v-model="event.attributes.content" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stew {
  background-color: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin: 20px;
}
label {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 5px;
  margin-right: 10px;
  display: block;
}
input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1.2em;
}


</style>
