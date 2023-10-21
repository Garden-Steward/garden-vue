import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useGardensStore, useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/sms-campaigns`;

export const useSMSCampaignStore = defineStore({
    id: 'smsCampaigns',
    state: () => ({
        smsCampaigns: {},
        smsCampaign: {}
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();  
            alertStore.error(err);
            console.log("Volunteer Error: ", err)
        },
        async getByGarden(slug) {
            const gardenStore = useGardensStore();
            console.log("gardenStore",gardenStore.garden)
            this.smsCampaigns = { loading: true };
            fetchWrapper.get(`${baseUrl}/garden/${slug}`)
            // fetchWrapper.get(`${baseUrl}/${slug}/full`)
                .then(res => this.smsCampaigns = res)
                .then(this.smsCampaigns = { loading: false })
                .catch(error => this.smsCampaigns = { error })
        },
        async update(id, data) {
            return fetchWrapper.put(`${baseUrl}/${id}?populate=*`,{data: data})
                .then(res => {
                    this.smsCampaign = res.data.attributes;
                })
                .catch(this.handleError);
            
        },
        async closeUpdate() {
            this.smsCampaign.body = '';

        },
        async register(data) {
            return fetchWrapper.post(`${baseUrl}?populate=*`,{data:data})
                .then(res => {
                    this.smsCampaigns.unshift(res.data.attributes);
                    this.smsCampaign = res.data;
                })
                .catch(this.handleError);
            
        },
        async testSms(data) {
            return fetchWrapper.post(`${baseUrl}/sms/test`, data)
                .then(res => {
                    console.log("test resp: ", res)
                    return res;
                })
                .catch(this.handleError);
        },
        async sendSms(data) {
            return fetchWrapper.post(`${baseUrl}/sms/group`, data)
                .then(res => {
                    console.log("test resp: ", res)
                    return res;
                })
                .catch(this.handleError);
        } 
    }
});
