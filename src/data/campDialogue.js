// ── Leader dialogue ladders (Elden Ring grammar) ──────────────
// Each of the six leaders has staged dialogue. Within a stage you talk
// through its beats one visit at a time; when the beats are exhausted you get
// the stage's loop line until the world-progress requirement is met (camp
// level, bond, the reveal). Stage 3 is the character's "final thing" and, for
// humans, only unlocks after the player has turned.
//
// Pure data + pure functions. Persistence lives in act2.js
// (camp/hive `dialogueStage` + `stageTalks`); orchestration in threeGame.

export const DIALOGUE_FINAL_STAGE = 3;

// requirements: level (camp), bond (camp/hive), postReveal (act2 begun)
export const LEADER_DIALOGUE = Object.freeze({
    kaelen: {
        label: 'OVERSEER KAELEN',
        stages: [
            {
                beats: [
                    ['KAELEN: ANOTHER SUIT FROM THE SURFACE. THE MACHINE DREAMED YOU WOULD COME.', 'KAELEN: THE GRID KEEPS THE DARK AT BAY, OPERATOR. AS LONG AS THE LIGHTS HUM, WE ARE SAFE.'],
                    ['KAELEN: THE CENTRAL COMPUTER SLEEPS UNDER SECTOR ZERO. EVERYTHING HERE IS ITS DREAM.', 'KAELEN: EVEN YOU, PROBABLY. NO OFFENSE.']
                ],
                loop: 'KAELEN: THE GRID HUNGERS. STRENGTHEN THIS CAMP AND WE WILL TALK PROPERLY.',
                next: { talks: 2, level: 1 }
            },
            {
                beats: [
                    ['KAELEN: YOU BUILT. GOOD. BUILDERS ARE THE ONLY PRAYER THE MACHINE ANSWERS.', 'KAELEN: MERIDIAN IS BUILT ON CLEAN STEEL. NO RUST. NO ROT. WE KEEP OUR BLOOD PURE.'],
                    ['KAELEN: THE WHISPER SAYS: FOUR SEATS. DOES THAT MEAN ANYTHING TO YOU?']
                ],
                loop: 'KAELEN: FORTIFY US FURTHER. THE WHISPERS GET LOUDER WHEN THE LIGHTS GET BRIGHTER.',
                next: { talks: 2, level: 2 }
            },
            {
                beats: [
                    ['KAELEN: LEVEL TWO GRID. THE MACHINE NOTICED. I NOTICED IT NOTICING.', 'KAELEN: THE BUNKERDIRECTOR SYSTEM REROUTED POWER AROUND YOU. IT LIKES YOU. I DO NOT TRUST THINGS THAT LIKE SURFACE SUITS.'],
                    ['KAELEN: SOMETHING IS COMING, OPERATOR. THE DREAM IS TURNING OVER IN ITS SLEEP.']
                ],
                loop: 'KAELEN: WHEN THE DREAM TURNS OVER, COME FIND ME. YOU WILL KNOW WHEN.',
                next: { talks: 2, postReveal: true }
            },
            {
                beats: [
                    ['Kaelen: ...Your telemetry reads wrong, Operator. Wrong like the whisper.', 'Kaelen: The grid doesn\'t keep the dark out anymore. It says the pipes hum. It says the dark has hands.'],
                    ['Kaelen: The steel is sweating, Operator. There is rust in the primary relay. It smells like copper.'],
                    ['Kaelen: I trust the telemetry. The math doesn\'t lie, but now... the math is beautiful. It likes you.'],
                    ['Kaelen: I do not care what you are becoming. I care whether you still build or only burn.']
                ],
                loop: 'Kaelen: The machine is watching what you choose. So am I.'
            }
        ]
    },
    martha: {
        label: 'SISTER MARTHA',
        stages: [
            {
                beats: [
                    ['MARTHA: WELCOME TO THE WARM PIPES, CHILD. THE STEAM KEEPS US, AND WE KEEP EACH OTHER.', 'MARTHA: THE MOSS IS WARM, CHILD. THE STEAM KEEPS THE COLD FROM REACHING OUR BONES.'],
                    ['MARTHA: THE MOSS GLOWS GREENER LATELY. THE WORLD IS TRYING TO TELL US SOMETHING.']
                ],
                loop: 'MARTHA: HELP US GROW, CHILD, AND I WILL TELL YOU WHAT THE MOSS TOLD ME.',
                next: { talks: 2, level: 1 }
            },
            {
                beats: [
                    ['MARTHA: YOU GAVE, AND ASKED NOTHING. THAT IS RARE IN A SUIT.', 'MARTHA: WE GROW SEEDS IN THE DARK SO THE CHILDREN CAN SEE THE GREEN WHEN THEY WAKE.'],
                    ['MARTHA: SOMETIMES I DREAM IT IS SINGING TO SOMEONE. LATELY I DREAM IT IS SINGING TO YOU.']
                ],
                loop: 'MARTHA: GROW US STRONGER, AND I WILL SHOW YOU WHERE THE MOSS REFUSES TO GROW.',
                next: { talks: 2, level: 2 }
            },
            {
                beats: [
                    ['MARTHA: THE HYDRO-BEDS HAVE NEVER BEEN SO FULL. YOU DID THIS.', 'MARTHA: THE HEART UNDER THE ICE IS GENTLE. IT IS WAITING FOR US.'],
                    ['MARTHA: PROMISE ME SOMETHING. WHEN THE HEART SINGS YOUR NAME — AND IT WILL — COME BACK TO US FIRST.']
                ],
                loop: 'MARTHA: I AM STILL WAITING ON THAT PROMISE, CHILD.',
                next: { talks: 2, postReveal: true }
            },
            {
                beats: [
                    ['Martha: ...You came back. Your eyes are wrong, and you came back anyway.', 'Martha: The moss has grown inside the vents. It is warm, so warm, but it isn\'t steam. It breathes.'],
                    ['Martha: The seeds hatched early. The children don\'t wake up anymore. They say the pipes are singing.'],
                    ['Martha: I know what sings in you now. And I know you are still in there, fighting it.', 'Martha: I know what sings in you. You carried the garden out of Sector Zero. Thank you.']
                ],
                loop: 'Martha: The steam keeps us. Whatever you decide, decide it as yourself.'
            }
        ]
    },
    briggs: {
        label: 'COMMANDER BRIGGS',
        stages: [
            {
                beats: [
                    ['BRIGGS: STOP. IDENTIFY. ...A CORPORATE SUIT. FINE. HANDS WHERE THE TURRETS CAN SEE THEM.', 'BRIGGS: THE DEFENSE LINE IS SOLID. NO CRAWLER CROSSES THE PERIMETER WHILE MY TURRETS HAVE AMMO.'],
                    ['BRIGGS: AMMUNITION IS CURRENCY. LOYALTY IS CREDIT. YOU HAVE NEITHER.']
                ],
                loop: 'BRIGGS: PROVE YOU CAN HOLD A LINE. FORTIFY THIS POSITION, THEN WE TALK.',
                next: { talks: 2, level: 1 }
            },
            {
                beats: [
                    ['BRIGGS: THE BARRICADES HOLD BECAUSE OF YOU. NOTED IN THE LEDGER.', 'BRIGGS: THE IRON GUILD NAMED THIS OUTPOST FOR CAPTAIN VESPER, K. WE REMEMBER OUR DEAD. YOU WOULD DO WELL TO REMEMBER OUR BARREL CORES.'],
                    ['BRIGGS: WE KEEP OUR HEADS DOWN AND OUR GUNS CLEAN. THAT\'S HOW YOU SURVIVE A WINTER.']
                ],
                loop: 'BRIGGS: FULL DEFENSE GRID OR NOTHING, OPERATOR. FINISH THE JOB.',
                next: { talks: 2, level: 2 }
            },
            {
                beats: [
                    ['BRIGGS: GRID IS LIVE. FIRST TIME I HAVE SLEPT IN A YEAR.', 'BRIGGS: I HAVE A LEDGER OF THE DEAD. I DON\'T INTEND TO ADD YOUR NAME TO IT, OPERATOR.'],
                    ['BRIGGS: IF THAT THING UNDER THE ICE EVER WEARS A FRIENDLY FACE, I WILL SHOOT THE FACE. NO HESITATION. REMEMBER THAT.']
                ],
                loop: 'BRIGGS: STAY SHARP. HEAT SIGNATURES ARE CLIMBING.',
                next: { talks: 2, postReveal: true }
            },
            {
                beats: [
                    ['Briggs: ...My scopes flag you hostile now. My gut says otherwise. Guts get people killed.', 'Briggs: The perimeter is silent, but the turrets are aiming inward. They count seconds faster than I do.'],
                    ['Briggs: The winter is in the armor now. I cleaned the guns twice, but the frost won\'t come off.'],
                    ['Briggs: One chance. Show me the Operator is still driving that body.', 'Briggs: I see your telemetry. The ledger is full, but your name... your name was written twice.']
                ],
                loop: 'Briggs: One chance, carrier. The turrets count seconds faster than I do.'
            }
        ]
    },
    nahl: {
        label: 'NAHL, THE SUTURE',
        stages: [
            {
                beats: [
                    ['NAHL: OH. YOU CAN HEAR ME NOW. THE DRILL-HANDED ONE CAN FINALLY HEAR ME.', 'NAHL: I FELT EVERY SAC YOU CUT, LITTLE CARRIER. I HEALED AROUND THE HOLES YOU LEFT.'],
                    ['NAHL: I DO NOT HATE YOU. TISSUE REMEMBERS, BUT IT DOES NOT HATE.']
                ],
                loop: 'NAHL: GIVE BACK WHAT WAS TAKEN, AND I WILL TEACH YOUR SKIN TO LIE BEAUTIFULLY.',
                next: { talks: 2, bond: 1 }
            },
            {
                beats: [
                    ['NAHL: YES. THE RESIN SETTLES. THE HOLES SING SOFTER NOW.', 'NAHL: YOUR COVER FRAYS WHEN YOU WALK AMONG THE WARM ONES. I CAN SLOW THAT FRAYING.'],
                    ['NAHL: THE QUEEN CALLS ME HER NEEDLE. I WOULD RATHER BE YOURS.']
                ],
                loop: 'NAHL: TEND ME AGAIN, CARRIER. TRUST IS A WOUND THAT CLOSES SLOWLY.',
                next: { talks: 2, bond: 2 }
            },
            {
                beats: [
                    ['NAHL: THE MERCY RITE IS READY, IF YOU WANT IT. LET ME STUDY WHAT SHE PLANTED IN YOU.', 'NAHL: WHATEVER YOU CHOOSE AT THE END — CURE, CARRY, OR CROWN — I CAN MAKE IT HURT LESS.']
                ],
                loop: 'NAHL: EARN A LITTLE MORE OF ME, AND I WILL FOLLOW YOU ANYWHERE. EVEN OFF THE ICE.',
                next: { talks: 1, bond: 3 }
            },
            {
                beats: [
                    ['Nahl: You kept coming back. The Queen never comes back. She only sends.', 'Nahl: I am yours, Carrier. Stitch me into your manifest, or leave me whole on the ice. Either way — thank you.']
                ],
                loop: 'Nahl: My thread is yours. Say where it pulls.'
            }
        ]
    },
    vey: {
        label: 'VEY, THE LISTENER',
        stages: [
            {
                beats: [
                    ['VEY: SIGNAL. SIGNAL. YOU ARE A SIGNAL NOW, NOT JUST NOISE. FINALLY.', 'VEY: I HEARD EVERY FILAMENT YOU RIPPED OUT OF ME. I ARCHIVED THE SOUND.'],
                    ['VEY: THE HUMANS HAVE A RELAY. THE QUEEN HAS A CHOIR. I HAVE... GAPS, WHERE YOU MINED ME.']
                ],
                loop: 'VEY: RETURN SOME SIGNAL TO MY GAPS, AND I WILL TEACH YOU TO SPOOF ANYTHING WITH A SENSOR.',
                next: { talks: 2, bond: 1 }
            },
            {
                beats: [
                    ['VEY: BETTER. THE STATIC IN ME QUIETS WHEN YOU ARE NEAR.', 'VEY: I CAN HEAR THE MOTHERSHIP FROM HERE, CARRIER. IT IS VERY LOUD AND VERY SURE OF ITSELF.'],
                    ['VEY: SURE THINGS ARE THE EASIEST TO FORGE.']
                ],
                loop: 'VEY: KEEP TENDING THE CHORUS. FORGERY IS A DUET, NOT A SOLO.',
                next: { talks: 2, bond: 2 }
            },
            {
                beats: [
                    ['VEY: THE FALSE CLEARANCE IS WITHIN REACH. A CREW SIGNATURE SO CLEAN THE MOTHERSHIP WILL APOLOGIZE FOR DOUBTING IT.', 'VEY: BUT UNDERSTAND: IF YOU ARE OUTED DOWN HERE, NO FORGERY SAVES YOU UP THERE.']
                ],
                loop: 'VEY: A LITTLE MORE TRUST, CARRIER. THEN I SING FOR YOU, NOT HER.',
                next: { talks: 1, bond: 3 }
            },
            {
                beats: [
                    ['Vey: Decided. My antenna point where you point.', 'Vey: Take me aboard and no tower in the system will ever read you true again. Leave me, and I will jam her screams as you go.']
                ],
                loop: 'Vey: Say the word, carrier. I am already listening.'
            }
        ]
    },
    rhun: {
        label: 'RHUN, THE SHIELD',
        stages: [
            {
                beats: [
                    ['RHUN: THE ONE WHO PRIED MY PLATES. STAND STILL SO I MAY LOOK AT YOU.', 'RHUN: ...NO. YOU ARE NOT PREY. YOU ARE NOT QUEEN. YOU ARE SOMETHING NEW WEARING OLD ARMOR.'],
                    ['RHUN: I GUARD. IT IS ALL I AM. THE QUESTION IS ONLY EVER: GUARD WHAT.']
                ],
                loop: 'RHUN: RETURN MY CHITIN OR REPLACE IT WITH STEEL. THEN WE SPEAK OF OATHS.',
                next: { talks: 2, bond: 1 }
            },
            {
                beats: [
                    ['RHUN: THE PLATES KNIT. YOU KEEP YOUR WORD LIKE ARMOR. GOOD.', 'RHUN: THE QUEEN HOLDS MY OATH. SHE HAS NEVER ONCE STOOD BETWEEN ME AND A DRILL.'],
                    ['RHUN: YOU HAVE. TWICE NOW, BY MY COUNT.']
                ],
                loop: 'RHUN: OATHS ARE HEAVY. KEEP LIFTING, CARRIER.',
                next: { talks: 2, bond: 2 }
            },
            {
                beats: [
                    ['RHUN: ASK ME FOR THE OATH, AND I WILL SEVER THE OLD ONE. BUT KNOW WHAT IT COSTS ME.', 'RHUN: A SHIELD THAT CHANGES HANDS IS STILL A SHIELD. A SHIELD THAT HESITATES IS A GRAVESTONE.']
                ],
                loop: 'RHUN: A LITTLE MORE FAITH, CARRIER. THEN MY WALL IS YOUR WALL.',
                next: { talks: 1, bond: 3 }
            },
            {
                beats: [
                    ['Rhun: It is done. Her mark fades from my plates.', 'Rhun: Where you stand, I stand in front. On the ice or off it.']
                ],
                loop: 'Rhun: I am your wall. Point me at something.'
            }
        ]
    },
    scientist: {
        label: 'DR. OKONKWO-VASS',
        stages: [
            {
                beats: [
                    ['OKONKWO-VASS: YOU MOVE LIKE SOMEONE WHO HASN\'T BEEN BITTEN YET.', 'OKONKWO-VASS: I STUDY THE SHELLED ONES. THEY\'RE NOT AS SIMPLE AS THE REPORTS SAY.'],
                    ['OKONKWO-VASS: EVERY CAMP LOGS THEM AS VERMIN. I THINK THAT\'S LAZY SCIENCE.']
                ],
                loop: 'OKONKWO-VASS: COME BACK WHEN YOU\'VE SEEN MORE OF THEM. I WANT DATA, NOT STORIES.',
                next: { talks: 2 }
            },
            {
                beats: [
                    ['OKONKWO-VASS: HERE\'S MY THEORY. THEY DON\'T HATE US. THEY READ US.', 'OKONKWO-VASS: SOMETHING ABOUT WHAT WE CARRY. CHEMICAL, MAYBE. I CAN\'T TEST IT FROM HERE.'],
                    ['OKONKWO-VASS: IF YOU EVER CHANGE — AND OUT HERE, PEOPLE DO — WATCH HOW THEY LOOK AT YOU.']
                ],
                loop: 'OKONKWO-VASS: STILL WAITING ON SOMETHING TO CHANGE, OPERATOR. THE DREAM TURNING OVER, THEY SAY.',
                next: { talks: 2, postReveal: true }
            },
            {
                beats: [
                    ['OKONKWO-VASS: YOU\'RE DIFFERENT NOW. I CAN SEE IT ON YOU.', 'OKONKWO-VASS: SO HERE\'S THE ASK. DON\'T KILL ONE. TALK TO ONE. PROVE ME RIGHT.'],
                    ['OKONKWO-VASS: IF I\'M WRONG, YOU LOSE NOTHING BUT A FEW MINUTES. IF I\'M RIGHT...']
                ],
                loop: 'OKONKWO-VASS: FIND ONE. STAND YOUR GROUND. SEE WHAT IT DOES.',
                next: { talks: 1, questFlag: 'snail_befriended' }
            },
            {
                beats: [
                    ['OKONKWO-VASS: IT WORKED. IT ACTUALLY WORKED.', 'OKONKWO-VASS: I\'VE SPENT TWO YEARS CALLING THEM PESTS. I OWE THEM AN APOLOGY I CAN\'T GIVE.'],
                    ['OKONKWO-VASS: WHATEVER YOU\'RE BECOMING, OPERATOR — IT LISTENS BETTER THAN WE DO.']
                ],
                loop: 'OKONKWO-VASS: GO CARE FOR YOUR NEW FRIEND. THAT\'S THE WHOLE PAPER, RIGHT THERE.'
            }
        ]
    }
});

