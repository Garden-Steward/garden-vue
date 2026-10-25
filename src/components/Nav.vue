<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores';
import UserProfileDisplay from '@/components/UserProfileDisplay.vue';

const authStore = useAuthStore();
const showProfileOptions = ref(false);
const profileButton = ref(null);

const userName = computed(() => {
    const user = authStore.user;
    if (user?.username) return user.username;
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    return 'User';
});

const openPhoneLogin = () => {
    showProfileOptions.value = false;
    authStore.openLoginModal();
};

const closeProfile = () => {
    showProfileOptions.value = false;
};

const closePopovers = (event) => {
    if (!event.target.closest('.profile-menu, .profile-menu-button')) closeProfile();
};

const onEscape = (event) => {
    if (event.key !== 'Escape' || !showProfileOptions.value) return;
    closeProfile();
    profileButton.value?.focus();
};

onMounted(() => {
    document.documentElement.classList.remove('dark');
    document.addEventListener('click', closePopovers);
    window.addEventListener('keydown', onEscape);
});

onUnmounted(() => {
    document.removeEventListener('click', closePopovers);
    window.removeEventListener('keydown', onEscape);
});
</script>

<template>
    <header class="gs-navbar">
        <div class="gs-navbar__top">
            <router-link to="/" class="gs-navbar__logo"><img src="/brand/garden-steward-stacked-whole.svg" alt="Garden Steward"></router-link>
            <div class="gs-navbar__actions">
                <button v-if="!authStore.user" type="button" class="gs-navbar__cta" @click="openPhoneLogin">Get involved ↗</button>
                <router-link v-else to="/gardens" class="gs-navbar__cta gs-navbar__cta--signed-in">Get involved ↗</router-link>
                <div v-if="authStore.user" ref="profileButton" class="profile-menu-button" role="button" tabindex="0" aria-label="Account options" aria-controls="account-options" :aria-expanded="showProfileOptions" @click="showProfileOptions = !showProfileOptions" @keydown.enter.prevent="showProfileOptions = !showProfileOptions" @keydown.space.prevent="showProfileOptions = !showProfileOptions"><UserProfileDisplay :volunteer="authStore.user" :show-email="false" :disable-tooltip="true" /></div>
                <transition name="fade">
                    <div v-if="authStore.user && showProfileOptions" id="account-options" class="profile-menu" role="group" aria-label="Account options">
                        <div class="user-name">{{ userName }}</div>
                        <nav class="profile-links" aria-label="Your tools">
                            <router-link to="/manage" @click="closeProfile">Overview</router-link>
                            <router-link to="/manage/projects" @click="closeProfile">Projects</router-link>
                            <router-link to="/manage/plants" @click="closeProfile">Plants</router-link>
                            <router-link to="/manage/usage" @click="closeProfile">Usage</router-link>
                        </nav>
                        <button type="button" class="profile-logout-btn" @click="authStore.logout(); closeProfile()">Logout</button>
                    </div>
                </transition>
            </div>
        </div>
        <nav class="gs-navbar__links" aria-label="Public pages">
            <router-link to="/gardens">Find your garden</router-link>
            <router-link to="/schedule">Schedule</router-link>
            <router-link to="/newsletter">Newsletter</router-link>
            <router-link to="/about">About</router-link>
        </nav>
    </header>
</template>

<style scoped>
.gs-navbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 24px; min-height: 88px; padding: 14px 30px; background: #F1F2D5; border-bottom: 1px solid #bac5a6; color: #024023; font: 16px/1.4 var(--gs-body-font); }
.gs-navbar__top { display: contents; }
.gs-navbar__logo { order: 1; flex: 0 0 auto; display: block; }
.gs-navbar__logo img { display: block; width: 150px; height: auto; }
.gs-navbar__links { order: 2; flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 24px; }
.gs-navbar__links > a { color: #024023; text-decoration: none; white-space: nowrap; }
.gs-navbar__links a:hover, .gs-navbar__links a.active { text-decoration: underline; text-underline-offset: 6px; }
.gs-navbar__actions { order: 3; display: flex; align-items: center; gap: 14px; flex: 0 0 auto; }
.gs-navbar__cta { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 9px 15px; border: 1px solid #024023; border-radius: 2px; background: #024023; color: #F1F2D5; font: 16px/1.4 var(--gs-body-font); white-space: nowrap; text-decoration: none; cursor: pointer; }
.gs-navbar__cta:hover { background: #0d5a35; color: #F1F2D5; text-decoration: none; }
.profile-menu-button { padding: 0; border: 0; background: transparent; cursor: pointer; }
.profile-menu-button :deep(.h-10) { width: 2rem !important; height: 2rem !important; }
.profile-menu { position: fixed; z-index: 99999; top: 76px; right: 18px; min-width: 190px; max-width: calc(100vw - 36px); padding: 8px; border: 1px solid #bdc7ad; background: #F1F2D5; color: #024023; box-shadow: 0 8px 24px #02402322; }
.user-name { padding: 10px; border-bottom: 1px solid #bdc7ad; overflow-wrap: anywhere; }
.profile-links { display: flex; flex-direction: column; padding: 5px 0; }
.profile-links a, .profile-logout-btn { display: block; width: 100%; padding: 10px; border: 0; background: transparent; color: #024023; font: inherit; text-align: left; text-decoration: none; cursor: pointer; }
.profile-links a:hover, .profile-links a:focus-visible, .profile-logout-btn:hover { background: #e4e8cc; }
.profile-logout-btn { border-top: 1px solid #bdc7ad; }
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 1024px) {
    .gs-navbar { display: block; min-height: 0; padding: 20px; }
    .gs-navbar__top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .gs-navbar__logo img { width: 125px; }
    .gs-navbar__links { justify-content: space-between; gap: clamp(8px, 3vw, 18px); margin-top: 19px; font-size: clamp(12px, 3.85vw, 16px); }
    .gs-navbar__cta { min-height: 36px; padding: 8px 11px; font-size: 13px; }
    .gs-navbar__cta--signed-in { display: none; }
}
</style>
