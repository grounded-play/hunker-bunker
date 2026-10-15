// Builds the 2026-10-15 world-expansion prompt sheet and its gap manifest
// from one data table, so the prompts and the placement/interaction contract
// cannot drift apart.
//
//   node scripts/generate-world-expansion-80-prompts.mjs
//
// Writes:
//   docs/planning/interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv
//     The generation sheet, in the same 6-column format as every earlier
//     prompt TSV (n, id, kind, key, size, prompt). Rows 1-13 are the owner's
//     completed rows and are carried over verbatim from the existing file.
//   docs/planning/world-expansion-80-gap-manifest-2026-10-15.md
//     Per-row contract: story hook, room, placement, verbs, states, nodes,
//     nearest shipped models, support art and acceptance.
//
// Every nearest-model reference must be a registered WORLD_3D_MODELS key and
// every support-art id must be defined below; the script refuses otherwise.
import fs from 'node:fs';
import { WORLD_3D_MODELS } from '../src/world3dOverlay.js';

const SHEET = new URL('../docs/planning/interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv', import.meta.url);
const MANIFEST = new URL('../docs/planning/world-expansion-80-gap-manifest-2026-10-15.md', import.meta.url);

// Shared blocks, copied verbatim from the owner's rows 1-13.
const STYLE = 'Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics.';
const RENDER = 'Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.';
const TEXTURE_SENSUALITY = 'Give the material a restrained, mature biomechanical sensuality while preserving seamless PBR usability: repeating soft ridges, elongated ribbing, curved bone arcs, delicate pores, taut translucent membranes, slick reflective moisture and fine resin threads fused into Nordic Jugendstil interlace, blackened iron and carved bone. Keep the body references suggestive and ambiguous, with intimacy carried by rhythm, tension and tactile surface contrast rather than literal anatomy. Environmental design only, with no people or overt narrative action; solemn alien sacrament rather than novelty pattern.';
const TEXTURE_TAIL = 'Zero perspective distortion, perfectly orthogonal top-down flat view, perfectly tileable and seamless in both X and Y axes across all four edges. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, vignetting, frames, borders, shadows of overhead objects, people, shoes, text, watermarks.';
const DECAL_SENSUALITY = 'Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror rather than novelty or comedy.';
const DECAL_TAIL = 'Crisp alpha decal mask isolated in center of frame, flat orthogonal angle, perfectly isolated graphic cutout with transparent-ready edges. Square 1:1, 2048x2048. Exclude: perspective angle, floor, walls, background elements, lighting glare, cast shadows, people.';

const RED = '#ef4444';
const AMBER = '#f59e0b';
const CYAN = '#22d3ee';
const LIME = '#84cc16';

// Support surfaces: one per placement family, laid under or behind the props
// that reference them.
const TEXTURES = [
    ['tex_meridian_covenant_bus_floor', 'Meridian power-ownership service floor', 'a soot-black steel service floor inlaid with flush oxidised copper bus strips that converge on a single witness plate, ceramic isolation ribs between strips, polished crescent wear where hands and boots press the contacts and faint green verdigris only in the deepest seams'],
    ['tex_tallow_red_mold_filter_floor', 'Tallow hydro-bed floor under quarantine', 'a wet basalt-and-resin hydroponic floor with a hard boundary: one half is clean nutrient-lime film over dark stone, the other half carries crimson red-mold freckles creeping along the drainage ribs and pooling in hollows, with dry scraped margins where a filter edge has been dragged'],
    ['tex_vesper_oiled_tally_deck', 'Vesper ledger, defense and muster floor', 'soot-black riveted deck plate maintained with finger-applied gun oil, rows of short pale tally scratches cut by knife points into the plate seams, fresh weld bluing on repaired cracks and dry custody dust in the corners'],
    ['tex_camp_private_worn_felt', 'private camp spaces and memorials', 'layered charcoal felt and patched wool laid over iron grating, compressed into a soft body-shaped polish where someone sits or kneels every night, a restrained warm-brown edge stain and tiny loose threads caught in the grate'],
    ['tex_camp_robbed_contact_dust', 'robbed camp aftermath floors', 'long-settled grey ash dust over dark steel interrupted by crisp clean rectangles and silhouettes where objects were lifted away, clipped copper wire grit, hurried boot smears heading for one exit and a few dropped bolts'],
    ['tex_recruited_packdown_canvas_floor', 'recruited camps packing up to leave', 'heavy waxed soot canvas tarps lashed over iron floor, compressed strap paths, clean folded creases, reinforced leather corner patches and parallel drag lines where crates and sleds were pulled across'],
    ['tex_turned_resin_ingress', 'turned camp machinery and walls', 'industrial steel panelling whose seams are invaded by thin glossy black resin veins branching in one direction, bruised maroon tissue swelling beneath the resin, and sparse hostile cyan pinpoints of light trapped inside the film'],
    ['tex_covenant_two_hand_ivory', 'alien covenant contact areas', 'bone-ivory stone floor polished by two different kinds of touch: broad human palm crescents on one side and narrow three-point alien contact grooves on the other, meeting in a shared dark resin seam at the centre'],
    ['tex_refusal_cautery_scale', 'alien refusal evidence walls', 'pale calcified chitin scale wall surface interrupted by long clean heat-darkened separation seams, matte healed margins either side, and a faint powdery bloom where living tissue withdrew from the stone'],
    ['tex_evac_queue_burnished_deck', 'escape-vessel boarding floor', 'cold gunmetal deck plate worn into four repeated standing positions by anxious waiting feet, brass latch inlays at each position, heel scuffs facing one hatch and small dark drips of condensation from overhead'],
    ['tex_evac_coldchain_frost_deck', 'egg and infection cargo floor', 'dark insulated composite cargo deck with controlled white frost growing only along the paths of hidden coolant lines, amber thaw-bead droplets where the cold fails, and clean dry islands where heavy frames stand'],
    ['tex_moving_floor_recess_grease', 'moving floor mechanisms', 'recessed concentric and linear iron tracks set into a steel floor, black graphite grease packed into the grooves, clean swept arcs where a moving part travels and compacted grit at the end stops'],
    ['tex_flood_tide_mineral', 'flood control and thermal runoff floors', 'black iron and concrete floor marked by two distinct mineral tide heights, pale salt crust along each line, wet low-roughness lower zone and a dry chalky upper zone, small rivulet channels following the slope'],
    ['tex_hazard_routed_conduit_wall', 'hazard-chain machinery walls', 'a dense wall of braided conduits and pipe channels on blackened brackets, each branch abraded differently, clamp shadows, one branch sweating condensate and another scorched, a sparse amber flow-direction cue painted only as a worn stripe'],
    ['tex_ceiling_service_condensate', 'overhead service ceilings', 'ceiling-grade blackened steel panels and rails seen from below, hanging condensate beads along every seam, smeared maintenance handprints near access points and narrow runoff tracks leading to drip points'],
    ['tex_secret_memory_membrane', 'secret wall apertures', 'a taut matte maroon membrane stretched inside a hard iron arch frame, subtle pale pressure-memory blooms where it has been touched in sequence, dry crisp edges at the frame and a restrained wet sheen across the centre']
];

const DECALS = [
    ['decal_grid_covenant_witness_arc', 'floor', 'a paired witness arc beneath a covenant seal: one human boot-and-glove scuff semicircle and one tool-drag semicircle meeting at a scorched contact point, 1.4 m wide'],
    ['decal_probe_capture_skid', 'floor', 'two converging scorched skid marks from a returning probe that end abruptly at a ring of clamp bites, with scattered sensor-glass grit, 2.2 m long'],
    ['decal_red_mold_quarantine_edge', 'threshold floor', 'a sharp clean-to-contaminated edge: dry scraped filter dust on one side, crimson red-mold freckles and damp spore halos stopping exactly at a straight line on the other, 2.6 m long'],
    ['decal_escort_tether_drag', 'floor', 'a single worn guide-line groove leaving a vent mouth, with paired kneeling scuffs and one dragged heel track following it out, 2.4 m long'],
    ['decal_warm_pipe_body_polish', 'wall and floor', 'a soft polished body-shaped hollow worn into soot on a pipe saddle and the floor beneath it, with a faint warm-brown halo where someone has sat against the heat for years, 1.6 m'],
    ['decal_iron_ledger_chalk_ring', 'floor', 'a ring of short chalk tally strokes around a standing ledger, some rubbed out by thumbs and rewritten, with oil fingerprints at the four points where it is opened, 1.5 m diameter'],
    ['decal_restored_grid_halo', 'wall and ceiling', 'a clean halo of freshly polished copper and scraped soot around a restored bus junction, radiating short clean cable-tie marks where new lines were run, 1.8 m'],
    ['decal_stripped_copper_scatter', 'floor', 'a scatter of clipped copper wire ends, cut insulation shells and pry-bar gouges around the footprint of a gutted transformer, with drag marks toward one exit, 2.4 m'],
    ['decal_stolen_weapon_ghosts', 'wall', 'crisp negative dust silhouettes left by removed rifles and sidearms on a dark pegboard wall, with snapped keeper-wire stubs at each outline, 2.2 m'],
    ['decal_packdown_drag_route', 'floor', 'parallel runner tracks of a loaded sled pulled across dusty floor, with strap-buckle scrapes and boot pushes alongside, ending at a threshold, 3.0 m long'],
    ['decal_turned_resin_veins_fan', 'wall and ceiling', 'a fan of thin glossy black resin veins spreading from one machine seam across the surface, maroon bruising under the resin and tiny trapped cyan points, 2.0 m'],
    ['decal_nahl_covenant_loop', 'floor', 'two approach arcs from different directions, one boot-shaped and one three-toed, joined by a single repaired seam of pale suture resin at the centre, 1.8 m'],
    ['decal_vey_resonance_nodes', 'floor', 'three concentric rings of fine dust standing in vibration nodes beneath a suspended listening structure, crisp at the rings and swept clean between them, 1.5 m'],
    ['decal_rhun_weight_set', 'floor', 'a deep square compression print from a heavy shared weight with four boot scuffs and two broad carapace shoulder drags on opposite sides, 1.4 m'],
    ['decal_refusal_cautery_fan', 'wall', 'a restrained heat-darkened fan of scorch radiating from a severed contact point, with calcified flakes falling below it, 1.2 m'],
    ['decal_evac_muster_positions', 'floor', 'four boarding positions worn into deck paint by waiting feet, progressively heavier from first to last, with one position scraped clean and abandoned, 2.4 m'],
    ['decal_queen_restraint_sweep', 'floor', 'three clean swept arcs in frost and grime where closing restraint segments travel, with deep claw scratches crossing them, 2.8 m'],
    ['decal_egg_harness_condensate', 'floor', 'four cold condensate lobes beneath an egg cargo frame connected by narrow coolant drip lines, frosted at the edges and wet at the centres, 2.2 m'],
    ['decal_vote_turnstile_wear', 'floor', 'one-way semicircular foot wear around a three-armed gate, polished on the committed side and dusty on the refused side, 1.7 m'],
    ['decal_lift_recess_rim', 'floor recess', 'a circular cutout rim of grease, pinch-point wear and scuffed warning paint around a flush floor lift, 2.3 m diameter'],
    ['decal_flood_baffle_tide', 'threshold floor', 'opposed mineral tide fans showing water forced left or right by a pivoting baffle, salt crust at each limit, 2.4 m'],
    ['decal_coring_chain_cut', 'wall', 'a persistent circular chain-cut kerf with burnished bright edges fading to heat blue and a fan of fallen cutting debris below, 1.9 m'],
    ['decal_cryogen_header_fallout', 'wall and floor', 'three branches of white frost fallout and frozen drips falling from overhead takeoff points, one branch dry where it was isolated, 2.4 m'],
    ['decal_memory_skin_pressure', 'wall', 'three subtle pale hand-pressure blooms on a membrane wall in a deliberate triangle, the sequence hinted by fading strength, 1.3 m']
];

