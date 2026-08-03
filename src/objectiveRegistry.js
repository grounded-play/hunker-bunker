/**
 * ObjectiveRegistry — Single-grammar tracked objective manager.
 * Per docs/objective-system-spec.md
 */

const HISTORY_LIMIT = 20;

export class ObjectiveRegistry {
    constructor() {
        /** @type {Map<string, Object>} */
        this.objectives = new Map();
        /** @type {Array<Object>} most-recent-last, capped at HISTORY_LIMIT */
        this.history = [];
        this.listeners = new Set();
    }

    /**
     * Add or update an objective.
     * @param {Object} detail
     * @param {string} detail.id
     * @param {string} detail.source - 'story' | 'boss' | 'mission' | 'camp-quest' | 'black-box' | 'lore' | 'tutorial'
     * @param {string} detail.label
     * @param {number} [detail.current=0]
     * @param {number} [detail.target=1]
     * @param {number} [detail.priority=50] - Lower number = higher priority
     * @param {{x: number, z: number}|null} [detail.compass=null]
     * @param {Array<{label: string, done: boolean}>} [detail.steps=[]]
     * @param {string} [detail.status='active'] - 'active' | 'blocked' | 'completed' | 'failed'
     * @param {string|null} [detail.blockedReason=null] - required explanation while status is 'blocked'
     * @param {string|null} [detail.parentId=null] - groups this objective under a parent objective's id
     * @param {boolean} [detail.persistent=false] - survives clear() (death/reset) instead of being wiped
     */
    trackObjective(detail) {
        if (!detail || !detail.id) return;

        const existing = this.objectives.get(detail.id);
        const status = detail.status ?? existing?.status ?? 'active';
        const entry = {
            id: detail.id,
            source: detail.source ?? existing?.source ?? 'custom',
            label: detail.label ?? existing?.label ?? 'OBJECTIVE',
            current: Number.isFinite(detail.current) ? detail.current : (existing?.current ?? 0),
            target: Number.isFinite(detail.target) ? detail.target : (existing?.target ?? 1),
            priority: Number.isFinite(detail.priority) ? detail.priority : (existing?.priority ?? 50),
            compass: detail.compass ? { x: detail.compass.x, z: detail.compass.z } : null,
            steps: Array.isArray(detail.steps) ? detail.steps.map(s => ({ label: s.label, done: Boolean(s.done) })) : (existing?.steps ?? []),
            status,
            blockedReason: status === 'blocked' ? (detail.blockedReason ?? existing?.blockedReason ?? null) : null,
            parentId: detail.parentId ?? existing?.parentId ?? null,
            persistent: typeof detail.persistent === 'boolean' ? detail.persistent : (existing?.persistent ?? false),
            updatedAt: Date.now()
        };

        this.objectives.set(detail.id, entry);
        this.notify();
    }

    /**
     * Mark an objective as blocked with a player-readable reason, keeping it
     * visible (and its compass target, if any) rather than hiding it.
     * @param {string} id
     * @param {string} reason
     */
    blockObjective(id, reason) {
        const obj = this.objectives.get(id);
        if (!obj) return false;
        obj.status = 'blocked';
        obj.blockedReason = reason ?? null;
        obj.updatedAt = Date.now();
        this.notify();
        return true;
    }

    /**
     * Clear a blocked status, returning the objective to active.
     * @param {string} id
     */
    unblockObjective(id) {
        const obj = this.objectives.get(id);
        if (!obj || obj.status !== 'blocked') return false;
        obj.status = 'active';
        obj.blockedReason = null;
        obj.updatedAt = Date.now();
        this.notify();
        return true;
    }

    /**
     * Returns currently blocked objectives, highest priority first.
     */
    getBlockedObjectives() {
        return Array.from(this.objectives.values())
            .filter((obj) => obj.status === 'blocked')
            .sort((a, b) => a.priority - b.priority);
    }

    /**
     * Returns the child objectives tracked under a parent id.
     * @param {string} parentId
     */
    getChildObjectives(parentId) {
        return Array.from(this.objectives.values())
            .filter((obj) => obj.parentId === parentId)
            .sort((a, b) => a.priority - b.priority);
    }

    /**
     * Remove an objective by ID, recording it in resolution history so a
     * "what changed" / run-summary view has data to render (Phase 7.3).
     * @param {string} id
     * @param {string} [outcome='complete'] - 'complete' | 'failed' | 'abandoned'
     */
    resolveObjective(id, outcome = 'complete') {
        if (!id) return;
        const obj = this.objectives.get(id);
        if (!obj) return;
        this.history.push({
            id: obj.id,
            source: obj.source,
            label: obj.label,
            outcome,
            resolvedAt: Date.now()
        });
        if (this.history.length > HISTORY_LIMIT) this.history.shift();
        this.objectives.delete(id);
        this.notify();
    }

