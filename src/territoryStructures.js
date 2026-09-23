// Recognizable site identities over the seeded territory route. Each beat is
// one real chamber; all four optional sockets let the macro planner bend the
// six-room sequence without cutting through the authored fixtures.
export const TERRITORY_SITE_PROFILES = Object.freeze({
    camp_meridian: { label: 'Meridian', family: 'camp', signature: 'prop_camp_meridian_radio', service: 'prop_camp_meridian_repair_rig' },
    camp_tallow: { label: 'Tallow', family: 'camp', signature: 'prop_camp_tallow_still', service: 'prop_camp_tallow_spore_trays' },
    camp_vesper: { label: 'Vesper', family: 'camp', signature: 'prop_camp_vesper_turret', service: 'prop_camp_vesper_ammo_press' },
    hive_suture: { label: 'Suture', family: 'hive', signature: 'prop_hive_suture_organ', service: 'prop_hive_wound_cauterizer' },
    hive_relay: { label: 'Relay', family: 'hive', signature: 'prop_hive_relay_antenna', service: 'prop_hive_synaptic_web' },
    hive_carapace: { label: 'Carapace', family: 'hive', signature: 'prop_hive_chitin_hatchery', service: 'prop_hive_carapace_molt' }
});

const BEATS = Object.freeze({
    camp: {
        approach: { label: 'Signal approach', width: 15, height: 21, safe: false, enemies: 2 },
        perimeter: { label: 'Defensive perimeter', width: 23, height: 15, safe: false, enemies: 3 },
        central: { label: 'Common ground', width: 29, height: 27, safe: true, enemies: 0 },
        service: { label: 'Workshop', width: 23, height: 19, safe: true, enemies: 0 },
        leader_quest: { label: 'Command room', width: 19, height: 23, safe: true, enemies: 0 },
        exit: { label: 'Mission departure', width: 15, height: 19, safe: false, enemies: 1 }
    },
    hive: {
        warning: { label: 'Warning chamber', width: 17, height: 19, safe: false, enemies: 1, encounterProfile: 'hive-infested' },
        approach: { label: 'Contaminated approach', width: 15, height: 23, safe: false, enemies: 3, encounterProfile: 'hive-infested' },
        outer_nest: { label: 'Defended nest', width: 25, height: 21, safe: false, enemies: 5, encounterProfile: 'hive-guardians' },
        choice_chamber: { label: 'Communion chamber', width: 29, height: 27, safe: true, enemies: 0 },
        consequence: { label: 'Resin nursery', width: 23, height: 19, safe: false, enemies: 2, encounterProfile: 'hive-infested' },
        escape: { label: 'Escape passage', width: 15, height: 21, safe: false, enemies: 2, encounterProfile: 'hive-infested' }
    }
});