// The 67 new props. `body` and `story` are the prompt prose; the rest is the
// placement and interaction contract that lands in the manifest.
const PROPS = [
    // --- Camp signature and quest anchors (one per real quest in src/data/campQuests.js) ---
    {
        id: 'meridian_grid_covenant_seal', suite: 'camp-quest', hook: 'camp_meridian / grid_covenant (signature)', room: 'Meridian camp core, wall beside the logic drum',
        place: 'wall-backed threshold', dims: '2.1 m H, 1.8 m W, 0.5 m D', verbs: 'sign, witness, revoke', states: 'unsigned | signed | revoked',
        nodes: 'HB_ARM_00 (left bus bar), HB_ARM_01 (right bus bar), HB_LID_00 (witness key), FX_LIGHT_00, INTERACTION_00',
        nearest: ['meridian_optic_nerve_patchbay', 'meridian_logic_core_drum', 'substation_breaker_interlock'], tex: 'tex_meridian_covenant_bus_floor', decal: 'decal_grid_covenant_witness_arc',
        noun: 'power-ownership covenant seal', theme: 'sacramental power engineering', mats: 'oxidised copper bus bars, glazed ceramic insulators, blackened iron arch, polished bone witness key',
        body: 'a shallow blackened-iron arch framing two heavy curved copper bus bars that swing toward each other on exposed pivot pins and close around a removable bone-ceramic witness key seated in a central socket. When the bars meet, a contact crown above the key completes the circuit; when revoked, the key is withdrawn and the bars stand apart. Ceramic isolation ribs run down both jambs, braided earth straps hang from the arch, and the base carries a worn kneeling step. Show it in the unsigned state, bars apart and key half-seated.',
        story: 'Kaelen\'s Grid Covenant made physical: signing puts Meridian\'s power under the player\'s name, and the key can be pulled to revoke it.',
        accent: `thin cyan contact crown glowing only where the bus bars would meet (${CYAN})`,
        accept: 'Signing during grid_covenant closes the bars, persists across save, and revoking reopens them.'
    },
    {
        id: 'meridian_probe_return_catchframe', suite: 'camp-quest', hook: 'camp_meridian / lost_probe', room: 'frost-biome return point and Meridian yard',
        place: 'floor recess', dims: '0.7 m H, 2.4 m W, 1.4 m D', verbs: 'dock, extract core, return', states: 'empty | captured | stripped',
        nodes: 'HB_ARM_00 / HB_ARM_01 (recovery jaws), HB_LID_00 (core socket), INTERACTION_00',
        nearest: ['scout_tracking_beacon_core', 'scout_tachyon_radar_mast', 'crawler_signal_antenna_rig'], tex: 'tex_meridian_covenant_bus_floor', decal: 'decal_probe_capture_skid',
        noun: 'probe recovery catch-frame', theme: 'cold corporate field telemetry', mats: 'frost-rimed gunmetal, sprung steel guide ribs, rubberised capture pads, scorched sensor glass',
        body: 'a low split-ring catch-frame sunk into the floor with a ring of sprung steel guide ribs that funnel a falling probe toward the centre, two folding recovery jaws on opposite sides, and an empty cylindrical core socket at the hub with a twist-lock collar. A dented probe shell is not present; only the empty cradle and the scorched pads that remember its impact. Show the jaws open and the socket empty.',
        story: 'Where the lost Horizon metric probe is brought home, and where the player decides whether its memory core goes back to Meridian intact.',
        accent: `small amber lock-ready ring around the empty core socket (${AMBER})`,
        accept: 'Delivering the probe docks it in the jaws; extracting the core advances lost_probe; the stripped state persists.'
    },
    {
        id: 'meridian_reactor_vent_load_selector', suite: 'camp-quest', hook: 'camp_meridian / reactor_venting', room: 'reactor vent station (roomBuilds reactor_vent_station)',
        place: 'wall aperture', dims: '2.3 m H, 1.7 m W, 0.6 m D', verbs: 'route surge, sacrifice branch, restore', states: 'charging | door-fed | life-support-fed | camp-fed | vented',
        nodes: 'HB_LEVER_00..02 (knife switches), HB_ROTOR_00 (load wheel), FX_STEAM_00, INTERACTION_00',
        nearest: ['substation_breaker_interlock', 'meridian_capacitor_bomb', 'base_power_junction_box'], tex: 'tex_hazard_routed_conduit_wall', decal: null,
        noun: 'three-way reactor surge selector', theme: 'desperate reactor load engineering', mats: 'heavy knife-switch copper, glazed ceramic load wheel, blackened cast frame, heat-blued vent shrouds',
        body: 'a recessed wall cabinet holding one large glazed ceramic load wheel at its centre, orbited by three heavy copper knife switches that are mechanically exclusive: a sliding iron interlock bar lets only one blade seat at a time. Each switch feeds a thick braided cable leaving through the cabinet sides toward different destinations, and a louvred vent shroud above the wheel is where a surge is dumped. Show one blade seated and two raised.',
        story: 'Defusing the reactor venting grid means choosing which branch eats the surge: the doors, the life support, or the camp itself.',
        accent: `hot amber glow inside the vent shroud above the load wheel (${AMBER})`,
        accept: 'reactor_venting resolves only after one branch is chosen; the chosen branch loses power in its room until restored.'
    },
    {
        id: 'kaelen_drafting_scroll_reel', suite: 'camp-quest', hook: 'camp_meridian / Kaelen private space (supports grid_covenant)', room: 'Kaelen\'s alcove off the Meridian core',
        place: 'wall-backed private alcove', dims: '1.5 m H, 1.6 m W, 0.45 m D', verbs: 'inspect, advance scroll, annotate', states: 'private | shared | abandoned',
        nodes: 'HB_ROTOR_00 (upper reel), HB_ROTOR_01 (lower reel), HB_LEVER_00 (crank), INTERACTION_00',
        nearest: ['life_planning_board', 'life_route_map_table', 'meridian_soldering_hearth'], tex: 'tex_camp_private_worn_felt', decal: null,
        noun: 'chief engineer\'s drafting scroll reel', theme: 'obsessive private engineering devotion', mats: 'yellowed vellum, brass reel caps, ink-stained walnut, blackened iron crank',
        body: 'a wall-mounted pair of horizontal walnut reels with brass end caps carrying a long sheet of yellowed vellum between them, covered edge to edge with dense hand-drawn wiring diagrams, cutaway pipe sections and a redesigned bunker plan with no lettering, only lines and symbols. A side crank advances the scroll; a small ink well, drafting compass and pin cushion sit on a narrow ledge below. Show a section of the diagram stretched taut across the frame.',
        story: 'Kaelen, the corporate chief engineer, privately redrawing the whole bunker as it should have been built.',
        accent: `small amber task lamp clipped above the scroll (${AMBER})`,
        accept: 'Inspecting advances the visible section; after grid_covenant is signed the shared state exposes a route hint.'
    },
    {
        id: 'tallow_red_mold_quarantine_loom', suite: 'camp-quest', hook: 'camp_tallow / spore_cleansing', room: 'hydro-bed channel threshold (medical_triage hydro_bed_controls family)',
        place: 'threshold span', dims: '2.4 m H, 2.8 m W, 0.55 m D', verbs: 'seal, sample, burn', states: 'open | sealed | contaminated | burned',
        nodes: 'HB_DOOR_00 (filter curtain), HB_LID_00 (sample clip), FX_SPORE_00, INTERACTION_00',
        nearest: ['tallow_flesh_trellis', 'hydro_mycelial_seed_vault', 'life_suit_drying_rack'], tex: 'tex_tallow_red_mold_filter_floor', decal: 'decal_red_mold_quarantine_edge',
        noun: 'red-mold quarantine filter loom', theme: 'devout hydroponic quarantine', mats: 'woven resin cord, weighted bronze sealing ribs, bone tension pegs, damp crimson mold stains',
        body: 'a doorway-wide upright loom frame of bone pegs and blackened iron carrying a draw-across curtain of densely woven resin-cord filter, weighted along the bottom by heavy bronze sealing ribs that press into the floor. Clipped leaf samples hang from a rail at shoulder height, and a narrow pass-through slit with a sliding baffle lets a gloved arm reach the other side. One half of the weave is stained with creeping crimson mold. Show it half drawn.',
        story: 'Martha\'s people hold the red mold back from the last clean hydro beds with a filter they wove themselves; burning it is the last resort.',
        accent: `lime nutrient glow in the clean half of the hydro channel visible through the slit (${LIME})`,
        accept: 'Sealing it stops red-mold spread into the clean channel during spore_cleansing; burning clears it but leaves the burned state.'
    },
    {
        id: 'tallow_cultist_escort_tether_reel', suite: 'camp-quest', hook: 'camp_tallow / lost_cultist', room: 'ventilation tunnel mouth',
        place: 'wall-backed at a vent opening', dims: '1.6 m H, 1.1 m W, 0.8 m D', verbs: 'pay out, reel in, escort', states: 'stowed | paid out | reunited',
        nodes: 'HB_ROTOR_00 (drum), HB_LEVER_00 (brake), HB_ROPE_00 (line socket), INTERACTION_00',
        nearest: ['life_umbilical_tether', 'life_guide_rope_stakes', 'prop_biomech_sphincter_hatch_vent'], tex: 'tex_tallow_red_mold_filter_floor', decal: 'decal_escort_tether_drag',
        noun: 'hand-cranked escort tether reel', theme: 'tender rescue rigging', mats: 'braided seed-fibre rope, oiled oak drum, blackened iron brake band, bone thimble',
        body: 'a sturdy wall-bolted reel with a wide oiled oak drum wound with braided seed-fibre guide line, a long two-handed crank, a band brake on a foot lever and a bone thimble guiding the line out through a protective iron fairlead toward a vent mouth. A small rest seat and a folded blanket hang beside it for whoever comes out exhausted. Show the line partly paid out through the fairlead.',
        story: 'The cultist lost in the ventilation tunnels is found by following Tallow\'s guide line in and brought home by reeling it out.',
        accent: `soft amber lantern hung on the fairlead (${AMBER})`,
        accept: 'Paying out spawns a followable line into the tunnel; reeling in with the cultist attached completes lost_cultist.'
    },
    {
        id: 'martha_warm_pipe_return_nest', suite: 'camp-quest', hook: 'camp_tallow / warm_pipes (signature)', room: 'Tallow heart-pipe corridor',
        place: 'wall-backed domestic niche', dims: '1.5 m H, 2.1 m W, 0.8 m D', verbs: 'rest, return keepsake, converse', states: 'empty | occupied | memorialised',
        nodes: 'HB_LID_00 (keepsake hook), SEAT_00, FX_STEAM_00, INTERACTION_00',
        nearest: ['life_pipe_hammock', 'life_parka_hooks', 'life_barrel_heater'], tex: 'tex_camp_private_worn_felt', decal: 'decal_warm_pipe_body_polish',
        noun: 'warm-pipe homecoming nest', theme: 'quiet communal warmth', mats: 'patched insulation wrap, worn wool, heat-darkened copper pipe, hand-sewn leather sling',
        body: 'a curved saddle built around a large hot pipe run, its insulation patched with layers of wool and leather, a shallow body-warm sitting hollow worn into the padding, a suspended leather coat sling, and one carved bone hook at eye height meant for a single returned keepsake. Thin wisps of steam escape a patched joint above. Show it empty, the hollow clearly worn by one person.',
        story: 'The place Martha promised to be waiting, warm, when the player returns to Tallow before the heart sings.',
        accent: `amber glow seeping from the patched pipe joint (${AMBER})`,
        accept: 'Returning before the deadline makes it occupied; the keepsake hook persists; failing leaves it memorialised.'
    },
    {
        id: 'tallow_communal_dose_wheel', suite: 'camp-quest', hook: 'camp_tallow / care economy', room: 'Tallow infirmary floor',
        place: 'central floor', dims: '1.2 m H, 1.5 m W, 1.5 m D', verbs: 'allocate, dose, withhold', states: 'full | rationed | empty | tainted',
        nodes: 'HB_ROTOR_00 (dosing cam), HB_LID_00..05 (cup ports), INTERACTION_00',
        nearest: ['tallow_vaccine_alembic', 'life_peristaltic_feeder', 'life_card_table'], tex: 'tex_tallow_red_mold_filter_floor', decal: null,
        noun: 'communal medicine dose wheel', theme: 'fair-share apothecary engineering', mats: 'ivory dosing ceramic, verdigris bronze cam, glass cup ports, worn oak spokes',
        body: 'a low radial wheel on a heavy bronze hub with six measured ivory ceramic cup ports around its rim and a central dosing cam that drops one measure into whichever cup is turned under it. Six worn oak spokes let anyone turn it from any side, and a hinged shut-off gate can lock one port. Green medicine residue sits only in the channels. Show one port gated shut.',
        story: 'Tallow shares medicine by a wheel everyone can see turning, so nobody is skipped in secret.',
        accent: `lime medicinal glow in the central reservoir window (${LIME})`,
        accept: 'Dosing heals and drains one measure; withholding a port is remembered by the camp.'
    },
    {
        id: 'vesper_iron_ledger_totem', suite: 'camp-quest', hook: 'camp_vesper / iron_ledger (signature)', room: 'Vesper muster hall',
        place: 'standing inspection anchor', dims: '1.8 m H, 0.9 m W, 0.7 m D', verbs: 'inspect, challenge, amend', states: 'sealed | opened | amended | destroyed',
        nodes: 'HB_LID_00..05 (tally leaves), HB_LEVER_00 (witness lock), INTERACTION_00',
        nearest: ['vesper_dogtag_retrieval_crypt', 'life_tally_bulkhead', 'corp_quantum_ledger_podium'], tex: 'tex_vesper_oiled_tally_deck', decal: 'decal_iron_ledger_chalk_ring',
        noun: 'iron ledger totem of the dead', theme: 'martial remembrance discipline', mats: 'oiled soot-black steel, stamped tally plates, knife-scratched leaves, brass witness lock',
        body: 'a narrow armoured spine standing on a heavy square foot, carrying overlapping stamped steel tally leaves on captive pivots like the pages of a book that cannot be removed without the key, each leaf covered in short knife-cut tally strokes and dents with no letters. A brass witness lock clamps the bottom of the spine, and one blank leaf at the front is unmarked. Show the leaves fanned slightly open.',
        story: 'Briggs\' Ledger of the Dead; the signature quest is to earn a line in it without ending up in it.',
        accent: `a single red lamp above the blank leaf (${RED})`,
        accept: 'Completing iron_ledger marks the blank leaf; destroying the totem is a camp-hostile act that persists.'
    },
    {
        id: 'vesper_defense_grid_fire_director', suite: 'camp-quest', hook: 'camp_vesper / bunker_holdout', room: 'Vesper barricade gate',
        place: 'raised command perch', dims: '1.6 m H, 1.8 m W, 1.1 m D', verbs: 'aim, assign, sever', states: 'idle | tracking | jammed | overrun',
        nodes: 'HB_ROTOR_00 (azimuth yoke), HB_ROPE_00..02 (Bowden cables), INTERACTION_00',
        nearest: ['vesper_autocannon_bipod', 'vesper_mortar_loading_cradle', 'life_lookout_perch'], tex: 'tex_vesper_oiled_tally_deck', decal: null,
        noun: 'manual defense-grid fire director', theme: 'improvised siege command', mats: 'oiled steel yoke, braided Bowden cables, sandbag-wrapped pedestal, brass sighting rings',
        body: 'a waist-high pedestal wrapped in sandbags carrying a heavy manual azimuth yoke with two hand grips and a brass ring sight, from which three thick braided Bowden cables run out through guides in different directions toward separate gun positions. A cable cutter lever sits beside each guide. No screen or desk surface anywhere; all control is mechanical. Show the yoke swung to one side, cables taut.',
        story: 'How Vesper holds the barricade gate: one operator steering three guns by hand while the patrols come in.',
        accent: `amber ready lamp on the active cable guide (${AMBER})`,
        accept: 'During bunker_holdout each assigned cable makes its gun track the yoke; severing one disables that gun for the wave.'
    },
    {
        id: 'vesper_surrender_weapon_tree', suite: 'camp-quest', hook: 'camp_vesper / surrender and recruit staging', room: 'Vesper threshold muster floor',
        place: 'threshold floor', dims: '2.2 m H, 2.2 m W, 0.8 m D', verbs: 'surrender, reclaim, recruit', states: 'empty | disarmed | reissued | looted',
        nodes: 'HB_LOCK_00..05 (weapon hooks), HB_LEVER_00 (custody bar), INTERACTION_00',
        nearest: ['life_mask_rack', 'vesper_reloading_station', 'vesper_hanging_cage'], tex: 'tex_vesper_oiled_tally_deck', decal: null,
        noun: 'surrender weapon tree', theme: 'grim custody ritual', mats: 'dark forged iron branches, burnished hook points, leather custody straps, worn foot bar',
        body: 'a branching forged-iron standard like a leafless tree, each branch ending in a downward-locking weapon hook with a spring keeper, and a heavy foot-operated custody bar at the base that locks or releases every hook at once. Leather straps hang from the lower branches and the hook points are polished bright from use. Show it empty with the custody bar raised.',
        story: 'Entering Vesper means hanging your weapons on the tree; being recruited means getting them back with a Guild strap.',
        accent: `small red lock lamp on the custody bar (${RED})`,
        accept: 'Surrender hangs the player\'s weapons visibly; recruit reissues them; looted is a robbed-camp state.'
    },
    {
        id: 'briggs_field_strip_ritual_mat', suite: 'camp-quest', hook: 'camp_vesper / Briggs private space', room: 'Briggs\' bunk corner',
        place: 'tabletop or floor micro-scene', dims: '0.08 m H, 1.3 m W, 0.8 m D', verbs: 'inspect, complete set, disturb', states: 'ordered | incomplete | abandoned',
        nodes: 'SOCKET_00..07 (part cups), INTERACTION_00',
        nearest: ['vesper_ballistic_chronograph', 'life_card_table', 'prop_maintenance_tool_cart'], tex: 'tex_camp_private_worn_felt', decal: null,
        noun: 'field-strip ritual mat', theme: 'private soldierly devotion', mats: 'heavy black oilcloth, inset magnetic cups, amber lubricant halos, folded edge memory',
        body: 'a rolled-out heavy oilcloth mat with a rigid edge and inset magnetic cups arranged in a precise pattern, most holding cleaned rifle parts, pins and springs laid in strict order, with three clean empty silhouettes where personal parts are missing. A small oil can and brush rest in one corner and the mat\'s far end is still rolled. Show it seen from a high three-quarter angle so the layout reads.',
        story: 'Briggs strips the same rifle every night; the three missing parts say what he lost and has not told anyone.',
        accent: `faint amber oil sheen in one empty silhouette (${AMBER})`,
        accept: 'Returning the three parts completes the set and shifts Briggs\' trust; disturbing it is noticed.'
    },
    // --- Camp consequence states: grown / robbed / recruited / turned ---
    {
        id: 'meridian_grid_restored_bus_crown', suite: 'camp-consequence', hook: 'camp_meridian grown', room: 'Meridian core ceiling junction',
        place: 'ceiling-to-wall junction', dims: '1.4 m H, 2.4 m W, 0.7 m D', verbs: 'synchronise, overload', states: 'dark | stable | overloaded',
        nodes: 'HB_DOOR_00 / HB_DOOR_01 (paired shutters), FX_LIGHT_00, FX_SPARK_00',
        nearest: ['substation_stepdown_transformer', 'meridian_logic_core_drum', 'prop_wall_cable_tray_swag'], tex: 'tex_meridian_covenant_bus_floor', decal: 'decal_restored_grid_halo',
        noun: 'restored overhead bus crown', theme: 'triumphant restored infrastructure', mats: 'freshly insulated copper buswork, bright cable ties, blackened crown frame, ceramic standoffs',
        body: 'a crowned loop of thick freshly insulated copper buswork mounted where wall meets ceiling, carried on ceramic standoffs inside a blackened iron crown frame, with paired louvred shutters on the front that open when every feeder is in phase. New cable ties and clean splices are everywhere; the old scorched sections hang cut off to one side. Show the shutters open.',
        story: 'A grown Meridian visibly shares stable power with everyone; the crown is the proof.',
        accent: `steady cyan line inside the open shutters (${CYAN})`,
        accept: 'Appears when Meridian grows; adjacent rooms gain stable light; overloading it is a deliberate sabotage verb.'
    },
    {
        id: 'meridian_robbed_stripped_transformer_carcass', suite: 'camp-consequence', hook: 'camp_meridian robbed (state of substation_stepdown_transformer)', room: 'Meridian substation corner',
        place: 'floor', dims: '2.6 m H, 2.0 m W, 1.4 m D', verbs: 'inspect, salvage scrap, accuse', states: 'stripped | picked clean',
        nodes: 'HB_DOOR_00 (hanging panel), INTERACTION_00',
        nearest: ['substation_stepdown_transformer', 'life_transformer_bank', 'state_wall_breached_02'], tex: 'tex_camp_robbed_contact_dust', decal: 'decal_stripped_copper_scatter',
        noun: 'stripped transformer carcass', theme: 'looted industrial grief', mats: 'gutted iron core laminations, pry-bent housing, cut copper stubs, spilled black oil',
        body: 'the heavy housing of a large step-down transformer with its side panels pried open and one hanging by a single hinge, the copper windings ripped out to leave bare laminated iron core legs, cut copper stubs bristling from every terminal, and black insulating oil dried in a long streak down the base. Pry-bar gouges mark every bolt. Show the open side facing the viewer.',
        story: 'Proof the player robbed Meridian: the camp\'s heart was gutted for its copper.',
        accent: `one dying red fault lamp on the empty terminal block (${RED})`,
        accept: 'Replaces the intact transformer when Meridian is robbed; persists; residents reference it.'
    },
    {
        id: 'meridian_recruited_packdown_sled', suite: 'camp-consequence', hook: 'camp_meridian recruited', room: 'Meridian exit, later the player\'s base',
        place: 'floor, carry-to-install', dims: '0.65 m H, 2.2 m W, 1.0 m D', verbs: 'pack, haul, install', states: 'deployed | packed | installed',
        nodes: 'HB_LID_00..02 (machine sockets), HB_ARM_00 / HB_ARM_01 (outriggers), CARRY_00',
        nearest: ['life_ice_sled', 'salvage_tagged_heap', 'meridian_soldering_hearth'], tex: 'tex_recruited_packdown_canvas_floor', decal: 'decal_packdown_drag_route',
        noun: 'grid packdown sled', theme: 'disciplined relocation engineering', mats: 'waxed canvas covers, insulated cable reels, steel runners, leather haul straps',
        body: 'a low insulated sled on steel runners carrying nested cable reels, three latched machine sockets under waxed canvas covers, folding outrigger legs that drop to stand it as a workbench, and long leather haul straps for one or two people. Everything is tied down neatly in transport order. Show it packed, outriggers folded.',
        story: 'A recruited Meridian packs its grid into a sled and follows the player.',
        accent: `small cyan charge window on the centre socket (${CYAN})`,
        accept: 'Carryable via the carry system; installing it at base adds a power socket.'
    },
    {
        id: 'meridian_turned_resin_choked_breaker_gallery', suite: 'camp-consequence', hook: 'camp_meridian turned (state of substation_breaker_interlock)', room: 'Meridian breaker wall',
        place: 'wall-backed', dims: '2.2 m H, 2.4 m W, 0.6 m D', verbs: 'cut free, purge, abandon', states: 'choked | cut free | purged',
        nodes: 'HB_LEVER_00..03 (breakers), FX_ORGANIC_00, INTERACTION_00',
        nearest: ['substation_breaker_interlock', 'hive_assimilated_generator', 'meridian_mainframe_altar'], tex: 'tex_turned_resin_ingress', decal: 'decal_turned_resin_veins_fan',
        noun: 'resin-choked breaker gallery', theme: 'hostile assimilation of infrastructure', mats: 'glossy black resin, bruised maroon tissue, buried breaker handles, cracked ceramic',
        body: 'a wide wall gallery of four heavy breaker interlocks half swallowed by glossy black resin that has poured out of the cable entries and hardened over the handles, maroon tissue swelling in the gaps, cracked ceramic housings and one handle still free and reachable. Thin resin threads stretch from the gallery toward the ceiling. Show three breakers buried and one free.',
        story: 'A turned Meridian lets the hive grow into its power, and the hive now decides what is lit.',
        accent: `hostile cyan pinpoints trapped inside the resin (${CYAN})`,
        accept: 'Appears when Meridian turns; cutting each handle free restores one circuit.'
    },
    {
        id: 'tallow_harvest_restored_canopy', suite: 'camp-consequence', hook: 'camp_tallow grown', room: 'Tallow hydro hall ceiling',
        place: 'overhead crop span', dims: '0.55 m H, 3.6 m W, 1.6 m D', verbs: 'harvest, drain, shelter under', states: 'dry | fruiting | harvested',
        nodes: 'HB_LID_00..05 (condensate cups), FX_DRIP_00',
        nearest: ['tallow_flesh_trellis', 'life_hydro_rack', 'life_hive_dew_funnel'], tex: 'tex_tallow_red_mold_filter_floor', decal: null,
        noun: 'restored harvest canopy', theme: 'abundant underground husbandry', mats: 'woven bone lattice, paired leaf gutters, weighted bronze cups, ripe pale fruit pods',
        body: 'a broad suspended lattice of woven bone and iron carrying paired leaf gutters full of ripe pale fruiting pods, with weighted bronze condensate cups hanging beneath to catch dripping water, all hung on chains high enough to walk under. Show it fruiting, seen from slightly below.',
        story: 'A grown Tallow eats again; the canopy shades the hall and feeds it.',
        accent: `soft lime grow-light strip along the gutters (${LIME})`,
        accept: 'Appears when Tallow grows; harvesting yields food once per day.'
    },
    {
        id: 'tallow_robbed_seed_absence_niche', suite: 'camp-consequence', hook: 'camp_tallow robbed', room: 'Tallow seed archive wall',
        place: 'wall niche', dims: '1.5 m H, 1.6 m W, 0.35 m D', verbs: 'inspect, return seed', states: 'robbed | partially returned | restored',
        nodes: 'SOCKET_00..11 (seed cavities), INTERACTION_00',
        nearest: ['hydro_mycelial_seed_vault', 'tallow_apothecary_dryer_rack', 'life_filing_cabinets'], tex: 'tex_camp_robbed_contact_dust', decal: null,
        noun: 'robbed seed archive niche', theme: 'stolen inheritance', mats: 'carved bone frame, velvet-lined oval cavities, cut restraint cords, one broken husk',
        body: 'a carved bone wall frame holding twelve velvet-lined oval seed cavities in a precise grid, eleven conspicuously empty with their restraint cords cut, the twelfth holding a single cracked husk. Dust outlines show where sealed jars once stood. Show it straight on so every empty cavity reads.',
        story: 'Proof the player robbed Tallow: the seeds of the future were taken.',
        accent: `faint lime glow from the one remaining husk (${LIME})`,
        accept: 'Replaces the seed vault display when Tallow is robbed; returning seeds fills cavities.'
    },
    {
        id: 'tallow_recruited_mobile_clinic_harness', suite: 'camp-consequence', hook: 'camp_tallow recruited', room: 'any later room (portable)',
        place: 'carry-to-install frame', dims: '1.8 m H, 1.5 m W, 0.8 m D', verbs: 'fold, carry, deploy, heal', states: 'folded | carried | deployed | depleted',
        nodes: 'HB_ARM_00..03 (legs), HB_LID_00 (dose clip), CARRY_00, INTERACTION_00',
        nearest: ['suture_mercy_cocoon_canopy', 'life_ribcage_rescue_cabinet', 'life_infusion_cradle'], tex: 'tex_recruited_packdown_canvas_floor', decal: null,
        noun: 'portable clinic harness', theme: 'mobile field mercy', mats: 'waxed canvas, bentwood loops, bronze dose clips, leather shoulder pads',
        body: 'a backpack-scale standing frame of bentwood and blackened iron that unfolds onto four splayed legs, carrying folding treatment loops, a drip hook, bronze dose clips and a small sealed medicine case, with padded leather shoulder straps so one person can carry it folded. Show it deployed on its four feet.',
        story: 'A recruited Tallow sends its care with the player, room to room.',
        accent: `lime medicine vial glowing in the dose clip (${LIME})`,
        accept: 'Carryable; deploying it creates a healing point with limited charges.'
    },
    {
        id: 'tallow_turned_spore_lockdown_iris', suite: 'camp-consequence', hook: 'camp_tallow turned', room: 'Tallow hall ceiling vent',
        place: 'ceiling aperture', dims: '0.55 m H, 2.0 m W, 2.0 m D', verbs: 'brake, reverse, purge', states: 'closed | seeding | reversed | jammed',
        nodes: 'HB_IRIS_00 (resin leaves), HB_ROTOR_00 (slow rotor), HB_ROPE_00 (brake chain), FX_SPORE_00',
        nearest: ['prop_exhaust_blower_fan_hood', 'hive_sphincter_iris', 'prop_fungal_spore_dispenser'], tex: 'tex_turned_resin_ingress', decal: null,
        noun: 'spore lockdown ceiling iris', theme: 'weaponised ventilation', mats: 'overlapping resin iris leaves, slow iron rotor, hanging brake chain, maroon gasket tissue',
        body: 'a circular ceiling aperture closed by overlapping glossy resin iris leaves that spiral open around a slow broad iron rotor, maroon gasket tissue sealing the leaf edges, and a heavy brake chain hanging down to reach height so the rotor can be stopped by hand. Show it seen from below at an angle, iris half open.',
        story: 'A turned Tallow pumps spores into its own halls; the brake chain is the only way to stop it.',
        accent: `hostile lime spore haze in the open iris (${LIME})`,
        accept: 'Seeding raises spore exposure in the room until braked or reversed.'
    },
    {
        id: 'vesper_grown_moving_target_rail', suite: 'camp-consequence', hook: 'camp_vesper grown', room: 'Vesper training range',
        place: 'floor rail, 4 m swept volume', dims: '1.7 m H, 4.0 m W, 0.6 m D', verbs: 'train, reset, compete', states: 'idle | running | scored',
        nodes: 'HB_RAIL_00 (carriage), HB_ARM_00..02 (pop-up plates), INTERACTION_00',
        nearest: ['life_training_dummy', 'vesper_ballistic_chronograph', 'life_conveyor_section'], tex: 'tex_vesper_oiled_tally_deck', decal: null,
        noun: 'moving target rail', theme: 'disciplined martial training', mats: 'dented steel plates, chain-driven carriage, oiled rail, hand crank',
        body: 'a long floor-mounted rail with a chain-driven carriage carrying three hinged steel silhouette plates that pop up and drop when struck, a hand crank and flywheel at one end, and a heavily dented backstop at the other. Every plate is pocked with impacts. Show two plates up and one down.',
        story: 'A grown Vesper trains new defenders instead of burying them.',
        accent: `amber ready lamp on the crank housing (${AMBER})`,
        accept: 'Appears when Vesper grows; a timed shooting challenge raises Vesper bond.'
    },
    {
        id: 'vesper_robbed_armory_shadowboard', suite: 'camp-consequence', hook: 'camp_vesper robbed / armory_breach aftermath', room: 'Vesper armory wall',
        place: 'wall-backed', dims: '1.4 m H, 2.4 m W, 0.2 m D', verbs: 'inspect, return, accuse', states: 'stocked | robbed | reconciled',
        nodes: 'SOCKET_00..07 (weapon clamps), INTERACTION_00',
        nearest: ['life_mask_rack', 'vesper_reloading_station', 'storage_locker'], tex: 'tex_camp_robbed_contact_dust', decal: 'decal_stolen_weapon_ghosts',
        noun: 'robbed armory shadowboard', theme: 'betrayed martial order', mats: 'iron pegboard, bright wear ghosts, snapped keeper wires, one remaining sidearm clamp',
        body: 'a large iron pegboard with painted tool-shadow outlines of rifles, shotguns and sidearms, every outline empty except one holding a single battered sidearm, snapped keeper wires dangling from the empty clamps, and pry marks around the board\'s lock bar. Show it straight on.',
        story: 'Proof the player robbed Vesper: the outlines show exactly which guns went missing.',
        accent: `a red alarm lamp on the broken lock bar (${RED})`,
        accept: 'Replaces the stocked rack when Vesper is robbed; returning weapons refills outlines.'
    },
    {
        id: 'vesper_recruited_gun_limber', suite: 'camp-consequence', hook: 'camp_vesper recruited', room: 'Vesper gate, later the player\'s base perimeter',
        place: 'floor, towable', dims: '1.3 m H, 2.4 m W, 1.5 m D', verbs: 'limber, tow, unlimber', states: 'parked | limbered | emplaced',
        nodes: 'HB_ROTOR_00 / HB_ROTOR_01 (wheels), HB_ARM_00 (tow bar), CARRY_00, INTERACTION_00',
        nearest: ['vesper_autocannon_bipod', 'life_ore_cart', 'prop_ammo_crate_stack'], tex: 'tex_recruited_packdown_canvas_floor', decal: 'decal_packdown_drag_route',
        noun: 'two-wheeled gun limber', theme: 'old-world artillery logistics', mats: 'iron-shod spoked wheels, oiled timber axle box, strapped ammunition chests, steel tow bar',
        body: 'a two-wheeled towing limber with tall iron-shod spoked wheels, an axle box carrying two strapped ammunition chests, a cradle on top holding a folded autocannon barrel and bipod, and a long steel tow bar with a hand grip. Show it limbered and ready to tow.',
        story: 'A recruited Vesper rolls its guns out with the player.',
        accent: `amber safety lamp on the tow bar (${AMBER})`,
        accept: 'Towable; unlimbering at base emplaces a turret.'
    },
    {
        id: 'vesper_turned_execution_interlock', suite: 'camp-consequence', hook: 'camp_vesper turned', room: 'Vesper door threshold',
        place: 'door-side wall mechanism', dims: '1.8 m H, 1.2 m W, 0.45 m D', verbs: 'disarm, brace, trigger', states: 'safe | armed | tripped | jammed',
        nodes: 'HB_LEVER_00 (restraint bar), HB_ROD_00..02 (linkage rods), INTERACTION_00',
        nearest: ['prop_laser_trap_emitter', 'corp_compliance_choker_bench', 'substation_breaker_interlock'], tex: 'tex_turned_resin_ingress', decal: null,
        noun: 'execution-lane interlock', theme: 'cold hostile fortification', mats: 'spring-loaded restraint bar, exposed linkage rods, resin-fouled pivots, heavy coil springs',
        body: 'a wall mechanism beside a doorway with a heavy spring-loaded restraint bar, exposed rods running down into the floor toward hidden firing ports, coil springs under tension, and resin fouling the pivots; releasing the bar locks the other rods. Show it armed with the bar cocked back.',
        story: 'A turned Vesper booby-traps its own door; disarming it is a timing puzzle.',
        accent: `red armed lamp at the top of the bar (${RED})`,
        accept: 'Armed state damages the door lane; disarming makes it safe and persists.'
    },
    // --- Alien covenants: Nahl / Suture, Vey / Relay, Rhun / Carapace ---
    {
        id: 'nahl_covenant_suture_knot', suite: 'alien-covenant', hook: 'Nahl / Suture covenant', room: 'Suture hive threshold',
        place: 'waist-high shared-work anchor', dims: '1.25 m H, 1.4 m W, 1.1 m D', verbs: 'bind, witness, unbind', states: 'offered | accepted | refused',
        nodes: 'HB_ARM_00 / HB_ARM_01 (bone hoops), HB_ROPE_00 (seam), INTERACTION_00',
        nearest: ['suture_flesh_mending_bath', 'life_umbilical_tether', 'prop_biomech_triage_cradle'], tex: 'tex_covenant_two_hand_ivory', decal: 'decal_nahl_covenant_loop',
        noun: 'covenant suture knot', theme: 'alien mending covenant', mats: 'pale bone hoops, flexible suture seam, dark resin clasp, polished contact grips',
        body: 'two separate pale bone hoops on a low iron stand, one sized for human hands and one for three-fingered alien grips, joined by a flexible stitched seam that a player can thread through both and pull tight into a central resin clasp. Show the seam loosely threaded, clasp open.',
        story: 'Nahl offers to mend rather than consume; binding the knot accepts that covenant.',
        accent: `pale cyan glow in the resin clasp (${CYAN})`,
        accept: 'Accept and refuse states persist and change Suture behaviour; unbinding is possible once.'
    },
    {
        id: 'nahl_gift_mercy_carrier', suite: 'alien-covenant', hook: 'Nahl gift', room: 'Suture hive, then carried',
        place: 'carryable floor object', dims: '0.65 m H, 0.95 m W, 0.55 m D', verbs: 'accept, carry, apply', states: 'offered | carried | spent | refused',
        nodes: 'HB_LID_00 / HB_LID_01 (split leaves), CARRY_00, INTERACTION_00',
        nearest: ['suture_mercy_cocoon_canopy', 'life_ribcage_rescue_cabinet', 'prop_flesh_steel_inhaler'], tex: 'tex_covenant_two_hand_ivory', decal: null,
        noun: 'mercy pouch carrier', theme: 'gifted alien medicine', mats: 'closed rib cage, translucent regenerative pouch, split protective leaves, bone handles',
        body: 'a closed carrier of curved ribs on a flat base cradling one softly lit translucent regenerative pouch, protected by two split leaves that fold back when it is used, with two bone carrying handles on the ends. Show leaves slightly parted.',
        story: 'Nahl\'s gift of healing, carried by a human who once would have been eaten.',
        accent: `soft lime glow inside the pouch (${LIME})`,
        accept: 'Carryable; applying it fully heals once and is spent.'
    },
    {
        id: 'nahl_refusal_cautery_scar', suite: 'alien-covenant', hook: 'Nahl refusal', room: 'Suture hive wall',
        place: 'wall evidence relief', dims: '1.1 m H, 1.5 m W, 0.18 m D', verbs: 'inspect, reconsider', states: 'fresh | healed | reopened',
        nodes: 'INTERACTION_00',
        nearest: ['state_wall_breached_01', 'prop_flesh_steel_cradle', 'hive_tendril_arch'], tex: 'tex_refusal_cautery_scale', decal: 'decal_refusal_cautery_fan',
        noun: 'cautery refusal scar relief', theme: 'withdrawn alien trust', mats: 'calcified seam, heat-darkened contact pads, pale healed margins, cracked chitin plate',
        body: 'a shallow relief panel set into the wall where a living connection once grew through: a long calcified seam cleanly closed at the centre, two heat-darkened contact pads at either end where tendrils were burned back, and pale healed margins. Show it slightly angled so the relief reads.',
        story: 'Where Nahl withdrew after the player refused; the wall remembers.',
        accent: `a faint amber ember line in the seam (${AMBER})`,
        accept: 'Appears after refusal; reconsidering is possible once, reopening the seam.'
    },
    {
        id: 'nahl_shared_repair_tendon_jig', suite: 'alien-covenant', hook: 'Nahl shared work', room: 'Suture workroom',
        place: 'floor work zone', dims: '1.1 m H, 2.0 m W, 0.9 m D', verbs: 'tension, release, repair', states: 'slack | aligned | repaired | torn',
        nodes: 'HB_ROTOR_00 (ratchet), HB_ARM_00 (chitin draw), SOCKET_00 (repair socket), INTERACTION_00',
        nearest: ['engineer_robotic_welding_arm', 'carapace_chitin_press', 'prop_maintenance_tool_cart'], tex: 'tex_covenant_two_hand_ivory', decal: null,
        noun: 'shared tendon repair jig', theme: 'interspecies craft', mats: 'steel ratchet frame, flexible chitin draw arm, wet tendon cords, brass repair socket',
        body: 'an asymmetric stretching frame with a steel ratchet and handle on the human side and a flexible chitin draw arm on the alien side, both pulling on taut wet tendon cords that meet at a brass repair socket holding a damaged machine part. Show the cords half tensioned.',
        story: 'The first thing humans and Nahl build together: a repair neither could do alone.',
        accent: `cyan alignment lamp at the repair socket (${CYAN})`,
        accept: 'A two-step timing interaction; succeeding repairs a broken room machine.'
    },
    {
        id: 'vey_covenant_twin_listening_cowl', suite: 'alien-covenant', hook: 'Vey / Relay covenant', room: 'Relay hive meeting chamber',
        place: 'floor, walk-in', dims: '2.3 m H, 2.2 m W, 1.4 m D', verbs: 'stand in, listen together, close', states: 'offered | shared | closed',
        nodes: 'HB_DOOR_00 / HB_DOOR_01 (spine shutters), INTERACTION_00',
        nearest: ['relay_acoustic_diaphragm', 'life_acoustic_ear_horn', 'life_confessional'], tex: 'tex_covenant_two_hand_ivory', decal: 'decal_vey_resonance_nodes',
        noun: 'twin listening cowl', theme: 'shared alien hearing rite', mats: 'two hooded bone alcoves, resonant shared spine, membrane shutters, worn kneeling pads',
        body: 'two facing hooded alcoves of curved bone, one shaped for a human and one taller and narrower for a Vey, joined back to back by a single resonant spine that runs between their hoods, with membrane shutters along the spine that open to let the two listeners hear each other. Show the shutters half open.',
        story: 'Vey speaks through hearing; standing in the cowl together is the covenant.',
        accent: `cyan resonance glow along the open spine (${CYAN})`,
        accept: 'Accepting requires the player to stand in it while Vey stands opposite; closed persists on refusal.'
    },
    {
        id: 'vey_gift_route_memory_orb', suite: 'alien-covenant', hook: 'Vey gift', room: 'Relay hive, then a navigation socket',
        place: 'tabletop, socketable', dims: '0.48 m diameter', verbs: 'accept, carry, install, reveal', states: 'offered | carried | installed | refused',
        nodes: 'CARRY_00, SOCKET_00',
        nearest: ['ship_module_navigation_core', 'vass_containment_bell_jar', 'scout_tracking_beacon_core'], tex: 'tex_covenant_two_hand_ivory', decal: null,
        noun: 'route memory orb', theme: 'gifted alien navigation', mats: 'dense translucent sphere, suspended filament path, three-finger iron travel cage, frosted contact pads',
        body: 'a dense translucent sphere crossed inside by one suspended glowing filament that traces a branching route like a remembered path, held in a three-finger travel cage of blackened iron with frosted contact pads. Show it in the cage.',
        story: 'Vey gives the player one route it remembers, which no map shows.',
        accent: `cyan filament glow inside the orb (${CYAN})`,
        accept: 'Installing it in a navigation socket reveals one hidden route on the map.'
    },
    {
        id: 'vey_refusal_silence_baffle', suite: 'alien-covenant', hook: 'Vey refusal', room: 'Relay hive corner',
        place: 'wall or ceiling corner', dims: '1.6 m H, 1.8 m W, 0.7 m D', verbs: 'open, close, listen', states: 'open | sealed | torn',
        nodes: 'HB_DOOR_00 (folding baffle), INTERACTION_00',
        nearest: ['relay_acoustic_diaphragm', 'prop_wall_cable_tray_swag', 'fixture_sconce_vine'], tex: 'tex_refusal_cautery_scale', decal: null,
        noun: 'silence baffle', theme: 'deliberate alien withdrawal', mats: 'layered folded baffle panels, severed tuning filament, felt-dark acoustic void, iron hinges',
        body: 'a corner-mounted stack of layered folding baffle panels closed tightly around a severed tuning filament, leaving a narrow black acoustic void between them, with heavy iron hinges and pale dust on every upper edge. Show it sealed.',
        story: 'When Vey is refused it stops listening; the room goes dead quiet.',
        accent: `a single faint cyan point deep in the void (${CYAN})`,
        accept: 'Sealing it removes ambient Relay audio from the room until opened.'
    },
    {
        id: 'vey_shared_signal_braider', suite: 'alien-covenant', hook: 'Vey shared work', room: 'Relay signal room',
        place: 'standing work anchor', dims: '1.6 m H, 1.2 m W, 1.0 m D', verbs: 'crank, align, connect', states: 'unthreaded | braiding | connected | snapped',
        nodes: 'HB_ROTOR_00 (crank), HB_ARM_00 (sensory comb), SOCKET_00 (outgoing cable)',
        nearest: ['meridian_soldering_hearth', 'relay_harmonic_tuning_fork', 'life_umbilical_tether'], tex: 'tex_covenant_two_hand_ivory', decal: null,
        noun: 'shared signal braider', theme: 'interspecies signal craft', mats: 'brass hand crank, flexible sensory comb, metallic and organic filaments, braided outgoing cable',
        body: 'a standing machine where a brass hand crank turns a braiding head that twists metallic wires from one spool and pale organic filaments drawn through a flexible sensory comb into a single braided cable leaving through a socket at the base. Show the braid half made.',
        story: 'Human copper and Vey nerve spun into one line, so both can speak on it.',
        accent: `cyan pulse where the braid joins (${CYAN})`,
        accept: 'A cooperative crank interaction that connects an isolated room to the Relay network.'
    },
    {
        id: 'rhun_covenant_weight_stone', suite: 'alien-covenant', hook: 'Rhun / Carapace covenant', room: 'Carapace ritual floor',
        place: 'floor ritual anchor', dims: '0.9 m H, 1.25 m W, 1.25 m D', verbs: 'lift together, witness, set down', states: 'offered | raised | accepted | refused',
        nodes: 'HB_ARM_00 (lifting frame), INTERACTION_00',
        nearest: ['carapace_ossuary_anvil', 'salvage_tagged_heap', 'sector_zero_bore_drillhead'], tex: 'tex_covenant_two_hand_ivory', decal: 'decal_rhun_weight_set',
        noun: 'covenant weight stone', theme: 'shared physical oath', mats: 'squat black stone weight, iron lifting frame, leather human grip, carapace shoulder socket',
        body: 'a squat black stone weight captured in an iron lifting frame with a leather-wrapped human hand grip on one side and a broad curved carapace shoulder socket on the other, so it can only be raised by both together. Show it at rest on its frame.',
        story: 'Rhun trusts what is carried together; lifting the stone is the oath.',
        accent: `amber ember in the stone\'s core visible through a crack (${AMBER})`,
        accept: 'Accepting requires holding the lift with Rhun for a duration.'
    },
    {
        id: 'rhun_gift_load_bearing_yoke', suite: 'alien-covenant', hook: 'Rhun gift (ties to the carry system)', room: 'Carapace hive, then worn',
        place: 'carryable / installable', dims: '0.7 m H, 1.2 m W, 0.6 m D', verbs: 'accept, wear, carry heavy', states: 'offered | worn | broken | refused',
        nodes: 'CARRY_00, HB_ARM_00 / HB_ARM_01 (shoulder plates)',
        nearest: ['life_bone_clamp_rig', 'carry_field_cot_folded', 'prop_exosuit_docking_gantry'], tex: 'tex_covenant_two_hand_ivory', decal: null,
        noun: 'carapace load yoke', theme: 'gifted alien strength', mats: 'curved carapace shoulder plates, leather lashings, iron cargo hooks, polished contact pads',
        body: 'a curved shoulder yoke made of two shed carapace plates joined by leather lashings and an iron spine, with cargo hooks hanging at each end and polished contact pads where it rests on a suit. Show it upright on its own stand.',
        story: 'Rhun gives the strength to carry heavy cargo without slowing, if the player accepts its gift.',
        accent: `amber stress glow along the spine (${AMBER})`,
        accept: 'While worn, heavy carry no longer disables sprint; it can break from heavy hits.'
    },
    {
        id: 'rhun_refusal_split_anvil_wedge', suite: 'alien-covenant', hook: 'Rhun refusal (state of carapace_ossuary_anvil)', room: 'Carapace forge',
        place: 'floor evidence', dims: '0.75 m H, 1.3 m W, 0.8 m D', verbs: 'inspect, remove wedge', states: 'split | rejoined | abandoned',
        nodes: 'HB_LID_00 (wedge), INTERACTION_00',
        nearest: ['carapace_ossuary_anvil', 'state_column_shattered', 'carapace_chitin_press'], tex: 'tex_refusal_cautery_scale', decal: null,
        noun: 'split shared anvil', theme: 'broken interspecies craft', mats: 'cleaved bone-iron anvil, pale wedge, chipped faces, scorched dovetail',
        body: 'a once-shared anvil cleaved cleanly along its central dovetail into two halves held apart by a pale driven wedge, chips scattered at the base and both faces scorched. Show the gap clearly.',
        story: 'Refusing Rhun splits what was built together.',
        accent: `amber heat still in the cut faces (${AMBER})`,
        accept: 'Replaces the shared anvil on refusal; removing the wedge is a late reconciliation verb.'
    },
    {
        id: 'rhun_shared_breach_brace', suite: 'alien-covenant', hook: 'Rhun shared work (traversal)', room: 'collapsed hive passage',
        place: 'wall opening', dims: '2.3 m H, 2.7 m W, 0.8 m D', verbs: 'brace, release, pass', states: 'collapsed | braced | failed',
        nodes: 'HB_ARM_00 (telescoping jack), HB_ARM_01 (shoulder cup)',
        nearest: ['state_wall_breached_03', 'prop_exosuit_docking_gantry', 'tank_kinetic_ram_breech'], tex: 'tex_covenant_two_hand_ivory', decal: null,
        noun: 'shared breach brace', theme: 'joint load-bearing labour', mats: 'angled telescoping hydraulic jack, broad organic shoulder cup, fractured stone aperture, iron foot plate',
        body: 'an angled telescoping hydraulic jack braced against the edge of a fractured wall opening, ending in a broad organic shoulder cup shaped for a carapace back, with an iron foot plate and a pump handle on the human end. Show it holding the opening.',
        story: 'Humans and Rhun hold a collapsed passage open together long enough to get through.',
        accent: `amber pressure gauge glow on the jack (${AMBER})`,
        accept: 'Bracing opens a route for a timed window; failure collapses it.'
    },
    // --- Act 2 boarding and ending states ---
    {
        id: 'evac_passenger_muster_abacus', suite: 'ending', hook: 'Act 2 boarding: seat count', room: 'escape vessel boarding threshold',
        place: 'wall-backed boarding threshold', dims: '1.7 m H, 2.1 m W, 0.45 m D', verbs: 'assign, board, remove', states: 'empty | queued | full | contested',
        nodes: 'HB_RAIL_00..03 (captive beads), HB_LOCK_00 (exclusion stop)',
        nearest: ['evac_manifest_allocation_terminal', 'life_tally_bulkhead', 'evac_four_seat_cockpit_module'], tex: 'tex_evac_queue_burnished_deck', decal: 'decal_evac_muster_positions',
        noun: 'passenger muster abacus', theme: 'desperate evacuation logistics', mats: 'heavy captive bronze beads, polished steel rails, oversized exclusion stop, gunmetal frame',
        body: 'a wall-mounted gunmetal frame with four heavy captive bronze beads that slide between a waiting rail and a boarded rail, each bead the size of a fist, and one oversized iron exclusion stop that blocks the boarded rail once four are across. Show two beads boarded.',
        story: 'Four seats; the abacus makes the choice of who boards physical and visible.',
        accent: `amber light behind the boarded rail (${AMBER})`,
        accept: 'Bead positions mirror the boarding state; the stop locks at four.'
    },
    {
        id: 'evac_queen_restraint_arc', suite: 'ending', hook: 'Act 2 ending: Queen aboard', room: 'escape vessel cargo bay',
        place: 'floor to ceiling span', dims: '2.5 m H, 3.0 m W, 1.2 m D', verbs: 'secure, release, sabotage', states: 'open | occupied | locked | breached',
        nodes: 'HB_ARM_00..02 (collar segments), HB_LEVER_00 / HB_LEVER_01 (manual releases)',
        nearest: ['queen_royal_brood_throne', 'mothership_docking_umbilical_collar', 'corp_compliance_choker_bench'], tex: 'tex_evac_coldchain_frost_deck', decal: 'decal_queen_restraint_sweep',
        noun: 'Queen restraint arc', theme: 'terrifying royal containment', mats: 'tall blackened steel arc, three heavy collar segments, redundant release levers, frost and claw scoring',
        body: 'a tall open arc of blackened steel spanning floor to ceiling, with three heavy curved collar segments that swing closed around something enormous, two redundant manual release levers on opposite sides, and deep claw scoring on the inner faces. Show it open.',
        story: 'Taking the Queen aboard means trusting this arc to hold her.',
        accent: `red lock lamps on both release levers (${RED})`,
        accept: 'Exists only in the Queen-aboard ending; sabotage leads to a breach event.'
    },
    {
        id: 'evac_egg_coldchain_harness', suite: 'ending', hook: 'Act 2 ending: eggs aboard', room: 'escape vessel cargo floor',
        place: 'cargo floor frame', dims: '1.4 m H, 2.4 m W, 1.4 m D', verbs: 'load, cool, jettison', states: 'empty | loaded | stable | warming',
        nodes: 'SOCKET_00..03 (egg slings), FX_FROST_00, HB_LEVER_00 (jettison)',
        nearest: ['royal_egg_clutch_caul', 'evac_cryo_hypergolic_manifold', 'corp_cryo_transport_coffin'], tex: 'tex_evac_coldchain_frost_deck', decal: 'decal_egg_harness_condensate',
        noun: 'egg cold-chain harness', theme: 'forbidden cargo engineering', mats: 'four suspended slings, independent coolant loops, sprung impact stops, frosted insulated frame',
        body: 'a low insulated frame holding four suspended sling cells for large eggs, each with its own coiled coolant loop and sprung impact stops, frost growing only along the coolant paths, and a red jettison lever at the end. Show it empty.',
        story: 'Carrying eggs off-world needs a cold chain that cannot fail.',
        accent: `cyan coolant glow along the loops (${CYAN})`,
        accept: 'Eggs ending only; a warming cell is a failure risk during launch.'
    },
    {
        id: 'evac_mixed_crew_translation_rail', suite: 'ending', hook: 'Act 2 ending: mixed crew', room: 'escape vessel cabin wall',
        place: 'cabin wall rail', dims: '1.1 m H, 2.6 m W, 0.35 m D', verbs: 'connect, translate, disconnect', states: 'idle | paired | overloaded',
        nodes: 'HB_RAIL_00 (translator shuttle), SOCKET_00..03',
        nearest: ['vass_translation_phonograph', 'life_cochlear_intercom', 'relay_harmonic_tuning_fork'], tex: 'tex_evac_queue_burnished_deck', decal: null,
        noun: 'mixed-crew translation rail', theme: 'fragile interspecies cohabitation', mats: 'polished brass rail, worn black leather earpieces, slender pale alien contact vanes, cloth-wrapped drop cords',
        body: 'a continuous brass rail along a cabin wall carrying interchangeable human earpieces and narrow alien contact vanes on drop cords, linked by one travelling translator shuttle that rides between them. Show the shuttle mid-rail.',
        story: 'A mixed crew shares one fragile way to understand each other.',
        accent: `cyan glow in the shuttle (${CYAN})`,
        accept: 'Mixed-crew ending only; overload causes a communication blackout event.'
    },
    {
        id: 'evac_empty_seat_memorial_latches', suite: 'ending', hook: 'Act 2 ending: empty seats / Scorched Sky', room: 'escape vessel cockpit',
        place: 'four-seat cabin detail', dims: '0.65 m H, 2.4 m W, 0.35 m D', verbs: 'place keepsake, remove', states: 'empty | remembered | stripped',
        nodes: 'SOCKET_00..03 (latch pairs)',
        nearest: ['evac_four_seat_cockpit_module', 'life_memorial_board', 'vesper_dogtag_retrieval_crypt'], tex: 'tex_camp_private_worn_felt', decal: null,
        noun: 'empty-seat memorial latches', theme: 'quiet loss in flight', mats: 'scratched steel latch plates, frayed grey harness webbing, small hand-shaped keepsake cradles, one tarnished dog tag',
        body: 'a row of four aligned harness latch pairs on a steel bar with frayed webbing ends, each pair fitted with a small cradle that can hold one returned keepsake instead of a passenger. Show one cradle holding a small dog tag and three empty.',
        story: 'In the Scorched Sky ending the seats fly empty, and the latches remember who should be there.',
        accent: `amber lamp above the one occupied cradle (${AMBER})`,
        accept: 'Keepsakes collected during the run appear in the latches.'
    },
    {
        id: 'evac_boarding_vote_turnstile', suite: 'ending', hook: 'Act 2 final vote', room: 'boarding threshold',
        place: 'threshold mechanism', dims: '1.3 m H, 1.5 m W, 1.5 m D', verbs: 'vote, commit, pass', states: 'uncommitted | selected | locked',
        nodes: 'HB_ROTOR_00 (three-arm gate), HB_LOCK_00 (drop pawl), SOCKET_00..02 (witness keys)',
        nearest: ['tina_forged_council_ballot_box', 'evac_manifest_allocation_terminal', 'base_door_sealable_bulkhead'], tex: 'tex_evac_queue_burnished_deck', decal: 'decal_vote_turnstile_wear',
        noun: 'boarding vote turnstile', theme: 'irreversible collective choice', mats: 'three-armed iron gate, faction witness keys, visible drop pawl, burnished hub',
        body: 'a waist-high three-armed iron turnstile on a burnished hub, with three interchangeable faction witness keys slotted into the arms and a visible heavy drop pawl underneath that locks it permanently once turned. Show it uncommitted.',
        story: 'The final vote is not a menu; it is a gate that only turns one way.',
        accent: `red pawl lamp under the hub (${RED})`,
        accept: 'Turning commits the vote; the pawl prevents reversal.'
    },
    {
        id: 'evac_launch_mass_trim_track', suite: 'ending', hook: 'Act 2 launch balance', room: 'escape vessel floor',
        place: 'floor recess', dims: '0.25 m H, 4.0 m W, 0.8 m D', verbs: 'push, lock, rebalance', states: 'centred | fore | aft | jammed',
        nodes: 'HB_RAIL_00 (ballast carriage), HB_LOCK_00..03 (detents)',
        nearest: ['evac_cargo_ballast_scale', 'life_conveyor_section', 'life_forklift'], tex: 'tex_moving_floor_recess_grease', decal: null,
        noun: 'launch mass-trim track', theme: 'precise launch engineering', mats: 'graphite-greased steel rails, dense blackened cast-iron ballast, polished bronze detent teeth, chalky scuffed deck paint',
        body: 'a long shallow recess set into the deck, lined with two polished steel rails and packed with black graphite grease, carrying one dense square iron ballast block on a low four-wheeled carriage. Four tactile spring detents along the track line up with the four seat zones, each detent a raised bronze tooth the carriage clicks over, and a heavy T-shaped push handle folds up from the block. Chalky scuff arcs show where the block has been shoved back and forth in a hurry. Show the block resting one detent off centre.',
        story: 'Every passenger and crate the player lets aboard shifts the vessel\'s balance, and someone has to shove the ballast to the right detent before launch.',
        accent: `amber balance lamp at the centre detent (${AMBER})`,
        accept: 'An unbalanced launch damages the vessel in the launch sequence.'
    },
    {
        id: 'evac_crew_belongings_mesh', suite: 'ending', hook: 'Act 2 boarding: who comes', room: 'escape vessel ceiling',
        place: 'ceiling cargo net', dims: '0.35 m H, 2.8 m W, 1.8 m D', verbs: 'attach, inspect, cut loose', states: 'empty | partial | full | cut',
        nodes: 'SOCKET_00..11 (attachment loops), HB_ROPE_00..05 (closure toggles)',
        nearest: ['life_cargo_pallet_netted', 'camp_canvas_tent', 'life_umbilical_tether'], tex: 'tex_ceiling_service_condensate', decal: null,
        noun: 'overhead belongings mesh', theme: 'what people carry when they leave', mats: 'tarred hemp rope over steel cable, hand-carved oak toggles, forged ceiling rings with condensation streaks, frayed cut ends',
        body: 'a taut overhead cargo net of tarred rope and steel cable slung between four forged ceiling rings, its underside lined with distinct empty attachment loops of different sizes meant to hold one personal object each: a bag, a boot, a folded coat, a sealed box. Six carved wooden closure toggles cinch the edges, and one corner is frayed where it has been cut loose before. Show it from below and slightly to one side, empty and sagging gently.',
        story: 'What people take when they leave says who they were; the mesh fills only with the belongings of those who actually board.',
        accent: `small amber cabin lamp at one corner ring (${AMBER})`,
        accept: 'Belongings of boarded NPCs appear as attached props.'
    },
    {
        id: 'evac_infection_screening_arch', suite: 'ending', hook: 'Act 2 boarding: infection check', room: 'boarding aperture',
        place: 'threshold aperture', dims: '2.5 m H, 2.3 m W, 0.7 m D', verbs: 'sample, clear, quarantine', states: 'idle | sampling | clear | flagged',
        nodes: 'HB_ARM_00 / HB_ARM_01 (sampling paddles), HB_DOOR_00 (quarantine gate)',
        nearest: ['decon_exosuit_scrubber_station', 'prop_biomech_respirator', 'base_door_sealable_bulkhead'], tex: 'tex_evac_coldchain_frost_deck', decal: null,
        noun: 'boarding infection screening arch', theme: 'paranoid final checkpoint', mats: 'chipped sterile white enamel over cold steel, padded oxblood leather paddles, racked glass sample vials, oiled scissor linkages',
        body: 'a narrow pass-through arch of sterile white enamelled steel, wide enough for one suited person, with two opposed padded sampling paddles on scissor arms that close on the chest from either side, a row of glass sample vials racked in the lintel, and a heavy mechanical quarantine gate below waist height that drops across the passage if a sample fails. The enamel is chipped at shoulder height where people have pushed through. Show the paddles open and the gate raised.',
        story: 'Everyone boarding is tested at the arch, including the player, whose own infection may decide where they end up.',
        accent: `red flag lamp at the top of the arch (${RED})`,
        accept: 'A flagged passenger is diverted; the player\'s own infection state is tested here.'
    },
    {
        id: 'evac_turned_passenger_jettison_seat', suite: 'ending', hook: 'Act 2 ending: turned passenger', room: 'escape vessel rear bulkhead',
        place: 'rear-facing bulkhead seat', dims: '1.6 m H, 0.9 m W, 0.9 m D', verbs: 'secure, sedate, jettison', states: 'empty | secured | struggling | jettisoned',
        nodes: 'HB_LOCK_00 (sealing collar), HB_DOOR_00 (floor hatch), HB_LEVER_00',
        nearest: ['corp_interrogation_chair', 'life_vertebral_restraint_rack', 'evac_four_seat_cockpit_module'], tex: 'tex_evac_coldchain_frost_deck', decal: null,
        noun: 'turned-passenger jettison seat', theme: 'merciless containment in flight', mats: 'scarred gunmetal seat shell, cracked black leather head pad, frost-dulled restraint webbing, red-painted hatch dogs',
        body: 'a rear-facing seat bolted hard against a bulkhead, its steel shell padded only at the head, with three heavy restraint bands across chest, waist and thighs, a hinged two-piece sealing collar that closes around the occupant\'s neck and shoulders, and a square quick-release floor hatch directly beneath the seat held by four exposed dogs. A red pull lever on a long rod sits out of reach of the seat. Show it empty with the collar open and the hatch closed.',
        story: 'If a passenger turns mid-flight, the crew can hold them in this seat, or pull the lever and drop them into the dark.',
        accent: `red lamp on the jettison lever (${RED})`,
        accept: 'Turned-passenger ending only; jettison is permanent.'
    },
    // --- Traversal mechanisms that change reachability ---
    {
        id: 'traversal_ballast_tilt_floor', suite: 'traversal', hook: 'carry system puzzle', room: 'chasm and gantry rooms',
        place: 'multi-cell floor slab, swept volume', dims: '0.6 m H, 3.5 m W, 1.5 m D', verbs: 'load cargo, tilt, climb', states: 'flat | tilted | jammed',
        nodes: 'HB_PIVOT_00 (slab), SOCKET_00 (weight pan)',
        nearest: ['evac_cargo_ballast_scale', 'chasm_broken_catwalk', 'life_scaffold_tower'], tex: 'tex_moving_floor_recess_grease', decal: null,
        noun: 'ballast tilt floor slab', theme: 'counterweight traversal engineering', mats: 'riveted soot-black steel plate, grease-packed bronze pivot bearing, ribbed anti-slip treads, bright scrape arcs',
        body: 'a long heavy steel floor slab spanning several floor cells, balanced on a central pivot bearing packed with grease, with a deep riveted weight pan sunk into one end and a ribbed anti-slip ramp surface on the other. Placing heavy cargo in the pan tilts the far end up into a ramp that meets a raised ledge; two side guide rails and a stop block keep it from overshooting. Heavy scrape arcs on the surrounding floor show its travel. Show it flat with the pan empty.',
        story: 'Carried cargo becomes a key: the player learns that weight in the right place opens the way up.',
        accent: `amber lamp at the pivot (${AMBER})`,
        accept: 'Placing a heavy carry object in the pan tilts it into a ramp; removing it flattens.'
    },
    {
        id: 'traversal_flood_baffle_wedge', suite: 'traversal', hook: 'liquid hazard routing', room: 'sump and flood rooms',
        place: 'threshold floor', dims: '0.55 m H, 2.5 m W, 0.8 m D', verbs: 'raise, lower, redirect', states: 'flat | left-route | right-route | broken',
        nodes: 'HB_PIVOT_00 (baffle), HB_LEVER_00',
        nearest: ['tallow_irrigation_sluice_gate', 'prop_floor_drainage_sump_trough', 'prop_coolant_drum_leaking_pool'], tex: 'tex_flood_tide_mineral', decal: 'decal_flood_baffle_tide',
        noun: 'flood baffle wedge', theme: 'brutal water control', mats: 'heavy pitted plate steel, compressed black rubber seal, pale mineral tide crust, oiled ratchet teeth',
        body: 'a heavy triangular steel baffle that lies flush in a floor recess and rises on a recessed hinge to stand across a flooded channel at an angle, splitting flowing liquid to the left or right lane. Side gutters with mineral-crusted lips make the flow direction obvious, a long ratchet lever raises and locks it, and the lower edge carries a thick rubber seal. Pale salt tide lines mark both sides. Show it raised and angled toward one side.',
        story: 'Turning the flood one way opens a dry route and drowns the other; the player decides which.',
        accent: `amber lamp on the lever (${AMBER})`,
        accept: 'Raising it moves a world liquid pool from one lane to the other.'
    },
    {
        id: 'traversal_floor_recess_lift_drum', suite: 'traversal', hook: 'level change', room: 'gantry and bore rooms',
        place: 'floor recess', dims: '0.5 m H, 2.2 m diameter', verbs: 'call, ride, stop', states: 'lowered | rising | raised | stalled',
        nodes: 'HB_LIFT_00 (platform), HB_ARM_00..02 (guide posts)',
        nearest: ['chasm_hanging_elevator', 'life_forklift', 'prop_exosuit_docking_gantry'], tex: 'tex_moving_floor_recess_grease', decal: 'decal_lift_recess_rim',
        noun: 'floor-recess lift drum', theme: 'buried heavy machinery', mats: 'machined steel platform, retracting bronze petals, polished hydraulic ram chrome, scuffed hazard paint on the rim',
        body: 'a flush circular steel platform about two metres across, set into a matching floor recess, with concentric locking petals around its rim that retract as it rises, three telescoping guide posts that extend from the recess edge to steady it, and a thick hydraulic ram visible in the gap beneath. A call button housing sits on one guide post and the recess rim is scuffed with pinch-point warning paint. Show it raised a hand\'s height above the floor, petals retracted.',
        story: 'A buried lift that carries the player up to a level the corridor never reaches.',
        accent: `amber call lamp on one guide post (${AMBER})`,
        accept: 'Riding it moves the player between two authored heights.'
    },
    {
        id: 'traversal_collapsible_chasm_stitcher', suite: 'traversal', hook: 'portable crossing', room: 'chasm rooms',
        place: 'carry-to-install', dims: '0.8 m H, 1.8 m W, 0.7 m D folded', verbs: 'carry, anchor, tension, cross', states: 'folded | anchored | tensioned | failed',
        nodes: 'CARRY_00, HB_ARM_00 / HB_ARM_01 (grapnels), HB_ROTOR_00 (ratchet)',
        nearest: ['chasm_rappel_anchor', 'chasm_broken_catwalk', 'life_rope_anchor_post'], tex: 'tex_recruited_packdown_canvas_floor', decal: null,
        noun: 'collapsible chasm stitcher', theme: 'desperate portable traversal', mats: 'riveted hinged steel segments, hardened grapnel teeth, waxed soot canvas straps, worn leather harness',
        body: 'a folded ladder-like spine of riveted steel segments, each hinged to the next, with a heavy opposed grapnel jaw at either end that fires and bites into rock or metal, and a central ratchet tensioner with a long pump handle that pulls the spine rigid once both jaws are set. Waxed canvas straps and a shoulder harness let one person carry it folded. Show it folded and strapped, grapnels tucked.',
        story: 'A bridge the player carries to where no bridge is; it will hold once, and maybe not twice.',
        accent: `amber tension lamp on the ratchet (${AMBER})`,
        accept: 'Installing it across a gap creates a crossing that can fail once.'
    },
    {
        id: 'traversal_door_pressure_equalizer_bladder', suite: 'traversal', hook: 'wrong-side door opening', room: 'sealed bulkhead thresholds',
        place: 'carry-to-install at a door', dims: '1.2 m H, 1.0 m W, 0.8 m D', verbs: 'carry, couple, bleed', states: 'stored | coupled | bled | burst',
        nodes: 'CARRY_00, HB_ROPE_00 (coupling hose), HB_LEVER_00 (bleed valve)',
        nearest: ['base_door_sealable_bulkhead', 'prop_oxygen_bottle_cascade_rack', 'life_hive_feeding_bladder'], tex: 'tex_moving_floor_recess_grease', decal: null,
        noun: 'door pressure equaliser bladder', theme: 'improvised pressure engineering', mats: 'patched black vulcanised rubber, rust-pitted iron cage bars, braided reinforced hose, brass door-port lugs',
        body: 'a heavy rubberised bladder bulging inside an iron cage frame with four carry handles, a coiled reinforced coupling hose ending in a brass door-port fitting with locking lugs, and a large bleed valve with a pressure gauge on top of the cage. The rubber is patched in places and the cage feet are worn from being dragged. Show it full and taut, hose coiled.',
        story: 'Some sealed pressure doors can only be opened from the other side, unless the player brings the pressure with them.',
        accent: `amber pressure lamp on the cage (${AMBER})`,
        accept: 'Coupling it to a sealed door and bleeding opens that door.'
    },
    {
        id: 'traversal_wall_coring_chain', suite: 'traversal', hook: 'shortcut cutting', room: 'bunker corridors',
        place: 'wall aperture', dims: '1.8 m H, 1.8 m W, 0.6 m D', verbs: 'cut, pause, complete', states: 'idle | cutting | breached | spent',
        nodes: 'HB_ROTOR_00 (coring chain), HB_LEVER_00 (tensioner)',
        nearest: ['sector_zero_bore_drillhead', 'state_wall_breached_03', 'life_seismic_drill'], tex: 'tex_hazard_routed_conduit_wall', decal: 'decal_coring_chain_cut',
        noun: 'wall coring chain', theme: 'brutal breaching hardware', mats: 'hardened tool-steel cutting teeth, heat-blued guide halo, oil-black gearbox castings, burnished fresh-cut steel',
        body: 'a looped segmented cutting chain of hardened teeth running around a shallow circular guide halo that clamps flat against a wall with four screw feet, driven by a hand-cranked gearbox with a tensioner wheel, and a sloped debris chute beneath that funnels cut material to the floor. Bright burnished metal shows along the cut line, fading into heat blue and soot. Show it clamped to a wall section, the cut two-thirds complete.',
        story: 'Cut a door where the bunker\'s builders put a wall.',
        accent: `amber cutting glow at the chain contact (${AMBER})`,
        accept: 'Completing the cut leaves a persistent breach route.'
    },
    {
        id: 'traversal_catwalk_swing_span', suite: 'traversal', hook: 'choose a route', room: 'chasm and gantry rooms',
        place: 'pivoting bridge, swept volume', dims: '1.2 m H, 4.2 m W, 1.0 m D', verbs: 'swing, lock, cross', states: 'docked-a | docked-b | swinging | jammed',
        nodes: 'HB_PIVOT_00 (span), HB_LEVER_00 (lock pin)',
        nearest: ['chasm_broken_catwalk', 'chasm_gondola', 'chasm_cable_traversal_winch'], tex: 'tex_moving_floor_recess_grease', decal: null,
        noun: 'swing catwalk span', theme: 'industrial route switching', mats: 'galvanised grating worn bright down the centre, cold tubular handrails, grease-weeping pivot collar, heavy forged lock pin',
        body: 'a long grated steel catwalk span with tubular handrails mounted on a stout central pivot pillar, balanced so it can swing through an arc to dock against one of two ledges, with a heavy lock pin dropping into a socket at each end and a hand wheel geared to the pivot. Grease weeps from the pivot collar and the grating is worn bright down the middle. Show it docked to one side, lock pin seated.',
        story: 'Connecting one ledge disconnects the other; every crossing is a choice of route.',
        accent: `amber lamp on the lock pin (${AMBER})`,
        accept: 'Swinging it changes which ledge is reachable.'
    },
    {
        id: 'traversal_thermal_ice_underbite', suite: 'traversal', hook: 'ice obstruction', room: 'cryo rooms',
        place: 'low wall or floor boundary', dims: '1.1 m H, 2.8 m W, 0.9 m D', verbs: 'fuel, heat, collapse', states: 'cold | heating | ramp | spent',
        nodes: 'HB_ARM_00 (heated jaw), SOCKET_00 (fuel socket), FX_STEAM_00',
        nearest: ['barrier_ice_intact', 'barrier_ice_melting', 'weapon_fuel_canister_heavy'], tex: 'tex_flood_tide_mineral', decal: null,
        noun: 'thermal ice underbite', theme: 'arctic demolition engineering', mats: 'heat-scarred steel jaw, glowing runoff teeth, armoured fuel socket guard, clear glacial ice and meltwater',
        body: 'a low heavy steel jaw on skids that clamps beneath the underside of a translucent ice obstruction, with a row of heated runoff teeth along its upper lip, an armoured fuel socket protected by a hinged guard, and a small exhaust stack. Meltwater channels are cut into its base to carry runoff away. Show it clamped under a block of clear ice, teeth just starting to bite.',
        story: 'Instead of shattering the ice, melt it from beneath so it slumps into a ramp.',
        accent: `amber heat glow in the jaw (${AMBER})`,
        accept: 'Fueling it turns the ice wall into a ramp over time.'
    },
    // --- Networked hazard chains: source, controller, beneficiary ---
    {
        id: 'hazard_source_cryogen_header', suite: 'hazard-chain', hook: 'cryogen chain source', room: 'cryo exchanger rooms',
        place: 'ceiling pipe source', dims: '0.75 m H, 3.2 m W, 0.8 m D', verbs: 'isolate, vent, reconnect', states: 'charged | isolated | venting | empty',
        nodes: 'SOCKET_00..02 (takeoffs), HB_LEVER_00..02 (isolation valves), FX_FROST_00',
        nearest: ['evac_cryo_hypergolic_manifold', 'prop_icey_frost_manifold', 'base_o2_overhead_duct'], tex: 'tex_ceiling_service_condensate', decal: 'decal_cryogen_header_fallout',
        noun: 'overhead cryogen header', theme: 'brutal cryogenic plumbing', mats: 'frost-rimed blackened steel pipe, bolted flanges, spherical accumulator jacketed in ice, hanging valve chains and icicles',
        body: 'a crowned overhead header pipe of frost-rimed steel slung from the ceiling on heavy hangers, with three downward takeoffs ending in flanged couplings, an ice-loaded spherical accumulator at one end, and a big isolation valve wheel on each branch reachable by a hanging chain. Icicles hang from the lowest points and one branch is dry where it has been shut off. Show it from slightly below.',
        story: 'Every cryogen vent in the room is fed from here; shut a branch at the source instead of fighting each vent.',
        accent: `cyan frost glow at the accumulator (${CYAN})`,
        accept: 'Isolating a branch stops every downstream cryogen emitter on it.'
    },
    {
        id: 'hazard_controller_phase_slug', suite: 'hazard-chain', hook: 'cryogen chain controller', room: 'cryo exchanger rooms',
        place: 'wall controller', dims: '1.4 m H, 1.0 m W, 0.4 m D', verbs: 'calibrate, jam, release', states: 'slow | fast | jammed | bypassed',
        nodes: 'HB_RAIL_00 (slug), HB_LOCK_00 / HB_LOCK_01 (catches)',
        nearest: ['substation_breaker_interlock', 'meridian_capacitor_bomb', 'life_fuse_bypass_panel'], tex: 'tex_hazard_routed_conduit_wall', decal: null,
        noun: 'phase-slug pulse controller', theme: 'mechanical timing control', mats: 'milky white ceramic slug, thick borosilicate travel tube, magnet-blackened catches, knurled brass calibration screw',
        body: 'a wall controller housing a vertical glass travel tube in which a dense white ceramic slug rides between two magnetic catches, a brass calibration screw at the top that sets the slug\'s dwell time, and a jam lever that can wedge it in place. Pulse lines leave the housing in braided conduit. Show the slug captured mid-travel.',
        story: 'The timing of every cryogen pulse is a weight the player can see moving and can stop.',
        accent: `cyan glow at the upper catch (${CYAN})`,
        accept: 'Calibrating changes pulse interval; jamming stops pulses.'
    },
    {
        id: 'hazard_beneficiary_seed_warmer', suite: 'hazard-chain', hook: 'cryogen chain beneficiary (competes with doors)', room: 'Tallow-adjacent cryo rooms',
        place: 'floor beneficiary', dims: '0.8 m H, 1.8 m W, 1.0 m D', verbs: 'connect, warm, sacrifice', states: 'cold | warming | viable | spoiled',
        nodes: 'SOCKET_00 (exchanger inlet), HB_LID_00..03 (seed sockets)',
        nearest: ['hydro_mycelial_seed_vault', 'tallow_spore_cradle', 'cryo_heater_station'], tex: 'tex_tallow_red_mold_filter_floor', decal: null,
        noun: 'seed warmer bed', theme: 'fragile survival trade-off', mats: 'quilted insulated steel tray, oxidised copper serpentine exchanger, frosted hinged lid, dormant seed pods in velvet sockets',
        body: 'a low insulated seed bed in a quilted steel tray, with a serpentine copper heat exchanger visible through grilles beneath shallow protected seed sockets, an inlet coupling on one end for the cryogen chain\'s return heat, and a hinged frost lid. Some sockets hold dormant seed pods; others are empty. Show the lid open, the bed cold.',
        story: 'Warming the last seeds means diverting heat from the chain, and something else down the line goes cold.',
        accent: `lime glow in viable sockets (${LIME})`,
        accept: 'Connecting it to the chain warms seeds but releases a door seal elsewhere.'
    },
    {
        id: 'hazard_source_steam_heart', suite: 'hazard-chain', hook: 'steam chain source', room: 'turbine and reactor rooms',
        place: 'floor and pipe source', dims: '1.6 m H, 1.7 m W, 1.5 m D', verbs: 'open, isolate, rupture', states: 'cold | pressurised | isolated | ruptured',
        nodes: 'HB_ARM_00 (isolation collar), SOCKET_00 / SOCKET_01 (outlet throats), FX_STEAM_00',
        nearest: ['geo_steam_manifold_actuator', 'ind_hydraulic_manifold', 'hive_pulmonary_bellows'], tex: 'tex_hazard_routed_conduit_wall', decal: null,
        noun: 'steam pulsation heart', theme: 'industrial pressure source', mats: 'riveted boilerplate, white salt crust along weeping seams, scarred cast-iron isolation collar, hot oily flanges',
        body: 'a squat riveted pulsation chamber on four heavy feet, its body slowly swelling and relaxing under pressure, with two opposed outlet throats flanged to pipe, a large hand-wheeled isolation collar around its waist, and white salt crust where steam has leaked at the seams. Show it pressurised and sweating.',
        story: 'One heart of pressure that can lift a door, turn a turbine, or scald a corridor.',
        accent: `amber pressure lamp on the collar (${AMBER})`,
        accept: 'Isolating it stops downstream steam; rupture creates a hazard volume.'
    },
    {
        id: 'hazard_controller_relief_logic_cam', suite: 'hazard-chain', hook: 'steam chain controller', room: 'turbine and reactor rooms',
        place: 'wall machinery', dims: '1.3 m H, 1.3 m W, 0.5 m D', verbs: 'shift, time, lock', states: 'route-a | route-b | balanced | failed',
        nodes: 'HB_ROTOR_00 (cam shaft), HB_LEVER_00 (keyed spacer)',
        nearest: ['geo_pressure_relief_siren', 'substation_breaker_interlock', 'life_fuse_bypass_panel'], tex: 'tex_hazard_routed_conduit_wall', decal: null,
        noun: 'relief logic cam', theme: 'mechanical logic routing', mats: 'machined bronze cams with polished lobes, steel shaft, brass grease cups, oil-darkened follower arms',
        body: 'an open-faced wall housing with three lobed bronze cams on one shared shaft, each cam driving a relief follower arm, and a keyed steel spacer that can be slid along the shaft to change which follower rides its cam. Grease cups, a hand crank and three exit pipes complete it. Show the cams exposed with one follower raised.',
        story: 'Steam is routed by physically changing the timing of a machine, not by a screen.',
        accent: `amber lamp on the active follower (${AMBER})`,
        accept: 'Shifting the spacer sends steam to route A, route B, or splits it.'
    },
    {
        id: 'hazard_beneficiary_steam_rotary_airlock', suite: 'hazard-chain', hook: 'steam chain beneficiary (traversal)', room: 'turbine and reactor thresholds',
        place: 'threshold, cylindrical swept volume', dims: '2.4 m H, 2.2 m W, 2.2 m D', verbs: 'pressurise, rotate, pass', states: 'stalled | turning | open',
        nodes: 'HB_ROTOR_00 (drum), SOCKET_00 (steam inlet)',
        nearest: ['base_door_sealable_bulkhead', 'door_arch_guillotine_assembled', 'kit_space_gate_door'], tex: 'tex_hazard_routed_conduit_wall', decal: null,
        noun: 'steam-driven rotary airlock', theme: 'heavy revolving pressure doors', mats: 'heavy curved steel drum plate, worn brass leaf seals, geared bronze drive ring, condensation-streaked gauge glass',
        body: 'a cylindrical revolving airlock about two metres across, a steel drum with one curved door leaf inside that rotates around a central post, turned by a steam inlet and gear ring at its base, with worn brass seals along the leaf edges and a pressure gauge above. Show the leaf half rotated so the inside of the drum is visible.',
        story: 'A door that turns only while the steam chain feeds it; starve the chain and it stalls shut.',
        accent: `amber lamp above the drum (${AMBER})`,
        accept: 'Turns only while the steam chain feeds it; stalls otherwise.'
    },
    {
        id: 'hazard_source_spore_pressure_gland', suite: 'hazard-chain', hook: 'spore chain source', room: 'bio rooms',
        place: 'ceiling source', dims: '0.9 m H, 2.2 m W, 1.5 m D', verbs: 'sample, clamp, drain', states: 'full | feeding | clamped | drained',
        nodes: 'HB_ROPE_00..02 (feed lines), HB_LOCK_00..02 (collars)',
        nearest: ['prop_fungal_spore_dispenser', 'hive_pheromone_node', 'hive_pulmonary_bellows'], tex: 'tex_turned_resin_ingress', decal: null,
        noun: 'spore pressure gland', theme: 'organic pressure source', mats: 'translucent maroon tissue bladder, curved blackened iron ribs, clear feed tubing, scored steel clamp collars',
        body: 'a swollen ceiling bladder of translucent maroon tissue held inside a cage of curved iron ribs, feeding three clear descending feed lines that drop toward emitters below, each line wrapped by a cuttable steel collar. A sample tap hangs from the lowest point. Show it from below, bladder full.',
        story: 'The spores in this room come from one place overhead; clamp the lines and the emitters starve.',
        accent: `lime spore glow in the feed lines (${LIME})`,
        accept: 'Clamping a line stops its emitter; draining empties all.'
    },
    {
        id: 'hazard_controller_air_scrub_diverter', suite: 'hazard-chain', hook: 'air chain controller', room: 'camp and quarantine rooms',
        place: 'wall to ceiling junction', dims: '1.5 m H, 1.8 m W, 0.8 m D', verbs: 'divert, lock, purge', states: 'camp | route | quarantine | jammed',
        nodes: 'HB_RAIL_00 (duct tongue), HB_LEVER_00 (lock lever)',
        nearest: ['base_o2_overhead_duct', 'evac_cabin_co2_scrubber', 'prop_exhaust_blower_fan_hood'], tex: 'tex_hazard_routed_conduit_wall', decal: null,
        noun: 'air scrub diverter', theme: 'survival airflow politics', mats: 'riveted steel ductwork, sliding galvanised tongue visible through grilles, long oiled lever, dust-clogged filter mesh',
        body: 'a Y-shaped duct housing of riveted steel where wall meets ceiling, with a heavy sliding tongue inside that chooses one of three outlets, visible through inspection grilles, and a long lever reaching down to head height with a lock notch for each position. Filter grilles sit on each outlet. Show the tongue locked toward one outlet.',
        story: 'Clean air goes to the camp, the route, or the sealed room, never all three.',
        accent: `cyan lamp on the active outlet (${CYAN})`,
        accept: 'Diverting sets which room gets filtered air.'
    },
    // --- Ceiling network ---
    {
        id: 'ceiling_cable_transfer_carriage', suite: 'ceiling-network', hook: 'ceiling grammar proof', room: 'engineering rooms',
        place: 'ceiling track', dims: '0.65 m H, 3.5 m W, 0.7 m D', verbs: 'slide, connect, disconnect', states: 'parked | connected-a | connected-b | severed',
        nodes: 'HB_RAIL_00 (carriage), HB_ROPE_00 (umbilical)',
        nearest: ['prop_ceiling_crane_hoist', 'prop_overhead_cage_fluorescent', 'prop_wall_cable_tray_swag'], tex: 'tex_ceiling_service_condensate', decal: null,
        noun: 'overhead cable transfer carriage', theme: 'overhead industrial routing', mats: 'scuffed steel I-beam rail, cast iron carriage wheels, braided rubber-jacketed umbilical, guarded brass swivel',
        body: 'a compact four-wheeled carriage riding a steel I-beam rail fixed to the ceiling, paying out one thick braided umbilical cable through a guarded swivel underneath, with a pull rope hanging down to move it and stop blocks at both ends of the rail. Show it seen from below, the umbilical looping down.',
        story: 'One live cable, two machines: the player chooses which one runs.',
        accent: `cyan lamp on the swivel (${CYAN})`,
        accept: 'Sliding it powers one of two room machines.'
    },
    {
        id: 'ceiling_condensate_return_tree', suite: 'ceiling-network', hook: 'leak tracing', room: 'service rooms',
        place: 'ceiling to wall network', dims: '1.8 m H, 2.8 m W, 1.6 m D', verbs: 'trace, clamp, drain', states: 'dry | branch-leak | flooded | repaired',
        nodes: 'HB_LOCK_00..03 (pinch clamps), FX_DRIP_00',
        nearest: ['base_o2_overhead_duct', 'life_drip_buckets', 'prop_pipe_rupture'], tex: 'tex_ceiling_service_condensate', decal: null,
        noun: 'condensate return tree', theme: 'overhead plumbing forensics', mats: 'sweating blackened steel pipe, cloudy glass sight cups, brass pinch clamps, mineral drip stains',
        body: 'a branching inverted tree of pipes hanging from the ceiling, four branches each fitted with a glass sight cup showing how much liquid is passing, and a pinch clamp, converging into a single thick return pipe that runs down the wall into a floor drain. Drips hang from the failing branch. Show it from below.',
        story: 'The sight cups show exactly which machine is leaking.',
        accent: `amber sight cup glow (${AMBER})`,
        accept: 'Clamping the leaking branch stops a floor liquid pool.'
    },
    {
        id: 'ceiling_brood_shadow_perch', suite: 'ceiling-network', hook: 'ambush tell', room: 'hive-adjacent rooms',
        place: 'high ceiling obstruction', dims: '0.8 m H, 2.4 m W, 1.6 m D', verbs: 'inspect, burn, collapse', states: 'empty | occupied | burned | fallen',
        nodes: 'HB_LOCK_00..05 (clamps), FX_ORGANIC_00',
        nearest: ['carapace_sentry_chrysalis', 'hive_tendril_arch', 'fixture_sconce_vine'], tex: 'tex_turned_resin_ingress', decal: null,
        noun: 'brood shadow perch', theme: 'overhead predatory nesting', mats: 'glossy black chitin ribs, clamp-like claws biting into ceiling steel, pale shed silk threads, wet resin hollows',
        body: 'a ribbed shelf of dark chitin gripping the ceiling with six black clamp-like claws, hanging shed threads and silk dangling beneath it, and shallow cupped hollows on its top where something rests. Show it from below at an angle.',
        story: 'Threads hanging from the ceiling mean something is up there, waiting.',
        accent: `red glint deep in the shelf (${RED})`,
        accept: 'Occupied perches drop an ambusher; burning prevents it.'
    },
    // --- Secret reveals ---
    {
        id: 'secret_wall_memory_skin', suite: 'secret-reveal', hook: 'hidden route', room: 'Tina and hive-adjacent walls',
        place: 'wall substitution', dims: '2.3 m H, 2.4 m W, 0.25 m D', verbs: 'press sequence, peel, reseal', states: 'sealed | imprinted | open | scarred',
        nodes: 'HB_DOOR_00 (membrane), SOCKET_00..02 (release points)',
        nearest: ['tina_shedding_cocoon_niche', 'hive_sphincter_iris', 'state_wall_breached_01'], tex: 'tex_secret_memory_membrane', decal: 'decal_memory_skin_pressure',
        noun: 'memory-skin wall', theme: 'concealed living architecture', mats: 'taut matte maroon membrane, blackened iron arch, faint pale pressure blooms, fine radiating tension ribs',
        body: 'a seamless tensioned maroon membrane filling a hard blackened iron arch, flush with the wall around it, with faint pale pressure blooms at three hidden release points and fine tension ribs radiating from them. Show it sealed and taut.',
        story: 'A wall that remembers the touch of whoever used it before, and opens for the same sequence.',
        accent: `pale cyan bloom at one release point (${CYAN})`,
        accept: 'Pressing the three points in order opens a hidden route.'
    },
    {
        id: 'secret_floor_confessional_cache', suite: 'secret-reveal', hook: 'personal evidence cache', room: 'chapel and private rooms',
        place: 'floor recess', dims: '0.22 m H, 1.2 m W, 0.8 m D', verbs: 'kneel, reveal, replace', states: 'hidden | open | emptied | restored',
        nodes: 'HB_PIVOT_00 (kneeling plate), SOCKET_00..03 (keepsake sockets)',
        nearest: ['corp_executive_whisper_booth', 'life_confessional', 'corp_biometric_wall_safe'], tex: 'tex_camp_private_worn_felt', decal: null,
        noun: 'floor confessional cache', theme: 'hidden private devotion', mats: 'knee-worn oak boards, concealed iron balance pivot, faded crimson velvet sockets, polished brass hinge pins',
        body: 'a flush kneeling plate of worn oak and iron set into the floor before a blank wall, which tips on a concealed balance pivot under a kneeling weight to expose a shallow cavity of narrow keepsake sockets lined with faded velvet. Show it tipped half open, one keepsake socket visible.',
        story: 'Someone hid what mattered most to them exactly where they knelt.',
        accent: `amber glint from inside the sockets (${AMBER})`,
        accept: 'Kneeling reveals a lore keepsake; persists once taken.'
    }
];

