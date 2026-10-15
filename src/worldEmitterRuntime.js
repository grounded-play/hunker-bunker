import * as THREE from 'three';
import {
    EMITTER_PHASE,
    EMITTER_TRIGGER,
    applyWorldEmitterAction,
    createWorldEmitterState,
    destroyWorldEmitterState,
    getWorldEmitterProfile,
    tickWorldEmitterExposure,
    updateWorldEmitterState
} from './worldEmitters.js';

const UP = new THREE.Vector3(0, 1, 0);
const DEBUG_PHASE_COLORS = Object.freeze({
    [EMITTER_PHASE.IDLE]: 0x48b9ff,
    [EMITTER_PHASE.TELEGRAPH]: 0xffad33,
    [EMITTER_PHASE.ACTIVE]: 0xff3b30,
    [EMITTER_PHASE.COOLDOWN]: 0x88919a,
    [EMITTER_PHASE.DESTROYED]: 0xb56cff
});

function disposeObjectTree(root) {
    root?.traverse?.((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material?.dispose?.();
    });
    root?.removeFromParent?.();
}

function sourceId(sprite) {
    return sprite?.userData?.scatterKey ?? sprite?.userData?.dressingStableId ?? sprite?.uuid ?? null;
}

function propFxSource(sprite) {
    const root = sprite?.userData?.world3dRoot;
    const fx = root?.userData?.propFx;
    if (!root || !fx) return null;
    const object = fx.group?.children?.find((child) => child.userData?.propFxTransformSource && child.isPoints)
        ?? fx.group?.children?.find((child) => child.userData?.propFxTransformSource);
    return object ? { root, fx, object } : null;
}

function pointSegmentDistance2d(point, start, end) {
    const vx = end.x - start.x;
    const vz = end.z - start.z;
    const wx = point.x - start.x;
    const wz = point.z - start.z;
    const lengthSq = vx * vx + vz * vz;
    const t = lengthSq > 1e-8 ? Math.max(0, Math.min(1, (wx * vx + wz * vz) / lengthSq)) : 0;
    return Math.hypot(point.x - (start.x + vx * t), point.z - (start.z + vz * t));
}

export class WorldEmitterRuntime {
    constructor({ fixedStep = 0.1 } = {}) {
        this.fixedStep = fixedStep;
        this.accumulator = 0;
        this.sources = new Map();
        this.transients = new Map();
        this.scratchPosition = new THREE.Vector3();
        this.scratchQuaternion = new THREE.Quaternion();
        this.scratchDirection = new THREE.Vector3();
        this.debugGroup = null;
        this.debugHelpers = new Map();
    }

    registerSource(sprite) {
        const id = sourceId(sprite);
        const profile = getWorldEmitterProfile(sprite?.userData?.world3dModelType ?? sprite?.userData?.type);
        const isFungalVent = sprite?.userData?.type === 'fungal_spore_vent';
        const visual = propFxSource(sprite) ?? (isFungalVent ? {
            root: sprite.userData?.enemy3dVisual?.root ?? null,
            fx: null,
            object: null,
            virtual: true
        } : null);
        if (!id || !profile || !visual) return null;
        const existing = this.sources.get(id);
        if (existing) {
            existing.sprite = sprite;
            existing.visual = visual;
            return existing;
        }
        const entry = { id, sprite, profile, visual, state: createWorldEmitterState(profile, { id }) };
        this.sources.set(id, entry);
        return entry;
    }

    syncSources(scatter = []) {
        const live = new Set();
        for (const sprite of scatter) {
            if (!sprite?.parent || sprite.userData?.burstTriggered) continue;
            const entry = this.registerSource(sprite);
            if (entry) live.add(entry.id);
        }
        for (const [id, entry] of this.sources) {
            if (!live.has(id) || !entry.sprite?.parent || entry.sprite.userData?.burstTriggered) this.sources.delete(id);
        }
    }

    applyAction(sprite, action) {
        const entry = this.registerSource(sprite);
        return entry ? applyWorldEmitterAction(entry.state, action) : false;
    }

    applyMode(sprite, mode) {
        if (['off', 'spent', 'disabled', 'destroyed', 'closed'].includes(String(mode))) return this.applyAction(sprite, 'disable');
        if (['idle', 'on', 'working', 'open', 'armed'].includes(String(mode))) {
            const entry = this.registerSource(sprite);
            if (!entry) return false;
            const action = entry.profile.trigger.kind === EMITTER_TRIGGER.INTERACTION ? 'pulse' : 'enable';
            return applyWorldEmitterAction(entry.state, action);
        }
        return false;
    }

