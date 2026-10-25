<script setup>
import { Nav, Alert } from '@/components';
import { LoginModal } from '@/components/modals';
import { useAuthStore } from '@/stores';
import Footer from '@/components/Footer.vue';
import { RouterView, useRoute } from 'vue-router';
import { computed } from 'vue';
import '@fortawesome/fontawesome-free/css/all.css'

const auth = useAuthStore();
const route = useRoute();
const viewportClass = computed(() => {
    if (route.meta.viewport === 'wide') return 'app-viewport--wide';
    return 'container px-0 pb-4 md:px-4 md:pt-4 pt-[5px]';
});
// The stored user is a login-time snapshot; pick up the current role (e.g. Administrator).
auth.refreshRole();
</script>

<template>
    <div class="app-container">
        <Nav />
        <Alert />
        <LoginModal v-if="auth.loginModalOpen" />
        <div class="app-viewport" :class="viewportClass">
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

.app-viewport {
    overflow: visible;
    position: relative;
    z-index: 1;
}

.app-viewport--wide {
    width: 100%;
    max-width: none;
    min-width: 0;
    margin: 0;
    padding: 0;
}
</style>