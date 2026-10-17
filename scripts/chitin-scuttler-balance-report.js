#!/usr/bin/env node
/**
 * Deterministic Chitin Scuttler balance probe.
 *
 * This runs the real ThreeGame crawler state machine at 60 Hz. It is not a
 * substitute for a human feel pass; it answers the narrower regression
 * questions: how quickly can a pack land damage, and can each base chassis
 * evade after a plausible reaction delay?
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHITIN_SCUTTLER, scuttlerTuning } from '../src/chitinScuttler.js';
import { CLASS_STATS, ThreeGame, WEAPON_FIRE_COOLDOWN } from '../src/threeGame.js';

export const SCUTTLER_BALANCE_SCENARIOS = Object.freeze({
    close: Object.freeze([
        Object.freeze({ x: 2.2, z: 0 }),
        Object.freeze({ x: -2.4, z: 0.6 }),
        Object.freeze({ x: 0, z: -2.8 })
    ]),
    roomEdge: Object.freeze([
        Object.freeze({ x: 4.5, z: 0 }),
        Object.freeze({ x: 4.8, z: 1.4 }),
        Object.freeze({ x: 3.8, z: -1.6 })
    ])
});

function seededRandom(seed = 1) {
    let value = seed >>> 0;
    return () => {
        value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

function makeSprite(position, index) {
    return {
        position: { x: position.x, y: 0, z: position.z },
        material: { color: { setHex() {} } },
        userData: {
            type: CHITIN_SCUTTLER.type,
            crawlerTuning: scuttlerTuning(index),
            crawlerState: 'idle',
            windupTimer: 0,
            chargeTimer: 0,
            chargeDirX: 0,
            chargeDirZ: 0,
            attackCooldown: 0,
            balanceProbeIndex: index
        }
    };
}

/** Run one deterministic encounter through ThreeGame.updateCrawlerBehavior. */
export function simulateScuttlerEncounter({
    positions = SCUTTLER_BALANCE_SCENARIOS.close,
    durationSeconds = 8,
    playerHp = 3,
    playerSpeed = 0,
    reactionSeconds = 0.35,
    fireIntervalSeconds = null,
    seed = 1,
    fixedDeltaSeconds = 1 / 60
} = {}) {
    const game = Object.create(ThreeGame.prototype);
    const player = { position: { x: 0, y: 0, z: 0 } };
    const sprites = positions.map(makeSprite);
    const alive = new Set(sprites);
    const hits = [];
    const kills = [];
    let hp = playerHp;
    let elapsed = 0;
    let fireTimer = reactionSeconds;

    Object.assign(game, {
        player,
        isPlayerDead: false,
        canEnemyTargetPlayer: () => true,
        getTileType: () => '.',
        getCurrentContainmentOptions: () => ({ containmentZones: [], doors: [] }),
        faceSpriteFromDir() {},
        isHiveKinPassive: () => false,
        takeDamage(amount, reason) {
            hp = Math.max(0, hp - amount);
            hits.push({ timeSeconds: elapsed, reason, hp });
            if (hp <= 0) game.isPlayerDead = true;
            return true;
        }
    });

    const priorWindow = globalThis.window;
    const priorCustomEvent = globalThis.CustomEvent;
    const priorRandom = Math.random;
    globalThis.window = {
        dispatchEvent() {},
        AudioManager: { play() {}, playMetalStress() {}, playProceduralCreatureAlert() {} }
    };
    globalThis.CustomEvent ??= class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    };
    Math.random = seededRandom(seed);

    try {
        while (elapsed < durationSeconds && !game.isPlayerDead) {
            if (elapsed >= reactionSeconds && playerSpeed > 0) {
                // Perpendicular movement is the intended answer to a locked
                // charge direction; straight retreat unfairly favors speed.
                player.position.z += playerSpeed * fixedDeltaSeconds;
            }

            if (fireIntervalSeconds != null) {
                fireTimer -= fixedDeltaSeconds;
                if (fireTimer <= 0 && alive.size) {
                    const target = [...alive].sort((a, b) => (
                        Math.hypot(a.position.x - player.position.x, a.position.z - player.position.z)
                        - Math.hypot(b.position.x - player.position.x, b.position.z - player.position.z)
                    ))[0];
                    alive.delete(target);
                    kills.push({ timeSeconds: elapsed, index: target.userData.balanceProbeIndex });
                    fireTimer += fireIntervalSeconds;
                }
            }

            for (const sprite of alive) game.updateCrawlerBehavior(sprite, fixedDeltaSeconds);
            elapsed += fixedDeltaSeconds;
        }
    } finally {
        Math.random = priorRandom;
        if (priorWindow === undefined) delete globalThis.window;
        else globalThis.window = priorWindow;
        if (priorCustomEvent === undefined) delete globalThis.CustomEvent;
        else globalThis.CustomEvent = priorCustomEvent;
    }

    return {
        survived: hp > 0,
        hpRemaining: hp,
        damageTaken: playerHp - hp,
        firstHitSeconds: hits[0]?.timeSeconds ?? null,
        lethalTimeSeconds: hp <= 0 ? hits.at(-1).timeSeconds : null,
        enemiesKilled: kills.length,
        hits,
        kills
    };
}

export function buildScuttlerBalanceReport() {
    const rows = [];
    for (const [range, positions] of Object.entries(SCUTTLER_BALANCE_SCENARIOS)) {
        rows.push({ range, response: 'stationary', ...simulateScuttlerEncounter({ positions }) });
        for (const [className, stats] of Object.entries(CLASS_STATS)) {
            rows.push({
                range,
                response: `${className.toLowerCase()}-sidestep`,
                ...simulateScuttlerEncounter({ positions, playerSpeed: stats.moveSpeed })
            });
            rows.push({
                range,
                response: `${className.toLowerCase()}-fire`,
                ...simulateScuttlerEncounter({
                    positions,
                    fireIntervalSeconds: WEAPON_FIRE_COOLDOWN,
                    // Tank's two-damage projectile still kills a 1 HP
                    // scuttler in one hit, so cadence is the relevant value.
                    playerSpeed: 0
                })
            });
        }
    }
    return rows;
}

function formatSeconds(value) {
    return value == null ? '   --' : `${value.toFixed(2).padStart(4)}s`;
}

function main() {
    console.log('[scuttler-balance] real crawler AI, 60 Hz, 350ms response delay, 3 HP');
    console.log('[scuttler-balance] modeled response probes are regression evidence, not human playtest data:\n');
    for (const row of buildScuttlerBalanceReport()) {
        console.log(
            `${row.range.padEnd(8)} ${row.response.padEnd(18)} `
            + `damage=${row.damageTaken} hp=${row.hpRemaining} `
            + `first=${formatSeconds(row.firstHitSeconds)} lethal=${formatSeconds(row.lethalTimeSeconds)} `
            + `kills=${row.enemiesKilled}`
        );
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
