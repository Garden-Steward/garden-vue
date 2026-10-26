export function blankJoinDraft() {
    return {
        preferredNameRaw: '', emailRaw: '', phoneRaw: '',
        preferences: {
            gardenDocumentIds: [], interestIds: [], offeredSkillIds: [], learningSkillIds: [],
            availabilityIds: [], taskPreferenceIds: [], experience: null,
        },
        accessRequestRaw: '', saveReusableProfile: true, profileVersion: null,
    };
}

export function browserSecret() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
}

export function isConfirmedJoin(join) {
    return ['confirmed', 'already_confirmed'].includes(join?.kind) && join?.receipt?.rsvp === 'confirmed';
}

export async function readOwnConfirmedKeys(requestPage, isCurrent = () => true) {
    const receipts = new Map();
    let expectedTotal;
    for (let page = 1; page <= 1000; page++) {
        const result = await requestPage(page, 100);
        if (!isCurrent()) return null;
        const pagination = result?.meta?.pagination;
        if (!Array.isArray(result?.data) || !pagination || pagination.page !== page || pagination.pageSize !== 100 ||
            !Number.isSafeInteger(pagination.total) || pagination.total < 0 || pagination.total > 100000 ||
            pagination.pageCount !== Math.ceil(pagination.total / 100) || result.data.length > 100) throw new Error('Your event status returned an invalid response.');
        if (page === 1) expectedTotal = pagination.total;
        if (expectedTotal !== pagination.total || (page < pagination.pageCount && result.data.length !== 100)) throw new Error('Your event status changed while loading. Try again.');
        for (const receipt of result.data) {
            if (!receipt || typeof receipt.receiptId !== 'string' || !/^[a-f0-9]{64}$/.test(receipt.receiptId) ||
                typeof receipt.eventDocumentId !== 'string' || !/^[a-z0-9]{10,40}$/i.test(receipt.eventDocumentId) ||
                !['none', 'confirmed', 'cancelled'].includes(receipt.rsvp)) throw new Error('Your event status contains an invalid receipt.');
            if (receipts.has(receipt.receiptId)) throw new Error('Your event status contains a repeated receipt.');
            receipts.set(receipt.receiptId, receipt);
        }
        if (page >= pagination.pageCount) {
            if (receipts.size !== expectedTotal) throw new Error('Your event status is incomplete. Try again.');
            return new Set([...receipts.values()].filter(receipt => receipt.rsvp === 'confirmed').map(receipt => receipt.eventDocumentId));
        }
    }
    throw new Error('There are too many events to load.');
}

export async function participationRequest(baseUrl, path, { token, body, method = 'GET' } = {}) {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const options = { method, headers, cache: 'no-store' };
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }
    const response = await fetch(`${baseUrl}/api${path}`, options);
    const result = await response.json();
    if (!response.ok && response.status !== 428) {
        const error = new Error(result.error?.message || 'We could not save this yet. Please try again.');
        error.code = result.error?.code;
        error.fieldErrors = result.error?.fieldErrors || {};
        error.status = response.status;
        throw error;
    }
    return result;
}
