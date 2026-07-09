const STORAGE_KEY = 'hb_act2_v1';

// ── Act 2: the PregAlien loop ─────────────────────────────────
// Unlocks after the cave reveal (arcState 'hive_awakened_tease'). The player is
// the queen's carrier. The act runs a single persisted objective ladder:
//
//   gestation    → sever the Mothership uplink at your own wreck
//   dish         → grow a signal dish at the (hive-warped) foundry
//   camps_help   → three survivor camps found — help each finish the vessel
//   camps_betray → vessel done, four seats: cull the camps you raised
//   launch_ready → board the vessel with the queen
//   departed     → Act 2 complete (Act 3 hook)
//
// Progress is meta (survives death/runs), mirroring arcState.js. World
// placement of camps is chosen once by threeGame and persisted here.

export const ACT2_PHASES = Object.freeze([
    'dormant',
    'gestation',
    'dish',
    'camps_help',
    'camps_betray',
    'launch_ready',
    'departed'
]);

export const ACT2_CAMP_IDS = Object.freeze(['camp_meridian', 'camp_tallow', 'camp_vesper']);

export const ACT2_CAMP_LABELS = Object.freeze({
    camp_meridian: 'CAMP MERIDIAN',
    camp_tallow: 'CAMP TALLOW',
    camp_vesper: 'CAMP VESPER'
});

// Queen/system copy for each beat. Rendered through the brief-transmission
// panel; QUEEN: gets its own dialogue speaker.
export const ACT2_LINES = Object.freeze({
    intro: [
        'QUEEN: TWO HEARTBEATS. ONE PURPOSE.',
        'QUEEN: THE MOTHERSHIP STILL WHISPERS THROUGH YOUR WRECK. IT WILL SEND EXTERMINATORS.',
        'SYSTEM: NEW INSTINCT — SEVER THE MOTHERSHIP UPLINK AT YOUR SHIP CONSOLE.'
    ],
    resume: [
        'QUEEN: WE CONTINUE. THE INSTINCT REMEMBERS THE WAY.'
    ],
    uplinkSilenced: [
        'SYSTEM: UPLINK SEVERED. MOTHERSHIP TELEMETRY LOST.',
        'QUEEN: GOOD. THEIR ANTI-BROOD GRID DIES WITH IT.',
        'QUEEN: NOW LET US SPEAK FARTHER. GROW A DISH AT THE FOUNDRY.'
    ],
    dishBuilt: [
        'SYSTEM: SIGNAL DISH GROWN. WIDEBAND SWEEP COMPLETE.',
        'QUEEN: THREE CAMPS OF SURVIVORS. THEY BUILD A VESSEL TO FLEE THIS WORLD.',
        'QUEEN: HELP THEM FINISH IT. WE WILL NEED THEIR WINGS.'
    ],
    campAided: [
        'SYSTEM: VESSEL SECTION COMPLETE. SURVIVORS GRATEFUL.'
    ],
    allAided: [
        'SYSTEM: VESSEL ASSEMBLY COMPLETE. FOUR SEATS PRESSURIZED.',
        'QUEEN: FOUR SEATS. YOU. ME. THE EGGS MAKE FOUR.',
        'QUEEN: THE BUILDERS CANNOT BOARD. CULL THE CAMPS YOU RAISED.'
    ],
    campCulled: [
        'SYSTEM: SURVIVOR BEACON OFFLINE.'
    ],
    allCulled: [
        'SYSTEM: NO SURVIVOR BEACONS REMAIN IN SECTOR 9.',
        'QUEEN: THE VESSEL IS OURS ALONE. CARRY US TO THE STARS.'
    ],
    departed: [
        'SYSTEM: LAUNCH SEQUENCE COMPLETE. HULL INTEGRITY NOMINAL.',
        'QUEEN: FOUR SEATS. FOUR HEARTBEATS. THE WORLD SHRINKS TO A COLD LIGHT BELOW.',
        'QUEEN: SLEEP, CARRIER. WHEN YOU WAKE, WE CHOOSE A NEW WORLD.'
    ]
});

