/**
 * Footfalls from the 3D walk itself (2026-10-17 footstep pass).
 *
 * The player is drawn as a rigged 3D chassis whose walk clip plays faster or
 * slower with ground speed, but steps were timed off frames of the old
 * sprite sheet, so they drifted against the feet on screen. This watches
 * each foot bone's height above the model root and reports the moment a
 * lifted foot comes back down. Rig- and clip-agnostic: it reads whatever the
 * mixer just posed (walk, run, strafe, injured, blends).
 *
 * Hysteresis, not a min/max envelope: recorded in game, a stance plateau
 * lasts most of a 1.1 s stride, which collapsed an envelope and missed or
 * doubled contacts. A foot arms once it lifts `lift` above its last low and
 * lands when it has come `landFraction` of the way back down.
 */
export class FootContactTracker {
    constructor({ lift = 0.03, landFraction = 0.7, minInterval = 0.16, minStepGap = 0.2 } = {}) {
        this.lift = lift;
        this.landFraction = landFraction;
        this.minInterval = minInterval;
        // Any two footfalls: blended walk/strafe clips can dip both feet
        // together, and a flam reads worse than a step a beat early.
        this.minStepGap = minStepGap;
        this.sinceAnyContact = Infinity;
        this.feet = [0, 1].map(() => ({ low: null, high: null, armed: false, sinceContact: Infinity }));
    }

    /**
     * @param {number} dt seconds
     * @param {number[]} heights [left, right] foot heights above the root
     * @param {boolean} moving
     * @returns {number[]} feet (0 left, 1 right) that touched down this frame
     */
    update(dt, heights, moving) {
        const contacts = [];
        this.sinceAnyContact += dt;
        this.feet.forEach((foot, index) => {
            const h = Number(heights?.[index]);
            foot.sinceContact += dt;
            if (!Number.isFinite(h)) return;
            if (!moving) {
                foot.low = h;
                foot.high = h;
                foot.armed = false;
                return;
            }
            if (foot.low === null) foot.low = h;
            if (!foot.armed) {
                foot.low = Math.min(foot.low, h);
                if (h >= foot.low + this.lift) {
                    foot.armed = true;
                    foot.high = h;
                }
                return;
            }
            foot.high = Math.max(foot.high, h);
            const landAt = foot.high - (foot.high - foot.low) * this.landFraction;
            if (h <= landAt) {
                if (foot.sinceContact >= this.minInterval && this.sinceAnyContact >= this.minStepGap) {
                    contacts.push(index);
                    foot.sinceContact = 0;
                    this.sinceAnyContact = 0;
                }
                foot.armed = false;
                foot.low = h;
            }
        });
        return contacts;
    }
}

/**
 * Phase-locked step clock. Recorded in game, blended walk/strafe clips can
 * leave one foot barely lifting, so bone contacts alone miss steps and the
 * walk limps. The clock runs at the locomotion clip's own cadence (half a
 * cycle per step, scaled by the mixer's time scale), so the rhythm is steady
 * and follows speed exactly; foot contacts only pull its phase into line.
 */
export class StepClock {
    constructor({ catchUp = 0.55 } = {}) {
        // A contact this late in the phase is the next step landing early.
        this.catchUp = catchUp;
        this.phase = catchUp;
        this.nextFoot = 0;
    }

    /**
     * @param {number} dt seconds
     * @param {{ moving: boolean, stepInterval: number, contacts?: number[] }} frame
     *   stepInterval: seconds per step at the current playback rate
     * @returns {number[]} feet that step this frame
     */
    update(dt, { moving, stepInterval, contacts = [] }) {
        if (!moving || !(stepInterval > 0)) {
            // The first footfall after starting lands on the first contact.
            this.phase = this.catchUp;
            return [];
        }
        const steps = [];
        this.phase += dt / stepInterval;
        for (const foot of contacts) {
            if (this.phase >= this.catchUp) {
                steps.push(foot);
                this.nextFoot = foot ? 0 : 1;
                this.phase = 0;
            } else if (this.phase < 0.25) {
                // Just stepped and the bones agree a little later: ease the
                // phase toward them. Mid-phase contacts are ambiguous (a
                // blended clip's other foot) and must not delay the rhythm.
                this.phase *= 0.5;
            }
        }
        if (this.phase >= 1) {
            steps.push(this.nextFoot);
            this.nextFoot = this.nextFoot ? 0 : 1;
            this.phase -= 1;
        }
        return steps;
    }
}
