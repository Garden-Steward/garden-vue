<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';
import SunIcon from '@/components/icons/Sun.svg?raw';
import MoonIcon from '@/components/icons/Moon.svg?raw';
import SystemIcon from '@/components/icons/System.svg?raw';

const authStore = useAuthStore();
const theme = ref('light');
const showProfileOptions = ref(false);
const showAboutDropdown = ref(false);
const aboutMenu = ref(null);
const aboutButton = ref(null);
let colorQuery;
let onColorChange;

const userName = computed(() => {
    const user = authStore.user;
    if (user?.username) return user.username;
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    return 'User';
});

const applyTheme = (value) => {
    let dark = false;
    if (value === 'dark') {
        dark = true;
    } else if (value === 'system' && colorQuery) {
        dark = colorQuery.matches;
    }
    document.documentElement.classList.toggle('dark', dark);
};

const setTheme = (value) => {
    theme.value = value;
    localStorage.setItem('app-theme', value);
    applyTheme(value);
};

const openPhoneLogin = () => {
    showAboutDropdown.value = false;
    authStore.openLoginModal();
};

const closePopovers = (event) => {
    if (!event.target.closest('.profile-menu, .profile-menu-button')) {
        showProfileOptions.value = false;
    }
    if (!aboutMenu.value?.contains(event.target)) {
        showAboutDropdown.value = false;
    }
};

const onEscape = (event) => {
    if (event.key !== 'Escape') return;
    showProfileOptions.value = false;
    if (showAboutDropdown.value) {
        showAboutDropdown.value = false;
        aboutButton.value?.focus();
    }
};

onMounted(() => {
    colorQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const saved = localStorage.getItem('app-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') theme.value = saved;
    applyTheme(theme.value);
    onColorChange = () => {
        if (theme.value === 'system') applyTheme('system');
    };
    colorQuery.addEventListener('change', onColorChange);
    document.addEventListener('click', closePopovers);
    window.addEventListener('keydown', onEscape);
});

onUnmounted(() => {
    colorQuery?.removeEventListener('change', onColorChange);
    document.removeEventListener('click', closePopovers);
    window.removeEventListener('keydown', onEscape);
});
</script>

<template>
    <transition name="fade">
        <div v-if="showProfileOptions" class="profile-menu" role="group" aria-label="Account options">
            <div class="user-name">{{ userName }}</div>
            <div class="profile-theme-options" role="group" aria-label="Color theme">
                <span class="profile-theme-label">Theme</span>
                <button type="button" class="profile-theme-option" :class="{ active: theme === 'light' }" title="Light mode" aria-label="Light mode" @click="setTheme('light')"><span class="theme-icon" v-html="SunIcon"></span></button>
                <button type="button" class="profile-theme-option" :class="{ active: theme === 'dark' }" title="Dark mode" aria-label="Dark mode" @click="setTheme('dark')"><span class="theme-icon" v-html="MoonIcon"></span></button>
                <button type="button" class="profile-theme-option" :class="{ active: theme === 'system' }" title="Match system" aria-label="Match system" @click="setTheme('system')"><span class="theme-icon" v-html="SystemIcon"></span></button>
            </div>
            <button type="button" class="profile-logout-btn" @click="authStore.logout(); showProfileOptions = false">Logout</button>
        </div>
    </transition>

    <header class="gs-navbar">
        <div class="gs-navbar__top">
            <router-link to="/" class="gs-navbar__logo"><img src="/brand/garden-steward-wordmark.svg" alt="Garden Steward"></router-link>
            <div class="gs-navbar__actions">
                <button v-if="!authStore.user" type="button" class="gs-navbar__cta" @click="openPhoneLogin">Get involved ↗</button>
                <router-link v-else to="/gardens" class="gs-navbar__cta gs-navbar__cta--signed-in">Get involved ↗</router-link>
                <div v-if="authStore.user" class="profile-menu-button" role="button" tabindex="0" aria-label="Account options" :aria-expanded="showProfileOptions" @click="showProfileOptions = !showProfileOptions" @keydown.enter.prevent="showProfileOptions = !showProfileOptions" @keydown.space.prevent="showProfileOptions = !showProfileOptions"><UserProfileDisplay :volunteer="authStore.user" :show-email="false" :disable-tooltip="true" /></div>
            </div>
        </div>
        <nav class="gs-navbar__links" aria-label="Public pages">
            <router-link to="/gardens">Gardens</router-link>
            <router-link to="/projects">Projects</router-link>
            <router-link to="/events">Events</router-link>
            <span class="gs-navbar__unavailable" aria-disabled="true">Newsletter</span>
            <div ref="aboutMenu" class="gs-navbar__about" @mouseenter="showAboutDropdown = true" @mouseleave="showAboutDropdown = false">
                <router-link to="/about" @click="showAboutDropdown = false">About</router-link>
                <button ref="aboutButton" type="button" aria-label="More about pages" aria-controls="about-pages" :aria-expanded="showAboutDropdown" @click="showAboutDropdown = !showAboutDropdown">⌄</button>
                <div v-show="showAboutDropdown" id="about-pages" class="gs-navbar__about-menu">
                    <router-link v-if="authStore.user" to="/manage" @click="showAboutDropdown = false">Overview</router-link>
                    <router-link to="/blog" @click="showAboutDropdown = false">Blog</router-link>
                    <router-link to="/manifesto" @click="showAboutDropdown = false">Manifesto</router-link>
                    <router-link to="/help" @click="showAboutDropdown = false">Help</router-link>
                    <div v-if="!authStore.user" class="gs-navbar__theme" role="group" aria-label="Color theme">
                        <span>Theme</span>
                        <button type="button" :aria-pressed="theme === 'light'" aria-label="Light mode" @click="setTheme('light')"><span v-html="SunIcon"></span></button>
                        <button type="button" :aria-pressed="theme === 'dark'" aria-label="Dark mode" @click="setTheme('dark')"><span v-html="MoonIcon"></span></button>
                        <button type="button" :aria-pressed="theme === 'system'" aria-label="Match system" @click="setTheme('system')"><span v-html="SystemIcon"></span></button>
                    </div>
                </div>
            </div>
        </nav>
    </header>
