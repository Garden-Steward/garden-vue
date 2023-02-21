import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useGardensStore, useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/volunteer-days`;

export const useVolunteerDaysStore = defineStore({
    id: 'volunteerDays',
    state: () => ({
        volunteerDays: {},
        volunteerDay: {}
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();  
            alertStore.error(err);
            console.log("Volunteer Error: ", err)
        },
        async getByGarden() {
            const gardenStore = useGardensStore();
            console.log("gardenStore",gardenStore.garden)
            this.volunteerDays = { loading: true };
            fetchWrapper.get(`${baseUrl}`)
            // fetchWrapper.get(`${baseUrl}/${slug}/full`)
                .then(res => this.volunteerDays = res.data)
                .catch(error => this.volunteerDays = { error })
        },
        async update(id, data) {
            return fetchWrapper.put(`${baseUrl}/${id}`,{data: data})
                .then(res => {
                    this.volunteerDay = res.data;
                    const idx = this.volunteerDays.findIndex(v=> v.id == res.data.id);
                    this.volunteerDays[idx] = res.data;
                })
                .catch(this.handleError);
            
        },
        async register(data) {
            return fetchWrapper.post(`${baseUrl}`,{data:data})
                .then(res => {
                    this.volunteerDays.push(res.data);
                    this.volunteerDay = res.data;
                })
                .catch(this.handleError);
            
        }
    },
    getters: {
        gardenGetter(state) {
            console.log("garden getter")
            const gardenStore = useGardensStore();
            return state.localData + gardenStore.data
        }
    }
});
