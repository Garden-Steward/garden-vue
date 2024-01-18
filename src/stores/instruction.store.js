import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/instructions`;

export const instructionStore = defineStore({
    id: 'instruction',
    state: () => ({
        instructions: {},
        instruction: {}
    }),
    actions: {
      async find() {
        //   this.instruction = { loading: true };
          this.instructions = { loading: true };
          fetchWrapper.get(`${baseUrl}`)
              .then(res => this.instructions = res.data)
              .catch(error => this.instructions = { error })
      },
      async findSlug(slug) {
        //   this.instructions = { loading: true };
          this.instruction = { loading: true };
          fetchWrapper.get(`${baseUrl}?filters[slug][$eq]=${slug}&populate[garden][populate]=organization`)
              .then(res => this.instruction = res.data[0])
              .catch(error => this.instruction = { error })
      },
      async update(id, data) {
        return fetchWrapper.put(`${baseUrl}/${id}?populate=*`,{data: data})
            .then(res => {
                console.log("uginterest update resp:", res)
                this.instructions = res.data.attributes;
                const idx = this.instructions.findIndex(v=> v.id == res.data.id);
                this.instructions[idx] = res.data.attributes;
            })
            .catch(this.handleError);
      },
      async approveTask(data) {
        return fetchWrapper.post(`${baseUrl}/approve?populate=*`,{data: data})
            .then(res => {
              console.log(res.data);
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
