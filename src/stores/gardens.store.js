import { defineStore } from 'pinia';

import { fetchWrapper, stripReadOnly } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/gardens`;

export const useGardensStore = defineStore({
    id: 'gardens',
    state: () => ({
        gardens: {},
        garden: {}
    }),
    actions: {
        async getAll() {
            this.gardens = { loading: true };
            // Strapi v5: array-style populate (comma strings are rejected).
            fetchWrapper.get(`${baseUrl}?populate[0]=managers&populate[1]=volunteers&populate[2]=hero_image`)
                .then(res => {
                    // v5 returns flat entries with relations/media already de-nested,
                    // so hero_image is the media object directly — no remapping needed.
                    this.gardens = Array.isArray(res.data) ? res.data : [];
                })
                .catch(error => this.gardens = { error })
        },
        async getAllPublic() {
            this.gardens = { loading: true };
            fetchWrapper.get(`${baseUrl}?populate=hero_image`)
                .then(res => this.gardens = res.data)
                .catch(error => this.gardens = { error })
        },
        async getSlug(slug) {
            this.garden = { loading: true };
            fetchWrapper.get(`${baseUrl}/${slug}/full?populate=managers`)
                .then(res => this.garden = res.data)
                .catch(error => this.garden = { error })
        },
        async update(id, data) {
            data = stripReadOnly(data);
            // Format hero_image correctly if it exists
            if (data.hero_image?.id) {
                data.hero_image = {
                    id: data.hero_image.id
                };
            } else if (data.hero_image === null) {
                data.hero_image = null;
            }
            
            return fetchWrapper.put(`${baseUrl}/${id}?populate=hero_image`, { data: data })
                .then(res => {
                    // Update the garden in state if it matches
                    if (this.garden.id === id) {
                        this.garden = res.data;
                    }
                    return res.data;
                })
                .catch(error => {
                    console.error('Error updating garden:', error);
                    throw error;
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
                    console.error('Error uploading image:', error);
                    throw error;
                });
        }
    }
});
