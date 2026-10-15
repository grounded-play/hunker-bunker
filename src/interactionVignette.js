import * as THREE from 'three';
import { isSearchableType } from './propInteractions.js';

function safePlaySound(sound, options, game = null) {
    if (game?.playSound) {
        game.playSound(sound, options);
    } else if (typeof window !== 'undefined' && window.AudioManager?.play) {
        window.AudioManager.play(sound, options);
    }
}

/**
 * Contextual Interaction Vignette Presets
 * Physical character engagement when interacting with key world props.
 */
export const INTERACTION_VIGNETTE_PRESETS = Object.freeze({
    rummage: Object.freeze({
        id: 'rummage',
        animation: 'rummaging',
        duration: 1.4,
        alignSeconds: 0.25,
        standoff: 0.65,
        faceProp: true,
        sound: 'toolbox_open',
        interruptibleOnDamage: true,
        milestones: Object.freeze([
            {
                time: 0.25,
                run(game, v) {
                    const pos = v.sprite?.position ?? game.player.position;
                    game.spawnPhysicalBurst?.(pos.x, pos.z, { color: 0xd4af37, count: 6, upward: 0.15 });
                    safePlaySound('toolbox_open', { volume: 0.42 }, game);
                }
            }
        ])
    }),
    exosuit_dock: Object.freeze({
        id: 'exosuit_dock',
        animation: 'exosuit_dock',
        duration: 1.8,
        alignSeconds: 0.35,
        standoff: 0.20,
        faceProp: false,
        sound: 'exosuit_charge',
        interruptibleOnDamage: true,
        milestones: Object.freeze([
            {
                time: 0.35,
                run(game, v) {
                    const pos = v.sprite?.position ?? game.player.position;
                    game.spawnPhysicalBurst?.(pos.x, pos.z, { color: 0xffcc00, count: 18, upward: 0.25 });
                    game.triggerCameraShake?.(0.04, 0.15);
                    game.tintPlayerSprites?.(0xffea60);
                    setTimeout(() => game.tintPlayerSprites?.(game._playerPolishHex ?? 0xffffff), 180);
                    safePlaySound('exosuit_charge', { volume: 0.7 }, game);
                }
            },
            {
                time: 1.0,
                run(game, v) {
                    const pos = v.sprite?.position ?? game.player.position;
                    game.spawnPhysicalBurst?.(pos.x, pos.z, { color: 0xffffff, count: 12, upward: 0.35 });
                    game.triggerCameraShake?.(0.06, 0.2);
                }
            }
        ])
    }),
    terminal_hack: Object.freeze({
        id: 'terminal_hack',
        animation: 'terminal_hack',
        duration: 1.25,
        alignSeconds: 0.20,
        standoff: 0.60,
        faceProp: true,
        sound: 'terminal_beep',
        interruptibleOnDamage: true,
        milestones: Object.freeze([
            {
                time: 0.20,
                run(game, v) {
                    const pos = v.sprite?.position ?? game.player.position;
                    const propKey = String(v.sprite?.userData?.type ?? v.sprite?.userData?.world3dModelType ?? '');
                    const isSafe = propKey.includes('safe');
                    const color = isSafe ? 0xf59e0b : 0x38bdf8;
                    game.spawnPhysicalBurst?.(pos.x, pos.z, { color, count: 8, upward: 0.2 });
                    game.acknowledgePropExperience?.(v.sprite, { toggleArticulation: false });
                    safePlaySound('terminal_beep', { volume: 0.5 }, game);
                }
            },
            {
                time: 0.75,
                run(game, v) {
                    const pos = v.sprite?.position ?? game.player.position;
                    const propKey = String(v.sprite?.userData?.type ?? v.sprite?.userData?.world3dModelType ?? '');
                    const isSafe = propKey.includes('safe');
                    const color = isSafe ? 0x22c55e : 0x4deeea;
                    game.spawnPhysicalBurst?.(pos.x, pos.z, { color, count: 10, upward: 0.25 });
                    game.acknowledgePropExperience?.(v.sprite, { toggleArticulation: false });
                    safePlaySound(isSafe ? 'vault_open' : 'terminal_beep', { volume: 0.6, playbackRate: 1.2 }, game);
                }
            }
        ])
    }),
    case_unlatch: Object.freeze({
        id: 'case_unlatch',
        animation: 'case_unlatch',
        duration: 1.3,
        alignSeconds: 0.25,
        standoff: 0.70,
        faceProp: true,
        sound: 'toolbox_open',
        interruptibleOnDamage: true,
        milestones: Object.freeze([
            {
                time: 0.25,
                run(game, v) {
                    const pos = v.sprite?.position ?? game.player.position;
                    game.spawnPhysicalBurst?.(pos.x, pos.z, { color: 0xaaaaaa, count: 8, upward: 0.15 });
                    safePlaySound('metal_stress', { volume: 0.5, playbackRate: 2.0 }, game);
                }
            },
            {
                time: 0.70,
                run(game, v) {
                    const pos = v.sprite?.position ?? game.player.position;
                    game.spawnPhysicalBurst?.(pos.x, pos.z, { color: 0xf59e0b, count: 12, upward: 0.25 });
                    safePlaySound('ambient_steam_hiss', { volume: 0.4 }, game);
                    safePlaySound('vault_open', { volume: 0.5, playbackRate: 1.2 }, game);
                    game.acknowledgePropExperience?.(v.sprite, { toggleArticulation: true });
                }
            }
        ])
    }),
    rest_recovery: Object.freeze({
        id: 'rest_recovery',
        animation: 'rest_recovery',
        duration: 1.5,
        alignSeconds: 0.30,
        standoff: 0.35,
        faceProp: false,
        sound: 'shrine_blessing',
        interruptibleOnDamage: true,
        milestones: Object.freeze([
            {
                time: 0.30,
                run(game, v) {
                    const pos = v.sprite?.position ?? game.player.position;
                    game.spawnPhysicalBurst?.(pos.x, pos.z, { color: 0x22c55e, count: 14, upward: 0.2 });
                    game.tintPlayerSprites?.(0x86efac);
                    setTimeout(() => game.tintPlayerSprites?.(game._playerPolishHex ?? 0xffffff), 250);
                    safePlaySound('shrine_blessing', { volume: 0.6 }, game);
                }
            },
            {
                time: 0.90,
                run(game, v) {
                    const pos = v.sprite?.position ?? game.player.position;
                    game.spawnPhysicalBurst?.(pos.x, pos.z, { color: 0xffffff, count: 10, upward: 0.3 });
                    game.healPlayer?.(20);
                }
            }
        ])
    })
});

