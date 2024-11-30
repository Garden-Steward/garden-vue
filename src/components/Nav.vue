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
    <nav class="navbar navbar-expand navbar-light bg-custom-light w-full max-w-full overflow-x-hidden">
        <router-link to="/" class="logo-image hidden sm:block">
                <img src="/public/gs-logo-name.png" alt="GS Logo" class="h-7 mt-1">
        </router-link>

        <div class="navbar-nav d-flex justify-content-center w-100 mb-1">
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
                <router-link to="/events" class="nav-item nav-link" @click="toggleMobileMenu">Events</router-link>
                <router-link to="/join" class="nav-item nav-link" @click="toggleMobileMenu">Join</router-link>
                <router-link to="/blog" class="nav-item nav-link" @click="toggleMobileMenu">Blog</router-link>
                <router-link to="/help" class="nav-item nav-link" @click="toggleMobileMenu">Help</router-link>
                <router-link to="/login" class="nav-item nav-link" v-show="!authStore.user" @click="toggleMobileMenu">Login</router-link>
            </div>

            <button class="sidemenu__btn" v-on:click="navOpen=!navOpen" v-bind:class="{active:navOpen}">
				<span class="top"></span>
				<span class="mid"></span>
				<span class="bottom"></span>
			</button>
            <router-link to="/" class="nav-item image sm:hidden mobile-logo">
                <img src="/public/gs-logo-name.png" alt="GS Logo" class="h-7">
            </router-link>

            <div class="web-nav">
                <div class="d-flex align-items-center">
                    <div v-show="authStore.user">
                        <router-link to="/gardens" class="nav-item nav-link">Gardens</router-link>            
                    </div>
                    <router-link to="/join" class="nav-item nav-link">Join</router-link>
                    <router-link to="/events" class="nav-item nav-link">Events</router-link>
                    <router-link to="/blog" class="nav-item nav-link">Blog</router-link>
                    <router-link v-show="!authStore.user" to="/help" class="nav-item nav-link">Help</router-link>
                    <router-link v-show="!authStore.user" to="/login" class="nav-item nav-link">Login</router-link>
    
                </div>
            </div>
            <div v-if="authStore.user" class="profile-container">
                <UserProfileDisplay :volunteer="authStore.user" :show-email="false" @click="toggleProfileOptions" class="relative cursor-pointer profile-menu-button"/>
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
    position: absolute; /* Position the profile container absolutely within the navbar */
    top: 0; /* Align to the top of the navbar */
    right: 0; /* Align to the right of the navbar */
    margin: 10px; /* Optional: add some margin */
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
    top: 15px; /* Adjust this value based on your header's height */
    z-index: 1050; /* Ensure it's above other content */
}

.mobile-menu {
    position: fixed;
    top: 50px; /* Adjust this value to the height of your header */
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

.navbar {
    display: flex; /* Ensures the navbar is a flex container */
    justify-content: center; /* Center the items in the navbar */
    align-items: center; /* Aligns items vertically */
    position: relative; /* Ensure the navbar is the reference for absolute positioning */
    min-height: 60px; /* Add minimum height to prevent collapse */
    padding: 0.5rem 1rem; /* Add consistent padding */
    width: 100%;
    max-width: 100vw; /* Ensure navbar doesn't exceed viewport width */
    overflow-x: hidden; /* Prevent horizontal scrolling */
}

.logo-image {
    position: absolute; /* Position the logo absolutely within the navbar */
    left: 15px; /* Adjust this value to position the logo as needed */
    top: 4; /* Align to the top of the navbar */
    z-index: 1; /* Ensure it's above other content */
}

.navbar-nav {
    width: 100%; /* Takes up the full width of the navbar */
    display: flex;
    justify-content: center; /* Centers the navigation links */
    align-items: center; /* Aligns items vertically */
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
.logo-image {
    margin: 0px;
    padding-bottom: 0px;
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
    /* Center the logo specifically */
    .nav-item img {
        display: block; /* Makes the image a block element to center it */
        margin: 0 auto; /* Auto margin for horizontal centering */
    }

    /* Update mobile logo positioning */
    .mobile-logo {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1;
    }

    /* Update mobile specific styles */
    .navbar {
        justify-content: center;
        padding: 0.5rem 1rem;
    }

    /* Ensure mobile menu button doesn't interfere with centering */
    .mobile-menu-button {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
    }
}
</style>
