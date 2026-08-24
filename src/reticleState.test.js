import { describe, expect, it } from 'vitest';
import { selectReticleState, resolveReticlePlacement, parseWeaponBlockReason, targetFromCursorClasses } from './reticleState.js';

describe('selectReticleState', () => {
    it('is neutral when the player looks at nothing in particular', () => {
        expect(selectReticleState({}).state).toBe('neutral');
    });

    it('is hostile when the look target is an actionable enemy', () => {
        expect(selectReticleState({ target: { kind: 'enemy', actionable: true } }).state).toBe('hostile');
    });

    it('is interactable for a usable world object', () => {
        expect(selectReticleState({ target: { kind: 'interactable', actionable: true } }).state).toBe('interactable');
    });

    it('is pickup for a collectable', () => {
        expect(selectReticleState({ target: { kind: 'pickup', actionable: true } }).state).toBe('pickup');
    });

    it('stays neutral for an enemy the player cannot currently act on', () => {
        expect(selectReticleState({ target: { kind: 'enemy', actionable: false } }).state).toBe('neutral');
    });

    it('is blocked, and still visible, when the shot is refused', () => {
        const result = selectReticleState({ blockedReason: 'out_of_ammo' });

        expect(result.state).toBe('blocked');
        expect(result.visible).toBe(true);
    });

    it('reports the refusal reason so the HUD can explain it', () => {
        expect(selectReticleState({ blockedReason: 'no_fire_zone' }).reason).toBe('no_fire_zone');
    });

    it('lets a refusal outrank the target under the crosshair', () => {
        const result = selectReticleState({
            target: { kind: 'enemy', actionable: true },
            blockedReason: 'out_of_ammo'
        });

        expect(result.state).toBe('blocked');
    });

    it('hides the world reticle while a blocking overlay is open', () => {
        const result = selectReticleState({ hasBlockingOverlay: true, target: { kind: 'enemy', actionable: true } });

        expect(result.visible).toBe(false);
        expect(result.hiddenReason).toBe('blocking-overlay');
    });

    it('comes back on its own once the overlay closes', () => {
        selectReticleState({ hasBlockingOverlay: true });
        const afterClose = selectReticleState({});

        expect(afterClose.visible).toBe(true);
        expect(afterClose.state).toBe('neutral');
    });
});

describe('resolveReticlePlacement', () => {
    const viewport = { width: 1280, height: 800 };

    it('shows the reticle centred the moment gameplay starts, before any mouse movement', () => {
        const placement = resolveReticlePlacement({ phase: 'gameplay', viewport });

        expect(placement.visible).toBe(true);
        expect(placement.x).toBe(640);
        expect(placement.y).toBe(400);
    });

    it('stays centred under pointer lock even with a stale pointer position', () => {
        const placement = resolveReticlePlacement({
            phase: 'gameplay',
            pointerLocked: true,
            pointer: { x: 12, y: 900 },
            viewport
        });

        expect(placement.x).toBe(640);
        expect(placement.y).toBe(400);
    });

    it('follows the pointer when it is free and known', () => {
        const placement = resolveReticlePlacement({
            phase: 'gameplay',
            pointer: { x: 300, y: 220 },
            viewport
        });

        expect(placement).toMatchObject({ x: 300, y: 220, visible: true });
    });

    it('is not shown outside gameplay', () => {
        expect(resolveReticlePlacement({ phase: 'menu', viewport }).visible).toBe(false);
    });
});

describe('parseWeaponBlockReason', () => {
    // Lane C emits these from src/threeGame.js via window.hbLog, and
    // debugConsole flattens the detail object into the entry's message string.
    it('reads the refusal reason out of a WEAPON shot-blocked entry', () => {
        const entry = { category: 'WEAPON', message: 'shot-blocked {\n  "reason": "out_of_ammo",\n  "clip": 0\n}' };

        expect(parseWeaponBlockReason(entry)).toBe('out_of_ammo');
    });

    it('ignores entries from other categories', () => {
        expect(parseWeaponBlockReason({ category: 'PERF', message: 'shot-blocked {"reason":"x"}' })).toBe(null);
    });

    it('ignores WEAPON entries that are not refusals', () => {
        expect(parseWeaponBlockReason({ category: 'WEAPON', message: 'shot-accepted {"clip":5}' })).toBe(null);
    });

    it('returns null rather than throwing when the reason is missing', () => {
        expect(parseWeaponBlockReason({ category: 'WEAPON', message: 'shot-blocked' })).toBe(null);
    });
});

describe('targetFromCursorClasses', () => {
    // src/threeGame.js's setCursorInspectState already resolves what the player
    // is looking at and writes it onto #tactical-cursor as classes. Reading
    // that back is how Lane A gets a look-target without editing Lane B's file.
    it('reads an enemy under the crosshair', () => {
        expect(targetFromCursorClasses(['cursor-target', 'cursor-enemy'])).toEqual({ kind: 'enemy', actionable: true });
    });

    it('reads loot as a pickup', () => {
        expect(targetFromCursorClasses(['cursor-loot'])).toEqual({ kind: 'pickup', actionable: true });
    });

    it('treats an interact target and a camp alike', () => {
        expect(targetFromCursorClasses(['cursor-interact']).kind).toBe('interactable');
        expect(targetFromCursorClasses(['cursor-camp']).kind).toBe('interactable');
    });

    it('reports nothing for a plain wall', () => {
        expect(targetFromCursorClasses(['cursor-wall'])).toBe(null);
    });

    it('reports nothing when no cursor classes are present', () => {
        expect(targetFromCursorClasses([])).toBe(null);
    });

    it('ranks an enemy above an interactable when both are flagged', () => {
        expect(targetFromCursorClasses(['cursor-interact', 'cursor-enemy']).kind).toBe('enemy');
    });
});
