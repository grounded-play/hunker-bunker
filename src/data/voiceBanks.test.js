import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { VOICE_BANKS, VOICE_BANK_IDS, bankForSourceFile, getVoiceBank } from './voiceBanks.js';
import { getCatalogEntry, ITEM_TYPE } from '../itemOwnership.js';

describe('VOICE_BANKS', () => {
    it('covers both alt-radio itemdefs and nothing else', () => {
        expect(VOICE_BANK_IDS).toEqual([4148, 4149]);
    });

    it('matches the catalog: both banks are real, audio-typed items', () => {
        for (const id of VOICE_BANK_IDS) {
            const entry = getCatalogEntry(id);
            expect(entry, `itemdef ${id} missing from the merged catalog`).toBeTruthy();
            expect(entry.type).toBe(ITEM_TYPE.AUDIO);
        }
    });

    it('gives each bank exactly the 6 lines the artist recorded', () => {
        for (const bank of Object.values(VOICE_BANKS)) {
            expect(bank.slots).toHaveLength(6);
        }
    });

    it('uses unique slot keys, each prefixed with its own bank', () => {
        const seen = new Set();
        for (const bank of Object.values(VOICE_BANKS)) {
            for (const slot of bank.slots) {
                expect(slot.key.startsWith(`${bank.prefix}_`)).toBe(true);
                expect(seen.has(slot.key), `duplicate slot key ${slot.key}`).toBe(false);
                seen.add(slot.key);
            }
        }
    });

    // The bank definition is only useful if the keys are the ones the callout
    // player actually looks up -- a typo here is a silently silent cue.
    it('every slot key appears in audio.js so no cue resolves to a missing asset', () => {
        const audioSrc = readFileSync(new URL('../audio.js', import.meta.url), 'utf8');
        for (const bank of Object.values(VOICE_BANKS)) {
            for (const slot of bank.slots) {
                const referenced = audioSrc.includes(slot.key)
                    || audioSrc.includes(`\${prefix}_${slot.key.slice(bank.prefix.length + 1)}`);
                expect(referenced, `${slot.key} is not reachable from audio.js`).toBe(true);
            }
        }
    });

    it('has a shipped audio file behind every slot', () => {
        for (const bank of Object.values(VOICE_BANKS)) {
            for (const slot of bank.slots) {
                const path = new URL(`../../public/audio/generated/${slot.key}.wav`, import.meta.url);
                expect(existsSync(path), `no audio file for ${slot.key}`).toBe(true);
            }
        }
    });
});

describe('bankForSourceFile', () => {
    it('routes the delivered session filenames to the right bank', () => {
        expect(bankForSourceFile('voice_aura_V_take_1.wav').itemdefid).toBe(4149);
        expect(bankForSourceFile('voice_commander_V_take_1.wav').itemdefid).toBe(4148);
        expect(bankForSourceFile('voice_commander_V_take_2.wav').itemdefid).toBe(4148);
    });

    it('returns null rather than guessing at an unrelated file', () => {
        expect(bankForSourceFile('ambient_wind.wav')).toBeNull();
        expect(bankForSourceFile('')).toBeNull();
        expect(bankForSourceFile()).toBeNull();
    });
});

describe('getVoiceBank', () => {
    it('accepts the id as a number or a string, as loadout state stores it', () => {
        expect(getVoiceBank(4148).prefix).toBe('voice_commander');
        expect(getVoiceBank('4149').prefix).toBe('voice_aura');
    });

    it('returns null for anything else', () => {
        expect(getVoiceBank(9999)).toBeNull();
        expect(getVoiceBank(null)).toBeNull();
    });
});
