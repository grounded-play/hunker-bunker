// The people at a camp besides its leader (Sprint 51). Session 2026-10-06:
// "I should be able to talk to the camp members". Each camp's two worker
// figures have a name and a job, and survivors the player settles there stay
// as residents too. What they say comes from their job and the camp's state;
// the lines are i18n keys, written out so the locale audit sees each one.

export const RESIDENT_ROLES = Object.freeze(['mechanic', 'medic', 'lookout', 'cook', 'radio', 'scavenger']);

const ROLE_LINE_KEYS = Object.freeze({
    mechanic: ['ui.camp_resident.mechanic.1', 'ui.camp_resident.mechanic.2', 'ui.camp_resident.mechanic.3'],
    medic: ['ui.camp_resident.medic.1', 'ui.camp_resident.medic.2', 'ui.camp_resident.medic.3'],
    lookout: ['ui.camp_resident.lookout.1', 'ui.camp_resident.lookout.2', 'ui.camp_resident.lookout.3'],
    cook: ['ui.camp_resident.cook.1', 'ui.camp_resident.cook.2', 'ui.camp_resident.cook.3'],
    radio: ['ui.camp_resident.radio.1', 'ui.camp_resident.radio.2', 'ui.camp_resident.radio.3'],
    scavenger: ['ui.camp_resident.scavenger.1', 'ui.camp_resident.scavenger.2', 'ui.camp_resident.scavenger.3']
});

const ROLE_NAME_KEYS = Object.freeze({
    mechanic: 'ui.camp_resident.role.mechanic',
    medic: 'ui.camp_resident.role.medic',
    lookout: 'ui.camp_resident.role.lookout',
    cook: 'ui.camp_resident.role.cook',
    radio: 'ui.camp_resident.role.radio',
    scavenger: 'ui.camp_resident.role.scavenger',
    settler: 'ui.camp_resident.role.settler'
});

const SETTLER_LINE_KEYS = Object.freeze(['ui.camp_resident.settler.1', 'ui.camp_resident.settler.2', 'ui.camp_resident.settler.3']);
const WORRIED_LINE_KEYS = Object.freeze(['ui.camp_resident.worried.1', 'ui.camp_resident.worried.2']);

const AUTHORED_RESIDENTS = Object.freeze({
    camp_meridian: [{ name: 'Rook', role: 'mechanic' }, { name: 'Ilse', role: 'radio' }],
    camp_tallow: [{ name: 'Brannick', role: 'cook' }, { name: 'Sefa', role: 'medic' }],
    camp_vesper: [{ name: 'Dace', role: 'lookout' }, { name: 'Nell', role: 'scavenger' }]
});

const NAME_POOL = Object.freeze(['Arlo', 'Wren', 'Tobin', 'Mags', 'Corwin', 'Pip', 'Odile', 'Jory', 'Hesper', 'Quill', 'Marta', 'Fenn']);

function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return value >>> 0;
}

/** The camp's resident workers, in worker-figure order. */
export function campResidents(campId) {
    if (AUTHORED_RESIDENTS[campId]) return AUTHORED_RESIDENTS[campId];
    const seed = hash(String(campId));
    return [0, 1].map((index) => ({
        name: NAME_POOL[(seed >>> (index * 5)) % NAME_POOL.length],
        role: RESIDENT_ROLES[(seed >>> (index * 7 + 3)) % RESIDENT_ROLES.length]
    }));
}

export function residentRoleKey(role) {
    return ROLE_NAME_KEYS[role] ?? ROLE_NAME_KEYS.settler;
}

/**
 * What a resident says on their `talks`-th conversation: a worried line while
 * the camp is breached or overrun, a settler's own lines, else their job's.
 */
export function residentLineKey(resident, { talks = 0, condition = 'intact' } = {}) {
    const lines = ['breached', 'overrun'].includes(condition)
        ? WORRIED_LINE_KEYS
        : resident?.role === 'settler'
            ? SETTLER_LINE_KEYS
            : ROLE_LINE_KEYS[resident?.role] ?? SETTLER_LINE_KEYS;
    return lines[Math.abs(Math.floor(talks)) % lines.length];
}
