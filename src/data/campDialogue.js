import { localizeCatalog } from '../i18nCatalog.js';

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
export const LEADER_DIALOGUE = localizeCatalog('narrative.leaderDialogue', Object.freeze({
    kaelen: {
        label: 'OVERSEER KAELEN',
        stages: [
            {
                beats: [
                    ['Kaelen: Another suit from the surface. The machine dreamed you would come.', 'Kaelen: The grid keeps the dark at bay, operator. As long as the lights hum, we are safe.'],
                    ['Kaelen: The central computer sleeps under Sector Zero. Everything here is its dream.', 'Kaelen: Even you, probably. No offense.']
                ],
                loop: 'Kaelen: The grid hungers. Strengthen this camp and we will talk properly.',
                next: { talks: 2, level: 1 }
            },
            {
                beats: [
                    ['Kaelen: You built. Good. Builders are the only prayer the machine answers.', 'Kaelen: Meridian is built on clean steel. No rust. No rot. We keep our blood pure.'],
                    ['Kaelen: The whisper says: four seats. Does that mean anything to you?']
                ],
                loop: 'Kaelen: Fortify us further. The whispers get louder when the lights get brighter.',
                next: { talks: 2, level: 2 }
            },
            {
                beats: [
                    ['Kaelen: Level two grid. The machine noticed. I noticed it noticing.', 'Kaelen: The BunkerDirector system rerouted power around you. It likes you. I do not trust things that like surface suits.'],
                    ['Kaelen: Something is coming, operator. The dream is turning over in its sleep.']
                ],
                loop: 'Kaelen: When the dream turns over, come find me. You will know when.',
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
                    ['Martha: Welcome to the warm pipes, child. The steam keeps us, and we keep each other.', 'Martha: The moss is warm, child. The steam keeps the cold from reaching our bones.'],
                    ['Martha: The moss glows greener lately. The world is trying to tell us something.']
                ],
                loop: 'Martha: Help us grow, child, and I will tell you what the moss told me.',
                next: { talks: 2, level: 1 }
            },
            {
                beats: [
                    ['Martha: You gave, and asked nothing. That is rare in a suit.', 'Martha: We grow seeds in the dark so the children can see the green when they wake.'],
                    ['Martha: Sometimes I dream it is singing to someone. Lately I dream it is singing to you.']
                ],
                loop: 'Martha: Grow us stronger, and I will show you where the moss refuses to grow.',
                next: { talks: 2, level: 2 }
            },
            {
                beats: [
                    ['Martha: The hydro-beds have never been so full. You did this.', 'Martha: The heart under the ice is gentle. It is waiting for us.'],
                    ['Martha: Promise me something. When the heart sings your name — and it will — come back to us first.']
                ],
                loop: 'Martha: I am still waiting on that promise, child.',
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
                    ['Briggs: Stop. Identify. ...A corporate suit. Fine. Hands where the turrets can see them.', 'Briggs: The defense line is solid. No crawler crosses the perimeter while my turrets have ammo.'],
                    ['Briggs: Ammunition is currency. Loyalty is credit. You have neither.']
                ],
                loop: 'Briggs: Prove you can hold a line. Fortify this position, then we talk.',
                next: { talks: 2, level: 1 }
            },
            {
                beats: [
                    ['Briggs: The barricades hold because of you. Noted in the ledger.', 'Briggs: The Iron Guild named this outpost for Captain Vesper, K. We remember our dead. You would do well to remember our barrel cores.'],
                    ['Briggs: We keep our heads down and our guns clean. That\'s how you survive a winter.']
                ],
                loop: 'Briggs: Full defense grid or nothing, operator. Finish the job.',
                next: { talks: 2, level: 2 }
            },
            {
                beats: [
                    ['Briggs: Grid is live. First time I have slept in a year.', 'Briggs: I have a ledger of the dead. I don\'t intend to add your name to it, operator.'],
                    ['Briggs: If that thing under the ice ever wears a friendly face, I will shoot the face. No hesitation. Remember that.']
                ],
                loop: 'Briggs: Stay sharp. Heat signatures are climbing.',
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
                    ['Nahl: Oh. You can hear me now. The drill-handed one can finally hear me.', 'Nahl: I felt every sac you cut, little carrier. I healed around the holes you left.'],
                    ['Nahl: I do not hate you. Tissue remembers, but it does not hate.']
                ],
                loop: 'Nahl: Give back what was taken, and I will teach your skin to lie beautifully.',
                next: { talks: 2, bond: 1 }
            },
            {
                beats: [
                    ['Nahl: Yes. The resin settles. The holes sing softer now.', 'Nahl: Your cover frays when you walk among the warm ones. I can slow that fraying.'],
                    ['Nahl: The Queen calls me her needle. I would rather be yours.']
                ],
                loop: 'Nahl: Tend me again, carrier. Trust is a wound that closes slowly.',
                next: { talks: 2, bond: 2 }
            },
            {
                beats: [
                    ['Nahl: The mercy rite is ready, if you want it. Let me study what she planted in you.', 'Nahl: Whatever you choose at the end — cure, carry, or crown — I can make it hurt less.']
                ],
                loop: 'Nahl: Earn a little more of me, and I will follow you anywhere. Even off the ice.',
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
                    ['Vey: Signal. Signal. You are a signal now, not just noise. Finally.', 'Vey: I heard every filament you ripped out of me. I archived the sound.'],
                    ['Vey: The humans have a relay. The Queen has a choir. I have... Gaps, where you mined me.']
                ],
                loop: 'Vey: Return some signal to my gaps, and I will teach you to spoof anything with a sensor.',
                next: { talks: 2, bond: 1 }
            },
            {
                beats: [
                    ['Vey: Better. The static in me quiets when you are near.', 'Vey: I can hear the Mothership from here, carrier. It is very loud and very sure of itself.'],
                    ['Vey: Sure things are the easiest to forge.']
                ],
                loop: 'Vey: Keep tending the chorus. Forgery is a duet, not a solo.',
                next: { talks: 2, bond: 2 }
            },
            {
                beats: [
                    ['Vey: The false clearance is within reach. A crew signature so clean the Mothership will apologize for doubting it.', 'Vey: But understand: if you are outed down here, no forgery saves you up there.']
                ],
                loop: 'Vey: A little more trust, carrier. Then I sing for you, not her.',
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
                    ['Rhun: The one who pried my plates. Stand still so I may look at you.', 'Rhun: ...No. You are not prey. You are not Queen. You are something new wearing old armor.'],
                    ['Rhun: I guard. It is all I am. The question is only ever: guard what.']
                ],
                loop: 'Rhun: Return my chitin or replace it with steel. Then we speak of oaths.',
                next: { talks: 2, bond: 1 }
            },
            {
                beats: [
                    ['Rhun: The plates knit. You keep your word like armor. Good.', 'Rhun: The Queen holds my oath. She has never once stood between me and a drill.'],
                    ['Rhun: You have. Twice now, by my count.']
                ],
                loop: 'Rhun: Oaths are heavy. Keep lifting, carrier.',
                next: { talks: 2, bond: 2 }
            },
            {
                beats: [
                    ['Rhun: Ask me for the oath, and I will sever the old one. But know what it costs me.', 'Rhun: A shield that changes hands is still a shield. A shield that hesitates is a gravestone.']
                ],
                loop: 'Rhun: A little more faith, carrier. Then my wall is your wall.',
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
                    ['Okonkwo-Vass: You move like someone who hasn\'t been bitten yet.', 'Okonkwo-Vass: I study the shelled ones. They\'re not as simple as the reports say.'],
                    ['Okonkwo-Vass: Every camp logs them as vermin. I think that\'s lazy science.']
                ],
                loop: 'Okonkwo-Vass: Come back when you\'ve seen more of them. I want data, not stories.',
                next: { talks: 2 }
            },
            {
                beats: [
                    ['Okonkwo-Vass: Here\'s my theory. They don\'t hate us. They read us.', 'Okonkwo-Vass: Something about what we carry. Chemical, maybe. I can\'t test it from here.'],
                    ['Okonkwo-Vass: If you ever change — and out here, people do — watch how they look at you.']
                ],
                loop: 'Okonkwo-Vass: Still waiting on something to change, operator. The dream turning over, they say.',
                next: { talks: 2, postReveal: true }
            },
            {
                beats: [
                    ['Okonkwo-Vass: You\'re different now. I can see it on you.', 'Okonkwo-Vass: So here\'s the ask. Don\'t kill one. Talk to one. Prove me right.'],
                    ['Okonkwo-Vass: If I\'m wrong, you lose nothing but a few minutes. If I\'m right...']
                ],
                loop: 'Okonkwo-Vass: Find one. Stand your ground. See what it does.',
                next: { talks: 1, questFlag: 'snail_befriended' }
            },
            {
                beats: [
                    ['Okonkwo-Vass: It worked. It actually worked.', 'Okonkwo-Vass: I\'ve spent two years calling them pests. I owe them an apology I can\'t give.'],
                    ['Okonkwo-Vass: Whatever you\'re becoming, operator — it listens better than we do.']
                ],
                loop: 'Okonkwo-Vass: Go care for your new friend. That\'s the whole paper, right there.'
            }
        ]
    }
}), { skip: ['next'] });

