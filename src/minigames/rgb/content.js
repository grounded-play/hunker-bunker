// RGB content data: chapters, hotspots, items, and card text, per
// docs/mini-games/rgb/scene-flow.md and narrative-script.md. Pure data —
// runtime.js interprets it against src/minigames/rgb/state.js. Hotspot
// coordinates are authored in the shared 1280x800 logical stage.
//
// A hotspot's `effects` describe which state.js transition(s) selecting it
// triggers. runtime.js applies them generically:
//   choice: string        -> applyChoice(state, choice)
//   evidence: string       -> addEvidence(state, evidence)
//   item: string            -> addItem(state, item)
//   items: [string]          -> addItem for each
//   pain: string              -> setPain(state, pain)
//   timeCost: number           -> advanceTime(state, timeCost)
//   kioskAttempt: true          -> recordKioskAttempt(state)
//   calibration: {quality, honest} -> completeCalibration(state, quality, honest)
//   finalChoice: string      -> chooseFinal(state, finalChoice)
//   rescue: {success}         -> attemptRescue(state, { success })
// A hotspot may combine several of these (e.g. a choice plus a timeCost).
//
// Availability is decided by gating.js, which reads `once`, `requiresAllOf`,
// `excludesAllOf`, and `requires`. Chapters are authored as waves: each wave
// gates on the previous one so at most a few choices are ever live at a time,
// and chapter exits additionally gate on `requires.minVisitedOf` so a chapter
// cannot be skipped past the beats that give its decision meaning.

export const CHAPTER_ORDER = Object.freeze([
    'parking_lot',
    'warehouse',
    'incident_review',
    'medi_kiosk',
    'server_room',
    'sector_four'
]);

const ITEM_ART = '/minigames/rgb/items';

export const ITEMS = Object.freeze({
    item_albuterol_bottle: {
        id: 'item_albuterol_bottle',
        label: 'Empty Albuterol Bottle',
        icon: `${ITEM_ART}/item_albuterol_bottle.png`
    },
    item_lucia_drawing: {
        id: 'item_lucia_drawing',
        label: "Lucia's Drawing",
        icon: `${ITEM_ART}/item_lucia_drawing.png`
    },
    item_calibration_notebook: {
        id: 'item_calibration_notebook',
        label: 'Calibration Notebook',
        icon: `${ITEM_ART}/item_calibration_notebook.png`
    },
    item_temp_badge: {
        id: 'item_temp_badge',
        label: 'Temp Contractor Badge',
        icon: `${ITEM_ART}/item_temp_badge.png`
    },
    item_phone: {
        id: 'item_phone',
        label: 'Cracked Phone',
        icon: `${ITEM_ART}/item_phone.png`
    },
    item_wire_cutters: {
        id: 'item_wire_cutters',
        label: 'Insulated Wire Cutters',
        icon: `${ITEM_ART}/item_wire_cutters.png`
    }
});

export const CONTENT_WARNING = 'Depicts workplace injury, medical-access stress, child illness discussed off-screen, fire, and possible character death.';

// Cinematic beats: choice-branch clips (docs/mini-games/rgb/cinematic-branch-prompts.md,
// fully produced) and connective rail clips (docs/mini-games/rgb/cinematic-rail-prompts.md,
// R1-R8 have video clips and end-frame images; R9 has end-frame image).
// Every entry declares a video and/or an image; cinematicPlayer.js tries the
// video first and falls back to holding the image when the video is missing.
const CINEMATIC_BASE = '/minigames/rgb/cinematics';
const BACKGROUNDS = '/minigames/rgb/backgrounds';

