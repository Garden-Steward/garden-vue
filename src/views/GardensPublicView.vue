<script setup>
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import { useGardensStore } from '@/stores';
import { getImageOrDefault } from '@/helpers/image-utils';

const gardensStore = useGardensStore();
const { gardens } = storeToRefs(gardensStore);

onMounted(() => {
    gardensStore.getAllPublic();
});

const getGardenImage = (garden) => {
    if (!garden?.attributes?.hero_image) {
        return getImageOrDefault(null);
    }
    
    const heroImage = garden.attributes.hero_image;
    
    // Handle different image formats (Strapi can return different structures)
    const imageUrl = heroImage.url || 
                     heroImage.formats?.medium?.url ||
                     heroImage.formats?.large?.url ||
                     heroImage.data?.attributes?.url ||
                     heroImage.data?.attributes?.formats?.medium?.url ||
                     heroImage.data?.attributes?.formats?.large?.url;
    
    return getImageOrDefault(imageUrl);
};

const gardenClick = (slug) => {
    window.location = `/gardens/${slug}`;
};
</script>

<template>
    <div class="bg-custom-light p-5 rounded-lg mx-auto">
        <h1 class="text-3xl font-bold mb-5 leading-tight">Gardens</h1>
        <p class="text-lg mb-5">Explore our community gardens and learn about the amazing work happening in your neighborhood.</p>

        <div v-if="gardens.loading" class="spinner-border spinner-border-sm"></div>
        <div v-if="gardens.error" class="text-danger">Error loading gardens: {{gardens.error}}</div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" v-if="gardens && !gardens.loading && !gardens.error && Array.isArray(gardens) && gardens.length > 0">
            <div 
                v-for="garden in gardens" 
                :key="garden.id" 
                class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                @click="gardenClick(garden.attributes.slug)"
            >
                <div class="h-48 overflow-hidden">
                    <img 
                        :src="getGardenImage(garden)" 
                        :alt="garden.attributes?.title || 'Garden Image'"
                        class="w-full h-full object-cover"
                    />
                </div>
                <div class="p-4">
                    <h3 class="text-xl font-bold mb-2 leading-snug">{{ garden.attributes?.title }}</h3>
                    <p v-if="garden.attributes?.blurb" class="text-gray-600 mb-2">{{ garden.attributes.blurb }}</p>
                </div>
            </div>
        </div>
        
        <div v-if="gardens && !gardens.loading && !gardens.error && (!Array.isArray(gardens) || gardens.length === 0)" class="text-center py-8">
            <p class="text-gray-600">No gardens available at this time.</p>
        </div>
    </div>
</template>

