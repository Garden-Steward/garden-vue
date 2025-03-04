import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/location-trackings`;

export const useLocationTrackingStore = defineStore({
    id: 'locationTracking',
    state: () => ({
        locationTrackings: [],
        locationTracking: {}
    }),
    actions: {
        async fetchAll() {
            this.locationTrackings = { loading: true };
            try {
                const response = await fetchWrapper.get(`${baseUrl}?populate=plant&populate=plant_image`);
                this.locationTrackings = response.data.map(item => ({
                    id: item.id,
                    ...item.attributes,
                    small_image: item.attributes.plant_image?.data?.attributes?.formats?.small?.url
                }));
            } catch (error) {
                this.locationTrackings = { error };
            }
        },
        async fetchById(id) {
            this.locationTracking = { loading: true };
            try {
                const response = await fetchWrapper.get(`${baseUrl}/${id}?populate=plant&populate=plant_image`);
                // Process the response to extract the single item
                this.locationTracking = {
                    id: response.data.id,
                    ...response.data.attributes
                };
            } catch (error) {
                this.locationTracking = { error };
            }
        }
    }
});