// Fixture sets that make each beat recognizable. `signature` and `service`
// resolve to the site's own props so Tallow never borrows Meridian's radio;
// every other type is shared family dressing from the registered scatter
// catalog. Slots name disjoint regions (see slotRegion), which is what keeps
// every variant and rotation free of sealed pockets.
const BEAT_FIXTURES = Object.freeze({
    camp: {
        approach: [
            { slot: 'nw', w: 3, h: 3, type: 'signature' },
            { slot: 'se', w: 2, h: 2, type: 'prop_camp_warning_placard' },
            { slot: 'sw', w: 3, h: 2, type: 'prop_camp_sandbags' }
        ],
        perimeter: [
            { slot: 'nw', w: 4, h: 2, type: 'prop_camp_sandbags' },
            { slot: 'ne', w: 4, h: 2, type: 'prop_camp_sandbags' },
            { slot: 'sw', w: 2, h: 2, type: 'prop_camp_sandbags', role: 'turret_platform' },
            { slot: 'se', w: 3, h: 2, type: 'prop_camp_shutter_lockdown', role: 'checkpoint' }
        ],
        central: [
            { slot: 'nw', w: 3, h: 3, type: 'prop_camp_bedrolls' },
            { slot: 'ne', w: 3, h: 2, type: 'prop_camp_laundry' },
            { slot: 'sw', w: 3, h: 3, type: 'prop_camp_crates' },
            { slot: 'se', w: 3, h: 3, type: 'signature' },
            { slot: 'wn', w: 2, h: 2, type: 'prop_camp_cot' },
            { slot: 'es', w: 2, h: 2, type: 'prop_camp_crate' }
        ],
        service: [
            { slot: 'nw', w: 3, h: 3, type: 'service', role: 'workbench' },
            { slot: 'ne', w: 3, h: 2, type: 'prop_camp_crates' },
            { slot: 'se', w: 3, h: 2, type: 'prop_camp_crates_chained' },
            { slot: 'sw', w: 2, h: 2, type: 'prop_camp_crate' }
        ],
        leader_quest: [
            { slot: 'nw', w: 3, h: 3, type: 'signature', role: 'holomap' },
            { slot: 'ne', w: 2, h: 2, type: 'prop_camp_warning_placard' },
            { slot: 'se', w: 3, h: 2, type: 'prop_camp_crates' },
            { slot: 'sw', w: 2, h: 2, type: 'prop_torn_warning_poster' }
        ],
        exit: [
            { slot: 'nw', w: 2, h: 2, type: 'prop_camp_warning_placard' },
            { slot: 'ne', w: 2, h: 2, type: 'prop_camp_shutter_lockdown' },
            { slot: 'se', w: 3, h: 2, type: 'prop_camp_sandbags' }
        ]
    },
    hive: {
        warning: [
            { slot: 'nw', w: 3, h: 2, type: 'prop_cave_bones' },
            { slot: 'ne', w: 2, h: 2, type: 'prop_torn_warning_poster' },
            { slot: 'se', w: 2, h: 2, type: 'prop_cave_eggs_hatched' }
        ],
        approach: [
            { slot: 'nw', w: 2, h: 3, type: 'prop_spore_colony' },
            { slot: 'se', w: 3, h: 2, type: 'prop_cave_spores' },
            { slot: 'sw', w: 2, h: 2, type: 'prop_hive_resin_sac' }
        ],
        outer_nest: [
            { slot: 'nw', w: 3, h: 3, type: 'signature' },
            { slot: 'ne', w: 3, h: 2, type: 'prop_cave_eggs_intact' },
            { slot: 'sw', w: 2, h: 3, type: 'prop_biomech_pillar_left' },
            { slot: 'se', w: 2, h: 3, type: 'prop_biomech_pillar_right' }
        ],
        choice_chamber: [
            { slot: 'nw', w: 3, h: 3, type: 'signature', role: 'synapse_spire' },
            { slot: 'ne', w: 3, h: 2, type: 'prop_biomech_arch' },
            { slot: 'sw', w: 3, h: 2, type: 'prop_cave_lichen' },
            { slot: 'se', w: 3, h: 3, type: 'signature' },
            { slot: 'wn', w: 2, h: 2, type: 'prop_hive_resin_sac' },
            { slot: 'es', w: 2, h: 2, type: 'prop_spore_colony' }
        ],
        consequence: [
            { slot: 'nw', w: 3, h: 3, type: 'service', role: 'harvest_node' },
            { slot: 'ne', w: 2, h: 2, type: 'prop_specimen_tank' },
            { slot: 'se', w: 3, h: 2, type: 'prop_cave_eggs_hatched' },
            { slot: 'sw', w: 2, h: 2, type: 'prop_hive_resin_sac' }
        ],
        escape: [
            { slot: 'nw', w: 3, h: 2, type: 'prop_biomech_arch' },
            { slot: 'se', w: 2, h: 3, type: 'prop_cave_webs' },
            { slot: 'sw', w: 2, h: 2, type: 'prop_cave_lichen' }
        ]
    }
});

export const TERRITORY_BEAT_KEYS = Object.freeze({
    camp: Object.freeze(Object.keys(BEATS.camp)),
    hive: Object.freeze(Object.keys(BEATS.hive))
});

/**
 * The inclusive cell region a slot may occupy. Corner slots sit outside the
 * room's clear core -- the three-wide route cross plus the 5x5 encounter
 * square in outer rooms, the 15x15 entity plaza in heart rooms -- and inside
 * a two-cell walkway along the walls. The side slots exist only in heart
 * rooms, one spare row away from their corner neighbour. Regions never touch,
 * so no two fixtures can close a pocket between them.
 */
function slotRegion(slot, width, height, heart) {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const margin = heart ? 8 : 3;
    const left = [2, cx - margin];
    const right = [cx + margin, width - 3];
    const top = [2, cy - margin];
    const bottom = [cy + margin, height - 3];
    const regions = {
        nw: [left, top], ne: [right, top], sw: [left, bottom], se: [right, bottom],
        wn: [left, [cy - margin + 2, cy - 3]],
        es: [right, [cy + 3, cy + margin - 2]]
    };
    const region = regions[slot];
    if (!region) return null;
    const [[x0, x1], [y0, y1]] = region;
    return x1 >= x0 && y1 >= y0 ? { x0, x1, y0, y1 } : null;
}

