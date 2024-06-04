<script setup>
import { ref } from 'vue';

// Example blog data, replace with actual data fetching logic
const blogs = ref([
  { id: 1, title: "Garden Tips", hero: "https://picsum.photos/600/300", excerpt: "Learn the best garden tips for this season.", slug: "garden-tips" },
  { id: 2, title: "Community Gardening", hero: "https://picsum.photos/600/302", excerpt: "How community gardening improves neighborhoods.", slug: "community-gardening" },
  { id: 3, title: "Sustainable Practices", hero: "https://picsum.photos/600/301", excerpt: "Adopt sustainable practices in your gardening.", slug: "sustainable-practices" }
]);

// Example topics for sidebar
const topics = ref(["Gardening", "Community", "Sustainability", "Seasonal Tips"]);
</script>

<template>
  <div class="flex flex-col md:flex-row stew">
    <div class="flex-1">

      <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">Blog Posts</h1>
        <div class="space-y-4">
          <div v-for="blog in blogs" :key="blog.id" class="max-w-xl mx-auto bg-white rounded-lg shadow-md overflow-hidden md:max-w-2xl">
            <a :href="`/blog/${blog.slug}`">
              <img class="h-48 w-full object-cover" :src="blog.hero" :alt="blog.title">
              <div class="p-4">
                <h2 class="text-lg font-semibold text-gray-800">{{ blog.title }}</h2>
                <p class="text-gray-600">{{ blog.excerpt }}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="w-full md:w-64 bg-white p-4">
      <h2 class="font-bold text-xl mb-4">Topics</h2>
      <ul>
        <li v-for="topic in topics" :key="topic" class="mb-2">
          <a href="#" class="text-blue-500 hover:text-blue-600">{{ topic }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
/* Additional styles if needed */
</style>
