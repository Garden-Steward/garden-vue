import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';
import { readPublicPage } from '@/helpers/public-collection';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/blogs`;

export const useBlogStore = defineStore({
    id: 'blogs',
    state: () => ({
        blogs: [],
        blog: {},
        listRequest: 0,
        detailRequest: 0,
        blogsPagination: { page: 1, pageSize: 24, pageCount: 0, total: 0 },
        loadingMore: false,
        moreError: null
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();
            alertStore.error(err);
            console.log("Blog Error: ", err);
        },
        async fetchAll() {
            const request = ++this.listRequest;
            this.blogs = { loading: true };
            this.moreError = null;
            this.loadingMore = false;
            this.blogsPagination = { page: 1, pageSize: 24, pageCount: 0, total: 0 };
            try {
                const response = await readPublicPage(`${import.meta.env.VITE_API_URL}/api/public/blogs`, 1, 24);
                if (request === this.listRequest) {
                    this.blogs = response.data;
                    this.blogsPagination = response.meta.pagination;
                }
                return response.data;
            } catch (error) {
                if (request === this.listRequest) {
                    this.blogs = { error };
                    this.handleError(error);
                }
                return { error };
            }
        },
        async loadMore() {
            if (this.loadingMore || !Array.isArray(this.blogs) || this.blogsPagination.page >= this.blogsPagination.pageCount) return;
            const request = this.listRequest;
            this.loadingMore = true;
            this.moreError = null;
            try {
                const response = await readPublicPage(`${import.meta.env.VITE_API_URL}/api/public/blogs`, this.blogsPagination.page + 1, 24);
                if (request !== this.listRequest) return;
                if (response.meta.pagination.total !== this.blogsPagination.total) {
                    throw new Error('The story list changed while loading. Please reload it.');
                }
                const articles = new Map(this.blogs.map(article => [article.documentId, article]));
                for (const article of response.data) articles.set(article.documentId, article);
                const { page, pageSize, total } = response.meta.pagination;
                if (articles.size !== Math.min(total, page * pageSize)) {
                    throw new Error('The story list changed while loading. Please reload it.');
                }
                this.blogs = [...articles.values()];
                this.blogsPagination = response.meta.pagination;
            } catch (error) {
                if (request === this.listRequest) this.moreError = error;
            } finally {
                if (request === this.listRequest) this.loadingMore = false;
            }
        },
        async findSlug(slug) {
            const request = ++this.detailRequest;
            this.blog = { loading: true };
            try {
                const response = await fetchWrapper.get(`${import.meta.env.VITE_API_URL}/api/public/blogs/${encodeURIComponent(slug)}`);
                if (!response || typeof response.documentId !== 'string' || !Array.isArray(response.content)) {
                    throw new Error('Invalid story response');
                }
                if (request === this.detailRequest) this.blog = response;
                return response;
            } catch (error) {
                if (request === this.detailRequest) this.blog = { error };
                return { error };
            }
        },
        async fetchById(id) {
            this.blog = { loading: true };
            fetchWrapper.get(`${baseUrl}/${id}`)
                .then(res => this.blog = res.data)
                .catch(error => {
                    this.blog = { error };
                    this.handleError(error);
                })
                .finally(() => this.blog.loading = false);
        },
        async create(data) {
            return fetchWrapper.post(`${baseUrl}`, { data: data })
                .then(res => {
                    this.blogs.unshift(res.data);
                    this.blog = res.data;
                })
                .catch(this.handleError);
        },
        async update(id, data) {
            return fetchWrapper.put(`${baseUrl}/${id}`, { data: data })
                .then(res => {
                    this.blog = res.data;
                })
                .catch(this.handleError);
        },
        async delete(id) {
            return fetchWrapper.delete(`${baseUrl}/${id}`)
                .then(() => {
                    this.blogs = this.blogs.filter(blog => blog.id !== id);
                })
                .catch(this.handleError);
        }
    }
});
