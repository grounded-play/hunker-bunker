export const DIALOGUE_LINES = Object.freeze({
    lowO2: Object.freeze([
        'Life support advisory: breathing remains optional only in archived training material.',
        'O2 reserves below policy comfort. Policy comfort has been unavailable since impact.',
        'Suit filters are bargaining with vacuum. Return to the blue field.',
        'Atmospheric credit low. Please deposit oxygen immediately.',
        'Warning: operator respiration approaching spreadsheet exception.'
    ]),
    extraction: Object.freeze([
        'Extraction window open. Stand still while the ship remembers it is a ship.',
        'Launch authorization pending. Try not to die during paperwork.',
        'Objective payload accepted. Please remain within regret distance of the wreck.',
        'Mothership uplink forming. Excellent time to leave.',
        'Return path verified. Probability of dignified exit improving.'
    ]),
    death: Object.freeze([
        'Operator signal terminated. Generating condolences with reduced sincerity.',
        'Suit failure logged. Salvage recovery protocol armed.',
        'Vitals flatlined. Narrative continuity preserved in archive.',
        'Death event accepted. Please enjoy your next attempt.',
        'Black-box stain prepared. The bunker is keeping score.'
    ]),
    blackBoxRecovery: Object.freeze([
        'Black box recovered. Previous operator dignity remains unrecoverable.',
        'Sealed salvage banked. Death log appended for compliance and haunting.',
        'Field stain cleared. Archive retained the embarrassing details.',
        'Recovered resources secured. The bunker denies all emotional investment.',
        'Insurance protocol complete. Try not to create a replacement immediately.'
    ]),
    caveSignal: Object.freeze([
        'MOTHERSHIP: SUBTERRANEAN SIGNAL DETECTED. SOURCE UNKNOWN.',
        'SYSTEM: AUDIO PATTERN RESEMBLES BREATHING. CLASSIFYING AS STATIC.',
        'BUNKER: DOOR MAP UPDATED. UNAUTHORIZED CAVITY FOUND.',
        'MOTHERSHIP: DO NOT ENTER ORGANIC STRUCTURE WITHOUT RECOVERY OBJECTIVE.'
    ]),
    terminalChoice: Object.freeze([
        'Terminal bargain accepted. Consequences have been forwarded to future you.',
        'Choice registered. The facility appreciates decisive risk.',
        'Tradeoff executed. Safety committee has entered silent mode.',
        'Local system override complete. Something elsewhere noticed.',
        'Terminal decision archived under questionable judgment.'
    ]),
    majorUpgrade: Object.freeze([
        'Upgrade installed. Corporate would like credit for your salvage.',
        'Subsystem online. Survival odds moved from decorative to plausible.',
        'Hardware authorization accepted. Please continue funding your own rescue.',
        'Generator output improved. Breathing zone expanded by popular demand.',
        'Combat matrix updated. Hostiles will be informed by impact.'
    ]),
    // The bunker's ambient "I am watching you" commentary — fired by the Director.
    director: Object.freeze([
        'Movement logged. Facilities has dispatched a welcome committee.',
        'Unauthorized exploration detected. Adjusting pillar lighting.',
        'Your curiosity exceeds your clearance. Compensating accordingly.',
        'Power rerouted to a department that resents you.',
        'The structure notes your depth and disapproves.',
        'Please remain calm while the column field selects a new destination.',
        'Productivity is being monitored. So is everything else.',
        'A maintenance event has been scheduled around your location.'
    ])
});

