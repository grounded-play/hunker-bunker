import { AudioManager } from './audio.js';
import {
    ARCHETYPE_SKINS,
    CLASS_ARCHETYPES,
    DEFAULT_ARCHETYPES
} from './loadout.js';

export const CATALOG_ITEMS = Object.freeze({
    // Weapon Skins
    '4100': { name: 'Sub-Zero Frostbite', rarity: 'uncommon', type: 'skin', icon: '/economy/skin_scout_frostbite.png' },
    '4101': { name: 'Hazard Stripe SMG', rarity: 'uncommon', type: 'skin' },
    '4102': { name: 'Tectonic Driller', rarity: 'uncommon', type: 'skin' },
    '4103': { name: 'Cryo-Plasma Arc', rarity: 'rare', type: 'skin', icon: '/economy/skin_engineer_cryo_plasma.png' },
    '4104': { name: 'Rust & Bone Trench', rarity: 'rare', type: 'skin' },
    '4105': { name: 'Obsidian Shard', rarity: 'rare', type: 'skin' },
    '4106': { name: 'Biolume Spore Sprayer', rarity: 'rare', type: 'skin' },
    '4107': { name: 'Deep Core Melter', rarity: 'epic', type: 'skin', icon: '/economy/skin_tank_deep_core_melter.png' },
    '4108': { name: 'Glitched Circuit Bolter', rarity: 'epic', type: 'skin' },
    '4109': { name: 'Void-Walker Beam', rarity: 'epic', type: 'skin', icon: '/economy/skin_void_walker_beam.png' },
    '4110': { name: "Queen's Carapace Carbine", rarity: 'legendary', type: 'skin', icon: '/economy/skin_queen_carapace_carbine.png' },
    '4111': { name: 'Solar Flare Antimatter', rarity: 'legendary', type: 'skin' },

    // Charms
    '4130': { name: 'Mini Cryo-Core', rarity: 'uncommon', type: 'charm', icon: '/economy/charm_mini_cryo_core.png' },
    '4131': { name: 'Spent 50-Cal Casing', rarity: 'uncommon', type: 'charm', icon: '/economy/charm_spent_50cal.png' },
    '4132': { name: 'Sporesnail Pearl', rarity: 'uncommon', type: 'charm', icon: '/economy/charm_sporesnail_pearl.png' },
    '4133': { name: 'Trench Whistle', rarity: 'rare', type: 'charm', icon: '/economy/charm_trench_whistle.png' },
    '4134': { name: 'Glitched RAM Card', rarity: 'rare', type: 'charm', icon: '/economy/charm_glitched_ram.png' },
    '4135': { name: 'Geodetic Compass', rarity: 'rare', type: 'charm', icon: '/economy/charm_geodetic_compass.png' },
    '4136': { name: 'Mini Drone Bobble', rarity: 'epic', type: 'charm', icon: '/economy/charm_mini_drone_bobble.png' },
    '4137': { name: 'Amber Bio-Flask', rarity: 'epic', type: 'charm', icon: '/economy/charm_amber_bio_flask.png' },
    '4138': { name: 'Dark Matter Singularity', rarity: 'epic', type: 'charm', icon: '/economy/charm_dark_matter.png' },
    '4139': { name: 'Golden Sub-Bunker Key', rarity: 'legendary', type: 'charm', icon: '/economy/charm_golden_sub_bunker_key.png' },

    // Rig Overclocks
    '4140': { name: 'Cryo-Capacitor Overclock', perk: '+8% Cryo Freeze Duration', rarity: 'uncommon', type: 'mod', icon: '/economy/mod_cryo_capacitor.png' },
    '4141': { name: 'Magnetic Scavenger Coil', perk: '+20% Scrap Magnet Radius', rarity: 'uncommon', type: 'mod', icon: '/economy/mod_magnetic_scavenger.png' },
    '4142': { name: 'Bio-Hazard Filter Vent', perk: '-12% Spore & Gas Damage', rarity: 'rare', type: 'mod', icon: '/economy/mod_bio_hazard_filter.png' },
    '4143': { name: 'Kinetic Impact Bushing', perk: '+1 Piercing Penetration', rarity: 'rare', type: 'mod', icon: '/economy/mod_kinetic_impact.png' },
    '4144': { name: 'Thermal Heat Exchanger', perk: '+10% Shield Recharge Rate', rarity: 'rare', type: 'mod', icon: '/economy/mod_thermal_heat_exchanger.png' },
    '4145': { name: 'Echo-Location Transceiver', perk: 'Pings Hidden Rooms (15m)', rarity: 'epic', type: 'mod' },
    '4146': { name: 'Symbiotic Adrenaline Pump', perk: '+15% Speed Below 25% HP', rarity: 'epic', type: 'mod' },
    '4147': { name: 'Zero-Point Flux Overdrive', perk: '5 Kills Refunds Dash Charge', rarity: 'legendary', type: 'mod', icon: '/economy/mod_zero_point_flux.png' },

    // Chassis Armors & Skins
    '4112': { name: 'Sub-Terran Drill Engineer', rarity: 'uncommon', type: 'chassis' },
    '4113': { name: 'Cryo-Vanguard Scout', rarity: 'uncommon', type: 'chassis' },
    '4114': { name: 'Trench Warden Heavy', rarity: 'rare', type: 'chassis' },
    '4115': { name: 'Void Commando Recon', rarity: 'rare', type: 'chassis' },
    '4116': { name: 'Bio-Synthesizer Engineer', rarity: 'rare', type: 'chassis' },
    '4117': { name: 'Dreadnought Exo-Juggernaut', rarity: 'epic', type: 'chassis' },
    '4118': { name: 'Cyber-Spectre Infiltrator', rarity: 'epic', type: 'chassis' },
    '4119': { name: 'Hive-Lord Symbiote Exosuit', rarity: 'legendary', type: 'chassis' },

    // Decals / Patches
    '4120': { name: 'Sub-Zero Pioneer Patch', rarity: 'uncommon', type: 'decal' },
    '4121': { name: 'Radiation Trefoil', rarity: 'uncommon', type: 'decal' },
    '4122': { name: 'Sporesnail Hunter Crest', rarity: 'uncommon', type: 'decal' },
    '4123': { name: 'Bunker 404 Lost Squad Decal', rarity: 'rare', type: 'decal' },
    '4124': { name: 'Cyber-Skull Tactical Pin', rarity: 'rare', type: 'decal' },
    '4125': { name: 'Cryo-Phoenix Insignia', rarity: 'rare', type: 'decal' },
    '4126': { name: 'Queen Slayer Gold Seal', rarity: 'epic', type: 'decal', icon: '/economy/emblem_queen_slayer.png' },
    '4127': { name: 'Void Horizon Sigil', rarity: 'epic', type: 'decal' },
    '4128': { name: 'Ancient Core Glyphs', rarity: 'epic', type: 'decal' },
    '4129': { name: 'Grand Marshal Relic Crest', rarity: 'legendary', type: 'decal' },

    // Audio Packs & HUD Themes
    '4148': { name: 'Soviet Sub-Commander Radio', rarity: 'rare', type: 'audio' },
    '4149': { name: "Synthesized AI Unit 'AURA'", rarity: 'rare', type: 'audio' },
    '4150': { name: 'Amber CRT Monitor Theme', rarity: 'rare', type: 'hud' },
    '4151': { name: 'Emerald Radar Phosphor HUD', rarity: 'rare', type: 'hud' },
    '4152': { name: 'Emerald Void Tracer Rounds', rarity: 'epic', type: 'vfx' },
    '4153': { name: 'Cryo Shockwave Muzzle Flare', rarity: 'epic', type: 'vfx' },

    // Reagents & Keys
    '4154': { name: 'Relic Decryption Key', rarity: 'rare', type: 'key', icon: '/economy/cache_key.png' },
    '4155': { name: '5x Relic Key Master Pack', rarity: 'rare', type: 'key_bundle' },
    '4156': { name: 'Cryo-Alloy Ingot', rarity: 'uncommon', type: 'reagent' },
    '4157': { name: 'Deep Sub-Core Matrix', rarity: 'rare', type: 'reagent' },
    '4158': { name: 'Refined Ambergris Catalyst', rarity: 'epic', type: 'reagent' },
    '4159': { name: 'Deep Core Shard (Token)', rarity: 'uncommon', type: 'shard', icon: '/economy/relic_common.png' }
});

