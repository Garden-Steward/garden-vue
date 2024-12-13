import { defineStore } from 'pinia';
import { fetchWrapper } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/message`;

export const useMessagesStore = defineStore({
  id: 'messages',
  
  state: () => ({
    taskMessages: [],
    loading: false
  }),

  getters: {
    getByGarden: (state) => (gardenId) => {
      return state.taskMessages.filter(msg => msg.gardenId === gardenId);
    },
  },

  actions: {
    handleError(err) {
      const alertStore = useAlertStore();
      alertStore.error(err);
      console.log("Message Error:", err);
    },

    async fetchByGarden(gardenId) {
      this.loading = true;
      try {
        return fetchWrapper.get(`${baseUrl}/garden/${gardenId}`)
          .then(res => this.taskMessages = res.messages)
          .catch(this.handleError)
          .finally(() => this.loading = false);
      } catch (error) {
        this.handleError(error);
        throw error;
      }
    },
  },
});