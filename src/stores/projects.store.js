import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/projects`;

export const useProjectsStore = defineStore({
    id: 'projects',
    state: () => ({
        projects: {},
        project: {}
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();
            // Extract error message from various possible error formats
            let errorMessage = 'An unknown error occurred';
            
            if (typeof err === 'string') {
                errorMessage = err;
            } else if (err?.error?.message) {
                // Handle Strapi error format: { error: { message: "..." } }
                errorMessage = err.error.message;
            } else if (err?.message) {
                // Handle standard error format: { message: "..." }
                errorMessage = err.message;
            } else if (err?.response?.data?.error?.message) {
                // Handle axios-style error format
                errorMessage = err.response.data.error.message;
            }
            
            alertStore.error(errorMessage);
            console.log("Projects Error: ", err);
            // Re-throw so component can also handle the error
            throw err;
        },
        async getProjects(gardenId) {
            return fetchWrapper.get(`${baseUrl}?populate[0]=hero_image&populate[1]=featured_gallery&populate[2]=garden&populate[3]=related_events&populate[4]=related_events.title&populate[5]=impact_metrics&filters[garden][id][$eq]=${gardenId}`)
                .then(response => {
                    const projects = (Array.isArray(response.data) ? response.data : [response.data]).map(project => {
                        // Normalize hero_image
                        if (project.attributes?.hero_image?.data) {
                            const imageData = project.attributes.hero_image.data;
                            project.attributes.hero_image = {
                                ...imageData.attributes,
                                id: imageData.id
                            };
                        }
                        // Normalize featured_gallery
                        if (project.attributes?.featured_gallery?.data) {
                            project.attributes.featured_gallery = project.attributes.featured_gallery.data.map(img => ({
                                ...img.attributes,
                                id: img.id
                            }));
                        } else if (!project.attributes?.featured_gallery) {
                            project.attributes.featured_gallery = [];
                        }
                        // Normalize related_events
                        if (project.attributes?.related_events?.data) {
                            project.attributes.related_events = project.attributes.related_events.data.map(event => ({
                                ...event.attributes,
                                id: event.id
                            }));
                        } else if (!project.attributes?.related_events) {
                            project.attributes.related_events = [];
                        }
                        return project;
                    });
                    this.projects = projects;
                    return projects;
                })
                .catch(this.handleError);
        },
        async getSlug(slug) {
            this.project = { loading: true };
            return fetchWrapper.get(`${baseUrl}?filters[slug][$eq]=${slug}&populate[0]=hero_image&populate[1]=featured_gallery&populate[2]=garden&populate[3]=garden.organization&populate[4]=related_events&populate[5]=related_events.title&populate[6]=related_events.startDatetime&populate[7]=related_events.hero_image&populate[8]=impact_metrics`)
                .then(response => {
                    const projects = Array.isArray(response.data) ? response.data : [response.data];
                    if (projects.length === 0) {
                        this.project = { error: 'Project not found' };
                        return null;
                    }
                    
                    const project = projects[0];
                    // Normalize hero_image
                    if (project.attributes?.hero_image?.data) {
                        const imageData = project.attributes.hero_image.data;
                        project.attributes.hero_image = {
                            ...imageData.attributes,
                            id: imageData.id
                        };
                    }
                    // Normalize featured_gallery
                    if (project.attributes?.featured_gallery?.data) {
                        project.attributes.featured_gallery = project.attributes.featured_gallery.data.map(img => ({
                            ...img.attributes,
                            id: img.id
                        }));
                    } else if (!project.attributes?.featured_gallery) {
                        project.attributes.featured_gallery = [];
                    }
                    // Normalize related_events
                    if (project.attributes?.related_events?.data) {
                        project.attributes.related_events = project.attributes.related_events.data.map(event => {
                            const normalizedEvent = {
                                ...event.attributes,
                                id: event.id
                            };
                            // Normalize hero_image if present
                            if (normalizedEvent.hero_image?.data) {
                                const imageData = normalizedEvent.hero_image.data;
                                normalizedEvent.hero_image = {
                                    ...imageData.attributes,
                                    id: imageData.id
                                };
                            }
                            return normalizedEvent;
                        });
                    } else if (!project.attributes?.related_events) {
                        project.attributes.related_events = [];
                    }
                    
                    this.project = project;
                    return project;
                })
                .catch(error => {
                    this.project = { error };
                    throw error;
                });
        },
        async update(id, data) {
            // Handle hero_image
            if (data.hero_image?.id) {
                data.hero_image = {
                    id: data.hero_image.id
                };
            } else if (data.hero_image === null) {
                data.hero_image = null;
            }
            
            // Handle featured_gallery
            if (data.featured_gallery && Array.isArray(data.featured_gallery)) {
                data.featured_gallery = data.featured_gallery.map(img => ({
                    id: img.id
                }));
            }
            
            // Handle related_events (many-to-many relation)
            if (data.related_events && Array.isArray(data.related_events)) {
                data.related_events = data.related_events
                    .filter(event => event && event.id)
                    .map(event => ({
                        id: typeof event === 'object' ? event.id : event
                    }));
            }
            
            // Convert empty date strings to null
            if (data.date_start === '') {
                data.date_start = null;
            }
            if (data.date_end === '') {
                data.date_end = null;
            }
            
            return fetchWrapper.put(`${baseUrl}/${id}?populate[0]=hero_image&populate[1]=featured_gallery&populate[2]=impact_metrics`, { data: data })
                .then(response => {
                    if (response?.data?.attributes) {
                        // Normalize hero_image
                        if (response.data.attributes.hero_image?.data) {
                            const imageData = response.data.attributes.hero_image.data;
                            response.data.attributes.hero_image = {
                                ...imageData.attributes,
                                id: imageData.id
                            };
                        }
                        // Normalize featured_gallery
                        if (response.data.attributes.featured_gallery?.data) {
                            response.data.attributes.featured_gallery = response.data.attributes.featured_gallery.data.map(img => ({
                                ...img.attributes,
                                id: img.id
                            }));
                        }
                        return response.data.attributes;
                    }
                    return response;
                });
        },
        async register(data) {
            // Handle hero_image
            if (data.hero_image?.id) {
                data.hero_image = {
                    id: data.hero_image.id
                };
            }
            
            // Handle featured_gallery
            if (data.featured_gallery && Array.isArray(data.featured_gallery)) {
                data.featured_gallery = data.featured_gallery.map(img => ({
                    id: img.id
                }));
            }
            
            // Handle related_events (many-to-many relation)
            if (data.related_events && Array.isArray(data.related_events)) {
                data.related_events = data.related_events
                    .filter(event => event && event.id)
                    .map(event => ({
                        id: typeof event === 'object' ? event.id : event
                    }));
            }
            
            // Convert empty date strings to null
            if (data.date_start === '') {
                data.date_start = null;
            }
            if (data.date_end === '') {
                data.date_end = null;
            }

            return fetchWrapper.post(`${baseUrl}?populate[0]=hero_image&populate[1]=featured_gallery&populate[2]=impact_metrics`, { data: data })
                .then(response => {
                    if (response?.data?.attributes) {
                        // Normalize hero_image
                        if (response.data.attributes.hero_image?.data) {
                            const imageData = response.data.attributes.hero_image.data;
                            response.data.attributes.hero_image = {
                                ...imageData.attributes,
                                id: imageData.id
                            };
                        }
                        // Normalize featured_gallery
                        if (response.data.attributes.featured_gallery?.data) {
                            response.data.attributes.featured_gallery = response.data.attributes.featured_gallery.data.map(img => ({
                                ...img.attributes,
                                id: img.id
                            }));
                        }
                        
                        // Don't manually add to store - let getProjects refetch to avoid duplicates
                        // The component will refetch after creation
                        
                        return response.data.attributes;
                    }
                    return response;
                });
        },
        async uploadImage(formData) {
            return fetchWrapper.post(`${import.meta.env.VITE_API_URL}/api/upload`, formData)
                .then(res => {
                    const uploadedFile = Array.isArray(res) ? res[0] : res;
                    return {
                        url: uploadedFile.url,
                        id: uploadedFile.id
                    };
                })
                .catch(error => {
                    const alertStore = useAlertStore();
                    alertStore.error('Failed to upload image');
                    throw error;
                });
        },
        async delete(id) {
            return fetchWrapper.delete(`${baseUrl}/${id}`)
                .then(() => {
                    // Remove the project from the store
                    this.projects = this.projects.filter(p => p.id !== id);
                    return true;
                })
                .catch(this.handleError);
        }
    }
});

