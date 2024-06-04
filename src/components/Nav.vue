<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';

const authStore = useAuthStore();
const showProfileOptions = ref(false);

const toggleProfileOptions = () => {
    console.log('clicked')
    showProfileOptions.value = !showProfileOptions.value;
};
</script>

<template>
    <nav class="navbar navbar-expand navbar-light bg-custom-light">
        <div class="navbar-nav d-flex justify-content-center w-100">
            <router-link to="/" class="nav-item nav-link">
                <img src="/public/gs-logo-name.png" alt="GS Logo" class="h-7 pr-10 mt-1">
            </router-link>
            <div class="d-flex align-items-center">
                <div v-show="authStore.user">
                    <router-link to="/gardens" class="nav-item nav-link">Gardens</router-link>            
                </div>
                <router-link to="/blog" class="nav-item nav-link">Blog</router-link>
            <router-link v-show="!authStore.user" to="/help" class="nav-item nav-link">Help</router-link>
            <router-link v-show="!authStore.user" to="/apply" class="nav-item nav-link">Apply</router-link>
            <router-link v-show="!authStore.user" to="/login" class="nav-item nav-link">Login</router-link>

            </div>
            <div v-if="authStore.user" class="profile-container">
                <UserProfileDisplay :volunteer="authStore.user" :show-email="false" @click="toggleProfileOptions" class="relative cursor-pointer"/>
                <transition name="fade">
                    <div v-if="showProfileOptions" class="profile-menu bg-custom-light p-2">
                        <button @click="authStore.logout()" class="btn btn-link nav-item nav-link">Logout</button>
                    </div>
                </transition>
            </div>

        </div>  
    </nav>
</template>

<style scoped>
.nav-link {
    text-transform: uppercase; /* Makes text uppercase */
    margin-right: 20px; /* Adds spacing to the right of each link */
}
.profile-container {
    position: relative; /* This makes it the reference for absolute positioning of children */
}
.profile-menu {
    position: absolute;
    top: 100%; /* Position directly below the UserProfileDisplay */
    left: 0; /* Aligns the left edge of the dropdown with the left edge of the UserProfileDisplay */
    width: max-content; /* Adjust width to fit the content */
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>