export const BRANCH_CINEMATICS = Object.freeze({
    'C1-A': { video: `${CINEMATIC_BASE}/C1-A.mp4`, image: `${CINEMATIC_BASE}/c1/end_answer_lucia.png` },
    'C1-B': { video: `${CINEMATIC_BASE}/C1-B.mp4`, image: `${CINEMATIC_BASE}/c1/end_enter_now.png` },
    'C2-A': { video: `${CINEMATIC_BASE}/C2-A.mp4`, image: `${CINEMATIC_BASE}/c2/end_honest_log.png` },
    'C2-B': { video: `${CINEMATIC_BASE}/C2-B.mp4`, image: `${CINEMATIC_BASE}/c2/end_clean_metric.png` },
    'C3-A': { video: `${CINEMATIC_BASE}/C3-A.mp4`, image: `${CINEMATIC_BASE}/c3/end_document_review.png` },
    'C3-B': { video: `${CINEMATIC_BASE}/C3-B.mp4`, image: `${CINEMATIC_BASE}/c3/end_comply_review.png` },
    'C4-A': { video: `${CINEMATIC_BASE}/C4-A.mp4`, image: `${CINEMATIC_BASE}/c4/end_record_kiosk.png` },
    'C4-B': { video: `${CINEMATIC_BASE}/C4-B.mp4`, image: `${CINEMATIC_BASE}/c4/end_call_lucia.png` },
    'C4-C': { video: `${CINEMATIC_BASE}/C4-C.mp4`, image: `${CINEMATIC_BASE}/c4/end_lockout.png` },
    'C5-A': { video: `${CINEMATIC_BASE}/C5-A.mp4`, image: `${CINEMATIC_BASE}/c5/end_preserve_profile.png` },
    'C5-B': { video: `${CINEMATIC_BASE}/C5-B.mp4`, image: `${CINEMATIC_BASE}/c5/end_expose_profile.png` },
    'C5-C': { video: `${CINEMATIC_BASE}/C5-C.mp4`, image: `${CINEMATIC_BASE}/c5/end_sever_trunk.png` },
    'C6-A': { video: `${CINEMATIC_BASE}/C6-A.mp4`, image: `${CINEMATIC_BASE}/c6/end_rescue.png` },
    'C6-B': { video: `${CINEMATIC_BASE}/C6-B.mp4`, image: `${CINEMATIC_BASE}/c6/end_crushed_retry.png` }
});

export const RAIL_CINEMATICS = Object.freeze({
    R1: { video: `${CINEMATIC_BASE}/R1.mp4`, image: `${CINEMATIC_BASE}/rails/r1_badge_entry.png` },
    R2: { video: `${CINEMATIC_BASE}/R2.mp4`, image: `${CINEMATIC_BASE}/rails/r2_collision_aftermath.png` },
    R3: { video: `${CINEMATIC_BASE}/R3.mp4`, image: `${CINEMATIC_BASE}/rails/r3_coverage_discharge.png` },
    R4: { video: `${CINEMATIC_BASE}/R4.mp4`, image: `${CINEMATIC_BASE}/rails/r4_utility_map.png` },
    R5: { video: `${CINEMATIC_BASE}/R5.mp4`, image: `${CINEMATIC_BASE}/rails/r5_utility_return.png` },
    R6: { video: `${CINEMATIC_BASE}/R6.mp4`, image: `${CINEMATIC_BASE}/rails/r6_fire_propagation.png` },
    R7: { video: `${CINEMATIC_BASE}/R7.mp4`, image: `${CINEMATIC_BASE}/rails/r7_pinned_before_rescue.png` },
    R8: { video: `${CINEMATIC_BASE}/R8.mp4`, image: `${CINEMATIC_BASE}/rails/r8_system_loop.png` },
    R9: { image: `${CINEMATIC_BASE}/rails/r9_open_hand.png` }
});

export const INTRO_CINEMATIC = Object.freeze({
    video: `${CINEMATIC_BASE}/Intro.mp4`,
    image: `${BACKGROUNDS}/bg_rgb_parking_lot.png`,
    label: 'ARCHIVE SIGNAL // RIVERSIDE GLOBAL BOTICS'
});

