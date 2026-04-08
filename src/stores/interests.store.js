import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/interests`;

function gardenIdsFromStrapiEntry(entry) {
  const attrs = entry?.attributes ?? entry;
  const rel = attrs?.gardens?.data;
  if (!rel) return [];
  const list = Array.isArray(rel) ? rel : [];
  return list.map((g) => g.id).filter(Boolean);
}

export const useInterestsStore = defineStore({
  id: 'interests',
  state: () => ({
    all: [],
    loading: false,
    error: null,
  }),
  actions: {
    async findAll() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetchWrapper.get(
          `${baseUrl}?populate=gardens&pagination[pageSize]=100`
        );
        const rows = res.data ?? [];
        this.all = rows.map((row) => ({
          id: row.id,
          tag: row.attributes?.tag ?? row.tag,
          gardenIds: gardenIdsFromStrapiEntry(row),
        }));
      } catch (e) {
        this.error = e;
        this.all = [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * Append gardenId to interest's gardens relation (Strapi REST: full id list on update).
     */
    async addGardenToInterest(interestId, gardenId) {
      const res = await fetchWrapper.get(`${baseUrl}/${interestId}?populate=gardens`);
      const row = res.data;
      const ids = [...new Set([...gardenIdsFromStrapiEntry(row), gardenId])];
      await fetchWrapper.put(`${baseUrl}/${interestId}?populate=gardens`, {
        data: { gardens: ids },
      });
      const idx = this.all.findIndex((i) => i.id === interestId);
      if (idx !== -1) {
        this.all[idx] = { ...this.all[idx], gardenIds: ids };
      }
    },
  },
});