    destroySource(sprite) {
        const id = sourceId(sprite);
        const entry = this.sources.get(id) ?? this.registerSource(sprite);
        if (!entry) return [];
        const transform = this.resolveTransform(entry);
        const children = destroyWorldEmitterState(entry.state).map((child) => ({
            ...child,
            origin: transform.position.clone(),
            direction: transform.direction.clone(),
            volume: entry.profile.volume,
            payload: entry.profile.payload
        }));
        for (const child of children) {
            if (child.kind !== 'jet') continue;
            this.transients.set(child.id, {
                ...child,
                remaining: Math.max(0, Number(child.duration) || 0),
                exposureRemaining: 0
            });
        }
        this.sources.delete(entry.id);
        return children;
    }

    resolveTransform(entry) {
        const object = entry.visual?.object;
        if (object?.parent) {
            object.getWorldPosition(this.scratchPosition);
            object.getWorldQuaternion(this.scratchQuaternion);
            this.scratchDirection.copy(UP).applyQuaternion(this.scratchQuaternion).normalize();
        } else {
            this.scratchPosition.copy(entry.sprite.position);
            this.scratchDirection.set(...(entry.profile.source.fallbackDirection ?? [0, 1, 0])).normalize();
        }
        return { position: this.scratchPosition, direction: this.scratchDirection };
    }

    containsPlayer(entry, playerPosition) {
        if (!playerPosition) return false;
        const { position, direction } = this.resolveTransform(entry);
        const volume = entry.profile.volume;
        if (volume.shape === 'sphere') return Math.hypot(playerPosition.x - position.x, playerPosition.z - position.z) <= volume.radius;
        const end = {
            x: position.x + direction.x * (volume.length ?? 0),
            z: position.z + direction.z * (volume.length ?? 0)
        };
        return pointSegmentDistance2d(playerPosition, position, end) <= volume.radius;
    }

    containsTransient(transient, playerPosition) {
        if (!playerPosition) return false;
        const volume = transient.volume;
        if (volume.shape === 'sphere') {
            return Math.hypot(playerPosition.x - transient.origin.x, playerPosition.z - transient.origin.z) <= volume.radius;
        }
        const end = {
            x: transient.origin.x + transient.direction.x * (volume.length ?? 0),
            z: transient.origin.z + transient.direction.z * (volume.length ?? 0)
        };
        return pointSegmentDistance2d(playerPosition, transient.origin, end) <= volume.radius;
    }

    stepTransients(game) {
        const playerPosition = game?.player?.position;
        for (const [id, transient] of this.transients) {
            transient.remaining -= this.fixedStep;
            transient.exposureRemaining -= this.fixedStep;
            if (transient.remaining <= 0) {
                this.transients.delete(id);
                continue;
            }
            if (!this.containsTransient(transient, playerPosition) || transient.exposureRemaining > 0) continue;
            transient.exposureRemaining = transient.volume.tickInterval;
            for (const payload of transient.payload) {
                const scaled = payload.kind === 'damage'
                    ? { ...payload, amount: (payload.amount ?? 1) * (transient.payloadScale ?? 1), reason: `${payload.reason ?? 'world-emitter'}-rupture` }
                    : payload;
                game?.applyWorldEmitterPayload?.(scaled, transient, transient.origin);
            }
        }
    }

    step(game) {
        this.syncSources(game?.scatterSprites ?? []);
        this.stepTransients(game);
        const playerPosition = game?.player?.position;
        for (const entry of this.sources.values()) {
            const distance = playerPosition
                ? Math.hypot(playerPosition.x - entry.sprite.position.x, playerPosition.z - entry.sprite.position.z)
                : Infinity;
            const canAffectPlayer = game?.canEnemyTargetPlayer?.(entry.sprite) !== false;
            const phaseEvents = updateWorldEmitterState(entry.state, this.fixedStep, {
                distance: canAffectPlayer ? distance : Infinity
            });
            for (const event of phaseEvents) game?.presentWorldEmitterPhase?.(entry, event);
            const presenting = entry.state.enabled
                && (entry.state.phase === EMITTER_PHASE.TELEGRAPH || entry.state.phase === EMITTER_PHASE.ACTIVE);
            entry.visual.fx?.setEnabled?.(presenting);
            if (!canAffectPlayer || !presenting || !this.containsPlayer(entry, playerPosition)) continue;
            if (!tickWorldEmitterExposure(entry.state, game?.multiplayerLocalPlayerId ?? 'local', this.fixedStep)) continue;
            const transform = this.resolveTransform(entry);
            for (const payload of entry.profile.payload) game?.applyWorldEmitterPayload?.(payload, entry, transform.position);
        }
        this.updateDebugVisualization();
    }

