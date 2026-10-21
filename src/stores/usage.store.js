import { defineStore } from 'pinia';

import { fetchWrapper } from '@/helpers';
import { useAlertStore } from './alert.store';
import { useAuthStore } from './auth.store';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/organizations`;

const CATEGORIES = ['broadcast', 'reminder', 'transactional'];

function normalizeReport(d) {
    if (!d) return null;
    const current = d.current || {};
    const byCategory = {};
    CATEGORIES.forEach((k) => {
        byCategory[k] = {
            units: Number(current.byCategory?.[k]?.units) || 0,
            messages: Number(current.byCategory?.[k]?.messages) || 0
        };
    });
    return {
        ...d,
        organization: d.organization || null,
        freeUnits: d.freeUnits ?? 500,
        current: {
            ...current,
            units: current.units || 0,
            messages: current.messages || 0,
            byCategory,
            byGarden: Array.isArray(current.byGarden) ? current.byGarden : [],
            nonBillable: current.nonBillable || { units: 0, messages: 0 }
        },
        history: Array.isArray(d.history) ? d.history : []
    };
}

/**
 * Read-only SMS usage for organizations the signed-in user can see.
 * Keys are always the organization documentId string.
 */
export const useUsageStore = defineStore({
    id: 'usage',
    state: () => ({
        orgs: [],
        orgsLoaded: false,
        orgsUserId: null,
        orgsPromise: null,
        report: null,
        reportLoading: false,
        reportNotFound: false,
        reportError: false,
        _seq: 0
    }),
    actions: {
        loadOrgs({ force = false } = {}) {
            const userId = useAuthStore().user?.id;
            if (!userId) {
                this.orgs = [];
                return;
            }
            if (!force && this.orgsUserId === userId) {
                if (this.orgsPromise) return this.orgsPromise;
                if (this.orgsLoaded) return;
            }
            this.orgsUserId = userId;
            this.orgsLoaded = false;
            const promise = fetchWrapper.get(`${baseUrl}/usage`)
                .then((res) => {
                    this.orgs = Array.isArray(res?.data) ? res.data : [];
                    this.orgsLoaded = true;
                })
                .catch((err) => {
                    // Background fetch on every manage page: do not alert.
                    this.orgs = [];
                    this.orgsLoaded = true;
                    console.error('Usage orgs error:', err);
                })
                .finally(() => {
                    if (this.orgsPromise === promise) this.orgsPromise = null;
                });
            this.orgsPromise = promise;
            return promise;
        },
        async loadReport(documentId, months = 6) {
            const token = ++this._seq;
            this.reportLoading = true;
            this.reportNotFound = false;
            this.reportError = false;
            this.report = null;
            try {
                const res = await fetchWrapper.get(
                    `${baseUrl}/${encodeURIComponent(documentId)}/usage?months=${months}`
                );
                if (token !== this._seq) return;
                this.report = normalizeReport(res?.data);
            } catch (err) {
                if (token !== this._seq) return;
                if (err?.status === 404) {
                    this.reportNotFound = true;
                } else {
                    this.reportError = true;
                    this.handleError(err);
                }
            } finally {
                if (token === this._seq) this.reportLoading = false;
            }
        },
        handleError(err) {
            useAlertStore().error(err);
        }
    }
});