// Variant 0 hugs the walls, 1 crowds the route cross, 2 grows and centers:
// the same six named rooms read differently from one campaign to the next.
function placeFixture(spec, region, variant, width, height) {
    const w = Math.min(spec.w + (variant === 2 ? 1 : 0), region.x1 - region.x0 + 1);
    const h = Math.min(spec.h, region.y1 - region.y0 + 1);
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const towardCenterX = (region.x0 + region.x1) / 2 < cx;
    const towardCenterY = (region.y0 + region.y1) / 2 < cy;
    const along = (lo, hi, size, innerIsHigh) => {
        if (variant === 2) return lo + Math.floor((hi - lo + 1 - size) / 2);
        const inner = variant === 1;
        return inner === innerIsHigh ? hi - size + 1 : lo;
    };
    return {
        x: along(region.x0, region.x1, w, towardCenterX),
        y: along(region.y0, region.y1, h, towardCenterY),
        w,
        h
    };
}

export function getTerritoryLocation(siteId, beatKey) {
    const profile = TERRITORY_SITE_PROFILES[siteId];
    const beat = profile ? BEATS[profile.family][beatKey] : null;
    if (!beat) return null;
    return { siteId, siteLabel: profile.label, family: profile.family, beatKey, beatLabel: beat.label, safe: beat.safe };
}

export function createTerritoryRoomBuild(reservation) {
    const profile = TERRITORY_SITE_PROFILES[reservation?.siteId];
    if (!profile || reservation.roomFamily !== profile.family) return null;
    const beatKey = reservation.territoryBeatKey
        ?? (profile.family === 'camp' ? 'central' : 'choice_chamber');
    const beat = BEATS[profile.family][beatKey];
    if (!beat) return null;
    const variant = (Number(reservation.territoryVariant) >>> 0) % 3;
    const { width, height } = beat;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const pattern = Array.from({ length: height }, () => Array(width).fill('.'));
    const heart = beatKey === 'central' || beatKey === 'choice_chamber';
    const placed = [];
    for (const spec of BEAT_FIXTURES[profile.family][beatKey]) {
        const region = slotRegion(spec.slot, width, height, heart);
        if (!region) continue;
        placed.push({ spec, ...placeFixture(spec, region, variant, width, height) });
    }
    for (const fixture of placed) {
        for (let y = fixture.y; y < fixture.y + fixture.h; y += 1) {
            for (let x = fixture.x; x < fixture.x + fixture.w; x += 1) pattern[y][x] = '#';
        }
    }
    const fixtures = placed.map(({ x, y, w, h }) => ({ x, y, w, h }));
    const structuralAnchors = placed.map(({ spec, x, y }, index) => ({
        id: `${reservation.siteId}:${beatKey}:fixture:${index}`,
        type: spec.type === 'signature' ? profile.signature
            : spec.type === 'service' ? profile.service
                : spec.type,
        ...(spec.role ? { role: spec.role } : {}),
        x, y
    }));
    return {
        id: `${reservation.siteId}_${beatKey}_v${variant + 1}`,
        family: profile.family,
        label: `${profile.label} — ${beat.label}`,
        territoryBeatKey: beatKey,
        siteId: reservation.siteId,
        pattern: pattern.map((row) => row.join('')),
        sockets: ['n', 'e', 's', 'w'].map((side, index) => ({ id: `threshold_${side}`, side, width: 3, required: index === 0 })),
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2, 3, 4, 5],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: [beat.safe ? 'support' : 'encounter'],
        ...(beat.encounterProfile ? { encounterProfile: beat.encounterProfile } : {}),
        structuralAnchors,
        // This anchor is consumed by the existing site entity placement. It
        // describes a position, so it deliberately has no duplicate prop.
        interactionAnchors: [],
        compassAnchors: { approach: 'threshold_n', objective: 'territory_center' },
        coverZones: fixtures,
        encounterZones: beat.safe ? [] : [{ id: `${beatKey}_defenders`, x: centerX - 2, y: centerY - 2, w: 5, h: 5 }],
        rewardAnchors: [],
        loreAnchors: [],
        hazardZones: [],
        quietZones: beat.safe ? [{ x: 0, y: 0, w: width, h: height }] : [],
        safeZone: beat.safe,
        containmentBounds: { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 },
        presentationVariants: ['intact'],
        stateVariants: ['dormant', 'resolved'],
        adjacency: { prefers: [], forbids: [] },
        contentBudget: { structuralLarge: 2, activityZones: beat.safe ? 0 : 1, pickupsMin: 0, enemiesMax: beat.enemies },
        centerAnchor: { id: 'territory_center', kind: 'site', x: centerX, y: centerY }
    };
}
