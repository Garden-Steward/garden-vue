import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/recurring-event-templates`;

export const useRecurringTemplateStore = defineStore({
    id: 'recurringTemplate',
    state: () => ({
        templates: {},
        template: {},
        preview: [],
        previewLoading: false,
        pagination: {
            page: 1,
            pageSize: 25,
            pageCount: 0,
            total: 0
        }
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();
            const msg = typeof err === 'object' && err?.message != null ? err.message : err;
            alertStore.error(msg);
            console.log("Recurring Template Error: ", err);
            throw err;
        },

        async getByGarden(gardenId) {
            this.templates = { loading: true };
            const url = `${baseUrl}?filters[garden][id][$eq]=${gardenId}&populate[0]=garden&sort=createdAt:desc`;
            return fetchWrapper.get(url)
                .then(res => {
                    if (res.data && res.meta?.pagination) {
                        this.templates = { items: res.data, loading: false };
                        this.pagination = res.meta.pagination;
                    } else if (Array.isArray(res)) {
                        this.templates = { items: res, loading: false };
                    } else {
                        this.templates = { items: res.data || [], loading: false };
                    }
                    return res;
                })
                .catch(err => {
                    this.templates = { error: err, loading: false };
                    throw err;
                });
        },

        async findById(id) {
            this.template = { loading: true };
            return fetchWrapper.get(`${baseUrl}/${id}?populate[0]=garden`)
                .then(res => {
                    this.template = res.data;
                    return res.data;
                })
                .catch(this.handleError);
        },

        async create(data) {
            return fetchWrapper.post(`${baseUrl}`, { data })
                .then(res => {
                    const newTemplate = res.data;
                    if (this.templates.items && Array.isArray(this.templates.items)) {
                        this.templates.items.unshift(newTemplate);
                    }
                    this.template = newTemplate;
                    return newTemplate;
                })
                .catch(err => {
                    throw err;
                });
        },

        async update(id, data) {
            return fetchWrapper.put(`${baseUrl}/${id}`, { data })
                .then(res => {
                    const updatedTemplate = res.data;
                    if (this.templates.items && Array.isArray(this.templates.items)) {
                        const idx = this.templates.items.findIndex(t => t.id === id);
                        if (idx !== -1) {
                            this.templates.items[idx] = updatedTemplate;
                        }
                    }
                    this.template = updatedTemplate;
                    return updatedTemplate;
                })
                .catch(err => {
                    throw err;
                });
        },

        async delete(id) {
            return fetchWrapper.delete(`${baseUrl}/${id}`)
                .then(() => {
                    // Remove from list
                    if (this.templates.items && Array.isArray(this.templates.items)) {
                        this.templates.items = this.templates.items.filter(t => t.id !== id);
                    }
                    // Clear current template if it was deleted
                    if (this.template?.id === id) {
                        this.template = {};
                    }
                })
                .catch(this.handleError);
        },

        async preview(id, count = 6) {
            this.previewLoading = true;
            this.preview = [];
            return fetchWrapper.get(`${baseUrl}/${id}/preview?count=${count}`)
                .then(res => {
                    this.preview = res.preview || res;
                    this.previewLoading = false;
                    return this.preview;
                })
                .catch(err => {
                    this.previewLoading = false;
                    this.handleError(err);
                });
        },

        async process(id) {
            return fetchWrapper.post(`${baseUrl}/${id}/process`)
                .then(res => {
                    return res;
                })
                .catch(this.handleError);
        },

        async processAll() {
            return fetchWrapper.post(`${baseUrl}/process-all`)
                .then(res => {
                    return res;
                })
                .catch(this.handleError);
        },

        clearPreview() {
            this.preview = [];
            this.previewLoading = false;
        }
    }
});
