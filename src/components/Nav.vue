<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';
import SunIcon from '@/components/icons/Sun.svg?raw';
import MoonIcon from '@/components/icons/Moon.svg?raw';
import SystemIcon from '@/components/icons/System.svg?raw';

const authStore = useAuthStore();
const theme = ref('system');
const showProfileOptions = ref(false);
const isMobileMenuOpen = ref(false);
const mobileMenu = ref(null);
const profileMenuRef = ref(null);
const profileButtonRef = ref(null);

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
    } else {
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

onMounted(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        theme.value = savedTheme;
    }
    applyTheme(theme.value);

    if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme.value === 'system') {
                applyTheme('system');
            }
        };
        mediaQuery.addEventListener('change', handleChange);
    }

    document.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('keydown', handleEscape);
});

const toggleProfileOptions = () => {
    showProfileOptions.value = !showProfileOptions.value;
};

const toggleMobileMenu = async () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
    await nextTick();
    if (isMobileMenuOpen.value) {
        mobileMenu.value.style.transform = 'translateX(0)';
    } else {
        mobileMenu.value.style.transform = 'translateX(-100%)';
    }
};

const handleClickOutside = (event) => {
    const profileMenu = event.target.closest('.profile-menu');
    const profileButton = event.target.closest('.profile-menu-button');

    if (!profileMenu && !profileButton && showProfileOptions.value) {
        showProfileOptions.value = false;
    }

    const mobileMenuElement = event.target.closest('.mobile-menu');
    const mobileMenuButton = event.target.closest('.mobile-menu-button');

    if (!mobileMenuElement && !mobileMenuButton && isMobileMenuOpen.value) {
        isMobileMenuOpen.value = false;
        if (mobileMenu.value) {
            mobileMenu.value.style.transform = 'translateX(-100%)';
        }
    }
};

const handleEscape = (e) => {
    if (e.key === 'Escape') {
        if (showProfileOptions.value) {
            showProfileOptions.value = false;
        }
        if (isMobileMenuOpen.value) {
            isMobileMenuOpen.value = false;
            if (mobileMenu.value) {
                mobileMenu.value.style.transform = 'translateX(-100%)';
            }
        }
    }
};
</script>

<template>
    <transition name="fade">
        <div v-if="showProfileOptions" ref="profileMenuRef" class="profile-menu bg-custom-light p-2">
            <div v-if="authStore.user" class="user-info">
                <div class="user-name">{{ authStore.user.username || (authStore.user.firstName && authStore.user.lastName ? `${authStore.user.firstName} ${authStore.user.lastName}` : 'User') }}</div>
            </div>
            <button @click="() => { authStore.logout(); showProfileOptions = false; }"
                    class="btn btn-link nav-item nav-link">
                Logout
            </button>
        </div>
    </transition>

    <nav
        class="gs-navbar navbar navbar-expand navbar-light w-full max-w-full overflow-x-hidden bg-custom-light dark:!bg-custom-light"
    >
        <router-link to="/" class="logo-image desktop-logo">
                <img src="/public/gs-logo-name.png" alt="GS Logo" class="logo-img h-7 mt-1">
        </router-link>

        <div class="navbar-nav d-flex justify-content-center w-100 mb-1">
            <button class="mobile-menu-button" @click="toggleMobileMenu">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </button>

            <div ref="mobileMenu" v-show="isMobileMenuOpen" class="mobile-menu bg-darker-green text-white">
                <router-link to="/" class="nav-item nav-link" @click="toggleMobileMenu">Home</router-link>
                <router-link to="/gardens" class="nav-item nav-link" @click="toggleMobileMenu">Gardens</router-link>
                <router-link to="/manage/gardens" class="nav-item nav-link" v-show="authStore.user" @click="toggleMobileMenu">Manage</router-link>
                <router-link to="/events" class="nav-item nav-link" @click="toggleMobileMenu">Events</router-link>
                <router-link to="/join" class="nav-item nav-link" @click="toggleMobileMenu">Join</router-link>
                <router-link to="/blog" class="nav-item nav-link" @click="toggleMobileMenu">Blog</router-link>
                <router-link to="/manifesto" class="nav-item nav-link" @click="toggleMobileMenu">Manifesto</router-link>
                <router-link to="/help" class="nav-item nav-link" @click="toggleMobileMenu">Help</router-link>
                <router-link to="/login" class="nav-item nav-link" v-show="!authStore.user" @click="toggleMobileMenu">Login</router-link>

                <div class="mobile-theme-options">
                    <span class="mobile-theme-inline-label">Theme</span>
                    <button
                        type="button"
                        @click="setTheme('light')"
                        :class="['theme-option', { active: theme === 'light' }]"
                        title="Light Mode"
                    >
                        <span v-html="SunIcon" class="theme-icon"></span>
                    </button>
                    <button
                        type="button"
                        @click="setTheme('dark')"
                        :class="['theme-option', { active: theme === 'dark' }]"
                        title="Dark Mode"
                    >
                        <span v-html="MoonIcon" class="theme-icon"></span>
                    </button>
                    <button
                        type="button"
                        @click="setTheme('system')"
                        :class="['theme-option', { active: theme === 'system' }]"
                        title="System preference"
                    >
                        <span v-html="SystemIcon" class="theme-icon"></span>
                    </button>
                </div>
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
                    <router-link to="/manifesto" class="nav-item nav-link">Manifesto</router-link>
                    <router-link v-show="!authStore.user" to="/help" class="nav-item nav-link">Help</router-link>

                </div>
            </div>

            <div class="nav-right-section">
                <router-link v-show="!authStore.user" to="/login" class="nav-item nav-link login-link">Login</router-link>
            </div>

            <div v-if="authStore.user" class="profile-container">
                <UserProfileDisplay
                    ref="profileButtonRef"
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
    margin-right: 20px;
}

