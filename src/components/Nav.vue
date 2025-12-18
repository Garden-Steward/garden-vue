<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { useAuthStore } from '@/stores';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';
import SunIcon from '@/components/icons/Sun.svg?raw';
import MoonIcon from '@/components/icons/Moon.svg?raw';
import SystemIcon from '@/components/icons/System.svg?raw';

const authStore = useAuthStore();
const showProfileOptions = ref(false);
const isMobileMenuOpen = ref(false);
const mobileMenu = ref(null);

// Theme management
const theme = ref('system'); // 'light', 'dark', or 'system'

const getSystemPreference = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
};

const applyTheme = (themeValue) => {
    let shouldBeDark = false;
    
    if (themeValue === 'dark') {
        shouldBeDark = true;
    } else if (themeValue === 'light') {
        shouldBeDark = false;
    } else { // 'system'
        shouldBeDark = getSystemPreference();
    }
    
    if (shouldBeDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

const setTheme = (newTheme) => {
    theme.value = newTheme;
    localStorage.setItem('app-theme', newTheme);
    applyTheme(newTheme);
};

// Initialize theme on mount
onMounted(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        theme.value = savedTheme;
    }
    applyTheme(theme.value);
    
    // Watch for system preference changes when theme is 'system'
    if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme.value === 'system') {
                applyTheme('system');
            }
        };
        mediaQuery.addEventListener('change', handleChange);
    }
});

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
    <!-- Profile menu outside navbar -->
    <transition name="fade">
        <div v-if="showProfileOptions" class="profile-menu bg-custom-light p-2">
            <div v-if="authStore.user" class="user-info">
                <div class="user-name">{{ authStore.user.username || (authStore.user.firstName && authStore.user.lastName ? `${authStore.user.firstName} ${authStore.user.lastName}` : 'User') }}</div>
            </div>
            <div class="theme-settings">
                <div class="theme-settings-label">Theme Settings</div>
                <div class="theme-options">
                    <button 
                        @click="setTheme('light')" 
                        :class="['theme-option', { active: theme === 'light' }]"
                        title="Light Mode"
                    >
                        <span v-html="SunIcon" class="theme-icon"></span>
                    </button>
                    <button 
                        @click="setTheme('dark')" 
                        :class="['theme-option', { active: theme === 'dark' }]"
                        title="Dark Mode"
                    >
                        <span v-html="MoonIcon" class="theme-icon"></span>
                    </button>
                    <button 
                        @click="setTheme('system')" 
                        :class="['theme-option', { active: theme === 'system' }]"
                        title="System Preference"
                    >
                        <span v-html="SystemIcon" class="theme-icon"></span>
                    </button>
                </div>
            </div>
            <button @click="() => { authStore.logout(); showProfileOptions = false; }" 
                    class="btn btn-link nav-item nav-link">
                Logout
            </button>
        </div>
    </transition>

    <nav class="navbar navbar-expand navbar-light bg-custom-light w-full max-w-full overflow-x-hidden">
        <router-link to="/" class="logo-image desktop-logo">
                <img src="/public/gs-logo-name.png" alt="GS Logo" class="logo-img h-7 mt-1">
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
                <router-link to="/gardens" class="nav-item nav-link" @click="toggleMobileMenu">Gardens</router-link>
                <router-link to="/manage/gardens" class="nav-item nav-link" v-show="authStore.user" @click="toggleMobileMenu">Manage</router-link>
                <router-link to="/events" class="nav-item nav-link" @click="toggleMobileMenu">Events</router-link>
                <router-link to="/join" class="nav-item nav-link" @click="toggleMobileMenu">Join</router-link>
                <router-link to="/blog" class="nav-item nav-link" @click="toggleMobileMenu">Blog</router-link>
                <router-link to="/contribute" class="nav-item nav-link" @click="toggleMobileMenu">
                    Contribute <i class="fab fa-github ml-1"></i>
                </router-link>
                <router-link to="/help" class="nav-item nav-link" @click="toggleMobileMenu">Help</router-link>
                <router-link to="/login" class="nav-item nav-link" v-show="!authStore.user" @click="toggleMobileMenu">Login</router-link>
            </div>

            <button class="sidemenu__btn" v-on:click="navOpen=!navOpen" v-bind:class="{active:navOpen}">
				<span class="top"></span>
				<span class="mid"></span>
				<span class="bottom"></span>
			</button>
            <router-link to="/" class="nav-item image mobile-logo">
                <img src="/public/gs-logo-name.png" alt="GS Logo" class="logo-img h-7">
            </router-link>

            <div class="web-nav">
                <div class="d-flex align-items-center">
                    <router-link to="/gardens" class="nav-item nav-link">Gardens</router-link>
                    <router-link to="/manage/gardens" class="nav-item nav-link" v-show="authStore.user">Manage</router-link>
                    <router-link to="/join" class="nav-item nav-link">Join</router-link>
                    <router-link to="/events" class="nav-item nav-link">Events</router-link>
                    <router-link to="/blog" class="nav-item nav-link">Blog</router-link>
                    <router-link to="/contribute" class="nav-item nav-link">
                        Contribute <i class="fab fa-github ml-1"></i>
                    </router-link>
                    <router-link v-show="!authStore.user" to="/help" class="nav-item nav-link">Help</router-link>
                    <router-link v-show="!authStore.user" to="/login" class="nav-item nav-link">Login</router-link>
    
                </div>
            </div>
            <div v-if="authStore.user" class="profile-container">
                <UserProfileDisplay 
                    :volunteer="authStore.user" 
                    :show-email="false" 
                    :disable-tooltip="true"
                    @click="toggleProfileOptions" 
                    class="relative cursor-pointer profile-menu-button"
                />
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
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    z-index: 1500;
}
.profile-menu {
    position: fixed;
    top: 60px;
    right: 15px;
    min-width: 150px;
    background: white;
    border: 1px solid #8aa37c;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 99999;
}
.profile-menu .nav-link {
    color: #333;
    margin: 0;
    padding: 8px 16px;
    display: block;
}
.profile-menu .nav-link:hover {
    background-color: #f5f5f5;
}
.user-info {
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 8px;
}
.user-name {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
    word-break: break-word;
}
.theme-settings {
    padding: 8px 16px;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 8px;
}
.theme-settings-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
}
.theme-options {
    display: flex;
    gap: 8px;
    justify-content: flex-start;
}
.theme-option {
    background: transparent;
    border: 2px solid #8aa37c;
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    width: 36px;
    height: 36px;
}
.theme-option:hover {
    background-color: #f5f5f5;
    transform: scale(1.05);
}
.theme-option.active {
    background-color: #8aa37c;
    border-color: #6c8a6a;
}
.theme-option.active .theme-icon {
    color: #fff;
}
.theme-icon {
    display: inline-block;
    width: 20px;
    height: 20px;
    color: #8aa37c;
    transition: color 0.2s ease;
}
.theme-option.active .theme-icon {
    color: #fff;
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
    z-index: 9999;
}

