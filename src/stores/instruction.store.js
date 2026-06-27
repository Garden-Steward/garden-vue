import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/instructions`;

export const instructionStore = defineStore({
    id: 'instruction',
    state: () => ({
        instructions: {},
        instruction: {}
    }),
    actions: {
      handleError(err) {
        const alertStore = useAlertStore();
        alertStore.error(err);
        console.log("Instruction Error: ", err);
      },
      async find() {
        //   this.instruction = { loading: true };
          this.instructions = { loading: true };
          fetchWrapper.get(`${baseUrl}`)
              .then(res => this.instructions = res.data)
              .catch(error => this.instructions = { error })
      },
      /** Instructions linked to a garden (for recurring-task relation picker). */
      async findByGarden(gardenId) {
          if (!gardenId) return [];
          const q = `${baseUrl}?filters[garden][id][$eq]=${gardenId}&pagination[pageSize]=200&sort=title:asc`;
          return fetchWrapper.get(q)
              .then(res => (Array.isArray(res.data) ? res.data : []))
              .catch(error => {
                  this.handleError(error);
                  return [];
              });
      },
      async findSlug(slug) {
        //   this.instructions = { loading: true };
          this.instruction = { loading: true };
          fetchWrapper.get(`${baseUrl}?filters[slug][$eq]=${slug}&populate[garden][populate][organization]=true`)
              .then(res => this.instruction = res.data[0])
              .catch(error => this.instruction = { error })
      },
      async update(id, data) {
        return fetchWrapper.put(`${baseUrl}/${id}?populate=*`,{data: data})
            .then(res => {
                // v5 returns a flat entry; update it in the list if present.
                const updated = res.data;
                if (Array.isArray(this.instructions)) {
                    const idx = this.instructions.findIndex(v => v.id == updated.id);
                    if (idx !== -1) this.instructions[idx] = updated;
                }
            })
            .catch(this.handleError);
      },
      async approveTask(data) {
        return fetchWrapper.post(`${baseUrl}/approve?populate=*`,{data: data})
            .then(res => {
              console.log("approve is back: ", res);
              if (!res.success) {
                this.handleError(res.message);
              }
              return res;
                // this.instructions = res.data;
            })
            .catch(this.handleError);
      },
      async register(data) {
        return fetchWrapper.post(`${baseUrl}?populate=*`,{data:data})
            .then(res => {
                this.instructions = res.data;
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
