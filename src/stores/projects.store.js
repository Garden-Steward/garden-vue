import { defineStore } from 'pinia';

import { fetchWrapper, stripReadOnly } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/projects`;

/**
 * Strapi v5 returns flat entries (fields directly on the object, relations
 * already de-nested). Guarantee the array-valued relations are always arrays
 * so consumers can iterate without guards.
 */
function normalizeProject(p) {
    if (!p) return p;
    if (!Array.isArray(p.featured_gallery)) p.featured_gallery = [];
    if (!Array.isArray(p.related_events)) p.related_events = [];
    if (!Array.isArray(p.managers)) p.managers = [];
    if (!Array.isArray(p.interested)) p.interested = [];
    return p;
}

/** Reduce a relation field (array of ids or objects) to a clean array of numeric ids. */
function relationToIds(value) {
    if (!Array.isArray(value)) return value;
    return value.map(v => (typeof v === 'object' ? v?.id : v)).filter(id => id != null);
}

/**
 * v5 single-entry endpoints key on documentId, not numeric id. Resolve a
 * project's documentId from whatever is cached in state (falls back to the
 * numeric id). `store` is the store instance (`this`).
 */
function resolveProjectDocId(store, id) {
    for (const list of [store.projects, store.communityProjects, store.userProjects]) {
        if (Array.isArray(list)) {
            const found = list.find((p) => p && p.id === id);
            if (found?.documentId) return found.documentId;
        }
    }
    if (store.project?.id === id && store.project?.documentId) return store.project.documentId;
    return id;
}

export const useProjectsStore = defineStore({
    id: 'projects',
    state: () => ({
        projects: {},
        project: {},
        userProjects: {},
        communityProjects: {}
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
            return fetchWrapper.get(`${baseUrl}?populate[0]=hero_image&populate[1]=featured_gallery&populate[2]=garden&populate[3]=related_events&populate[4]=impact_metrics&filters[garden][id][$eq]=${gardenId}`)
                .then(response => {
                    const projects = (Array.isArray(response.data) ? response.data : [response.data]).map(normalizeProject);
                    this.projects = projects;
                    return projects;
                })
                .catch(this.handleError);
        },
        async getUserProjects() {
            this.userProjects = { loading: true };
            return fetchWrapper.get(`${baseUrl}/user?populate[0]=hero_image&populate[1]=garden&populate[2]=created_by&populate[3]=managers&populate[4]=interested`)
                .then(response => {
                    const raw = Array.isArray(response) ? response : (response?.data ?? []);
                    const projects = (Array.isArray(raw) ? raw : [raw]).map(normalizeProject);
                    this.userProjects = projects;
                    return projects;
                })
                .catch(error => {
                    this.userProjects = { error };
                    this.handleError(error);
                });
        },
        async findById(id) {
            this.project = { loading: true };
            // v5 core findOne keys on documentId; the route gives a numeric id,
            // so resolve via a filter on the collection (permitted) and take [0].
            return fetchWrapper.get(`${baseUrl}?filters[id][$eq]=${id}&populate[0]=hero_image&populate[1]=featured_gallery&populate[2]=garden&populate[3]=created_by&populate[4]=managers&populate[5]=impact_metrics&populate[6]=interested`)
                .then(response => {
                    const arr = Array.isArray(response?.data) ? response.data : [];
                    const project = arr.length ? arr[0] : null;
                    if (!project) {
                        this.project = { error: 'Project not found' };
                        return null;
                    }
                    this.project = normalizeProject(project);
                    return this.project;
                })
                .catch(error => {
                    this.project = { error };
                    throw error;
                });
        },
        async getAllProjects() {
            this.communityProjects = { loading: true };
            return fetchWrapper.get(`${baseUrl}?populate[0]=hero_image&populate[1]=garden&populate[2]=created_by&populate[3]=interested&sort=createdAt:desc&pagination[pageSize]=100`)
                .then(response => {
                    const raw = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
                    const projects = raw.map(normalizeProject);
                    this.communityProjects = projects;
                    return projects;
                })
                .catch(error => {
                    this.communityProjects = { error };
                    this.handleError(error);
                });
        },
        async getSlug(slug) {
            this.project = { loading: true };
            return fetchWrapper.get(`${baseUrl}?filters[slug][$eq]=${slug}&populate[0]=hero_image&populate[1]=featured_gallery&populate[2]=garden&populate[3]=garden.organization&populate[4]=related_events&populate[5]=related_events.hero_image&populate[6]=impact_metrics`)
                .then(response => {
                    const projects = Array.isArray(response.data) ? response.data : [response.data];
                    if (projects.length === 0) {
                        this.project = { error: 'Project not found' };
                        return null;
                    }
                    
                    this.project = normalizeProject(projects[0]);
                    return this.project;
                })
                .catch(error => {
                    this.project = { error };
                    throw error;
                });
        },
        async update(id, data) {
            data = stripReadOnly(data);
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

            // Reduce relation objects to ids (Strapi accepts id or { id }).
            if (data.created_by && typeof data.created_by === 'object') {
                data.created_by = data.created_by.id;
            }
            if (Array.isArray(data.managers)) {
                data.managers = relationToIds(data.managers);
            }
            if (Array.isArray(data.interested)) {
                data.interested = relationToIds(data.interested);
            }
            // garden may be intentionally null (project not associated with one).
            if (data.garden && typeof data.garden === 'object') {
                data.garden = data.garden.id ?? null;
            }

            // Convert empty date strings to null
            if (data.date_start === '') {
                data.date_start = null;
            }
            if (data.date_end === '') {
                data.date_end = null;
            }

            // v5 core update keys on documentId; resolve from cached state.
            const documentId = resolveProjectDocId(this, id);
            return fetchWrapper.put(`${baseUrl}/${documentId}?populate[0]=hero_image&populate[1]=featured_gallery&populate[2]=impact_metrics`, { data: data })
                .then(response => {
                    if (response?.data) {
                        return normalizeProject(response.data);
                    }
                    return response;
                });
        },
        async register(data) {
            data = stripReadOnly(data);
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

            // Reduce relation objects to ids (Strapi accepts id or { id }).
            if (data.created_by && typeof data.created_by === 'object') {
                data.created_by = data.created_by.id;
            }
            if (Array.isArray(data.managers)) {
                data.managers = relationToIds(data.managers);
            }
            if (Array.isArray(data.interested)) {
                data.interested = relationToIds(data.interested);
            }
            // garden may be intentionally null (pitch without association).
            if (data.garden && typeof data.garden === 'object') {
                data.garden = data.garden.id ?? null;
            }

            // Convert empty date strings to null
            if (data.date_start === '') {
                data.date_start = null;
            }
            if (data.date_end === '') {
                data.date_end = null;
            }

            return fetchWrapper.post(`${baseUrl}?populate[0]=hero_image&populate[1]=featured_gallery&populate[2]=garden&populate[3]=related_events&populate[4]=impact_metrics`, { data: data })
                .then(response => {
                    if (response?.data?.id) {
                        // v5 returns a flat entry; guarantee array relations.
                        const newProject = normalizeProject(response.data);

                        // Add to store if projects is an array
                        if (Array.isArray(this.projects)) {
                            // Check if project already exists (shouldn't happen, but prevent duplicates)
                            const exists = this.projects.some(p => p.id === newProject.id);
                            if (!exists) {
                                this.projects.push(newProject);
                            }
                        } else {
                            // If projects is not an array, initialize it
                            this.projects = [newProject];
                        }

                        return newProject;
                    }
                    return response;
                });
        },
        async pitch(data) {
            data = stripReadOnly(data);
            // Normalize hero_image to its id for the relation
            if (data.hero_image?.id) {
                data.hero_image = { id: data.hero_image.id };
            }
            // Normalize featured_gallery to ids
            if (data.featured_gallery && Array.isArray(data.featured_gallery)) {
                data.featured_gallery = data.featured_gallery.map(img => ({ id: img.id }));
            }
            return fetchWrapper.post(`${baseUrl}/pitch`, { data })
                .then(response => response?.data ?? response)
                .catch(this.handleError);
        },
        async toggleInterest(id) {
            return fetchWrapper.post(`${baseUrl}/${id}/interest`, {})
                .then(response => response)
                .catch(this.handleError);
        },
        async updateManagers(id, managers) {
            const managerIds = (managers || []).map(m => (typeof m === 'object' ? m.id : m));
            return fetchWrapper.put(`${baseUrl}/${id}/managers`, { data: { managers: managerIds } })
                .then(response => response?.data ?? response)
                .catch(this.handleError);
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
            // v5 core delete keys on documentId.
            const documentId = resolveProjectDocId(this, id);
            return fetchWrapper.delete(`${baseUrl}/${documentId}`)
                .then(() => {
                    // Remove the project from the store
                    this.projects = this.projects.filter(p => p.id !== id);
                    return true;
                })
                .catch(this.handleError);
        }
    }
});

