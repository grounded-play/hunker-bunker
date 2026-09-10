import { describe, expect, it } from 'vitest';
import { DialogueManager } from './dialogue.js';
import { WANDERER_ARCHETYPES, WandererManager } from './wandererSystem.js';

describe('Character Portraits and Speaker Resolution', () => {
    const dm = Object.create(DialogueManager.prototype);

    it('resolves Mayor Tina / Teacup Siren to dedicated mayor_tina.webp instead of generic survivor_08', () => {
        const sirenResult = dm.getDialogueSpeaker('TEACUP SIREN: HEY, HOTSHOT. THE MAYOR IS TAKING VISITORS.');
        expect(sirenResult.name).toBe('MAYOR TINA (TEACUP SIREN)');
        expect(sirenResult.portrait).toBe('/lore_portraits/mayor_tina.webp');
        expect(sirenResult.cleanText).toBe('HEY, HOTSHOT. THE MAYOR IS TAKING VISITORS.');

        const tinaResult = dm.getDialogueSpeaker('MAYOR TINA: LOOKING VERY MAYORAL, YOUR HONOR.');
        expect(tinaResult.name).toBe('MAYOR TINA (TEACUP SIREN)');
        expect(tinaResult.portrait).toBe('/lore_portraits/mayor_tina.webp');
        expect(tinaResult.cleanText).toBe('LOOKING VERY MAYORAL, YOUR HONOR.');
    });

    it('resolves Bunker Auto-Announcer to dedicated bunker_announcer.webp instead of human survivor_08', () => {
        const bunkerResult = dm.getDialogueSpeaker('BUNKER: LIGHTING BREAKER TRIPPED. PLEASE ENJOY THE DARKNESS.');
        expect(bunkerResult.name).toBe('BUNKER AUTO-ANNOUNCER');
        expect(bunkerResult.portrait).toBe('/lore_portraits/bunker_announcer.webp');
        expect(bunkerResult.portrait).not.toBe('/lore_portraits/survivor_08.webp');

        const facResult = dm.getDialogueSpeaker('FACILITIES: POWER HAS BEEN REROUTED.');
        expect(facResult.name).toBe('BUNKER AUTO-ANNOUNCER');
        expect(facResult.portrait).toBe('/lore_portraits/bunker_announcer.webp');
    });

    it('resolves each survivor / wanderer archetype to distinct portraits', () => {
        const foxhole = dm.getDialogueSpeaker('FOXHOLE: HEADS UP, SOLDIER!');
        expect(foxhole.name).toBe('FOXHOLE SHADOW');
        expect(foxhole.portrait).toBe('/lore_portraits/survivor_foxhole.webp');

        const hacker = dm.getDialogueSpeaker('HACKER: WHOA, HOLD FIRE!');
        expect(hacker.name).toBe('MANIC HACKER GF');
        expect(hacker.portrait).toBe('/lore_portraits/survivor_hacker.webp');

        const corpo = dm.getDialogueSpeaker('CORPO: LOWER THE MUZZLE.');
        expect(corpo.name).toBe('CORPO SHADOW RUNNER');
        expect(corpo.portrait).toBe('/lore_portraits/survivor_corpo.webp');

        const crashQueen = dm.getDialogueSpeaker('CRASH QUEEN: PEACE, OPERATOR.');
        expect(crashQueen.name).toBe('CRASH SURVIVOR QUEEN');
        expect(crashQueen.portrait).toBe('/lore_portraits/survivor_crash_queen.webp');

        const abg = dm.getDialogueSpeaker('ABG: YO! THAT BASS DROP WAS WILD!');
        expect(abg.name).toBe('SPACE ABG TRIPPER');
        expect(abg.portrait).toBe('/lore_portraits/survivor_abg.webp');

        const hybrid = dm.getDialogueSpeaker('HYBRID: ...WE FEEL THE VIBRATION.');
        expect(hybrid.name).toBe('SPECIES CHRYSALIS');
        expect(hybrid.portrait).toBe('/lore_portraits/survivor_hybrid.webp');
    });

    it('resolves camp leaders and Dr. Okonkwo to their authentic portraits', () => {
        const kaelen = dm.getDialogueSpeaker('OVERSEER KAELEN: SENSORY TELEMETRY CONFIRMED.');
        expect(kaelen.name).toBe('OVERSEER KAELEN');
        expect(kaelen.portrait).toBe('/lore_portraits/meridian_kaelen.jpg');

        const martha = dm.getDialogueSpeaker('SISTER MARTHA: WE HOLD OUR OWN.');
        expect(martha.name).toBe('SISTER MARTHA');
        expect(martha.portrait).toBe('/lore_portraits/tallow_martha.webp');

        const briggs = dm.getDialogueSpeaker('COMMANDER BRIGGS: SIT DOWN AND REPORT.');
        expect(briggs.name).toBe('COMMANDER BRIGGS');
        expect(briggs.portrait).toBe('/lore_portraits/vesper_briggs.webp');

        const okonkwo = dm.getDialogueSpeaker('DR. OKONKWO: THEY READ US THROUGH THE VIBRATIONS.');
        expect(okonkwo.name).toBe('DR. OKONKWO-VASS');
        expect(okonkwo.portrait).toBe('/lore_portraits/survivor_10.webp');
    });

    it('ensures all wanderer archetypes have distinct dedicated portraits in wandererSystem', () => {
        const archetypes = Object.values(WANDERER_ARCHETYPES);
        expect(archetypes.length).toBe(6);

        const portraits = new Set();
        for (const arch of archetypes) {
            expect(arch.portrait).toBeTruthy();
            expect(arch.portrait).toMatch(/^\/lore_portraits\/survivor_.*\.webp$/);
            expect(arch.portrait).not.toBe('/lore_portraits/survivor_08.webp');
            portraits.add(arch.portrait);
        }
        // All 6 must be unique!
        expect(portraits.size).toBe(6);
    });

    it('returns portrait in rolled wanderer object', () => {
        const wm = new WandererManager({ storage: { getItem: () => null, setItem: () => {} } });
        const wanderer = wm.rollWanderer({ unlocks: { o2Bubble: true }, defeatedBosses: ['boss_cryosnail'] });
        expect(wanderer).not.toBeNull();
        expect(wanderer.portrait).toBeTruthy();
        expect(wanderer.portrait).toMatch(/^\/lore_portraits\/survivor_.*\.webp$/);
    });
});
