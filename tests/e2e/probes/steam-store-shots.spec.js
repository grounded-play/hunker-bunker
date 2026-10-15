import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';

// Steam store screenshot capture (docs/planning/steam-store-page-v2-copy-and-images-2026-10-14.md).
// Stages real gameplay moments on the real GPU and saves raw frames of the
// game stage only (16:10, rendered at 2x); scripts/steam-store-shots.sh
// crops them to 16:9 1920x1080. The store set is picked from these by hand.
//   HB_PROBES=1 STORE_SHOTS_OUT=<dir> npx playwright test -c <gpu config> tests/e2e/probes/steam-store-shots.spec.js
// STORE_SHOTS_ONLY=combat,queen limits the run to the named scenes;
// STORE_SHOTS_CLASS=SCOUT|TANK|ENGINEER picks the operator.
const OUT = process.env.STORE_SHOTS_OUT ?? 'playwright-report/steam-store-shots';
const ONLY = new Set((process.env.STORE_SHOTS_ONLY ?? '').split(',').filter(Boolean));
const wants = (name) => ONLY.size === 0 || ONLY.has(name);

test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
test.setTimeout(2_400_000);

test('steam store shots', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    // Store frames are taken at High with the automatic step-down off, so a
    // capture-time stall cannot lower the look (or toast about it) mid-run.
    await page.addInitScript((playerClass) => {
        if (playerClass) localStorage.setItem('hb_active_class_v1', playerClass);
        localStorage.setItem('hb_graphics', JSON.stringify({
            values: { resolution: '100', shadows: 'full', postProcessing: 'on', worldDetail: 'high', landmarks: 'on', effects: 'full' },
            autoAdjust: false,
            autoChanges: []
        }));
    }, process.env.STORE_SHOTS_CLASS ?? null);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 60_000 });
    await page.evaluate(() => window.game.setGodMode?.(true));
    // Store frames keep the core HUD (vitals, weapon, objective, minimap) but
    // not the transient cards and prompts, which covered the player in early
    // takes. STORE_SHOTS_FULL_HUD=1 keeps everything.
    if (process.env.STORE_SHOTS_FULL_HUD !== '1') {
        await page.addStyleTag({
            content: `.hud-notification-stack, .hud-stack-card, #hazard-status-panel, [id$="-hud-prompt"],
                #tutorial-prompt, #terminal-status-ticker, #radio-transmission-prompt, #mouse-look-prompt,
                #telemeter-action-prompt { visibility: hidden !important; }`
        });
    }

    const log = [];
    const stage = async () => {
        const box = await page.locator('#game-viewport').boundingBox().catch(() => null);
        return box ?? { x: 0, y: 0, width: 1920, height: 1080 };
    };
    const shot = async (name, meta = {}) => {
        await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: await stage() });
        log.push({ name, ...meta, ...(await page.evaluate(() => ({
            biome: window.game.currentBiomeKey,
            timeOfDay: Math.round(window.game.timeOfDay * 100) / 100,
            enemies: (window.game.scatterSprites ?? []).filter((s) => s.userData?.isEnemy && s.visible).length
        }))) });
    };
    const view = async ({ zoom = 1, time = null } = {}) => {
        await page.evaluate(([z, t]) => {
            const game = window.game;
            if (t !== null) {
                game.timeOfDay = t;
                game.updateSky?.(0);
                game.updateDayNightCycle?.(0);
            }
            if (game.camera?.isOrthographicCamera) {
                game.camera.zoom = z;
                game.camera.updateProjectionMatrix();
            }
        }, [zoom, time]);
    };
    const teleport = async (x, z, settle = 7000) => {
        await page.evaluate(([wx, wz]) => {
            window.game.teleportPlayerTo(wx, wz, { safeFloor: true });
            window.game.snapCameraToPlayer?.();
        }, [x, z]);
        await page.waitForTimeout(settle);
    };
    const clearEnemies = () => page.evaluate(() => {
        for (const sprite of window.game.scatterSprites ?? []) {
            if (sprite.userData?.isEnemy) sprite.visible = false;
        }
    });
    // Enemy screen positions, projected through the live camera, in CSS px.
    const enemyScreenPoints = () => page.evaluate(() => {
        const game = window.game;
        const rect = game.renderer.domElement.getBoundingClientRect();
        const out = [];
        for (const sprite of game.scatterSprites ?? []) {
            if (!sprite.userData?.isEnemy || !sprite.visible) continue;
            const p = sprite.position.clone().project(game.camera);
            if (Math.abs(p.x) > 0.95 || Math.abs(p.y) > 0.95) continue;
            out.push({ x: rect.left + (p.x + 1) / 2 * rect.width, y: rect.top + (1 - p.y) / 2 * rect.height });
        }
        return out;
    });
    // Real fire input: point at the canvas spot and hold the button.
    const fireAt = async (x, y, ms = 450) => {
        await page.mouse.move(x, y, { steps: 5 });
        await page.mouse.down();
        await page.waitForTimeout(ms);
        await page.mouse.up();
    };
    const spawnRing = (types, radius = 4.5) => page.evaluate(([list, r]) => {
        const game = window.game;
        const p = game.player.position;
        list.forEach((type, i) => {
            const a = -0.9 + (i / Math.max(1, list.length - 1)) * 1.8;
            game.spawnEnemyInstance(type, p.x + Math.cos(a) * (r + (i % 2)), p.z + Math.sin(a) * (r + (i % 2)));
        });
    }, [types, radius]);
    const fightFrames = async (label, count = 5) => {
        for (let i = 0; i < count; i += 1) {
            const targets = await enemyScreenPoints();
            const box = await stage();
            const target = targets[i % Math.max(1, targets.length)] ?? { x: box.x + box.width * 0.62, y: box.y + box.height * 0.45 };
            await fireAt(target.x, target.y, 300 + i * 60);
            await shot(`${label}-${i}`, { targets: targets.length });
            await page.waitForTimeout(250);
        }
    };
    const scene = async (name, body) => {
        if (!wants(name)) return;
        // One stuck scene (the Queen arena once hung for minutes) must not
        // cost the frames of the scenes after it.
        let timer;
        const limit = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('scene time limit')), 240_000);
        });
        try {
            await Promise.race([body(), limit]);
        } catch (error) {
            log.push({ name, error: String(error).slice(0, 300) });
        } finally {
            clearTimeout(timer);
        }
        fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(log, null, 1));
    };

    await scene('spawn', async () => {
        await page.waitForTimeout(3000);
        await view({ zoom: 1, time: 0.35 });
        await shot('spawn-wreck-day');
        await view({ zoom: 1.35, time: 0.8 });
        await page.waitForTimeout(800);
        await shot('spawn-wreck-dusk-close');
        await view({ zoom: 1 });
    });

    await scene('biomes', async () => {
        const spots = [['bunker', 12, 0], ['bunker2', -20, 10], ['cryo', 70, 10], ['cryo2', -60, 40], ['bio', 150, 0], ['bio2', -130, 130]];
        for (const [label, x, z] of spots) {
            await teleport(x, z);
            for (const [tag, zoom, time] of [['day', 1, 0.4], ['dusk', 1.2, 0.74]]) {
                await view({ zoom, time });
                await page.waitForTimeout(700);
                await shot(`biome-${label}-${tag}`);
            }
        }
        await view({ zoom: 1, time: 0.4 });
    });

    // Real field-weapon swap: drop the gun at the player's feet and take it
    // through the same interaction the SWAP TO prompt runs.
    const equip = (profileId) => page.evaluate((id) => {
        const game = window.game;
        const p = game.player.position;
        const drop = game.spawnFieldWeaponDrop(id, p.x, p.z, { ammoInWeapon: 240, reserveAmmo: 480 });
        if (drop?.instanceId) game.interactWithFieldWeaponDrop(drop.instanceId);
        return Boolean(drop);
    }, profileId);

    await scene('combat', async () => {
        const fights = [
            ['bunker-flame', 12, 0, 'flamethrower', ['cybersnail', 'crawler', 'cybersnail', 'crawler', 'cybersnail', 'crawler'], 0.45],
            ['cryo-scatter', 70, 10, 'scatter_rep', ['cryosnail', 'crawler', 'cybersnail', 'cryosnail', 'crawler'], 0.7],
            ['bio-smg', 150, 0, 'neon_smg', ['sporesnail', 'crawler', 'sporesnail', 'cybersnail', 'crawler', 'sporesnail'], 0.74],
            ['cryo2-lance', -60, 40, 'cryo_lance', ['cryosnail', 'crawler', 'cryosnail', 'crawler'], 0.5],
            ['bunker2-rail', -20, 10, 'rail_marksman', ['crawler', 'crawler', 'cybersnail', 'crawler'], 0.76]
        ];
        for (const [label, x, z, weapon, types, time] of fights) {
            await teleport(x, z, 6000);
            await clearEnemies();
            await equip(weapon);
            await view({ zoom: 1.4, time });
            await spawnRing(types, 3.2);
            await page.waitForTimeout(1200);
            await fightFrames(`combat-${label}`, 6);
        }
        await view({ zoom: 1 });
    });

    // One furnished room per theme near spawn (the room-dressing pass is the
    // best-looking interior content). Mounts the ring of chunks first.
    const findRooms = () => page.evaluate(() => {
            const game = window.game;
            const found = new Map();
            for (let cx = -3; cx <= 3; cx += 1) {
                for (let cy = -3; cy <= 3; cy += 1) {
                    if (cx === 0 && cy === 0) continue;
                    game.getOrCreateChunk?.(cx, cy);
                    if (!game.chunkMeshes.has(`${cx},${cy}`)) game.mountChunk?.(cx, cy);
                    for (const room of game.wfcMetadataCache.get(`${cx},${cy}`)?.roomInstances ?? []) {
                        if (!(room.interior?.length > 24)) continue;
                        const key = room.theme ?? room.buildId ?? room.id;
                        if (found.has(key)) continue;
                        const center = room.interior[Math.floor(room.interior.length / 2)];
                        found.set(key, { key, x: cx * game.chunkSize + center.x, z: cy * game.chunkSize + center.y });
                    }
                }
            }
            return [...found.values()].slice(0, 10);
    });
    const enterRoom = async (room) => {
        await page.evaluate(([wx, wz]) => {
            window.game.teleportPlayerTo(wx, wz, { safeFloor: false });
            window.game.snapCameraToPlayer?.();
        }, [room.x, room.z]);
        await page.waitForTimeout(9000);
    };

    await scene('rooms', async () => {
        const rooms = await findRooms();
        fs.writeFileSync(path.join(OUT, 'rooms.json'), JSON.stringify(rooms, null, 1));
        for (const [i, room] of rooms.entries()) {
            await enterRoom(room);
            await view({ zoom: 1.15, time: i % 2 ? 0.72 : 0.42 });
            await page.waitForTimeout(600);
            await shot(`room-${String(i).padStart(2, '0')}-${String(room.key).replace(/[^a-z0-9_-]/gi, '_')}`);
        }
        await view({ zoom: 1, time: 0.4 });
    });

    // A fight inside each furnished room: the dressing and the combat in one
    // frame, which is what the store's first screenshots need.
    await scene('roomfights', async () => {
        const weapons = ['flamethrower', 'scatter_rep', 'neon_smg', 'cryo_lance', 'rail_marksman', 'pulse_carbine'];
        const packs = [
            ['cybersnail', 'crawler', 'cybersnail', 'crawler', 'crawler'],
            ['cryosnail', 'crawler', 'cybersnail', 'cryosnail', 'crawler'],
            ['sporesnail', 'crawler', 'sporesnail', 'crawler', 'cybersnail']
        ];
        const rooms = await findRooms();
        for (const [i, room] of rooms.entries()) {
            await enterRoom(room);
            await clearEnemies();
            await equip(weapons[i % weapons.length]);
            await view({ zoom: 1.35, time: 0.42 });
            await spawnRing(packs[i % packs.length], 3.4);
            await page.waitForTimeout(1300);
            await fightFrames(`roomfight-${String(i).padStart(2, '0')}-${String(room.key).replace(/[^a-z0-9_-]/gi, '_')}`, 4);
        }
        await view({ zoom: 1 });
    });

    await scene('camps', async () => {
        const sites = await page.evaluate(() => {
            const state = window.game.act2?.getState?.();
            const camps = (state?.camps ?? []).map((c) => ({ kind: 'camp', id: c.id, x: c.x, z: c.z }));
            const hives = (window.game.hives ?? []).map((h, i) => ({
                kind: 'hive',
                id: h.id ?? `hive${i}`,
                x: h.x ?? h.position?.x ?? h.group?.position?.x,
                z: h.z ?? h.position?.z ?? h.group?.position?.z
            }));
            return [...camps, ...hives].filter((s) => Number.isFinite(s.x) && Number.isFinite(s.z));
        });
        fs.writeFileSync(path.join(OUT, 'sites.json'), JSON.stringify(sites, null, 1));
        for (const site of sites.slice(0, 6)) {
            await teleport(site.x + 3, site.z + 3, 9000);
            await view({ zoom: 1.05, time: 0.72 });
            await page.waitForTimeout(700);
            await shot(`${site.kind}-${site.id}`);
        }
        await view({ zoom: 1, time: 0.4 });
    });

    await scene('map', async () => {
        await teleport(12, 0, 4000);
        await page.keyboard.press('KeyM');
        await page.waitForTimeout(1800);
        await shot('tactical-map');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
    });

    await scene('queen', async () => {
        await clearEnemies();
        // The Queen spawns at the cave entrance, not on the player: stand
        // the player a few metres off her so the camera frames both.
        const queen = await page.evaluate(() => {
            const sprite = window.game.startQueenFight?.() ?? window.game.queenFightSprite;
            return sprite ? { x: sprite.position.x, z: sprite.position.z } : null;
        });
        if (queen) await teleport(queen.x + 4.5, queen.z + 4.5, 9000);
        else await page.waitForTimeout(9000);
        await view({ zoom: 1 });
        await shot('queen-arrival');
        await fightFrames('queen', 6);
        await view({ zoom: 0.85 });
        await shot('queen-wide');
    });

    fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify(log, null, 1));
});
