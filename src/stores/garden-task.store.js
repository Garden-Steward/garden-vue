import { defineStore } from 'pinia';

import { fetchWrapper, stripReadOnly } from '@/helpers';
import { useAlertStore } from '@/stores';

const baseUrl = `${import.meta.env.VITE_API_URL}/api/garden-tasks`;
const recurringUrl = `${import.meta.env.VITE_API_URL}/api/recurring-tasks`;

/**
 * Strapi v5 returns flat entries with relations/media already de-nested.
 * Guarantee the volunteers relation is always an array so consumers can iterate.
 */
function normalizeGardenTask(task) {
    if (!task) return task;
    if (!Array.isArray(task.volunteers)) task.volunteers = [];
    return task;
}

export const useGardenTaskStore = defineStore({
    id: 'gardenTasks',
    state: () => ({
        gardenTasks: {},
        gardenTask: {},
        recurringTasks: [],
        userTasks: {}
    }),
    actions: {
        handleError(err) {
            const alertStore = useAlertStore();  
            alertStore.error(err);
            console.log("Garden Task Error: ", err)
        },
        async findById(id) {
            this.gardenTask = { loading: true };
            // v5 core findOne keys on documentId; the route gives a numeric id,
            // so resolve via a filter on the collection (permitted) and take [0].
            return fetchWrapper.get(`${baseUrl}?filters[id][$eq]=${id}&populate[0]=volunteers&populate[1]=primary_image&populate[2]=instruction&populate[3]=garden`)
                .then(response => {
                    const arr = Array.isArray(response.data) ? response.data : [];
                    const task = arr.length ? normalizeGardenTask(arr[0]) : null;
                    this.gardenTask = task ?? { error: 'Task not found' };
                    return task;
                })
                .catch(error => {
                    this.gardenTask = { error };
                    this.handleError(error);
                });
        },
        async getUserTasks() {
            this.userTasks = { loading: true };
            return fetchWrapper.get(`${baseUrl}/user?populate[0]=garden&populate[1]=primary_image`)
                .then(response => {
                    const raw = Array.isArray(response) ? response : (response?.data ?? []);
                    const tasks = (Array.isArray(raw) ? raw : [raw]).map(normalizeGardenTask);
                    this.userTasks = tasks;
                    return tasks;
                })
                .catch(error => {
                    this.userTasks = { error };
                    this.handleError(error);
                });
        },
        async getGardenTasks(gardenId) {
            return fetchWrapper.get(`${baseUrl}?populate[0]=volunteers&populate[1]=recurring_task&populate[2]=primary_image&populate[3]=instruction&filters[garden][id][$eq]=${gardenId}&filters[status][$nei]=finished`)
                .then(response => {
                    const tasks = (Array.isArray(response.data) ? response.data : [response.data]).map(normalizeGardenTask);
                    this.gardenTasks = tasks;
                    return tasks;
                })
                .catch(this.handleError);
        },
        async update(id, data) {
            data = stripReadOnly(data);
            if (data.primary_image?.id) {
                data.primary_image = {
                    id: data.primary_image.id
                };
            }

            // v5 core update keys on documentId; resolve it from the cached task
            // (the numeric id comes from the route/props).
            const cached = (Array.isArray(this.gardenTasks) ? this.gardenTasks : []).find(t => t.id === id)
                || (this.gardenTask?.id === id ? this.gardenTask : null);
            const documentId = cached?.documentId ?? id;

            return fetchWrapper.put(`${baseUrl}/${documentId}?populate=primary_image`, { data: data })
                .then(response => {
                    if (!response?.data) return response;

                    // v5 returns a flat entry.
                    const updated = normalizeGardenTask(response.data);

                    // Update the single task in gardenTasks so UI (e.g. task cards) reflects the change
                    const tasks = Array.isArray(this.gardenTasks) ? this.gardenTasks : [];
                    const index = tasks.findIndex(t => t.id === updated.id || t.id === id);
                    if (index !== -1) {
                        this.gardenTasks = tasks.map((t, i) => i === index ? { ...t, ...updated } : t);
                    } else {
                        // Task not in list (e.g. different garden); still push so refs stay in sync
                        this.gardenTasks = [...tasks, updated];
                    }

                    return updated;
                })
                .catch(this.handleError);
        },
        async register(data) {
            data = stripReadOnly(data);
            if (data.primary_image?.id) {
                data.primary_image = {
                    id: data.primary_image.id
                };
            }

            return fetchWrapper.post(`${baseUrl}?populate=primary_image`, { data: data })
                .then(response => {
                    if (response?.data?.id) {
                        const normalized = normalizeGardenTask(response.data);
                        const tasks = Array.isArray(this.gardenTasks) ? [...this.gardenTasks] : [];
                        const withoutDup = tasks.filter((t) => t.id !== normalized.id);
                        this.gardenTasks = [normalized, ...withoutDup];
                        return normalized;
                    }
                    return response;
                })
                .catch(this.handleError);
        },
        async uploadImage(formData) {
            return fetchWrapper.post(`${import.meta.env.VITE_API_URL}/api/upload`, formData)
                .then(res => {
                    const uploadedFile = Array.isArray(res) ? res[0] : res;
                    return {
                        url: uploadedFile.url,
                        id: uploadedFile.id
                    };
                })
                .catch(error => {
                    const alertStore = useAlertStore();
                    alertStore.error('Failed to upload image');
                    throw error;
                });
        },
        async getRecurringTasks(gardenId) {
            return fetchWrapper.get(`${recurringUrl}?populate=*&filters[garden][id][$eq]=${gardenId}`)
                .then(response => {
                    this.recurringTasks = response.data;
                })
        },
        async registerRecurring(data) {
            data = stripReadOnly(data);
            if (data.primary_image?.id) {
                data.primary_image = { id: data.primary_image.id };
            }
            return fetchWrapper.post(`${recurringUrl}?populate=*`, { data })
                .then(response => {
                    if (response?.data) {
                        const list = Array.isArray(this.recurringTasks) ? this.recurringTasks : [];
                        this.recurringTasks = [...list, response.data];
                    }
                    return response?.data;
                })
                .catch(this.handleError);
        },
        async updateRecurring(id, data) {
            const payload = stripReadOnly(data);
            if (payload.primary_image?.id) {
                payload.primary_image = { id: payload.primary_image.id };
            }
            if (payload.instruction === undefined) {
                delete payload.instruction;
            } else if (payload.instruction === null) {
                payload.instruction = null;
            } else if (typeof payload.instruction === 'number') {
                // plain document id from form
            } else if (payload.instruction?.id != null) {
                payload.instruction = payload.instruction.id;
            }

            // v5 core update keys on documentId; resolve it from the cached recurring task.
            const cachedRecurring = (Array.isArray(this.recurringTasks) ? this.recurringTasks : []).find(t => t.id === id);
            const recurringDocId = cachedRecurring?.documentId ?? id;

            return fetchWrapper.put(`${recurringUrl}/${recurringDocId}?populate=*`, { data: payload })
                .then(response => {
                    if (!response?.data) return response;

                    // v5 returns a flat entry.
                    const normalized = response.data;
                    const list = Array.isArray(this.recurringTasks) ? [...this.recurringTasks] : [];
                    const idx = list.findIndex((t) => t.id === normalized.id);
                    if (idx !== -1) {
                        list[idx] = normalized;
                    } else {
                        list.push(normalized);
                    }
                    this.recurringTasks = list;

                    return normalized;
                })
                .catch(this.handleError);
        },
        async delete(id) {
            // First get the task to check its status
            const task = this.gardenTasks.find(t => t.id === id);
            if (!task) {
                throw new Error('Task not found');
            }

            // Only allow deletion if status is INITIALIZED
            if (task.status !== 'INITIALIZED') {
                throw new Error('Cannot delete task: Only tasks with INITIALIZED status can be deleted');
            }

            // v5 core delete keys on documentId.
            return fetchWrapper.delete(`${baseUrl}/${task.documentId ?? id}`)
                .then(() => {
                    // Remove the task from the store
                    this.gardenTasks = this.gardenTasks.filter(t => t.id !== id);
                    return true;
                })
                .catch(this.handleError);
        },
        async getTasksByGardenSlug(slug) {
            return fetchWrapper.get(`${baseUrl}?populate[0]=volunteers&populate[1]=recurring_task&populate[2]=primary_image&populate[3]=garden&populate[4]=instruction&filters[garden][slug][$eq]=${slug}&filters[status][$nei]=finished`)
                .then(response => {
                    const tasks = (Array.isArray(response.data) ? response.data : [response.data]).map(normalizeGardenTask);
                    this.gardenTasks = tasks;
                    return tasks;
                })
                .catch(this.handleError);
        },
        async assignTaskViaSMS(taskId, phoneNumber) {
            return fetchWrapper.post(`${baseUrl}/rsvp/${taskId}`, {
                data: {
                    phoneNumber
                }
            })
                .then(response => {
                    return response;
                })
                .catch(error => {
                    const alertStore = useAlertStore();
                    alertStore.error(error.message || 'Failed to send SMS assignment');
                    throw error;
                });
        }
    }
  });
