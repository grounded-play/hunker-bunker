// Pure tactical-formation coordinator for Sprint 47 Ring 1 encounters.
//
// The runtime owns sprites, sound, effects, damage, and networking. This
// module owns deterministic role cadence and the monotonic formation state:
// intact -> staggered -> broken -> cleared. Once coordination breaks, every
// role timer is discarded so an unloaded or resolved encounter cannot leave a
// delayed attack behind.

export const ENCOUNTER_ROLES = Object.freeze([
    'anchor',
    'suppressor',
    'flanker',
    'controller',
    'support'
]);

export const FORMATION_STATES = Object.freeze({
    INTACT: 'intact',
    STAGGERED: 'staggered',
    BROKEN: 'broken',
    CLEARED: 'cleared'
});

export const FORMATION_STATE_ORDER = Object.freeze([
    FORMATION_STATES.INTACT,
    FORMATION_STATES.STAGGERED,
    FORMATION_STATES.BROKEN,
    FORMATION_STATES.CLEARED
]);

// Every high-impact role action exposes both channels before it resolves.
// The runtime adapter in encounterRecipes.js renders these descriptors.
export const ROLE_TELEGRAPHS = Object.freeze({
    anchor: Object.freeze({
        attack: 'brace-slam', cadence: 5.4, windup: 0.85,
        audio: Object.freeze({ cue: 'metal-stress', playbackRate: 0.72 }),
        visual: Object.freeze({ kind: 'ground-ring', color: 0xffb347, radius: 2.8 })
    }),
    suppressor: Object.freeze({
        attack: 'suppression-volley', cadence: 4.6, windup: 1.0,
        audio: Object.freeze({ cue: 'ui_scan_ping', playbackRate: 1.55 }),
        visual: Object.freeze({ kind: 'sighting-line', color: 0xff4f45, radius: 8 })
    }),
    flanker: Object.freeze({
        attack: 'flank-burst', cadence: 5.0, windup: 0.7,
        audio: Object.freeze({ cue: 'ui_scan_ping', playbackRate: 0.82 }),
        visual: Object.freeze({ kind: 'direction-chevron', color: 0xe879f9, radius: 2.2 })
    }),
    controller: Object.freeze({
        attack: 'hazard-pulse', cadence: 5.8, windup: 1.1,
        audio: Object.freeze({ cue: 'ui_scan_ping', playbackRate: 0.48 }),
        visual: Object.freeze({ kind: 'hazard-ring', color: 0x67e8f9, radius: 4.5 })
    }),
    support: Object.freeze({
        attack: 'support-surge', cadence: 6.2, windup: 1.2,
        audio: Object.freeze({ cue: 'ui_scan_ping', playbackRate: 0.62 }),
        visual: Object.freeze({ kind: 'energy-tether', color: 0x86efac, radius: 5 })
    })
});

export const CLASS_ROLE_COUNTERPLAY = Object.freeze({
    SCOUT: Object.freeze({
        anchor: 'Slipstream around the frontal protection arc.',
        suppressor: 'Close the firing lane during volley recovery.',
        flanker: 'Match the flank burst with superior mobility.',
        controller: 'Exit the marked hazard before it resolves.',
        support: 'Reach and isolate the linked support unit.'
    }),
    TANK: Object.freeze({
        anchor: 'Seismic Slam staggers the formation anchor.',
        suppressor: 'Use the wide cleave to open the protected lane.',
        flanker: 'Hold the choke and punish the committed burst.',
        controller: 'Breach out of the denied route.',
        support: 'Knock linked units apart to sever protection.'
    }),
    ENGINEER: Object.freeze({
        anchor: 'Overcharge Pulse disables the protection window.',
        suppressor: 'EMP the telegraphed volley before release.',
        flanker: 'Turret coverage contests the side approach.',
        controller: 'Pulse through the hazard windup and reposition.',
        support: 'EMP interrupts the visible support tether.'
    })
});

const ACTIVE_STATES = new Set([FORMATION_STATES.INTACT, FORMATION_STATES.STAGGERED]);
const BREAK_ROLES = new Set(['anchor', 'suppressor', 'support']);

function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function deterministicUnit(seed, salt) {
    let value = ((Number(seed) >>> 0) ^ hashText(String(salt))) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;
    return (value >>> 0) / 0x100000000;
}

function normalizeMember(member, index) {
    const role = ENCOUNTER_ROLES.includes(member?.role) ? member.role : null;
    if (!role) throw new TypeError(`Unknown encounter role: ${String(member?.role)}`);
    return {
        id: String(member?.id ?? `member-${index}`),
        type: String(member?.type ?? ''),
        role,
        alive: member?.alive !== false,
        staggered: Boolean(member?.staggered),
        frozen: Boolean(member?.frozen),
        corroded: Boolean(member?.corroded)
    };
}