// Resolves which cinematic beat(s), if any, play when a hotspot fires, using
// the run state as of *before* that hotspot's own effects are applied (so a
// gate that depends on an earlier optional choice — e.g. badge_in checking
// whether the player replied to Lucia — reads correctly). Several of the
// prompt book's gates (C1, C3, C4) group multiple of this content's more
// granular optional hotspots into one binary/ternary choice; the heuristics
// below pick the branch whose State: annotation best matches what the
// player actually did, and are the deliberate seam between the finer-grained
// interaction design here and the coarser branch structure in the prompt
// book.
export function resolveCinematicSteps(hotspotId, priorState) {
    switch (hotspotId) {
        // The C1 fork leaves the sedan, then R1 carries the same uninterrupted
        // action across the lot and through the badge reader.
        case 'reply_to_lucia':
            return ['C1-A', 'R1'];
        case 'enter_now':
            return ['C1-B', 'R1'];
        case 'double_tap_honest':
            return ['C2-A', 'R2'];
        case 'double_tap_falsify':
            return ['C2-B', 'R2'];
        case 'proceed_to_kiosk': {
            const documented = priorState.evidence.includes('camera_discrepancy')
                || priorState.evidence.includes('swab_photo')
                || priorState.flags.keptNotebook;
            return [documented ? 'C3-A' : 'C3-B', 'R3'];
        }
        case 'give_up':
            return ['C4-C'];
        case 'follow_utility_map': {
            const calledLuciaOnly = priorState.flags.luciaCallback
                && !priorState.evidence.includes('kiosk_record');
            return [calledLuciaOnly ? 'C4-B' : 'C4-A', 'R4', 'R5'];
        }
        case 'walk_away':
            return ['C5-A', 'R8'];
        case 'expose_profile':
            return ['C5-B', 'R9'];
        case 'sever_trunk':
            return ['C5-C', 'R6', 'R7'];
        case 'rescue_recenter':
        case 'rescue_recenter_again':
            return ['C6-A'];
        case 'rescue_fumble':
            return ['C6-B'];
        default:
            return [];
    }
}

export function resolveCinematicAssets(stepKeys) {
    return stepKeys
        .map((key) => BRANCH_CINEMATICS[key] ?? RAIL_CINEMATICS[key])
        .filter(Boolean);
}

