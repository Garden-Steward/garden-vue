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
        // v5 core update keys on documentId; the UI passes a numeric id, so
        // resolve the documentId from cached state (fall back to id).
        const documentId = findCachedSched(this.weekscheduler, id)?.documentId ?? id;
        return fetchWrapper.put(`${baseUrl}/${documentId}?populate=*`,{data: data})
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
        // v5 core delete keys on documentId.
        const documentId = findCachedSched(this.weekscheduler, id)?.documentId ?? id;
        return fetchWrapper.delete(`${baseUrl}/${documentId}`)
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

// Locate a cached scheduler entry by numeric id across all day buckets.
const findCachedSched = (weekscheduler, id) => {
    if (!weekscheduler || typeof weekscheduler !== 'object') return null;
    for (const day in weekscheduler) {
        const entries = weekscheduler[day];
        if (!Array.isArray(entries)) continue;
        const match = entries.find(ws => ws.id == id || ws.documentId == id);
        if (match) return match;
    }
    return null;
};

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