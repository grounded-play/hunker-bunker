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
        'Return corridor verified. Probability of dignified exit improving.'
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
        'Unauthorized exploration detected. Adjusting corridor enthusiasm.',
        'Your curiosity exceeds your clearance. Compensating accordingly.',
        'Power rerouted to a department that resents you.',
        'The structure notes your depth and disapproves.',
        'Please remain calm while the corridor selects a new destination.',
        'Productivity is being monitored. So is everything else.',
        'A maintenance event has been scheduled around your location.'
    ])
});

export function getDialogueLine(trigger, random = Math.random) {
    const pool = DIALOGUE_LINES[trigger];
    if (!pool?.length) return null;
    return pool[Math.max(0, Math.min(pool.length - 1, Math.floor(random() * pool.length)))];
}
