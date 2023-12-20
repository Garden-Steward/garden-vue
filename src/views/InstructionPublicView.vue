<script setup>
import { storeToRefs } from 'pinia';
import { useRoute } from "vue-router";
import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';

import { instructionStore  } from '@/stores';
const md = new MarkdownIt().use(markdownItAttrs);


import { watch } from 'vue';

const instSTore = instructionStore();
const route = useRoute()
const { instruction } = storeToRefs(instSTore);
let renderedContent = '';

watch(instruction, (newVal) => {
  if (newVal.attributes) {
    renderedContent = md.render(newVal.attributes?.content);
  }
});

console.log("instruction: ", instruction);

instSTore.findSlug(route.params.slug);
</script>

<template>
    <div>
      <div class="max-w-4xl mx-auto px-6 py-12 bg-gray-100 rounded-lg">
        <h1 class="text-3xl font-bold mb-6">{{ instruction.attributes?.title }}</h1>
        <div v-html="renderedContent" class="text-left"></div>
        <!-- Conditional rendering of the agreement button -->
        <div v-if="instruction.attributes?.accept_required" class="mt-6">
          <button class="bg-green-700 hover:bg-green-900 text-white font-bold py-2 px-4 rounded">
            Accept
          </button>
          <p class="text-sm mt-2">
            I understand this task's requirements and I am capable. I accept this task.
          </p>
        </div>
      </div>
      <div v-if="instruction.loading" class="spinner-border spinner-border-sm"></div>
      <div v-if="instruction.error" class="text-danger">Error loading instruction: {{instruction.error}}</div>
    </div>
</template>