/**
 * Maps a prop type and interaction spec to an interaction vignette preset.
 * Returns null if the interaction should execute instantaneously.
 */
export function resolveInteractionVignettePreset(type, spec = null) {
    if (spec?.vignettePreset) {
        return INTERACTION_VIGNETTE_PRESETS[spec.vignettePreset] ?? null;
    }
    const propKey = String(type ?? '');
    if (propKey === 'prop_exosuit_docking_gantry' || propKey === 'decon_exosuit_scrubber_station') {
        return INTERACTION_VIGNETTE_PRESETS.exosuit_dock;
    }
    if (propKey.includes('cot') || propKey.includes('bed') || /(^|_)bunk(_|$)/.test(propKey) || propKey.includes('stretcher')) {
        return INTERACTION_VIGNETTE_PRESETS.rest_recovery;
    }
    if (spec?.generic === 'search') {
        return INTERACTION_VIGNETTE_PRESETS.rummage;
    }
    if (propKey.includes('case') || propKey.includes('hardcase')) {
        return INTERACTION_VIGNETTE_PRESETS.case_unlatch;
    }
    if (isSearchableType(propKey)
        || propKey.includes('crate') || propKey.includes('chest') || propKey.includes('locker')
        || propKey.includes('cart') || propKey.includes('supplies')) {
        return INTERACTION_VIGNETTE_PRESETS.rummage;
    }
    if (spec?.generic === 'terminal' || propKey.includes('terminal') || propKey.includes('console') || propKey.includes('safe') || propKey.includes('kiosk') || propKey.includes('podium')) {
        return INTERACTION_VIGNETTE_PRESETS.terminal_hack;
    }
    return null;
}

/**
 * Computes world socket position and target yaw for player engagement.
 */
