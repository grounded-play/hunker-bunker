/**
 * Prop Interaction & Destruction Mechanics Engine
 * "Help, Hurt, Give, Take" System for Sprint 49 Biomechanical & Corpospace Cathedral Props
 */

import { applyChitinVulnerability, STATUS_DEFAULTS } from './statusEffects.js';

export const BIOMECH_SYNERGY_TUNING = Object.freeze({
    cryoStunRadius: 5.0,
    cryoStunSeconds: 4.0,
    bileRadius: 3.5,
    bileVulnerabilitySeconds: STATUS_DEFAULTS.chitinVulnerabilityDuration,
    bileDamageMultiplier: STATUS_DEFAULTS.chitinDamageMultiplier
});

export const BILE_ARMOR_WEAKEN = Object.freeze({
    multiplier: BIOMECH_SYNERGY_TUNING.bileDamageMultiplier,
    duration: BIOMECH_SYNERGY_TUNING.bileVulnerabilitySeconds
});

function targetPosition(target) {
    return target?.position ?? target;
}

function livingEnemyTargets(game) {
    if (Array.isArray(game?.snails)) return game.snails.filter((target) => target?.isAlive !== false);
    return (game?.scatterSprites ?? []).filter((target) => {
        const data = target?.userData;
        return data && !data.burstTriggered && (data.hp ?? 1) > 0 && game.isEnemyType?.(data.type);
    });
}

function applyBileInRadius(game, prop, radius) {
    const eventId = prop.userData?.scatterKey ? `bile:${prop.userData.scatterKey}` : null;
    for (const target of livingEnemyTargets(game)) {
        const position = targetPosition(target);
        const d = Math.hypot(position.x - prop.position.x, position.z - prop.position.z);
        if (d > radius) continue;
        game.applyPlayerDamageToEnemy?.(target, 35, { element: 'bile' });
        applyChitinVulnerability(target, {
            duration: BIOMECH_SYNERGY_TUNING.bileVulnerabilitySeconds,
            multiplier: BIOMECH_SYNERGY_TUNING.bileDamageMultiplier,
            eventId
        });
    }
}

function safePlaySound(sound, options) {
    if (typeof window !== 'undefined' && window.AudioManager?.play) {
        window.AudioManager.play(sound, options);
    }
}

