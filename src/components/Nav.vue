<script setup>
import { useAuthStore } from '@/stores';
const authStore = useAuthStore();
</script>

<template>
    <nav class="navbar navbar-expand navbar-light bg-custom-light">
        <div class="navbar-nav d-flex justify-content-center w-100">
            <img src="/public/gs-logo-name.png" alt="GS Logo" class="h-7 pr-10 mt-1">
            <router-link v-show="!authStore.user" to="/login" class="nav-item nav-link">Login</router-link>
            <div v-show="authStore.user" class="d-flex align-items-center">
                <router-link to="/gardens" class="nav-item nav-link">Gardens</router-link>
                <button @click="authStore.logout()" class="btn btn-link nav-item nav-link">Logout</button>
            </div>
            <router-link to="/blog" class="nav-item nav-link">Blog</router-link>
            <router-link v-show="!authStore.user" to="/help" class="nav-item nav-link">Help</router-link>
            <router-link v-show="!authStore.user" to="/apply" class="nav-item nav-link">Apply</router-link>
        </div>  
    </nav>
</template>

<style scoped>
.nav-link {
    text-transform: uppercase; /* Makes text uppercase */
    margin-right: 20px; /* Adds spacing to the right of each link */
}
</style>