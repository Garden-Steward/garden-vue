import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useGardensStore, useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/volunteer-days`;

export const useEventStore = defineStore({
    id: 'event',
    state: () => ({
        volunteerDays: {},
        volunteerDay: {},
        event: {}
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();  
            alertStore.error(err);
            console.log("Volunteer Error: ", err)
        },
        async getUserEvents() {
            return fetchWrapper.get(`${baseUrl}/user`)
                .then(res => this.volunteerDays.days = res)
                .catch(this.handleError);
        },
        async findById(id) {
            this.event = { loading: true };
            return fetchWrapper.get(`${baseUrl}/${id}?populate=garden`)
                .then(res => this.event = res.data)
                .catch(this.handleError);
        },
        async getByGarden(slug) {
            // const gardenStore = useGardensStore();
            // console.log("gardenStore",gardenStore.garden)
            this.volunteerDays = { loading: true };
            fetchWrapper.get(`${baseUrl}/garden/${slug}`)
            // fetchWrapper.get(`${baseUrl}/${slug}/full`)
                .then(res => this.volunteerDays.days = res)
                .then(this.volunteerDays = { loading: false })
                .catch(error => this.volunteerDays = { error })
        },
        async update(id, data) {
            return fetchWrapper.put(`${baseUrl}/${id}?populate=*`,{data: data})
                .then(res => {
                    this.volunteerDay = res.data.attributes;
                })
                .catch(this.handleError);
            
        },
        async closeUpdate(id) {
            // const idx = this.volunteerDays.days.findIndex(v=> v.id == id);
            // this.volunteerDays.days[idx].title = this.volunteerDay.title;

        },
        async register(data) {
            // TODO get id back from the register 
            return fetchWrapper.post(`${baseUrl}?populate=*`,{data:data})
                .then(res => {
                    let vday = res.data;
                    this.volunteerDays.days.unshift(vday.attributes);
                    this.volunteerDay = vday.attributes;
                    this.volunteerDay.id = vday.id;
                })
                .catch(this.handleError);
            
        },
        async testSms(id) {
            return fetchWrapper.get(`${baseUrl}/sms/${id}`)
                .then(res => {
                    console.log("test resp: ", res)
                    return res;
                })
                .catch(this.handleError);
        },
        async sendSms(id) {
            return fetchWrapper.post(`${baseUrl}/sms/${id}`)
                .then(res => {
                    console.log("send resp: ", res)
                    return res;
                })
                .catch(this.handleError);
        } 
    },
    getters: {
        gardenGetter(state) {
            // console.log("garden getter")
            const gardenStore = useGardensStore();
            return state.localData + gardenStore.data
        }
    }
});
