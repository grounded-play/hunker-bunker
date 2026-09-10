/**
 * Loot Magnetism, Vacuum Acceleration, and Rising-Pitch Musical Pickup Combos.
 */

export class PickupMagnet {
    constructor({ baseRadius = 3.5, sprintMultiplier = 1.25, acceleration = 14.0 } = {}) {
        this.baseRadius = baseRadius;
        this.sprintMultiplier = sprintMultiplier;
        this.acceleration = acceleration;
    }

    getRadius(isSprinting = false) {
        return isSprinting ? this.baseRadius * this.sprintMultiplier : this.baseRadius;
    }

    /**
     * Applies magnetic pull towards player for all eligible pickups within radius.
     * @param {Array} pickups - Array of 3D pickup objects with position
     * @param {Object} playerPos - { x, y, z }
     * @param {number} delta - frame delta in seconds
     * @param {boolean} isSprinting - sprint state
     */
    update(pickups, playerPos, delta, isSprinting = false) {
        if (!Array.isArray(pickups) || !playerPos) return [];

        const radius = this.getRadius(isSprinting);
        const attracted = [];

        for (const pickup of pickups) {
            if (!pickup?.position) continue;

            const dx = playerPos.x - pickup.position.x;
            const dz = playerPos.z - pickup.position.z;
            const dist = Math.hypot(dx, dz);

            if (dist > 0.05 && dist <= radius) {
                pickup.userData = pickup.userData || {};
                pickup.userData.magnetSpeed = (pickup.userData.magnetSpeed || 3.0) + delta * this.acceleration;
                pickup.userData.magnetAge = (pickup.userData.magnetAge || 0) + delta;

                const step = Math.min(dist, pickup.userData.magnetSpeed * delta);
                pickup.position.x += (dx / dist) * step;
                pickup.position.z += (dz / dist) * step;

                // Arc upwards gently as it flies toward player chest
                const heightLift = (1.0 - (dist / radius)) * 0.45;
                pickup.position.y = Math.max(0.1, (pickup.userData.baseY || 0.15) + heightLift);

                attracted.push(pickup);
            } else if (dist > radius && pickup.userData?.magnetSpeed) {
                // Settle back down if player moved out of range
                pickup.userData.magnetSpeed = Math.max(0, pickup.userData.magnetSpeed - delta * 6.0);
            }
        }

        return attracted;
    }
}

export class PickupComboTracker {
    constructor({ comboWindow = 1.25, maxPitch = 2.0 } = {}) {
        this.comboWindow = comboWindow;
        this.maxPitch = maxPitch;
        this.comboCount = 0;
        this.timer = 0;
    }

    /**
     * Records a pickup event and returns the musical semitone playback rate.
     * @param {number} now - timestamp or clock in seconds
     * @returns {number} playbackRate
     */
    registerPickup(deltaSinceLast = 0) {
        if (deltaSinceLast <= this.comboWindow && this.comboCount > 0) {
            this.comboCount += 1;
        } else {
            this.comboCount = 1;
        }

        // Semitone calculation: 2^(n / 12)
        const semitones = Math.min(12, this.comboCount - 1);
        const pitch = Math.min(this.maxPitch, Math.pow(2, semitones / 12));
        return {
            combo: this.comboCount,
            playbackRate: Number(pitch.toFixed(3)),
            isMaxCombo: this.comboCount >= 13
        };
    }

    reset() {
        this.comboCount = 0;
    }
}

export const PICKUP_TOAST_THEMES = Object.freeze({
    tech: { label: 'TECH', color: '#49dfff', icon: 'cube' },
    med: { label: 'MED', color: '#6ee7b7', icon: 'cross' },
    coin: { label: 'CR', color: '#ffc46b', icon: 'coin' },
    o2: { label: 'O₂', color: '#38bdf8', icon: 'tank' },
    shells: { label: 'SHELLS', color: '#fb7185', icon: 'shell' },
    default: { label: 'SALVAGE', color: '#cbd5e1', icon: 'item' }
});

export function formatPickupToast(type = 'default', amount = 1) {
    const theme = PICKUP_TOAST_THEMES[type.toLowerCase()] || PICKUP_TOAST_THEMES.default;
    const formattedAmt = Number.isFinite(amount) ? (amount > 0 ? `+${Math.round(amount)}` : `${Math.round(amount)}`) : `+${amount}`;
    return {
        text: `${formattedAmt} ${theme.label}`,
        color: theme.color,
        type
    };
}
