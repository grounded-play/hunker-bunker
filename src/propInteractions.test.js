import { describe, expect, it, vi } from 'vitest';
import {
    BIOMECH_SYNERGY_TUNING,
    BILE_ARMOR_WEAKEN,
    findNearestInteractableProp,
    interactionSpecKeyFor,
    handleCustomPropDestruction,
    interactWithCustomProp,
    applyPropInteractionState,
    PROP_INTERACTION_SPECS
} from './propInteractions.js';

describe('propInteractions', () => {
    const recentVerticalSlice = [
        'life_arcade_cabinet', 'life_surgical_lamp', 'cryo_heater_station',
        'hive_brood_dome', 'chasm_beacon_post', 'corp_executive_sarcophagus',
        'corp_suppression_barrier', 'meridian_capacitor_bomb',
        'tina_covert_nursery_chest', 'hive_sphincter_iris',
        'ind_biomass_grinder', 'crash_cockpit_canopy'
    ];

    it('gives every first-slice recent GLB a bespoke action', () => {
        for (const type of recentVerticalSlice) {
            expect(PROP_INTERACTION_SPECS[type]?.canInteract, type).toBe(true);
            expect(PROP_INTERACTION_SPECS[type]?.interactPrompt, type).toMatch(/^\[E\]/);
        }
    });

    const pass2Props = [
        'bay_c_pod_312_rupture', 'chen_sealed_confession_console', 'decon_exosuit_scrubber_station',
        'engineer_wave_relay_dynamo', 'evac_four_seat_cockpit_module', 'tank_orbital_siege_cannon',
        'queen_royal_brood_throne', 'carapace_sentry_chrysalis', 'royal_egg_clutch_caul',
        'vass_acoustic_resonator_tank', 'vass_hybrid_embryo_incubator', 'suture_mercy_cocoon_canopy',
        'relay_false_beacon_spire', 'corp_biometric_collar_chute', 'crawler_signal_antenna_rig',
        'evac_manifest_allocation_terminal', 'evac_preflight_fuel_umbilical', 'scout_tracking_beacon_core',
        'sector_zero_bore_drillhead'
    ];

    it('gives every pass 2 GLB a bespoke action', () => {
        for (const type of pass2Props) {
            expect(PROP_INTERACTION_SPECS[type]?.canInteract, type).toBe(true);
            expect(PROP_INTERACTION_SPECS[type]?.interactPrompt, type).toMatch(/^\[E\]/);
        }
    });

    const waveDProps = [
        'corp_interrogation_chair', 'corp_debt_severing_kiosk', 'corp_dissection_gurney',
        'corp_incinerator_hopper', 'meridian_cyber_graft_bench', 'meridian_mainframe_altar',
        'meridian_servitor_dock', 'tallow_compost_fermenter', 'tallow_spore_cradle',
        'tallow_flesh_trellis', 'tallow_sacrificial_altar', 'vesper_amputation_rig',
        'vesper_autocannon_bipod', 'vesper_hanging_cage', 'vesper_reloading_station'
    ];

    it('gives every Wave D world-story GLB a bespoke action', () => {
        for (const type of waveDProps) {
            expect(PROP_INTERACTION_SPECS[type]?.canInteract, type).toBe(true);
            expect(PROP_INTERACTION_SPECS[type]?.interactPrompt, type).toMatch(/^\[E\]/);
        }
    });

    const waveEProps = [
        'tina_molted_carapace', 'tina_mimic_vanity', 'tina_trophy_trove',
        'hive_visceral_ovipositor', 'hive_vivisected_engineer', 'hive_gestation_sac',
        'hive_pulmonary_bellows', 'hive_amniotic_feeder_trough', 'cryo_ruptured_pod',
        'cryo_cannibal_butchery_table', 'cryo_ice_core_specimen', 'cryo_thawing_trough',
        'cryo_frozen_shelter_pod', 'chasm_hanging_elevator', 'chasm_suicide_ledge_cross',
        'chasm_dredge_hook_crane', 'ind_hydraulic_manifold', 'ind_fuel_rod_cask'
    ];

    it('gives every Wave E world-story GLB a bespoke action', () => {
        for (const type of waveEProps) {
            expect(PROP_INTERACTION_SPECS[type]?.canInteract, type).toBe(true);
            expect(PROP_INTERACTION_SPECS[type]?.interactPrompt, type).toMatch(/^\[E\]/);
        }
    });

    const waveFProps = [
        'life_pallet_racking', 'life_server_racks', 'life_transformer_bank',
        'life_fire_station', 'life_conveyor_section', 'life_cistern_tank',
        'life_scaffold_tower', 'life_forklift', 'life_sink_row',
        'life_shower_stall', 'life_laundry_machines', 'life_weight_bench',
        'life_filing_cabinets', 'life_overseer_desk', 'life_planning_board',
        'life_algae_tank', 'cryo_ice_crawler', 'cryo_snowbound_crates',
        'cryo_ice_blocks', 'hive_resin_pillar', 'hive_cocooned_crew',
        'hive_pheromone_node', 'hive_assimilated_generator', 'crash_engine_nacelle',
        'crash_hull_panels', 'salvage_tagged_heap', 'camp_canvas_tent',
        'camp_water_barrel'
    ];

    it('gives every Wave F world-completion GLB a bespoke action', () => {
        for (const type of waveFProps) {
            expect(PROP_INTERACTION_SPECS[type]?.canInteract, type).toBe(true);
            expect(PROP_INTERACTION_SPECS[type]?.interactPrompt, type).toMatch(/^\[E\]/);
        }
    });

    it('applies named visual state and collision changes through dressing roots', () => {
        const setState = vi.fn();
        const setMode = vi.fn();
        const root = { userData: { propExperience: { setState }, propFx: { setMode } } };
        const sprite = { userData: { dressingItem: { dynamicRoot: root }, isSolidProp: true } };
        expect(applyPropInteractionState(sprite, { state: 'open', fxMode: 'open', solid: false })).toBe(true);
        expect(sprite.userData.propState).toBe('open');
        expect(sprite.userData.isSolidProp).toBe(false);
        expect(setState).toHaveBeenCalledWith('open');
        expect(setMode).toHaveBeenCalledWith('open');
    });

    it('persists named state by scatter key for a reloaded chunk instance', () => {
        const barrier = {
            position: { x: 1, z: 0 },
            userData: { type: 'corp_suppression_barrier', scatterKey: 'room-9:barrier', isSolidProp: true }
        };
        const game = {
            player: { position: { x: 0, z: 0 } },
            scatterSprites: [barrier],
            showBunkerLine: vi.fn(),
            acknowledgePropExperience: vi.fn()
        };
        expect(interactWithCustomProp(game, findNearestInteractableProp(game))).toBe(true);
        expect(barrier.userData.propState).toBe('open');
        expect(barrier.userData.isSolidProp).toBe(false);

        const reloaded = { userData: { isSolidProp: true } };
        applyPropInteractionState(reloaded, game.propInteractionStates.get('room-9:barrier'));
        expect(reloaded.userData.propState).toBe('open');
        expect(reloaded.userData.isSolidProp).toBe(false);
    });

    it('defines interaction specs for the new biomechanical & cathedral props', () => {
        expect(PROP_INTERACTION_SPECS.prop_oxygen_bottle_cascade_rack).toBeDefined();
        expect(PROP_INTERACTION_SPECS.prop_oxygen_bottle_cascade_rack.canInteract).toBe(true);
        expect(PROP_INTERACTION_SPECS.prop_coolant_drum_leaking_pool).toBeDefined();
        expect(PROP_INTERACTION_SPECS.prop_decon_eyewash_shower_station).toBeDefined();
        expect(PROP_INTERACTION_SPECS.prop_corporate_saint_reliquary).toBeDefined();
    });

    it('handles oxygen rack destruction: adjusts O2 and damages nearby enemies', () => {
        const nearUmbilical = { isAlive: true, x: 12, z: 10, stun: vi.fn() };
        const farUmbilical = { isAlive: true, x: 30, z: 30, stun: vi.fn() };
        const mockGame = {
            adjustOxygen: vi.fn(),
            showBunkerLine: vi.fn(),
            triggerCameraShake: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            applyPlayerDamageToEnemy: vi.fn(),
            snails: [
                { isAlive: true, x: 10, z: 10 },
                { isAlive: true, x: 100, z: 100 }
            ],
            umbilicalAttackers: [nearUmbilical, farUmbilical]
        };

        const handled = handleCustomPropDestruction(
            mockGame,
            'prop_oxygen_bottle_cascade_rack',
            { x: 10.5, z: 10.5 }
        );

        expect(handled).toBe(true);
        expect(mockGame.adjustOxygen).toHaveBeenCalledWith(35);
        expect(mockGame.applyPlayerDamageToEnemy).toHaveBeenCalledTimes(1);
        expect(mockGame.applyPlayerDamageToEnemy).toHaveBeenCalledWith(
            mockGame.snails[0],
            45,
            expect.objectContaining({ element: 'cryo' })
        );
        expect(nearUmbilical.stun).toHaveBeenCalledWith(BIOMECH_SYNERGY_TUNING.cryoStunSeconds);
        expect(farUmbilical.stun).not.toHaveBeenCalled();
    });

    it('applies bounded bile damage and deduplicated chitin vulnerability in radius', () => {
        const near = { isAlive: true, x: 1, z: 1, userData: {} };
        const far = { isAlive: true, x: 20, z: 20, userData: {} };
        const game = {
            showBunkerLine: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            applyPlayerDamageToEnemy: vi.fn(),
            snails: [near, far]
        };
        const prop = { x: 0, z: 0 };
        const propObject = { userData: { scatterKey: 'room:7:hatch' } };

        handleCustomPropDestruction(game, 'prop_biomech_sphincter_hatch_vent', prop, propObject);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledTimes(1);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(near, 35, { element: 'bile' });
        expect(near.userData.statusEffects.chitinVulnerabilityTimer).toBe(6);
        expect(near.userData.statusEffects.chitinDamageMultiplier).toBe(1.25);
        expect(far.userData.statusEffects).toBeUndefined();

        near.userData.statusEffects.chitinVulnerabilityTimer = 3;
        handleCustomPropDestruction(game, 'prop_biomech_sphincter_hatch_vent', prop, propObject);
        expect(near.userData.statusEffects.chitinVulnerabilityTimer).toBe(3);
    });

    it('exports data-driven BILE_ARMOR_WEAKEN constants matching synergy tuning', () => {
        expect(BILE_ARMOR_WEAKEN.multiplier).toBe(BIOMECH_SYNERGY_TUNING.bileDamageMultiplier);
        expect(BILE_ARMOR_WEAKEN.duration).toBe(BIOMECH_SYNERGY_TUNING.bileVulnerabilitySeconds);
        expect(BILE_ARMOR_WEAKEN.multiplier).toBeGreaterThan(1);
        expect(BILE_ARMOR_WEAKEN.duration).toBeGreaterThan(0);
    });

    it('handles coolant drum destruction: stuns living umbilicals in cryo radius', () => {
        const nearUmbilical = { isAlive: true, x: 2, z: 2, stun: vi.fn() };
        const deadUmbilical = { isAlive: false, x: 1, z: 1, stun: vi.fn() };
        const farUmbilical = { isAlive: true, x: 25, z: 25, stun: vi.fn() };
        const mockGame = {
            showBunkerLine: vi.fn(),
            triggerCameraShake: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            applyPlayerDamageToEnemy: vi.fn(),
            snails: [{ isAlive: true, x: 1, z: 1 }],
            umbilicalAttackers: [nearUmbilical, deadUmbilical, farUmbilical]
        };

        const handled = handleCustomPropDestruction(
            mockGame,
            'prop_coolant_drum_leaking_pool',
            { x: 0, z: 0 }
        );

        expect(handled).toBe(true);
        expect(nearUmbilical.stun).toHaveBeenCalledWith(BIOMECH_SYNERGY_TUNING.cryoStunSeconds);
        expect(deadUmbilical.stun).not.toHaveBeenCalled();
        expect(farUmbilical.stun).not.toHaveBeenCalled();
    });

    it('handles tracheal wall pipe destruction: damages and applies chitin vulnerability in radius', () => {
        const nearSnail = { isAlive: true, x: 2, z: 1, userData: {} };
        const farSnail = { isAlive: true, x: 30, z: 30, userData: {} };
        const mockGame = {
            showBunkerLine: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            applyPlayerDamageToEnemy: vi.fn(),
            snails: [nearSnail, farSnail]
        };

        const handled = handleCustomPropDestruction(
            mockGame,
            'prop_biomech_tracheal_wall_pipe',
            { x: 0, z: 0 }
        );

        expect(handled).toBe(true);
        expect(mockGame.applyPlayerDamageToEnemy).toHaveBeenCalledWith(nearSnail, 35, { element: 'bile' });
        expect(nearSnail.userData.statusEffects.chitinVulnerabilityTimer).toBe(BIOMECH_SYNERGY_TUNING.bileVulnerabilitySeconds);
        expect(nearSnail.userData.statusEffects.chitinDamageMultiplier).toBe(BIOMECH_SYNERGY_TUNING.bileDamageMultiplier);
        expect(farSnail.userData.statusEffects).toBeUndefined();
    });

    it('handles decon eyewash destruction: cleanses infection and restores O2', () => {
        const mockGame = {
            adjustOxygen: vi.fn(),
            showBunkerLine: vi.fn(),
            triggerCameraShake: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            playerVitals: {
                infection: 45
            }
        };

        const handled = handleCustomPropDestruction(
            mockGame,
            'prop_decon_eyewash_shower_station',
            { x: 5, z: 5 }
        );

        expect(handled).toBe(true);
        expect(mockGame.playerVitals.infection).toBe(0);
        expect(mockGame.adjustOxygen).toHaveBeenCalledWith(20);
    });

    it('finds nearest interactable prop and ignores non-interactable props', () => {
        const mockGame = {
            player: { position: { x: 0, z: 0 } },
            scatterSprites: [
                {
                    position: { x: 1.5, z: 0 },
                    userData: { type: 'prop_oxygen_bottle_cascade_rack' }
                },
                {
                    position: { x: 0.5, z: 0 },
                    userData: { type: 'prop_non_interactive_stone' }
                }
            ]
        };

        const nearest = findNearestInteractableProp(mockGame, 3.0);
        expect(nearest).not.toBeNull();
        expect(nearest.propKey).toBe('prop_oxygen_bottle_cascade_rack');
        expect(nearest.distance).toBeCloseTo(1.5);
    });

    it('interacts with custom prop successfully and flags hasBeenInteracted', () => {
        const mockGame = {
            adjustOxygen: vi.fn(),
            showBunkerLine: vi.fn(),
            spawnPhysicalBurst: vi.fn()
        };

        const nearestInfo = {
            sprite: {
                position: { x: 1, z: 1 },
                userData: {}
            },
            spec: PROP_INTERACTION_SPECS.prop_oxygen_bottle_cascade_rack
        };

        const success = interactWithCustomProp(mockGame, nearestInfo);
        expect(success).toBe(true);
        expect(mockGame.adjustOxygen).toHaveBeenCalledWith(15);
        expect(nearestInfo.sprite.userData.hasBeenInteracted).toBe(true);
    });
    // Session 2026-10-06: every press on the same tool cart paid +15 scrap and
    // a full magazine again, and an O2 rack refilled 15% per press, forever.
    it('a scavenged prop is spent: no prompt, no second payout, even after its chunk reloads', () => {
        const rack = () => ({ position: { x: 1, z: 0 }, userData: { type: 'prop_oxygen_bottle_cascade_rack', scatterKey: 'room-4:rack' } });
        const game = {
            player: { position: { x: 0, z: 0 } },
            scatterSprites: [rack()],
            adjustOxygen: vi.fn(),
            showBunkerLine: vi.fn(),
            spawnPhysicalBurst: vi.fn()
        };
        expect(interactWithCustomProp(game, findNearestInteractableProp(game, 2.5))).toBe(true);
        expect(findNearestInteractableProp(game, 2.5)).toBeNull();

        game.scatterSprites = [rack()];
        expect(findNearestInteractableProp(game, 2.5)).toBeNull();
        expect(game.adjustOxygen).toHaveBeenCalledTimes(1);
    });

    it('a prop carrying its own interaction (a service wreck) stays usable', () => {
        const onInteract = vi.fn(() => true);
        const wreck = { position: { x: 1, z: 0 }, userData: { type: 'wreck', scatterKey: 'wreck:shop', interactionSpec: { canInteract: true, onInteract } } };
        const game = { player: { position: { x: 0, z: 0 } }, scatterSprites: [wreck] };
        interactWithCustomProp(game, findNearestInteractableProp(game, 2.5));
        expect(findNearestInteractableProp(game, 2.5)?.sprite).toBe(wreck);
    });

    it('keeps terminal interactions repeatable and acknowledges their 3D presentation', () => {
        const consoleProp = {
            position: { x: 1, z: 0 },
            userData: { type: 'prop_diagnostic_console', scatterKey: 'diagnostic:1' }
        };
        const game = {
            player: { position: { x: 0, z: 0 } },
            scatterSprites: [consoleProp],
            showBunkerLine: vi.fn(),
            acknowledgePropExperience: vi.fn()
        };
        expect(interactWithCustomProp(game, findNearestInteractableProp(game))).toBe(true);
        expect(game.acknowledgePropExperience).toHaveBeenCalledWith(consoleProp);
        expect(findNearestInteractableProp(game)?.sprite).toBe(consoleProp);
        expect(game.spentPropScatterKeys?.size ?? 0).toBe(0);
    });
    // A 2D placeholder type that draws as a catalogue model (a Meridian repair
    // rig drawn as the tool cart) behaves like the model the player sees.
    it('a prop drawn as a catalogue model takes that model\'s interaction', () => {
        const rig = { position: { x: 1, z: 0 }, userData: { type: 'prop_camp_meridian_repair_rig', world3dModelType: 'prop_maintenance_tool_cart', scatterKey: 'rig' } };
        const game = { player: { position: { x: 0, z: 0 } }, scatterSprites: [rig] };
        const nearest = findNearestInteractableProp(game, 2.5);
        expect(nearest?.spec).toBe(PROP_INTERACTION_SPECS.prop_maintenance_tool_cart);
        expect(interactionSpecKeyFor(rig.userData)).toBe('prop_maintenance_tool_cart');
        expect(interactionSpecKeyFor({ type: 'prop_oxygen_bottle_cascade_rack', world3dModelType: 'prop_oxygen_bottle_cascade_rack' })).toBe('prop_oxygen_bottle_cascade_rack');
        expect(interactionSpecKeyFor({ type: 'prop_rock' })).toBe('prop_rock');
    });

    // Health is three hearts. The coolant siphon dealt 10, a kill from full
    // health (session 2026-10-06). No interaction may cost more than a heart.
    it('never charges more than one heart for an interaction', () => {
        for (const [key, spec] of Object.entries(PROP_INTERACTION_SPECS)) {
            if (!spec.onInteract) continue;
            const takeDamage = vi.fn();
            const game = new Proxy({ takeDamage, snails: [], umbilicalAttackers: [] }, {
                get: (target, prop) => (prop in target ? target[prop] : vi.fn())
            });
            spec.onInteract(game, { position: { x: 0, z: 0 }, userData: {} });
            for (const [amount] of takeDamage.mock.calls) expect(amount, key).toBeLessThanOrEqual(1);
        }
    });
});

