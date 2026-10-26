import { fetchWrapper } from '@/helpers/fetch-wrapper';

const MAX_TOTAL = 100000;
const PAGE_SIZE = 100;

export async function readPublicPage(url, page = 1, pageSize = PAGE_SIZE) {
    const response = await fetchWrapper.get(`${url}?pagination[page]=${page}&pagination[pageSize]=${pageSize}`);
    const pagination = response?.meta?.pagination;
    if (!Array.isArray(response?.data) || !pagination) {
        throw new Error('Invalid public directory response');
    }
    const values = [pagination.page, pagination.pageSize, pagination.pageCount, pagination.total];
    if (!values.every(Number.isSafeInteger) || pagination.page !== page || pagination.pageSize !== pageSize ||
        pagination.total < 0 ||
        pagination.pageCount !== Math.ceil(pagination.total / pageSize) ||
        response.data.length !== Math.min(pageSize, Math.max(0, pagination.total - (page - 1) * pageSize))) {
        throw new Error('Invalid public directory pagination');
    }
    const identities = new Set();
    for (const entry of response.data) {
        if (typeof entry?.documentId !== 'string' || !entry.documentId) {
            throw new Error('Invalid public directory identity');
        }
        identities.add(entry.documentId);
    }
    if (identities.size !== response.data.length) throw new Error('Duplicate public directory identity');
    return response;
}

export async function readPublicCollection(url) {
    const first = await readPublicPage(url);
    const { total, pageCount } = first.meta.pagination;
    if (total > MAX_TOTAL) throw new Error('This directory is too large to load. Please try again later.');
    const entries = new Map(first.data.map(entry => [entry.documentId, entry]));
    for (let page = 2; page <= pageCount; page += 1) {
        const response = await readPublicPage(url, page);
        if (response.meta.pagination.total !== total) {
            throw new Error('The directory changed while loading. Please try again.');
        }
        for (const entry of response.data) entries.set(entry.documentId, entry);
    }
    if (entries.size !== total) {
        throw new Error('The directory changed while loading. Please try again.');
    }
    return {
        data: [...entries.values()],
        meta: { pagination: { page: Math.max(1, pageCount), pageSize: PAGE_SIZE, pageCount, total } }
    };
}
