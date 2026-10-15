// Trailer v4 shot recipes (docs/planning/trailer-v4-capture-edit-and-sound-plan-2026-10-14.md §5.3, §5.5).
//
// A recipe is data plus two hooks:
//   setup(api, ctx)        real time: teleport, weapon, time of day, spawns
//   frame(f, api, ctx)     virtual time, before each step: input (keys, aim, fire)
// The runner (capture-v4.spec.js) boots once per class and captures each
// recipe to trailer/raw/v4/<id>/<id>.mkv + events + meta. Coordinates are the
// default campaign layout (seed of a fresh profile), scouted 2026-10-14:
// furnished rooms from wfcMetadataCache, camps from act2.getState(), hives
// from game.hives.

export const PLACES = {
    bunkerCleanroom: [24, -74],
    bunkerMedical: [-25, -23],
    bunkerCorridor: [12, 0],
    tankCrashSite: [12.5, 16.5],
    cryoEngineering: [73, 73],
    cryoMedical: [76, -73],
    cryoField: [70, 10],
    bioMedical: [172, -76],
    bioNest: [24, 171],
    bioFeeding: [73, 171],
    bioField: [150, 0],
    obsidian: [171, 24],
    cathedral: [-123, -123],
    toxicSump: [-123, 171],
    campMeridian: [-25, 73],
    campTallow: [24, -172],
    hiveSuture: [73, 171]
};

// Aim at the nearest live enemy every `every` frames; hold fire in [from, to).
export function fight({ from = 6, to = Infinity, every = 6, fallback = [0.62, 0.42] } = {}) {
    return async (f, api) => {
        if (f % every === 0) {
            const targets = await api.enemyPoints();
            const box = await api.page.locator('#game-viewport').boundingBox();
            const t = targets[0] ?? { x: box.x + box.width * fallback[0], y: box.y + box.height * fallback[1] };
            await api.page.mouse.move(t.x, t.y);
        }
        if (f === from) await api.page.mouse.down();
        if (f === to) await api.page.mouse.up();
    };
}

// Hold movement keys over frame ranges: [[code, from, to], ...].
export function keys(track) {
    return async (f, api) => {
        for (const [code, from, to] of track) {
            if (f === from) await api.page.keyboard.down(code);
            if (f === to) await api.page.keyboard.up(code);
        }
    };
}

// Point the mouse at a screen fraction of the stage (aim direction for walks).
export function aimAt(fx, fy) {
    return async (f, api) => {
        if (f !== 0) return;
        const box = await api.page.locator('#game-viewport').boundingBox();
        await api.page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
    };
}

export const all = (...fns) => async (f, api, ctx) => {
    for (const fn of fns) await fn(f, api, ctx);
};

const arrive = async (api, place, { zoom = 1.3, time = 0.45, weapon = null, settle = 7000, safeFloor = true } = {}) => {
    await api.clearEnemies(80);
    await api.teleport(place[0], place[1], { settle, safeFloor });
    await api.clearEnemies(40);
    if (weapon) await api.equip(weapon);
    await api.view({ zoom, time });
};

// Real lights-out event; if the O2 generator isn't online on this fresh
// profile, apply the same two effects triggerLightsOut() applies.
const lightsOut = (api, seconds) => api.evaluate((s) => {
    const game = window.game;
    if (game.triggerLightsOut(s)) return 'event';
    game._lightsOutUntil = Math.max(game._lightsOutUntil ?? 0, performance.now() + s * 1000);
    game.showBunkerLine?.('LIGHTING BREAKER TRIPPED. PLEASE ENJOY THE DARKNESS RESPONSIBLY.');
    return 'effects';
}, seconds);

