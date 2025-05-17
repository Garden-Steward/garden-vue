import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/garden-tasks`;
const recurringUrl = `${import.meta.env.VITE_API_URL}/api/recurring-tasks`;

export const useGardenTaskStore = defineStore({
    id: 'gardenTasks',
    state: () => ({
        gardenTasks: {},
        gardenTask: {},
        recurringTasks: []
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();  
            alertStore.error(err);
            console.log("Garden Task Error: ", err)
        },
        async getGardenTasks(gardenId) {
            return fetchWrapper.get(`${baseUrl}?populate[0]=volunteers&populate[1]=recurring_task&populate[2]=recurring_task.instruction&populate[3]=primary_image&filters[garden][id][$eq]=${gardenId}&filters[status][$nei]=finished`)
                .then(response => {
                    const tasks = (Array.isArray(response.data) ? response.data : [response.data]).map(task => {
                        if (task.attributes?.volunteers?.data) {
                            task.attributes.volunteers = task.attributes.volunteers.data;
                        } else if (!task.attributes?.volunteers) {
                            task.attributes.volunteers = [];
                        }
                        return task;
                    });
                    this.gardenTasks = tasks;
                    return tasks;
                })
                .catch(this.handleError);
        },
        async update(id, data) {
            if (data.primary_image?.id) {
                data.primary_image = {
                    id: data.primary_image.id
                };
            }
            
            return fetchWrapper.put(`${baseUrl}/${id}?populate=primary_image`, { data: data })
                .then(response => {
                    if (response?.data?.attributes) {
                        if (response.data.attributes.primary_image?.data) {
                            const imageData = response.data.attributes.primary_image.data;
                            response.data.attributes.primary_image = {
                                ...imageData.attributes,
                                id: imageData.id
                            };
                        }
                        return response.data.attributes;
                    }
                    return response;
                })
                .catch(this.handleError);
        },
        async register(data) {
            if (data.primary_image?.id) {
                data.primary_image = {
                    id: data.primary_image.id
                };
            }

            return fetchWrapper.post(`${baseUrl}?populate=primary_image`, { data: data })
                .then(response => {
                    if (response?.data?.attributes) {
                        if (response.data.attributes.primary_image?.data) {
                            const imageData = response.data.attributes.primary_image.data;
                            response.data.attributes.primary_image = {
                                ...imageData.attributes,
                                id: imageData.id
                            };
                        }
                        this.gardenTasks.push(response.data);
                        return response.data.attributes;
                    }
                    return response;
                })
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
        async getRecurringTasks(gardenId) {
            return fetchWrapper.get(`${recurringUrl}?populate=*&filters[garden][id][$eq]=${gardenId}`)
                .then(response => {
                    this.recurringTasks = response.data;
                })
        },
        async delete(id) {
            // First get the task to check its status
            const task = this.gardenTasks.find(t => t.id === id);
            if (!task) {
                throw new Error('Task not found');
            }

            // Only allow deletion if status is INITIALIZED
            if (task.attributes.status !== 'INITIALIZED') {
                throw new Error('Cannot delete task: Only tasks with INITIALIZED status can be deleted');
            }

            return fetchWrapper.delete(`${baseUrl}/${id}`)
                .then(() => {
                    // Remove the task from the store
                    this.gardenTasks = this.gardenTasks.filter(t => t.id !== id);
                    return true;
                })
                .catch(this.handleError);
        }
    }
  });
