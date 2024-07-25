<script setup>
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useRoute } from "vue-router";
import { StrapiBlocks } from 'vue-strapi-blocks-renderer';

import { instructionStore  } from '@/stores';

const instSTore = instructionStore();
const route = useRoute()
const { instruction } = storeToRefs(instSTore);
const isApproved = ref(false);

const acceptTask = (e) => {
  console.log(e);
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get('u')

  if (user) {
    instSTore.approveTask({userId:user, slug:route.params.slug})
    isApproved.value = true;
  }

}

console.log("instruction: ", instruction);

instSTore.findSlug(route.params.slug);
</script>

<template>
    <div>
      <div class="max-w-4xl mx-auto px-6 py-12 bg-gray-100 rounded-lg">
        <h1 class="text-3xl font-bold mb-6">{{ instruction?.attributes?.title }}</h1>
        <StrapiBlocks :content="instruction?.attributes?.content" :modifiers="modifiers" :blocks="blocks" class="text-left"/>
        <!-- Conditional rendering of the agreement button -->
        <div v-if="instruction?.attributes?.accept_required" class="mt-6">
          <button :class="{ 'bg-gray-500': isApproved, 'bg-green-700 hover:bg-green-900': !isApproved }" class="text-white font-bold py-2 px-4 rounded" @click="acceptTask" :disabled="isApproved">
            {{ isApproved ? 'Submitted' : instruction?.attributes?.affirm_button_title }}
          </button>
          <p class="text-sm mt-2">
            {{ isApproved ? 
              'Alright! Thank you for being involved.'
              : instruction?.attributes?.affirm_explain }}
          </p>
        </div>
      </div>
      <div v-if="instruction.loading" class="spinner-border spinner-border-sm"></div>
      <div v-if="instruction.error" class="text-danger">Error loading instruction: {{instruction.error}}</div>
      <!-- Add this at the bottom of your template -->
      <div class="text-center py-4 text-white">
        <strong>{{ instruction?.attributes?.garden?.data.attributes?.title }}</strong> is brought to you by 
        <a :href="instruction?.attributes?.garden?.data.attributes?.organization?.data?.attributes.url" target="_blank" class="text-slate-800 underline hover:text-yellow-100 visited:text-yellow-3c00">
          <strong>{{ instruction?.attributes?.garden?.data.attributes?.organization?.data?.attributes.title }}</strong>
        </a>
      </div>
    </div>
</template>