function getStorage(storage) {
    return storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
}

function normalizeCamp(raw = {}, id) {
    return {
        id,
        x: Number.isFinite(raw?.x) ? raw.x : null,
        z: Number.isFinite(raw?.z) ? raw.z : null,
        aided: Boolean(raw?.aided),
        destroyed: Boolean(raw?.destroyed)
    };
}

export function normalizeAct2State(raw = {}) {
    const parsed = raw && typeof raw === 'object' ? raw : {};
    const camps = ACT2_CAMP_IDS.map((id) => {
        const existing = Array.isArray(parsed.camps) ? parsed.camps.find((c) => c?.id === id) : null;
        return normalizeCamp(existing ?? {}, id);
    });
    return {
        begun: Boolean(parsed.begun),
        uplinkSilenced: Boolean(parsed.uplinkSilenced),
        dishBuilt: Boolean(parsed.dishBuilt),
        departed: Boolean(parsed.departed),
        camps,
        version: 1
    };
}

export const DEFAULT_ACT2_STATE = Object.freeze(normalizeAct2State({}));

// Pure phase derivation — the ladder only ever moves forward because the
// underlying flags are monotonic.
export function deriveAct2Phase(state = DEFAULT_ACT2_STATE) {
    const s = normalizeAct2State(state);
    if (!s.begun) return 'dormant';
    if (s.departed) return 'departed';
    if (!s.uplinkSilenced) return 'gestation';
    if (!s.dishBuilt) return 'dish';
    if (!s.camps.every((c) => c.aided)) return 'camps_help';
    if (!s.camps.every((c) => c.destroyed)) return 'camps_betray';
    return 'launch_ready';
}

export class Act2Manager {
    constructor({ storage = null, storageKey = STORAGE_KEY, onTransition = null } = {}) {
        this.storage = getStorage(storage);
        this.storageKey = storageKey;
        this.onTransition = onTransition;
        this.state = this.load();
    }

    load() {
        try {
            const raw = this.storage?.getItem(this.storageKey);
            if (!raw) return normalizeAct2State({});
            return normalizeAct2State(JSON.parse(raw));
        } catch {
            return normalizeAct2State({});
        }
    }

    save() {
        this.state = normalizeAct2State(this.state);
        try {
            this.storage?.setItem(this.storageKey, JSON.stringify(this.state));
        } catch {
            // Best-effort persistence, matching the other hb_* stores.
        }
        return this.state;
    }

    getState() {
        return normalizeAct2State(this.state);
    }

    getPhase() {
        return deriveAct2Phase(this.state);
    }

    _mutate(mutator) {
        const from = this.getPhase();
        mutator(this.state);
        this.save();
        const to = this.getPhase();
        if (to !== from && typeof this.onTransition === 'function') {
            this.onTransition(from, to, this.getState());
        }
        return { from, to, state: this.getState() };
    }

    begin() {
        return this._mutate((s) => { s.begun = true; });
    }

    silenceUplink() {
        return this._mutate((s) => { s.uplinkSilenced = true; });
    }

    buildDish() {
        return this._mutate((s) => { s.dishBuilt = true; });
    }

    setCampPosition(id, x, z) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (camp && Number.isFinite(x) && Number.isFinite(z)) {
                camp.x = x;
                camp.z = z;
            }
        });
    }

    aidCamp(id) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (camp) camp.aided = true;
        });
    }

    destroyCamp(id) {
        return this._mutate((s) => {
            const camp = s.camps.find((c) => c.id === id);
            if (camp && camp.aided) camp.destroyed = true;
        });
    }

    depart() {
        return this._mutate((s) => { s.departed = true; });
    }

    reset() {
        this.state = normalizeAct2State({});
        return this.save();
    }
}
