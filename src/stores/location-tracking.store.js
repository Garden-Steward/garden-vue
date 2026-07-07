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
                const response = await fetchWrapper.get(`${baseUrl}?populate=plant&populate=plant.clipart&populate=plant_image&populate=user`);
                // v5 entries are flat (relations/media already de-nested).
                this.locationTrackings = response.data.map(item => ({
                    ...item,
                    thumbnail: item.plant_image?.formats?.thumbnail?.url,
                    small_image: item.plant_image?.formats?.small?.url,
                    user: item.user?.username
                }));
            } catch (error) {
                this.locationTrackings = { error };
            }
        },
        async fetchById(id) {
            this.locationTracking = { loading: true };
            try {
                const response = await fetchWrapper.get(`${baseUrl}/${id}?populate=plant&populate=plant_image`);
                // v5 entries are flat.
                this.locationTracking = { ...response.data };
            } catch (error) {
                this.locationTracking = { error };
            }
        },
        async fetchByGarden(gardenLat, gardenLng, radiusKm = 0.5) {
            // Fetch all location trackings and filter by proximity to garden coords
            // In the future, this could be a backend filter
            this.locationTrackings = { loading: true };
            try {
                const response = await fetchWrapper.get(`${baseUrl}?populate=plant&populate=plant.Benefits&populate=plant.clipart&populate=plant_image&populate=location_image&populate=user&pagination[pageSize]=100`);
                // v5 entries are flat; plant/plant_image/location_image/user are de-nested.
                const allTrackings = response.data.map(item => ({
                    ...item,
                    plant: item.plant ?? null,
                    thumbnail: item.plant_image?.formats?.thumbnail?.url,
                    small_image: item.plant_image?.formats?.small?.url || item.plant_image?.url,
                    location_thumbnail: item.location_image?.formats?.thumbnail?.url,
                    user: item.user?.username
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