import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectiveRegistry } from './objectiveRegistry.js';

describe('ObjectiveRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new ObjectiveRegistry();
    });

    it('tracks new objectives and orders them by priority', () => {
        registry.trackObjective({
            id: 'quest_1',
            source: 'camp-quest',
            label: 'HELP MERIDIAN',
            priority: 40
        });

        registry.trackObjective({
            id: 'story_1',
            source: 'story',
            label: 'RECOVER BLACK BOX',
            priority: 10
        });

        const active = registry.getActiveObjectives();
        expect(active).toHaveLength(2);
        expect(active[0].id).toBe('story_1');
        expect(active[1].id).toBe('quest_1');
    });

    it('limits returned active objectives', () => {
        registry.trackObjective({ id: 'a', priority: 10 });
        registry.trackObjective({ id: 'b', priority: 20 });
        registry.trackObjective({ id: 'c', priority: 30 });

        const active = registry.getActiveObjectives(2);
        expect(active).toHaveLength(2);
        expect(active[0].id).toBe('a');
        expect(active[1].id).toBe('b');
    });

    it('resolves objectives by ID', () => {
        registry.trackObjective({ id: 'task_1', label: 'DEFEND CAMP' });
        expect(registry.getActiveObjectives()).toHaveLength(1);

        registry.resolveObjective('task_1', 'complete');
        expect(registry.getActiveObjectives()).toHaveLength(0);
    });

    it('clears all objectives', () => {
        registry.trackObjective({ id: '1' });
        registry.trackObjective({ id: '2' });
        expect(registry.getActiveObjectives()).toHaveLength(2);

        registry.clear();
        expect(registry.getActiveObjectives()).toHaveLength(0);
    });

    it('picks top priority objective for compass target', () => {
        registry.trackObjective({
            id: 'low_prio',
            priority: 50,
            compass: { x: 10, z: 20 }
        });

        registry.trackObjective({
            id: 'no_compass',
            priority: 10,
            compass: null
        });

        registry.trackObjective({
            id: 'high_prio',
            priority: 20,
            compass: { x: 100, z: 200 }
        });

        const target = registry.getCompassTarget();
        expect(target).not.toBeNull();
        expect(target.id).toBe('high_prio');
        expect(target.x).toBe(100);
        expect(target.z).toBe(200);
    });

    it('notifies listeners on track or resolve', () => {
        let called = false;
        registry.onChange(() => {
            called = true;
        });

        registry.trackObjective({ id: 'test' });
        expect(called).toBe(true);
    });

    it('toggles sub-step completion status and updates current count', () => {
        registry.trackObjective({
            id: 'multi_step',
            label: 'SECURE CAMP',
            target: 2,
            steps: [
                { label: 'Clear Snail Nests', done: false },
                { label: 'Talk to Leader', done: false }
            ]
        });

        const changed = registry.toggleStepDone('multi_step', 0, true);
        expect(changed).toBe(true);

        const obj = registry.getActiveObjectives()[0];
        expect(obj.steps[0].done).toBe(true);
        expect(obj.current).toBe(1);

        const toggledAgain = registry.toggleStepDone('multi_step', 0);
        expect(toggledAgain).toBe(true);
        expect(registry.getActiveObjectives()[0].steps[0].done).toBe(false);
    });

    it('blocks and unblocks an objective with a player-readable reason', () => {
        registry.trackObjective({ id: 'gate_1', label: 'CROSS RING 2', priority: 20, compass: { x: 5, z: 5 } });

        expect(registry.blockObjective('gate_1', 'Restore canyon crossing power first')).toBe(true);
        expect(registry.getBlockedObjectives()).toHaveLength(1);
        expect(registry.getBlockedObjectives()[0].blockedReason).toBe('Restore canyon crossing power first');
        // still visible/trackable and keeps its compass target while blocked
        expect(registry.getActiveObjectives()[0].status).toBe('blocked');
        expect(registry.getCompassTarget()?.id).toBe('gate_1');

        expect(registry.unblockObjective('gate_1')).toBe(true);
        expect(registry.getBlockedObjectives()).toHaveLength(0);
        expect(registry.getActiveObjectives()[0].status).toBe('active');
        expect(registry.getActiveObjectives()[0].blockedReason).toBeNull();
    });

    it('re-tracking a blocked objective without a status keeps it blocked', () => {
        registry.trackObjective({ id: 'gate_1', label: 'CROSS RING 2' });
        registry.blockObjective('gate_1', 'needs generator power');

        registry.trackObjective({ id: 'gate_1', current: 1, target: 2 });

        const obj = registry.getActiveObjectives()[0];
        expect(obj.status).toBe('blocked');
        expect(obj.blockedReason).toBe('needs generator power');
        expect(obj.current).toBe(1);
    });

    it('groups child objectives under a parent id', () => {
        registry.trackObjective({ id: 'parent_1', label: 'SECURE CAMP MERIDIAN', priority: 30 });
        registry.trackObjective({ id: 'parent_1:step_a', label: 'CLEAR NESTS', priority: 31, parentId: 'parent_1' });
        registry.trackObjective({ id: 'parent_1:step_b', label: 'TALK TO LEADER', priority: 32, parentId: 'parent_1' });
        registry.trackObjective({ id: 'unrelated', label: 'OTHER', priority: 10 });

        const children = registry.getChildObjectives('parent_1');
        expect(children.map((child) => child.id)).toEqual(['parent_1:step_a', 'parent_1:step_b']);
    });

    it('records resolved objectives to history instead of dropping them silently', () => {
        registry.trackObjective({ id: 'task_1', label: 'DEFEND CAMP', source: 'mission' });
        registry.resolveObjective('task_1', 'failed');

        const history = registry.getHistory();
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({ id: 'task_1', label: 'DEFEND CAMP', source: 'mission', outcome: 'failed' });
        expect(registry.getActiveObjectives()).toHaveLength(0);
    });

    it('preserves persistent objectives across clear() (death/reset) but not a full wipe', () => {
        registry.trackObjective({ id: 'story_goal', label: 'RECOVER BLACK BOX', persistent: true });
        registry.trackObjective({ id: 'side_quest', label: 'HELP MERIDIAN' });

        registry.clear();
        const afterReset = registry.getActiveObjectives();
        expect(afterReset.map((obj) => obj.id)).toEqual(['story_goal']);

        registry.clear({ preservePersistent: false });
        expect(registry.getActiveObjectives()).toHaveLength(0);
    });
});
