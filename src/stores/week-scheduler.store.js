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
              .then(res => this.weekscheduler = groupedSchedules(res.data))
              .catch(error => this.weekscheduler = { error })
      },
      async update(id, data) {
        return fetchWrapper.put(`${baseUrl}/${id}?populate=*`,{data: data})
            .then(res => {
                const day = res.data.attributes.day
                const idx = this.weekscheduler[day].findIndex(ws=> ws.id == res.data.id);
                this.weekscheduler[day][idx] = res.data.attributes;
                this.weekscheduler[day][idx].id = res.data.id;
                console.log("updated sched: ",this.weekscheduler)
            })
            .catch(this.handleError);
      },
      async register(data) {
        return fetchWrapper.post(`${baseUrl}?populate=*`,{data:data})
            .then(res => {
                // Add the new scheduler to the appropriate day
                const day = res.data.attributes.day;
                if (!this.weekscheduler[day]) {
                    this.weekscheduler[day] = [];
                }
                res.data.attributes.id = res.data.id;
                this.weekscheduler[day].push(res.data.attributes);
                return res.data;
            })
            .catch(this.handleError);
      },
      async delete(id) {
        return fetchWrapper.delete(`${baseUrl}/${id}`)
            .then(res => {
                // Find and remove the scheduler entry from state
                for (const day in this.weekscheduler) {
                    if (Array.isArray(this.weekscheduler[day])) {
                        const idx = this.weekscheduler[day].findIndex(ws => ws.id == id);
                        if (idx !== -1) {
                            this.weekscheduler[day].splice(idx, 1);
                            break;
                        }
                    }
                }
                console.log("delete: ", res)
            })
            .catch(this.handleError);
      }
    }

});

const groupedSchedules = (scheduleArr) => {
    const grouped = {};
    
    // Loop through schedules and group by day
    for (const wkS of scheduleArr) {
      grouped[wkS.attributes.day] = grouped[wkS.attributes.day] ? grouped[wkS.attributes.day] : [];
      wkS.attributes.id = wkS.id
      grouped[wkS.attributes.day].push(wkS.attributes);
    }
    return grouped;
  };