function clean(value) {
    return String(value).replaceAll('\t', ' ').replaceAll('\n', ' ').replace(/\s+/g, ' ').trim();
}

const texIds = new Set(TEXTURES.map(([id]) => id));
const decalIds = new Set(DECALS.map(([id]) => id));
const problems = [];
const seenIds = new Set();
for (const prop of PROPS) {
    if (seenIds.has(prop.id)) problems.push(`duplicate id ${prop.id}`);
    seenIds.add(prop.id);
    if (WORLD_3D_MODELS[prop.id]) problems.push(`${prop.id} already ships as a model`);
    for (const near of prop.nearest) if (!WORLD_3D_MODELS[near]) problems.push(`${prop.id}: nearest ${near} is not a registered model`);
    if (!texIds.has(prop.tex)) problems.push(`${prop.id}: texture ${prop.tex} is not defined`);
    if (prop.decal && !decalIds.has(prop.decal)) problems.push(`${prop.id}: decal ${prop.decal} is not defined`);
}
const usedTex = new Set(PROPS.map((p) => p.tex));
const usedDecals = new Set(PROPS.map((p) => p.decal).filter(Boolean));
for (const id of texIds) if (!usedTex.has(id)) problems.push(`texture ${id} supports no prop`);
for (const id of decalIds) if (!usedDecals.has(id)) problems.push(`decal ${id} supports no prop`);
if (PROPS.length !== 67) problems.push(`expected 67 new props, have ${PROPS.length}`);
if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
}

