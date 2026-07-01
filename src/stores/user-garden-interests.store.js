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
                // v5 returns a flat entry; update it in the list if present.
                const updated = res.data;
                if (Array.isArray(this.uginterests)) {
                    const idx = this.uginterests.findIndex(v => v.id == updated.id);
                    if (idx !== -1) this.uginterests[idx] = updated;
                }
            })
            .catch(this.handleError);
      },
      async register(data) {
        return fetchWrapper.post(`${baseUrl}?populate=*`,{data:data})
            .then(res => {
                this.uginterests = res.data;
            })
            .catch(this.handleError);
      },
      async cleartemp(gardenId) {
        return fetchWrapper.post(`${baseUrl}/cleartemp?populate=*`,{gardenId})
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