export const CHAPTERS = Object.freeze({
    parking_lot: {
        id: 'parking_lot',
        title: 'Chapter 1: The Parking Lot',
        bg: `${BACKGROUNDS}/bg_sedan_interior.png`,
        goal: 'Take stock of the night before the shift takes it from you.',
        next: 'warehouse',
        hints: [
            "That empty bottle on the seat is the whole shift, before the shift even starts.",
            'The notebook holds the joint diagram you\'ll need at the line — open it now.',
            'Badge in at the reader once the bottle, the balance, and the message are all read.'
        ],
        hotspots: [
            // Wave A: the arithmetic of the night, before anyone asks Elias
            // to do anything. scene-flow.md's required beats 1-3.
            {
                id: 'inspect_bottle',
                label: 'Empty Albuterol Bottle',
                object: true,
                x: 570, y: 315, w: 105, h: 155,
                once: true,
                lines: [
                    'Two doses left, the label says. There has been one for a week.',
                    'Refill ready for pickup: $286.40.'
                ],
                pickup: {
                    items: ['item_albuterol_bottle'],
                    label: 'Take Bottle'
                }
            },
            {
                id: 'check_balance',
                label: 'Check the Balance',
                object: true,
                icon: `${ITEM_ART}/item_phone.png`,
                x: 505, y: 425, w: 120, h: 115,
                once: true,
                lines: [
                    'Available balance: $19.12.',
                    'Benefits active until 11:59 PM, the portal says. It says that every day.'
                ],
                pickup: {
                    items: ['item_phone'],
                    label: 'Keep Phone'
                }
            },
            {
                id: 'listen_voicemail',
                label: "Lucia's Message",
                object: true,
                icon: `${ITEM_ART}/item_phone.png`,
                x: 505, y: 425, w: 120, h: 115,
                once: true,
                requiresAllOf: ['check_balance'],
                lines: [
                    'Hi Dad. Mom says don\'t forget the purple one.',
                    'The blue one tastes bad and makes my hands shaky.',
                    'I drew Robot 4A, but I gave him shoes because he looks cold.'
                ]
            },
            // Wave B: the drawing and the notebook are one object — he folds
            // her robot into the book he calibrates with.
            {
                id: 'inspect_drawing',
                label: 'The Drawing and the Notebook',
                object: true,
                icon: `${ITEM_ART}/item_lucia_drawing.png`,
                x: 30, y: 420, w: 435, h: 285,
                once: true,
                requiresAllOf: ['inspect_bottle', 'check_balance', 'listen_voicemail'],
                lines: [
                    'A smiling sorting arm in sneakers, beside a figure labelled DAD.',
                    'He folds it into the calibration notebook and buttons the jacket over both.'
                ],
                pickup: {
                    items: ['item_lucia_drawing', 'item_calibration_notebook', 'item_temp_badge'],
                    label: 'Pocket Drawing & Notebook'
                }
            },
            // The fork exits the sedan. Its branch clip flows directly into
            // R1's walk across the lot and badge scan, so the player is never
            // returned to the car to click a redundant "Badge In" button.
            {
                id: 'reply_to_lucia',
                label: 'Answer Lucia',
                x: 238, y: 590, w: 330, h: 72,
                once: true,
                choice: true,
                requiresAllOf: ['inspect_drawing'],
                excludesAllOf: ['enter_now'],
                lines: ['He answers. For seven seconds, the shift can wait.'],
                effects: { choice: 'reply_to_lucia', timeCost: 1 },
                advances: true
            },
            {
                id: 'enter_now',
                label: 'Enter Now',
                x: 712, y: 590, w: 330, h: 72,
                once: true,
                choice: true,
                requiresAllOf: ['inspect_drawing'],
                excludesAllOf: ['reply_to_lucia'],
                lines: ['He locks the phone and steps into the heat.'],
                advances: true
            }
        ]
    },

    warehouse: {
        id: 'warehouse',
        title: 'Chapter 2: Warehouse Calibration',
        bg: `${BACKGROUNDS}/bg_warehouse_line_4a.png`,
        goal: 'Teach 4A to release and recenter an irregular load.',
        next: 'incident_review',
        hints: [
            'The notebook diagram marks the joint 4A keeps gripping wrong.',
            'Light pressure, then two taps: release, recenter.',
            'Select the joint, then apply pressure, then double-tap to finish.'
        ],
        hotspots: [
            // The game's thesis, stated once in plain numbers, before any
            // puzzle asks the player to care about the machine.
            {
                id: 'observe_4a',
                label: 'Sorting Arm 4A',
                object: true,
                x: 555, y: 95, w: 615, h: 615,
                once: true,
                lines: [
                    'Titanium sorting arm. Asset value $4.8 million.',
                    'The terminal lists its operator at $16.50 an hour.',
                    'It closes on an irregular box and crushes it flat.'
                ]
            },
            {
                id: 'read_diagram',
                label: 'Notebook Diagram',
                object: true,
                inventoryAction: true,
                icon: `${ITEM_ART}/item_calibration_notebook.png`,
                x: 35, y: 575, w: 190, h: 105,
                once: true,
                requiresAllOf: ['observe_4a'],
                lines: ['DOUBLE TAP = RELEASE PRESSURE / RECENTER.']
            },
            {
                id: 'select_joint',
                label: "4A's Joint",
                object: true,
                x: 940, y: 385, w: 225, h: 305,
                once: true,
                requiresAllOf: ['read_diagram'],
                lines: ['Two inches left of where it wants to grip.']
            },
            {
                id: 'apply_pressure',
                label: 'Apply Light Pressure',
                object: true,
                x: 940, y: 385, w: 225, h: 305,
                once: true,
                requiresAllOf: ['select_joint'],
                lines: ['Not harder. Smarter.']
            },
            {
                id: 'double_tap_honest',
                label: 'Double Tap — Log the Error',
                x: 235, y: 610, w: 350, h: 70,
                once: true,
                requiresAllOf: ['apply_pressure'],
                excludesAllOf: ['double_tap_falsify'],
                choice: true,
                lines: ['The claw releases, recenters, sorts clean.', 'The metric counter still shows the miss. He leaves it.'],
                effects: { calibration: { quality: 2, honest: true } },
                advances: true
            },
            {
                id: 'double_tap_falsify',
                label: 'Double Tap — Clean the Log',
                x: 695, y: 610, w: 350, h: 70,
                once: true,
                requiresAllOf: ['apply_pressure'],
                excludesAllOf: ['double_tap_honest'],
                choice: true,
                lines: ['The claw releases, recenters, sorts clean.', 'He edits the metric before anyone reviews it.'],
                effects: { calibration: { quality: 2, honest: false } },
                advances: true
            }
        ]
    },

    incident_review: {
        id: 'incident_review',
        title: 'Chapter 3: Collision and Incident Review',
        bg: `${BACKGROUNDS}/bg_incident_review.png`,
        initialEffects: { pain: 'injured' },
        goal: 'Preserve evidence while the review process tries to redefine events.',
        next: 'medi_kiosk',
        hints: [
            'The collision already happened. What matters now is what you keep.',
            'The footage, the notebook, and the swab result are all worth holding onto.',
            'Photograph the reader before the laptop closes.'
        ],
        hotspots: [
            // R2 already showed the collision. This scene begins inside the
            // pictured review room with the visible laptop.
            {
                id: 'demand_footage',
                label: 'Review the Footage',
                object: true,
                x: 500, y: 530, w: 225, h: 205,
                once: true,
                lines: ['"Point of contact is neutral until review is complete."', 'The footage begins at impact. The preceding two seconds are missing.'],
                effects: { evidence: 'camera_discrepancy' }
            },
            {
                id: 'challenge_neutral_language',
                label: 'Challenge “Neutral”',
                x: 285, y: 610, w: 320, h: 70,
                once: true,
                choice: true,
                requiresAllOf: ['demand_footage'],
                lines: ['"You got a neutral word for bleeding?"']
            },
            {
                id: 'complete_swab',
                label: 'Compulsory Swab',
                x: 675, y: 610, w: 320, h: 70,
                once: true,
                choice: true,
                requiresAllOf: ['challenge_neutral_language'],
                lines: ['The reader blinks, waiting.']
            },
            {
                id: 'call_marisol',
                label: 'Call for Marisol',
                object: true,
                inventoryAction: true,
                icon: `${ITEM_ART}/item_phone.png`,
                x: 40, y: 565, w: 190, h: 105,
                once: true,
                requires: {
                    minVisitedOf: {
                        ids: ['keep_notebook', 'surrender_notebook'],
                        count: 1
                    }
                },
                lines: ['Her daycare fee has already started ticking.']
            },
            // Wave C: the consequences of Wave B, each gated on the beat that
            // makes it meaningful.
            {
                id: 'photograph_result',
                label: 'Photograph the Reader',
                object: true,
                inventoryAction: true,
                icon: `${ITEM_ART}/item_phone.png`,
                x: 40, y: 565, w: 190, h: 105,
                once: true,
                requiresAllOf: ['complete_swab'],
                lines: ['INCONCLUSIVE. He photographs it before the laptop closes.'],
                effects: { evidence: 'swab_photo', choice: 'complete_swab' }
            },
            {
                id: 'request_marisol_witness',
                label: 'Ask Her to Stay',
                x: 285, y: 610, w: 320, h: 70,
                once: true,
                choice: true,
                requiresAllOf: ['call_marisol'],
                excludesAllOf: ['release_marisol_from_request'],
                lines: ['She stays. It costs her.'],
                effects: { choice: 'request_marisol_witness' }
            },
            {
                id: 'release_marisol_from_request',
                label: 'Release Her',
                x: 675, y: 610, w: 320, h: 70,
                once: true,
                choice: true,
                requiresAllOf: ['call_marisol'],
                excludesAllOf: ['request_marisol_witness'],
                lines: ['He remembers the pickup deadline and waves her off.'],
                effects: { choice: 'release_marisol_from_request' }
            },
            {
                id: 'keep_notebook',
                label: 'Keep the Notebook',
                x: 285, y: 610, w: 320, h: 70,
                once: true,
                choice: true,
                requiresAllOf: ['photograph_result'],
                excludesAllOf: ['surrender_notebook'],
                lines: ['He keeps it in his jacket, not on the desk.'],
                effects: { choice: 'keep_notebook' }
            },
            {
                id: 'surrender_notebook',
                label: 'Surrender the Notebook',
                x: 675, y: 610, w: 320, h: 70,
                once: true,
                choice: true,
                requiresAllOf: ['photograph_result'],
                excludesAllOf: ['keep_notebook'],
                lines: ['He hands it over. HR keeps files, they say.'],
                effects: { choice: 'surrender_notebook' }
            },
            // Wave D: the exit. Requires the collision to have resolved and
            // at least two of the room's beats to have been played, so the
            // chapter cannot be skipped straight through.
            {
                id: 'proceed_to_kiosk',
                label: 'Leave the Review Room',
                x: 500, y: 690, w: 300, h: 70,
                once: true,
                requires: {
                    painSet: true,
                    minVisitedOf: {
                        ids: ['keep_notebook', 'surrender_notebook'],
                        count: 1
                    }
                },
                lines: ['At 6:42 PM, hours before the stated cutoff: COVERAGE TERMINATED.'],
                advances: true
            }
        ]
    },

    medi_kiosk: {
        id: 'medi_kiosk',
        title: 'Chapter 4: Medi-Kiosk',
        bg: `${BACKGROUNDS}/bg_medi_kiosk.png`,
        goal: 'Exhaust legitimate paths and decide what to do with the time that remains.',
        next: 'server_room',
        hints: [
            'Scan the bottle first — the kiosk will tell you exactly where things stand.',
            'Nothing here buys the medicine tonight. The puzzle is what you can prove.',
            'GIVE UP only if you mean it — there\'s no undoing it.'
        ],
        hotspots: [
            // Wave A: the kiosk states the situation before the player is
            // asked to respond to it.
            {
                id: 'scan_bottle',
                label: 'Scan the Bottle',
                icon: `${ITEM_ART}/item_albuterol_bottle.png`,
                x: 300, y: 480, w: 160, h: 100,
                once: true,
                lines: ['COVERAGE TERMINATED 6:42 PM.', 'Final pay: $14.00, after deductions.'],
                effects: { evidence: 'kiosk_record', kioskAttempt: true }
            },
            // Wave B: every legitimate avenue. Each one is a denial, and each
            // counts toward having genuinely tried.
            {
                id: 'view_paycheck',
                label: 'Itemized Paycheck',
                x: 480, y: 480, w: 160, h: 100,
                once: true,
                requiresAllOf: ['scan_bottle'],
                lines: ['Productivity variance. Equipment delay. $14.00 net.'],
                effects: { evidence: 'payroll_record', kioskAttempt: true }
            },
            {
                id: 'request_billing_agent',
                label: 'Request Billing Agent',
                x: 660, y: 480, w: 160, h: 100,
                once: true,
                requiresAllOf: ['view_paycheck'],
                requires: { maxTimeBand: 2 },
                lines: ['Wait time: forty-seven minutes.'],
                effects: { choice: 'request_billing_agent', kioskAttempt: true }
            },
            {
                id: 'call_hr',
                label: 'Call HR',
                x: 840, y: 480, w: 160, h: 100,
                once: true,
                requiresAllOf: ['view_paycheck'],
                lines: ['"Separation pending review." No further comment.'],
                effects: { timeCost: 1, kioskAttempt: true }
            },
            {
                id: 'call_lucia',
                label: 'Call Lucia',
                x: 1020, y: 480, w: 160, h: 100,
                once: true,
                requiresAllOf: ['document_bag'],
                lines: ['"I\'m still at work, baby. I know."'],
                effects: { choice: 'call_lucia', kioskAttempt: true }
            },
            {
                id: 'document_bag',
                label: 'Document the Bag',
                x: 300, y: 600, w: 200, h: 70,
                once: true,
                requiresAllOf: ['scan_bottle'],
                lines: ['Three inches away, behind reinforced glass.', '"Command not recognized."'],
                effects: { kioskAttempt: true }
            },
            // Wave C: only after the chapter has actually been played. Its
            // argument is that nothing legitimate works — the player has to
            // have watched that happen for either exit to land.
            {
                id: 'follow_utility_map',
                label: 'Follow the Utility Map',
                x: 460, y: 700, w: 240, h: 70,
                once: true,
                requires: {
                    minVisitedOf: {
                        ids: [
                            'view_paycheck',
                            'request_billing_agent',
                            'call_hr',
                            'call_lucia',
                            'document_bag'
                        ],
                        count: 3
                    }
                },
                lines: ['The back page of the notebook. A path back into RGB.'],
                advances: true
            },
            {
                id: 'give_up',
                label: 'GIVE UP',
                x: 740, y: 700, w: 200, h: 70,
                once: true,
                requires: {
                    minVisitedOf: {
                        ids: [
                            'view_paycheck',
                            'request_billing_agent',
                            'call_hr',
                            'call_lucia',
                            'document_bag'
                        ],
                        count: 3
                    }
                },
                lines: ['The bag returns to holding. Her message plays again.'],
                effects: { choice: 'give_up_at_kiosk' },
                advances: true
            }
        ]
    },

    server_room: {
        id: 'server_room',
        title: 'Chapter 5: Server Room',
        bg: `${BACKGROUNDS}/bg_server_room.png`,
        goal: 'Decide what to do with the training profile.',
        next: 'sector_four',
        hints: [
            'The utility map at the back of the notebook leads here.',
            'The mainframe confirms the calibration source. It\'s him.',
            'Walk away, expose it, or sever the trunk — whichever you choose is final.'
        ],
        hotspots: [
            {
                id: 'read_terminal',
                label: 'Mainframe Terminal',
                x: 500, y: 400, w: 160, h: 140,
                once: true,
                lines: ['TRAINING MODEL: SORT_ARM_4A', 'HUMAN CALIBRATION SOURCE: ELIAS MORALES'],
                effects: { evidence: 'training_profile' }
            },
            // The chapter's emotional pivot, previously buried as one line
            // inside walk_away. It is the reason the three exits differ.
            {
                id: 'attempt_delete',
                label: 'Delete the Profile',
                x: 500, y: 555, w: 160, h: 70,
                once: true,
                requiresAllOf: ['read_terminal'],
                lines: [
                    'ADMIN LOCK. ACCESS DENIED.',
                    'They will not even let him take his own ghost back.'
                ]
            },
            {
                id: 'walk_away',
                label: 'Leave the Profile Intact',
                x: 200, y: 690, w: 200, h: 70,
                once: true,
                choice: true,
                requiresAllOf: ['attempt_delete'],
                lines: ['He steps back from the terminal.'],
                effects: { finalChoice: 'preserve' },
                advances: true
            },
            {
                id: 'expose_profile',
                label: 'Copy and Transmit',
                x: 540, y: 690, w: 200, h: 70,
                once: true,
                choice: true,
                requiresAllOf: ['attempt_delete'],
                requires: { canExpose: true },
                lines: ['The token has a window. He copies fast.'],
                effects: { finalChoice: 'expose' },
                advances: true
            },
            {
                id: 'sever_trunk',
                label: 'Sever the Data Trunk',
                x: 880, y: 690, w: 200, h: 70,
                once: true,
                choice: true,
                requiresAllOf: ['attempt_delete'],
                lines: ['He reaches for the insulated cutters instead.'],
                effects: { finalChoice: 'sever', item: 'item_wire_cutters' },
                advances: true
            }
        ]
    },

    sector_four: {
        id: 'sector_four',
        title: 'Chapter 6: Sector 4 and Epilogue',
        bg: `${BACKGROUNDS}/bg_sector_four.png`,
        goal: 'Escape the collapse using the lesson taught to 4A.',
        next: null,
        hints: [
            'Pull the alarm before anything else.',
            'The rack has him. 4A is gripping the wrong point.',
            'Same joint, same pressure, same double tap as the warehouse floor.'
        ],
        hotspots: [
            {
                id: 'pull_alarm',
                label: 'Fire Alarm',
                x: 300, y: 440, w: 160, h: 90,
                once: true,
                lines: ['The system says to wait. He pulls it anyway.']
            },
            {
                id: 'cross_to_rack',
                label: 'Cross the Floor',
                x: 560, y: 440, w: 160, h: 90,
                once: true,
                requiresAllOf: ['pull_alarm'],
                lines: ['A rack collapses. Lucia\'s drawing lands just out of reach.']
            },
            // The payoff for Chapter 2. An honest error log earns trust4A 2
            // and 4A recalls the correction on the first attempt; a falsified
            // metric earns 1, and the lift takes a second pass. Both reach the
            // same ending — weak calibration costs an action, never the
            // outcome, per "resources create pressure, not moral judgment".
            {
                id: 'rescue_recenter',
                label: 'Tap. Tap.',
                x: 820, y: 440, w: 160, h: 90,
                once: true,
                requiresAllOf: ['cross_to_rack'],
                requires: { minTrust4A: 2 },
                lines: [
                    'Same joint, same pressure.',
                    '4A releases, recenters, finds the centre of gravity, and lifts.'
                ],
                effects: { rescue: { success: true } },
                advances: true
            },
            {
                id: 'rescue_recenter_weak',
                label: 'Tap. Tap.',
                x: 820, y: 440, w: 160, h: 90,
                once: true,
                requiresAllOf: ['cross_to_rack'],
                requires: { maxTrust4A: 1 },
                lines: [
                    'Same joint, same pressure. The servo hunts, uncertain.',
                    'The clean metric he filed is the one it learned from. It grips short.'
                ]
            },
            {
                id: 'rescue_recenter_again',
                label: 'Again. Tap. Tap.',
                x: 820, y: 560, w: 160, h: 90,
                once: true,
                requiresAllOf: ['rescue_recenter_weak'],
                lines: [
                    'He finds the joint one more time and holds it.',
                    '4A releases, shifts two inches, and lifts.'
                ],
                effects: { rescue: { success: true } },
                advances: true
            },
            {
                id: 'rescue_fumble',
                label: 'Grab the Chassis',
                x: 560, y: 560, w: 160, h: 90,
                once: true,
                requiresAllOf: ['cross_to_rack'],
                lines: ['4A grips the wrong point. LOAD INSTABILITY.'],
                effects: { rescue: { success: false } },
                advances: true
            }
        ]
    }
});

