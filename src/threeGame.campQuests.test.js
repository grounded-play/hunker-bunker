import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Camp Bonding Quests (docs/expanded-universe-narrative-design.md) — wires
// the previously-unused CAMP_QUESTS data into real gameplay: a walk-up
// offer, a spawned in-level objective, a HUD tracker, and a reward hook.
// These tests exercise the pure state-machine logic (accept -> progress ->
// complete, plus the reward check-point) without a full WebGL ThreeGame
// instance, following the established
// ThreeGame.prototype.method.call(fakeThis, ...) pattern (see
// threeGame.holeTiles.test.js / threeGame.queenFight.test.js).

let originalWindow;
let dispatchedEvents;

function stubWindow() {
    dispatchedEvents = [];
    globalThis.window = {
        dispatchEvent: (event) => dispatchedEvents.push(event),
        AudioManager: { play: () => {} }
    };
}

function eventsOfType(type) {
    return dispatchedEvents.filter((event) => event.type === type);
}

function makeCamp(overrides = {}) {
    return {
        id: 'camp_meridian',
        label: 'MERIDIAN',
        leaderName: 'Vey',
        level: 3,
        aided: false,
        destroyed: false,
        pos: { x: 10, z: 20 },
        isWithinInteractRange: () => true,
        getTurretNear: () => null,
        setStatus: vi.fn(),
        setLevel: vi.fn(),
        setAided: vi.fn(),
        setSuspicion: vi.fn(),
        ...overrides
    };
}

function makeFakeThis(overrides = {}) {
    const camp = overrides.camp ?? makeCamp();
    return {
        camps: [camp],
        _activeCampQuest: null,
        player: { position: { x: 10, z: 20 } },
        scatterSprites: [],
        act2: {
            getPhase: () => 'dormant',
            setCampQuestActive: vi.fn(),
            completeCampQuest: vi.fn()
        },
        getCampRecord: vi.fn(() => ({ bond: 1, status: 'alive', questFlags: {} })),
        getCampById: vi.fn((id) => (id === camp.id ? camp : null)),
        getAct2ClassPerks: () => ({}),
        getHiveRecord: () => null,
        isAct2Active: () => false,
        isGameplayInputActive: () => true,
        peekDialogueBeat: () => null,
        getCampFavorCost: () => 8,
        spawnGearPoofEffect: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        applyWeaponUpgrades: vi.fn(),
        getNextCampQuest: ThreeGame.prototype.getNextCampQuest,
        hasCampQuestReward: ThreeGame.prototype.hasCampQuestReward,
        getActionableCampAt: ThreeGame.prototype.getActionableCampAt,
        acceptCampQuest: ThreeGame.prototype.acceptCampQuest,
        interactWithCampQuestObject: ThreeGame.prototype.interactWithCampQuestObject,
        checkProjectileQuestPropHit: ThreeGame.prototype.checkProjectileQuestPropHit,
        destroyCampQuestShootProp: ThreeGame.prototype.destroyCampQuestShootProp,
        updateCampQuest: ThreeGame.prototype.updateCampQuest,
        advanceCampQuestProgress: ThreeGame.prototype.advanceCampQuestProgress,
        resolveCampQuestCompletion: ThreeGame.prototype.resolveCampQuestCompletion,
        getActiveCampQuestTargetPos: ThreeGame.prototype.getActiveCampQuestTargetPos,
        ...overrides,
        camp
    };
}

function makeQuestProp(x = 10, z = 20) {
    return {
        position: { x, z },
        parent: { remove: vi.fn() },
        material: { dispose: vi.fn() },
        geometry: { dispose: vi.fn() },
        userData: {}
    };
}

describe('hasCampQuestReward', () => {
    it('is false when the mapped quest is not done, true once it is', () => {
        const fakeThis = makeFakeThis();
        fakeThis.getCampRecord = vi.fn((id) => (
            id === 'camp_vesper' ? { questFlags: { armory_breach: 'done' } } : { questFlags: {} }
        ));

        expect(ThreeGame.prototype.hasCampQuestReward.call(fakeThis, 'heavy_munitions')).toBe(true);
        expect(ThreeGame.prototype.hasCampQuestReward.call(fakeThis, 'bio_dampener')).toBe(false);
    });

    it('returns false for an unknown reward id', () => {
        const fakeThis = makeFakeThis();
        expect(ThreeGame.prototype.hasCampQuestReward.call(fakeThis, 'not_a_real_reward')).toBe(false);
    });
});

