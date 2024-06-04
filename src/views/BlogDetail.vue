<script setup>
import { storeToRefs } from 'pinia';
import { watch } from 'vue';
import { useRoute } from "vue-router";
import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';


import { useBlogStore } from '@/stores';

const blogStore = useBlogStore();
const md = new MarkdownIt().use(markdownItAttrs);
const route = useRoute()
const { blog } = storeToRefs(blogStore);
let renderedContent = '';

watch(blog, (newVal) => {
  console.log(blog)
  if (newVal.attributes) {
    renderedContent = md.render(newVal.attributes?.content);
  }
});

blogStore.findSlug(route.params.slug);
</script>

<template>
    <div class="max-w-4xl mx-auto px-6 py-12 bg-custom-light rounded-lg">
      <div class="flex-1 flex bg-cover bg-center" :style="{ backgroundImage: 'url(' + blog?.attributes?.hero.data.attributes?.url + ')' }">
        <div class="flex-1"></div>
        <div class="flex-1 flex items-center justify-center">
          <h1 class="text-4xl font-bold text-white">{{ blog?.attributes?.title }}</h1>
        </div>
      </div>
      <div class="flex-1 max-w-4xl mx-auto px-6 py-12 rounded-lg">
        <div v-html="renderedContent" class="text-left"></div>
      </div>
      <div v-if="blog.loading" class="flex justify-center items-center">
        <div class="spinner-border spinner-border-lg" style="width: 3rem; height: 3rem;"></div>
      </div>
      <div v-if="blog.error" class="text-danger">Error loading blog: {{blog.error}}</div>
    </div>
</template>
