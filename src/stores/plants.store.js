import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/plants`;

export const usePlantsStore = defineStore({
    id: 'plants',
    state: () => ({
        /** Flat array of plant objects, accumulated page by page. */
        plants: [],
        /** Single plant loaded via slug lookup. */
        plant: null,
        /** Pagination metadata from the API. */
        pagination: { page: 1, pageSize: 25, total: 0, pageCount: 0 },
        /** Current search query (mirrors the UI input). */
        query: '',
        /** Sort column — matches Strapi field name or null for default. */
        sortField: 'title',
        sortOrder: 'asc',
        /** True while a fetch is in flight. */
        loading: false,
        /** Error object or null. */
        error: null,
        /** True while a single-plant fetch is in flight. */
        plantLoading: false,
        /** Single plant fetch error. */
        plantError: null
    }),
    getters: {
        /** Total plant count (for the sidebar badge). */
        totalCount: (state) => state.pagination.total,
        /** Whether all pages have been loaded. */
        allLoaded: (state) => state.pagination.page >= state.pagination.pageCount,
        /** Whether the current state represents a fresh search (not accumulated). */
        isFreshSearch: (state) => state.pagination.page <= 1
    },
    actions: {
        /**
         * Fetch one page of plants.
         * When page === 1 and the query or sort changed, replaces the list.
         * Otherwise appends to the accumulated list (infinite scroll).
         */
        async fetchPage(page = 1) {
            this.loading = true;
            this.error = null;

            const params = new URLSearchParams();
            params.set('pagination[page]', String(page));
            params.set('pagination[pageSize]', '25');

            // Populate clipart + images for thumbnails
            params.set('populate', 'clipart,images');

            // Sort
            params.set('sort[0]', `${this.sortField}:${this.sortOrder}`);

            // Fields to fetch
            const fields = ['title', 'latin', 'type', 'slug', 'water_detail', 'sun_detail', 'magic'];
            fields.forEach((f, i) => params.set(`fields[${i}]`, f));

            // Search filter (case-insensitive contains on title + latin)
            if (this.query.trim()) {
                params.set('filters[$or][0][title][$containsi]', this.query.trim());
                params.set('filters[$or][1][latin][$containsi]', this.query.trim());
            }

            fetchWrapper.get(`${baseUrl}?${params.toString()}`)
                .then(res => {
                    const incoming = Array.isArray(res.data) ? res.data : [];
                    this.pagination = res.meta?.pagination || this.pagination;

                    if (page === 1) {
                        // Fresh search — replace the list
                        this.plants = incoming;
                    } else {
                        // Accumulate on infinite scroll
                        this.plants = [...this.plants, ...incoming];
                    }

                    this.pagination.page = page;
                    this.loading = false;
                })
                .catch(error => {
                    this.error = error;
                    this.loading = false;
                });
        },

        /**
         * First page of a new search/sort. Resets the list.
         */
        async search(query) {
            this.query = query || '';
            this.plants = [];
            this.pagination.page = 1;
            await this.fetchPage(1);
        },

        /**
         * Set sort and re-fetch from page 1.
         */
        async setSort(field) {
            if (this.sortField === field) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = field;
                this.sortOrder = 'asc';
            }
            await this.search(this.query);
        },

        /**
         * Load the next page (infinite scroll).
         */
        async loadNextPage() {
            if (this.allLoaded || this.loading) return;
            await this.fetchPage(this.pagination.page + 1);
        },

        /**
         * Load a single plant by slug, with full details.
         */
        async fetchBySlug(slug) {
            this.plant = null;
            this.plantLoading = true;
            this.plantError = null;

            const params = new URLSearchParams();
            params.set('filters[slug][$eq]', slug);
            params.set('populate', 'clipart,images');
            params.set('populate[0]', 'Benefits');

            fetchWrapper.get(`${baseUrl}?${params.toString()}`)
                .then(res => {
                    const found = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
                    this.plant = found;
                    this.plantLoading = false;
                })
                .catch(error => {
                    this.plantError = error;
                    this.plantLoading = false;
                });
        },

        /**
         * Initial load (idempotent — only fetches if plants array is empty).
         */
        async ensureLoaded() {
            if (this.plants.length > 0 || this.loading) return;
            await this.fetchPage(1);
        }
    }
});