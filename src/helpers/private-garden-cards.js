function gardenKey(garden) {
    if (typeof garden.documentId === 'string' && garden.documentId.trim()) {
        return 'document:' + garden.documentId;
    }
    if (Number.isInteger(garden.id) && garden.id > 0) {
        return 'row:' + garden.id;
    }
    return Symbol();
}

function hasActor(people, userId) {
    if (!Array.isArray(people)) return false;
    return people.some(person => {
        if (person && typeof person === 'object') return person.id === userId;
        return person === userId;
    });
}

export function privateGardenCards(rows, userId) {
    const managed = new Map();
    const volunteered = new Map();
    if (Array.isArray(rows) && userId != null) {
        for (const garden of rows) {
            const key = gardenKey(garden);
            if (hasActor(garden.managers, userId) && !managed.has(key)) managed.set(key, garden);
            if (hasActor(garden.volunteers, userId) && !volunteered.has(key)) volunteered.set(key, garden);
        }
    }
    const joined = [];
    for (const [key, garden] of volunteered) {
        if (!managed.has(key)) joined.push(garden);
    }
    return { managed: [...managed.values()], joined, membershipCount: managed.size + joined.length };
}
