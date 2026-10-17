/**
 * Cinematic beats: which game event plays which song card, and what the
 * doors open on afterwards (docs/planning/camp-interaction-and-cinematics-
 * audit-2026-10-16.md §13.2). Owner, 2026-10-16: every shipped video should
 * be mapped and triggered, bookended by doors, and lead into a conversation
 * where someone is there to talk to.
 *
 * Cards already triggered elsewhere stay there: first contact (01, 02, 04,
 * 06, 22, 23 via camp-first-contact) and the snail bosses (13, 26, 27 via the
 * cutscene path). Not yet mapped, see the audit: 05, 08, 09, 12, 16, 24, 31.
 */

export const CINEMATIC_STORAGE_KEY = 'hb_cinematics_v1';

// Lower plays first and survives a clash.
export const BEAT_PRIORITY = Object.freeze({ story: 0, camp: 1, flavour: 2 });

// A flavour beat that lands this soon after another card is dropped (it can
// fire again the next time its event does).
export const BEAT_SPACING_MS = 20_000;

const atCamp = (campId) => (detail) => detail?.campId === campId;

export const CINEMATIC_BEATS = Object.freeze([
    // `then`: 'gameplay' | 'camp-conversation' (the event's camp leader, if
    // the player is standing there) | 'aria' (Aria's tree, Queen context).
    { id: 'aria_voice', on: 'queen-hallucination', card: '11', then: 'aria', priority: 'story' },
    { id: 'console_dead', on: 'act2-console-dead', card: '10', then: 'gameplay', priority: 'story' },
    { id: 'black_box_first', on: 'black-box-recovered', card: '32', then: 'gameplay', priority: 'story' },
    { id: 'apex_threat', on: 'act2-apex-threat-spawned', card: '17', then: 'gameplay', priority: 'story', boss: true },
    { id: 'hive_harvest_boss', on: 'hive-harvest-boss-spawned', card: '25', then: 'gameplay', priority: 'story', boss: true },

    { id: 'meridian_bonded', on: 'camp-bonded', when: (d) => atCamp('camp_meridian')(d) && d.bond >= 3, card: '03', then: 'camp-conversation', priority: 'camp' },
    { id: 'vesper_bonded', on: 'camp-bonded', when: (d) => atCamp('camp_vesper')(d) && d.bond >= 3, card: '07', then: 'camp-conversation', priority: 'camp' },
    { id: 'meridian_quest_done', on: 'camp-quest-complete', when: atCamp('camp_meridian'), card: '19', then: 'camp-conversation', priority: 'camp' },
    { id: 'tallow_quest_done', on: 'camp-quest-complete', when: atCamp('camp_tallow'), card: '20', then: 'camp-conversation', priority: 'camp' },
    { id: 'vesper_quest_done', on: 'camp-quest-complete', when: atCamp('camp_vesper'), card: '21', then: 'camp-conversation', priority: 'camp' },
    { id: 'tallow_final', on: 'camp-final-resolved', when: atCamp('camp_tallow'), card: '28', then: 'camp-conversation', priority: 'camp' },
    { id: 'vesper_final', on: 'camp-final-resolved', when: atCamp('camp_vesper'), card: '29', then: 'camp-conversation', priority: 'camp' },
    { id: 'meridian_final', on: 'camp-final-resolved', when: atCamp('camp_meridian'), card: '30', then: 'camp-conversation', priority: 'camp' },

    { id: 'deep_tier', on: 'depth-tier-changed', when: (d) => Boolean(d?.crossing) && Number(d?.tier) >= 2, card: '14', then: 'gameplay', priority: 'flavour' },
    { id: 'first_infection', on: 'infection-stage-changed', when: (d) => Number(d?.stage) >= 1, card: '15', then: 'gameplay', priority: 'flavour' },
    { id: 'snail_friend', on: 'snail-befriended', card: '18', then: 'gameplay', priority: 'flavour' },

    { id: 'ship_module_online', on: 'ship-module-activated', card: '05', then: 'gameplay', priority: 'flavour' },
    { id: 'nahl_tissue', on: 'hive-first-contact', when: (d) => d?.hiveId === 'hive_suture' || d?.campId === 'hive_suture', card: '08', then: 'camp-conversation', priority: 'camp' },
    { id: 'first_respawn', on: 'player-respawned', card: '09', then: 'gameplay', priority: 'flavour' },
    { id: 'queen_offer', on: 'queen-fight-started', card: '12', then: 'gameplay', priority: 'story', boss: true },
    { id: 'hive_nonviolent', on: 'hive-choice-resolved', when: (d) => ['hive-tend', 'hive-talk', 'hive-quest', 'hive-parley'].includes(d?.action) || (d?.bond > 0 && d?.action !== 'hive-harvest' && d?.action !== 'hive-sacrifice'), card: '16', then: 'camp-conversation', priority: 'camp' },
    { id: 'act2_departure', on: 'act2-departed', card: '24', then: 'gameplay', priority: 'story' },
    { id: 'queen_defeated', on: 'act2-milestone', when: (d) => d?.key === 'queenKilled', card: '31', then: 'gameplay', priority: 'story' }
].map((beat) => Object.freeze(beat)));

