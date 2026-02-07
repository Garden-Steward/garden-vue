<script setup>
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

import { useBlogStore } from '@/stores';

const blogStore = useBlogStore();
const baseUrl = `${import.meta.env.VITE_API_URL}`;

const { blogs } = storeToRefs(blogStore);
const isLoading = ref(true);

blogStore.fetchAll();

watch(blogs, (newBlogs) => {
  if (newBlogs.length > 0) {
    isLoading.value = false;
  }
});

let heroImage = function(blog) {
  if (import.meta.env.VITE_API_URL == 'http://localhost:1337' && !blog.attributes.hero.data.attributes?.url.includes('googleapis.com')) {
    return `${baseUrl}${blog.attributes.hero.data.attributes?.url}`;
  } else {
    return blog.attributes.hero.data.attributes?.url;
  }
}

const truncateExcerpt = (excerpt) => {
    return `${excerpt?.substring(0, 150)}...`;
};
</script>

<template>
  <div class="flex flex-col md:flex-row stew font-roboto min-h-screen bg-custom-light dark:bg-[#344a34]">
    <div class="flex-1">
      <div class="px-4 py-2 md:px-8 md:py-4">
        <h1 class="text-2xl font-bold mb-4 font-roboto sm:text-3xl text-gray-900 dark:text-[#f5f5f5]">Welcome to the Garden Steward Blog</h1>
        <p class="text-md mb-4 font-roboto text-gray-700 dark:text-[#d0d0d0]">Hi there, I'm Cameron and I'm the founder of Garden Steward, and co-founder of the Oakland Urban Farming Project. I'm on a mission to create abundance through urban gardens. I'm developing an app to help manage the garden projects so anyone, anywhere will easily be able to contribute and manage gardens in their community.</p>
      </div>
      <div class="flex justify-center items-center">
        <!-- Loading spinner -->
        <div v-if="isLoading" class="flex justify-center items-center">
          <span class="loader"></span>
        </div>
        <!-- Blog posts -->
        <div v-else class="space-y-8">
          <div v-for="blog in blogs" :key="blog.id" class="flex flex-col md:flex-row mx-auto bg-custom-light dark:bg-[#2d3e26] rounded-lg shadow-md overflow-hidden md:max-w-4xl border-white dark:border-[#3d4d36] border hover:bg-custom-lighter dark:hover:bg-[#3d4d36] transition-colors">

            <a :href="`/blog/${blog.attributes?.slug}`" class="md:flex no-underline hover:no-underline">

              <img class="h-64 w-full lg:w-64 md:w-48 object-cover" :src="heroImage(blog)" :alt="blog.attributes.title" v-if="blog.attributes?.hero?.data" /> 
              <div class="p-6 flex-1 relative">
                <div class="relative inline-block" v-if="blog?.attributes?.category?.data">
                  <div class="absolute -bottom-2 -left-2 bg-custom-green rounded border border-custom-green" style="width: calc(100% + 4px); height: calc(100% + 4px); z-index: 1;"></div>
                  <div class="bg-white dark:bg-[#1a1a1a] text-gray-800 dark:text-[#f5f5f5] px-2 py-2 inline-block rounded border border-gray-800 dark:border-[#3d4d36] position-relative" style="z-index: 2;">
                    {{ blog?.attributes?.category?.data?.attributes?.title }}
                  </div>
                </div>
                <h2 class="text-2xl font-semibold py-3 mt-2 text-gray-900 dark:text-[#f5f5f5]">{{ blog.attributes?.title }}</h2>
                <p class="text-gray-600 dark:text-[#d0d0d0] text-lg mt-1">{{ truncateExcerpt(blog.attributes?.excerpt) }}</p>
                <p class="text-gray-600 dark:text-[#8aa37c] text-lg">Continue Reading</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Additional styles if needed */
.loader {
  border: 16px solid #f3f3f3;
  border-radius: 50%;
  border-top: 16px solid #3498db;
  width: 120px;
  height: 120px;
  animation: spin 2s linear infinite;
}

.dark .loader {
  border-color: #3d4d36;
  border-top-color: #8aa37c;
}

.blog-content p {
  margin-top: 0.25rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