describe('getNextCampQuest', () => {
    it('returns the first not-done quest once its bond prerequisite is met', () => {
        const fakeThis = makeFakeThis();
        const quest = ThreeGame.prototype.getNextCampQuest.call(fakeThis, 'camp_meridian', { bond: 1, questFlags: {} });
        expect(quest?.id).toBe('reactor_venting');
    });

    it('returns null when bond is below the next quest\'s requirement', () => {
        const fakeThis = makeFakeThis();
        const quest = ThreeGame.prototype.getNextCampQuest.call(fakeThis, 'camp_meridian', { bond: 0, questFlags: {} });
        expect(quest).toBeNull();
    });

    it('skips done quests and offers the camp\'s sub-mission quest next', () => {
        const fakeThis = makeFakeThis();
        const quest = ThreeGame.prototype.getNextCampQuest.call(
            fakeThis, 'camp_meridian', { bond: 2, questFlags: { reactor_venting: 'done' } }
        );
        expect(quest?.id).toBe('hive_archive_ch1');
    });

    it('returns null once every quest for the camp is done', () => {
        const fakeThis = makeFakeThis();
        const quest = ThreeGame.prototype.getNextCampQuest.call(
            fakeThis, 'camp_meridian', { bond: 4, questFlags: { reactor_venting: 'done', hive_archive_ch1: 'done', lost_probe: 'done' } }
        );
        expect(quest).toBeNull();
    });
});

describe('camp quest reset and persisted restoration', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('removes scene-parented quest entities before clearing runtime quest state', () => {
        const active = makeQuestProp();
        active.userData.campQuestId = 'camp_meridian';
        const orphan = makeQuestProp();
        orphan.userData.campQuestKey = 'lost_probe';
        const unrelated = makeQuestProp();
        const fakeThis = {
            _activeCampQuest: { props: [active] },
            scatterSprites: [active, orphan, unrelated]
        };

        expect(ThreeGame.prototype.clearActiveCampQuestEntities.call(fakeThis)).toBe(2);
        expect(active.parent.remove).toHaveBeenCalledWith(active);
        expect(orphan.parent.remove).toHaveBeenCalledWith(orphan);
        expect(fakeThis.scatterSprites).toEqual([unrelated]);
        expect(fakeThis._activeCampQuest.props).toEqual([]);
    });

    it('restores one persisted active quest idempotently without re-offering it', () => {
        const camp = makeCamp();
        const fakeThis = makeFakeThis({ camp });
        fakeThis.act2.getState = () => ({
            camps: [{
                id: camp.id,
                questFlags: { reactor_venting: 'active' }
            }]
        });
        fakeThis.spawnReactorVentingObjects = vi.fn();

        const first = ThreeGame.prototype.restoreActiveCampQuestFromState.call(fakeThis);
        const second = ThreeGame.prototype.restoreActiveCampQuestFromState.call(fakeThis);

        expect(first?.quest.id).toBe('reactor_venting');
        expect(second).toBe(first);
        expect(fakeThis.spawnReactorVentingObjects).toHaveBeenCalledTimes(1);
    });
});

