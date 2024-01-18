<script setup>
import { useAuthStore } from '@/stores';
const authStore = useAuthStore();
</script>

<template>
    <nav v-show="authStore.user" class="navbar navbar-expand navbar-light bg-custom-light">
        <div class="navbar-nav">
            <router-link to="/" class="nav-item nav-link">Home</router-link>
            <!-- Add the image here and use mx-auto to center it -->
            <router-link to="/gardens" class="nav-item nav-link">Gardens</router-link>
            <button @click="authStore.logout()" class="btn btn-link nav-item nav-link">Logout</button>
        </div>  
    </nav>
</template>