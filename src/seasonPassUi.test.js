import { afterEach, describe, expect, it, vi } from 'vitest';
import { dismissProgressionReward, presentRewardStage, shouldPresentProgressionReward } from './seasonPassUi.js';

function createClassList(initial = []) {
    const values = new Set(initial);
    return {
        add: (...names) => names.forEach((name) => values.add(name)),
        remove: (...names) => names.forEach((name) => values.delete(name)),
        contains: (name) => values.has(name)
    };
}

function createElement(initialClasses = []) {
    return {
        classList: createClassList(initialClasses),
        dataset: {},
        disabled: false,
        innerHTML: '',
        textContent: '',
        focus: vi.fn(),
        setAttribute: vi.fn()
    };
}

function installCeremonyDom() {
    const claim = createElement();
    const continueButton = createElement(['hidden']);
    const confirm = createElement(['hidden']);
    const preview = createElement(['progression-reward-preview--unavailable']);
    const burst = createElement();
    const status = createElement();
    const children = new Map([
        ['#progression-claim-btn', claim],
        ['#progression-continue-btn', continueButton],
        ['#progression-reward-confirm', confirm],
        ['#progression-reward-preview', preview],
        ['.progression-reward-burst', burst]
    ]);
    const overlay = createElement();
    overlay.dataset = { tier: '3', track: 'free' };
    overlay.querySelector = (selector) => children.get(selector) ?? null;

    globalThis.document = {
        getElementById: (id) => {
            if (id === 'progression-reward-overlay') return overlay;
            if (id === 'season-pass-command-status') return status;
            return null;
        }
    };
    globalThis.window = {
        AudioManager: { play: vi.fn() },
        setTimeout: vi.fn()
    };

    return { overlay, claim, continueButton, confirm, preview, burst };
}

afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.document;
    delete globalThis.window;
});

describe('Season Pass reward ceremony DOM lifecycle', () => {
    it('only presents unclaimed rewards while the Season screen is open', () => {
        expect(shouldPresentProgressionReward({ seasonScreenOpen: true, claimable: true })).toBe(true);
        expect(shouldPresentProgressionReward({ seasonScreenOpen: false, claimable: true })).toBe(false);
        expect(shouldPresentProgressionReward({ seasonScreenOpen: true, claimable: false })).toBe(false);
    });

    it('moves from reveal to confirmation and resets cleanly on dismiss', () => {
        const dom = installCeremonyDom();
        const ending = { family: 'charm' };

        presentRewardStage('reveal', ending);

        expect(dom.overlay.dataset.revealStage).toBe('reveal');
        expect(dom.overlay.dataset.rewardFamily).toBe('charm');
        expect(dom.claim.classList.contains('hidden')).toBe(true);
        expect(dom.continueButton.classList.contains('hidden')).toBe(false);
        expect(dom.continueButton.focus).toHaveBeenCalledOnce();
        expect(dom.confirm.textContent).toBe('ADDED TO INVENTORY');
        expect(dom.confirm.classList.contains('hidden')).toBe(false);

        presentRewardStage('burst', ending);
        expect(dom.burst.innerHTML).toContain('--particle-angle:0deg');

        dismissProgressionReward();

        expect(dom.overlay.classList.contains('hidden')).toBe(true);
        expect(dom.overlay.dataset.revealStage).toBeUndefined();
        expect(dom.overlay.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true');
        expect(dom.preview.innerHTML).toBe('');
        expect(dom.preview.classList.contains('progression-reward-preview--unavailable')).toBe(false);
        expect(dom.confirm.classList.contains('hidden')).toBe(true);
        expect(dom.continueButton.classList.contains('hidden')).toBe(true);
        expect(dom.claim.classList.contains('hidden')).toBe(false);
        expect(dom.claim.disabled).toBe(false);
    });
});
