import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';
import { useEventStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/garden-tasks`;

export const useGardenTaskStore = defineStore({
    id: 'gardenTasks',
    state: () => ({
        gardenTasks: {},
        gardenTask: {}
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();  
            alertStore.error(err);
            console.log("Garden Task Error: ", err)
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
    }
  });
