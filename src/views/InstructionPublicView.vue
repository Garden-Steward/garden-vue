<script setup>
import { storeToRefs } from 'pinia';
import { ref, onMounted, watch } from 'vue';
import { useRoute } from "vue-router";
import { StrapiBlocks } from 'vue-strapi-blocks-renderer';
import { ArticleUtils } from '@/helpers/article-utils';

import { instructionStore  } from '@/stores';

const instSTore = instructionStore();
const route = useRoute()
const { instruction } = storeToRefs(instSTore);
const isApproved = ref(false);
const showModal = ref(false);
const phoneNumber = ref('');
const phoneError = ref('');

const acceptTask = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get('u')

  if (user) {
    const {success} = await instSTore.approveTask({userId:user, slug:route.params.slug})
    isApproved.value = success;
  } else {
    showModal.value = true;
  }
}

const closeModal = () => {
  showModal.value = false;
};

const submitPhoneNumber = async () => {
  if (phoneNumber.value && /^\d+$/.test(phoneNumber.value)) {
    const {success} = await instSTore.approveTask({phoneNumber: phoneNumber.value, slug: route.params.slug});
    isApproved.value = success;
    window.scrollTo(0, 0);
    closeModal();
  } else {
    phoneError.value = 'Please enter a valid phone number (digits only)';
  }
};

watch(instruction, async (newInstruction) => {
  console.log('newInstruction: ', newInstruction);
  if (newInstruction?.attributes?.content) {
    await ArticleUtils.processImages();
  }
}, { deep: true });

onMounted(async () => {
  await ArticleUtils.processImages();
});

console.log("instruction: ", instruction);

instSTore.findSlug(route.params.slug);
</script>

<template>
    <div>
      <div class="max-w-4xl mx-auto px-6 py-12 bg-gray-100 rounded-lg" v-if="!instruction.loading && !instruction.error">
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
      
      <!-- Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-lg">
          <h2 class="text-xl font-bold mb-4">Enter Your Phone Number</h2>
          <input 
            v-model="phoneNumber" 
            type="tel" 
            placeholder="Phone number" 
            class="w-full p-2 border border-gray-300 rounded mb-2"
          >
          <p v-if="phoneError" class="text-red-500 text-sm mb-2">{{ phoneError }}</p>
          <div class="flex justify-end">
            <button @click="closeModal" class="mr-2 px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button @click="submitPhoneNumber" class="px-4 py-2 bg-green-500 text-white rounded">Submit</button>
          </div>
        </div>
      </div>
    </div>
</template>