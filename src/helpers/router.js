import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores';
import { PublicHomeView, HomeView, LoginView, GardenManage, GardenPublic, GardensView, GardensPublicView, SetPassword,
    InstructionPublic, GardenApplyForm, HelpView,
    BlogList, BlogDetail, EventView, EventsList, MapView, ContributeView, PrivacyView, ProjectPublic, EventTemplatesView, GardenTasksPublic, TaskDetailPublic, ManifestoView } from '@/views';
import { EventEditor, TaskMessages } from '@/views/admin';
import GoogleOAuth from './oauth-google-callback/oauth-google-callback.vue'

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    linkActiveClass: 'active',
    routes: [
        // Public routes
        { path: '/', component: PublicHomeView },
        { path: '/login', component: LoginView },
        {
            path: '/oauth/google/callback',
            component: GoogleOAuth
        },
        {
            path: '/join',
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
            path: '/events',
            component: EventsList
        },
        {
            path: '/blog',
            component: BlogList
        },
        {
            path: '/blog/:slug',
            component: BlogDetail
        },
        {
            path: '/map',
            component: MapView
        },
        {
            path: '/contribute',
            component: ContributeView
        },
        {
            path: '/manifesto',
            component: ManifestoView,
            name: 'manifesto'
        },
        {
            path: '/privacy',
            component: PrivacyView
        },
        {
            path: '/gardens',
            component: GardensPublicView,
            name: 'gardens-public-list'
        },
        
        // Public garden and event pages
        // More specific route must come first
        {
            path: '/gardens/:gardenSlug/p/:projectSlug',
            component: ProjectPublic,
            name: 'project-public'
        },
        {
            path: '/gardens/:slug/tasks/:taskId',
            component: TaskDetailPublic,
            name: 'task-detail-public'
        },
        {
            path: '/gardens/:slug/tasks',
            component: GardenTasksPublic,
            name: 'garden-tasks-public'
        },
        {
            path: '/gardens/:slug',
            component: GardenPublic,
            name: 'garden-public'
        },
        {
            path: '/d/:id',
            component: EventView,
            name: 'event-public'
        },
        {
            path: '/i/:slug',
            component: InstructionPublic,
            name: 'instruction-public'
        },
        
        // Legacy route redirects
        {
            path: '/home',
            redirect: '/manage/home'
        },
        
        // Management routes (authenticated)
        {
            path: '/manage',
            redirect: '/manage/gardens',
            meta: { requiresAuth: true }
        },
        {
            path: '/manage/home',
            component: HomeView,
            name: 'manage-home',
            meta: { requiresAuth: true }
        },
        {
            path: '/manage/gardens',
            component: GardensView,
            name: 'manage-gardens-list',
            meta: { requiresAuth: true }
        },
        {
            path: '/manage/gardens/:slug/event-templates',
            component: EventTemplatesView,
            name: 'manage-garden-event-templates',
            meta: { requiresAuth: true }
        },
        {
            path: '/manage/gardens/:slug',
            component: GardenManage,
            name: 'manage-garden-detail',
            meta: { requiresAuth: true }
        },
        {
            path: '/manage/events/:id/edit',
            component: EventEditor,
            name: 'manage-event-edit',
            meta: { requiresAuth: true }
        },
        {
            path: '/manage/gardens/:id/messages',
            component: TaskMessages,
            name: 'manage-garden-messages',
            meta: { requiresAuth: true }
        }
    ]
});

router.beforeEach(async (to) => {
    const publicPages = [
        '/login', 
        '/oauth/google/callback', 
        '/set-password', 
        '/', 
        '/help', 
        '/blog', 
        '/events', 
        '/join', 
        '/contribute',
        '/manifesto',
        '/map',
        '/privacy',
        '/gardens'
    ];
    
    // Check if route starts with public patterns
    const isPublicRoute = publicPages.includes(to.path) || 
                         to.path.startsWith('/i/') ||
                         to.path.startsWith('/blog/') ||
                         to.path.startsWith('/d/') ||
                         to.path.startsWith('/gardens/'); // Public garden pages (includes nested project pages)
    
    const authRequired = to.meta.requiresAuth || to.path.startsWith('/manage/');
    const auth = useAuthStore();
    
    if (authRequired && !auth.user) {
        auth.returnUrl = to.fullPath;
        return '/login';
    }
});
