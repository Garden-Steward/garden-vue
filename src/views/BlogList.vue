<script setup>
import { storeToRefs } from 'pinia';
import { ref } from 'vue';

import { useBlogStore } from '@/stores';

const blogStore = useBlogStore();
const baseUrl = `${import.meta.env.VITE_API_URL}`;

const { blogs } = storeToRefs(blogStore);
const isLoading = ref(true);  // Add this line

blogStore.fetchAll().then(() => {
  console.log('got blogs: ', blogs)
  isLoading.value = false;  // Set loading to false once data is fetched
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
  <div class="flex flex-col md:flex-row stew font-roboto">
    <div class="flex-1">
      <div class="px-4 py-2 md:px-8 md:py-4"> <!-- Conditional padding for non-mobile screens -->
        <h1 class="text-2xl font-bold mb-4 font-roboto sm:text-3xl">Welcome to the Garden Steward Blog</h1>
        <p class="text-md mb-4 font-roboto">Hi there, I'm Cameron and I'm the founder of Garden Steward, and co-founder of the Oakland Urban Farming Project. I'm on a mission to create abundance through urban gardens. I'm developing an app to help manage the garden projects so anyone, anywhere will easily be able to contribute and manage gardens in their community.</p>
      </div>
      <div class="flex justify-center items-center">
        <!-- Loading spinner -->
        <div v-if="isLoading" class="flex justify-center items-center">
          <span class="loader"></span> <!-- Add your spinner element here -->
        </div>
        <!-- Blog posts -->
        <div v-else class="space-y-8"> <!-- Increased vertical spacing between blog posts -->
          <div v-for="blog in blogs" :key="blog.id" class="flex flex-col md:flex-row mx-auto bg-custom-light rounded-lg shadow-md overflow-hidden md:max-w-4xl border-white border hover:bg-custom-lighter"> <!-- Adjusted hover opacity -->

            <a :href="`/blog/${blog.attributes?.slug}`" class="md:flex no-underline hover:no-underline" > <!-- Ensured no underlining on hover -->

              <img class="h-64 w-full lg:w-64 md:w-48 object-cover" :src="heroImage(blog)" :alt="blog.attributes.title"  v-if="blog.attributes?.hero?.data" /> 
              <div class="p-6 flex-1 relative"> <!-- Conditional padding inside each blog post for non-mobile screens -->
                <div class="relative inline-block">
                  <div class="absolute -bottom-2 -left-2 bg-custom-green rounded border border-custom-green" style="width: calc(100% + 4px); height: calc(100% + 4px); z-index: 1;"></div>
                  <div class="bg-white text-gray-800 px-2 py-2 inline-block rounded border border-gray-800 position-relative" style="z-index: 2;">
                    {{ blog?.attributes?.category?.data.attributes.title }}
                  </div>
                </div>
                <h2 class="text-2xl font-semibold py-3 mt-2">{{ blog.attributes?.title }}</h2>
                <p class="text-gray-600 text-lg mt-1">{{ truncateExcerpt(blog.attributes?.excerpt) }}</p>
                <p class="text-gray-6000 text-lg">Continue Reading</p>
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

.blog-content p {
  margin-top: 0.25rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

