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
                const response = await fetchWrapper.get(`${baseUrl}?populate=plant&populate=plant_image&populate=user`);
                this.locationTrackings = response.data.map(item => ({
                    id: item.id,
                    ...item.attributes,
                    thumbnail: item.attributes.plant_image?.data?.attributes?.formats?.thumbnail?.url,
                    small_image: item.attributes.plant_image?.data?.attributes?.formats?.small?.url,
                    user: item.attributes.user?.data?.attributes?.username
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
        },
        async fetchByGarden(gardenLat, gardenLng, radiusKm = 0.5) {
            // Fetch all location trackings and filter by proximity to garden coords
            // In the future, this could be a backend filter
            this.locationTrackings = { loading: true };
            try {
                const response = await fetchWrapper.get(`${baseUrl}?populate=plant&populate=plant.Benefits&populate=plant_image&populate=location_image&populate=user&pagination[pageSize]=100`);
                const allTrackings = response.data.map(item => ({
                    id: item.id,
                    ...item.attributes,
                    plant: item.attributes.plant?.data ? {
                        id: item.attributes.plant.data.id,
                        ...item.attributes.plant.data.attributes
                    } : null,
                    thumbnail: item.attributes.plant_image?.data?.attributes?.formats?.thumbnail?.url,
                    small_image: item.attributes.plant_image?.data?.attributes?.formats?.small?.url || item.attributes.plant_image?.data?.attributes?.url,
                    location_thumbnail: item.attributes.location_image?.data?.attributes?.formats?.thumbnail?.url,
                    user: item.attributes.user?.data?.attributes?.username
                }));
                
                // Filter by proximity if garden has coords
                if (gardenLat && gardenLng) {
                    const filtered = allTrackings.filter(tracking => {
                        if (!tracking.latitude || !tracking.longitude) return false;
                        const distance = this.haversineDistance(
                            gardenLat, gardenLng,
                            tracking.latitude, tracking.longitude
                        );
                        return distance <= radiusKm;
                    });
                    this.locationTrackings = filtered;
                } else {
                    // No garden coords, return all
                    this.locationTrackings = allTrackings;
                }
            } catch (error) {
                this.locationTrackings = { error };
            }
        },
        // Haversine formula to calculate distance between two lat/lng points in km
        haversineDistance(lat1, lng1, lat2, lng2) {
            const R = 6371; // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }
    }
});