// The Queen (2026-10-14, dev/sprint-52): startQueenFight() spawns her at an
// offset from the player (below the bottom edge), she never moves, and her
// model plays an emergence (root scale 0.05 -> 1, ~1.5 s once the GLB is
// cached; the first spawn also waits for the load). Her model rises about
// 0.66 NDC above its root, so anything placed screen-up leaves the 16:9 crop:
// she is framed beside the player (side), not ahead (dist). Her brood adds are
// alien_proto_crawler models that read like small Queens. So: spawn once to
// cache the model, then spawn fresh, move her to a screen-relative spot (dist
// screen-up, side screen-right) in the player's chunk (the sprite's parent
// chunk is what gets drawn), and either film the emergence or wait it out.
const despawnQueen = (api) => api.evaluate(() => {
    const game = window.game;
    const old = game.queenFightSprite;
    if (!old) return;
    old.userData.enemy3dVisual?.root?.removeFromParent?.();
    old.userData.world3dRoot?.removeFromParent?.();
    old.parent?.remove(old);
    game.scatterSprites = game.scatterSprites.filter((s) => s !== old);
    game.queenFightSprite = null;
});
const placeQueen = (api, dist, side) => api.evaluate(([d, s]) => {
    const game = window.game;
    const queen = game.startQueenFight();
    if (!queen) return false;
    const p = game.player.position;
    const f = game.cameraPlanarForward;
    const r = game.cameraPlanarRight;
    const x = p.x + f.x * d + r.x * s;
    const z = p.z + f.y * d + r.y * s;
    (game.chunkMeshes.get(`${Math.floor(x / game.chunkSize)},${Math.floor(z / game.chunkSize)}`) ?? game.scene).add(queen);
    queen.position.x = x;
    queen.position.z = z;
    return true;
}, [dist, side]);

const frameQueen = async (api, { dist, side = 0, zoom = 1.1, time = 0.7, weapon = null, emerge = false, place = PLACES.tankCrashSite }) => {
    await despawnQueen(api);
    await api.clearEnemies(80);
    await api.teleport(place[0], place[1], { settle: 6000 });
    if (weapon) await api.equip(weapon);
    await api.view({ zoom, time });
    // Cache the model.
    if (!(await placeQueen(api, dist, side))) throw new Error('queen did not spawn');
    await api.page.waitForFunction(() => (window.game.queenFightSprite?.userData?.enemy3dVisual?.root?.scale?.x ?? 0) > 0.99, null, { timeout: 90_000 });
    await despawnQueen(api);
    await api.clearEnemies(80);
    if (!(await placeQueen(api, dist, side))) throw new Error('queen did not respawn');
    if (emerge) return;
    await api.page.waitForFunction(() => (window.game.queenFightSprite?.userData?.enemy3dVisual?.root?.scale?.x ?? 0) > 0.99, null, { timeout: 30_000 });
};

// Per-frame Queen state for the take's meta.json (screen position, model scale).
export const queenProbe = () => {
    const game = window.game;
    const q = game.queenFightSprite;
    if (!q) return null;
    const p = q.position.clone().project(game.camera);
    return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, scale: Math.round((q.userData.enemy3dVisual?.root?.scale?.x ?? 0) * 100) / 100, hp: q.userData.hp };
};

// Aim at the Queen herself (her adds are nearer); hold fire from `from`.
const fightQueen = ({ from = 4, every = 10 } = {}) => async (f, api) => {
    if (f % every === 0) {
        const pt = await api.evaluate(() => {
            const game = window.game;
            const q = game.queenFightSprite;
            if (!q) return null;
            const rect = game.renderer.domElement.getBoundingClientRect();
            const v = q.position.clone();
            v.y += 1.2;
            v.project(game.camera);
            return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height };
        });
        if (pt) await api.page.mouse.move(pt.x, pt.y);
    }
    if (f === from) await api.page.mouse.down();
};

