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
//   pain: string             -> setPain(state, pain)
//   timeCost: number          -> advanceTime(state, timeCost)
//   calibration: {quality, honest} -> completeCalibration(state, quality, honest)
//   finalChoice: string      -> chooseFinal(state, finalChoice)
//   rescue: {success}         -> attemptRescue(state, { success })
// A hotspot may combine several of these (e.g. a choice plus a timeCost).

export const CHAPTER_ORDER = Object.freeze([
    'parking_lot',
    'warehouse',
    'incident_review',
    'medi_kiosk',
    'server_room',
    'sector_four'
]);

export const ITEMS = Object.freeze({
    item_albuterol_bottle: { id: 'item_albuterol_bottle', label: 'Empty Albuterol Bottle' },
    item_lucia_drawing: { id: 'item_lucia_drawing', label: "Lucia's Drawing" },
    item_calibration_notebook: { id: 'item_calibration_notebook', label: 'Calibration Notebook' },
    item_temp_badge: { id: 'item_temp_badge', label: 'Temp Contractor Badge' },
    item_phone: { id: 'item_phone', label: 'Cracked Phone' },
    item_wire_cutters: { id: 'item_wire_cutters', label: 'Insulated Wire Cutters' }
});

export const CONTENT_WARNING = 'Depicts workplace injury, medical-access stress, child illness discussed off-screen, fire, and possible character death.';

