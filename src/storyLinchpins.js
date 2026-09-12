import { ACT2_ENDINGS } from './act2Endings.js';

/**
 * Story linchpins — irreversible choices that move faction standing and close
 * off endings.
 *
 * See docs/superpowers/specs/2026-09-11-story-linchpins-design.md for the
 * narrative reasoning behind each lock table; it is reasoned from what each
 * ending means in endingExplanations.js and what its cascade branch requires,
 * not chosen for balance.
 *
 * Linchpins add NO new consequence state. act2.js already owns humanity, camp
 * bond, camp status and the ten-ending cascade; a linchpin records a decision
 * and applies deltas to that. The only change to ending logic is a lock filter.
 */

/**
 * Endings a linchpin may never lock.
 *
 * The cascade falls through to MIXED_CREW, so it is the floor that keeps the
 * system from closing every door. A consequence mechanic that can leave zero
 * reachable endings is a soft-lock generator; this is the guard, and
 * storyLinchpins.test.js walks every combination of resolutions to prove it
 * holds.
 */
export const NEVER_LOCKED_ENDINGS = Object.freeze([ACT2_ENDINGS.MIXED_CREW]);

export const STORY_LINCHPINS = Object.freeze({
    mayor_tina: Object.freeze({
        id: 'mayor_tina',
        resolutions: Object.freeze({
            // Tina transforms -- her encounter carries originalOverlay and
            // transformedOverlay. Killing her is exterminating an infiltrator
            // wearing a human face, which is why camps approve.
            killed: Object.freeze({
                // humanity tracks the player's own infection and masking, not
                // reputation: killing an infiltrator does not cure you. The
                // small bump is reinforced cover from acting publicly human;
                // camp standing carries the real reward.
                humanity: 5,
                campBondAll: 1,
                locksEndings: Object.freeze([
                    ACT2_ENDINGS.ALIEN_EXODUS,          // hives will not ally with their agent's killer
                    ACT2_ENDINGS.FULL_BROOD,            // obedience path broken
                    ACT2_ENDINGS.MOTHERSHIP_INFECTION   // the infiltration you would have carried is gone
                ]),
                codexNote: 'linchpin_tina_killed'
            }),
            joined: Object.freeze({
                humanity: -30,
                campBondAll: -2,
                locksEndings: Object.freeze([
                    ACT2_ENDINGS.CLEAN_ESCAPE,  // you are the hive link; it cannot be broken
                    ACT2_ENDINGS.SCORCHED_SKY   // a carrier does not purge its own brood
                    // OUTED_ESCAPE is deliberately NOT locked: "the survivors
                    // boarded knowing what you are" becomes more apt, not less.
                ]),
                codexNote: 'linchpin_tina_joined'
            })
        })
    }),

    // Okonkwo-Vass already asks, in shipped dialogue: "DON'T KILL ONE. TALK TO
    // ONE. PROVE ME RIGHT." That request had no mechanical consequence. It is
    // the cheapest linchpin in the game to reach and the earliest, which makes
    // it the right place to teach the player that choices close doors.
    scientist_specimen: Object.freeze({
        id: 'scientist_specimen',
        resolutions: Object.freeze({
            proved: Object.freeze({
                // Standing your ground in front of something that could kill
                // you, and not shooting, is not a humanity change -- it is a
                // change in what the hives are willing to believe about you.
                humanity: 0,
                campBondAll: 0,
                locksEndings: Object.freeze([]),
                codexNote: 'linchpin_specimen_proved'
            }),
            dismissed: Object.freeze({
                humanity: 0,
                campBondAll: 0,
                // The one human who would have vouched for the hives watched
                // you kill the specimen she asked you to spare. Without her
                // testimony the exodus has no advocate.
                locksEndings: Object.freeze([ACT2_ENDINGS.ALIEN_EXODUS]),
                codexNote: 'linchpin_specimen_dismissed'
            })
        })
    }),

    // The Queen's offer. queenStatus already tracked the outcome; as a linchpin
    // it gains the lock semantics the seat economy implies -- she costs two of
    // your three free seats, so accepting her is the moment the human arcs stop
    // being arithmetically possible.
    queen_offer: Object.freeze({
        id: 'queen_offer',
        resolutions: Object.freeze({
            accepted: Object.freeze({
                humanity: -20,
                campBondAll: -1,
                locksEndings: Object.freeze([
                    ACT2_ENDINGS.CLEAN_ESCAPE,          // two seats gone; all three camps cannot board
                    ACT2_ENDINGS.MOTHERSHIP_INFECTION   // the stealth arc requires no queen aboard
                ]),
                codexNote: 'linchpin_queen_accepted'
            }),
            refused: Object.freeze({
                humanity: 10,
                campBondAll: 0,
                locksEndings: Object.freeze([ACT2_ENDINGS.FULL_BROOD]),
                codexNote: 'linchpin_queen_refused'
            })
        })
    }),
    briggs_oath: Object.freeze({
        id: 'briggs_oath',
        resolutions: Object.freeze({
            honored: Object.freeze({
                humanity: 8,
                campBondAll: 1,
                locksEndings: Object.freeze([ACT2_ENDINGS.FULL_BROOD, ACT2_ENDINGS.SCORCHED_SKY]),
                codexNote: 'linchpin_briggs_oath_honored'
            }),
            broken: Object.freeze({
                humanity: -10,
                campBondAll: -1,
                locksEndings: Object.freeze([ACT2_ENDINGS.CLEAN_ESCAPE]),
                codexNote: 'linchpin_briggs_oath_broken'
            })
        })
    }),
    martha_beacon: Object.freeze({
        id: 'martha_beacon',
        resolutions: Object.freeze({
            broadcast: Object.freeze({
                humanity: 5,
                campBondAll: 1,
                locksEndings: Object.freeze([ACT2_ENDINGS.MOTHERSHIP_INFECTION]),
                codexNote: 'linchpin_martha_beacon_broadcast'
            }),
            silenced: Object.freeze({
                humanity: -8,
                campBondAll: -1,
                locksEndings: Object.freeze([ACT2_ENDINGS.CLEAN_ESCAPE, ACT2_ENDINGS.ALIEN_EXODUS]),
                codexNote: 'linchpin_martha_beacon_silenced'
            })
        })
    }),
    kaelen_manifest: Object.freeze({
        id: 'kaelen_manifest',
        resolutions: Object.freeze({
            disclosed: Object.freeze({
                humanity: 5,
                campBondAll: 1,
                locksEndings: Object.freeze([ACT2_ENDINGS.MOTHERSHIP_INFECTION, ACT2_ENDINGS.CARRIERS_BARGAIN]),
                codexNote: 'linchpin_kaelen_manifest_disclosed'
            }),
            falsified: Object.freeze({
                humanity: -12,
                campBondAll: -1,
                locksEndings: Object.freeze([ACT2_ENDINGS.CLEAN_ESCAPE]),
                codexNote: 'linchpin_kaelen_manifest_falsified'
            })
        })
    })
});

