#!/usr/bin/env node
import { applyStatus, tickStatusEffects, getStatus } from '../src/statusEffects.js';
import {
    computeActiveSynergies,
    resolveCryoShatterNova,
    resolveBioVampirismKill,
    WEAPON_OVERCLOCKS,
    SUIT_RELICS
} from '../src/runDrops.js';

export function createStandardPack() {
    return [
        { id: 'crawler_0', type: 'crawler', hp: 10, maxHp: 10, x: 0, z: 0 },
        { id: 'crawler_1', type: 'crawler', hp: 10, maxHp: 10, x: 1.0, z: 0.5 },
        { id: 'crawler_2', type: 'crawler', hp: 10, maxHp: 10, x: -1.0, z: 0.5 },
        { id: 'crawler_3', type: 'crawler', hp: 10, maxHp: 10, x: 0.5, z: 1.2 },
        { id: 'crawler_4', type: 'crawler', hp: 10, maxHp: 10, x: -0.5, z: 1.2 }
    ].map((data) => ({
        position: { x: data.x, y: 0, z: data.z },
        userData: { ...data, burstTriggered: false },
        parent: {}
    }));
}

export function runEncounterSimulation(buildType = 'baseline', options = {}) {
    const pack = createStandardPack();
    const shotDamage = options.shotDamage ?? 4;
    const shotInterval = options.shotInterval ?? 0.2; // seconds between shots
    const tickStep = 0.05; // 50ms simulation step

    let time = 0;
    let shotsFired = 0;
    let nextShotTime = 0;
    let totalDirectDamage = 0;
    let totalElementalDamage = 0;
    let o2RestoredTotal = 0;
    let heartsRestoredTotal = 0;

    const overclocks = [];
    const relics = [];
    if (buildType === 'cryo_shatter') {
        overclocks.push(WEAPON_OVERCLOCKS.find((o) => o.id === 'cryo_rime'));
        relics.push(SUIT_RELICS.find((r) => r.id === 'shatter_engine'));
    } else if (buildType === 'bio_predator') {
        overclocks.push(WEAPON_OVERCLOCKS.find((o) => o.id === 'caustic_payload'));
        relics.push(SUIT_RELICS.find((r) => r.id === 'bio_vampirism'));
    }

    const activeSynergies = computeActiveSynergies([...overclocks, ...relics]);
    const hasCryoShatter = activeSynergies.some((s) => s.id === 'cryo_shatter');
    const hasBioPredator = activeSynergies.some((s) => s.id === 'bio_predator');

    const vitals = { hp: 2, maxHp: 4, o2: 50, maxO2: 100 };

    while (pack.some((s) => s.userData.hp > 0) && time < 30.0) {
        // Status effect ticking
        for (const sprite of pack) {
            if (sprite.userData.hp <= 0) continue;
            tickStatusEffects(sprite, tickStep, {
                onCorrosionTick: (target, dmg) => {
                    target.userData.hp = Math.max(0, target.userData.hp - dmg);
                    totalElementalDamage += dmg;
                    if (target.userData.hp <= 0 && !target.userData.burstTriggered) {
                        handleEnemyDeath(target);
                    }
                }
            });
        }

        // Firing weapon
        if (time >= nextShotTime) {
            const living = pack.filter((s) => s.userData.hp > 0);
            if (living.length > 0) {
                const target = living[0];
                shotsFired++;
                target.userData.hp = Math.max(0, target.userData.hp - shotDamage);
                totalDirectDamage += shotDamage;

                if (hasCryoShatter) {
                    applyStatus(target, 'freeze', 34);
                } else if (hasBioPredator) {
                    applyStatus(target, 'corrosion', 3.0);
                }

                if (target.userData.hp <= 0 && !target.userData.burstTriggered) {
                    handleEnemyDeath(target);
                }
                nextShotTime = time + shotInterval;
            }
        }

        time += tickStep;
    }

    function handleEnemyDeath(target) {
        target.userData.burstTriggered = true;

        if (hasCryoShatter) {
            const fStatus = getStatus(target, 'freeze');
            if (fStatus.isFrozen || target.userData.frozen) {
                const affected = resolveCryoShatterNova({
                    originX: target.position.x,
                    originZ: target.position.z,
                    scatterSprites: pack,
                    shatterRadius: 4.0,
                    shatterDamage: 25,
                    sourceSprite: target
                });
                for (const hit of affected) {
                    hit.sprite.userData.hp = Math.max(0, hit.sprite.userData.hp - hit.damage);
                    totalElementalDamage += hit.damage;
                    applyStatus(hit.sprite, 'freeze', 34);
                    if (hit.sprite.userData.hp <= 0 && !hit.sprite.userData.burstTriggered) {
                        handleEnemyDeath(hit.sprite);
                    }
                }
            }
        }

        if (hasBioPredator) {
            const cStatus = getStatus(target, 'corrosion');
            if (cStatus.active || target.userData.corroded) {
                const outcome = resolveBioVampirismKill({
                    playerVitals: vitals,
                    enemyType: target.userData.type,
                    isCorroded: true
                });
                o2RestoredTotal += outcome.o2Restored;
                heartsRestoredTotal += outcome.heartRestored;
                vitals.o2 = Math.min(vitals.maxO2, vitals.o2 + outcome.o2Restored);
                vitals.hp = Math.min(vitals.maxHp, vitals.hp + outcome.heartRestored);
            }
        }
    }

    const enemiesKilled = pack.filter((s) => s.userData.burstTriggered).length;
    const timeToClear = Math.round(time * 100) / 100;

    return {
        buildType,
        shotsFired,
        enemiesKilled,
        totalDirectDamage,
        totalElementalDamage,
        timeToClearSeconds: timeToClear,
        o2RestoredTotal,
        heartsRestoredTotal
    };
}

if (process.argv[1] && process.argv[1].endsWith('synergy-build-probe.js')) {
    const baseline = runEncounterSimulation('baseline');
    const cryo = runEncounterSimulation('cryo_shatter');
    const bio = runEncounterSimulation('bio_predator');

    console.log(JSON.stringify({ baseline, cryo, bio }, null, 2));
}
