<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useBlogStore } from '@/stores';
import ManageLayout from '@/components/ManageLayout.vue';

const blogStore = useBlogStore();
const { blogs, blogsPagination, loadingMore, moreError } = storeToRefs(blogStore);
Promise.allSettled([blogStore.fetchAll()]);

const articles = computed(() => {
  if (Array.isArray(blogs.value)) return blogs.value;
  return [];
});
const isLoading = computed(() => !!blogs.value?.loading);
const loadFailed = computed(() => !!blogs.value?.error);

function heroImage(blog) {
  const url = blog.hero?.url;
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

function excerpt(blog) {
  const value = blog.excerpt || '';
  if (value.length <= 150) return value;
  return `${value.substring(0, 150).trimEnd()}…`;
}

function formatBlogDate(blog) {
  const value = blog.article_date || blog.publishedAt;
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
</script>

<template>
  <ManageLayout>
    <main class="blog-list">
      <header class="blog-list__heading">
        <p class="blog-list__eyebrow">Blog</p>
        <h1>Stories from the garden</h1>
        <p>How neighbors are building food forests, running community gardens and restoring land, and what it takes to grow abundance together.</p>
      </header>
      <p v-if="isLoading" role="status">Loading stories…</p>
      <p v-else-if="loadFailed" role="alert">Couldn't load stories. Try again in a moment.</p>
      <p v-else-if="!articles.length">No stories published yet.</p>
      <div v-else class="blog-list__articles">
        <article v-for="blog in articles" :key="blog.id" class="blog-list__row" :class="{ 'blog-list__row--text-only': !heroImage(blog) }">
          <router-link v-if="heroImage(blog)" :to="`/blog/${blog.slug}`" class="blog-list__photo" :aria-label="`Read ${blog.title}`">
            <img :src="heroImage(blog)" :alt="blog.hero.alternativeText ?? `Photo for ${blog.title}`">
          </router-link>
          <div class="blog-list__copy">
            <p v-if="blog.category?.title" class="blog-list__eyebrow">{{ blog.category.title }}</p>
            <h2><router-link :to="`/blog/${blog.slug}`">{{ blog.title }}</router-link></h2>
            <p v-if="blog.excerpt">{{ excerpt(blog) }}</p>
            <p v-if="formatBlogDate(blog)" class="blog-list__date">{{ formatBlogDate(blog) }}</p>
            <router-link :to="`/blog/${blog.slug}`">Continue reading ↗</router-link>
          </div>
        </article>
      </div>
      <p v-if="moreError" role="alert">Couldn't load more stories. Please try again.</p>
      <button v-if="articles.length && blogsPagination.page < blogsPagination.pageCount" type="button" class="blog-list__more" :disabled="loadingMore" @click="blogStore.loadMore()"><span v-if="loadingMore">Loading stories…</span><span v-else>Load more stories</span></button>
    </main>
  </ManageLayout>
</template>

<style scoped>
.blog-list { min-height: 50vh; color: var(--gs-ink); background: var(--gs-paper); font: 18px/1.55 var(--gs-body-font); }
.blog-list__more { border: 1px solid var(--gs-ink); background: transparent; color: var(--gs-ink); font: inherit; padding: 10px 18px; margin-top: 24px; cursor: pointer; }
.blog-list a { color: inherit; text-underline-offset: 4px; }
.blog-list__heading { margin-bottom: 30px; }
.blog-list__eyebrow { font-size: 15px; color: var(--gs-muted); margin: 0 0 14px; }
.blog-list__heading h1 { font: 400 clamp(44px, 4.8vw, 76px)/1.08 var(--gs-heading-font); margin: 0 0 15px; }
.blog-list__heading > p:last-child { max-width: 60ch; font-size: clamp(18px, 1.4vw, 23px); line-height: 1.65; margin: 0; }
.blog-list__row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 44px; border-top: 1px solid var(--gs-rule); padding: 34px 0; }
.blog-list__row--text-only { grid-template-columns: minmax(0, 1fr); }
.blog-list__photo { display: block; min-height: 230px; background: var(--gs-sage); }
.blog-list__photo img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; }
.blog-list__copy h2 { font: 400 clamp(34px, 3vw, 52px)/1.15 var(--gs-heading-font); margin: 0 0 12px; }
.blog-list__copy p:not(.blog-list__eyebrow) { font-size: clamp(18px, 1.4vw, 23px); line-height: 1.65; margin: 0 0 16px; }
.blog-list__copy .blog-list__date { font-size: 18px; color: var(--gs-muted); }
@media (max-width: 760px) {
  .blog-list__heading h1 { font-size: 42px; }
  .blog-list__row { grid-template-columns: minmax(0, 1fr); gap: 25px; padding: 24px 0 30px; }
  .blog-list__copy h2 { font-size: 34px; }
}
</style>
