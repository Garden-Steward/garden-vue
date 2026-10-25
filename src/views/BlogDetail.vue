<script setup>
import { storeToRefs } from 'pinia';
import { computed, nextTick, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { StrapiBlocks } from 'vue-strapi-blocks-renderer';
import { useBlogStore } from '@/stores';
import { ArticleUtils } from '@/helpers/article-utils';
import { initPlantTooltips } from '@/components/PlantTooltips';

const blogStore = useBlogStore();
const route = useRoute();
const { blog } = storeToRefs(blogStore);
let cleanup = null;
let contentVersion = 0;
let active = true;

function clearTooltips() {
  contentVersion += 1;
  if (cleanup) cleanup();
  cleanup = null;
}

watch(() => route.params.slug, slug => {
  clearTooltips();
  blogStore.findSlug(slug);
}, { immediate: true });

watch(blog, async article => {
  clearTooltips();
  if (!Array.isArray(article?.content)) return;
  const version = contentVersion;
  await nextTick();
  if (!active || version !== contentVersion) return;
  await ArticleUtils.processImages();
  if (!active || version !== contentVersion) return;
  if (article.plants?.length) cleanup = initPlantTooltips(article.plants);
});

onBeforeUnmount(() => {
  active = false;
  clearTooltips();
});

function mediaUrl(media) {
  const url = media?.formats?.medium?.url || media?.url;
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

function authorName(author) {
  return [author.firstName, author.lastName].filter(Boolean).join(' ');
}

const authors = computed(() => [blog.value?.author, blog.value?.co_author].filter(author => author && authorName(author)));
const formattedDate = computed(() => {
  const value = blog.value?.article_date || blog.value?.publishedAt;
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
});

function resolveImages(nodes) {
  return nodes.map(node => {
    if (node.type === 'image') return { ...node, image: { ...node.image, url: mediaUrl(node.image) } };
    if (Array.isArray(node.children)) return { ...node, children: resolveImages(node.children) };
    return node;
  });
}

const content = computed(() => resolveImages(blog.value?.content || []));
</script>

<template>
  <main class="story-page">
    <router-link to="/blog" class="story-back">← Back to stories</router-link>
    <p v-if="blog.loading" role="status">Loading story…</p>
    <div v-else-if="blog.error" role="alert" class="story-error">
      <h1 v-if="blog.error.status === 404">This story could not be found.</h1>
      <h1 v-else>Couldn't load this story.</h1>
      <p>Please try another story or try again.</p>
      <button type="button" @click="blogStore.findSlug(route.params.slug)">Try again</button>
    </div>
    <article v-else-if="blog.documentId">
      <header class="story-heading">
        <p v-if="blog.category?.title" class="story-eyebrow">{{ blog.category.title }}</p>
        <h1>{{ blog.title }}</h1>
        <p v-if="blog.subtitle" class="story-subtitle">{{ blog.subtitle }}</p>
        <p v-if="formattedDate" class="story-date">{{ formattedDate }}</p>
      </header>
      <img v-if="blog.hero_display && mediaUrl(blog.hero)" class="story-hero" :src="mediaUrl(blog.hero)" :alt="blog.hero.alternativeText ?? ''">
      <div class="blog-content"><StrapiBlocks :content="content" /></div>
      <div v-if="authors.length" class="story-authors">
        <div v-for="(author, index) in authors" :key="index" class="story-author">
          <img v-if="mediaUrl(author.profilePhoto)" :src="mediaUrl(author.profilePhoto)" :alt="`Portrait of ${authorName(author)}`">
          <p>By {{ authorName(author) }}</p>
        </div>
      </div>
      <nav v-if="blog.prev_blog_post || blog.next_blog_post || blog.random_post" class="story-navigation" aria-label="More stories">
        <router-link v-if="blog.prev_blog_post" :to="blog.prev_blog_post">← Previous story</router-link>
        <router-link v-if="blog.random_post" :to="blog.random_post">Another story</router-link>
        <router-link v-if="blog.next_blog_post" :to="blog.next_blog_post">Next story →</router-link>
      </nav>
    </article>
  </main>
</template>

<style scoped>
.story-page { color: var(--gs-ink); background: var(--gs-paper); font: 18px/1.65 var(--gs-body-font); padding: 30px 20px 50px; overflow-wrap: anywhere; }
.story-page a { color: inherit; text-underline-offset: 4px; }
.story-back { display: inline-block; margin-bottom: 32px; }
.story-heading { margin-bottom: 30px; }
.story-heading h1, .story-error h1 { font: 400 clamp(38px, 4.8vw, 70px)/1.12 var(--gs-heading-font); margin: 0 0 20px; }
.story-eyebrow, .story-date { color: var(--gs-muted); margin: 0 0 16px; }
.story-subtitle { font-size: clamp(20px, 2vw, 26px); line-height: 1.45; margin: 0 0 20px; }
.story-hero { width: 100%; max-height: 600px; object-fit: cover; display: block; margin-bottom: 32px; }
.blog-content { max-width: 76ch; margin: 0 auto; }
.blog-content :deep(p) { margin: 0 0 20px; }
.blog-content :deep(img) { max-width: 100%; height: auto; }
.blog-content :deep(h1), .blog-content :deep(h2), .blog-content :deep(h3) { font-family: var(--gs-heading-font); font-weight: 400; line-height: 1.2; margin: 30px 0 20px; }
.blog-content :deep(h1) { font-size: 40px; }
.blog-content :deep(h2) { font-size: 34px; }
.blog-content :deep(h3) { font-size: 28px; }
.blog-content :deep(a) { text-decoration: underline; text-underline-offset: 4px; }
.blog-content :deep(ul), .blog-content :deep(ol) { padding-left: 26px; margin-bottom: 20px; }
.blog-content :deep(blockquote) { border-left: 3px solid var(--gs-rule); padding-left: 20px; margin: 24px 0; }
.blog-content :deep(pre) { overflow-x: auto; padding: 16px; background: var(--gs-sage); }
.story-authors, .story-navigation { display: flex; flex-wrap: wrap; align-items: center; gap: 24px; border-top: 1px solid var(--gs-rule); margin-top: 32px; padding-top: 24px; }
.story-author { display: flex; align-items: center; gap: 14px; }
.story-author img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
.story-author p { margin: 0; }
.story-navigation { justify-content: space-between; }
.story-error button { border: 1px solid var(--gs-ink); background: transparent; color: inherit; font: inherit; padding: 8px 18px; cursor: pointer; }
@media (max-width: 480px) { .story-page { padding: 24px 8px 40px; } .story-navigation { align-items: flex-start; flex-direction: column; } }
</style>