const [header, ...lines] = fs.readFileSync(SHEET, 'utf8').trimEnd().split('\n');
if (header !== 'n\tid\tkind\tkey\tsize\tprompt') throw new Error(`unexpected sheet header: ${header}`);
const ownerRows = lines.slice(0, 13);
if (ownerRows.length !== 13 || !ownerRows.every((line, i) => line.startsWith(`${i + 1}\t`))) {
    throw new Error('rows 1-13 (owner-completed) must be present and first');
}

const out = [header, ...ownerRows];
let n = 13;
for (const p of PROPS) {
    n += 1;
    const prompt = `Hyper-detailed photorealistic 3D game asset render of a SINGLE ${p.noun} (about ${p.dims}): ${p.body} Story it tells: ${p.story} Exactly one accent light: ${p.accent}; every other surface is unlit material colour. ${STYLE} H.R. Giger biomechanical unease fused with brutal corporate industrialism: ${p.theme}: ${p.mats}. ${RENDER}`;
    out.push([n, p.id, '3d-prop', 'grey', '2048x2048', clean(prompt)].join('\t'));
}
for (const [id, subject, description] of TEXTURES) {
    n += 1;
    const prompt = `Hyper-detailed photorealistic seamless PBR surface texture for ${subject}: ${description}. High-relief normal detail with roughness that separates worn contact areas from untouched ones. ${TEXTURE_SENSUALITY} Use bone ivory, soot-black metal, bruised maroon tissue and restrained amber, matching the established key art. ${TEXTURE_TAIL}`;
    out.push([n, id, 'pbr-texture', 'texture', '2048x2048', clean(prompt)].join('\t'));
}
for (const [id, surface, description] of DECALS) {
    n += 1;
    const prompt = `Hyper-detailed photorealistic decal graphic for a ${surface}: ${description}, on a solid flat neutral 18% studio mid-grey (#808080) background. ${DECAL_SENSUALITY} ${DECAL_TAIL}`;
    out.push([n, id, 'decal', 'grey', '2048x2048', clean(prompt)].join('\t'));
}
fs.writeFileSync(SHEET, `${out.join('\n')}\n`);

