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
});