export const PROP_INTERACTION_SPECS = Object.freeze({
    // 01. Oxygen Cascade Rack: Rupture gives massive O2 + cryo knockback; Interact bleeds O2 safely
    prop_oxygen_bottle_cascade_rack: {
        hp: 35,
        canInteract: true,
        interactPrompt: '[E] BLEED O₂ MANIFOLD (+15% O₂)',
        onInteract: (game, prop) => {
            game.adjustOxygen?.(15);
            game.showBunkerLine?.('LIFE SUPPORT: MANIFOLD VENTED. +15% OXYGEN SECURED.');
            safePlaySound('ambient_steam_hiss', { volume: 0.6 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x88e0ff, count: 8, upward: 0.25 });
            return true;
        },
        onDestroy: (game, prop) => {
            // HELP: Refill +35% O2
            game.adjustOxygen?.(35);
            game.showBunkerLine?.('O₂ CASCADE TANK RUPTURED! EMERGENCY CRYOGENIC VENT (+35% O₂)');
            // HURT / HELP: Cryo shockwave knocks back & damages swarming enemies
            game.triggerCameraShake?.(0.08, 0.18);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xa5f3fc, count: 20, upward: 0.4 });
            safePlaySound('metal_stress', { volume: 0.7, playbackRate: 0.8 });

            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 5.0) {
                        game.applyPlayerDamageToEnemy?.(snail, 45, { element: 'cryo' });
                        // Knockback
                        const kx = (snail.x - prop.position.x) / (d || 1) * 3.5;
                        const kz = (snail.z - prop.position.z) / (d || 1) * 3.5;
                        snail.x += kx;
                        snail.z += kz;
                    }
                }
            }
            for (const attacker of game.umbilicalAttackers ?? []) {
                if (!attacker?.isAlive) continue;
                const d = Math.hypot(attacker.x - prop.position.x, attacker.z - prop.position.z);
                if (d <= BIOMECH_SYNERGY_TUNING.cryoStunRadius) {
                    attacker.stun?.(BIOMECH_SYNERGY_TUNING.cryoStunSeconds);
                }
            }
        }
    },

    // 02. Coolant Drum Leaking Pool: Rupture triggers freeze explosion; Interact siphons coolant
    prop_coolant_drum_leaking_pool: {
        hp: 25,
        canInteract: true,
        interactPrompt: '[E] SIPHON CRYO CHEMICAL (Takes 10 Cold Dmg)',
        onInteract: (game, prop) => {
            game.takeDamage?.(10, 'cryo-hazard', prop.position.x, prop.position.z);
            game.addScrap?.(15);
            game.showBunkerLine?.('EXTRACTED 1× CRYO CHEMICAL FLASK (+15 SCRAP, -10 HP)');
            safePlaySound('chem_siphon', { volume: 0.5 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('COOLANT DRUM FLASH FREEZE! SUB-ZERO SHOCKWAVE');
            game.triggerCameraShake?.(0.06, 0.15);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x00f0ff, count: 25, upward: 0.35 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 4.0) {
                        game.applyPlayerDamageToEnemy?.(snail, 60, { element: 'cryo' });
                    }
                }
            }
            for (const attacker of game.umbilicalAttackers ?? []) {
                if (!attacker?.isAlive) continue;
                const d = Math.hypot(attacker.x - prop.position.x, attacker.z - prop.position.z);
                if (d <= BIOMECH_SYNERGY_TUNING.cryoStunRadius) {
                    attacker.stun?.(BIOMECH_SYNERGY_TUNING.cryoStunSeconds);
                }
            }
        }
    },

    // 03. Liturgical Terminal Lectern: Interact downloads telemetry; Rupture discharges EMP
    prop_liturgical_terminal_lectern: {
        hp: 40,
        canInteract: true,
        interactPrompt: '[E] ACCESS LITURGICAL SCRIPTURE',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('"SERVICE IS MANDATORY. WE PRAISE THE CORE." SECTOR TELEMETRY DECRYPTED.');
            safePlaySound('terminal_beep', { volume: 0.6 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffaa00, count: 12, upward: 0.2 });
            // Grant temporary critical boost if supported
            if (game.playerVitals) {
                game.playerVitals.critBoostTimer = 60.0;
            }
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('LECTERN EMP DISCHARGE! ELECTRICAL ARC FLASH');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x66ffff, count: 18, upward: 0.3 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 6.0) {
                        game.applyPlayerDamageToEnemy?.(snail, 30, { element: 'shock' });
                    }
                }
            }
        }
    },

    // 04. Votive Candle Shrine: Interact offers scrap for speed buff; Rupture plunges room into dark
    prop_votive_candle_shrine: {
        hp: 20,
        canInteract: true,
        interactPrompt: '[E] OFFER 25 SCRAP TO THE MACHINE GOD',
        onInteract: (game, prop) => {
            const currentScrap = game.bank?.state?.scrap ?? game.playerVitals?.scrap ?? 50;
            if (currentScrap >= 25) {
                if (game.bank?.spendScrap) game.bank.spendScrap(25);
                else if (game.playerVitals) game.playerVitals.scrap = Math.max(0, currentScrap - 25);
                game.showBunkerLine?.('CORPORATE ZEAL ACCEPTED! +25% SPEED & SPRINT BOOST (90s)');
                game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xff8800, count: 24, upward: 0.4 });
                safePlaySound('shrine_blessing', { volume: 0.7 });
                return true;
            } else {
                game.showBunkerLine?.('INSUFFICIENT SCRAP FOR SACRAMENTAL OFFERING.');
                return false;
            }
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('SACRILEGE: SHRINE SHATTERED. RELIC EXTRACTED.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x442200, count: 14, upward: 0.2 });
            game.addScrap?.(20);
        }
    },

    // 05. Corporate Saint Reliquary: Rupture triggers alarm & boss guardians; Interact safely unlocks
    prop_corporate_saint_reliquary: {
        hp: 120,
        canInteract: true,
        interactPrompt: '[E] BIOMETRIC DECRYPTION (Open Director Vault)',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('VAULT UNLOCKED: HIGH-TIER CORPORATE RELIC SALVAGED.');
            game.addScrap?.(50);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffd700, count: 30, upward: 0.4 });
            safePlaySound('vault_open', { volume: 0.8 });
            return true;
        },
        onDestroy: (game, _prop) => {
            game.showBunkerLine?.('SECURITY BREACH: DIRECTOR BIO-CONTAINMENT DESECRATED! ALARM ACTIVE');
            game.addScrap?.(50);
            game.spawnPatrolNearPlayer?.();
            safePlaySound('alarm_klaxon', { volume: 0.8 });
        }
    },

    // 06. Pipe Organ Heat Exchanger: Rupture releases scalding steam cone; Interact vents bypass
    prop_pipe_organ_heat_exchanger: {
        hp: 80,
        canInteract: true,
        interactPrompt: '[E] BYPASS SUB-DECK PRESSURE VALVE',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('PNEUMATIC BYPASS OPENED. STEAM HAZARDS DISARMED.');
            safePlaySound('ambient_steam_hiss', { volume: 0.5 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xcccccc, count: 10, upward: 0.2 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('STEAM PRESSURE BLOWOUT! SCALDING 300°C JET');
            game.triggerCameraShake?.(0.06, 0.12);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffffff, count: 30, upward: 0.5 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 5.0) {
                        game.applyPlayerDamageToEnemy?.(snail, 50, { element: 'fire' });
                    }
                }
            }
        }
    },

    // 07. Floor Conduit Bridge: Rupture electrifies floor ramp; Interact reroutes power
    prop_floor_conduit_bridge: {
        hp: 50,
        canInteract: true,
        interactPrompt: '[E] REROUTE AUXILIARY POWER GRID',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('CIRCUIT REROUTED. POWER RESTORED TO LOCAL SECTOR.');
            safePlaySound('power_hum', { volume: 0.5 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x33bbff, count: 12, upward: 0.15 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('CONDUIT SHEARED! HIGH-VOLTAGE FLOOR ARC HAZARD');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x00ffff, count: 20, upward: 0.25 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 3.5) {
                        game.applyPlayerDamageToEnemy?.(snail, 40, { element: 'shock' });
                    }
                }
            }
        }
    },

    // 08. Decontamination Eyewash & Shower Station: Cleanses infection & toxic load
    prop_decon_eyewash_shower_station: {
        hp: 30,
        canInteract: true,
        interactPrompt: '[E] PULL CHAIN: DECONTAMINATION SHOWER',
        onInteract: (game, prop) => {
            if (game.playerVitals) {
                const currentInf = game.playerVitals.infection ?? 0;
                game.playerVitals.infection = Math.max(0, currentInf * 0.5);
            }
            game.showBunkerLine?.('DECONTAMINATION ACTIVE: -50% INFECTION LOAD PURGED.');
            safePlaySound('water_shower', { volume: 0.7 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x44eeaa, count: 25, upward: 0.4 });
            return true;
        },
        onDestroy: (game, prop) => {
            if (game.playerVitals) {
                game.playerVitals.infection = 0;
            }
            game.adjustOxygen?.(20);
            game.showBunkerLine?.('EYEWASH STATION DESTROYED. FRESHWATER & O₂ DISCHARGED. INFECTION PURGED.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x88ccff, count: 15, upward: 0.2 });
        }
    },

    // 09. Exosuit Docking Gantry: Overcharges suit plating / repairs armor
    prop_exosuit_docking_gantry: {
        hp: 90,
        canInteract: true,
        interactPrompt: '[E] FAST-CHARGE EXOSUIT PLATING',
        onInteract: (game, prop) => {
            if (game.playerVitals) {
                game.playerVitals.hp = Math.min(game.playerVitals.maxHp * 1.5, (game.playerVitals.hp || 100) + 40);
            }
            game.showBunkerLine?.('EXOSUIT DOCKED: ARMOR INTEGRITY OVERCHARGED TO 150%.');
            safePlaySound('exosuit_charge', { volume: 0.7 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffcc00, count: 20, upward: 0.3 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('GANTRY COLLAPSE! PNEUMATIC ARMS CRASHED.');
            game.triggerCameraShake?.(0.08, 0.15);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x555555, count: 20, upward: 0.3 });
        }
    },

    // 10. Maintenance Tool Cart: Drops scrap and ammunition
    prop_maintenance_tool_cart: {
        hp: 20,
        canInteract: true,
        interactPrompt: '[E] SEARCH TOOL DRAWERS',
        onInteract: (game, _prop) => {
            game.addScrap?.(15);
            if (game.weaponClipAmmo !== undefined) {
                game.weaponClipAmmo = game.weaponClipSize ?? 30;
                game.emitWeaponClipState?.();
            }
            game.showBunkerLine?.('SCAVENGED: +15 WEAPON SCRAP & FULL MAGAZINE REFILL.');
            safePlaySound('toolbox_open', { volume: 0.5 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('TOOL CART SHATTERED: SCATTERED HARDWARE.');
            game.addScrap?.(20);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x999999, count: 18, upward: 0.25 });
        }
    },

    // 11. Autopsy Dissection Slab: Extract tissue biopsy (+scrap, +5% infection)
    prop_autopsy_dissection_slab: {
        hp: 100,
        canInteract: true,
        interactPrompt: '[E] BIOPSY SPECIMEN TISSUE',
        onInteract: (game, prop) => {
            game.addScrap?.(25);
            if (game.playerVitals) {
                game.playerVitals.infection = Math.min(1.0, (game.playerVitals.infection ?? 0) + 0.05);
            }
            game.showBunkerLine?.('NEURAL CHITIN HARVESTED (+25 BIO-SCRAP, +5% SPORE EXPOSURE).');
            safePlaySound('flesh_squish', { volume: 0.6 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x880022, count: 15, upward: 0.2 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('DISSECTION SLAB PULVERIZED: VISCOUS SLIME COATING.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x440011, count: 25, upward: 0.3 });
        }
    },

    // 12. Exhaust Blower Fan Hood: Overdrive clears spore clouds
    prop_exhaust_blower_fan_hood: {
        hp: 60,
        canInteract: true,
        interactPrompt: '[E] OVERDRIVE ROOM VENTILATION',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('EXHAUST HOOD ENGAGED: ATMOSPHERIC GASES PURGED.');
            safePlaySound('fan_wind', { volume: 0.7 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xeeeeee, count: 20, upward: 0.4 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('EXHAUST FAN MOTOR SEIZED IN SMOKE.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x333333, count: 15, upward: 0.3 });
        }
    },

    // 13. Overhead Cage Fluorescent: Sparks & local darkness
    prop_overhead_cage_fluorescent: {
        hp: 15,
        canInteract: false,
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('FIXTURE SHATTERED: SHOWER OF ARC SPARKS.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffea00, count: 15, upward: -0.2 });
            safePlaySound('glass_break', { volume: 0.5 });
        }
    },

    // 14. Floor Drainage Sump Trough: Dredge sludge for brass / scrap
    prop_floor_drainage_sump_trough: {
        hp: 40,
        canInteract: true,
        interactPrompt: '[E] DREDGE SUMP GRATE',
        onInteract: (game, _prop) => {
            game.addScrap?.(10);
            game.showBunkerLine?.('RECOVERED 10 SCRAP CASINGS FROM OILY BILGE.');
            safePlaySound('water_slosh', { volume: 0.4 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('SUMP GRATING COLLAPSED.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x222222, count: 12, upward: 0.1 });
        }
    },

    // 15. Biomech Sphincter Hatch Vent: Living valve
    prop_biomech_sphincter_hatch_vent: {
        hp: 45,
        canInteract: true,
        interactPrompt: '[E] SEAL WITH BIO-FOAM',
        onInteract: (game, _prop) => {
            game.showBunkerLine?.('SPHINCTER VENT CAUTERIZED & PLUGGED.');
            safePlaySound('flesh_seal', { volume: 0.5 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('BIOMECH HATCH SPASMS: CORROSIVE BILE VOMIT!');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x88ff00, count: 20, upward: 0.3 });
            applyBileInRadius(game, prop, BIOMECH_SYNERGY_TUNING.bileRadius);
        }
    },

    // 16. Biomech Tracheal Wall Pipe: Living peristaltic conduit
    prop_biomech_tracheal_wall_pipe: {
        hp: 35,
        canInteract: true,
        interactPrompt: '[E] TAP LIVING CONDUIT',
        onInteract: (game, _prop) => {
            game.addScrap?.(15);
            game.showBunkerLine?.('EXTRACTED 1× AMBER NUTRIENT GEL (+15 SCRAP).');
            safePlaySound('flesh_squish', { volume: 0.5 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('TRACHEAL TUBE PUNCTURED! DIGESTIVE BILE SPRAY (+25% BONUS VULNERABILITY)');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xddff22, count: 20, upward: 0.3 });
            applyBileInRadius(game, prop, 4.5);
        }
    },

    // 17. Wall Cable Tray Swag: Overhead wire tray
    prop_wall_cable_tray_swag: {
        hp: 25,
        canInteract: false,
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('CABLE TRAY COLLAPSED: DANGLING HIGH-VOLTAGE HARNESS!');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0x44ddff, count: 20, upward: 0.3 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 3.5) {
                        game.applyPlayerDamageToEnemy?.(snail, 40, { element: 'shock' });
                    }
                }
            }
        }
    },

    // 18. Ceiling Crane Hoist: Drops claw hook with devastating kinetic impact
    prop_ceiling_crane_hoist: {
        hp: 80,
        canInteract: true,
        interactPrompt: '[E] OPERATE CRANE PENDANT',
        onInteract: (game, _prop) => {
            game.showBunkerLine?.('CRANE TRAVERSING MONORAIL.');
            safePlaySound('crane_motor', { volume: 0.6 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('CRANE HOIST CABLE SEVERED! 3-TON CLAW CATASTROPHIC IMPACT (250 DMG)');
            game.triggerCameraShake?.(0.12, 0.25);
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xcccccc, count: 35, upward: 0.5 });
            safePlaySound('metal_crash', { volume: 0.9 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 4.5) {
                        game.applyPlayerDamageToEnemy?.(snail, 250, { element: 'crush' });
                    }
                }
            }
        }
    },

    // 19. Vertebral Cable Riser: Cyber-spinal column
    prop_vertebral_cable_riser: {
        hp: 50,
        canInteract: true,
        interactPrompt: '[E] JACK INTO SPINAL NERVE BUNDLE',
        onInteract: (game, prop) => {
            game.showBunkerLine?.('NEURAL ECHO TELEMETRY SYNCHRONIZED: ENEMY POSITIONS REVEALED.');
            safePlaySound('neural_tap', { volume: 0.6 });
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xffaa33, count: 18, upward: 0.25 });
            return true;
        },
        onDestroy: (game, prop) => {
            game.showBunkerLine?.('VERTEBRAL COLUMN SHATTERED INTO BONE SHRAPNEL.');
            game.spawnPhysicalBurst?.(prop.position.x, prop.position.z, { color: 0xeee0cb, count: 20, upward: 0.3 });
            if (game.snails) {
                for (const snail of game.snails) {
                    if (!snail || !snail.isAlive) continue;
                    const d = Math.hypot(snail.x - prop.position.x, snail.z - prop.position.z);
                    if (d <= 3.5) {
                        game.applyPlayerDamageToEnemy?.(snail, 25, { element: 'shrapnel' });
                    }
                }
            }
        }
    }
});