export const ENDINGS = Object.freeze({
    system_loop: {
        id: 'system_loop',
        title: 'The System Loop',
        body: 'Elias remains separated from RGB; the company retains his training data. Lucia\'s refill remains unresolved. 4A continues to sort with his gentle correction.',
        art: `${CINEMATIC_BASE}/rails/r8_system_loop.png`
    },
    ashes_survival: {
        id: 'ashes_survival',
        title: 'Ashes & Survival',
        body: '4A recalls the correction, lifts the rack, and is destroyed. Elias escapes with Lucia\'s scorched drawing as sirens approach. He is alive; the medicine and tomorrow remain unresolved.',
        art: `${BACKGROUNDS}/bg_desert_epilogue_ashes.png`
    },
    open_hand: {
        id: 'open_hand',
        title: 'Open Hand',
        body: 'The archive reaches Marisol, a labor reporter, and a public mirror. A mutual-aid pharmacy voucher covers Lucia\'s refill.',
        art: `${BACKGROUNDS}/bg_desert_epilogue.png`
    }
});

export const GAME_OVERS = Object.freeze({
    // retryScope 'hotspot': un-visit only the terminal choice hotspots in the
    // current chapter and clear the outcome field, so retry resumes right
    // before the failed interaction ("Retry begins immediately before 4A
    // enters", scene-flow.md). retryScope 'chapter': restart the whole
    // chapter from its last persisted checkpoint ("Retry begins at the
    // kiosk's first prompt").
    crushed: {
        id: 'crushed',
        title: 'Crushed',
        body: 'The lockdown announcement loops as smoke overtakes the scene.',
        retryFrom: 'rescue_fumble',
        retryScope: 'hotspot'
    },
    lockout: {
        id: 'lockout',
        title: 'Lockout',
        body: 'The bag returns to holding. Lucia\'s unanswered message plays.',
        retryFrom: 'give_up',
        retryScope: 'chapter'
    }
});