const ARCHETYPE_NAMES = Object.freeze({
    talon: 'Vector-9 Talon SMG',
    talon_c: 'Talon-C Carbine',
    siege_breaker: 'Siege-Breaker 50 Autocannon',
    tesla_lock: 'Tesla-Lock MK-IV Arc Driver'
});

export function createArmoryUi({
    container,
    loadoutManager,
    armoryScene,
    onEmbark,
    onBack,
    onOpenVault
}) {
    if (!container) throw new Error('Armory UI requires a container DOM element');

    let activeClass = 'scout';

    function playSound(key) {
        try {
            if (AudioManager?.play) {
                AudioManager.play(key, { bus: 'sfx', volume: 0.8 });
            }
        } catch {
            // best-effort
        }
    }

    function render() {
        const cls = activeClass.toLowerCase();
        const loadout = loadoutManager.getClassLoadout(cls);
        const archetype = loadout.archetypeId || DEFAULT_ARCHETYPES[cls];
        const modifiers = loadoutManager.getActiveModifiers(cls);
        const allowedArchetypes = CLASS_ARCHETYPES[cls] || [archetype];
        const allowedSkins = ARCHETYPE_SKINS[archetype] || [];

        container.innerHTML = `
            <div class="armory-hud">
                <header class="armory-header">
                    <div class="armory-title-box">
                        <span class="armory-tag">HUNKER BUNKER // PRE-MISSION ARMORY</span>
                        <h1 class="armory-title">SECTOR ZERO TACTICAL BENCH</h1>
                    </div>
                    <div class="armory-operator-status">
                        <span class="status-label">ACTIVE OPERATOR:</span>
                        <span class="status-value class-${cls}">${activeClass.toUpperCase()}</span>
                    </div>
                </header>

                <div class="armory-main-layout">
                    <!-- SUIT BENCH (LEFT) -->
                    <section class="armory-panel suit-bench-panel" aria-label="Suit Bench">
                        <div class="panel-header">
                            <span class="panel-icon">🛡️</span>
                            <h2>SUIT BENCH</h2>
                        </div>
                        <div class="bench-field">
                            <label>CHASSIS SPEC</label>
                            <div class="field-value">${activeClass.toUpperCase()} MK-IV PRESSURIZED</div>
                        </div>
                        <div class="bench-field">
                            <label>SHOULDER PATCH / DECAL</label>
                            <select id="armory-decal-select" class="armory-select">
                                <option value="">[DEFAULT CLASS INSIGNIA]</option>
                                ${['4120', '4121', '4124', '4126'].map((id) => `
                                    <option value="${id}" ${loadoutManager.getEquippedDecalId() === id ? 'selected' : ''}>
                                        ${CATALOG_ITEMS[id]?.name || id} (${CATALOG_ITEMS[id]?.rarity?.toUpperCase()})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="telemetry-box">
                            <div class="telemetry-title">SUIT INTEGRITY TELEMETRY</div>
                            <div class="telemetry-item"><span>Thermal Layer:</span> <strong>Active Cryo-Mesh</strong></div>
                            <div class="telemetry-item"><span>Subterranean Seal:</span> <strong>Nominal 100%</strong></div>
                            <div class="telemetry-item"><span>Exo-Turntable:</span> <strong>360° Drag Orbit Active</strong></div>
                        </div>
                    </section>

                    <!-- WEAPON BENCH (RIGHT / CENTER) -->
                    <section class="armory-panel weapon-bench-panel" aria-label="Weapon Bench">
                        <div class="panel-header">
                            <span class="panel-icon">⚡</span>
                            <h2>CLASS WEAPON BENCH</h2>
                        </div>

                        <div class="bench-grid">
                            <div class="bench-field">
                                <label>GUN ARCHETYPE</label>
                                <select id="armory-archetype-select" class="armory-select">
                                    ${allowedArchetypes.map((arch) => `
                                        <option value="${arch}" ${archetype === arch ? 'selected' : ''}>
                                            ${ARCHETYPE_NAMES[arch] || arch}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="bench-field">
                                <label>WEAPON FINISH / SKIN</label>
                                <select id="armory-skin-select" class="armory-select">
                                    <option value="">[DEFAULT FACTORY FINISH]</option>
                                    ${allowedSkins.map((id) => `
                                        <option value="${id}" ${loadout.weaponSkinId === id ? 'selected' : ''}>
                                            ${CATALOG_ITEMS[id]?.name || id} (${CATALOG_ITEMS[id]?.rarity?.toUpperCase()})
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="bench-field">
                                <label>TACTICAL CHARM (ACCESSORY RAIL)</label>
                                <select id="armory-charm-select" class="armory-select">
                                    <option value="">[NO CHARM EQUIPPED]</option>
                                    ${['4130', '4131', '4132', '4133', '4134', '4135', '4136', '4137', '4138', '4139'].map((id) => `
                                        <option value="${id}" ${loadout.charmId === id ? 'selected' : ''}>
                                            ${CATALOG_ITEMS[id]?.name || id} (${CATALOG_ITEMS[id]?.rarity?.toUpperCase()})
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="bench-field">
                                <label>RIG OVERCLOCK - SLOT A</label>
                                <select id="armory-mod1-select" class="armory-select">
                                    <option value="">[EMPTY OVERCLOCK BAY A]</option>
                                    ${['4140', '4141', '4142', '4143', '4144', '4145', '4146', '4147'].map((id) => `
                                        <option value="${id}" ${loadout.mod1Id === id ? 'selected' : ''}>
                                            ${CATALOG_ITEMS[id]?.name || id} - ${CATALOG_ITEMS[id]?.perk || ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="bench-field">
                                <label>RIG OVERCLOCK - SLOT B</label>
                                <select id="armory-mod2-select" class="armory-select">
                                    <option value="">[EMPTY OVERCLOCK BAY B]</option>
                                    ${['4140', '4141', '4142', '4143', '4144', '4145', '4146', '4147'].map((id) => `
                                        <option value="${id}" ${loadout.mod2Id === id ? 'selected' : ''}>
                                            ${CATALOG_ITEMS[id]?.name || id} - ${CATALOG_ITEMS[id]?.perk || ''}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- ACTIVE MODIFIERS TELEMETRY -->
                        <div class="modifiers-summary">
                            <div class="modifiers-title">ACTIVE COMBAT OVERCLOCKS</div>
                            <div class="modifiers-badges">
                                <span class="mod-badge ${modifiers.scrapMagnetRadiusBonus > 0 ? 'active' : ''}">
                                    🧲 Scrap Magnet: +${Math.round(modifiers.scrapMagnetRadiusBonus * 100)}%
                                </span>
                                <span class="mod-badge ${modifiers.cryoDurationMultiplier > 1.0 ? 'active' : ''}">
                                    ❄️ Cryo Freeze: +${Math.round((modifiers.cryoDurationMultiplier - 1.0) * 100)}%
                                </span>
                                <span class="mod-badge ${modifiers.kineticPierceBonus > 0 ? 'active' : ''}">
                                    🎯 Kinetic Pierce: +${modifiers.kineticPierceBonus}
                                </span>
                                <span class="mod-badge ${modifiers.gasDamageReduction > 0 ? 'active' : ''}">
                                    ☣️ Gas Resist: -${Math.round(modifiers.gasDamageReduction * 100)}%
                                </span>
                                <span class="mod-badge ${modifiers.dashRefundOnMultiKill ? 'active' : ''}">
                                    ⚡ Zero-Point Refund: ${modifiers.dashRefundOnMultiKill ? 'READY' : 'OFF'}
                                </span>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- FOOTER NAVIGATION -->
                <footer class="armory-footer">
                    <button id="armory-btn-back" class="armory-btn secondary-btn">
                        &lt; SWITCH CLASS
                    </button>
                    <button id="armory-btn-vault" class="armory-btn tertiary-btn">
                        STEAM VAULT &amp; FAB BAY
                    </button>
                    <button id="armory-btn-embark" class="armory-btn primary-btn embark-glow">
                        EMBARK TO BUNKER &gt;&gt;
                    </button>
                </footer>
            </div>
        `;

        bindEvents();
    }

    function bindEvents() {
        const cls = activeClass.toLowerCase();

        // Archetype switch
        container.querySelector('#armory-archetype-select')?.addEventListener('change', (e) => {
            loadoutManager.setArchetype(cls, e.target.value);
            playSound('sfx_overclock_socket');
            armoryScene?.updateFromLoadout(loadoutManager, cls);
            render();
        });

        // Weapon Skin switch
        container.querySelector('#armory-skin-select')?.addEventListener('change', (e) => {
            loadoutManager.equipWeaponSkin(cls, e.target.value || null);
            playSound('sfx_charm_clink_light');
            armoryScene?.updateFromLoadout(loadoutManager, cls);
            render();
        });

        // Charm switch
        container.querySelector('#armory-charm-select')?.addEventListener('change', (e) => {
            loadoutManager.equipCharm(cls, e.target.value || null);
            playSound('sfx_charm_clink_heavy');
            armoryScene?.updateFromLoadout(loadoutManager, cls);
            render();
        });

        // Mod 1 switch
        container.querySelector('#armory-mod1-select')?.addEventListener('change', (e) => {
            loadoutManager.equipRigModule(cls, 1, e.target.value || null);
            playSound('sfx_overclock_socket');
            armoryScene?.updateFromLoadout(loadoutManager, cls);
            render();
        });

        // Mod 2 switch
        container.querySelector('#armory-mod2-select')?.addEventListener('change', (e) => {
            loadoutManager.equipRigModule(cls, 2, e.target.value || null);
            playSound('sfx_overclock_socket');
            armoryScene?.updateFromLoadout(loadoutManager, cls);
            render();
        });

        // Decal switch
        container.querySelector('#armory-decal-select')?.addEventListener('change', (e) => {
            loadoutManager.equipDecal(e.target.value || null);
            playSound('sfx_charm_clink_light');
            render();
        });

        // Navigation
        container.querySelector('#armory-btn-back')?.addEventListener('click', () => {
            playSound('ui_click_confirm1');
            onBack?.();
        });

        container.querySelector('#armory-btn-vault')?.addEventListener('click', () => {
            playSound('ui_click_confirm1');
            onOpenVault?.();
        });

        container.querySelector('#armory-btn-embark')?.addEventListener('click', () => {
            playSound('ui_upgrade_weapon1');
            onEmbark?.();
        });

        // Steam Deck / Keyboard controller shortcuts for Armory screen
        container.dataset = container.dataset || {};
        if (typeof window !== 'undefined' && !container.dataset.kbBound) {
            container.dataset.kbBound = 'true';
            window.addEventListener('keydown', (event) => {
                const screen = document?.getElementById?.('armory-screen');
                if (!screen || screen.classList?.contains?.('hidden') || screen.style?.display === 'none') return;

                const classes = ['scout', 'tank', 'engineer'];
                const currentIdx = classes.indexOf(activeClass.toLowerCase());

                if (event.code === 'KeyQ') {
                    event.preventDefault();
                    const prevIdx = (currentIdx - 1 + classes.length) % classes.length;
                    setClass(classes[prevIdx]);
                    playSound('ui_click_confirm1');
                    return;
                }
                if (event.code === 'KeyE') {
                    event.preventDefault();
                    const nextIdx = (currentIdx + 1) % classes.length;
                    setClass(classes[nextIdx]);
                    playSound('ui_click_confirm1');
                    return;
                }
            });
        }
    }

    function setClass(classType) {
        activeClass = classType || 'scout';
        loadoutManager.setActiveClass(activeClass);
        armoryScene?.setClass(activeClass);
        armoryScene?.updateFromLoadout(loadoutManager, activeClass);
        render();
    }

    return {
        setClass,
        refresh() {
            render();
        }
    };
}
