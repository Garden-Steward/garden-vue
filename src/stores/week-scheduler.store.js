import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/schedulers`;

export const useWeekSchedulerStore = defineStore({
    id: 'weekscheduler',
    state: () => ({
        weekscheduler: {}
    }),
    actions: {
      async find(garden) {
          this.weekscheduler = { loading: true };
          fetchWrapper.get(`${baseUrl}?populate=*&filters[garden]=${garden}`)
              .then(res => this.weekscheduler = res.data)
              .catch(error => this.weekscheduler = { error })
      },
      async update(id, data) {
        return fetchWrapper.put(`${baseUrl}/${id}?populate=*`,{data: data})
            .then(res => {
                console.log("scheduler update resp:", res)
                this.weekscheduler = res.data.attributes;
                const idx = this.weekscheduler.findIndex(v=> v.id == res.data.id);
                this.weekscheduler[idx] = res.data.attributes;
            })
            .catch(this.handleError);
      },
      async register(data) {
        return fetchWrapper.post(`${baseUrl}?populate=*`,{data:data})
            .then(res => {
                this.weekscheduler = res.data;
            })
            .catch(this.handleError);
      },
      async delete(id) {
        return fetchWrapper.delete(`${baseUrl}/${id}`)
            .then(res => {
                console.log("delete: ", res)
            })
            .catch(this.handleError);
      }
    }

});
