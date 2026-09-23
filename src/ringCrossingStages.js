/**
 * The staged requirements behind a ring crossing, in the order a player meets
 * them, with the ship goal each stage is anchored to.
 *
 * `ringCrossings.js` already derives WHETHER a crossing is open from four
 * durable conditions. What it does not do is say which of those conditions are
 * met and which are left, which is what an objective panel needs. This turns
 * the same four conditions into an ordered checklist and joins each one to the
 * authored anchor in `ringManifest.js` MANDATORY_SHIP_GOALS, so a stage can
 * point at the console the player has to reach.
 *
 * It lives in its own module rather than inside ringCrossings.js because
 * ringManifest.js already imports ringCrossings.js -- reading the manifest from
 * there would be a cycle.
 *
 * Pure module: no DOM, no Three.js, no storage. It derives, it never mutates.
 */
import { MANDATORY_SHIP_GOALS } from './ringManifest.js';
import { RING_CROSSING_STATES } from './ringCrossings.js';

export const RING_CROSSING_STAGE_IDS = Object.freeze({
    PREVIOUS: 'previous_crossing',
    GOAL: 'ship_goal',
    MISSION: 'ring_mission',
    BOSS: 'milestone_boss'
});

const GOAL_BY_KEY = new Map(MANDATORY_SHIP_GOALS.map((goal) => [goal.goalKey, goal]));

/** The authored anchor for a ship goal, or null when the key is unknown. */
export function getShipGoalAnchor(goalKey) {
    const goal = GOAL_BY_KEY.get(goalKey);
    return goal ? { goalKey: goal.goalKey, ring: goal.ring, roomFamily: goal.roomFamily, anchorId: goal.objectiveAnchorId } : null;
}

/**
 * Sub-steps beneath a ship-goal stage.
 *
 * Only steps with a real truth source are authored. The reconciler knows
 * whether a goal is BUILT; the bank knows whether the parts are banked; the
 * goal order knows what has to exist first. Those three are derivable, so those
 * three are the steps. Inventing "haul the girders" with nothing to mark it
 * done would put a checkbox on screen that never ticks.
 */
export function describeShipGoalSteps(goalKey, { built = false, canAfford = false, prereqBuilt = true } = {}) {
    const anchor = getShipGoalAnchor(goalKey);
    if (!anchor) return [];
    const prerequisite = getShipGoalPrerequisite(goalKey);
    const steps = [];
    if (prerequisite) {
        steps.push({ id: 'prerequisite', goalKey: prerequisite.goalKey, done: Boolean(prereqBuilt) });
    }
    steps.push({ id: 'resources', done: Boolean(built || canAfford) });
    steps.push({ id: 'install', anchorId: anchor.anchorId, done: Boolean(built) });
    return steps;
}

/** The goal that must exist before this one, from the authored ring order. */
export function getShipGoalPrerequisite(goalKey) {
    const index = MANDATORY_SHIP_GOALS.findIndex((goal) => goal.goalKey === goalKey);
    if (index <= 0) return null;
    const previous = MANDATORY_SHIP_GOALS[index - 1];
    return { goalKey: previous.goalKey, ring: previous.ring, anchorId: previous.objectiveAnchorId };
}

/**
 * Ordered stages for one crossing.
 *
 * The order is the order the conditions actually fall: the previous crossing
 * first (nothing else is reachable until it opens), then the ship goal and the
 * ring mission, then the milestone boss, which `deriveStatus` only considers
 * once goal and mission are both done.
 *
 * A stage the plan does not define (a first crossing has no previous, some
 * crossings have no boss) is omitted rather than reported as an unmeetable
 * requirement.
 */
export function describeRingCrossingStages(plan, state, crossingId, context = {}) {
    const definition = plan?.ringCrossings?.find((entry) => entry?.id === crossingId) ?? null;
    if (!definition) return [];

    const requirements = definition.requirements ?? {};
    const live = state?.crossings?.[crossingId] ?? null;
    const stages = [];

    if (requirements.previousCrossingId) {
        stages.push({
            id: RING_CROSSING_STAGE_IDS.PREVIOUS,
            done: Boolean(live?.previousCrossingOpen),
            crossingId: requirements.previousCrossingId,
            anchor: null
        });
    }
    if (requirements.goalKey) {
        const prerequisite = getShipGoalPrerequisite(requirements.goalKey);
        stages.push({
            id: RING_CROSSING_STAGE_IDS.GOAL,
            done: Boolean(live?.goalBuilt),
            goalKey: requirements.goalKey,
            anchor: getShipGoalAnchor(requirements.goalKey),
            steps: describeShipGoalSteps(requirements.goalKey, {
                built: Boolean(live?.goalBuilt),
                canAfford: Boolean(context.canAffordGoal?.(requirements.goalKey)),
                prereqBuilt: !prerequisite || Boolean(context.builtGoalKeys?.has?.(prerequisite.goalKey))
            })
        });
    }
    if (requirements.missionId) {
        stages.push({
            id: RING_CROSSING_STAGE_IDS.MISSION,
            done: Boolean(live?.missionComplete),
            missionId: requirements.missionId,
            anchor: null
        });
    }
    if (requirements.milestoneId) {
        stages.push({
            id: RING_CROSSING_STAGE_IDS.BOSS,
            done: Boolean(live?.bossDefeated),
            milestoneId: requirements.milestoneId,
            anchor: null
        });
    }
    return stages;
}

/**
 * Progress summary for a crossing: how many stages are done, which one is next,
 * and whether the crossing is open. `next` is null once everything is met.
 */
export function summarizeRingCrossing(plan, state, crossingId, context = {}) {
    const stages = describeRingCrossingStages(plan, state, crossingId, context);
    const done = stages.filter((stage) => stage.done).length;
    const next = stages.find((stage) => !stage.done) ?? null;
    return {
        crossingId,
        status: state?.crossings?.[crossingId]?.status ?? RING_CROSSING_STATES.LOCKED,
        stages,
        completed: done,
        total: stages.length,
        next
    };
}

/**
 * Every crossing in plan order. The first entry that is not open is the one the
 * player is actually working on, which is what a route panel wants to lead with.
 */
export function summarizeRingRoute(plan, state, context = {}) {
    const summaries = (plan?.ringCrossings ?? []).map((entry) => summarizeRingCrossing(plan, state, entry.id, context));
    const active = summaries.find((summary) => summary.status !== RING_CROSSING_STATES.OPEN) ?? null;
    return { crossings: summaries, active };
}
