<script setup>
import { ref, nextTick } from 'vue';
import { useAuthStore } from '@/stores';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';

const authStore = useAuthStore();
const showProfileOptions = ref(false);
const isMobileMenuOpen = ref(false);
const mobileMenu = ref(null);

const toggleProfileOptions = () => {
    showProfileOptions.value = !showProfileOptions.value;
};

const toggleMobileMenu = async () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
    await nextTick(); // Wait for the DOM to update
    if (isMobileMenuOpen.value) {
        mobileMenu.value.style.transform = 'translateX(0)';
    } else {
        mobileMenu.value.style.transform = 'translateX(-100%)';
    }
};
</script>

<template>
    <nav class="navbar navbar-expand navbar-light bg-custom-light">
        <div class="navbar-nav d-flex justify-content-center w-100">
            <!-- Mobile Menu Button -->
            <button class="mobile-menu-button" @click="toggleMobileMenu">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </button>

            <!-- Mobile Menu Items -->
            <div ref="mobileMenu" v-show="isMobileMenuOpen" class="mobile-menu bg-darker-green text-white">
                <router-link to="/" class="nav-item nav-link" @click="toggleMobileMenu">Home</router-link>
                <router-link to="/gardens" class="nav-item nav-link" v-show="authStore.user" @click="toggleMobileMenu">Gardens</router-link>
                <router-link to="/blog" class="nav-item nav-link" @click="toggleMobileMenu">Blog</router-link>
                <router-link to="/help" class="nav-item nav-link" @click="toggleMobileMenu">Help</router-link>
                <router-link to="/apply" class="nav-item nav-link" @click="toggleMobileMenu">Apply</router-link>
                <router-link to="/login" class="nav-item nav-link" v-show="!authStore.user" @click="toggleMobileMenu">Login</router-link>
            </div>

            <button class="sidemenu__btn" v-on:click="navOpen=!navOpen" v-bind:class="{active:navOpen}">
				<span class="top"></span>
				<span class="mid"></span>
				<span class="bottom"></span>
			</button>
            <router-link to="/" class="nav-item nav-link image">
                <img src="/public/gs-logo-name.png" alt="GS Logo" class="h-7 pr-10 mt-1">
            </router-link>

            <div class="web-nav">
                <div class="d-flex align-items-center">
                    <div v-show="authStore.user">
                        <router-link to="/gardens" class="nav-item nav-link">Gardens</router-link>            
                    </div>
                    <router-link to="/blog" class="nav-item nav-link">Blog</router-link>
                    <router-link v-show="!authStore.user" to="/help" class="nav-item nav-link">Help</router-link>
                    <router-link v-show="!authStore.user" to="/apply" class="nav-item nav-link">Apply</router-link>
                    <router-link v-show="!authStore.user" to="/login" class="nav-item nav-link">Login</router-link>
    
                </div>
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
    margin-right: 20px; /* Adds spacing to the right of each link */
    color: #fff;
}
.profile-container {
    position: relative; /* This makes it the reference for absolute positioning of children */
    margin: 5px 0px 0px 0px;
}
.profile-menu {
    position: absolute;
    top: 100%; /* Position directly below the UserProfileDisplay */
    right: 0; /* Aligns the left edge of the dropdown with the left edge of the UserProfileDisplay */
    width: max-content; /* Adjust width to fit the content */
    border: 1px solid #8aa37c;
    border-top: none;
    border-radius: 0 0px 5px 5px;
    padding: 10px;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.mobile-menu-button {
    display: none; /* Ensure it's visible on mobile */
    cursor: pointer;
    position: absolute; /* Position it relative to its nearest positioned ancestor */
    left: 15px; /* Align to the far left */
    top: 20px; /* Adjust this value based on your header's height */
    z-index: 1050; /* Ensure it's above other content */
}

.mobile-menu {
    position: fixed;
    top: 65px; /* Adjust this value to the height of your header */
    left: 0;
    width: 250px; /* Ensure it spans the full width */
    height: calc(100% - 65px); /* Adjust based on your header height */
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    color: #fff; /* Ensures all text is white */
}

.navbar-nav {
    justify-content: space-between; /* Adjusts the space distribution */
}

.nav-item.nav-link {
    text-align: left;
    font-size: 1.25rem;
}
.mobile-menu .nav-item.nav-link {
    margin: 10px;
}
.mobile-menu .nav-item.nav-link.image {
    margin:0px 0px 0px 30px;
}
.nav-item.nav-link.image {
    margin: 0px;
    padding-bottom: 0px;
}

/* Center the logo specifically */
.nav-item.nav-link img {
    display: block; /* Makes the image a block element to center it */
    margin: 0 auto; /* Auto margin for horizontal centering */
}

.nav-link, .mobile-menu .nav-item {
    color: #fff; /* Ensures text is white */
}

.bar {
    display: block;
    width: 25px;
    height: 3px;
    margin: 5px auto;
    background-color: #333;
}

.mobile-menu .router-link-exact-active {
    font-weight: bold; /* Makes the font weight bold */
    color: #fff !important; /* Keeps the text color white, as previously defined */
    border-bottom: 2px solid #fff;
}
.mobile-menu .router-link-exact-active.image {
    font-weight: bold; /* Makes the font weight bold */
    color: #fff !important; /* Keeps the text color white, as previously defined */
    border-bottom: 0px;
}
@media (max-width: 768px) {
    .mobile-menu-button {
        display: block;
    }
    .web-nav {
        display: none;
    }
}
</style>