function initialRoleTimer(member, seed) {
    const telegraph = ROLE_TELEGRAPHS[member.role];
    const lead = telegraph.cadence * (0.55 + deterministicUnit(seed, member.id) * 0.35);
    return { cooldown: lead, pending: null };
}

export function createEncounterCoordinator({ encounterId, recipeId, seed = 0, members = [] } = {}) {
    const normalized = members.map(normalizeMember);
    if (!encounterId || !recipeId || normalized.length === 0) {
        throw new TypeError('Encounter coordination requires encounterId, recipeId, and at least one member.');
    }
    const ids = new Set(normalized.map((member) => member.id));
    if (ids.size !== normalized.length) throw new TypeError('Encounter member ids must be unique.');
    return {
        version: 1,
        encounterId: String(encounterId),
        recipeId: String(recipeId),
        seed: Number(seed) >>> 0,
        sequence: 0,
        elapsed: 0,
        formationState: FORMATION_STATES.INTACT,
        members: normalized,
        roleTimers: Object.fromEntries(normalized.map((member) => [member.id, initialRoleTimer(member, seed)]))
    };
}

function withMember(state, memberId, transform) {
    let found = false;
    const members = state.members.map((member) => {
        if (member.id !== memberId) return member;
        found = true;
        return transform(member);
    });
    return found ? { ...state, members } : state;
}

function nextStateEvents(state, targetState, reason, memberId = null) {
    const currentIndex = FORMATION_STATE_ORDER.indexOf(state.formationState);
    const targetIndex = FORMATION_STATE_ORDER.indexOf(targetState);
    if (targetIndex <= currentIndex) return { state, events: [] };
    let next = state;
    const events = [];
    for (let index = currentIndex + 1; index <= targetIndex; index += 1) {
        const formationState = FORMATION_STATE_ORDER[index];
        next = {
            ...next,
            sequence: next.sequence + 1,
            formationState,
            roleTimers: ACTIVE_STATES.has(formationState) ? next.roleTimers : {}
        };
        events.push({
            type: 'formation-state',
            formationState,
            reason,
            memberId,
            sequence: next.sequence
        });
    }
    return { state: next, events };
}

function tickActiveCoordinator(state, delta) {
    const elapsed = state.elapsed + delta;
    let sequence = state.sequence;
    const events = [];
    const roleTimers = {};
    for (const member of state.members) {
        if (!member.alive) continue;
        const descriptor = ROLE_TELEGRAPHS[member.role];
        const timer = state.roleTimers[member.id] ?? initialRoleTimer(member, state.seed);
        if (timer.pending) {
            const remaining = timer.pending.remaining - delta;
            if (remaining <= 0) {
                sequence += 1;
                events.push({
                    type: 'role-attack',
                    memberId: member.id,
                    role: member.role,
                    attack: descriptor.attack,
                    sequence
                });
                roleTimers[member.id] = { cooldown: descriptor.cadence, pending: null };
            } else {
                roleTimers[member.id] = { cooldown: timer.cooldown, pending: { ...timer.pending, remaining } };
            }
            continue;
        }
        const cooldown = timer.cooldown - delta;
        if (cooldown <= 0) {
            sequence += 1;
            events.push({
                type: 'role-telegraph',
                memberId: member.id,
                role: member.role,
                attack: descriptor.attack,
                windup: descriptor.windup,
                audio: descriptor.audio,
                visual: descriptor.visual,
                sequence
            });
            roleTimers[member.id] = {
                cooldown: 0,
                pending: { attack: descriptor.attack, remaining: descriptor.windup }
            };
        } else {
            roleTimers[member.id] = { cooldown, pending: null };
        }
    }
    return { state: { ...state, elapsed, sequence, roleTimers }, events };
}

/**
 * Pure reducer. Supported actions: TICK, MEMBER_STAGGERED, MEMBER_DEFEATED,
 * MEMBER_STATUS, and CLEAR. Returns a new state plus ordered runtime events.
 */