export const SHOTS = [
    // ---------------------------------------------------------------- TANK
    {
        id: 'cold-open-tank', cls: 'TANK', fps: 120, seconds: 4, hud: 'game', seed: 101,
        setup: async (api) => {
            await arrive(api, PLACES.bioNest, { zoom: 1.35, time: 0.8, weapon: 'scatter_rep', safeFloor: false });
            await api.spawnScreen(['cybersnail', 'crawler', 'sporesnail', 'crawler', 'cybersnail'], { dist: 4.2, from: -10, to: 80, hpMult: 3 });
            await api.page.waitForTimeout(500);
        },
        frame: fight({ from: 2, every: 12 })
    },
    {
        id: 'tank-smash', cls: 'TANK', fps: 60, seconds: 3, hud: 'clean', seed: 102,
        setup: async (api) => {
            await arrive(api, PLACES.bunkerMedical, { zoom: 1.5, time: 0.5, safeFloor: false });
            await api.spawnScreen(['crawler', 'cybersnail', 'crawler'], { dist: 1.6, from: -10, to: 40, hpMult: 1 });
        },
        frame: all(fight({ from: 999, every: 10 }), async (f, api) => {
            if (f === 20 || f === 80 || f === 140) await api.page.keyboard.press('KeyV');
        })
    },
    {
        id: 'drop-shotgun', cls: 'TANK', fps: 60, seconds: 2.5, hud: 'game', seed: 103,
        setup: async (api) => {
            await arrive(api, PLACES.cryoMedical, { zoom: 1.45, time: 0.45, weapon: 'scatter_rep', safeFloor: false });
            await api.spawnScreen(['cybersnail', 'cryosnail', 'cybersnail'], { dist: 2.4, from: 0, to: 50, hpMult: 2 });
        },
        frame: fight({ from: 3, every: 8 })
    },
    {
        id: 'drop-flame', cls: 'TANK', fps: 60, seconds: 2.5, hud: 'game', seed: 104,
        setup: async (api) => {
            await arrive(api, PLACES.obsidian, { zoom: 1.4, time: 0.72, weapon: 'flamethrower', safeFloor: false });
            await api.spawnScreen(['crawler', 'sporesnail', 'crawler', 'sporesnail', 'crawler'], { dist: 3.2, from: -30, to: 60, hpMult: 3 });
        },
        frame: fight({ from: 3, every: 8 })
    },
    {
        id: 'lights-out', cls: 'TANK', fps: 60, seconds: 6, hud: 'game', seed: 105,
        setup: async (api) => {
            await arrive(api, PLACES.bunkerCorridor, { zoom: 1.25, time: 0.42 });
        },
        // The breaker trip is the real event (bunker line + dayBlend hold).
        // In-game it only dims, so the take also drops to night on the same
        // frame (a real state; the edit adds a flicker on the cut). The aim
        // sweeps so the flashlight cone moves.
        frame: async (f, api) => {
            const box = await api.page.locator('#game-viewport').boundingBox();
            const a = -0.6 + Math.min(1, f / 300) * 1.6;
            await api.page.mouse.move(box.x + box.width * (0.5 + 0.28 * Math.cos(a)), box.y + box.height * (0.44 - 0.28 * Math.sin(a)));
            if (f === 90) {
                await lightsOut(api, 8);
                await api.view({ time: 0.86 });
            }
        }
    },
    {
        id: 'o2-critical', cls: 'TANK', fps: 60, seconds: 4, hud: 'game', seed: 106,
        setup: async (api) => {
            await arrive(api, PLACES.cryoField, { zoom: 1.25, time: 0.66 });
            await api.evaluate(() => window.game.setGodMode(false));
        },
        frame: all(keys([['KeyD', 0, 200], ['KeyW', 60, 200]]), aimAt(0.7, 0.35), async (f, api) => {
            // Bleed the O2 bar from 24% to 9% across the take.
            await api.evaluate((v) => { window.game.playerVitals.o2 = v; window.game.emitO2State?.(); }, 24 - (15 * f) / 240);
            if (f === 239) await api.evaluate(() => window.game.setGodMode(true));
        })
    },
    {
        id: 'boss-charge', cls: 'TANK', fps: 120, seconds: 3, hud: 'game', seed: 107,
        setup: async (api) => {
            await arrive(api, PLACES.cryoEngineering, { zoom: 1.2, time: 0.7, weapon: 'scatter_rep', safeFloor: false });
            await api.spawnScreen(['boss_cybersnail'], { dist: 5.5, from: 35, to: 35, hpMult: 2 });
            await api.page.waitForTimeout(800);
        },
        frame: fight({ from: 30, every: 12 })
    },
    {
        id: 'queen-push', probe: queenProbe, cls: 'TANK', fps: 60, seconds: 5, hud: 'clean', seed: 108,
        setup: async (api) => frameQueen(api, { dist: 0, side: 3.5, zoom: 1.1, emerge: true }),
        frame: aimAt(0.5, 0.3)
    },
    {
        id: 'queen-turn', probe: queenProbe, cls: 'TANK', fps: 60, seconds: 4, hud: 'clean', seed: 109,
        setup: async (api) => frameQueen(api, { dist: -0.4, side: 2.6, zoom: 1.45 }),
        frame: aimAt(0.5, 0.25)
    },
    {
        id: 'queen-fight', probe: queenProbe, cls: 'TANK', fps: 60, seconds: 4, hud: 'game', seed: 110,
        setup: async (api) => frameQueen(api, { dist: 0.3, side: 3.8, zoom: 1.1, weapon: 'scatter_rep' }),
        frame: fightQueen({ from: 4, every: 10 })
    },
    {
        id: 'walk-bunker', cls: 'TANK', fps: 60, seconds: 2.5, hud: 'clean', seed: 111,
        setup: async (api) => arrive(api, PLACES.bunkerCorridor, { zoom: 1.2, time: 0.5 }),
        frame: all(aimAt(0.75, 0.45), keys([['KeyD', 0, 999]]))
    },

    // --------------------------------------------------------------- SCOUT
    {
        id: 'wreck-dawn-wide', cls: 'SCOUT', fps: 60, seconds: 4, hud: 'clean', seed: 201,
        setup: async (api, ctx) => {
            await api.clearEnemies(80);
            await api.teleport(ctx.spawn.x, ctx.spawn.z, { settle: 5000 });
            await api.view({ zoom: 0.9, time: 0.27 });
        },
        frame: all(aimAt(0.7, 0.45), keys([['KeyD', 40, 999]]))
    },
    {
        id: 'scout-dash', cls: 'SCOUT', fps: 60, seconds: 3, hud: 'clean', seed: 202,
        setup: async (api) => {
            await arrive(api, PLACES.cryoEngineering, { zoom: 1.3, time: 0.5, weapon: 'neon_smg', safeFloor: false });
            await api.spawnScreen(['cryosnail', 'crawler', 'crawler'], { dist: 4.5, from: 20, to: 70, hpMult: 2 });
        },
        frame: all(fight({ from: 50, every: 6 }), keys([['ShiftLeft', 0, 40], ['KeyD', 0, 40]]), async (f, api) => {
            if (f === 12) await api.page.keyboard.press('Space');
        })
    },
    {
        id: 'drop-rail', cls: 'SCOUT', fps: 240, seconds: 2, hud: 'game', seed: 203,
        setup: async (api) => {
            await arrive(api, PLACES.obsidian, { zoom: 1.25, time: 0.74, weapon: 'rail_marksman', safeFloor: false });
            await api.spawnScreen(['crawler', 'crawler', 'crawler'], { dist: 4, from: 30, to: 30, jitter: 1.4 });
        },
        frame: fight({ from: 24, every: 24 })
    },
    {
        id: 'drop-smg', cls: 'SCOUT', fps: 60, seconds: 2.5, hud: 'game', seed: 204,
        setup: async (api) => {
            await arrive(api, PLACES.cryoField, { zoom: 1.4, time: 0.74, weapon: 'neon_smg' });
            await api.spawnScreen(['sporesnail', 'crawler', 'sporesnail', 'crawler'], { dist: 3.5, from: -20, to: 60, hpMult: 3 });
        },
        frame: fight({ from: 3, every: 6 })
    },
    {
        id: 'drop-cryo', cls: 'SCOUT', fps: 240, seconds: 2, hud: 'game', seed: 205,
        setup: async (api) => {
            await arrive(api, PLACES.cryoEngineering, { zoom: 1.45, time: 0.5, weapon: 'cryo_lance', safeFloor: false });
            await api.spawnScreen(['cryosnail', 'cryosnail', 'crawler'], { dist: 3, from: 10, to: 50, hpMult: 2 });
        },
        frame: fight({ from: 12, every: 24 })
    },
    {
        id: 'crawler-lunge', cls: 'SCOUT', fps: 120, seconds: 2, hud: 'game', seed: 206,
        setup: async (api) => {
            await arrive(api, PLACES.bunkerMedical, { zoom: 1.5, time: 0.78, safeFloor: false });
            await api.spawnScreen(['crawler'], { dist: 3.2, from: 20, to: 20, hpMult: 4 });
        },
        frame: fight({ from: 150, every: 12 })
    },
    {
        id: 'welcome-committee', cls: 'SCOUT', fps: 60, seconds: 5, hud: 'game', seed: 207,
        setup: async (api) => {
            await arrive(api, PLACES.cathedral, { zoom: 1.1, time: 0.6, weapon: 'pulse_carbine', safeFloor: false });
            await api.spawnScreen(['crawler', 'crawler', 'crawler', 'crawler', 'crawler', 'crawler'], { dist: 9, from: 25, to: 80, jitter: 1.5, hpMult: 2 });
        },
        frame: fight({ from: 200, every: 10 })
    },
    {
        id: 'salvage', cls: 'SCOUT', fps: 60, seconds: 4, hud: 'game', seed: 208,
        setup: async (api) => {
            await arrive(api, PLACES.cryoField, { zoom: 1.35, time: 0.5, weapon: 'pulse_carbine' });
            await api.spawnScreen(['cybersnail', 'cybersnail', 'crawler'], { dist: 2.4, from: -20, to: 20 });
        },
        frame: all(fight({ from: 2, to: 60, every: 6 }), keys([['KeyD', 70, 999]]))
    },
    {
        id: 'walk-cryo', cls: 'SCOUT', fps: 60, seconds: 2.5, hud: 'clean', seed: 209,
        setup: async (api) => arrive(api, PLACES.cryoField, { zoom: 1.2, time: 0.5 }),
        frame: all(aimAt(0.75, 0.45), keys([['KeyD', 0, 999]]))
    },
    {
        id: 'walk-bio', cls: 'SCOUT', fps: 60, seconds: 2.5, hud: 'clean', seed: 210,
        setup: async (api) => arrive(api, PLACES.bioField, { zoom: 1.2, time: 0.5 }),
        frame: all(aimAt(0.75, 0.45), keys([['KeyD', 0, 999]]))
    },
    {
        id: 'walk-rim', cls: 'SCOUT', fps: 60, seconds: 2.5, hud: 'clean', seed: 211,
        setup: async (api) => arrive(api, PLACES.cathedral, { zoom: 1.0, time: 0.7, safeFloor: false }),
        frame: all(aimAt(0.75, 0.45), keys([['KeyD', 0, 999]]))
    },

    // ------------------------------------------------------------ ENGINEER
    {
        id: 'engineer-turret', cls: 'ENGINEER', fps: 60, seconds: 3.5, hud: 'clean', seed: 301,
        setup: async (api) => {
            await arrive(api, PLACES.bunkerMedical, { zoom: 1.3, time: 0.5, safeFloor: false });
            await api.evaluate(() => window.game.despawnEngineerTurret?.());
            await api.spawnScreen(['cybersnail', 'crawler', 'cybersnail', 'crawler'], { dist: 5, from: 10, to: 80, hpMult: 3 });
        },
        frame: all(fight({ from: 40, every: 8 }), async (f, api) => {
            if (f === 6) await api.evaluate(() => window.game.deployEngineerTurret());
        })
    },
    {
        id: 'drop-turret', cls: 'ENGINEER', fps: 60, seconds: 3, hud: 'game', seed: 302,
        setup: async (api) => {
            await arrive(api, PLACES.cryoMedical, { zoom: 1.3, time: 0.45, safeFloor: false });
            await api.evaluate(() => { window.game.despawnEngineerTurret?.(); window.game.deployEngineerTurret(); });
            await api.spawnScreen(['crawler', 'cryosnail', 'crawler', 'cryosnail', 'crawler'], { dist: 6, from: 20, to: 70, hpMult: 2 });
        },
        frame: fight({ from: 10, every: 8 })
    },
    {
        id: 'drop-tesla', cls: 'ENGINEER', fps: 60, seconds: 2.5, hud: 'game', seed: 303,
        setup: async (api) => {
            await arrive(api, PLACES.bioNest, { zoom: 1.35, time: 0.72, safeFloor: false });
            await api.spawnScreen(['sporesnail', 'crawler', 'sporesnail'], { dist: 3.5, from: 0, to: 60, hpMult: 3 });
        },
        frame: fight({ from: 3, every: 6 })
    },
    {
        id: 'drop-pulse', cls: 'ENGINEER', fps: 60, seconds: 2.5, hud: 'game', seed: 304,
        setup: async (api) => {
            await arrive(api, PLACES.cryoField, { zoom: 1.35, time: 0.62, weapon: 'pulse_carbine' });
            await api.spawnScreen(['cryosnail', 'crawler', 'cryosnail', 'crawler'], { dist: 4, from: -10, to: 60, hpMult: 3 });
        },
        frame: fight({ from: 3, every: 6 })
    },
    {
        id: 'camp-siege', cls: 'ENGINEER', fps: 60, seconds: 4, hud: 'clean', seed: 305,
        setup: async (api) => {
            await arrive(api, [PLACES.campMeridian[0] + 3, PLACES.campMeridian[1] + 3], { zoom: 1.0, time: 0.74, weapon: 'scatter_rep', settle: 9000 });
            await api.spawnScreen(['crawler', 'cybersnail', 'crawler', 'crawler', 'cybersnail', 'crawler'], { dist: 7, from: 100, to: 200, jitter: 1.2, hpMult: 2 });
        },
        frame: fight({ from: 40, every: 8 })
    },
    {
        id: 'hive-pulse', cls: 'ENGINEER', fps: 60, seconds: 4, hud: 'clean', seed: 306,
        setup: async (api) => {
            await arrive(api, [PLACES.hiveSuture[0] + 4, PLACES.hiveSuture[1] + 4], { zoom: 1.05, time: 0.74, settle: 9000 });
        },
        frame: all(aimAt(0.4, 0.3), keys([['KeyW', 30, 999]]))
    }
];
