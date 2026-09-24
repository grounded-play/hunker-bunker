import fs from 'node:fs';
import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Sprint 47 Ring 1 slice probe: three pinned campaign seeds x three classes.
// Each run deploys once and records what the player meets: the optional
// event (signal, route chip, the ship goal still tracked), the site's choice
// modal, the response taken through the real buttons, the fight or bypass it
// starts, what the cross-lane contracts actually delivered, and the results
// screen's expedition report. On a build without the event system the same
// probe records that no route appears.
//
// Shortcuts, all of them recorded in the output and the slice report:
// - Game time advances at most 0.05 s a frame and this headless machine
//   renders under 1 fps, so the wait until the signal is skipped by moving
//   the event's clock to just before its signal time.
// - The operator is placed at the site rather than walked there: reaching it
//   is not measured.
// - Fights and the bypass run with world drawing suspended (the simulation
//   keeps running) and a scripted aim-and-fire; that measures outcomes, not
//   feel.
const LABEL = process.env.HB_PROBE_LABEL || 'probe';
const OUT = process.env.HB_PROBE_OUT || '/tmp';
const SEEDS = [31337, 99991, 5150];
const CLASSES = ['SCOUT', 'TANK', 'ENGINEER'];

function responsesFor(playerClass, eventId) {
    if (eventId === 'unstable_vault') return playerClass === 'TANK' ? ['breach'] : ['bypass'];
    // Everyone scans first; the Engineer walks away from bait.
    return playerClass === 'ENGINEER' ? ['scan', 'open-or-leave'] : ['scan', 'open'];
}

