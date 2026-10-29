const DEFAULT_MAX_POOLS = 24;

export class WorldPoolSystem {
    constructor({ maxPools = DEFAULT_MAX_POOLS } = {}) {
        this.maxPools = Math.max(1, Math.floor(maxPools));
        this.pools = [];
    }

    add(value, { merge = true } = {}) {
        if (!value?.id || !Number.isFinite(value.x) || !Number.isFinite(value.z)) return null;
        if (this.pools.some((pool) => pool.id === value.id)) return null;
        const pool = {
            y: 0,
            radius: 0.5,
            substance: 'water',
            payload: [],
            tickInterval: 0.75,
            trackSurface: null,
            active: true,
            createdAt: 0,
            expiresAt: null,
            exposureTimers: new Map(),
            ...value
        };
        if (merge) {
            const compatible = this.pools.find((other) => other.active
                && other.substance === pool.substance
                && Math.hypot(other.x - pool.x, other.z - pool.z) <= Math.max(other.radius, pool.radius));
            if (compatible) {
                compatible.radius = Math.min(2.5, Math.max(compatible.radius, pool.radius) + Math.min(compatible.radius, pool.radius) * 0.25);
                compatible.expiresAt = Math.max(compatible.expiresAt ?? 0, pool.expiresAt ?? 0) || null;
                return compatible;
            }
        }
        if (this.pools.length >= this.maxPools) {
            const oldest = this.pools.reduce((best, candidate) => (
                (candidate.createdAt ?? 0) < (best.createdAt ?? 0) ? candidate : best
            ), this.pools[0]);
            this.remove(oldest);
        }
        this.pools.push(pool);
        return pool;
    }

    remove(poolOrId) {
        const index = typeof poolOrId === 'string'
            ? this.pools.findIndex((pool) => pool.id === poolOrId)
            : this.pools.indexOf(poolOrId);
        if (index < 0) return false;
        const [pool] = this.pools.splice(index, 1);
        pool.active = false;
        pool.exposureTimers?.clear?.();
        return true;
    }

    update(nowSeconds) {
        let removed = 0;
        for (let index = this.pools.length - 1; index >= 0; index -= 1) {
            const pool = this.pools[index];
            if (pool.expiresAt != null && nowSeconds >= pool.expiresAt) {
                this.remove(pool);
                removed += 1;
            }
        }
        return removed;
    }

    tickExposure(delta, targetId, position, applyPayload) {
        if (!targetId || !position || typeof applyPayload !== 'function') return 0;
        const dt = Math.max(0, Number(delta) || 0);
        let applied = 0;
        for (const pool of this.pools) {
            if (!pool.active) continue;
            const inside = Math.abs((pool.y ?? 0) - (position.y ?? 0)) <= 1.5
                && Math.hypot(position.x - pool.x, position.z - pool.z) <= pool.radius;
            if (!inside) {
                pool.exposureTimers?.delete?.(targetId);
                continue;
            }
            const remaining = (pool.exposureTimers?.get?.(targetId) ?? 0) - dt;
            if (remaining > 0) {
                pool.exposureTimers.set(targetId, remaining);
                continue;
            }
            pool.exposureTimers.set(targetId, Math.max(0.05, Number(pool.tickInterval) || 0.75));
            for (const payload of pool.payload ?? []) {
                applyPayload(payload, pool);
                applied += 1;
            }
        }
        return applied;
    }

    contains(position, predicate = () => true) {
        if (!position) return false;
        return this.pools.some((pool) => pool.active && predicate(pool)
            && Math.abs((pool.y ?? 0) - (position.y ?? 0)) <= 1.5
            && Math.hypot(position.x - pool.x, position.z - pool.z) <= pool.radius);
    }

    clear() {
        for (const pool of this.pools) {
            pool.active = false;
            pool.exposureTimers?.clear?.();
        }
        this.pools.length = 0;
    }
}
