import { defineStore } from 'pinia';

import { fetchWrapper, router } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api`;
import { localStorageTokenKey } from '../constants';

export const useAuthStore = defineStore({
    id: 'auth',
    state: () => ({
        // initialize state from local storage to enable user to stay logged in
        user: JSON.parse(localStorage.getItem('user')),
        auth: {
            status: 'logged_out',
            accessToken: localStorage.getItem(localStorageTokenKey),
        },
        returnUrl: null
    }),
    actions: {
        async initGoogle() {
            const { url } = await fetchWrapper.get(`${baseUrl}/OAuth/googleLogin`);
            console.log(url);
            window.location.href = url;
        },
        async loginGoogle( code ) {
            
            const { user, accessToken } = await fetchWrapper.post(`${baseUrl}/OAuth/google`, { code }).
            then(res => res);
      
            this.user = user;
            this.auth.status = 'logged_in';
            this.auth.accessToken = accessToken._id;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem(localStorageTokenKey, this.auth.accessToken);
            
            router.push(this.returnUrl || '/');
        },
        async login(username, password) {
            const user = await fetchWrapper.post(`${baseUrl}/authenticate`, { username, password });

            // update pinia state
            this.user = user;

            // store user details and jwt in local storage to keep user logged in between page refreshes
            localStorage.setItem('user', JSON.stringify(user));

            // redirect to previous url or default to home page
            router.push(this.returnUrl || '/');
        },
        logout() {
            this.user = null;
            localStorage.removeItem('user');
            router.push('/login');
        }
    }
});