export function coordinateEncounter(state, action = {}) {
    if (!state || !FORMATION_STATE_ORDER.includes(state.formationState)) {
        throw new TypeError('Invalid encounter coordination state.');
    }
    switch (action.type) {
        case 'TICK': {
            const delta = Math.max(0, Number(action.delta) || 0);
            if (delta === 0 || !ACTIVE_STATES.has(state.formationState)) return { state, events: [] };
            return tickActiveCoordinator(state, delta);
        }
        case 'MEMBER_STAGGERED': {
            const member = state.members.find((entry) => entry.id === action.memberId);
            if (!member?.alive || state.formationState !== FORMATION_STATES.INTACT) return { state, events: [] };
            const marked = withMember(state, member.id, (entry) => ({ ...entry, staggered: true }));
            return nextStateEvents(marked, FORMATION_STATES.STAGGERED, action.reason ?? 'member-staggered', member.id);
        }
        case 'MEMBER_STATUS': {
            const member = state.members.find((entry) => entry.id === action.memberId);
            if (!member?.alive) return { state, events: [] };
            const statusId = String(action.statusId ?? '');
            const active = action.active !== false;
            let marked = state;
            if (statusId === 'freeze' || statusId === 'frozen') {
                marked = withMember(state, member.id, (entry) => ({ ...entry, frozen: active }));
                if (active && state.formationState === FORMATION_STATES.INTACT) {
                    return nextStateEvents(marked, FORMATION_STATES.STAGGERED, 'anchor-frozen', member.id);
                }
            } else if (statusId === 'corrosion' || statusId === 'corroded') {
                marked = withMember(state, member.id, (entry) => ({ ...entry, corroded: active }));
            }
            return { state: marked, events: [] };
        }
        case 'MEMBER_DEFEATED': {
            const member = state.members.find((entry) => entry.id === action.memberId);
            if (!member?.alive || state.formationState === FORMATION_STATES.CLEARED) return { state, events: [] };
            const marked = withMember(state, member.id, (entry) => ({ ...entry, alive: false }));
            const alive = marked.members.filter((entry) => entry.alive);
            if (alive.length === 0) return nextStateEvents(marked, FORMATION_STATES.CLEARED, 'all-members-defeated', member.id);
            if (BREAK_ROLES.has(member.role)) {
                return nextStateEvents(marked, FORMATION_STATES.BROKEN, `${member.role}-defeated`, member.id);
            }
            return { state: marked, events: [] };
        }
        case 'CLEAR':
            return nextStateEvents(state, FORMATION_STATES.CLEARED, action.reason ?? 'encounter-cleared');
        default:
            return { state, events: [] };
    }
}

/**
 * Read Lane 3 statuses without mutating them. `getStatus` is injected so this
 * module remains loadable while lanes land independently. A frozen member
 * staggers coordination; corrosion is recorded for protection math.
 */
export function reconcileEncounterStatuses(state, targetsById, getStatus) {
    if (typeof getStatus !== 'function' || !ACTIVE_STATES.has(state.formationState)) {
        return { state, events: [] };
    }
    let next = state;
    const events = [];
    for (const member of state.members) {
        if (!member.alive) continue;
        const target = targetsById?.get?.(member.id) ?? targetsById?.[member.id];
        if (!target) continue;
        const freeze = getStatus(target, 'freeze') ?? getStatus(target, 'frozen');
        const corrosion = getStatus(target, 'corrosion') ?? getStatus(target, 'corroded');
        for (const [statusId, status] of [['freeze', freeze], ['corrosion', corrosion]]) {
            // Lane 3 exposes partial chill as an active freeze status. Only a
            // completed freeze breaks formation; partial stacks must not.
            const active = statusId === 'freeze' && typeof status?.isFrozen === 'boolean'
                ? status.isFrozen
                : Boolean(status && status.active !== false && (status.stacks ?? 1) > 0);
            const already = statusId === 'freeze' ? member.frozen : member.corroded;
            if (active === already) continue;
            const result = coordinateEncounter(next, { type: 'MEMBER_STATUS', memberId: member.id, statusId, active });
            next = result.state;
            events.push(...result.events);
        }
    }
    return { state: next, events };
}

/** Protection supplied by an intact Anchor/Support formation. */
export function encounterDamageMultiplier(state, targetMemberId) {
    const target = state?.members?.find((member) => member.id === targetMemberId && member.alive);
    if (!target || !ACTIVE_STATES.has(state.formationState)) return 1;
    const anchor = state.members.find((member) => member.alive && member.role === 'anchor' && !member.frozen);
    const support = state.members.find((member) => member.alive && member.role === 'support' && !member.frozen && !member.corroded);
    if (target.role !== 'anchor' && anchor) return support ? 0.45 : 0.65;
    if (target.role === 'anchor' && support) return 0.75;
    return 1;
}

export function counterplayFor(playerClass, role) {
    return CLASS_ROLE_COUNTERPLAY[String(playerClass ?? '').toUpperCase()]?.[role] ?? null;
}

export function encounterHasOrphanedTimers(state) {
    if (ACTIVE_STATES.has(state?.formationState)) return false;
    return Object.keys(state?.roleTimers ?? {}).length > 0;
}