export const CINEMATIC_BEAT_EVENTS = Object.freeze([...new Set(CINEMATIC_BEATS.map((beat) => beat.on))]);

export function matchBeat(type, detail = {}, seen = new Set()) {
    return CINEMATIC_BEATS.find((beat) => beat.on === type
        && !seen.has(beat.id)
        && (!beat.when || beat.when(detail ?? {}))) ?? null;
}

function rank(beat) {
    return BEAT_PRIORITY[beat?.priority] ?? BEAT_PRIORITY.flavour;
}

function defaultStorage() {
    try {
        return typeof window !== 'undefined' ? window.localStorage ?? null : null;
    } catch {
        return null;
    }
}

// Shares hb_cinematics_v1 with the interaction-sequence runner: each writer
// keeps the other's field.
export function readCinematicsRecord(storage) {
    try {
        const parsed = JSON.parse(storage?.getItem?.(CINEMATIC_STORAGE_KEY) ?? 'null');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

export function writeCinematicsField(storage, field, values) {
    try {
        const record = readCinematicsRecord(storage);
        record[field] = [...values];
        storage?.setItem?.(CINEMATIC_STORAGE_KEY, JSON.stringify(record));
    } catch {
        // best effort: the beat still won't replay this session
    }
}

/**
 * Decides when a matched beat plays. Rules (audit §13.2):
 * - once per save;
 * - never mid-fight, except boss beats, which play at spawn (the card
 *   freezes the sim, like any blocking overlay);
 * - co-op: the doors never close on a squad, so the beat is a toast;
 * - a flavour beat within BEAT_SPACING_MS of another card is dropped;
 * - while waiting for a fight to end, the higher-priority beat is kept.
 */
export class CinematicBeatDirector {
    constructor({
        play,
        storage = defaultStorage(),
        isInCombat = () => false,
        isMultiplayer = () => false,
        toast = null,
        now = () => Date.now(),
        titleFor = (beat) => beat.card
    } = {}) {
        this.play = play;
        this.storage = storage;
        this.isInCombat = isInCombat;
        this.isMultiplayer = isMultiplayer;
        this.toast = toast;
        this.now = now;
        this.titleFor = titleFor;
        this.seen = new Set(readCinematicsRecord(storage).beats ?? []);
        this.pending = null;
        this.lastPlayedAt = -Infinity;
    }

    markSeen(beat) {
        this.seen.add(beat.id);
        writeCinematicsField(this.storage, 'beats', this.seen);
    }

    handle(type, detail = {}) {
        const beat = matchBeat(type, detail, this.seen);
        if (!beat) return null;
        if (this.isMultiplayer()) {
            this.markSeen(beat);
            this.toast?.(this.titleFor(beat));
            return 'toast';
        }
        if (!beat.boss && this.isInCombat()) {
            if (!this.pending || rank(beat) < rank(this.pending.beat)) this.pending = { beat, detail };
            return 'deferred';
        }
        if (beat.priority === 'flavour' && this.now() - this.lastPlayedAt < BEAT_SPACING_MS) return 'dropped';
        return this.start(beat, detail);
    }

    onCombatChanged(active) {
        if (active || !this.pending) return null;
        const { beat, detail } = this.pending;
        this.pending = null;
        if (this.seen.has(beat.id)) return null;
        return this.start(beat, detail);
    }

    start(beat, detail) {
        this.markSeen(beat);
        this.lastPlayedAt = this.now();
        this.play?.(beat, detail);
        return 'played';
    }
}
