import { defineStore } from 'pinia';

import { fetchWrapper, router } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}`;
import { localStorageTokenKey } from '../constants';

export const useAuthStore = defineStore({
    id: 'auth',
    state: () => ({
        // initialize state from local storage to enable user to stay logged in
        user: JSON.parse(localStorage.getItem('user')),
        auth: {
            accessToken: localStorage.getItem(localStorageTokenKey),
        },
        returnUrl: null,
        loginModalOpen: false
    }),
    getters: {
        isLoggedIn: (state) => !!state.user,
        isAdmin: (state) => state.user?.role?.type === 'administrator',
    },
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
            
            router.push(this.returnUrl || '/manage');
        },
        setSession(jwt, user) {
            this.user = user;
            this.auth.status = 'logged_in';
            this.auth.accessToken = jwt;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem(localStorageTokenKey, jwt);
        },
        async login(username, password, { redirect = true } = {}) {
            const { jwt, user } = await fetchWrapper.post(`${baseUrl}/api/auth/local?populate=role`, { identifier: username, password });
            this.setSession(jwt, user);
            if (redirect) {
                router.push(this.returnUrl || '/manage');
            }
            return user;
        },
        async forgot(email) {
            console.log("reset pw: ", email)
            const resp = await fetchWrapper.post(`${baseUrl}/api/auth/forgot-password`, { email });
            return resp
        },
        async setPassword(password, passwordConfirmation, code) {
            const {jwt, user} = await fetchWrapper.post(`${baseUrl}/api/auth/reset-password`, { password, passwordConfirmation, code });

            // update pinia state
            // this.user = user;
            // this.auth.status = 'logged_in';
            // this.auth.accessToken = jwt;
            // console.log("set pass", jwt)
            // // store user details and jwt in local storage to keep user logged in between page refreshes
            // localStorage.setItem('user', JSON.stringify(user));
            // localStorage.setItem(localStorageTokenKey, jwt);
            if (jwt && user ) {
                setTimeout(() => { router.push('/') }, 4000);
                return true;
            } else {
                return false;
            }


        },
        logout() {
            this.user = null;
            this.auth.accessToken = null
            this.auth.status = 'logged_out',
            localStorage.removeItem('user');
            router.push('/login');
        },
        async requestSmsCode(phone) {
            const phoneNumber = String(phone ?? '').replace(/\D/g, '');
            return fetchWrapper.post(`${baseUrl}/api/auth/sms-login/request`, { phoneNumber });
        },
        async verifySmsCode(phone, code) {
            const phoneNumber = String(phone ?? '').replace(/\D/g, '');
            const { jwt, user } = await fetchWrapper.post(`${baseUrl}/api/auth/sms-login/verify`, { phoneNumber, code: String(code ?? '').trim() });
            this.setSession(jwt, user);
            return user;
        },
        openLoginModal(returnUrl) {
            this.returnUrl = returnUrl || null;
            this.loginModalOpen = true;
        },
        closeLoginModal() {
            this.loginModalOpen = false;
            this.returnUrl = null;
        },
        finishModalLogin() {
            const target = this.returnUrl;
            this.loginModalOpen = false;
            this.returnUrl = null;
            if (target) {
                router.push(target);
            }
        }
    }
});
