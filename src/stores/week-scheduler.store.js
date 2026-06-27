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
                // v5 returns a flat entry (fields + id directly on res.data).
                const sched = res.data;
                const day = sched.day;
                const idx = this.weekscheduler[day].findIndex(ws=> ws.id == sched.id);
                this.weekscheduler[day][idx] = sched;
            })
            .catch(this.handleError);
      },
      async register(data) {
        return fetchWrapper.post(`${baseUrl}?populate=*`,{data:data})
            .then(res => {
                // Add the new scheduler to the appropriate day
                const sched = res.data;
                const day = sched.day;
                if (!this.weekscheduler[day]) {
                    this.weekscheduler[day] = [];
                }
                this.weekscheduler[day].push(sched);
                return sched;
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

    // v5 entries are flat — group by day, push the entry as-is.
    for (const wkS of (Array.isArray(scheduleArr) ? scheduleArr : [])) {
      const day = wkS.day;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(wkS);
    }
    return grouped;
  };