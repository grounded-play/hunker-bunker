import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame Room Tone and Environment Acoustic Transitions', () => {
    let game;
    let mockAudio;

    beforeEach(() => {
        mockAudio = {
            setRoomTone: vi.fn(),
            setLowPassMuffle: vi.fn(),
            setMusicContext: vi.fn(),
            setMusicTension: vi.fn()
        };
        globalThis.window = globalThis.window || {};
        window.AudioManager = mockAudio;

        // Create a lightweight ThreeGame stub focusing on acoustic methods
        game = Object.create(ThreeGame.prototype);
        game.player = {
            position: { x: 0, y: 0, z: 0 }
        };
        game.bunkerBlastDoorState = { doorZ: 3 };
        game.camps = [
            { id: 'camp_tallow', pos: { x: 50, z: 50 } },
            { id: 'camp_meridian', pos: { x: -80, z: 120 } }
        ];
        game.currentBiomeKey = 'active';
        game._currentRoomToneKey = null;
        game._roomToneCheckTimer = 0;
        game._wasInShip = false;
        game._nearCampMusicId = null;
        game._lastCombatState = null;
        game.scatterSprites = [];
    });

    it('identifies indoors vs outdoors based on player location', () => {
        // 1. Inside crash room south of blast door
        game.player.position = { x: 10, y: 0, z: 10 };
        expect(game.isOutdoors()).toBe(false);

        // 2. North of blast door in open wilderness
        game.player.position = { x: 10, y: 0, z: -20 };
        expect(game.isOutdoors()).toBe(true);

        // 3. Inside safe ship zone
        game.isInsideNoFireZone = () => true;
        expect(game.isOutdoors()).toBe(false);
        game.isInsideNoFireZone = () => false;

        // 4. Inside camp perimeter
        game.player.position = { x: 51, y: 0, z: 51 };
        expect(game.isOutdoors()).toBe(false);
    });

    it('resolves correct acoustic profile and filter cutoff for outdoors and indoors', () => {
        // Outdoors: blizzard wind, crisp open air
        game.player.position = { x: 0, y: 0, z: -50 };
        const outdoorEnv = game.getAcousticEnvironment();
        expect(outdoorEnv.roomTone).toBe('room_tone_exterior_wind');
        expect(outdoorEnv.outdoors).toBe(true);
        expect(outdoorEnv.filterCutoff).toBe(22000);

        // Indoors Cryo biome: subzero thermal creaks
        game.player.position = { x: 10, y: 0, z: 10 };
        game.currentBiomeKey = 'cryo';
        const cryoEnv = game.getAcousticEnvironment();
        expect(cryoEnv.roomTone).toBe('room_tone_cryo_subzero');
        expect(cryoEnv.outdoors).toBe(false);

        // Indoors Bio hive: damp amniotic reverberation
        game.currentBiomeKey = 'bio';
        const bioEnv = game.getAcousticEnvironment();
        expect(bioEnv.roomTone).toBe('room_tone_bio_hive');
        expect(bioEnv.outdoors).toBe(false);

        // Meridian camp crypt
        game.currentBiomeKey = 'active';
        game.player.position = { x: -80, y: 0, z: 120 };
        const cryptEnv = game.getAcousticEnvironment();
        expect(cryptEnv.roomTone).toBe('room_tone_cathedral_crypt');
        expect(cryptEnv.outdoors).toBe(false);
    });

    it('smoothly triggers room tone and muffling updates in updateRoomToneAcoustics', () => {
        game.player.position = { x: 0, y: 0, z: -50 }; // outdoors
        game.updateRoomToneAcoustics(0.5);

        expect(mockAudio.setRoomTone).toHaveBeenCalledWith('room_tone_exterior_wind', expect.objectContaining({
            fadeSeconds: 2.8
        }));
        expect(mockAudio.setLowPassMuffle).toHaveBeenCalledWith(false, 22000);

        // Now move indoors
        game.player.position = { x: 10, y: 0, z: 10 };
        game._roomToneCheckTimer = 0;
        game.updateRoomToneAcoustics(0.5);

        expect(mockAudio.setRoomTone).toHaveBeenCalledWith('room_tone_interior_bunker', expect.objectContaining({
            fadeSeconds: 2.8
        }));
        expect(mockAudio.setLowPassMuffle).toHaveBeenCalledWith(true, 16000);
    });

    it('dynamically triggers boss combat music when alpha specimen enters proximity', () => {
        game.player.position = { x: 0, y: 0, z: -50 };
        game.scatterSprites = [
            {
                visible: true,
                position: { x: 5, y: 0, z: -50 },
                userData: { isBoss: true, type: 'boss_cybersnail' }
            }
        ];

        game.updateRoomToneAcoustics(0.5);

        expect(mockAudio.setMusicTension).toHaveBeenCalledWith('boss');
        expect(mockAudio.setMusicContext).toHaveBeenCalledWith('boss_cybersnail');
    });
});