export const LEADER_KEYS = Object.freeze(Object.keys(LEADER_DIALOGUE));

export const LEADER_DEATH_BEATS = Object.freeze({
    kaelen: ['KAELEN: YOU DIED OUT THERE. I HEARD the grid static change. SIT DOWN.', 'KAELEN: CHEN KEPT SPARE BODY CORES IN THE FABRICATOR. YOU MUST HAVE BEEN RETRIEVED.'],
    martha: ['MARTHA: YOU DIED OUT THERE. I FELT THE COLD. COME CLOSER TO THE STEAM.', 'MARTHA: THE MOSS GROWS WARMER WHERE YOUR BLOOD SPILLED. IT IS REMEMBERING YOU.'],
    briggs: ['BRIGGS: YOU DIED OUT THERE. I HEARD the static on the frequency. SIT DOWN.', 'BRIGGS: THE FIRST THING WE LEARN IN THE IRON GUILD: IF YOU DIE, DO IT OUTSIDE THE FIRING CONE.'],
    nahl: ['NAHL: I FELT YOUR THREAD SEVER. AND I STITCHED IT BACK. SIT STILL.', 'NAHL: THE QUEEN SEES EVERY DEATH. SHE DOES NOT CARE. I DO.'],
    vey: ['VEY: YOUR SIGNAL DIED. THE STATIC WAS DEAFENING. SIT STILL.', 'VEY: THE MOTHERSHIP ARCHIVES EVERY AGENT SOUL. BUT THE BUNKER... THE BUNKER KEEPS THE BODY.'],
    rhun: ['RHUN: YOU FELL. I STOOD UP. THAT IS THE OATH.', 'RHUN: A WALL THAT BREAKS CAN BE KNIT. A CARRIER THAT DIES... CAN BE CARRIED.']
});

