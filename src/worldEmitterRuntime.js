import * as THREE from 'three';
import {
    EMITTER_PHASE,
    applyWorldEmitterAction,
    createWorldEmitterState,
    destroyWorldEmitterState,
    getWorldEmitterProfile,
    tickWorldEmitterExposure,
    updateWorldEmitterState
} from './worldEmitters.js';

const UP = new THREE.Vector3(0, 1, 0);

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
        this.scratchPosition = new THREE.Vector3();
        this.scratchQuaternion = new THREE.Quaternion();
        this.scratchDirection = new THREE.Vector3();
    }

    registerSource(sprite) {
        const id = sourceId(sprite);
        const profile = getWorldEmitterProfile(sprite?.userData?.world3dModelType ?? sprite?.userData?.type);
        // Enemy vents retain their established eruption/attack path until that
        // path is explicitly migrated; prop emitters require visible prop FX.
        const visual = propFxSource(sprite);
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
        if (['idle', 'on', 'working', 'open', 'armed'].includes(String(mode))) return this.applyAction(sprite, 'enable');
        return false;
    }

    destroySource(sprite) {
        const id = sourceId(sprite);
        const entry = this.sources.get(id) ?? this.registerSource(sprite);
        if (!entry) return [];
        const children = destroyWorldEmitterState(entry.state);
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

    step(game) {
        this.syncSources(game?.scatterSprites ?? []);
        const playerPosition = game?.player?.position;
        for (const entry of this.sources.values()) {
            const distance = playerPosition
                ? Math.hypot(playerPosition.x - entry.sprite.position.x, playerPosition.z - entry.sprite.position.z)
                : Infinity;
            updateWorldEmitterState(entry.state, this.fixedStep, { distance });
            const presenting = entry.state.enabled
                && (entry.state.phase === EMITTER_PHASE.TELEGRAPH || entry.state.phase === EMITTER_PHASE.ACTIVE);
            entry.visual.fx.setEnabled(presenting);
            if (!presenting || !this.containsPlayer(entry, playerPosition)) continue;
            if (!tickWorldEmitterExposure(entry.state, game?.multiplayerLocalPlayerId ?? 'local', this.fixedStep)) continue;
            const transform = this.resolveTransform(entry);
            for (const payload of entry.profile.payload) game?.applyWorldEmitterPayload?.(payload, entry, transform.position);
        }
    }

    update(delta, game) {
        this.accumulator = Math.min(this.accumulator + Math.max(0, Number(delta) || 0), this.fixedStep * 5);
        while (this.accumulator + 1e-9 >= this.fixedStep) {
            this.step(game);
            this.accumulator = Math.max(0, this.accumulator - this.fixedStep);
        }
    }

    clear() {
        this.sources.clear();
        this.accumulator = 0;
    }
}