const md = [];
md.push('# World Expansion 80: Gap Manifest — 2026-10-15');
md.push('');
md.push('Generated by `scripts/generate-world-expansion-80-prompts.mjs` from the same table as the prompt sheet');
md.push('[interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv](./interactive-world-expansion-80-glbs-prompts-2026-10-15.tsv).');
md.push('Edit the script, not this file. Selection rationale: [whole-game GLB census and gap brief](./whole-game-glb-census-and-new-80-gap-brief-2026-10-15.md).');
md.push('');
md.push('Rows 1–13 are the owner-completed prompts, carried over unchanged and awaiting GLB ingest. Rows 14–80 are the 67 new props below.');
md.push(`Rows 81–${80 + TEXTURES.length} are support materials and rows ${81 + TEXTURES.length}–${n} are support decals.`);
md.push('');
const suites = [...new Set(PROPS.map((p) => p.suite))];
md.push('| Suite | Props |');
md.push('|---|---:|');
for (const suite of suites) md.push(`| ${suite} | ${PROPS.filter((p) => p.suite === suite).length} |`);
md.push(`| **Total** | **${PROPS.length}** |`);
md.push('');
md.push('Every nearest-model reference below is a registered `WORLD_3D_MODELS` key; the script refuses to run otherwise.');
md.push('');
let row = 13;
for (const suite of suites) {
    md.push(`## ${suite}`);
    md.push('');
    for (const p of PROPS.filter((x) => x.suite === suite)) {
        row = 14 + PROPS.indexOf(p);
        md.push(`### ${row}. \`${p.id}\``);
        md.push('');
        md.push(`- **Story hook:** ${p.hook}`);
        md.push(`- **Room:** ${p.room}`);
        md.push(`- **Placement:** ${p.place}; ${p.dims}`);
        md.push(`- **Verbs:** ${p.verbs}`);
        md.push(`- **States (persisted):** ${p.states}`);
        md.push(`- **Named nodes:** ${p.nodes}`);
        md.push(`- **Nearest shipped (must not repeat):** ${p.nearest.map((x) => `\`${x}\``).join(', ')}`);
        md.push(`- **Support art:** \`${p.tex}\`${p.decal ? `, \`${p.decal}\`` : ''}`);
        md.push(`- **Acceptance:** ${p.accept}`);
        md.push('');
    }
}
md.push('## Support materials');
md.push('');
md.push('| Row | Id | Supports |');
md.push('|---:|---|---|');
TEXTURES.forEach(([id, subject], i) => md.push(`| ${81 + i} | \`${id}\` | ${subject}: ${PROPS.filter((p) => p.tex === id).map((p) => `\`${p.id}\``).join(', ')} |`));
md.push('');
md.push('## Support decals');
md.push('');
md.push('| Row | Id | Surface | Supports |');
md.push('|---:|---|---|---|');
DECALS.forEach(([id, surface], i) => md.push(`| ${81 + TEXTURES.length + i} | \`${id}\` | ${surface} | ${PROPS.filter((p) => p.decal === id).map((p) => `\`${p.id}\``).join(', ')} |`));
md.push('');
fs.writeFileSync(MANIFEST, `${md.join('\n')}\n`);

console.log(`Wrote ${out.length - 1} sheet rows (13 owner + ${PROPS.length} props, ${TEXTURES.length} materials, ${DECALS.length} decals) and the manifest.`);