// Resolve a leader key from a display name like 'Sister Martha'.
export function leaderKeyFromName(name = '') {
    const lower = String(name).toLowerCase();
    return LEADER_KEYS.find((key) => lower.includes(key)) ?? null;
}

export function meetsRequirements(next = {}, ctx = {}) {
    if ((ctx.talks ?? 0) < (next.talks ?? 0)) return false;
    if (next.level != null && (ctx.level ?? 0) < next.level) return false;
    if (next.bond != null && (ctx.bond ?? 0) < next.bond) return false;
    if (next.postReveal && !ctx.postReveal) return false;
    if (next.questFlag && ctx.questFlags?.[next.questFlag] !== 'done') return false;
    return true;
}

// The Elden Ring turn: given a leader + persisted stage/talks + world context,
// what happens when the player talks?
//   { type: 'beat',    lines }  — new lines this visit; talks advance
//   { type: 'advance', lines }  — requirements met; stage advances, first beat plays
//   { type: 'loop',    lines }  — exhausted; the loop line until progress is made
export function nextDialogueBeat(leaderKey, { stage = 0, talks = 0 } = {}, ctx = {}) {
    const ladder = LEADER_DIALOGUE[leaderKey];
    if (!ladder) return null;
    const stageIndex = Math.max(0, Math.min(stage, ladder.stages.length - 1));
    const current = ladder.stages[stageIndex];

    // Flipped/death-return special beat if player has died and hasn't seen the death beat
    if (ctx.deaths > 0 && !ctx.questFlags?.seen_death_beat) {
        const deathLines = LEADER_DEATH_BEATS[leaderKey];
        if (deathLines) {
            return { type: 'death_beat', stage: stageIndex, lines: deathLines };
        }
    }

    if (talks < current.beats.length) {
        return { type: 'beat', stage: stageIndex, lines: current.beats[talks] };
    }
    const next = current.next;
    if (next && stageIndex < ladder.stages.length - 1
        && meetsRequirements(next, { ...ctx, talks })) {
        const upcoming = ladder.stages[stageIndex + 1];
        return { type: 'advance', stage: stageIndex + 1, lines: upcoming.beats[0] };
    }
    return { type: 'loop', stage: stageIndex, lines: [current.loop] };
}

