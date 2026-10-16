import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/project-alerts`;

/**
 * Email alerts for newly approved projects in a city or zip. Public: no
 * account needed, but a signed-in visitor's token is sent so the API can use
 * their email and link the signup to them.
 */
export const useProjectAlertsStore = defineStore({
    id: 'projectAlerts',
    actions: {
        /** @param {{ email?: string, zip?: string, city?: string }} target */
        async subscribe(target) {
            return fetchWrapper.post(baseUrl, target);
        },
        async unsubscribe(token) {
            return fetchWrapper.get(`${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`);
        }
    }
});