describe('getActionableCampAt — quest-offer priority', () => {
    it('offers the quest once camp support is maxed and no quest is active', () => {
        const camp = makeCamp({ level: 3 });
        const fakeThis = makeFakeThis({ camp });
        fakeThis.getCampRecord = vi.fn(() => ({ bond: 1, status: 'alive', questFlags: {} }));

        const actionable = ThreeGame.prototype.getActionableCampAt.call(fakeThis, 10, 20, 'dormant');

        expect(actionable?.action).toBe('quest-offer');
        expect(actionable?.quest?.id).toBe('reactor_venting');
    });

    it('falls through to the bond action while a quest is already active elsewhere', () => {
        const camp = makeCamp({ level: 3 });
        const fakeThis = makeFakeThis({ camp });
        fakeThis.getCampRecord = vi.fn(() => ({ bond: 1, status: 'alive', questFlags: {} }));
        fakeThis._activeCampQuest = { campId: 'camp_vesper', quest: { id: 'armory_breach' } };

        const actionable = ThreeGame.prototype.getActionableCampAt.call(fakeThis, 10, 20, 'dormant');

        expect(actionable?.action).toBe('bond');
    });

    it('does not re-offer a quest already accepted (flagged active, not done)', () => {
        const camp = makeCamp({ level: 3 });
        const fakeThis = makeFakeThis({ camp });
        fakeThis.getCampRecord = vi.fn(() => ({ bond: 1, status: 'alive', questFlags: { reactor_venting: 'active' } }));

        const actionable = ThreeGame.prototype.getActionableCampAt.call(fakeThis, 10, 20, 'dormant');

        expect(actionable?.action).toBe('bond');
    });
});

describe('acceptCampQuest / advanceCampQuestProgress / resolveCampQuestCompletion', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('runs a full interact-counter quest end to end (Reactor Venting, 3 props)', () => {
        const camp = makeCamp();
        const fakeThis = makeFakeThis({ camp });
        const quest = { id: 'reactor_venting', label: 'REACTOR VENTING', bond: 1 };
        fakeThis.spawnReactorVentingObjects = vi.fn(() => {
            for (let i = 0; i < 3; i += 1) fakeThis._activeCampQuest.props.push(makeQuestProp());
        });

        ThreeGame.prototype.acceptCampQuest.call(fakeThis, camp, quest);

        expect(fakeThis.act2.setCampQuestActive).toHaveBeenCalledWith('camp_meridian', 'reactor_venting');
        expect(fakeThis._activeCampQuest).toMatchObject({ campId: 'camp_meridian', kind: 'interact', current: 0, target: 3 });
        expect(eventsOfType('camp-quest-progress')).toHaveLength(1);

        ThreeGame.prototype.advanceCampQuestProgress.call(fakeThis, 1);
        ThreeGame.prototype.advanceCampQuestProgress.call(fakeThis, 1);
        expect(fakeThis._activeCampQuest.current).toBe(2);
        expect(fakeThis._activeCampQuest).not.toBeNull();

        ThreeGame.prototype.advanceCampQuestProgress.call(fakeThis, 1);

        expect(fakeThis.act2.completeCampQuest).toHaveBeenCalledWith('camp_meridian', 'reactor_venting', 1);
        expect(fakeThis._activeCampQuest).toBeNull();
        expect(eventsOfType('camp-quest-complete')).toHaveLength(1);
    });

    it('refuses to accept a second quest while one is already active', () => {
        const camp = makeCamp();
        const fakeThis = makeFakeThis({ camp });
        fakeThis._activeCampQuest = { campId: 'camp_vesper', quest: { id: 'armory_breach' }, props: [] };
        fakeThis.spawnReactorVentingObjects = vi.fn();

        ThreeGame.prototype.acceptCampQuest.call(fakeThis, camp, { id: 'reactor_venting', label: 'REACTOR VENTING', bond: 1 });

        expect(fakeThis.spawnReactorVentingObjects).not.toHaveBeenCalled();
        expect(fakeThis._activeCampQuest.campId).toBe('camp_vesper');
    });

    it('triggers an immediate weapon recompute only for Armory Breach completion', () => {
        const camp = makeCamp({ id: 'camp_vesper' });
        const fakeThis = makeFakeThis({ camp });
        fakeThis._activeCampQuest = {
            campId: 'camp_vesper',
            quest: { id: 'armory_breach', label: 'ARMORY BREACH' },
            kind: 'kill',
            current: 3,
            target: 3,
            props: []
        };

        ThreeGame.prototype.resolveCampQuestCompletion.call(fakeThis);

        expect(fakeThis.applyWeaponUpgrades).toHaveBeenCalledTimes(1);
    });

    it('dispatches rgb-chapter-archive-recovered event when an Archive Sub-Mission completes', () => {
        const camp = makeCamp({ id: 'camp_meridian' });
        const fakeThis = makeFakeThis({ camp });
        fakeThis._activeCampQuest = {
            campId: 'camp_meridian',
            quest: { id: 'hive_archive_ch1', label: 'HIVE ARCHIVE CH. 1', chapterId: 'parking_lot' },
            kind: 'pickup',
            current: 1,
            target: 1,
            props: []
        };

        ThreeGame.prototype.resolveCampQuestCompletion.call(fakeThis);

        const recovered = eventsOfType('rgb-chapter-archive-recovered');
        expect(recovered).toHaveLength(1);
        expect(recovered[0].detail.chapterId).toBe('parking_lot');
    });

    it('does not recompute weapon upgrades for a non-Armory-Breach completion', () => {
        const camp = makeCamp();
        const fakeThis = makeFakeThis({ camp });
        fakeThis._activeCampQuest = {
            campId: 'camp_meridian',
            quest: { id: 'reactor_venting', label: 'REACTOR VENTING' },
            kind: 'interact',
            current: 3,
            target: 3,
            props: []
        };

        ThreeGame.prototype.resolveCampQuestCompletion.call(fakeThis);

        expect(fakeThis.applyWeaponUpgrades).not.toHaveBeenCalled();
    });
});

