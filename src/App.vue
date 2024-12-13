<script setup>
import { Nav, Alert } from '@/components';
import { RouterView } from 'vue-router';
import '@fortawesome/fontawesome-free/css/all.css'
</script>

<template>
    <div class="app-container">
        <Nav />
        <Alert />
        <div class="container pt-4 pb-4">
            <RouterView />
        </div>
    
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