    /**
     * Returns resolution history, most-recent-last.
     * @param {number} [limit]
     */
    getHistory(limit) {
        return Number.isFinite(limit) && limit > 0 ? this.history.slice(-limit) : [...this.history];
    }

    /**
     * Clear registered objectives, e.g. on run reset/death. Objectives
     * tracked with persistent:true (story-critical goals that must survive
     * death) are kept unless preservePersistent is explicitly false (e.g. a
     * full profile switch / new game).
     * @param {Object} [options]
     * @param {boolean} [options.preservePersistent=true]
     */
    clear({ preservePersistent = true } = {}) {
        const toKeep = preservePersistent
            ? Array.from(this.objectives.entries()).filter(([, obj]) => obj.persistent)
            : [];
        if (this.objectives.size === toKeep.length) return;
        this.objectives = new Map(toKeep);
        this.notify();
    }

    /**
     * Toggle or set the completion status of a specific child step.
     * @param {string} id
     * @param {number} stepIndex
     * @param {boolean} [doneState]
     * @returns {boolean}
     */
    toggleStepDone(id, stepIndex, doneState = null) {
        const obj = this.objectives.get(id);
        if (!obj || !Array.isArray(obj.steps) || !obj.steps[stepIndex]) return false;
        const currentDone = obj.steps[stepIndex].done;
        const nextDone = typeof doneState === 'boolean' ? doneState : !currentDone;
        if (currentDone !== nextDone) {
            obj.steps[stepIndex].done = nextDone;
            obj.current = obj.steps.filter((s) => s.done).length;
            obj.updatedAt = Date.now();
            this.notify();
            return true;
        }
        return false;
    }

    /**
     * Returns active objectives sorted by priority (lowest number first).
     * @param {number} [limit=2]
     * @returns {Array<Object>}
     */
    getActiveObjectives(limit = 2) {
        const sorted = Array.from(this.objectives.values()).sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return b.updatedAt - a.updatedAt;
        });

        return Number.isFinite(limit) && limit > 0 ? sorted.slice(0, limit) : sorted;
    }

    /**
     * Finds the highest priority active objective that has a non-null compass target.
     * @returns {Object|null}
     */
    getCompassTarget() {
        const sorted = Array.from(this.objectives.values()).sort((a, b) => a.priority - b.priority);
        for (const obj of sorted) {
            if (obj.compass && Number.isFinite(obj.compass.x) && Number.isFinite(obj.compass.z)) {
                return {
                    id: obj.id,
                    source: obj.source,
                    label: obj.label,
                    priority: obj.priority,
                    x: obj.compass.x,
                    z: obj.compass.z
                };
            }
        }
        return null;
    }

    /**
     * Subscribe to registry updates.
     * @param {Function} callback
     */
    onChange(callback) {
        if (typeof callback === 'function') {
            this.listeners.add(callback);
        }
    }

    /**
     * Unsubscribe from registry updates.
     * @param {Function} callback
     */
    offChange(callback) {
        this.listeners.delete(callback);
    }

    notify() {
        const active = this.getActiveObjectives();
        for (const listener of this.listeners) {
            try {
                listener(active);
            } catch (err) {
                console.error('[ObjectiveRegistry] listener error:', err);
            }
        }
    }

    /**
     * Binds window custom events: 'objective-tracked' and 'objective-resolved'.
     */
    bindWindowEvents(targetWindow = typeof window !== 'undefined' ? window : null) {
        if (!targetWindow) return;

        this._trackedHandler = (e) => {
            if (e?.detail) this.trackObjective(e.detail);
        };
        this._resolvedHandler = (e) => {
            if (e?.detail?.id) this.resolveObjective(e.detail.id, e.detail.outcome);
        };

        targetWindow.addEventListener('objective-tracked', this._trackedHandler);
        targetWindow.addEventListener('objective-resolved', this._resolvedHandler);
    }

    /**
     * Unbinds window event handlers.
     */
    unbindWindowEvents(targetWindow = typeof window !== 'undefined' ? window : null) {
        if (!targetWindow) return;
        if (this._trackedHandler) targetWindow.removeEventListener('objective-tracked', this._trackedHandler);
        if (this._resolvedHandler) targetWindow.removeEventListener('objective-resolved', this._resolvedHandler);
    }
}
