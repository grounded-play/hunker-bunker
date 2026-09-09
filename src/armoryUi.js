import { AudioManager } from './audio.js';
import { assetUrl } from './assetUrl.js';
import { buildEquipOptions } from './armoryOptions.js';
import { buildPickerTiles, resolveItemIcon } from './armoryPicker.js';
import { WEAPON_ARCHETYPES, WEAPON_SKIN_MESHES, CHASSIS_SKIN_MODELS } from './player3dOverlay.js';
import { CHARM_GLB_MAP, MOD_GLB_MAP } from './armoryScene.js';
import {
    WEAPON_SHEENS,
    getSelectedSheen,
    getUnlockedSheenIds,
    selectSheen,
    unlockAllSheens
} from './weaponSheens.js';
import { ITEM_TYPE, getCatalogIdsByType, getCatalogEntry } from './itemOwnership.js';
import { unlockAllPolishes } from './operatorPolishes.js';
import {
    ARCHETYPE_SKINS,
    CLASS_ARCHETYPES,
    CLASS_CHASSIS_SKINS,
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
    onOpenVault,
    onOpenSettings,
    onClassChange,
    ownership
}) {
    if (!container) throw new Error('Armory UI requires a container DOM element');
    if (!ownership) throw new Error('Armory UI requires an ownership store');

    const ALLOWED_CLASSES = new Set(['scout', 'tank', 'engineer']);
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

    // docs/armory-vault-progression-audit-2026-08-23.md A1: every candidate is
    // rendered, but an unearned one comes back `disabled` from
    // buildEquipOptions() and is labelled so the reason is visible rather than
    // the item simply being missing from the list.
    // docs/planning/armory-ui-overhaul-2026-09-09.md Phase 1/2: every bench
    // control is a slot button that opens the shared tile modal, exactly the
    // way the operator sheen picker works. Frames and fielded weapons are one
    // control: a weapon IS a frame plus a mesh, and making the player set them
    // separately was the source of the "finish" confusion.
    //
    // Weapon values are namespaced: `frame:<archetypeId>` is the factory frame
    // for that archetype, a bare itemdef id is a skin-weapon (which implies its
    // frame via ARCHETYPE_SKINS).
    const FRAME_PREFIX = 'frame:';

    // Which model an item renders, so its tile can show the matching economy
    // art without a second hand-maintained icon list.
    function modelUrlForItem(id) {
        const key = String(id);
        // Factory frames are namespaced `frame:<archetypeId>` and resolve
        // against the archetype map rather than the itemdef catalog.
        if (key.startsWith(FRAME_PREFIX)) {
            return WEAPON_ARCHETYPES[key.slice(FRAME_PREFIX.length)] ?? null;
        }
        return WEAPON_SKIN_MESHES[key]
            ?? CHARM_GLB_MAP[key]
            ?? MOD_GLB_MAP[key]
            ?? CHASSIS_SKIN_MODELS[key]
            ?? null;
    }

    // Community chassis skins live under /3d/runtime/community/ and ship no
    // economy PNG of their own, so they borrow their class's chassis art the
    // same way steamVaultUi's catalog entry does.
    const COMMUNITY_CLASS_ICON = Object.freeze({
        scout: '/economy/chassis_cryo_vanguard_scout.png',
        tank: '/economy/chassis_trench_warden_heavy.png',
        engineer: '/economy/chassis_subterran_drill_engineer.png'
    });

    // The slot buttons used to read names straight out of this file's local
    // CATALOG_ITEMS, which covers skins/charms/mods/chassis but no decals -- so
    // a fitted decal rendered as a bare itemdef id ("2003"). The shared
    // itemOwnership catalog knows them all, so it is the fallback.
    function nameForItem(id, fallback) {
        if (!id) return fallback;
        return CATALOG_ITEMS[id]?.name
            ?? getCatalogEntry(id)?.name
            ?? String(id);
    }

    function iconForItem(id) {
        const key = String(id);
        if (key.startsWith('comm_')) {
            const cls = key.split('_')[1];
            return COMMUNITY_CLASS_ICON[cls] ?? null;
        }
        const entry = getCatalogEntry(id);
        return resolveItemIcon(key, {
            // itemOwnership's catalog carries icon paths for the families this
            // file's local map never listed (decals in particular).
            explicitIcon: CATALOG_ITEMS[id]?.icon ?? entry?.localImg ?? entry?.icon ?? null,
            modelUrlFor: modelUrlForItem
        });
    }

    // Art that 404s must degrade to the initials fallback, not to the browser's
    // broken-image glyph. Attached after render rather than as an inline
    // onerror so no inline handler is needed.
    function wireTileArtFallbacks() {
        const images = container.querySelectorAll?.('.armory-tile__art img') ?? [];
        for (const img of images) {
            img.addEventListener?.('error', () => {
                img.style?.setProperty?.('display', 'none');
                const fallback = img.parentElement?.querySelector?.('.armory-tile__art-fallback');
                fallback?.style?.setProperty?.('display', 'grid');
            }, { once: true });
        }
    }

    function archetypeForSkin(skinId) {
        const wanted = String(skinId);
        for (const [arch, ids] of Object.entries(ARCHETYPE_SKINS)) {
            if (ids.map(String).includes(wanted)) return arch;
        }
        return null;
    }

    function weaponFieldOptions(cls, loadout, allowedArchetypes) {
        const options = [];
        for (const arch of allowedArchetypes) {
            options.push({
                id: `${FRAME_PREFIX}${arch}`,
                name: `${ARCHETYPE_NAMES[arch] || arch.replace(/_/g, ' ').toUpperCase()} — FACTORY ISSUE`,
                owned: true,
                disabled: false,
                selected: loadout.archetypeId === arch && !loadout.weaponSkinId
            });
            const skinIds = (ARCHETYPE_SKINS[arch] || []);
            for (const opt of buildEquipOptions({ ids: skinIds, selectedId: loadout.weaponSkinId, ownership })) {
                options.push(opt);
            }
        }
        return options;
    }

    // One descriptor per bench control: what the modal lists, what is currently
    // in the slot, and what equipping does. Everything else about the modal is
    // shared.
    function pickerFields() {
        const cls = activeClass.toLowerCase();
        const loadout = loadoutManager.getClassLoadout(cls);
        const allowedArchetypes = CLASS_ARCHETYPES[cls] || [DEFAULT_ARCHETYPES[cls]];
        const decalId = loadoutManager.getEquippedDecalId?.() ?? loadoutManager.state?.suit?.decalId;
        return {
            weapon: {
                title: 'PRIMARY WEAPON',
                subtitle: 'FRAME + FIELDED MODEL // LOCKED WEAPONS REQUIRE FIELD MILESTONES',
                options: () => weaponFieldOptions(cls, loadout, allowedArchetypes),
                current: () => (loadout.weaponSkinId
                    ? String(loadout.weaponSkinId)
                    : `${FRAME_PREFIX}${loadout.archetypeId}`),
                currentName: () => (loadout.weaponSkinId
                    ? nameForItem(loadout.weaponSkinId, '')
                    : `${ARCHETYPE_NAMES[loadout.archetypeId] || String(loadout.archetypeId).toUpperCase()} — FACTORY ISSUE`),
                apply: (value) => {
                    if (value.startsWith(FRAME_PREFIX)) {
                        loadoutManager.setArchetype(cls, value.slice(FRAME_PREFIX.length));
                        loadoutManager.equipWeaponSkin(cls, null);
                        return true;
                    }
                    const arch = archetypeForSkin(value);
                    if (arch) loadoutManager.setArchetype(cls, arch);
                    return equipGuard(value, (v) => loadoutManager.equipWeaponSkin(cls, v));
                },
                sound: 'sfx_charm_clink_light',
                after: () => armoryScene?.updateFromLoadout(loadoutManager, cls)
            },
            sheen: {
                title: 'WEAPON SHEEN',
                subtitle: 'TINT MATRIX // LOCKED SHEENS REQUIRE FIELD MILESTONES',
                // Sheens are not catalog items: they carry their own unlock
                // store, so the options are built here rather than through
                // buildEquipOptions.
                options: () => {
                    const unlocked = getUnlockedSheenIds();
                    const current = getSelectedSheen().id;
                    return WEAPON_SHEENS.map((sheen) => ({
                        id: `sheen:${sheen.id}`,
                        name: sheen.name,
                        owned: unlocked.has(sheen.id),
                        disabled: !unlocked.has(sheen.id),
                        selected: sheen.id === current,
                        swatch: sheen.color
                    }));
                },
                current: () => `sheen:${getSelectedSheen().id}`,
                currentName: () => getSelectedSheen().name,
                apply: (value) => {
                    const id = Number(String(value).replace('sheen:', ''));
                    const next = selectSheen(id);
                    if (!next) {
                        playSound('sfx_ui_denied');
                        return false;
                    }
                    armoryScene?.setWeaponSheen?.(next.color);
                    return true;
                },
                sound: 'sfx_charm_clink_light',
                after: () => {}
            },
            charm: {
                title: 'TACTICAL CHARM',
                subtitle: 'WEAPON-MOUNTED TROPHY // SWINGS ON ITS SOCKET',
                noneLabel: 'NO CHARM',
                ids: () => getCatalogIdsByType(ITEM_TYPE.CHARM),
                current: () => (loadout.charmId ? String(loadout.charmId) : ''),
                currentName: () => nameForItem(loadout.charmId, 'NO CHARM'),
                apply: (value) => equipGuard(value, (v) => loadoutManager.equipCharm(cls, v)),
                sound: 'sfx_charm_clink_heavy',
                after: () => armoryScene?.updateFromLoadout(loadoutManager, cls)
            },
            mod1: {
                title: 'OVERCLOCK — BAY A',
                subtitle: 'RIG MODULE // ALTERS FIELD BEHAVIOUR',
                noneLabel: 'EMPTY BAY A',
                ids: () => getCatalogIdsByType(ITEM_TYPE.MOD),
                current: () => (loadout.mod1Id ? String(loadout.mod1Id) : ''),
                currentName: () => nameForItem(loadout.mod1Id, 'EMPTY BAY A'),
                apply: (value) => equipGuard(value, (v) => loadoutManager.equipRigModule(cls, 1, v)),
                sound: 'sfx_overclock_socket',
                after: () => armoryScene?.updateFromLoadout(loadoutManager, cls)
            },
            mod2: {
                title: 'OVERCLOCK — BAY B',
                subtitle: 'RIG MODULE // ALTERS FIELD BEHAVIOUR',
                noneLabel: 'EMPTY BAY B',
                ids: () => getCatalogIdsByType(ITEM_TYPE.MOD),
                current: () => (loadout.mod2Id ? String(loadout.mod2Id) : ''),
                currentName: () => nameForItem(loadout.mod2Id, 'EMPTY BAY B'),
                apply: (value) => equipGuard(value, (v) => loadoutManager.equipRigModule(cls, 2, v)),
                sound: 'sfx_overclock_socket',
                after: () => armoryScene?.updateFromLoadout(loadoutManager, cls)
            },
            chassis: {
                title: 'EXOSUIT CHASSIS SKIN',
                subtitle: 'OPERATOR SHELL // WORN ON DEPLOYMENT',
                noneLabel: 'STANDARD CHASSIS',
                ids: () => CLASS_CHASSIS_SKINS[cls] || [],
                current: () => (loadoutManager.getEquippedChassisSkinId() ? String(loadoutManager.getEquippedChassisSkinId()) : ''),
                currentName: () => nameForItem(loadoutManager.getEquippedChassisSkinId(), 'STANDARD CHASSIS'),
                apply: (value) => equipGuard(value || null, (v) => loadoutManager.equipChassisSkin(v)),
                sound: 'sfx_overclock_socket',
                after: (value) => armoryScene?.setChassisSkin?.(value || null, cls)
            },
            decal: {
                title: 'SHOULDER PATCH & INSIGNIA',
                subtitle: 'UNIT MARKING // SHOULDER PLATE',
                noneLabel: 'DEFAULT INSIGNIA',
                ids: () => getCatalogIdsByType(ITEM_TYPE.DECAL),
                current: () => (decalId ? String(decalId) : ''),
                currentName: () => nameForItem(decalId, 'DEFAULT INSIGNIA'),
                apply: (value) => equipGuard(value, (v) => loadoutManager.equipDecal(v)),
                sound: 'sfx_charm_clink_light',
                after: (value) => armoryScene?.setDecal(value || null)
            }
        };
    }

    // The closed slot: current selection's art and name, plus a CHANGE hint.
    function slotHtml(fieldKey) {
        const field = pickerFields()[fieldKey];
        if (!field) return '';
        const currentId = field.current();
        const icon = iconForItem(currentId);
        return `<button type="button" class="armory-slot" id="armory-slot-${fieldKey}" data-field="${fieldKey}">
            <span class="armory-slot__art">${icon
                ? `<img src="${assetUrl(icon)}" alt="" loading="lazy">`
                : '<span class="armory-slot__art-empty"></span>'}</span>
            <span class="armory-slot__body">
                <span class="armory-slot__name">${field.currentName()}</span>
                <span class="armory-slot__hint">CHANGE</span>
            </span>
        </button>`;
    }

    // docs/planning/armory-ui-overhaul-2026-09-09.md Phase 1: tile menus in
    // place of <select>. A dropdown cannot show what an item looks like and
    // names every locked entry outright, which gives away the unlock. Tiles
    // show the art and withhold the name -- locked ones are blurred, marked `?`
    // and carry a deterministic scramble of the real name so the grid keeps its
    // shape. Ownership still comes from buildEquipOptions/equipGuard.
    // Column count is derived from how many tiles there are so the grid always
    // fits the modal without scrolling: few items get big boxes, a long list
    // (community chassis skins run past thirty) shrinks to fit instead of
    // spilling into a scrollbar.
    function pickerColumns(count) {
        if (count <= 4) return Math.max(2, count);
        return Math.min(9, Math.max(4, Math.ceil(Math.sqrt(count * 1.7))));
    }

    function pickerHtml(pickerId, options, { noneLabel = null, selectedId = null } = {}) {
        const tiles = buildPickerTiles(options, { iconFor: iconForItem });
        const swatchById = new Map((options ?? []).map((o) => [String(o.id), o.swatch ?? null]));
        const columns = pickerColumns(tiles.length + (noneLabel ? 1 : 0));
        const noneTile = noneLabel
            ? `<button type="button" class="armory-tile armory-tile--none${!selectedId ? ' is-selected' : ''}"
                    data-value="" aria-label="${noneLabel}">
                    <span class="armory-tile__art armory-tile__art--empty"></span>
                    <span class="armory-tile__name">${noneLabel}</span>
               </button>`
            : '';
        const body = tiles.map((tile) => {
            const rarity = CATALOG_ITEMS[tile.id]?.rarity ?? 'common';
            const swatch = swatchById.get(tile.id);
            const initials = tile.locked ? '' : (tile.realName.match(/[A-Z0-9]/g)?.slice(0, 3).join('') || '');
            const art = swatch
                ? `<span class="armory-tile__swatch" style="--tile-swatch:${swatch}"></span>`
                : (tile.icon
                    ? `<img src="${assetUrl(tile.icon)}" alt="" loading="lazy">`
                        + `<span class="armory-tile__art-fallback" style="display:none">${initials}</span>`
                    : `<span class="armory-tile__art-fallback">${initials}</span>`);
            return `<button type="button"
                    class="armory-tile${tile.locked ? ' is-locked' : ''}${tile.selected ? ' is-selected' : ''}"
                    data-value="${tile.id}"
                    data-rarity="${rarity}"
                    ${tile.locked ? 'aria-disabled="true"' : ''}
                    aria-label="${tile.ariaLabel}"
                    title="${tile.locked ? 'Locked' : tile.realName}">
                    <span class="armory-tile__art">${art}${tile.locked ? '<span class="armory-tile__glyph">?</span>' : ''}</span>
                    <span class="armory-tile__name">${tile.name}</span>
                    ${tile.devUnlocked ? '<span class="armory-tile__badge">DEV UNLOCK</span>' : ''}
                </button>`;
        }).join('');
        return `<div class="armory-picker" id="${pickerId}" role="listbox" style="--picker-cols:${columns}">${noneTile}${body}</div>`;
    }

    // Which slot's modal is open, so a re-render can restore it. render()
    // rewrites the whole container, so the modal has to be reopened rather
    // than merely left in the DOM.
    let openField = null;

    function closePickerModal() {
        openField = null;
        const modal = container.querySelector?.('#armory-picker-modal');
        modal?.classList?.add?.('hidden');
        modal?.setAttribute?.('aria-hidden', 'true');
    }

    function openPickerModal(fieldKey) {
        const field = pickerFields()[fieldKey];
        if (!field) return;
        openField = fieldKey;
        const modal = container.querySelector?.('#armory-picker-modal');
        if (!modal) return;
        const selectedId = field.current();
        const options = field.options
            ? field.options()
            : buildEquipOptions({ ids: field.ids(), selectedId, ownership });
        const titleEl = container.querySelector?.('#armory-picker-title');
        const subEl = container.querySelector?.('#armory-picker-subtitle');
        const gridWrap = container.querySelector?.('#armory-picker-body');
        const readName = container.querySelector?.('#armory-picker-readout-name');
        const readState = container.querySelector?.('#armory-picker-readout-state');
        if (titleEl) titleEl.textContent = `◆ ${field.title}`;
        if (subEl) subEl.textContent = field.subtitle ?? '';
        if (gridWrap) {
            gridWrap.innerHTML = pickerHtml('armory-picker-grid', options, {
                noneLabel: field.noneLabel ?? null,
                selectedId
            });
        }
        if (readName) readName.textContent = field.currentName();
        if (readState) readState.textContent = 'EQUIPPED';
        modal.classList?.remove?.('hidden');
        modal.setAttribute?.('aria-hidden', 'false');
        wireTileArtFallbacks();
        bindPickerGrid();
    }

    // Defence in depth behind the `disabled` attribute: a change event can
    // still arrive with a locked id (DOM edited, option re-enabled, stale
    // value), and equipping is the one thing ownership actually gates.
    function equipGuard(rawValue, apply) {
        const value = rawValue || null;
        if (value !== null && !ownership.canEquip(value)) {
            playSound('sfx_ui_denied');
            render();
            return false;
        }
        apply(value);
        return true;
    }

    function render() {
        // Equipment changes rebuild the Armory markup. Preserve controller
        // focus across that rebuild or the first dropdown adjustment throws
        // focus back to the start of the screen and makes subsequent inputs
        // appear dead on Steam Deck.
        const focusedControlId = typeof document !== 'undefined' && container.contains?.(document.activeElement)
            ? document.activeElement?.id
            : null;
        const cls = activeClass.toLowerCase();
        const loadout = loadoutManager.getClassLoadout(cls);
        const archetype = loadout.archetypeId || DEFAULT_ARCHETYPES[cls];
        const modifiers = loadoutManager.getActiveModifiers(cls);
        const chassisSkinId = loadoutManager.getEquippedChassisSkinId?.();
        const selectedFinish = loadout.weaponSkinId ? (CATALOG_ITEMS[loadout.weaponSkinId]?.name || loadout.weaponSkinId) : 'FACTORY ISSUE';

        const hasActiveOverclocks = Boolean(
            (modifiers.scrapMagnetRadiusBonus > 0) ||
            (modifiers.cryoDurationMultiplier > 1.0) ||
            (modifiers.kineticPierceBonus > 0) ||
            (modifiers.gasDamageReduction > 0) ||
            modifiers.dashRefundOnMultiKill
        );

        if (typeof document !== 'undefined') {
            const screen = document.getElementById('armory-screen');
            if (screen) {
                screen.dataset.class = cls;
                const bgUrl = assetUrl(`/ui/armory_bg_${cls}.jpg`);
                screen.style.backgroundImage = `radial-gradient(circle at 50% 50%, rgba(6, 11, 19, 0.15) 0%, rgba(6, 11, 19, 0.55) 75%, rgba(6, 11, 19, 0.88) 100%), url('${bgUrl}')`;
                screen.style.backgroundSize = 'cover';
                screen.style.backgroundPosition = 'center';
                screen.style.backgroundRepeat = 'no-repeat';
            }
        }

        container.innerHTML = `
            <div class="armory-hud" data-class="${cls}">
                <div class="terminal-scanline"></div>
                <header class="armory-header">
                    <div class="armory-title-box">
                        <span class="armory-tag">◈ SUB-TERRAN PRE-MISSION ARMORY // SECTOR ZERO</span>
                        <h1 class="armory-title">SECTOR ZERO TACTICAL BENCH <span class="armory-title-accent">// LOADOUT</span></h1>
                    </div>
                    <div class="armory-operator-status">
                        <div class="armory-class-tabs" role="tablist">
                            <button type="button" class="class-tab ${cls === 'scout' ? 'active' : ''}" data-class="scout">◈ SCOUT</button>
                            <button type="button" class="class-tab ${cls === 'tank' ? 'active' : ''}" data-class="tank">▰ TANK</button>
                            <button type="button" class="class-tab ${cls === 'engineer' ? 'active' : ''}" data-class="engineer">◆ ENGINEER</button>
                        </div>
                        <button type="button" class="armory-debug-skins-btn ${ownership.isUnlockAll() ? 'active' : ''}" id="armory-debug-unlock-skins-btn" title="Toggle debug unlock for all weapon/chassis skins, charms, and polishes">
                            ${ownership.isUnlockAll() ? '✓ ALL SKINS UNLOCKED' : '[DEBUG] UNLOCK ALL SKINS'}
                        </button>
                        <span class="status-cycle-hint">[Q / E CYCLE]</span>
                        <button type="button" class="calibrate-btn open-settings-btn armory-settings-btn" id="armory-settings-btn" title="Open Settings" aria-label="Open Settings">⚙</button>
                    </div>
                </header>

                <div class="armory-main-layout">
                    <!-- 3D MODEL PREVIEW & LIVE READOUT (LEFT / CENTER) -->
                    <div class="armory-stage-column">
                        <aside class="armory-stage-readout" aria-label="Live Armory Preview">
                            <div class="armory-stage-readout__info">
                                <div class="armory-stage-readout__eyebrow">◈ LIVE STAGE PREVIEW</div>
                                <div class="armory-stage-readout__title">${activeClass.toUpperCase()} // ${ARCHETYPE_NAMES[archetype] || archetype}</div>
                                <div class="armory-stage-readout__details">
                                    <span class="armory-stage-readout__chip"><b>WEAPON:</b> ${selectedFinish}</span>
                                    <span class="armory-stage-readout__chip"><b>CHASSIS:</b> ${chassisSkinId ? (CATALOG_ITEMS[chassisSkinId]?.name || chassisSkinId) : 'STANDARD'}</span>
                                </div>
                            </div>
                            <button type="button" class="armory-stage-readout__polish" id="armory-polish-btn">
                                <span class="armory-stage-readout__polish-swatch" aria-hidden="true"></span>
                                <span><small>OPERATOR SHEEN</small><b>OPEN SUIT TINT MATRIX</b></span>
                            </button>
                            <div class="armory-stage-readout__hint">DRAG 3D STAGE TO INSPECT OPERATOR &amp; WEAPON</div>
                        </aside>
                    </div>

                    <!-- CUSTOMIZATION SIDEBAR (RIGHT COLUMN) -->
                    <div class="armory-controls-sidebar">
                        <!-- WEAPON BENCH (UPPER RIGHT) -->
                        <section class="armory-panel weapon-bench-panel" aria-label="Weapon Bench">
                            <div class="panel-header">
                                <span class="panel-icon" aria-hidden="true">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="9"/>
                                        <line x1="12" y1="3" x2="12" y2="7"/>
                                        <line x1="12" y1="17" x2="12" y2="21"/>
                                        <line x1="3" y1="12" x2="7" y2="12"/>
                                        <line x1="17" y1="12" x2="21" y2="12"/>
                                    </svg>
                                </span>
                                <h2>BALLISTIC BENCH &amp; OVERCLOCKS</h2>
                            </div>

                            <!-- PRIMARY WEAPON: frame + fielded model in one slot -->
                            <div class="bench-field">
                                <label>PRIMARY WEAPON</label>
                                ${slotHtml('weapon')}
                            </div>

                            <!-- WEAPON SHEEN: a real tint now, not a mesh swap -->
                            <div class="bench-field">
                                <label>WEAPON SHEEN</label>
                                ${slotHtml('sheen')}
                            </div>

                            <!-- CHARM -->
                            <div class="bench-field">
                                <label>TACTICAL CHARM</label>
                                ${slotHtml('charm')}
                            </div>

                            <div class="bench-row-two-col">
                                <!-- RIG MOD 1 -->
                                <div class="bench-field">
                                    <label>OVERCLOCK — BAY A</label>
                                    ${slotHtml('mod1')}
                                </div>

                                <!-- RIG MOD 2 -->
                                <div class="bench-field">
                                    <label>OVERCLOCK — BAY B</label>
                                    ${slotHtml('mod2')}
                                </div>
                            </div>

                            <!-- ACTIVE MODIFIERS TELEMETRY -->
                            <div class="modifiers-summary">
                                <div class="modifiers-title">◈ ACTIVE COMBAT OVERCLOCKS</div>
                                ${hasActiveOverclocks ? `
                                    <div class="modifiers-badges">
                                        ${modifiers.scrapMagnetRadiusBonus > 0 ? `
                                            <span class="mod-badge active">
                                                <span class="mod-tag">[MAG]</span> Magnet: +${Math.round(modifiers.scrapMagnetRadiusBonus * 100)}%
                                            </span>
                                        ` : ''}
                                        ${modifiers.cryoDurationMultiplier > 1.0 ? `
                                            <span class="mod-badge active">
                                                <span class="mod-tag">[CRYO]</span> Cryo: +${Math.round((modifiers.cryoDurationMultiplier - 1.0) * 100)}%
                                            </span>
                                        ` : ''}
                                        ${modifiers.kineticPierceBonus > 0 ? `
                                            <span class="mod-badge active">
                                                <span class="mod-tag">[PRC]</span> Pierce: +${modifiers.kineticPierceBonus}
                                            </span>
                                        ` : ''}
                                        ${modifiers.gasDamageReduction > 0 ? `
                                            <span class="mod-badge active">
                                                <span class="mod-tag">[BIO]</span> Gas Resist: -${Math.round(modifiers.gasDamageReduction * 100)}%
                                            </span>
                                        ` : ''}
                                        ${modifiers.dashRefundOnMultiKill ? `
                                            <span class="mod-badge active">
                                                <span class="mod-tag">[DASH]</span> Multi-Kill Dash Refund: ACTIVE
                                            </span>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <div class="modifiers-standby">
                                        <span class="standby-status-pill">STANDBY</span>
                                        <span class="standby-desc">NO OVERCLOCKS LINKED // BAYS A &amp; B READY</span>
                                    </div>
                                `}
                            </div>
                        </section>

                        <!-- SUIT BENCH (LOWER RIGHT) -->
                        <section class="armory-panel suit-bench-panel" aria-label="Suit Bench">
                            <div class="panel-header">
                                <span class="panel-icon" aria-hidden="true">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    </svg>
                                </span>
                                <h2>OPERATOR EXOSUIT RIG</h2>
                            </div>
                            <div class="bench-field">
                                <label>CHASSIS SPECIFICATION</label>
                                <div class="field-value">${activeClass.toUpperCase()} MK-IV SUB-ZERO PRESSURIZED</div>
                            </div>
                            <div class="bench-stack">
                                <div class="bench-field">
                                    <label>EXOSUIT CHASSIS SKIN</label>
                                    ${slotHtml('chassis')}
                                </div>
                                <div class="bench-field">
                                    <label>SHOULDER PATCH &amp; INSIGNIA</label>
                                    ${slotHtml('decal')}
                                </div>
                            </div>
                            <div class="telemetry-box">
                                <div class="telemetry-title">SUIT TELEMETRY STATUS</div>
                                <div class="telemetry-item"><span>Thermal Cryo-Mesh:</span> <strong>NOMINAL 100%</strong></div>
                                <div class="telemetry-item"><span>Radiation Seal:</span> <strong>ACTIVE</strong></div>
                                <div class="telemetry-item"><span>Turntable Staging:</span> <strong>360° DRAG ORBIT</strong></div>
                            </div>
                        </section>
                    </div>
                </div>

                <!-- FOOTER NAVIGATION -->
                <footer class="armory-footer">
                    <button id="armory-btn-back" class="armory-btn secondary-btn" title="Return to Main Menu Briefing Console">
                        ← RETURN TO MAIN MENU <span class="btn-keyhint">[ESC]</span>
                    </button>
                    <button id="armory-btn-vault" class="armory-btn tertiary-btn">
                        STEAM VAULT &amp; FAB BAY <span class="btn-keyhint">[V]</span>
                    </button>
                    <button id="armory-btn-embark" class="armory-btn primary-btn embark-glow">
                        EMBARK TO BUNKER &gt;&gt; <span class="btn-keyhint">[ENTER / A]</span>
                    </button>
                </footer>

                <!-- Shared tile picker, mirroring the operator sheen modal. -->
                <div id="armory-picker-modal" class="modal hidden armory-picker-modal" aria-hidden="true">
                    <div class="modal-content armory-picker-modal-content">
                        <div class="terminal-scanline"></div>
                        <button class="close-modal" id="armory-picker-close" aria-label="Close">×</button>
                        <div class="armory-picker-title" id="armory-picker-title">◆ SELECT</div>
                        <div class="armory-picker-subtitle" id="armory-picker-subtitle"></div>
                        <div id="armory-picker-body"></div>
                        <div class="armory-picker-readout">
                            <span id="armory-picker-readout-name"></span>
                            <span id="armory-picker-readout-state"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        bindEvents();
        // A re-render rebuilds the container, so a modal that was open has to
        // be reopened rather than merely surviving in the DOM.
        if (openField) openPickerModal(openField);
        if (focusedControlId) {
            container.querySelector?.(`#${focusedControlId}`)?.focus?.({ preventScroll: true });
        }
    }

    // One delegated click handler on the modal grid. Tiles carry their id in
    // `data-value`; the empty-string tile is the "none equipped" entry. Locked
    // tiles are refused here AND by equipGuard, so a hand-edited DOM still
    // cannot equip something unearned.
    function bindPickerGrid() {
        container.querySelector?.('#armory-picker-grid')?.addEventListener?.('click', (event) => {
            const tile = event.target.closest?.('.armory-tile');
            if (!tile) return;
            if (tile.classList.contains('is-locked')) {
                playSound('sfx_ui_denied');
                return;
            }
            const field = pickerFields()[openField];
            if (!field) return;
            const value = tile.dataset.value ?? '';
            if (!field.apply(value)) return;
            playSound(field.sound);
            field.after?.(value);
            closePickerModal();
            render();
        });
    }

    function bindEvents() {
        // Every bench control opens the shared tile modal.
        for (const fieldKey of ['weapon', 'sheen', 'charm', 'mod1', 'mod2', 'chassis', 'decal']) {
            container.querySelector?.(`#armory-slot-${fieldKey}`)?.addEventListener?.('click', () => {
                playSound('ui_click');
                openPickerModal(fieldKey);
            });
        }
        container.querySelector?.('#armory-picker-close')?.addEventListener?.('click', () => {
            playSound('ui_click');
            closePickerModal();
        });
        container.querySelector?.('#armory-picker-modal')?.addEventListener?.('click', (event) => {
            if (event.target?.id === 'armory-picker-modal') closePickerModal();
        });

        // Class tabs
        container.querySelectorAll?.('.class-tab')?.forEach?.((btn) => {
            btn.addEventListener?.('click', () => {
                const targetCls = btn.dataset?.class || btn.getAttribute?.('data-class');
                if (targetCls) {
                    setClass(targetCls);
                    playSound('ui_click_confirm1');
                }
            });
        });

        // Navigation
        container.querySelector?.('#armory-btn-back')?.addEventListener?.('click', () => {
            playSound('ui_click_confirm1');
            onBack?.();
        });

        container.querySelector?.('#armory-btn-vault')?.addEventListener?.('click', () => {
            playSound('ui_click_confirm1');
            onOpenVault?.();
        });

        container.querySelector?.('#armory-btn-embark')?.addEventListener?.('click', () => {
            playSound('ui_upgrade_weapon1');
            onEmbark?.();
        });

        container.querySelector?.('#armory-settings-btn')?.addEventListener?.('click', () => {
            playSound('ui_click_confirm1');
            if (onOpenSettings) {
                onOpenSettings();
            } else {
                document.querySelector('#menu .open-settings-btn')?.click?.();
            }
        });

        container.querySelector?.('#armory-polish-btn')?.addEventListener?.('click', () => {
            playSound('ui_click_confirm1');
            document.getElementById('hero-polish-btn')?.click?.();
        });

        container.querySelector?.('#armory-debug-unlock-skins-btn')?.addEventListener?.('click', () => {
            const next = !ownership.isUnlockAll();
            ownership.setUnlockAll(next);
            if (next) {
                unlockAllPolishes();
            unlockAllSheens();
            }
            playSound('ui_click_confirm1');
            render();
        });

        // Steam Deck / Keyboard controller shortcuts for Armory screen
        if (typeof window !== 'undefined' && container.dataset && !container.dataset.kbBound) {
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
        const normalizedClass = typeof classType === 'string' ? classType.toLowerCase() : '';
        activeClass = ALLOWED_CLASSES.has(normalizedClass) ? normalizedClass : 'scout';
        loadoutManager.setActiveClass(activeClass);
        const chassisSkinId = loadoutManager.getEquippedChassisSkinId?.();
        const compatibleChassisSkin = (CLASS_CHASSIS_SKINS[activeClass] || []).includes(chassisSkinId)
            ? chassisSkinId
            : null;
        armoryScene?.setClass(activeClass, compatibleChassisSkin);
        armoryScene?.updateFromLoadout(loadoutManager, activeClass);
        render();
        if (typeof onClassChange === 'function') {
            onClassChange(activeClass.toUpperCase());
        }
    }

    // Requirement A4: an item granted while the Armory is on screen (a cache
    // opened in the Vault tab, a tier claimed) has to appear immediately.
    const unsubscribeOwnership = ownership.subscribe(() => render());

    return {
        setClass,
        getActiveClass() {
            return activeClass;
        },
        refresh() {
            render();
        },
        destroy() {
            unsubscribeOwnership();
        }
    };
}
