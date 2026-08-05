import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

// docs: camp song interstitials previously only fired from the Act 2
// launch_ready 'choice' action (openCampChoice -> camp-choice-open), so an
// ordinary Act 1 dormant-phase 'talk' visit never showed one. This is the
// regression test for the fix: first 'talk' with any camp now dispatches a
// narrower 'camp-first-contact' event (title card only, no choice modal),
// exactly once per camp.

function stubWindow() {
    const dispatchedEvents = [];
    globalThis.window = { dispatchEvent: (event) => dispatchedEvents.push(event) };
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    };
    return dispatchedEvents;
}

function makeFakeThis(camp) {
    return {
        isGameplayInputActive: () => true,
        player: { position: { x: 0, z: 0 } },
        act2: {},
        getActionableCampAt: () => ({ camp, action: 'talk' }),
        getCampRecord: () => ({ status: 'alive', bond: 0 }),
        talkToLeader: () => true
    };
}

describe('interactWithAct2Camp — first contact interstitial', () => {
    it('dispatches camp-first-contact (not camp-choice-open) on the first talk with a camp', () => {
        const dispatchedEvents = stubWindow();
        const camp = { id: 'camp_meridian', label: 'MERIDIAN' };
        const fakeThis = makeFakeThis(camp);

        const result = ThreeGame.prototype.interactWithAct2Camp.call(fakeThis);

        expect(result).toBe(true);
        const firstContact = dispatchedEvents.filter((event) => event.type === 'camp-first-contact');
        expect(firstContact).toHaveLength(1);
        expect(firstContact[0].detail.campId).toBe('camp_meridian');
        expect(dispatchedEvents.some((event) => event.type === 'camp-choice-open')).toBe(false);
    });

    it('only fires once per camp across repeated talks', () => {
        const dispatchedEvents = stubWindow();
        const camp = { id: 'camp_tallow', label: 'TALLOW' };
        const fakeThis = makeFakeThis(camp);

        ThreeGame.prototype.interactWithAct2Camp.call(fakeThis);
        ThreeGame.prototype.interactWithAct2Camp.call(fakeThis);
        ThreeGame.prototype.interactWithAct2Camp.call(fakeThis);

        expect(dispatchedEvents.filter((event) => event.type === 'camp-first-contact')).toHaveLength(1);
    });

    it('tracks first contact independently per camp', () => {
        const dispatchedEvents = stubWindow();
        const campA = { id: 'camp_meridian', label: 'MERIDIAN' };
        const campB = { id: 'camp_vesper', label: 'VESPER' };
        const fakeThis = makeFakeThis(campA);

        ThreeGame.prototype.interactWithAct2Camp.call(fakeThis);
        fakeThis.getActionableCampAt = () => ({ camp: campB, action: 'talk' });
        ThreeGame.prototype.interactWithAct2Camp.call(fakeThis);

        const ids = dispatchedEvents
            .filter((event) => event.type === 'camp-first-contact')
            .map((event) => event.detail.campId);
        expect(ids).toEqual(['camp_meridian', 'camp_vesper']);
    });
});