describe('shoot-counter quest props (Spore Cleansing)', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('checkProjectileQuestPropHit only matches while a shoot-kind quest is active', () => {
        const camp = makeCamp({ id: 'camp_tallow' });
        const fakeThis = makeFakeThis({ camp });
        const prop = makeQuestProp(5, 5);
        fakeThis._activeCampQuest = { campId: 'camp_tallow', quest: { id: 'spore_cleansing' }, kind: 'shoot', current: 0, target: 3, props: [prop] };

        const noMatch = ThreeGame.prototype.checkProjectileQuestPropHit.call(fakeThis, { mesh: { position: { x: 50, z: 50 } } });
        expect(noMatch).toBeNull();

        const hit = ThreeGame.prototype.checkProjectileQuestPropHit.call(fakeThis, { mesh: { position: { x: 5.1, z: 5.1 } } });
        expect(hit).toBe(prop);
    });

    it('destroyCampQuestShootProp removes the prop and advances progress, completing on the third', () => {
        const camp = makeCamp({ id: 'camp_tallow' });
        const fakeThis = makeFakeThis({ camp });
        const props = [makeQuestProp(1, 1), makeQuestProp(2, 2), makeQuestProp(3, 3)];
        fakeThis._activeCampQuest = { campId: 'camp_tallow', quest: { id: 'spore_cleansing', label: 'SPORE CLEANSING' }, kind: 'shoot', current: 0, target: 3, props };
        fakeThis.scatterSprites = [...props];

        ThreeGame.prototype.destroyCampQuestShootProp.call(fakeThis, props[0]);
        ThreeGame.prototype.destroyCampQuestShootProp.call(fakeThis, props[1]);
        expect(fakeThis._activeCampQuest.current).toBe(2);

        ThreeGame.prototype.destroyCampQuestShootProp.call(fakeThis, props[2]);
        expect(fakeThis._activeCampQuest).toBeNull();
        expect(fakeThis.scatterSprites).not.toContain(props[0]);
        expect(props[0].parent.remove).toHaveBeenCalledWith(props[0]);
    });
});

