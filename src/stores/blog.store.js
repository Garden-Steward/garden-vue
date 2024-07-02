import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/blogs`;

export const useBlogStore = defineStore({
    id: 'blogs',
    state: () => ({
        blogs: [],
        blog: {}
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();
            alertStore.error(err);
            console.log("Blog Error: ", err);
        },
        async fetchAll() {
            this.blogs = { loading: true };
            fetchWrapper.get(`${baseUrl}?populate=*&sort[0]=createdAt:desc`)
                .then(res => this.blogs = res.data)
                .catch(error => {
                    this.blogs = { error };
                    this.handleError(error);
                })
                .finally(() => this.blogs.loading = false);
        },
        async findSlug(slug) {
            // ?populate=*&filters[slug][$eq]=${slug}
            this.blog = { loading: true };
            fetchWrapper.get(`${baseUrl}/${slug}/full`)
                .then(res => {
                    this.blog = res;
                    if (res.oembed) {
                        this.blog.video = JSON.parse(res.oembed.replace(/'/g, '"'));
                    }
                    this.blog.iframe = this.blog.video?.rawData.html;
                    if (this.blog.iframe) {
                        this.blog.iframe = this.blog.iframe.replace(/width="\d+"/, '').replace(/height="\d+"/, '');
                    }
                })
                .catch(error => {
                    this.blogs = { error };
                    this.handleError(error);
                })
                .finally(() => this.blogs.loading = false);
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
