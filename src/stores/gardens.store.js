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
        async getAll() {
            this.gardens = { loading: true };
            fetchWrapper.get(`${baseUrl}`)
                .then(res => this.gardens = res.data)
                .catch(error => this.gardens = { error })
        },
        async getSlug(slug) {
            this.garden = { loading: true };
            fetchWrapper.get(`${baseUrl}?filters[slug][$eq]=${slug}`)
                .then(res => this.garden = res.data[0])
                .catch(error => this.garden = { error })
        }
    }
});
