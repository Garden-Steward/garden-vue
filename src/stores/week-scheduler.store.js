import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/schedulers`;

export const useWeekSchedulerStore = defineStore({
    id: 'weekscheduler',
    state: () => ({
        weekscheduler: {}
    }),
    actions: {
      // Every write below routes failures here; without it the rejection was
      // swallowed and a failed save looked like a no-op in the UI.
      handleError(err) {
        const alertStore = useAlertStore();
        const message = err?.message || err || 'Schedule update failed';
        alertStore.error(message);
        console.error('Week Scheduler Error: ', err);
      },
      // Takes a garden object (preferred) or a bare numeric id. Garden is
      // draft-and-publish in Strapi v5, so its draft and published rows have
      // different numeric ids; the id on the manage page can be the draft
      // row's while schedulers link to the published one. Filter on
      // documentId, which both rows share (same fix as #85 for recurring tasks).
      async find(garden) {
          this.weekscheduler = { loading: true };
          const gardenFilter = garden?.documentId
              ? `filters[garden][documentId][$eq]=${garden.documentId}`
              : `filters[garden][id][$eq]=${garden?.id ?? garden}`;
          return fetchWrapper.get(`${baseUrl}?populate=*&${gardenFilter}&pagination[pageSize]=200`)
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
                const day = sched?.day;
                if (!day) return sched;
                // A `day` change moves the entry, so drop it from any other day.
                for (const otherDay in this.weekscheduler) {
                    if (otherDay === day || !Array.isArray(this.weekscheduler[otherDay])) continue;
                    const oldIdx = this.weekscheduler[otherDay].findIndex(ws => ws.id == sched.id);
                    if (oldIdx !== -1) this.weekscheduler[otherDay].splice(oldIdx, 1);
                }
                if (!Array.isArray(this.weekscheduler[day])) this.weekscheduler[day] = [];
                const entries = this.weekscheduler[day];
                const idx = entries.findIndex(ws => ws.id == sched.id);
                if (idx === -1) entries.push(sched);
                else entries[idx] = sched;
                return sched;
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