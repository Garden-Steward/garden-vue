import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useGardensStore } from './gardens.store'


const baseUrl = `${import.meta.env.VITE_API_URL}/api/volunteer-days`;

export const useVolunteerDaysStore = defineStore({
    id: 'volunteerDays',
    state: () => ({
        volunteerDays: {}
    }),
    actions: {
        async getByGarden() {
            const gardenStore = useGardensStore();
            console.log("gardenStore",gardenStore.garden)
            this.volunteerDays = { loading: true };
            fetchWrapper.get(`${baseUrl}`)
            // fetchWrapper.get(`${baseUrl}/${slug}/full`)
                .then(res => this.volunteerDays = res.data)
                .catch(error => this.volunteerDays = { error })
        }
    },
    getters: {
        gardenGetter(state) {
            const gardenStore = useGardensStore();
            return state.localData + gardenStore.data
        }
    }
});
