<script setup>
import { Nav, Alert } from '@/components';
import { RouterView } from 'vue-router';
</script>

<template>
    <div class="app-container bg-light">
        <Nav />
        <Alert />
        <div class="container pt-4 pb-4">
            <RouterView />
        </div>
    </div>
</template>

<style>
@import '@/assets/base.css';
</style>