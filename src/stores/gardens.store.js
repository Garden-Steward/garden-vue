import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/gardens`;

export const useGardensStore = defineStore({
    id: 'gardens',
    state: () => ({
        gardens: {},
        garden: {}
    }),
    actions: {
        async getAll(userId) {
            this.gardens = { loading: true };
            // console.log('store: ', gardens);
            fetchWrapper.get(`${baseUrl}?filters[volunteers]=${userId}&populate=managers`)
                .then(res => this.gardens = res.data)
                .catch(error => this.gardens = { error })
        },
        async getSlug(slug) {
            this.garden = { loading: true };
            // fetchWrapper.get(`${baseUrl}?filters[slug][$eq]=${slug}`)
            fetchWrapper.get(`${baseUrl}/${slug}/full`)
                .then(res => this.garden = res.data)
                .catch(error => this.garden = { error })
        }
    }
});
