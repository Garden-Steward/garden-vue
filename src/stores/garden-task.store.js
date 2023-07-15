import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/garden-tasks`;

export const useGardenTaskStore = defineStore({
    id: 'gardenTasks',
    state: () => ({
        gardenTasks: {},
        gardenTask: {}
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();  
            alertStore.error(err);
            console.log("Garden Task Error: ", err)
        },
        async update(id, data) {
            return fetchWrapper.put(`${baseUrl}/${id}`,{data: data})
                .then(res => {
                    this.gardenTask = res.data;
                    // const idx = this.gardenTasks.tasks.findIndex(v=> v.id == res.data.id);
                    // this.gardenTasks.tasks[idx] = res.data;
                })
                .catch(this.handleError);
            
        },
        async register(data) {
            return fetchWrapper.post(`${baseUrl}`,{data:data})
                .then(res => {
                    // this.gardenTasks.tasks.push(res.data);
                    this.gardenTask = res.data;
                })
                .catch(this.handleError);
            
        },
    }
  });
