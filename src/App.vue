<script setup>
import { Nav, Alert } from '@/components';
import { LoginModal } from '@/components/modals';
import { useAuthStore } from '@/stores';
import Footer from '@/components/Footer.vue';
import { RouterView } from 'vue-router';
import '@fortawesome/fontawesome-free/css/all.css'

const auth = useAuthStore();
</script>

<template>
    <div class="app-container">
        <Nav />
        <Alert />
        <LoginModal v-if="auth.loginModalOpen" />
        <div class="container px-0 pb-4 md:px-4 md:pt-4 pt-[5px]">
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