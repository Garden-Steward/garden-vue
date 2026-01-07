import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/volunteer-days`;

export const useMediaStore = defineStore({
    id: 'media',
    state: () => ({
        mediaLibrary: [], // Array of all media items
        loading: false,
        selectedGarden: null, // Currently selected garden ID
        mediaCache: {}, // Cache media by garden ID to avoid redundant API calls
        searchTerm: '' // Current search term
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();
            alertStore.error(err);
            console.log("Media Error: ", err);
            throw err;
        },
        async fetchGardenMedia(gardenId) {
            // Check cache first
            if (this.mediaCache[gardenId] && !this.loading) {
                this.selectedGarden = gardenId;
                this.mediaLibrary = this.mediaCache[gardenId];
                return Promise.resolve(this.mediaCache[gardenId]);
            }

            // Set loading state
            this.loading = true;
            this.selectedGarden = gardenId;

            const url = `${baseUrl}/garden/${gardenId}/media`;
            
            return fetchWrapper.get(url)
                .then(res => {
                    // Handle Strapi response format
                    let mediaData = [];
                    if (res.data && Array.isArray(res.data)) {
                        mediaData = res.data;
                    } else if (Array.isArray(res)) {
                        mediaData = res;
                    } else {
                        mediaData = res;
                    }

                    // Update state and cache
                    this.mediaLibrary = mediaData;
                    this.mediaCache[gardenId] = mediaData;
                    this.loading = false;
                    
                    return mediaData;
                })
                .catch(error => {
                    this.loading = false;
                    this.handleError(error);
                });
        },
        searchMedia(searchTerm) {
            this.searchTerm = searchTerm;
            
            if (!searchTerm || searchTerm.trim() === '') {
                // If no search term, return all media for selected garden
                if (this.selectedGarden && this.mediaCache[this.selectedGarden]) {
                    this.mediaLibrary = this.mediaCache[this.selectedGarden];
                }
                return this.mediaLibrary;
            }

            // Filter from cache (source of truth) by search term
            const sourceMedia = this.selectedGarden && this.mediaCache[this.selectedGarden] 
                ? this.mediaCache[this.selectedGarden] 
                : this.mediaLibrary;
            
            const term = searchTerm.toLowerCase().trim();
            const filtered = sourceMedia.filter(media => {
                // Handle Strapi format
                const mediaData = media.attributes || media.data?.attributes || media;
                
                // Search in various fields that might exist
                const name = mediaData.name || mediaData.title || mediaData.filename || '';
                const alt = mediaData.alternativeText || mediaData.alt || '';
                const caption = mediaData.caption || '';
                
                return name.toLowerCase().includes(term) ||
                       alt.toLowerCase().includes(term) ||
                       caption.toLowerCase().includes(term);
            });

            // Update mediaLibrary with filtered results
            this.mediaLibrary = filtered;
            return filtered;
        },
        clearCache() {
            this.mediaCache = {};
            this.mediaLibrary = [];
            this.selectedGarden = null;
            this.searchTerm = '';
        }
    },
    getters: {
        getMediaByGarden: (state) => {
            return (gardenId) => {
                return state.mediaCache[gardenId] || [];
            };
        }
    }
});