.logo-image {
    position: absolute; /* Position the logo absolutely within the navbar */
    left: 15px; /* Adjust this value to position the logo as needed */
    top: 4; /* Align to the top of the navbar */
    z-index: 1; /* Ensure it's above other content */
}

/* Prevent logo from getting squished */
.logo-img {
    height: auto;
    max-height: 3rem; /* Increased by another 20% from 2.5rem */
    width: auto;
    max-width: 288px; /* Increased by another 20% from 240px */
    object-fit: contain; /* Preserve aspect ratio */
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

/* Mobile logo - hidden by default, shown in media query */
.mobile-logo {
    display: none;
}

/* Hide desktop logo and show mobile logo when hamburger menu appears */
/* Tablet and below: show hamburger menu */
@media (max-width: 1024px) {
    .desktop-logo {
        display: none;
    }
    .mobile-logo {
        display: block;
    }
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
    
    /* Ensure mobile logo doesn't get squished */
    .mobile-logo .logo-img {
        max-width: 216px; /* Increased by another 20% from 180px */
        max-height: 2.7rem; /* Increased by another 20% from 2.25rem */
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

/* Show desktop logo and hide mobile logo above the breakpoint */
/* Desktop: show full navigation links */
@media (min-width: 1025px) {
    .desktop-logo {
        display: block;
    }
    .mobile-logo {
        display: none;
    }
    .mobile-menu-button {
        display: none;
    }
}
</style>
