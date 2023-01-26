import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/Vehicle`;

export const useVehiclesStore = defineStore({
    id: 'vehicles',
    state: () => ({
        vehicles: {}
    }),
    actions: {
        async getAll() {
            this.vehicles = { loading: true };
            fetchWrapper.get(`${baseUrl}/myGarage`)
                .then(res => this.vehicles = res.vehicles)
                .catch(error => this.vehicles = { error })
        }
    }
});