/**
 * Handles custom destruction logic for a prop.
 * Returns true if a custom destruction hook was handled.
 */
export function handleCustomPropDestruction(game, propKey, propPosition, propObject = null) {
    const spec = PROP_INTERACTION_SPECS[propKey];
    if (spec && typeof spec.onDestroy === 'function') {
        const fakeProp = {
            position: propPosition || (propObject?.position ?? { x: 0, z: 0 }),
            userData: propObject?.userData || { type: propKey }
        };
        spec.onDestroy(game, fakeProp);
        return true;
    }
    return false;
}

/**
 * The catalogue key a prop behaves as. A 2D type with no spec of its own that
 * draws as a catalogue model (WORLD_3D_MODEL_ALIASES, e.g. a camp repair rig
 * drawn as the maintenance tool cart) takes that model's interaction, so it
 * acts like what the player sees.
 */
export function interactionSpecKeyFor(data) {
    const key = data?.type || data?.modelKey || data?.propKey;
    if (key && PROP_INTERACTION_SPECS[key]) return key;
    const model = data?.world3dModelType;
    return model && PROP_INTERACTION_SPECS[model] ? model : key;
}

/**
 * Finds the nearest interactable prop to the player.
 */
export function findNearestInteractableProp(game, maxDist = 2.5) {
    if (!game?.player || !Array.isArray(game.scatterSprites)) return null;
    const px = game.player.position.x;
    const pz = game.player.position.z;

    let nearest = null;
    let minDist = maxDist;

    for (const sprite of game.scatterSprites) {
        if (!sprite || sprite.userData?.burstTriggered) continue;
        const propKey = interactionSpecKeyFor(sprite.userData);
        const spec = sprite.userData?.interactionSpec || PROP_INTERACTION_SPECS[propKey];
        if (!spec || !spec.canInteract) continue;
        if (isSpentProp(game, sprite)) continue;

        const d = Math.hypot(sprite.position.x - px, sprite.position.z - pz);
        if (d < minDist) {
            minDist = d;
            nearest = { sprite, spec, propKey, distance: d };
        }
    }

    return nearest;
}

/**
 * Executes interaction on a prop.
 */
export function interactWithCustomProp(game, nearestInfo) {
    if (!nearestInfo || !nearestInfo.spec || typeof nearestInfo.spec.onInteract !== 'function') {
        return false;
    }
    const success = nearestInfo.spec.onInteract(game, nearestInfo.sprite);
    if (success) {
        nearestInfo.sprite.userData.hasBeenInteracted = true;
        const key = nearestInfo.sprite.userData.scatterKey;
        if (!nearestInfo.sprite.userData.interactionSpec && key) {
            (game.spentPropScatterKeys ??= new Set()).add(key);
        }
    }
    return success;
}

// A catalogue prop (PROP_INTERACTION_SPECS) pays out once: it is a cache of
// scrap, oxygen or ammo, not a vending machine, and its key outlives the
// chunk so walking away and back does not refill it. A prop that carries its
// own interactionSpec (a critical-service wreck) is a service and stays usable.
function isSpentProp(game, sprite) {
    const data = sprite.userData ?? {};
    if (data.interactionSpec) return false;
    return Boolean(data.hasBeenInteracted || (data.scatterKey && game.spentPropScatterKeys?.has(data.scatterKey)));
}