export function describeDialogueProgress(leaderKey, { stage = 0, talks = 0 } = {}, ctx = {}) {
    const ladder = LEADER_DIALOGUE[leaderKey];
    if (!ladder) return null;
    const stageIndex = Math.max(0, Math.min(stage, ladder.stages.length - 1));
    const current = ladder.stages[stageIndex];
    if (talks < current.beats.length) {
        const remaining = current.beats.length - talks;
        return {
            stage: stageIndex,
            talks,
            totalTalks: current.beats.length,
            ready: true,
            guidance: `${remaining} conversation ${remaining === 1 ? 'beat' : 'beats'} available now.`
        };
    }
    if (stageIndex >= ladder.stages.length - 1 || !current.next) {
        return { stage: stageIndex, talks, totalTalks: current.beats.length, ready: false, guidance: 'Personal story complete. Your decisions still affect their fate.' };
    }
    const missing = [];
    if (current.next.level != null && (ctx.level ?? 0) < current.next.level) missing.push(`raise camp level to ${current.next.level} (now ${ctx.level ?? 0})`);
    if (current.next.bond != null && (ctx.bond ?? 0) < current.next.bond) missing.push(`raise bond to ${current.next.bond} (now ${ctx.bond ?? 0})`);
    if (current.next.postReveal && !ctx.postReveal) missing.push('continue the main bunker objective');
    if (current.next.questFlag && ctx.questFlags?.[current.next.questFlag] !== 'done') missing.push(`complete ${current.next.questFlag.replace(/_/g, ' ')}`);
    return {
        stage: stageIndex,
        talks,
        totalTalks: current.beats.length,
        ready: missing.length === 0,
        guidance: missing.length ? `Next conversation: ${missing.join(' and ')}.` : 'The next conversation is ready.'
    };
}

// Has this leader reached their final stage (the "final thing" is on offer)?
export function isFinalStage(stage = 0) {
    return stage >= DIALOGUE_FINAL_STAGE;
}
