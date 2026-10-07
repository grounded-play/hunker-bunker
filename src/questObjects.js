// Quest objects (Sprint 53 V7, docs/planning/sprint-53-world-variety-night-and-sleep-2026-10-07.md).
//
// Every camp quest target used to be the same gold-tinted junk sprite, so
// nothing in the world said what you were looking for. Each quest now names
// its own object:
// - `target`: what the quest's progress props look like (the valves you
//   close, the probe you pick up, the bloom you shoot);
// - `landmark`: a single prop marking where a quest happens when its targets
//   are enemies or a person (the armory pack, the holdout, the lost cultist).
// `standIn` is a shipped model used until the quest's own A3 model (`model`)
// arrives; swap it in here, nowhere else. `accent` colours the objective
// beacon.

import * as THREE from 'three';

const RED = 0xef4444;
const CYAN = 0x22d3ee;
const AMBER = 0xf59e0b;

export const QUEST_OBJECTS = Object.freeze({
    reactor_venting: Object.freeze({ accent: RED, target: Object.freeze({ standIn: 'prop_valve_wheel_fused', model: 'quest_reactor_valves' }) }),
    lost_probe: Object.freeze({ accent: CYAN, target: Object.freeze({ standIn: 'radar', model: 'quest_lost_probe' }) }),
    hive_archive: Object.freeze({ accent: 0x10b981, target: Object.freeze({ standIn: 'prop_hive_resin_sac', model: 'quest_hive_archive_node' }) }),
    spore_cleansing: Object.freeze({ accent: RED, target: Object.freeze({ standIn: 'prop_fungal_resin_basin', model: 'quest_red_mould_bloom' }) }),
    lost_cultist: Object.freeze({ accent: AMBER, landmark: Object.freeze({ standIn: 'prop_votive_candle_shrine', model: 'quest_cultist_shrine' }) }),
    grid_covenant: Object.freeze({ accent: AMBER, target: Object.freeze({ standIn: 'prop_conduit_junction_box', model: 'quest_kaelen_ledger_desk' }) }),
    warm_pipes: Object.freeze({ accent: 0xf97316, target: Object.freeze({ standIn: 'prop_pipe_rupture', model: 'quest_martha_warm_pipe_junction' }) }),
    armory_breach: Object.freeze({ accent: CYAN, landmark: Object.freeze({ standIn: 'prop_oxygen_bottle_cascade_rack', model: 'quest_infested_armory_cabinet' }) }),
    bunker_holdout: Object.freeze({ accent: AMBER, landmark: Object.freeze({ standIn: 'prop_security_barricade', model: 'quest_holdout_barricade' }) }),
    iron_ledger: Object.freeze({ accent: AMBER, landmark: Object.freeze({ standIn: 'arch_niche_shrine', model: 'quest_briggs_memorial_wall' }) })
});

// One archive node, tinted per chapter.
const ARCHIVE_CHAPTER_ACCENTS = Object.freeze({ hive_archive_ch1: 0x10b981, hive_archive_ch2: 0x84cc16, hive_archive_ch3: 0x2dd4bf });

export function questObjectFor(questId) {
    if (Object.hasOwn(ARCHIVE_CHAPTER_ACCENTS, questId)) {
        return { ...QUEST_OBJECTS.hive_archive, accent: ARCHIVE_CHAPTER_ACCENTS[questId] };
    }
    return Object.hasOwn(QUEST_OBJECTS, questId) ? QUEST_OBJECTS[questId] : null;
}

// A thin light pillar and a floor ring, so a quest object reads from across
// the room even before its model has streamed in.
export function attachQuestBeacon(sprite, accent = AMBER) {
    if (!sprite?.parent) return null;
    const pillarMaterial = new THREE.MeshBasicMaterial({
        color: accent, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 5, 10, 1, true), pillarMaterial);
    pillar.position.y = 2.5;
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: accent, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    const beacon = new THREE.Group();
    beacon.add(pillar, ring);
    beacon.position.set(sprite.position.x, 0, sprite.position.z);
    beacon.userData = { isQuestBeacon: true, accent, pillar, ring };
    sprite.parent.add(beacon);
    sprite.userData.questBeacon = beacon;
    return beacon;
}

// Every way a quest object leaves the world -- claimed, shot, or the quest
// ending. Its loaded model is a sibling, not a child, so it is removed by
// hand; the model's geometry is shared with the model cache, so not disposed.
export function removeCampQuestEntity(game, sprite) {
    if (!sprite) return;
    const beacon = sprite.userData?.questBeacon;
    if (beacon) {
        beacon.parent?.remove(beacon);
        beacon.traverse((node) => {
            node.geometry?.dispose?.();
            node.material?.dispose?.();
        });
        sprite.userData.questBeacon = null;
    }
    const root = sprite.userData?.world3dRoot;
    if (root) {
        root.parent?.remove(root);
        if (root.userData?.mixer) game.world3dMixers?.delete?.(root.userData.mixer);
        sprite.userData.world3dRoot = null;
    }
    sprite.parent?.remove?.(sprite);
    sprite.material?.dispose?.();
    if (!sprite.isSprite) sprite.geometry?.dispose?.();
    if (Array.isArray(game.scatterSprites)) game.scatterSprites = game.scatterSprites.filter((s) => s !== sprite);
}
