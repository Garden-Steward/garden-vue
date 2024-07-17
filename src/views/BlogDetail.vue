<script setup>
import { storeToRefs } from 'pinia';
import { watch, computed, onMounted, nextTick } from 'vue';
import { useRoute, RouterLink } from "vue-router";
import { StrapiBlocks } from 'vue-strapi-blocks-renderer';

import { useBlogStore } from '@/stores';

const blogStore = useBlogStore();
const route = useRoute();
const { blog } = storeToRefs(blogStore);
const baseUrl = `${import.meta.env.VITE_API_URL}`;

let heroImage = function(blog) {
  console.log('hero', blog.hero)
  if (import.meta.env.VITE_API_URL == 'http://localhost:1337' && !blog.hero?.url.includes('googleapis.com')) {
    return `${baseUrl}${blog.hero?.url}`;
  } else {
    return blog.hero?.url;
  }
}

let authorImage = function(blog) {
  if (import.meta.env.VITE_API_URL == 'http://localhost:1337' && !blog.author?.profilePhoto?.url.includes('googleapis.com')) {
    return `${baseUrl}${blog.author?.profilePhoto?.formats?.medium?.url}`;
  } else if (blog.author?.profilePhoto) {
    return blog.author?.profilePhoto?.formats?.medium?.url;
  } else {
    return 'https://storage.googleapis.com/steward_upload/uploads/medium_bobble_head_fe053501c3/medium_bobble_head_fe053501c3.png';
  }
}

// Watch for changes in the route parameters
watch(() => route.params.slug, (newSlug) => {
  blogStore.findSlug(newSlug);
  window.scrollTo(0, 0);
});

// Initial call to load the blog post
blogStore.findSlug(route.params.slug);

// Reactive properties for button links
let latestBlogId = blog?._id;


// Computed property to format the publishedAt date
const formattedDate = computed(() => {
  if (!blog.value?.publishedAt) return '';
  console.log(blog)
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(blog.value.publishedAt).toLocaleDateString(undefined, options);
});

// Function to process images
const processImages = async () => {
  await nextTick();
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.alt.includes('float-right')) {
      img.classList.add('float-right');
    }
    if (img.alt.includes('float-left')) {
      img.classList.add('float-left');
    }
    if (img.alt.includes('w300')) {
      img.classList.add('w300');
    }
  });
};

// Watch for changes in the blog content and process images
watch(blog, async (newBlog) => {
  if (newBlog?.content) {
    await processImages();
  }
  latestBlogId = newBlog?.id || null;
}, { deep: true });

onMounted(async () => {
  await processImages();
});

</script>

<template>
    <div class="max-w-4xl mx-auto px-6 py-12 bg-custom-light rounded-lg font-roboto">

      <div class="back-to-blog">
        <RouterLink to="/blog">
          <span class="arrow">&#8592;</span> Back to Blog
        </RouterLink>
      </div>

      <div v-if="!blog.loading">
        <div class="category-wrapper">
          <div class="category-container">
            <div class="bg-white text-gray-800 px-2 py-2 inline-block rounded border border-gray-800 position-relative" style="z-index: 2;">
              <div>
                {{ blog?.category?.title }}
              </div>
            </div>
            <div class="decorative-div bg-custom-green border border-custom-green border border-custom-green -bottom-2 -left-2"></div>
          </div>
        </div>

        <div class="flex-1 flex flex-col items-center justify-center my-3">
          <h1 class="text-3xl sm:text-4xl font-bold text-black">{{ blog?.title }}</h1>
          <h2 class="text-xl text-gray-600 mt-2">
            {{ blog?.subtitle }}
          </h2>
        </div>

        <div class="flex-1 flex bg-cover bg-center h-96 bg-cover" :style="{ backgroundImage: 'url(' + heroImage(blog) + ')' }" v-if="blog.hero_display">
          <div class="flex-1"></div>
        </div>
        <div class="flex-1 max-w-4xl mx-auto px-0 sm:px-6 sm:py-12 py-2 rounded-lg">
          <div class="blog-content">
              <StrapiBlocks :content="blog?.content" :modifiers="modifiers" :blocks="blocks" />
          </div>
          <div v-if="blog?.video" class="w-full h-full">
            <div v-html="blog.iframe" class="w-full min-h-[300px]"></div>
          </div>
        </div>
      </div>

      <!-- Display the length of the content and the formatted date -->
      <div class="text-center text-gray-600 mt-5">
        <hr class="border-gray-800">
        <div class="text-left mb-3">
          {{ formattedDate }}
        </div>
      </div>
      <div class="about-the-author mt-6 mb-3 ml-auto author-sink"> 
        <img :src="authorImage(blog)" alt="Author Image" class="author-image w-20 h-20 rounded-full mr-4">
        <div>
            <h3 class="author-title">Garden Steward Author</h3>
            <h4 class="author-name">{{ blog?.author?.firstName }} {{ blog?.author?.lastName }}</h4>
            <p class="author-bio">{{ blog?.author?.bio }}</p>
        </div>
      </div>

      <div class="flex justify-between mt-6">
        <a v-if="blog?.prev_blog_post" :href="blog?.prev_blog_post" :key="latestBlogId" class="btn btn-primary bg-custom-green border border-custom-green">
          Previous
        </a>
        <div v-else class="btn btn-primary bg-custom-green border border-custom-green invisible">
          Previous
        </div>
        <a v-if="blog?.random_post" :href="blog?.random_post" :key="latestBlogId" class="btn btn-secondary bg-custom-green border border-custom-green">
          Random
        </a>
        <div v-else class="btn btn-secondary bg-custom-green border border-custom-green invisible">
          Random
        </div>
        <a v-if="blog?.next_blog_post" :href="blog?.next_blog_post" :key="latestBlogId" class="btn btn-primary bg-custom-green border border-custom-green">
          Next
        </a>
        <div v-else class="btn btn-primary bg-custom-green border border-custom-green invisible">
          Next
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
    margin-top: 8px; /* Adjust the value as needed */
    font-size: 1.1rem;
    line-height: 1.7;
}
.blog-content a {
  text-decoration: underline;
}
.blog-content::after {
    content: "";
    display: table;
    clear: both;
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
iframe {
  width: 100%;
  height: 100%;
  min-height: 300px;
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

.author-sink {
  margin-top: -20px;
  padding: 20px;
  background-color: #FFDAB9; /* Peach color */
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.author-image {
  float: left;
  margin-right: 15px;
}

.author-title {
  font-size: 0.875rem; /* Smaller font size */
  line-height: 1.2; /* Smaller line spacing */
  color: #4a5568; /* Dark gray color */
}

.author-name {
  font-size: 1rem; /* Smaller font size */
  line-height: 1.2; /* Smaller line spacing */
  color: #2d3748; /* Darker gray color */
  margin-bottom: 0.5rem; /* Adjust margin as needed */
}

.author-bio {
  font-size: 0.875rem; /* Smaller font size */
  line-height: 1.4; /* Smaller line spacing */
  color: #4a5568; /* Dark gray color */
}
.w300 {
  width: 300px;
  margin: 15px;
}
ul li {
  margin-left: 30px;
  padding-left: 10px;
  list-style-type: circle;
}
</style>
