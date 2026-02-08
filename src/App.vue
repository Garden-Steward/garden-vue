<script setup>
import { Nav, Alert } from '@/components';
import Footer from '@/components/Footer.vue';
import { RouterView } from 'vue-router';
import '@fortawesome/fontawesome-free/css/all.css'
</script>

<template>
    <div class="app-container">
        <Nav />
        <Alert />
        <div class="container px-0 pb-4 md:px-4 md:pt-4 pt-20 md:pt-4">
            <RouterView />
        </div>
        <Footer />
    </div>
</template>

<style>
@import '@/assets/base.css';

.app-container {
    position: relative;
    z-index: 1;
}

.container {
    overflow: visible;
    position: relative;
    z-index: 1;
}
</style>