export function calculateVignetteSocket(playerPos, propPos, wallNormal = null, standoff = 0.65, faceProp = true) {
    const px = playerPos?.x ?? 0;
    const pz = playerPos?.z ?? 0;
    const gx = propPos?.x ?? px;
    const gz = propPos?.z ?? pz;

    if (wallNormal && (wallNormal.x !== 0 || wallNormal.z !== 0)) {
        const wnx = wallNormal.x;
        const wnz = wallNormal.z;
        const socketPos = new THREE.Vector3(gx + wnx * standoff, 0, gz + wnz * standoff);
        const targetYaw = faceProp ? Math.atan2(-wnx, -wnz) : Math.atan2(wnx, wnz);
        return { position: socketPos, yaw: targetYaw };
    }

    const dx = px - gx;
    const dz = pz - gz;
    const dist = Math.hypot(dx, dz) || 1;
    const dirX = dx / dist;
    const dirZ = dz / dist;

    const socketPos = new THREE.Vector3(gx + dirX * standoff, 0, gz + dirZ * standoff);
    const targetYaw = faceProp ? Math.atan2(-dirX, -dirZ) : Math.atan2(dirX, dirZ);
    return { position: socketPos, yaw: targetYaw };
}

/**
 * Creates the runtime Interaction Vignette Controller for an active game session.
 */
export function createInteractionVignetteController(game) {
    let currentVignette = null;

    return {
        isActive() {
            return currentVignette !== null;
        },
        getCurrent() {
            return currentVignette;
        },
        startVignette({ sprite, spec, preset, onComplete, onCancel } = {}) {
            if (!game || !game.player) return false;
            if (currentVignette) {
                this.interrupt('superseded');
            }
            const activePreset = preset ?? resolveInteractionVignettePreset(
                sprite?.userData?.type ?? sprite?.userData?.world3dModelType,
                spec
            );
            if (!activePreset) return false;

            const player = game.player;
            const startPos = player.position.clone();
            const startYaw = player.rotation.y;

            const propPos = sprite?.position ?? player.position;
            const wallNormal = sprite?.userData?.wallNormal ?? null;
            const socket = calculateVignetteSocket(
                startPos,
                propPos,
                wallNormal,
                activePreset.standoff,
                activePreset.faceProp
            );

            currentVignette = {
                sprite,
                spec,
                preset: activePreset,
                onComplete,
                onCancel,
                elapsed: 0,
                duration: activePreset.duration,
                alignDuration: activePreset.alignSeconds,
                startPos,
                startYaw,
                targetPos: socket.position,
                targetYaw: socket.yaw,
                animationStarted: false,
                firedMilestones: new Set()
            };

            // Trigger animation immediately
            if (activePreset.animation) {
                game.player3dOverlay?.trigger?.(activePreset.animation, activePreset.duration);
                currentVignette.animationStarted = true;
            }

            // Trigger prop experience acknowledge (emissive pulse without prematurely opening hinges)
            game.acknowledgePropExperience?.(sprite, { toggleArticulation: false });

            return true;
        },
        update(delta) {
            if (!currentVignette) return;
            const v = currentVignette;
            v.elapsed += delta;

            if (v.elapsed <= v.alignDuration) {
                const t = Math.min(1, v.elapsed / v.alignDuration);
                const ease = t * t * (3 - 2 * t);
                game.player.position.lerpVectors(v.startPos, v.targetPos, ease);

                const yawDiff = Math.atan2(
                    Math.sin(v.targetYaw - v.startYaw),
                    Math.cos(v.targetYaw - v.startYaw)
                );
                game.player.rotation.y = v.startYaw + yawDiff * ease;
            } else {
                game.player.position.copy(v.targetPos);
                game.player.rotation.y = v.targetYaw;
            }

            // Trigger milestone effects (particles, sounds, tremors)
            for (const milestone of v.preset.milestones ?? []) {
                if (v.elapsed >= milestone.time && !v.firedMilestones.has(milestone)) {
                    v.firedMilestones.add(milestone);
                    milestone.run?.(game, v);
                }
            }

            if (v.elapsed >= v.duration) {
                const cb = v.onComplete;
                currentVignette = null;
                cb?.();
            }
        },
        interrupt(reason = 'interrupted') {
            if (!currentVignette) return false;
            const v = currentVignette;
            if (v.animationStarted && v.preset.animation) {
                game.player3dOverlay?.clearTrigger?.(v.preset.animation);
            }
            if (reason === 'damage') {
                game.player3dOverlay?.trigger?.('hit', 0.4);
            }
            const cb = v.onCancel;
            currentVignette = null;
            cb?.(reason);
            return true;
        }
    };
}