export const LEADER_KEYS = Object.freeze(Object.keys(LEADER_DIALOGUE));

// Sprint 25 design pass (docs/design/camp-narrative-style-guide.md): the
// death-return moment is the closest thing this linear staged-beat system
// has to the style guide's Body/Work/Power/Intimacy beats landing in one
// place at once -- the player is physically present, the leader has power
// over what happens next, and something usually hidden gets noticed. (The
// style guide's fifth beat, Choice, needs branching dialogue this system
// doesn't have yet -- not attempted here.) Third line added per human
// leader below, in-voice, following the sensual-writing rule (sensation +
// restraint, not declaration). Also fixes a pre-existing stray lowercase
// mid-caps-line typo in kaelen/briggs's first line ("I HEARD the..." ->
// "I HEARD THE...") caught while touching this block.
export const LEADER_DEATH_BEATS = localizeCatalog('narrative.leaderDeathBeats', Object.freeze({
    kaelen: [
        'Kaelen: You died out there. I heard the grid static change. Sit down.',
        'Kaelen: Chen kept spare body cores in the fabricator. You must have been retrieved.',
        'Kaelen: Your pulse reads through the floor plating now. It didn\'t, before. I checked.'
    ],
    martha: [
        'Martha: You died out there. I felt the cold. Come closer to the steam.',
        'Martha: The moss grows warmer where your blood spilled. It is remembering you.',
        'Martha: Give me the hand. The other one. There. Your pulse is counting something I don\'t recognize.'
    ],
    briggs: [
        'Briggs: You died out there. I heard the static on the frequency. Sit down.',
        'Briggs: The first thing we learn in the Iron Guild: if you die, do it outside the firing cone.',
        'Briggs: Do that again. Blink. ...There. That\'s new. I\'m not writing it in the ledger yet.'
    ],
    nahl: ['Nahl: I felt your thread sever. And I stitched it back. Sit still.', 'Nahl: The Queen sees every death. She does not care. I do.'],
    vey: ['Vey: Your signal died. The static was deafening. Sit still.', 'Vey: The Mothership archives every agent soul. But the bunker... The bunker keeps the body.'],
    rhun: ['Rhun: You fell. I stood up. That is the oath.', 'Rhun: A wall that breaks can be knit. A carrier that dies... Can be carried.']
}));

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