/*
 * Header is always the light cream bar (`bg-custom-light`), including in `html.dark`.
 * Links stay dark green on cream (readable); force fill to match `color`.
 */
.gs-navbar.navbar.bg-custom-light {
    color: #376451;
}
html.dark .gs-navbar.navbar.bg-custom-light {
    background-color: #f7f1e3 !important;
}
.gs-navbar.navbar.bg-custom-light .web-nav .nav-item.nav-link,
.gs-navbar.navbar.bg-custom-light .nav-right-section .login-link {
    color: #376451 !important;
    -webkit-text-fill-color: #376451 !important;
}
.gs-navbar.navbar.bg-custom-light .web-nav .nav-item.nav-link:hover,
.gs-navbar.navbar.bg-custom-light .nav-right-section .login-link:hover {
    color: #2d4a2e !important;
    -webkit-text-fill-color: #2d4a2e !important;
    text-decoration: underline;
}
.gs-navbar.navbar.bg-custom-light .web-nav .nav-item.nav-link.router-link-active {
    color: #2d4a2e !important;
    -webkit-text-fill-color: #2d4a2e !important;
}

.mobile-menu .nav-link,
.mobile-menu .nav-item.nav-link {
    color: #fff !important;
}
.profile-container {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    z-index: 1500;
}
.nav-right-section {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    z-index: 1500;
}
.login-link {
    font-size: 1.1rem;
    margin-right: 0 !important;
    font-weight: 600;
    text-decoration: none;
}
.profile-menu {
    position: fixed;
    top: 60px;
    right: 8px;
    min-width: 150px;
    background: white;
    border: 1px solid #8aa37c;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 99999;
}
/* Match main bar: light tan surface + dark green text (not white on cream). */
.dark .profile-menu {
    background: #f7f1e3 !important;
    border-color: rgba(138, 163, 124, 0.35);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
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
.dark .profile-menu .nav-link {
    color: #376451 !important;
}
.dark .profile-menu .nav-link:hover {
    color: #2d4a2e !important;
    background-color: rgba(138, 163, 124, 0.15);
}
.user-info {
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    margin-bottom: 8px;
}
.dark .profile-menu .user-info {
    border-bottom-color: rgba(138, 163, 124, 0.35);
}
.user-name {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
    word-break: break-word;
}
.dark .profile-menu .user-name {
    color: #376451 !important;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.mobile-menu-button {
    display: none;
    cursor: pointer;
    position: absolute;
    left: 15px;
    top: 15px;
    z-index: 1050;
}

.mobile-menu {
    position: fixed;
    top: 50px;
    left: 0;
    width: 250px;
    height: calc(100% - 65px);
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    color: #fff;
}

.navbar {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    min-height: 60px;
    padding: 0.5rem 0.75rem;
    width: 100%;
    max-width: 100vw;
    z-index: 1000;
    overflow: visible;
}

.logo-image {
    position: absolute;
    left: 15px;
    top: 4;
    z-index: 1;
}

.logo-img {
    height: auto;
    max-height: 3rem;
    width: auto;
    max-width: 288px;
    object-fit: contain;
}

.navbar-nav {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
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


.bar {
    display: block;
    width: 25px;
    height: 3px;
    margin: 5px auto;
    background-color: #333;
}

.mobile-menu .router-link-exact-active {
    font-weight: bold;
    color: #fff !important;
    border-bottom: 2px solid #fff;
}
.mobile-menu .router-link-exact-active.image {
    font-weight: bold;
    color: #fff !important;
    border-bottom: 0px;
}

.mobile-theme-options {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    margin-top: 10px;
}
.mobile-theme-inline-label {
    font-size: 0.875rem;
    opacity: 0.8;
    margin-right: 4px;
}
.mobile-theme-options .theme-option {
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.45);
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    width: 40px;
    height: 40px;
    color: #fff;
}
.mobile-theme-options .theme-option:hover {
    background-color: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.75);
}
.mobile-theme-options .theme-option.active {
    background-color: #8aa37c;
    border-color: #c5d4b8;
}
.mobile-theme-options .theme-icon {
    display: inline-flex;
    width: 20px;
    height: 20px;
    align-items: center;
    justify-content: center;
}

.mobile-logo {
    display: none;
}

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
    .nav-item img {
        display: block;
        margin: 0 auto;
    }

    .mobile-logo .logo-img {
        max-width: 216px;
        max-height: 2.7rem;
    }

    .mobile-logo {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1;
    }

    .navbar {
        justify-content: center;
        padding: 0.5rem 0.75rem;
    }

    .mobile-menu-button {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
    }
}

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

@media (max-width: 1024px) {
    .profile-container {
        position: absolute;
        right: 8px;
        top: 12px;
        transform: none;
        z-index: 1500;
    }
}
</style>
