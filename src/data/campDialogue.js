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
                    ['KAELEN: ANOTHER SUIT FROM THE SURFACE. THE MACHINE DREAMED YOU WOULD COME.', 'KAELEN: MERIDIAN TRADES IN TRUTH AND VOLTAGE. BRING SHELLS IF YOU WANT EITHER.'],
                    ['KAELEN: THE CENTRAL COMPUTER SLEEPS UNDER SECTOR ZERO. EVERYTHING HERE IS ITS DREAM.', 'KAELEN: EVEN YOU, PROBABLY. NO OFFENSE.']
                ],
                loop: 'KAELEN: THE GRID HUNGERS. STRENGTHEN THIS CAMP AND WE WILL TALK PROPERLY.',
                next: { talks: 2, level: 1 }
            },
            {
                beats: [
                    ['KAELEN: YOU BUILT. GOOD. BUILDERS ARE THE ONLY PRAYER THE MACHINE ANSWERS.', 'KAELEN: I FOUND A DEAD RELAY NODE THAT STILL WHISPERS. IT SAYS A NAME I DO NOT KNOW.'],
                    ['KAELEN: THE WHISPER SAYS: FOUR SEATS. DOES THAT MEAN ANYTHING TO YOU?']
                ],
                loop: 'KAELEN: FORTIFY US FURTHER. THE WHISPERS GET LOUDER WHEN THE LIGHTS GET BRIGHTER.',
                next: { talks: 2, level: 2 }
            },
            {
                beats: [
                    ['KAELEN: LEVEL TWO GRID. THE MACHINE NOTICED. I NOTICED IT NOTICING.', 'KAELEN: SOMETHING IS COMING, OPERATOR. THE DREAM IS TURNING OVER IN ITS SLEEP.']
                ],
                loop: 'KAELEN: WHEN THE DREAM TURNS OVER, COME FIND ME. YOU WILL KNOW WHEN.',
                next: { talks: 1, postReveal: true }
            },
            {
                beats: [
                    ['KAELEN: ...YOUR TELEMETRY READS WRONG, OPERATOR. WRONG LIKE THE WHISPER.', 'KAELEN: I DO NOT CARE WHAT YOU ARE BECOMING. I CARE WHETHER YOU STILL BUILD OR ONLY BURN.']
                ],
                loop: 'KAELEN: THE MACHINE IS WATCHING WHAT YOU CHOOSE. SO AM I.'
            }
        ]
    },
    martha: {
        label: 'SISTER MARTHA',
        stages: [
            {
                beats: [
                    ['MARTHA: WELCOME TO THE WARM PIPES, CHILD. THE STEAM KEEPS US, AND WE KEEP EACH OTHER.', 'MARTHA: WE DO NOT CARRY GUNS HERE. WE CARRY SEEDS.'],
                    ['MARTHA: THE MOSS GLOWS GREENER LATELY. THE WORLD IS TRYING TO TELL US SOMETHING.']
                ],
                loop: 'MARTHA: HELP US GROW, CHILD, AND I WILL TELL YOU WHAT THE MOSS TOLD ME.',
                next: { talks: 2, level: 1 }
            },
            {
                beats: [
                    ['MARTHA: YOU GAVE, AND ASKED NOTHING. THAT IS RARE IN A SUIT.', 'MARTHA: THE MOSS SAYS THERE IS A HEART UNDER THE ICE. NOT A MACHINE. A HEART.'],
                    ['MARTHA: SOMETIMES I DREAM IT IS SINGING TO SOMEONE. LATELY I DREAM IT IS SINGING TO YOU.']
                ],
                loop: 'MARTHA: GROW US STRONGER, AND I WILL SHOW YOU WHERE THE MOSS REFUSES TO GROW.',
                next: { talks: 2, level: 2 }
            },
            {
                beats: [
                    ['MARTHA: THE HYDRO-BEDS HAVE NEVER BEEN SO FULL. YOU DID THIS.', 'MARTHA: PROMISE ME SOMETHING. WHEN THE HEART SINGS YOUR NAME — AND IT WILL — COME BACK TO US FIRST.']
                ],
                loop: 'MARTHA: I AM STILL WAITING ON THAT PROMISE, CHILD.',
                next: { talks: 1, postReveal: true }
            },
            {
                beats: [
                    ['MARTHA: ...YOU CAME BACK. YOUR EYES ARE WRONG AND YOU CAME BACK ANYWAY.', 'MARTHA: I KNOW WHAT SINGS IN YOU NOW. AND I KNOW YOU ARE STILL IN THERE, FIGHTING IT.']
                ],
                loop: 'MARTHA: THE STEAM KEEPS US. WHATEVER YOU DECIDE, DECIDE IT AS YOURSELF.'
            }
        ]
    },
    briggs: {
        label: 'COMMANDER BRIGGS',
        stages: [
            {
                beats: [
                    ['BRIGGS: STOP. IDENTIFY. ...A CORPORATE SUIT. FINE. HANDS WHERE THE TURRETS CAN SEE THEM.', 'BRIGGS: VESPER PROTECTS ITS OWN. YOU ARE NOT OUR OWN. YET.'],
                    ['BRIGGS: AMMUNITION IS CURRENCY. LOYALTY IS CREDIT. YOU HAVE NEITHER.']
                ],
                loop: 'BRIGGS: PROVE YOU CAN HOLD A LINE. FORTIFY THIS POSITION, THEN WE TALK.',
                next: { talks: 2, level: 1 }
            },
            {
                beats: [
                    ['BRIGGS: THE BARRICADES HOLD BECAUSE OF YOU. NOTED IN THE LEDGER.', 'BRIGGS: SOMETHING BIG MOVES UNDER SECTOR ZERO. MY SCOPES SEE HEAT WHERE THERE SHOULD BE ICE.'],
                    ['BRIGGS: WHEN IT SURFACES, I INTEND TO BE THE LAST THING STANDING. YOU COULD BE THE SECOND-LAST.']
                ],
                loop: 'BRIGGS: FULL DEFENSE GRID OR NOTHING, OPERATOR. FINISH THE JOB.',
                next: { talks: 2, level: 2 }
            },
            {
                beats: [
                    ['BRIGGS: GRID IS LIVE. FIRST TIME I HAVE SLEPT IN A YEAR.', 'BRIGGS: IF THAT THING UNDER THE ICE EVER WEARS A FRIENDLY FACE, I WILL SHOOT THE FACE. NO HESITATION. REMEMBER THAT.']
                ],
                loop: 'BRIGGS: STAY SHARP. HEAT SIGNATURES ARE CLIMBING.',
                next: { talks: 1, postReveal: true }
            },
            {
                beats: [
                    ['BRIGGS: ...MY SCOPES FLAG YOU HOSTILE NOW. MY GUT SAYS OTHERWISE. GUTS GET PEOPLE KILLED.', 'BRIGGS: ONE CHANCE. SHOW ME THE OPERATOR IS STILL DRIVING THAT BODY.']
                ],
                loop: 'BRIGGS: ONE CHANCE, CARRIER. THE TURRETS COUNT SECONDS FASTER THAN I DO.'
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
                    ['NAHL: YOU KEPT COMING BACK. THE QUEEN NEVER COMES BACK. SHE ONLY SENDS.', 'NAHL: I AM YOURS, CARRIER. STITCH ME INTO YOUR MANIFEST, OR LEAVE ME WHOLE ON THE ICE. EITHER WAY — THANK YOU.']
                ],
                loop: 'NAHL: MY THREAD IS YOURS. SAY WHERE IT PULLS.'
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
                    ['VEY: DECIDED. MY ANTENNA POINT WHERE YOU POINT.', 'VEY: TAKE ME ABOARD AND NO TOWER IN THE SYSTEM WILL EVER READ YOU TRUE AGAIN. LEAVE ME, AND I WILL JAM HER SCREAMS AS YOU GO.']
                ],
                loop: 'VEY: SAY THE WORD, CARRIER. I AM ALREADY LISTENING.'
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
                    ['RHUN: IT IS DONE. HER MARK FADES FROM MY PLATES.', 'RHUN: WHERE YOU STAND, I STAND IN FRONT. ON THE ICE OR OFF IT.']
                ],
                loop: 'RHUN: I AM YOUR WALL. POINT ME AT SOMETHING.'
            }
        ]
    }
});

export const LEADER_KEYS = Object.freeze(Object.keys(LEADER_DIALOGUE));

// Resolve a leader key from a display name like 'Sister Martha'.
export function leaderKeyFromName(name = '') {
    const lower = String(name).toLowerCase();
    return LEADER_KEYS.find((key) => lower.includes(key)) ?? null;
}

function meetsRequirements(next = {}, ctx = {}) {
    if ((ctx.talks ?? 0) < (next.talks ?? 0)) return false;
    if (next.level != null && (ctx.level ?? 0) < next.level) return false;
    if (next.bond != null && (ctx.bond ?? 0) < next.bond) return false;
    if (next.postReveal && !ctx.postReveal) return false;
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

// Has this leader reached their final stage (the "final thing" is on offer)?
export function isFinalStage(stage = 0) {
    return stage >= DIALOGUE_FINAL_STAGE;
}
