import { describe, it, expect } from 'vitest';
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import { VOICE_BANKS, VOICE_BANK_IDS, bankForSourceFile, getVoiceAudioManifest, getVoiceBank, getVoiceScriptRows, getVoiceTakeKeys, resolveVoiceBankSlot } from './voiceBanks.js';
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

    it('gives each bank the six delivered lines plus four generated counterparts', () => {
        for (const bank of Object.values(VOICE_BANKS)) {
            expect(bank.slots).toHaveLength(10);
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

    it('ships and preloads every currently available take behind each slot', () => {
        const manifest = getVoiceAudioManifest();
        for (const bank of Object.values(VOICE_BANKS)) {
            for (const slot of bank.slots) {
                const keys = getVoiceTakeKeys(slot.key, slot.takeCount);
                expect(keys).toHaveLength(slot.takeCount ?? 2);
                for (const key of keys) {
                    const path = new URL(`../../public/audio/generated/${key}.wav`, import.meta.url);
                    expect(existsSync(path), `no audio file for ${key}`).toBe(true);
                    expect(manifest).toContainEqual({ key, url: `/audio/generated/${key}.wav` });
                }
            }
        }
    });

    it('ships alternate-radio takes at an audible, non-clipping level', () => {
        for (const { url } of getVoiceAudioManifest()) {
            const path = new URL(`../../public${url}`, import.meta.url);
            const wav = readFileSync(path);
            expect(wav.toString('ascii', 0, 4), `${url} is not RIFF`).toBe('RIFF');
            const dataOffset = wav.indexOf(Buffer.from('data'));
            expect(dataOffset, `${url} has no PCM data chunk`).toBeGreaterThan(0);
            const byteLength = wav.readUInt32LE(dataOffset + 4);
            let peak = 0;
            for (let offset = dataOffset + 8; offset + 1 < dataOffset + 8 + byteLength; offset += 2) {
                peak = Math.max(peak, Math.abs(wav.readInt16LE(offset)));
            }
            const peakDb = 20 * Math.log10(peak / 32768);
            expect(peakDb, `${url} is too quiet at ${peakDb.toFixed(1)} dBFS`).toBeGreaterThan(-6);
            expect(peakDb, `${url} clips at ${peakDb.toFixed(1)} dBFS`).toBeLessThan(-0.5);
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

describe('voice script routing', () => {
    it('routes every original combat semantic to a matching line in both banks', () => {
        const cues = ['reload', 'low_health', 'shield_critical', 'boss_spotted', 'target_down', 'killstreak', 'overdrive_ready', 'breached', 'sector_cleared', 'victory'];
        for (const bankId of VOICE_BANK_IDS) {
            for (const cue of cues) expect(resolveVoiceBankSlot(bankId, cue), `${bankId}:${cue}`).toBeTruthy();
        }
    });

    it('publishes complete trigger, exclusion, subtitle and take metadata', () => {
        const rows = getVoiceScriptRows();
        expect(rows).toHaveLength(20);
        for (const row of rows) {
            expect(row.semanticId).toBe(`${row.bankId}:${row.cue}`);
            expect(row.repeatScope).toBe('expedition');
            expect(row.subtitle.length).toBeGreaterThan(0);
            expect(row.trigger.length).toBeGreaterThan(0);
            expect(row.exclusions.length).toBeGreaterThan(0);
            expect(row.takes).toHaveLength(row.takeCount ?? 2);
        }
    });
});
