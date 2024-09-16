import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores';
import { HomeView, 
    LoginView, Garden, GardensView, SetPassword, 
    InstructionPublic, GardenApplyForm, HelpView, 
    BlogList, BlogDetail, EventView, EventsList } from '@/views';
import { EventEditor } from '@/views/admin';
import GoogleOAuth from './oauth-google-callback/oauth-google-callback.vue'

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    linkActiveClass: 'active',
    routes: [
        { path: '/', component: HomeView },
        { path: '/login', component: LoginView },
        {
            path: '/oauth/google/callback',
            component: GoogleOAuth
        },
        {
            path: '/gardens',
            component: GardensView
        },
        {
            path: '/apply',
            component: GardenApplyForm
        },
        {
            path: '/help',
            component: HelpView
        },
        {
            path: '/set-password',
            component: SetPassword
        },
        {
            path: '/gardens/:slug',
            component: Garden
        },
        {
            path: '/i/:slug',
            component: InstructionPublic
        },
        {
            path: '/d/:id',
            component: EventView
        },
        {
            path: '/events',
            component: EventsList
        },
        {
            path: '/event/edit/:id',
            component: EventEditor
        },
        {
            path: '/blog',
            component: BlogList
        },
        {
            path: '/blog/:slug',
            component: BlogDetail
        }
    ]
});

router.beforeEach(async (to) => {
    // redirect to login page if not logged in and trying to access a restricted page
    const publicPages = ['/login', '/oauth/google/callback', '/set-password', '/apply', '/help', '/blog', '/events'];
    let authRequired = !publicPages.includes(to.path);
    let regexTest = new RegExp('/i/|/blog/|/d/', 'g');
    if (regexTest.test(to.path)) {
        authRequired = false;
    }
    const auth = useAuthStore();
    console.log("before: ", auth, authRequired);
    if (authRequired && !auth.user) {
        auth.returnUrl = to.fullPath;
        return '/login';
    }
});
