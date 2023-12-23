<script setup>
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
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
const isApproved = ref(false);


watch(instruction, (newVal) => {
  if (newVal.attributes) {
    renderedContent = md.render(newVal.attributes?.content);
  }
});

const acceptTask = (e) => {
  console.log(e);
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get('u')

  instSTore.approveTask({userId:user, slug:route.params.slug})
  isApproved.value = true;

}

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
          <button :class="{ 'bg-gray-500': isApproved, 'bg-green-700 hover:bg-green-900': !isApproved }" class="text-white font-bold py-2 px-4 rounded" @click="acceptTask" :disabled="isApproved">
            {{ isApproved ? 'Accepted' : 'Accept' }}
          </button>
          <p class="text-sm mt-2">
            {{ isApproved ? 
              'Thank you for accepting! You have now unlocked the ability to be assigned this task in the future.'
              : 'I understand this task\'s requirements and I am capable. I accept this task.' }}
          </p>
        </div>
      </div>
      <div v-if="instruction.loading" class="spinner-border spinner-border-sm"></div>
      <div v-if="instruction.error" class="text-danger">Error loading instruction: {{instruction.error}}</div>
    </div>
</template>
