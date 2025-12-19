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
        eventsPagination: {
            page: 1,
            pageSize: 15,
            pageCount: 0,
            total: 0
        },
        volunteerDaysPagination: {
            page: 1,
            pageSize: 15,
            pageCount: 0,
            total: 0
        },
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
        async fetchPublic(page = 1, pageSize = 15) {
            this.events = { loading: true };
            const url = `${baseUrl}/public?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate[0]=hero_image&populate[1]=garden&populate[garden][populate][0]=hero_image`;
            return fetchWrapper.get(url)
                .then(res => {
                    // Handle Strapi pagination response format
                    if (res.data && res.meta?.pagination) {
                        this.events = res.data;
                        this.eventsPagination = res.meta.pagination;
                    } else if (Array.isArray(res)) {
                        // Fallback for non-paginated response
                        this.events = res;
                        this.eventsPagination = {
                            page: 1,
                            pageSize: res.length,
                            pageCount: 1,
                            total: res.length
                        };
                    } else {
                        this.events = res;
                    }
                    return res;
                })
                .catch(this.handleError);
        },
        async loadMoreEvents() {
            const nextPage = this.eventsPagination.page + 1;
            if (nextPage > this.eventsPagination.pageCount) {
                return Promise.resolve([]);
            }
            
            const url = `${baseUrl}/public?pagination[page]=${nextPage}&pagination[pageSize]=${this.eventsPagination.pageSize}&populate[0]=hero_image&populate[1]=garden&populate[garden][populate][0]=hero_image`;
            return fetchWrapper.get(url)
                .then(res => {
                    let newEvents = [];
                    if (res.data && Array.isArray(res.data)) {
                        newEvents = res.data;
                    } else if (Array.isArray(res)) {
                        newEvents = res;
                    }
                    
                    // Append new events to existing ones
                    if (Array.isArray(this.events)) {
                        this.events = [...this.events, ...newEvents];
                    } else {
                        this.events = newEvents;
                    }
                    
                    // Update pagination metadata
                    if (res.meta?.pagination) {
                        this.eventsPagination = res.meta.pagination;
                    }
                    
                    return newEvents;
                })
                .catch(this.handleError);
        },
        async findById(id) {
            this.event = { loading: true };
            return fetchWrapper.get(`${baseUrl}/${id}?populate=garden&populate=confirmed&populate=hero_image&populate=featured_gallery`)
                .then(res => this.event = res.data)
                .catch(this.handleError);
        },
        async getByGarden(slug, page = 1, pageSize = 15, append = false) {
            // If appending and we already have data, don't use cache
            if (append && this.currentGardenSlug === slug && this.volunteerDays.days) {
                // Continue to load more
            } else if (this.currentGardenSlug === slug && this.volunteerDays.days && !this.volunteerDays.loading && page === 1) {
                // If data is already loaded for this slug and not loading, return cached data (only for page 1)
                return Promise.resolve(this.volunteerDays.days);
            }
            
            // If a request is already in progress for this same slug, return the existing promise
            if (this.loadingGardenSlug === slug && this.loadingPromise && this.volunteerDays.loading) {
                return this.loadingPromise;
            }
            
            // Create new request
            this.loadingGardenSlug = slug;
            if (!append) {
                this.volunteerDays = { loading: true };
            }
            const url = `${baseUrl}/garden/${slug}?pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
            this.loadingPromise = fetchWrapper.get(url)
                .then(res => {
                    this.currentGardenSlug = slug;
                    this.loadingGardenSlug = null;
                    this.loadingPromise = null;
                    
                    // Extract data and pagination from Strapi response format
                    let eventsData = [];
                    if (res.data && Array.isArray(res.data)) {
                        eventsData = res.data;
                    } else if (Array.isArray(res)) {
                        eventsData = res;
                    }
                    
                    // Update pagination metadata
                    if (res.meta?.pagination) {
                        this.volunteerDaysPagination = res.meta.pagination;
                    }
                    
                    if (append && Array.isArray(this.volunteerDays.days) && eventsData.length > 0) {
                        // Append new events to existing ones
                        this.volunteerDays = { days: [...this.volunteerDays.days, ...eventsData], loading: false };
                    } else {
                        // Replace with new data
                        this.volunteerDays = { days: eventsData, loading: false };
                    }
                    return eventsData;
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
                    // Ensure volunteerDays.days is an array before calling unshift
                    if (!this.volunteerDays.days || !Array.isArray(this.volunteerDays.days)) {
                        this.volunteerDays.days = [];
                    }
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
