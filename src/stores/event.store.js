import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useGardensStore, useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/volunteer-days`;

export const useEventStore = defineStore({
    id: 'event',
    state: () => ({
        volunteerDays: {},
        volunteerDay: {},
        event: {},
        events: {},
        currentGardenSlug: null, // Track which garden slug's data is currently loaded
        loadingGardenSlug: null, // Track which slug is currently being loaded
        loadingPromise: null // Track the in-flight promise for the current request
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();  
            alertStore.error(err);
            console.log("Volunteer Error: ", err)
            throw err;
        },
        async getUserEvents() {
            return fetchWrapper.get(`${baseUrl}/user`)
                .then(res => this.volunteerDays.days = res)
                .catch(this.handleError);
        },
        async fetchPublic() {
            this.events = { loading: true };
            fetchWrapper.get(`${baseUrl}/public`)
                .then(res => this.events = res)
                .catch(this.handleError);
    },
        async findById(id) {
            this.event = { loading: true };
            return fetchWrapper.get(`${baseUrl}/${id}?populate=garden&populate=confirmed&populate=hero_image&populate=featured_gallery`)
                .then(res => this.event = res.data)
                .catch(this.handleError);
        },
        async getByGarden(slug) {
            // If data is already loaded for this slug and not loading, return cached data
            if (this.currentGardenSlug === slug && this.volunteerDays.days && !this.volunteerDays.loading) {
                return Promise.resolve(this.volunteerDays.days);
            }
            
            // If a request is already in progress for this same slug, return the existing promise
            if (this.loadingGardenSlug === slug && this.loadingPromise && this.volunteerDays.loading) {
                return this.loadingPromise;
            }
            
            // Create new request
            this.loadingGardenSlug = slug;
            this.volunteerDays = { loading: true };
            this.loadingPromise = fetchWrapper.get(`${baseUrl}/garden/${slug}`)
                .then(res => {
                    this.currentGardenSlug = slug;
                    this.loadingGardenSlug = null;
                    this.loadingPromise = null;
                    this.volunteerDays = { days: res, loading: false };
                    return res;
                })
                .catch(error => {
                    this.loadingGardenSlug = null;
                    this.loadingPromise = null;
                    this.volunteerDays = { error };
                    throw error;
                });
            
            return this.loadingPromise;
        },
        async update(id, data) {
            // Format hero_image if it's in Strapi response format
            if (data.hero_image?.data?.id) {
                data.hero_image = {
                    id: data.hero_image.data.id
                };
            }
            
            // Ensure featured_gallery is properly formatted
            if (data.featured_gallery && Array.isArray(data.featured_gallery)) {
                data.featured_gallery = data.featured_gallery
                    .filter(img => img && img.id)
                    .map(img => ({
                        id: typeof img === 'object' ? img.id : img
                    }));
            }

            return fetchWrapper.put(`${baseUrl}/${id}?populate=*`, { data: data })
                .then(res => {
                    this.volunteerDay = res.data.attributes;
                    // Update the event in state if it matches
                    if (this.event.id === id) {
                        this.event = res.data;
                    }
                })
                .catch(this.handleError);
        },
        async rsvpEvent(data) {
            return fetchWrapper.post(`${baseUrl}/rsvp/${data.id}`,{data: data})
                .then(res => {
                    this.event = res.data;
                })
                .catch(this.handleError);
        },
        async closeUpdate() {
            // const idx = this.volunteerDays.days.findIndex(v=> v.id == id);
            // this.volunteerDays.days[idx].title = this.volunteerDay.title;

        },
        async register(data) {
            // TODO get id back from the register 
            return fetchWrapper.post(`${baseUrl}?populate=*`,{data:data})
                .then(res => {
                    let vday = res.data;
                    this.volunteerDays.days.unshift(vday.attributes);
                    this.volunteerDay = vday.attributes;
                    this.volunteerDay.id = vday.id;
                })
                .catch(this.handleError);
            
        },
        async testSms(id) {
            return fetchWrapper.get(`${baseUrl}/sms/${id}`)
                .then(res => {
                    console.log("test resp: ", res)
                    return res;
                })
                .catch(this.handleError);
        },
        async sendSms(id) {
            return fetchWrapper.post(`${baseUrl}/sms/${id}`)
                .then(res => {
                    console.log("send resp: ", res)
                    return res;
                })
                .catch(this.handleError);
        },
        async uploadImage(formData, eventId) {
            return fetchWrapper.post(`${import.meta.env.VITE_API_URL}/api/upload`, formData)
                .then(async res => {
                    const uploadedFile = Array.isArray(res) ? res[0] : res;
                    
                    // If volunteerDayId is provided, update the record with the new image
                    if (eventId) {
                        await this.update(eventId, {
                            hero_image: {
                                id: uploadedFile.id
                            }
                        });
                    }

                    return {
                        url: uploadedFile.url,
                        id: uploadedFile.id
                    };
                })
                .catch(this.handleError);
        }
    },
    getters: {
        gardenGetter(state) {
            // console.log("garden getter")
            const gardenStore = useGardensStore();
            return state.localData + gardenStore.data
        }
    }
});
