<script setup>
import { storeToRefs } from 'pinia';
import { watch } from 'vue';
import { useRoute } from "vue-router";
import { StrapiBlocks } from 'vue-strapi-blocks-renderer';

import { useBlogStore } from '@/stores';

const blogStore = useBlogStore();
const route = useRoute()
const { blog } = storeToRefs(blogStore);
const baseUrl = `${import.meta.env.VITE_API_URL}`;

watch(blog, (newVal) => {
  console.log(blog)
  if (newVal.attributes) {
    // renderedContent = md.render(newVal.attributes?.content);
  }
});
let heroImage = function(blog) {
  if (import.meta.env.VITE_API_URL == 'http://localhost:1337') {
    return `${baseUrl}${blog.attributes?.hero.data.attributes?.url}`;
  } else {
    return blog.attributes?.hero.data.attributes?.url;  
  }
}


blogStore.findSlug(route.params.slug);
</script>

<template>
    <div class="max-w-4xl mx-auto px-6 py-12 bg-custom-light rounded-lg font-roboto">

      <div class="back-to-blog">
        <router-link to="/blog">
          <span class="arrow">&#8592;</span> Back to Blog
        </router-link>
      </div>

      <div class="category-wrapper">
        <div class="category-container">
          <div class="bg-white text-gray-800 px-2 py-2 inline-block rounded border border-gray-800 position-relative" style="z-index: 2;">
            {{ blog?.attributes?.category.data.attributes?.title }}
          </div>
          <div class="decorative-div bg-custom-green border border-custom-green -bottom-2 -left-2"></div>
        </div>
      </div>

      <div class="flex-1 flex items-center justify-center my-3">
        <h1 class="text-3xl sm:text-4xl font-bold text-black">{{ blog?.attributes?.title }}</h1>
      </div>

      <div class="flex-1 flex bg-cover bg-center h-96 bg-cover" :style="{ backgroundImage: 'url(' + heroImage(blog) + ')' }">
        <div class="flex-1"></div>
      </div>
      <div class="flex-1 max-w-4xl mx-auto px-0 sm:px-6 sm:py-12 py-2 rounded-lg">
        <div class="blog-content">
            <StrapiBlocks :content="blog?.attributes?.content" :modifiers="modifiers" :blocks="blocks" />
        </div>
      </div>
      <div v-if="blog.loading" class="flex justify-center items-center">
        <div class="spinner-border spinner-border-lg" style="width: 3rem; height: 3rem;"></div>
      </div>
      <div v-if="blog.error" class="text-danger">Error loading blog: {{blog.error}}</div>
    </div>
</template>

<style>
.blog-content p {
    margin-top: 20px; /* Adjust the value as needed */
    font-size: 1.1rem;
    line-height: 1.7;
}
.decorative-line-center {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 8px auto 25px;
    height: 50px; /* Adjust height as needed */
    color: white;
}
.category-wrapper {
    display: flex;
    justify-content: center;
}

.category-container {
    position: relative;
    display: inline-block; /* This will make the container only as wide as its content */
}

.decorative-div {
    position: absolute;
    width: calc(100% + 4px); /* Slightly larger than the category container */
    height: calc(100% + 4px);
    border-radius: 5px;
    z-index: 1;
}

.back-to-blog {
    margin: 20px 0;
    padding-left: 10px;
}

.back-to-blog .arrow {
    margin-right: 5px;
}

.back-to-blog a {
    display: inline-flex;
    align-items: center;
    font-size: 1rem;
    color: #4a5568; /* Dark gray color, adjust as needed */
    text-decoration: none;
}

.back-to-blog a:hover {
    text-decoration: underline;
}
</style>
