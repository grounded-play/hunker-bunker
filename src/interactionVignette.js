import * as THREE from 'three';
import { isSearchableType } from './propInteractions.js';

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
        interruptibleOnDamage: true
    }),
    exosuit_dock: Object.freeze({
        id: 'exosuit_dock',
        animation: 'rummaging',
        duration: 1.8,
        alignSeconds: 0.3,
        standoff: 0.15,
        faceProp: false,
        sound: 'exosuit_charge',
        interruptibleOnDamage: true
    }),
    terminal_hack: Object.freeze({
        id: 'terminal_hack',
        animation: 'rummaging',
        duration: 1.2,
        alignSeconds: 0.2,
        standoff: 0.60,
        faceProp: true,
        sound: 'terminal_beep',
        interruptibleOnDamage: true
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
    if (spec?.generic === 'search' || isSearchableType(propKey)
        || propKey.includes('crate') || propKey.includes('chest') || propKey.includes('locker')
        || propKey.includes('cart') || propKey.includes('supplies')) {
        return INTERACTION_VIGNETTE_PRESETS.rummage;
    }
    if (propKey.includes('terminal') || propKey.includes('console') || propKey.includes('safe') || propKey.includes('kiosk')) {
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
                animationStarted: false
            };

            // Trigger animation immediately
            if (activePreset.animation) {
                game.player3dOverlay?.trigger?.(activePreset.animation, activePreset.duration);
                currentVignette.animationStarted = true;
            }

            // Trigger prop articulation / experience acknowledge
            game.acknowledgePropExperience?.(sprite);

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