const CAMP_LEADER_LINCHPIN_PATHS = Object.freeze({
    TANK: Object.freeze({
        id: 'briggs_oath',
        human: 'honored',
        hostile: 'broken'
    }),
    SCOUT: Object.freeze({
        id: 'martha_beacon',
        human: 'broadcast',
        hostile: 'silenced'
    }),
    ENGINEER: Object.freeze({
        id: 'kaelen_manifest',
        human: 'disclosed',
        hostile: 'falsified'
    })
});

/** Resolve the named leader arc from an already-successful terminal camp choice. */
export function resolveCampLeaderLinchpin(manager, leaderClassId, action) {
    const path = CAMP_LEADER_LINCHPIN_PATHS[String(leaderClassId ?? '').toUpperCase()];
    if (!path) return false;
    const humanActions = new Set(['recruit', 'warn']);
    const hostileActions = new Set(['steal', 'cull', 'turn', 'latent']);
    const resolution = humanActions.has(action) ? path.human : hostileActions.has(action) ? path.hostile : null;
    return resolution ? applyLinchpinResolution(manager, path.id, resolution) : false;
}

export function getResolution(linchpinId, resolution) {
    return STORY_LINCHPINS[linchpinId]?.resolutions?.[resolution] ?? null;
}

/**
 * Clamp persisted state to what this build understands.
 *
 * A save written by a later build must not put an older one into a state its
 * cascade cannot interpret, so unknown ids and unknown resolutions are dropped
 * rather than carried.
 */
export function normalizeLinchpins(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [id, resolution] of Object.entries(raw)) {
        if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
        if (getResolution(id, resolution)) out[id] = resolution;
    }
    return out;
}

/** Every ending closed off by the resolutions taken so far. */
export function collectLockedEndings(linchpins) {
    const locked = new Set();
    for (const [id, resolution] of Object.entries(normalizeLinchpins(linchpins))) {
        for (const ending of getResolution(id, resolution)?.locksEndings ?? []) {
            if (!NEVER_LOCKED_ENDINGS.includes(ending)) locked.add(ending);
        }
    }
    return [...locked];
}

/**
 * Record a resolution and apply its consequences.
 *
 * WRITE-ONCE. A linchpin that could be re-resolved is not a linchpin, and a
 * re-triggered encounter would apply its humanity delta twice and drift the
 * player's standing invisibly. Returns false if already resolved.
 */
export function applyLinchpinResolution(manager, linchpinId, resolution) {
    const effect = getResolution(linchpinId, resolution);
    if (!effect || !manager) return false;

    // Act2StateManager.getState() intentionally returns a normalized snapshot.
    // Write the resolution to its live state or the next mutator/save would
    // normalize the untouched record and silently discard the linchpin.
    const state = manager.state ?? manager.getState?.();
    if (!state) return false;
    state.linchpins = normalizeLinchpins(state.linchpins);
    if (state.linchpins[linchpinId]) return false;

    state.linchpins[linchpinId] = resolution;

    if (effect.humanity) manager.adjustHumanity?.(effect.humanity);
    if (effect.campBondAll) {
        const camps = manager.campIds
            ?? (state.camps ?? []).map((c) => c.id).filter(Boolean);
        for (const campId of camps) manager.adjustCampBond?.(campId, effect.campBondAll);
    }
    manager.save?.();

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('story-linchpin-resolved', {
            detail: { id: linchpinId, resolution, locksEndings: effect.locksEndings ?? [] }
        }));
    }
    return true;
}