    update(delta, game) {
        this.accumulator = Math.min(this.accumulator + Math.max(0, Number(delta) || 0), this.fixedStep * 5);
        while (this.accumulator + 1e-9 >= this.fixedStep) {
            this.step(game);
            this.accumulator = Math.max(0, this.accumulator - this.fixedStep);
        }
    }

    setDebugVisible(scene, visible) {
        if (!visible) {
            this.disposeDebugVisualization();
            return;
        }
        if (!scene?.add || this.debugGroup) return;
        this.debugGroup = new THREE.Group();
        this.debugGroup.name = 'world-emitter-debug';
        this.debugGroup.renderOrder = 1000;
        scene.add(this.debugGroup);
        this.updateDebugVisualization();
    }

    createDebugHelper(id, volume) {
        const root = new THREE.Group();
        root.name = `world-emitter-debug:${id}`;
        const material = new THREE.MeshBasicMaterial({
            color: DEBUG_PHASE_COLORS[EMITTER_PHASE.IDLE],
            transparent: true,
            opacity: 0.28,
            wireframe: true,
            depthTest: false,
            depthWrite: false
        });
        let geometry;
        if (volume.shape === 'sphere') {
            geometry = new THREE.SphereGeometry(volume.radius, 12, 8);
        } else {
            geometry = new THREE.CapsuleGeometry(volume.radius, Math.max(0.01, volume.length ?? 0.01), 4, 8);
        }
        const volumeMesh = new THREE.Mesh(geometry, material);
        volumeMesh.name = 'world-emitter-debug-volume';
        if (volume.shape !== 'sphere') volumeMesh.position.y = (volume.length ?? 0) * 0.5;
        volumeMesh.renderOrder = 1000;
        root.add(volumeMesh);

        const arrow = new THREE.ArrowHelper(
            UP,
            new THREE.Vector3(),
            Math.max(0.5, volume.length ?? volume.radius),
            DEBUG_PHASE_COLORS[EMITTER_PHASE.IDLE],
            0.22,
            0.12
        );
        arrow.name = 'world-emitter-debug-direction';
        arrow.line.material.depthTest = false;
        arrow.line.material.depthWrite = false;
        arrow.cone.material.depthTest = false;
        arrow.cone.material.depthWrite = false;
        arrow.renderOrder = 1001;
        root.add(arrow);
        this.debugGroup.add(root);
        const helper = { root, volume: volumeMesh, arrow };
        this.debugHelpers.set(id, helper);
        return helper;
    }

    updateDebugHelper(id, origin, direction, volume, phase) {
        const helper = this.debugHelpers.get(id) ?? this.createDebugHelper(id, volume);
        const color = DEBUG_PHASE_COLORS[phase] ?? DEBUG_PHASE_COLORS[EMITTER_PHASE.IDLE];
        helper.root.position.copy(origin);
        helper.root.quaternion.setFromUnitVectors(UP, direction);
        helper.volume.material.color.setHex(color);
        helper.arrow.setColor(color);
        helper.arrow.setLength(Math.max(0.5, volume.length ?? volume.radius), 0.22, 0.12);
    }

    updateDebugVisualization() {
        if (!this.debugGroup) return;
        const live = new Set();
        for (const entry of this.sources.values()) {
            const transform = this.resolveTransform(entry);
            live.add(entry.id);
            this.updateDebugHelper(
                entry.id,
                transform.position,
                transform.direction,
                entry.profile.volume,
                entry.state.phase
            );
        }
        for (const transient of this.transients.values()) {
            live.add(transient.id);
            this.updateDebugHelper(
                transient.id,
                transient.origin,
                transient.direction,
                transient.volume,
                EMITTER_PHASE.DESTROYED
            );
        }
        for (const [id, helper] of this.debugHelpers) {
            if (live.has(id)) continue;
            disposeObjectTree(helper.root);
            this.debugHelpers.delete(id);
        }
    }

    clearDebugHelpers() {
        for (const helper of this.debugHelpers.values()) disposeObjectTree(helper.root);
        this.debugHelpers.clear();
    }

    disposeDebugVisualization() {
        this.clearDebugHelpers();
        this.debugGroup?.removeFromParent?.();
        this.debugGroup = null;
    }

    clear() {
        this.sources.clear();
        this.transients.clear();
        this.accumulator = 0;
        this.clearDebugHelpers();
    }

    dispose() {
        this.clear();
        this.disposeDebugVisualization();
    }
}