for (const seed of SEEDS) {
    for (const playerClass of CLASSES) {
        test(`${LABEL} slice seed ${seed} ${playerClass}`, async ({ page }) => {
            test.setTimeout(1_500_000);
            const radio = [];
            await page.exposeFunction('__probeLine', (text) => radio.push(text));
            await page.addInitScript(({ cls }) => {
                localStorage.setItem('hb_active_class_v1', cls);
                window.addEventListener('bunker-line', (e) => window.__probeLine?.(e.detail?.text ?? ''));
                window.__sliceEvents = [];
                for (const type of ['slice-contract-missing', 'expedition-event-state', 'encounter-started', 'encounter-cleared', 'in-run-drop-equipped']) {
                    window.addEventListener(type, (e) => window.__sliceEvents.push({ type, detail: JSON.parse(JSON.stringify(e.detail ?? null, (k, v) => (k === 'drop' ? v?.id : k === 'synergies' ? undefined : v))) }));
                }
            }, { cls: playerClass });
            await bootToOperatorMenu(page);
            // The menu's NEW CAMPAIGN resets the store; pin the campaign after it.
            await page.evaluate((campaignSeed) => localStorage.setItem('hb_campaign_world_v1',
                JSON.stringify({ version: 1, seed: campaignSeed, layoutVersion: 2, expeditionIndex: 0 })), seed);
            await startRunAndSkipIntro(page);
            const record = { label: LABEL, seed, playerClass, shortcuts: [] };
            record.deploy = await page.evaluate(() => {
                const g = window.game;
                g.setGodMode(true);
                return {
                    campaignSeed: g._campaignWorldSeed, expeditionIndex: g.expeditionIndex,
                    condition: g.activeExpedition?.condition?.id ?? null,
                    eventId: g.activeExpedition?.eventId ?? null,
                    playerClass: g.playerType,
                    eventSystem: typeof g.updateExpeditionEvent === 'function'
                };
            });
            // Planned on the first gameplay update once the world plan exists.
            await page.waitForFunction(() => Boolean(window.game._expeditionEvent?.plan) || typeof window.game.updateExpeditionEvent !== 'function',
                null, { timeout: 60_000 }).catch(() => {});
            record.plan = await page.evaluate(() => {
                const plan = window.game._expeditionEvent?.plan;
                if (!plan) return null;
                const p = window.game.player.position;
                const site = window.game.getExpeditionEventSitePosition();
                return { eventId: plan.eventId, conditionId: plan.conditionId, site: plan.site, signalAt: plan.signalAt, truth: plan.truth ?? null,
                    rewardDrop: plan.rewardDrop, recipe: plan.ambushRecipe ?? plan.defendersRecipe, bypassSeconds: plan.bypassSeconds ?? null,
                    straightLineToSite: Math.round(Math.hypot(site.x - p.x, site.z - p.z)) };
            });
            if (record.plan) {
                record.shortcuts.push('signal clock advanced to signalAt - 0.05 s');
                await page.evaluate(() => { const e = window.game._expeditionEvent; e.elapsed = e.plan.signalAt - 0.05; });
                await page.waitForFunction(() => window.game._expeditionEvent?.state?.phase === 'signalled', null, { timeout: 120_000 }).catch(() => {});
                await page.waitForTimeout(1500);
                record.signalled = await page.evaluate(() => ({
                    phase: window.game._expeditionEvent?.state?.phase,
                    chip: document.getElementById('hud-event-chip')?.classList.contains('hidden') === false ? document.getElementById('hud-event-chip').innerText : null,
                    trackerCards: window.objectiveRegistry?.getActiveObjectives?.(2)?.map((o) => o.id) ?? [],
                    shipGoalTracked: (window.objectiveRegistry?.getActiveObjectives?.(99) ?? []).some((o) => o.id === 'goal-package'),
                    eventTracked: (window.objectiveRegistry?.getActiveObjectives?.(99) ?? []).some((o) => o.id === 'expedition-event')
                }));
                await page.screenshot({ path: `${OUT}/${LABEL}-${seed}-${playerClass}-signal.png` });

                record.shortcuts.push('operator placed at the site');
                await page.evaluate(() => {
                    const g = window.game;
                    const site = g.getExpeditionEventSitePosition();
                    g.player.position.x = site.x;
                    g.player.position.z = site.z;
                });
                await page.waitForFunction(() => document.getElementById('expedition-event-modal')?.classList.contains('hidden') === false, null, { timeout: 120_000 }).catch(() => {});
                record.modal = await page.evaluate(() => ({
                    visible: document.getElementById('expedition-event-modal')?.classList.contains('hidden') === false,
                    title: document.getElementById('expedition-event-title')?.innerText ?? null,
                    options: [...document.querySelectorAll('#expedition-event-options button')].map((b) => ({ action: b.dataset.eventResponse, disabled: b.disabled })),
                    focused: document.activeElement?.dataset?.eventResponse ?? null
                }));
                await page.screenshot({ path: `${OUT}/${LABEL}-${seed}-${playerClass}-modal.png` });

                record.responses = [];
                for (const planned of responsesFor(playerClass, record.plan.eventId)) {
                    let action = planned;
                    if (planned === 'open-or-leave') {
                        action = record.plan.truth === 'contaminated' ? 'leave' : 'open';
                    }
                    await page.waitForFunction(() => document.getElementById('expedition-event-modal')?.classList.contains('hidden') === false, null, { timeout: 30_000 }).catch(() => {});
                    const button = page.locator(`#expedition-event-options button[data-event-response="${action}"]`);
                    if (!(await button.isVisible().catch(() => false))) {
                        record.responses.push({ action, clicked: false });
                        break;
                    }
                    await button.click();
                    await page.waitForTimeout(500);
                    record.responses.push({ action, clicked: true, phase: await page.evaluate(() => window.game._expeditionEvent?.state?.phase) });
                }

                const phase = await page.evaluate(() => window.game._expeditionEvent?.state?.phase);
                if (phase === 'bypassing' || phase === 'engaged') {
                    record.shortcuts.push('world drawing suspended during the fight/bypass; scripted aim-and-fire');
                    record.resolution = await page.evaluate(async () => {
                        const g = window.game;
                        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
                        g.setWorldRenderSuspended(true);
                        // God mode holds O2 full; the bypass drain needs it off.
                        const bypassing = g._expeditionEvent?.state?.phase === 'bypassing';
                        if (bypassing) g.setGodMode(false);
                        const t0 = performance.now();
                        const o2Start = g.playerVitals.o2;
                        const hp0 = g.playerVitals.hp;
                        let shots = 0;
                        let o2Min = o2Start;
                        let members = 0;
                        while (g._expeditionEvent?.state?.phase !== 'resolved' && performance.now() - t0 < 240_000 && !g.isPlayerDead) {
                            o2Min = Math.min(o2Min, g.playerVitals.o2);
                            const handle = g._expeditionEvent?.encounter;
                            if (handle) {
                                const alive = [...handle.members.values()].map((m) => m.sprite).filter((s) => s?.parent && !s.userData?.burstTriggered);
                                members = Math.max(members, handle.members.size);
                                const target = alive.sort((a, b) => Math.hypot(a.position.x - g.player.position.x, a.position.z - g.player.position.z)
                                    - Math.hypot(b.position.x - g.player.position.x, b.position.z - g.player.position.z))[0];
                                if (target) {
                                    g.updateFacingYaw(Math.atan2(target.position.x - g.player.position.x, target.position.z - g.player.position.z));
                                    if (g.fireWeaponAtCurrentAim()) shots += 1;
                                }
                            }
                            await wait(150);
                        }
                        g.setWorldRenderSuspended(false);
                        if (bypassing) g.setGodMode(true);
                        return { phase: g._expeditionEvent?.state?.phase, wallSeconds: Math.round((performance.now() - t0) / 1000),
                            shots, encounterMembers: members, o2Start: Math.round(o2Start), o2Min: Math.round(o2Min), heartsLost: hp0 - g.playerVitals.hp };
                    });
                }
                record.outcome = await page.evaluate(() => {
                    const e = window.game._expeditionEvent;
                    return { phase: e?.state?.phase, outcome: e?.state?.outcome, grants: e?.grants ?? [], o2DrainMultAfter: window.game._expeditionEventO2DrainMult ?? 1 };
                });
            }
            record.sliceEvents = await page.evaluate(() => window.__sliceEvents);
            await page.screenshot({ path: `${OUT}/${LABEL}-${seed}-${playerClass}-after.png` });

            await page.evaluate(() => {
                const g = window.game;
                g.setGodMode(false);
                for (let hits = 0; !g.isPlayerDead && hits < 12; hits += 1) {
                    g.iFrameTimer = 0;
                    g.takeDamage(99, 'abyss');
                }
            });
            await page.waitForFunction(() => !document.getElementById('game-over-modal').classList.contains('hidden'), null, { timeout: 90_000 });
            await page.waitForTimeout(1500);
            await page.screenshot({ path: `${OUT}/${LABEL}-${seed}-${playerClass}-results.png` });
            record.report = await page.evaluate(() => document.getElementById('go-expedition-report')?.classList.contains('hidden') === false
                ? document.getElementById('go-expedition-report').innerText.split('\n').filter(Boolean) : null);
            record.radio = radio;
            fs.appendFileSync(`${OUT}/slice-${LABEL}.jsonl`, `${JSON.stringify(record)}\n`);
        });
    }
}