describe('generic prop interactions', () => {
    it('offers a switch only when the prop has live effects to switch', async () => {
        const { genericInteractionSpec } = await import('./propInteractions.js');
        let enabled = true;
        const fx = { setEnabled: () => enabled, toggle: () => (enabled = !enabled) };
        const sprite = { userData: { world3dRoot: { userData: { propFx: fx } } } };
        const spec = genericInteractionSpec('life_barrel_heater', sprite);
        expect(spec.interactPrompt).toBe('[E] SWITCH BARREL HEATER');
        expect(spec.repeatable).toBe(true);
        const lines = [];
        expect(spec.onInteract({ showBunkerLine: (line) => lines.push(line) }, sprite)).toBe(true);
        expect(enabled).toBe(false);
        expect(lines[0]).toBe('BARREL HEATER: SHUT DOWN.');
        expect(genericInteractionSpec('life_barrel_heater', { userData: {} })).toBe(null);
    });

    it('lets containers be searched once and leaves inert furniture alone', async () => {
        const { genericInteractionSpec } = await import('./propInteractions.js');
        const crate = genericInteractionSpec('prop_camp_crates', { userData: {} });
        expect(crate.interactPrompt).toBe('[E] SEARCH CAMP CRATES');
        expect(crate.repeatable).toBe(false);
        expect(genericInteractionSpec('life_pew_segment', { userData: {} })).toBe(null);
        expect(genericInteractionSpec('arch_pillar_buttress_01', { userData: {} })).toBe(null);
    });
});

describe('cuttable spline conduits', () => {
    it('can be cut by hand with E, through the same break as shooting them', () => {
        for (const type of ['spline_wire_bunker', 'spline_vein_bio', 'spline_pipe_cryo', 'spline_vine_camp']) {
            const spec = PROP_INTERACTION_SPECS[type];
            expect(spec.canInteract, type).toBe(true);
            expect(spec.interactPrompt, type).toMatch(/^\[E\] /);
            const sprite = { userData: { type } };
            const breakScatterProp = vi.fn(() => true);
            expect(spec.onInteract({ breakScatterProp }, sprite)).toBe(true);
            expect(breakScatterProp).toHaveBeenCalledWith(sprite);
        }
    });
});