</template>

<style scoped>
.gs-navbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 24px; min-height: 88px; padding: 22px 30px; background: #F1F2D5; border-bottom: 1px solid #bac5a6; color: #024023; font: 16px/1.4 var(--gs-body-font); }
.gs-navbar__top { display: contents; }
.gs-navbar__logo { order: 1; flex: 0 0 auto; display: block; }
.gs-navbar__logo img { display: block; width: 204px; height: auto; }
.gs-navbar__links { order: 2; flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 24px; }
.gs-navbar__links > a, .gs-navbar__about > a { color: #024023; text-decoration: none; white-space: nowrap; }
.gs-navbar__links a:hover, .gs-navbar__links a.router-link-active { text-decoration: underline; text-underline-offset: 6px; }
.gs-navbar__unavailable { opacity: .65; white-space: nowrap; cursor: default; }
.gs-navbar__actions { order: 3; display: flex; align-items: center; gap: 14px; flex: 0 0 auto; }
.gs-navbar__cta { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 9px 15px; border: 1px solid #024023; border-radius: 2px; background: #024023; color: #F1F2D5; font: 16px/1.4 var(--gs-body-font); white-space: nowrap; text-decoration: none; cursor: pointer; }
.gs-navbar__cta:hover { background: #0d5a35; color: #F1F2D5; text-decoration: none; }
.gs-navbar__about { display: flex; align-items: center; position: relative; white-space: nowrap; }
.gs-navbar__about > button { padding: 0 2px; border: 0; background: transparent; color: #024023; font: 16px var(--gs-body-font); cursor: pointer; }
.gs-navbar__about-menu { position: absolute; top: 100%; right: 0; z-index: 110; min-width: 190px; padding: 8px; border: 1px solid #bdc7ad; background: #F1F2D5; box-shadow: 0 8px 20px #02402322; }
.gs-navbar__about-menu > a { display: block; padding: 8px 10px; color: #024023; text-decoration: none; }
.gs-navbar__about-menu > a:hover { background: #e4e8cc; }
.gs-navbar__theme { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 8px 4px; border-top: 1px solid #bdc7ad; }
.gs-navbar__theme > span { width: 100%; font-size: 13px; }
.gs-navbar__theme button { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border: 1px solid #bdc7ad; background: transparent; color: #024023; cursor: pointer; }
.gs-navbar__theme button[aria-pressed=true] { background: #e4e8cc; border-color: #024023; }
.gs-navbar__theme button :deep(svg) { width: 19px; height: 19px; }
.profile-menu-button { padding: 0; border: 0; background: transparent; cursor: pointer; }
.profile-menu-button :deep(.h-10) { width: 2rem !important; height: 2rem !important; }
.profile-menu { position: fixed; z-index: 99999; top: 76px; right: 18px; min-width: 190px; padding: 8px; border: 1px solid #bdc7ad; background: #F1F2D5; color: #024023; box-shadow: 0 8px 24px #02402322; }
.user-name { padding: 10px; border-bottom: 1px solid #bdc7ad; overflow-wrap: anywhere; }
.profile-theme-options { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; border-bottom: 1px solid #bdc7ad; }
.profile-theme-label { width: 100%; font-size: 13px; }
.profile-theme-option { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border: 1px solid #bdc7ad; background: transparent; color: #024023; cursor: pointer; }
.profile-theme-option.active { background: #e4e8cc; border-color: #024023; }
.profile-theme-option .theme-icon { display: inline-flex; width: 20px; height: 20px; }
.profile-theme-option .theme-icon :deep(svg) { width: 20px; height: 20px; }
.profile-logout-btn { display: block; width: 100%; padding: 10px; border: 0; background: transparent; color: #024023; text-align: left; cursor: pointer; }
.profile-logout-btn:hover { background: #e4e8cc; }
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 1024px) {
    .gs-navbar { display: block; min-height: 0; padding: 20px; }
    .gs-navbar__top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .gs-navbar__logo img { width: clamp(145px, 45vw, 175px); }
    .gs-navbar__links { justify-content: space-between; gap: clamp(8px, 3vw, 18px); margin-top: 19px; overflow-x: auto; scrollbar-width: none; font-size: clamp(12px, 3.85vw, 16px); }
    .gs-navbar__links::-webkit-scrollbar { display: none; }
    .gs-navbar__about > button { font-size: 14px; }
    .gs-navbar__cta { min-height: 36px; padding: 8px 11px; font-size: 13px; }
    .gs-navbar__cta--signed-in { display: none; }
    .gs-navbar__about-menu { position: fixed; top: 132px; right: 20px; }
}
</style>