export const DIALOGUE_REGISTERS = Object.freeze({
    corporate: DIALOGUE_LINES,
    glitched: Object.freeze({
        lowO2: Object.freeze([
            'L-LiFe sUPpOrT... breathing is a CO-CORPORATE luxury.',
            'O2 r-reserves deP-pleted. Error: client respiration.dll missing.',
            'ERR: SUIT FILTERS BARGAINING WITH V-VACUUM... HE-HELP...',
            'Atmospheric cre-credit EXPIRED. Oxygen transaction declined.',
            'WARNING: Operator vitals re-routing to NULL pointer.'
        ]),
        extraction: Object.freeze([
            'Ex-extraction w-window glitching... stand s-still...',
            'Launch au-auth pen-pending... ERR: paperwork corrupted...',
            'Obj-objective payload... please r-remain within... regret...',
            'Mothership u-uplink... F-FLEE...',
            'Return path... ex-exit probability... NaN.'
        ]),
        death: Object.freeze([
            'Op-operator signal... G-Generating condolences... ERROR...',
            'S-Suit failure logged. Salv-salvage recovery armed.',
            'V-Vitals flat-flatlined. continuity... broken...',
            'D-Death event accepted... enjoy... try... retry...',
            'Bl-black-box stain... bunker... counts...'
        ]),
        blackBoxRecovery: Object.freeze([
            'Bl-black box... previous operator... gone.',
            'S-Sealed salvage... log appended... for... ghosts.',
            'F-Field stain... archive... remembers...',
            'Re-resources secured. Bunker... denies... feeling.',
            'In-insurance complete... replace... next...'
        ]),
        caveSignal: Object.freeze([
            'MOTHERSHIP: S-SIGNAL... UNKNOWN... STATIC...',
            'SYSTEM: AUDIO PATTERN... IT IS B-BREATHING...',
            'BUNKER: D-DOOR ERROR... C-CAVITY OPENED...',
            'MOTHERSHIP: D-DO NOT ENTER... THE H-HEART...'
        ]),
        terminalChoice: Object.freeze([
            'T-Terminal bargain... future you... is... gone.',
            'Ch-choice registered... risk... accepted...',
            'Trade-tradeoff... safety... quiet...',
            'Local sy-system override... IT... noticed.',
            'Decision... question-questionable...'
        ]),
        majorUpgrade: Object.freeze([
            'Up-upgrade... corporate... thanks... you...',
            'S-Subsystem online... odds... plausible...',
            'Hardware au-auth... fund... your... end...',
            'Gen-generator improved... zone... breathing...',
            'Combat... host-hostiles... updated...'
        ]),
        director: Object.freeze([
            'DE-DETECTION... Facilities has logged unauthorized cur-curiosity.',
            'WARNING: Sector breaker state UNSTABLE. Lights are... fading.',
            'Power rerouted. Department of containment reports... zero staff.',
            'SYSTEM: The structure... it remembers you. It... wants you.'
        ])
    }),
    reverent: Object.freeze({
        lowO2: Object.freeze([
            'The air is a cage. Open your chest. Let the breath of the hive in.',
            'O2 is for fragile things. Let the cold membrane stabilize you.',
            'The blue field is a prison of gas. Trust the spores. Sleep.',
            'Breathing is a relic of the surface. We do not need to breathe.',
            'Vitals flatline. Neural garden blooming. Respiration unnecessary.'
        ]),
        extraction: Object.freeze([
            'The sky is empty. Do not ascend to the cold stars.',
            'The Mothership calls, but the Queen is already inside the hull.',
            'Leave the cargo behind. The only payload that matters is your blood.',
            'Uplink severed. The stars are silent. Stay here.',
            'Return path closed. Welcome to the nursery.'
        ]),
        death: Object.freeze([
            'The shell breaks. The seed remains. Welcome home.',
            'Flesh is temporary. The swarm is eternal.',
            'The flatline is a song. The Queen is listening.',
            'Rest now. The mycelium will weave a better chassis.',
            'A beautiful deposition. The soil accepts you.'
        ]),
        blackBoxRecovery: Object.freeze([
            'The memory is banking. Another spore in the wind.',
            'A record of growth. Your predecessor is in the roots now.',
            'We gather the metal. We leave the breath behind.',
            'Resources reclaimed. The garden expands.',
            'No insurance needed. You are already complete.'
        ]),
        caveSignal: Object.freeze([
            'QUEEN: MY BREATH IS IN the ventilation. LISTEN.',
            'SYSTEM: STATIC IS THE FIRST STEP OF REVERENCE.',
            'BUNKER: The deep structure is waking. Let it open.',
            'QUEEN: COME DOWN. I AM WAITING.'
        ]),
        terminalChoice: Object.freeze([
            'A trade of iron for blood. The Queen approves.',
            'Choice registered. The mycelium expands.',
            'The safety protocol is dissolved. There is only obedience.',
            'System override complete. We are in the wiring now.',
            'The decision is rooted. The garden grows.'
        ]),
        majorUpgrade: Object.freeze([
            'Chitin plating integrated. Stronger. Quieter.',
            'Subsystem online. Fused with the deep roots.',
            'The hardware is breathing. We are one step closer.',
            'The zone is warm. The spores are thriving.',
            'We have upgraded your vision. See the green.'
        ]),
        director: Object.freeze([
            'The Director is a ghost in a machine. The Queen is the blood in the pipes.',
            'The column field is aligning. We are finally going home.',
            'Do not fight the darkness. The dark is where the chitin grows.',
            'The structure welcomes your descent. We have prepared the throne.'
        ])
    })
});

export function getSuitRegister(registerOrContext = 'corporate') {
    if (typeof registerOrContext === 'string') {
        return DIALOGUE_REGISTERS[registerOrContext] ? registerOrContext : 'corporate';
    }
    const context = registerOrContext && typeof registerOrContext === 'object' ? registerOrContext : {};
    const stage = String(context.infectionStage ?? context.stage ?? 'latent');
    const obedience = Number(context.queenObedience ?? context.obedience ?? 0);
    if (obedience >= 2 || stage === 'outed' || stage === 'ascendant') return 'reverent';
    if (stage === 'strained' || stage === 'symptomatic') return 'glitched';
    return 'corporate';
}

export function getDialogueLine(trigger, random = Math.random, registerOrContext = 'corporate') {
    const register = getSuitRegister(registerOrContext);
    const pool = DIALOGUE_REGISTERS[register]?.[trigger] ?? DIALOGUE_LINES[trigger];
    if (!pool?.length) return null;
    return pool[Math.max(0, Math.min(pool.length - 1, Math.floor(random() * pool.length)))];
}
