<script setup>
import { storeToRefs } from 'pinia';

import { useBlogStore } from '@/stores';

const blogStore = useBlogStore();
const baseUrl = `${import.meta.env.VITE_API_URL}`;

const { blogs } = storeToRefs(blogStore);
blogStore.fetchAll();

let heroImage = function(blog) {
  if (import.meta.env.VITE_API_URL == 'http://localhost:1337') {
    return `${baseUrl}${blog.attributes.hero.data.attributes?.url}`;
  } else {
    return blog.attributes.hero.data.attributes?.url;
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row stew">
    <div class="flex-1">
      <div class="px-8 py-4"> <!-- Increased padding for more spacing around the content -->
        <h1 class="text-3xl font-bold mb-4 font-roboto">Welcome to the Garden Steward Blog</h1>
        <p class="text-md mb-4 font-roboto">Hi there, I'm Cameron and I'm the founder of Garden Steward, and co-founder and catalyst of the Oakland Urban Farming Project. I'm on a mission to create abundance through urban gardens. I'm in the process of writing a book to help more people understand the impact having publically accessible gardens can have on people's lives. I'm also developing an app to help manage the garden projects so anyone, anywhere will easily be able to contribute and manage gardens in their community.</p>
        <h2 class="text-xl mb-4 font-roboto">Latest Blog Posts</h2>
        <div class="space-y-8"> <!-- Increased vertical spacing between blog posts -->
          <div v-for="blog in blogs" :key="blog.id" class="flex flex-col md:flex-row mx-auto bg-custom-light rounded-lg shadow-md overflow-hidden md:max-w-4xl border-white border hover:bg-custom-lighter"> <!-- Adjusted hover opacity -->
            <a :href="`/blog/${blog.attributes.slug}`" class="md:flex no-underline hover:no-underline"> <!-- Ensured no underlining on hover -->
              <img class="h-64 w-full lg:w-64 md:w-48 object-cover" :src="heroImage(blog)" :alt="blog.attributes.title"> <!-- Increased height of the image -->
              <div class="p-6 flex-1 relative"> <!-- Increased padding inside each blog post for better spacing -->
                <div class="relative inline-block">
                  <div class="absolute -bottom-2 -left-2 bg-custom-green rounded border border-custom-green" style="width: calc(100% + 4px); height: calc(100% + 4px); z-index: 1;"></div>
                  <div class="bg-white text-gray-800 px-2 py-2 inline-block rounded border border-gray-800 position-relative" style="z-index: 2;">
                    {{ blog.attributes.category.data.attributes.title }}
                  </div>
                </div>
                <h2 class="text-2xl font-semibold py-3 mt-2">{{ blog.attributes.title }}</h2>
                <p class="text-gray-600 text-lg">{{ blog.attributes.excerpt }}</p>
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
</style>