describe('kill-counter and wave-defense polling (Armory Breach / Bunker Holdout)', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('updateCampQuest advances a kill-counter as tagged enemies die (burstTriggered)', () => {
        const camp = makeCamp({ id: 'camp_vesper' });
        const fakeThis = makeFakeThis({ camp });
        const enemies = [makeQuestProp(1, 1), makeQuestProp(2, 2), makeQuestProp(3, 3)];
        fakeThis._activeCampQuest = { campId: 'camp_vesper', quest: { id: 'armory_breach', label: 'ARMORY BREACH' }, kind: 'kill', current: 0, target: 3, props: enemies };

        ThreeGame.prototype.updateCampQuest.call(fakeThis, 0.1);
        expect(fakeThis._activeCampQuest.current).toBe(0);

        enemies[0].userData.burstTriggered = true;
        ThreeGame.prototype.updateCampQuest.call(fakeThis, 0.1);
        expect(fakeThis._activeCampQuest.current).toBe(1);

        enemies[1].userData.burstTriggered = true;
        enemies[2].userData.burstTriggered = true;
        ThreeGame.prototype.updateCampQuest.call(fakeThis, 0.1);
        expect(fakeThis._activeCampQuest).toBeNull();
    });

    it('updateCampQuest advances wave-defense to the next wave once all its enemies are dead', () => {
        const camp = makeCamp({ id: 'camp_vesper' });
        const fakeThis = makeFakeThis({ camp });
        const wave1 = [makeQuestProp(1, 1)];
        fakeThis._activeCampQuest = {
            campId: 'camp_vesper', quest: { id: 'bunker_holdout', label: 'BUNKER HOLDOUT' },
            kind: 'wave', current: 0, target: 3, waveIndex: 0, waveTotal: 3, props: wave1
        };
        fakeThis.spawnBunkerHoldoutWave = vi.fn(() => {
            fakeThis._activeCampQuest.props = [makeQuestProp(2, 2)];
        });

        wave1[0].userData.burstTriggered = true;
        ThreeGame.prototype.updateCampQuest.call(fakeThis, 0.1);

        expect(fakeThis._activeCampQuest.waveIndex).toBe(1);
        expect(fakeThis.spawnBunkerHoldoutWave).toHaveBeenCalledTimes(1);
        expect(fakeThis._activeCampQuest).not.toBeNull();
    });

    it('completes the wave-defense quest once the final wave clears', () => {
        const camp = makeCamp({ id: 'camp_vesper' });
        const fakeThis = makeFakeThis({ camp });
        const finalWave = [makeQuestProp(1, 1)];
        fakeThis._activeCampQuest = {
            campId: 'camp_vesper', quest: { id: 'bunker_holdout', label: 'BUNKER HOLDOUT' },
            kind: 'wave', current: 2, target: 3, waveIndex: 2, waveTotal: 3, props: finalWave
        };
        fakeThis.spawnBunkerHoldoutWave = vi.fn();

        finalWave[0].userData.burstTriggered = true;
        ThreeGame.prototype.updateCampQuest.call(fakeThis, 0.1);

        expect(fakeThis._activeCampQuest).toBeNull();
        expect(fakeThis.spawnBunkerHoldoutWave).not.toHaveBeenCalled();
    });
});

describe('getActiveCampQuestTargetPos', () => {
    it('points at the nearest unresolved prop', () => {
        const camp = makeCamp();
        const fakeThis = makeFakeThis({ camp });
        const prop = makeQuestProp(7, 8);
        fakeThis._activeCampQuest = { campId: 'camp_meridian', quest: { id: 'reactor_venting' }, kind: 'interact', current: 0, target: 3, props: [prop] };

        expect(ThreeGame.prototype.getActiveCampQuestTargetPos.call(fakeThis)).toEqual({ x: 7, z: 8 });
    });

    it('falls back to the camp position once every prop is resolved', () => {
        const camp = makeCamp();
        const fakeThis = makeFakeThis({ camp });
        const prop = makeQuestProp(7, 8);
        prop.userData.burstTriggered = true;
        fakeThis._activeCampQuest = { campId: 'camp_meridian', quest: { id: 'reactor_venting' }, kind: 'interact', current: 3, target: 3, props: [prop] };

        expect(ThreeGame.prototype.getActiveCampQuestTargetPos.call(fakeThis)).toEqual({ x: 10, z: 20 });
    });

    it('returns null when no quest is active', () => {
        const fakeThis = makeFakeThis();
        expect(ThreeGame.prototype.getActiveCampQuestTargetPos.call(fakeThis)).toBeNull();
    });
});