export const CHAPTERS = Object.freeze({
    parking_lot: {
        id: 'parking_lot',
        title: 'Chapter 1: Parking Lot and Intake',
        goal: "Enter the shift with Elias's problem, tools, and deadline understood.",
        next: 'warehouse',
        hints: [
            "That empty bottle on the seat is the whole shift, before the shift even starts.",
            'The notebook holds the joint diagram you\'ll need at the line — open it now.',
            'Badge in at the reader once the bottle, the balance, and the message are all read.'
        ],
        hotspots: [
            {
                id: 'inspect_bottle',
                label: 'Albuterol Bottle',
                x: 180, y: 520, w: 90, h: 70,
                once: true,
                lines: ['Empty. Has been since Tuesday.'],
                effects: { item: 'item_albuterol_bottle' }
            },
            {
                id: 'compare_balance',
                label: 'Phone Balance',
                x: 340, y: 480, w: 90, h: 90,
                once: true,
                lines: ['Refill: $286.40. Balance: $19.12.', 'Benefits say active until 11:59 PM.'],
                effects: { item: 'item_phone' }
            },
            {
                id: 'listen_voicemail',
                label: "Lucia's Message",
                x: 500, y: 480, w: 90, h: 90,
                once: true,
                lines: ['"Hi Dad. Mom says don\'t forget the purple one."', '"I drew Robot 4A. I gave him shoes because he looks cold."']
            },
            {
                id: 'inspect_notebook',
                label: 'Calibration Notebook',
                x: 660, y: 520, w: 90, h: 70,
                once: true,
                lines: ['The drawing is folded inside. Robot 4A, in sneakers.', 'Joint diagrams on the facing page.'],
                effects: { item: 'item_calibration_notebook' }
            },
            {
                id: 'reply_to_lucia',
                label: 'Reply to Lucia',
                x: 500, y: 600, w: 90, h: 50,
                once: true,
                requires: {},
                lines: ['A short reply. It costs a few minutes he doesn\'t have.'],
                effects: { choice: 'reply_to_lucia', timeCost: 1 }
            },
            {
                id: 'speak_with_marisol',
                label: 'Marisol',
                x: 820, y: 560, w: 90, h: 90,
                once: true,
                lines: ['"You look like hell, Eli." "That\'s my good side."', 'She mentions the daycare pickup deadline, half to herself.'],
                effects: { choice: 'speak_with_marisol' }
            },
            {
                id: 'badge_in',
                label: 'Badge Reader',
                x: 1040, y: 500, w: 90, h: 90,
                once: true,
                requiresAllOf: ['inspect_bottle', 'compare_balance', 'listen_voicemail', 'inspect_notebook'],
                lines: ['Scratched badge: TEMP CONTRACTOR.', 'Reader flashes red: ACCESS GRANTED.'],
                effects: { item: 'item_temp_badge' },
                advances: true
            }
        ]
    },

    warehouse: {
        id: 'warehouse',
        title: 'Chapter 2: Warehouse Calibration',
        goal: 'Teach 4A to release and recenter an irregular load.',
        next: 'incident_review',
        hints: [
            'The notebook diagram marks the joint 4A keeps gripping wrong.',
            'Light pressure, then two taps: release, recenter.',
            'Select the joint, then apply pressure, then double-tap to finish.'
        ],
        hotspots: [
            {
                id: 'read_diagram',
                label: 'Notebook Diagram',
                x: 260, y: 460, w: 100, h: 90,
                once: true,
                lines: ['DOUBLE TAP = RELEASE PRESSURE / RECENTER.']
            },
            {
                id: 'select_joint',
                label: "4A's Joint",
                x: 560, y: 420, w: 120, h: 140,
                once: true,
                requiresAllOf: ['read_diagram'],
                lines: ['Two inches left of where it wants to grip.']
            },
            {
                id: 'apply_pressure',
                label: 'Apply Light Pressure',
                x: 560, y: 420, w: 120, h: 140,
                once: true,
                requiresAllOf: ['select_joint'],
                lines: ['Not harder. Smarter.']
            },
            {
                id: 'double_tap_honest',
                label: 'Double Tap — Log the Error',
                x: 500, y: 610, w: 130, h: 60,
                once: true,
                requiresAllOf: ['apply_pressure'],
                lines: ['The claw releases, recenters, sorts clean.', 'The metric counter still shows the miss. He leaves it.'],
                effects: { calibration: { quality: 2, honest: true } },
                advances: true
            },
            {
                id: 'double_tap_falsify',
                label: 'Double Tap — Clean the Log',
                x: 650, y: 610, w: 130, h: 60,
                once: true,
                requiresAllOf: ['apply_pressure'],
                lines: ['The claw releases, recenters, sorts clean.', 'He edits the metric before anyone reviews it.'],
                effects: { calibration: { quality: 2, honest: false } },
                advances: true
            }
        ]
    },

    incident_review: {
        id: 'incident_review',
        title: 'Chapter 3: Collision and Incident Review',
        goal: 'Preserve evidence while the review process tries to redefine events.',
        next: 'medi_kiosk',
        hints: [
            'The collision already happened. What matters now is what you keep.',
            'The footage, the notebook, and the swab result are all worth holding onto.',
            'Photograph the reader before the laptop closes.'
        ],
        hotspots: [
            {
                id: 'brace_for_impact',
                label: 'Brace',
                x: 240, y: 460, w: 110, h: 100,
                once: true,
                lines: ['A taped box jams the belt. 4A breaks its path.', 'The arm catches his shoulder, not his skull.'],
                effects: { pain: 'injured' },
                advances: true
            },
            {
                id: 'take_the_hit',
                label: "Don't Flinch",
                x: 240, y: 460, w: 110, h: 100,
                once: true,
                lines: ['A taped box jams the belt. 4A breaks its path.', 'He doesn\'t get clear in time.'],
                effects: { pain: 'severe' },
                advances: true
            },
            {
                id: 'demand_footage',
                label: 'Demand Footage',
                x: 500, y: 460, w: 110, h: 90,
                once: true,
                lines: ['"Point of contact is neutral until review is complete."', 'The two seconds before impact are missing. He notes it.'],
                effects: { evidence: 'camera_discrepancy' }
            },
            {
                id: 'keep_notebook',
                label: 'Keep the Notebook',
                x: 660, y: 460, w: 110, h: 90,
                once: true,
                lines: ['He keeps it in his jacket, not on the desk.'],
                effects: { choice: 'keep_notebook' }
            },
            {
                id: 'surrender_notebook',
                label: 'Surrender the Notebook',
                x: 780, y: 460, w: 110, h: 90,
                once: true,
                lines: ['He hands it over. HR keeps files, they say.'],
                effects: { choice: 'surrender_notebook' }
            },
            {
                id: 'complete_swab',
                label: 'Compulsory Swab',
                x: 500, y: 580, w: 110, h: 80,
                once: true,
                lines: ['The reader blinks, waiting.']
            },
            {
                id: 'photograph_result',
                label: 'Photograph the Reader',
                x: 500, y: 580, w: 110, h: 80,
                once: true,
                requiresAllOf: ['complete_swab'],
                requires: { flags: { swabCompleted: true } },
                lines: ['INCONCLUSIVE. He photographs it before the laptop closes.'],
                effects: { evidence: 'swab_photo', choice: 'complete_swab' }
            },
            {
                id: 'call_marisol',
                label: 'Call for Marisol',
                x: 940, y: 460, w: 120, h: 90,
                once: true,
                lines: ['Her daycare fee has already started ticking.']
            },
            {
                id: 'request_marisol_witness',
                label: 'Ask Her to Stay',
                x: 940, y: 570, w: 120, h: 60,
                once: true,
                requiresAllOf: ['call_marisol'],
                lines: ['She stays. It costs her.'],
                effects: { choice: 'request_marisol_witness' }
            },
            {
                id: 'release_marisol_from_request',
                label: 'Release Her',
                x: 1080, y: 570, w: 120, h: 60,
                once: true,
                requiresAllOf: ['call_marisol'],
                requires: { flags: { noticedMarisolPressure: true } },
                lines: ['He remembers the pickup deadline and waves her off.'],
                effects: { choice: 'release_marisol_from_request' }
            }
        ]
    },

    medi_kiosk: {
        id: 'medi_kiosk',
        title: 'Chapter 4: Medi-Kiosk',
        goal: 'Exhaust legitimate paths and decide what to do with the time that remains.',
        next: 'server_room',
        hints: [
            'Scan the bottle first — the kiosk will tell you exactly where things stand.',
            'Nothing here buys the medicine tonight. The puzzle is what you can prove.',
            'GIVE UP only if you mean it — there\'s no undoing it.'
        ],
        hotspots: [
            {
                id: 'scan_bottle',
                label: 'Scan the Bottle',
                x: 300, y: 480, w: 110, h: 100,
                once: true,
                lines: ['COVERAGE TERMINATED 6:42 PM.', 'Final pay: $14.00, after deductions.'],
                effects: { evidence: 'kiosk_record' }
            },
            {
                id: 'view_paycheck',
                label: 'Itemized Paycheck',
                x: 460, y: 480, w: 110, h: 100,
                once: true,
                requiresAllOf: ['scan_bottle'],
                lines: ['Productivity variance. Equipment delay. $14.00 net.'],
                effects: { evidence: 'payroll_record' }
            },
            {
                id: 'request_billing_agent',
                label: 'Request Billing Agent',
                x: 620, y: 480, w: 110, h: 100,
                once: true,
                requires: { maxTimeBand: 2 },
                lines: ['Wait time: forty-seven minutes.'],
                effects: { choice: 'request_billing_agent' }
            },
            {
                id: 'call_hr',
                label: 'Call HR',
                x: 780, y: 480, w: 110, h: 100,
                once: true,
                lines: ['"Separation pending review." No further comment.'],
                effects: { timeCost: 1 }
            },
            {
                id: 'call_lucia',
                label: 'Call Lucia',
                x: 940, y: 480, w: 110, h: 100,
                once: true,
                lines: ['"I\'m still at work, baby. I know."'],
                effects: { choice: 'call_lucia' }
            },
            {
                id: 'document_bag',
                label: 'Document the Bag',
                x: 300, y: 620, w: 200, h: 70,
                once: true,
                lines: ['Three inches away, behind reinforced glass.', '"Command not recognized."']
            },
            {
                id: 'give_up',
                label: 'GIVE UP',
                x: 940, y: 620, w: 110, h: 70,
                once: true,
                lines: ['The bag returns to holding. Her message plays again.'],
                effects: { choice: 'give_up_at_kiosk' }
            }
        ]
    },

    server_room: {
        id: 'server_room',
        title: 'Chapter 5: Server Room',
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
                x: 500, y: 420, w: 160, h: 140,
                once: true,
                lines: ['TRAINING MODEL: SORT_ARM_4A', 'HUMAN CALIBRATION SOURCE: ELIAS MORALES'],
                effects: { evidence: 'training_profile' }
            },
            {
                id: 'walk_away',
                label: 'Leave the Profile Intact',
                x: 320, y: 620, w: 160, h: 70,
                once: true,
                requiresAllOf: ['read_terminal'],
                lines: ['ADMIN LOCK. ACCESS DENIED. He steps back from the terminal.'],
                effects: { finalChoice: 'preserve' },
                advances: true
            },
            {
                id: 'expose_profile',
                label: 'Copy and Transmit',
                x: 560, y: 620, w: 160, h: 70,
                once: true,
                requiresAllOf: ['read_terminal'],
                requires: { canExpose: true },
                lines: ['The token has a window. He copies fast.'],
                effects: { finalChoice: 'expose' },
                advances: true
            },
            {
                id: 'sever_trunk',
                label: 'Sever the Data Trunk',
                x: 800, y: 620, w: 160, h: 70,
                once: true,
                requiresAllOf: ['read_terminal'],
                lines: ['Deletion denied. He reaches for the insulated cutters instead.'],
                effects: { finalChoice: 'sever', item: 'item_wire_cutters' },
                advances: true
            }
        ]
    },

    sector_four: {
        id: 'sector_four',
        title: 'Chapter 6: Sector 4 and Epilogue',
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
                x: 300, y: 460, w: 110, h: 90,
                once: true,
                lines: ['The system says to wait. He pulls it anyway.']
            },
            {
                id: 'cross_to_rack',
                label: 'Cross the Floor',
                x: 500, y: 460, w: 110, h: 90,
                once: true,
                requiresAllOf: ['pull_alarm'],
                lines: ['A rack collapses. Lucia\'s drawing lands just out of reach.']
            },
            {
                id: 'rescue_recenter',
                label: 'Tap. Tap.',
                x: 700, y: 460, w: 110, h: 90,
                once: true,
                requiresAllOf: ['cross_to_rack'],
                lines: ['Same joint, same pressure. 4A releases, recenters, lifts.'],
                effects: { rescue: { success: true } },
                advances: true
            },
            {
                id: 'rescue_fumble',
                label: 'Grab the Chassis',
                x: 700, y: 570, w: 110, h: 60,
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
        body: 'Elias remains separated from RGB; the company retains his training data. Lucia\'s refill remains unresolved. 4A continues to sort with his gentle correction.'
    },
    ashes_survival: {
        id: 'ashes_survival',
        title: 'Ashes & Survival',
        body: '4A recalls the correction, lifts the rack, and is destroyed. Elias escapes with Lucia\'s scorched drawing as sirens approach. He is alive; the medicine and tomorrow remain unresolved.'
    },
    open_hand: {
        id: 'open_hand',
        title: 'Open Hand',
        body: 'The archive reaches Marisol, a labor reporter, and a public mirror. A mutual-aid pharmacy voucher covers Lucia\'s refill.'
    }
});

export const GAME_OVERS = Object.freeze({
    crushed: {
        id: 'crushed',
        title: 'Crushed',
        body: 'The lockdown announcement loops as smoke overtakes the scene.',
        retryFrom: 'rescue_fumble'
    },
    lockout: {
        id: 'lockout',
        title: 'Lockout',
        body: 'The bag returns to holding. Lucia\'s unanswered message plays.',
        retryFrom: 'give_up'
    }
});
