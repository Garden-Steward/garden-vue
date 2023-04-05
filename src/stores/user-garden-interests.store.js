import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/user-garden-interests`;

export const useUGInterestsStore = defineStore({
    id: 'uginterests',
    state: () => ({
        uginterests: {},
        garden: {}
    }),
    actions: {
      async find() {
          this.uginterests = { loading: true };
          fetchWrapper.get(`${baseUrl}`)
              .then(res => this.uginterests = res.data)
              .catch(error => this.uginterests = { error })
      },
      async update(id, data) {
        return fetchWrapper.put(`${baseUrl}/${id}?populate=*`,{data: data})
            .then(res => {
                console.log("uginterest update resp:", res)
                this.uginterests = res.data.attributes;
                const idx = this.uginterests.findIndex(v=> v.id == res.data.id);
                this.uginterests[idx] = res.data.attributes;
            })
            .catch(this.handleError);
      },
      async register(data) {
        return fetchWrapper.post(`${baseUrl}?populate=*`,{data:data})
            .then(res => {
                this.uginterests = res.data;
            })
            .catch(this.handleError);
      }
    }

});
