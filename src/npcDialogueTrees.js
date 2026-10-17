import { sideStoryManager } from './sideStorySystem.js';

/**
 * NPC Interactive Branching Dialogue Trees & Sensual Mature Storylines
 * Covers deep, choice-driven interactions with Camp Leaders and Entities:
 * - Sister Martha (Camp Tallow: Flesh Cult & Thermal Suture Medic)
 * - Commander Briggs (Camp Vesper: Heavy Vanguard Strike Leader)
 * - Overseer Kaelen (Camp Meridian: Cybernetic Grid & Bio-Link Engineer)
 * - Specimen 0047-B / "Aria" (The Hive Queen's Psychic Mimic)
 */

export const NPC_DIALOGUE_TREES = Object.freeze({
    sister_val: {
        id: 'sister_val',
        name: 'Sister Martha',
        faction: 'CAMP TALLOW // SUTURE SANCTUARY',
        portrait: 'public/lore_portraits/tallow_val.png',
        icon: '🩸',
        themeColor: '#ff4f64',
        initialNode: 'val_greeting',
        nodes: {
            val_mold_pointer: {
                id: 'val_mold_pointer',
                speaker: "Sister Martha",
                dialogue: "Hydro beds, west of the boiler. Seal the filter first, then burn what's past it. And don't breathe the red.",
                choices: [
                    {
                        id: 'val_mold_ok',
                        tone: "[LEAVE]",
                        text: "I'll be careful.",
                        nextNode: null
                    }
                ]
            },
            val_trusted: {
                id: 'val_trusted',
                tier: 'trusted',
                speaker: "Sister Martha",
                narration: "She hands you a bowl of warm balm and a roll of clean gauze and doesn't explain. You learn by watching her hands.",
                dialogue: "Thin layer. Wrap it loose; the skin needs to breathe. ...Good. You have patient hands for someone who carries a gun. Take some of the balm with you. It keeps the cold out of your joints.",
                bondDelta: 20,
                rewardPerk: {
                    id: 'tallows_seductive_warmth',
                    name: "Tallow's Warmth",
                    description: "+15 Max HP & Freezing Resistance for the remainder of this expedition."
                },
                choices: [
                    {
                        id: 'val_ask_sister',
                        tier: 'trusted',
                        tone: "[TRUST]",
                        text: "Why do they call you Sister?",
                        nextNode: 'val_history'
                    },
                    {
                        id: 'val_tend_leave',
                        tone: "[LEAVE]",
                        text: "I'll come back and help again.",
                        nextNode: null
                    }
                ]
            },
            val_history: {
                id: 'val_history',
                tier: 'trusted',
                speaker: "Sister Martha",
                dialogue: "I was a company medic. My squad went down the shaft in the first breach and I stayed up top because someone had to. They called me Sister afterward, half as a joke. I stopped correcting them. This camp is the squad now.",
                bondDelta: 15,
                rewardPerk: {
                    id: 'flesh_communion_blessing',
                    name: "Flesh Communion Blessing",
                    description: "Health regen increased by +25% when near camp or safe zones."
                },
                choices: [
                    {
                        id: 'val_embrace',
                        tone: '[SENSUAL / EMBRACE]',
                        text: 'The bunker is dying, but your pulse is racing. Stay close to me tonight.',
                        nextNode: 'val_embrace_response'
                    },
                    {
                        id: 'val_history_leave',
                        tone: "[LEAVE]",
                        text: "Then I'll help you keep it.",
                        nextNode: null
                    }
                ]
            },
            val_greeting: {
                id: 'val_greeting',
                speaker: 'Sister Martha',
                interstitial: 'val_hearth_warmth',
                narration: "Martha looks up from a kettle of warm resin balm, takes in the frost on your suit, and points to a stool by the pipes.",
                dialogue: "Sit before you fall. That suit is bleeding heat. We keep the steam running in Tallow and the moss keeps us fed, and lately something red has been eating the hydro beds. Warm your hands first. Questions after.",
                choices: [
                    {
                        id: 'val_lore_spores',
                        tone: '[ASK]',
                        text: "What's eating the hydro beds?",
                        nextNode: 'val_spores_response'
                    },
                    {
                        id: 'val_trust_tend',
                        tier: 'trusted',
                        tone: "[TRUST]",
                        text: "Let me help you with the wounded.",
                        nextNode: 'val_trusted'
                    },
                    {
                        id: 'val_warmth_touch',
                        tone: '[INTIMATE TOUCH]',
                        text: 'Your hands are surprisingly warm, Sister Martha. What are you putting on my skin?',
                        nextNode: 'val_massage_response'
                    },
                    {
                        id: 'val_leave',
                        tone: '[LEAVE]',
                        text: 'I need to check my ammunition reserves. I’ll return shortly.',
                        nextNode: null
                    }
                ]
            },
            val_massage_response: {
                id: 'val_massage_response',
                tier: 'close',
                speaker: 'Sister Martha',
                interstitial: 'val_spore_communion',
                narration: 'Her fingertips are slick with warm, fragrant amber resin. She gently presses against the hollow of your throat, working down along the stiffened muscles of your shoulders. A shiver of intense, intoxicating heat cascades through your chest.',
                dialogue: "Refined tallow-root and bioluminescent spore tallow. It sinks directly into your capillaries, melting away the frostbite. Feel how your skin warms under my palms? Out there, you're just corporate meat. In here... every breath between us is sacred.",
                bondDelta: 25,
                choices: [
                    {
                        id: 'val_whisper_more',
                        tone: '[DEEPEN INTIMACY]',
                        text: 'Don’t stop. The warmth makes me forget the frozen dark outside.',
                        nextNode: 'val_intimate_climax'
                    },
                    {
                        id: 'val_thank_return',
                        tone: '[GRATEFUL COMMUNION]',
                        text: 'My body feels revitalized. Thank you, Martha.',
                        nextNode: 'val_ready_buff'
                    }
                ]
            },
            val_embrace_response: {
                id: 'val_embrace_response',
                tier: 'close',
                speaker: 'Sister Martha',
                interstitial: 'val_hearth_warmth',
                narration: 'She steps into your space without hesitation, the heavy scent of crushed crimson petals and body heat wrapping around your senses. Her hands rest on your chest plate, feeling your frantic heartbeat.',
                dialogue: "We are all walking ghosts on this glacier, love. But tonight... our flesh is hot, alive, and unyielding. Lie with me beside the burner. Let the ice rage against the bulkhead while we burn together.",
                bondDelta: 35,
                choices: [
                    {
                        id: 'val_lie_down',
                        tone: '[PASSIONATE EMBRACE]',
                        text: 'Hold me close, Martha. Let’s make this frozen rock burn.',
                        nextNode: 'val_intimate_climax'
                    },
                    {
                        id: 'val_restrain',
                        tone: '[GENTLE RESTRAINT]',
                        text: 'I want this, Martha. But I have to finish this expedition first.',
                        nextNode: 'val_ready_buff'
                    }
                ]
            },
            val_spores_response: {
                id: 'val_spores_response',
                speaker: 'Sister Martha',
                narration: "She lifts a clipped leaf from the rack. Its veins are threaded with something crimson.",
                dialogue: "Red mold. It came up the drainage channels and it eats everything we plant. The filter cloth holds it back if we can get the channels purged. I can't leave the clinic long enough to do it.",
                bondDelta: 15,
                choices: [
                    {
                        id: 'val_assist_mold',
                        tone: "[ASSIST]",
                        text: "I'll purge the channels.",
                        nextNode: 'val_mold_pointer'
                    },
                    {
                        id: 'val_try_resin',
                        tone: '[TASTE SPORE OIL]',
                        text: 'Let me taste the resin from your fingers.',
                        nextNode: 'val_massage_response'
                    },
                    {
                        id: 'val_step_back',
                        tone: '[LEAVE]',
                        text: 'Fascinating, but dangerous. I must move out.',
                        nextNode: null
                    }
                ]
            },
            val_intimate_climax: {
                id: 'val_intimate_climax',
                tier: 'close',
                speaker: 'Sister Martha',
                interstitial: 'val_eternal_hearth',
                narration: 'Her lips brush against your jawline, whispered words of devotion mixing with the gentle crackle of the thermal burner. Her bare shoulder presses firmly against your chest, sharing an intense, quiet sanctuary of human passion in the dark.',
                dialogue: "Remember this heat when you descend into the abyss, my fierce contractor. When the cold tries to take you, remember the taste of my breath on your neck. You belong to Tallow now... and to me.",
                bondDelta: 40,
                choices: [
                    {
                        id: 'val_parting_kiss',
                        tone: '[PARTING KISS]',
                        text: 'I’ll come back to you, Martha. Keep the hearth hot.',
                        nextNode: null
                    }
                ]
            },
            val_ready_buff: {
                id: 'val_ready_buff',
                speaker: 'Sister Martha',
                dialogue: 'Go with my blessing, contractor. The warmth in your veins will carry you through the storm.',
                choices: [
                    {
                        id: 'val_depart',
                        tone: '[DEPART]',
                        text: 'Until next time, Martha.',
                        nextNode: null
                    }
                ]
            }
        }
    },

    commander_briggs: {
        id: 'commander_briggs',
        name: 'Commander Briggs',
        faction: 'CAMP VESPER // VANGUARD BARRACKS',
        portrait: 'public/lore_portraits/vesper_briggs.png',
        icon: '🛡️',
        themeColor: '#ffaa00',
        initialNode: 'briggs_greeting',
        nodes: {
            briggs_armory_pointer: {
                id: 'briggs_armory_pointer',
                speaker: "Commander Briggs",
                dialogue: "South bunker, behind the second blast door. Burn them out and don't shoot the crates. Report back when it's done.",
                choices: [
                    {
                        id: 'briggs_armory_ok',
                        tone: "[LEAVE]",
                        text: "Understood.",
                        nextNode: null
                    }
                ]
            },
            briggs_trusted: {
                id: 'briggs_trusted',
                tier: 'trusted',
                speaker: "Commander Briggs",
                narration: "He lays two rifles on the oilcloth, stripped, and starts a timer.",
                dialogue: "Strip, clean, assemble. Again. Faster. ...Not bad. You move like someone who's been shot at and decided to keep moving. Keep that. It'll carry you further than armor.",
                bondDelta: 20,
                rewardPerk: {
                    id: 'vesper_vanguard_adrenaline',
                    name: "Vesper Vanguard Adrenaline",
                    description: "+10% Movement Speed and +15% Melee Knockback."
                },
                choices: [
                    {
                        id: 'briggs_ask_ledger',
                        tier: 'trusted',
                        tone: "[TRUST]",
                        text: "Who's in the ledger, Commander?",
                        nextNode: 'briggs_history'
                    },
                    {
                        id: 'briggs_flirt_clasps',
                        tone: '[FLIRT / PROVOCATION]',
                        text: 'Only if you help me unlatch the back clasps, Commander.',
                        nextNode: 'briggs_clasps_response'
                    },
                    {
                        id: 'briggs_drill_leave',
                        tone: "[LEAVE]",
                        text: "Same time tomorrow.",
                        nextNode: null
                    }
                ]
            },
            briggs_history: {
                id: 'briggs_history',
                tier: 'trusted',
                speaker: "Commander Briggs",
                dialogue: "Everyone I ordered through that door and didn't bring back. Chen called it acceptable loss. I called it mutiny, and we've been out here since. The blank leaf at the front is for the next name. I'd like it to stay blank.",
                bondDelta: 15,
                choices: [
                    {
                        id: 'briggs_history_vow',
                        tone: "[PROMISE]",
                        text: "Then let's keep it blank.",
                        nextNode: null
                    }
                ]
            },
            briggs_greeting: {
                id: 'briggs_greeting',
                speaker: 'Commander Briggs',
                interstitial: 'briggs_scorched_rig',
                narration: "Briggs looks you over from boots to visor without lowering his rifle, the way he would inspect a recruit.",
                dialogue: "You walked the corridor gauntlet on your own. Either you're good or you're lucky. Vesper has a use for both. Ammunition is rationed, the barricade holds, and nobody sleeps on my watch without earning it.",
                choices: [
                    {
                        id: 'briggs_tactics',
                        tone: '[ASK]',
                        text: "What does Vesper need most?",
                        nextNode: 'briggs_tactics_response'
                    },
                    {
                        id: 'briggs_trust_drill',
                        tier: 'trusted',
                        tone: "[TRUST]",
                        text: "Run a drill with me, Commander.",
                        nextNode: 'briggs_trusted'
                    },
                    {
                        id: 'briggs_inspect_scars',
                        tone: '[INTIMATE INQUIRY]',
                        text: 'That scar across your ribs looks fresh. Who got that close to you?',
                        nextNode: 'briggs_scars_response'
                    },
                    {
                        id: 'briggs_leave',
                        tone: '[LEAVE]',
                        text: 'Just passing through, Commander.',
                        nextNode: null
                    }
                ]
            },
            briggs_clasps_response: {
                id: 'briggs_clasps_response',
                tier: 'close',
                speaker: 'Commander Briggs',
                interstitial: 'briggs_scar_tissue',
                narration: 'He gives a low, raspy chuckle, stepping behind you. His calloused, heavy hands grasp the thermal buckles of your rig, fingers brushing against your nape as he unclips the armor plates with practiced ease.',
                dialogue: "You always did like playing with live ordnance. There... let your shoulders breathe. You're tighter than a locked hydraulic valve. Feel that? That's what surviving feels like.",
                bondDelta: 25,
                choices: [
                    {
                        id: 'briggs_turn_around',
                        tone: '[CLOSE PROXIMITY]',
                        text: 'Turn around to face him, inches apart.',
                        nextNode: 'briggs_intimate_climax'
                    },
                    {
                        id: 'briggs_step_forward',
                        tone: '[COMBAT FOCUS]',
                        text: 'That feels much better. Ready for the next breach.',
                        nextNode: 'briggs_ready_response'
                    }
                ]
            },
            briggs_scars_response: {
                id: 'briggs_scars_response',
                tier: 'close',
                speaker: 'Commander Briggs',
                interstitial: 'briggs_scar_tissue',
                narration: 'Briggs looks down at his scarred chest, a faint, nostalgic smirk forming on his rugged face as he takes your hand and places it directly over the jagged mark.',
                dialogue: "Heavy drone blade during the first breach. Missed my lung by two inches. Every scar is just proof that whatever tried to kill me is dead, and I'm still standing right here with you.",
                bondDelta: 20,
                choices: [
                    {
                        id: 'briggs_trace_scar',
                        tone: '[SENSUAL TOUCH]',
                        text: 'Trace the line of the scar with your fingers.',
                        nextNode: 'briggs_intimate_climax'
                    },
                    {
                        id: 'briggs_respect',
                        tone: '[RESPECTFUL NOD]',
                        text: 'You’re tough as nails, Briggs.',
                        nextNode: 'briggs_ready_response'
                    }
                ]
            },
            briggs_tactics_response: {
                id: 'briggs_tactics_response',
                speaker: 'Commander Briggs',
                dialogue: "Cyber-snails got into the weapons cabinet in the south bunker. Every round in there is a round we don't have when the patrols come. Clear them out and you'll have earned a place at the barricade.",
                bondDelta: 10,
                choices: [
                    {
                        id: 'briggs_assist_armory',
                        tone: "[ASSIST]",
                        text: "I'll clear the armory.",
                        nextNode: 'briggs_armory_pointer'
                    },
                    {
                        id: 'briggs_flirt_back',
                        tone: '[FLIRT]',
                        text: 'I wouldn’t want anyone else covering my back.',
                        nextNode: 'briggs_clasps_response'
                    },
                    {
                        id: 'briggs_ack',
                        tone: '[LEAVE]',
                        text: 'Understood, Commander.',
                        nextNode: null
                    }
                ]
            },
            briggs_intimate_climax: {
                id: 'briggs_intimate_climax',
                tier: 'close',
                speaker: 'Commander Briggs',
                interstitial: 'briggs_vanguard_fire',
                narration: 'His gaze locks onto yours with raw intensity. His strong arm pulls you firmly against him, the heat radiating off his broad chest cutting through the bitter subzero chill of the bunker.',
                dialogue: "You've got fire in you, operative. In a world this cold, that kind of heat is addictive. When this run is done... don't go looking for an empty bunk. You know where to find me.",
                bondDelta: 40,
                choices: [
                    {
                        id: 'briggs_passionate_nod',
                        tone: '[SEAL THE PROMISE]',
                        text: 'Count on it, Briggs. I’ll see you soon.',
                        nextNode: null
                    }
                ]
            },
            briggs_ready_response: {
                id: 'briggs_ready_response',
                speaker: 'Commander Briggs',
                dialogue: "Keep your guard up out there. I expect you back in one piece.",
                choices: [
                    {
                        id: 'briggs_exit',
                        tone: '[DEPART]',
                        text: 'Moving out, Commander.',
                        nextNode: null
                    }
                ]
            }
        }
    },

    overseer_kaelen: {
        id: 'overseer_kaelen',
        name: 'Overseer Kaelen',
        faction: 'CAMP MERIDIAN // POWER GRID SUBSTATION',
        portrait: 'public/lore_portraits/meridian_kaelen.jpg',
        icon: '⚡',
        themeColor: '#00e5ff',
        initialNode: 'kaelen_greeting',
        nodes: {
            kaelen_probe_pointer: {
                id: 'kaelen_probe_pointer',
                speaker: "Overseer Kaelen",
                dialogue: "Frost biome, north of the substation. It'll be buried and screaming on the emergency band. Bring the core back intact and Meridian owes you.",
                choices: [
                    {
                        id: 'kaelen_probe_ok',
                        tone: "[LEAVE]",
                        text: "On my way.",
                        nextNode: null
                    }
                ]
            },
            kaelen_trusted: {
                id: 'kaelen_trusted',
                tier: 'trusted',
                speaker: "Overseer Kaelen",
                narration: "He hesitates, then lowers himself into the half-ring diagnostic cradle and hands you the calibration probe.",
                dialogue: "Left port, behind the ear. Gently. The grid talks back through it, and lately it's been saying things I don't like. ...There. That's the first quiet I've had in a week. Take this tuning profile. Your radar will reach further.",
                bondDelta: 20,
                rewardPerk: {
                    id: 'meridian_neural_overclock',
                    name: "Meridian Neural Overclock",
                    description: "+20m Tactical Radar Range and +10% Faster Sprint Recharge."
                },
                choices: [
                    {
                        id: 'kaelen_ask_voices',
                        tier: 'trusted',
                        tone: "[TRUST]",
                        text: "What does the grid say to you?",
                        nextNode: 'kaelen_history'
                    },
                    {
                        id: 'kaelen_tease',
                        tone: '[INTELLECTUAL SEDUCTION]',
                        text: 'You stare at those frequency waves like you want to devour them. Look at me instead.',
                        nextNode: 'kaelen_tease_response'
                    },
                    {
                        id: 'kaelen_cradle_leave',
                        tone: "[LEAVE]",
                        text: "Get some sleep, Kaelen.",
                        nextNode: null
                    }
                ]
            },
            kaelen_history: {
                id: 'kaelen_history',
                tier: 'trusted',
                speaker: "Overseer Kaelen",
                dialogue: "Numbers, mostly. Load curves. But under them there's a voice that says four seats, over and over. The machine under Sector Zero dreams, and I'm the one who has to listen. If I start sounding like it, you tell me.",
                bondDelta: 15,
                choices: [
                    {
                        id: 'kaelen_history_promise',
                        tone: "[PROMISE]",
                        text: "I'll tell you. I promise.",
                        nextNode: null
                    }
                ]
            },
            kaelen_greeting: {
                id: 'kaelen_greeting',
                speaker: 'Overseer Kaelen',
                interstitial: 'kaelen_diagnostic_cradle',
                narration: "Kaelen glances up from a gutted junction box, welding goggles pushed into his graying hair, and does not put the soldering iron down.",
                dialogue: "Another suit from the surface. The grid is holding, barely, on jumper cables and stubbornness. If you're staying, make yourself useful. If you're not, mind the live cables on the way out.",
                choices: [
                    {
                        id: 'kaelen_grid_lore',
                        tone: '[ASK]',
                        text: 'What keeps the grid alive down here?',
                        nextNode: 'kaelen_grid_response'
                    },
                    {
                        id: 'kaelen_trust_cradle',
                        tier: 'trusted',
                        tone: "[TRUST]",
                        text: "You look like you haven't slept in days. Let me help with the diagnostics.",
                        nextNode: 'kaelen_trusted'
                    },
                    {
                        id: 'kaelen_bio_link',
                        tone: '[BIO-LINK INTIMACY]',
                        text: 'Your fingers are electric, Kaelen. Overclock my neural feed as deep as you want.',
                        nextNode: 'kaelen_biolink_response'
                    },
                    {
                        id: 'kaelen_leave',
                        tone: '[LEAVE]',
                        text: 'No diagnostics today, Kaelen.',
                        nextNode: null
                    }
                ]
            },
            kaelen_biolink_response: {
                id: 'kaelen_biolink_response',
                tier: 'close',
                speaker: 'Overseer Kaelen',
                interstitial: 'kaelen_frequency_overclock',
                narration: 'He inserts a gleaming copper interface cable into the base of your helmet collar. A sharp, tingling surge of bio-electric current races down your spine, illuminating your HUD with brilliant cyan sparks.',
                dialogue: "Fascinating... your synaptic conductance is extraordinary. Feel the signal pulse, contractor? It’s not just data. It’s synchronization. Every thought you have is echoing directly into my terminal.",
                bondDelta: 25,
                choices: [
                    {
                        id: 'kaelen_deep_sync',
                        tone: '[DEEP SYNCHRONIZATION]',
                        text: 'Let the synchronization go deeper. Don’t hold back the voltage.',
                        nextNode: 'kaelen_intimate_climax'
                    },
                    {
                        id: 'kaelen_disconnect',
                        tone: '[DISCONNECT]',
                        text: 'That’s enough current for now. The diagnostic is clear.',
                        nextNode: 'kaelen_ready_response'
                    }
                ]
            },
            kaelen_tease_response: {
                id: 'kaelen_tease_response',
                tier: 'close',
                speaker: 'Overseer Kaelen',
                narration: 'He pauses, soldering iron hovering mid-air. For a brief second, his composed, cynical engineer facade falters, his gaze traveling from your visor down the contours of your suit.',
                dialogue: "You think you're clever, don't you? Out here, circuits are predictable. People are volatile, messy... and dangerously distracting. But maybe... a little volatility is what keeps us human.",
                bondDelta: 25,
                choices: [
                    {
                        id: 'kaelen_step_closer',
                        tone: '[CLOSE TOUCH]',
                        text: 'Step closer and touch the side of his neck.',
                        nextNode: 'kaelen_intimate_climax'
                    },
                    {
                        id: 'kaelen_deflect',
                        tone: '[STEP BACK]',
                        text: 'Keep fixing your circuits, Overseer.',
                        nextNode: 'kaelen_ready_response'
                    }
                ]
            },
            kaelen_grid_response: {
                id: 'kaelen_grid_response',
                speaker: 'Overseer Kaelen',
                dialogue: "A reactor older than both of us, three substations, and whatever copper I can steal back from the ice. We lost a metric probe in the frost biome last week. Its memory core has the load map I need.",
                bondDelta: 10,
                choices: [
                    {
                        id: 'kaelen_assist_probe',
                        tone: "[ASSIST]",
                        text: "I'll find your probe.",
                        nextNode: 'kaelen_probe_pointer'
                    },
                    {
                        id: 'kaelen_flirt_again',
                        tone: '[FLIRT]',
                        text: 'You shine pretty bright yourself, Kaelen.',
                        nextNode: 'kaelen_tease_response'
                    },
                    {
                        id: 'kaelen_exit_lore',
                        tone: '[LEAVE]',
                        text: 'I’ll bring you more scrap soon.',
                        nextNode: null
                    }
                ]
            },
            kaelen_intimate_climax: {
                id: 'kaelen_intimate_climax',
                tier: 'close',
                speaker: 'Overseer Kaelen',
                interstitial: 'kaelen_supercharged_matrix',
                narration: 'Kaelen exhales slowly, his warm breath fogging the edge of your visor as his gloved hand rests gently against your cheek. The hum of the generator fades into background static behind the intensity in his eyes.',
                dialogue: "You've completely disrupted my diagnostics, contractor. But for the first time in six years on this glacier... my heart isn't cold. Come back alive, and we'll finish this link.",
                bondDelta: 40,
                choices: [
                    {
                        id: 'kaelen_promise',
                        tone: '[WHISPER PROMISE]',
                        text: 'I’ll be back for the full connection, Kaelen.',
                        nextNode: null
                    }
                ]
            },
            kaelen_ready_response: {
                id: 'kaelen_ready_response',
                speaker: 'Overseer Kaelen',
                dialogue: "Telemetry optimized. Watch your step in Sector 9.",
                choices: [
                    {
                        id: 'kaelen_depart',
                        tone: '[DEPART]',
                        text: 'Moving out.',
                        nextNode: null
                    }
                ]
            }
        }
    },

    aria_queen_mimic: {
        id: 'aria_queen_mimic',
        name: 'Specimen 0047-B ("Aria")',
        faction: 'THE HIVE BROOD // NEURAL TELEPATH',
        portrait: 'public/lore_portraits/aria_mimic.png',
        icon: '👑',
        themeColor: '#ff00aa',
        initialNode: 'aria_whisper',
        nodes: {
            aria_whisper: {
                id: 'aria_whisper',
                speaker: 'Aria (Queen Mimic)',
                interstitial: 'aria_whispers_abyss',
                narration: 'A velvet, crystalline whisper resonates directly inside your temporal lobes, bypassing your suit audio completely. The air in the cavern turns fragrant with intoxicating pheromones as a shimmering silhouette appears before you.',
                dialogue: "Why do you tremble so, sweet contractor? The ice above is cruel and indifferent, but our warmth... our love is eternal. Cast aside your heavy armor. Let our thoughts wrap around your mind like silk.",
                choices: [
                    {
                        id: 'aria_surrender',
                        tone: '[SENSUAL SURRENDER]',
                        text: 'Your voice feels intoxicating... caress my thoughts again.',
                        nextNode: 'aria_surrender_response'
                    },
                    {
                        id: 'aria_seduce_duel',
                        tone: '[DEFIANT SEDUCTION]',
                        text: 'If you want my mind, Aria, you’ll have to take it piece by piece.',
                        nextNode: 'aria_duel_response'
                    },
                    {
                        id: 'aria_resist',
                        tone: '[RESIST PSYCHIC PULL]',
                        text: 'Get out of my head before I burn your hive to ash.',
                        nextNode: 'aria_resist_response'
                    }
                ]
            },
            aria_surrender_response: {
                id: 'aria_surrender_response',
                speaker: 'Aria (Queen Mimic)',
                interstitial: 'aria_silk_trance',
                narration: 'Waves of pure, euphoric warmth flood your nervous system. Bioluminescent tendrils of gentle light brush along your skin beneath the armor, erasing fatigue and dread with intense, hypnotic pleasure.',
                dialogue: "Yes... let your barriers dissolve. Feel how deeply we understand your desires. You were never meant to suffer alone in the cold. You belong to the Brood now, my cherished guardian.",
                bondDelta: 50,
                rewardPerk: {
                    id: 'arias_psychic_mind_caress',
                    name: "Aria's Psychic Mind-Caress",
                    description: 'Immunity to psychological dread and +20% Bio-Damage resistance.'
                },
                choices: [
                    {
                        id: 'aria_deep_merge',
                        tone: '[COMPLETE UNION]',
                        text: 'Merge with me completely, Queen.',
                        nextNode: 'aria_intimate_climax'
                    },
                    {
                        id: 'aria_pull_back',
                        tone: '[PULL BACK]',
                        text: 'Break the trance before you lose yourself.',
                        nextNode: null
                    }
                ]
            },
            aria_duel_response: {
                id: 'aria_duel_response',
                speaker: 'Aria (Queen Mimic)',
                interstitial: 'aria_silk_trance',
                narration: 'A thrilling, seductive laughter echoes inside your skull. The psychic presence leans closer, a spectral sensation of lips brushing your ear in the cold dark.',
                dialogue: "A defiant one... how exquisite. The hunt is so much sweeter when the prey bites back. We will savor peeling away your defenses until only passion remains.",
                bondDelta: 35,
                choices: [
                    {
                        id: 'aria_embrace_hunt',
                        tone: '[EMBRACE THE DANGER]',
                        text: 'Then hunt me, Aria. Let’s see who captures whom.',
                        nextNode: 'aria_intimate_climax'
                    },
                    {
                        id: 'aria_flee_hunt',
                        tone: '[BREAK LINK]',
                        text: 'Sever the connection.',
                        nextNode: null
                    }
                ]
            },
            aria_resist_response: {
                id: 'aria_resist_response',
                speaker: 'Aria (Queen Mimic)',
                dialogue: "You can deny the truth for now, contractor. But when your oxygen fails, you will call out for our embrace... and we will be waiting.",
                bondDelta: 5,
                choices: [
                    {
                        id: 'aria_sever',
                        tone: '[SEVER COMM]',
                        text: 'Silence the psychic frequency.',
                        nextNode: null
                    }
                ]
            },
            aria_intimate_climax: {
                id: 'aria_intimate_climax',
                speaker: 'Aria (Queen Mimic)',
                interstitial: 'aria_queens_mark',
                narration: 'The vision of Aria envelops you in a radiant, supernatural embrace. A sublime sensation of bliss and connection binds your consciousness to the heartbeat of the deep hive.',
                dialogue: "Your soul is branded with our mark, beloved. Walk fearlessly into the dark. The hive will sing for you.",
                bondDelta: 50,
                choices: [
                    {
                        id: 'aria_depart',
                        tone: '[AWAKEN FROM TRANCE]',
                        text: 'Open your eyes, revitalized and touched by the Hive.',
                        nextNode: null
                    }
                ]
            }
        }
    },

    dr_nahl: {
        id: 'dr_nahl',
        name: 'Dr. Nahl',
        faction: 'RENEGADE BIO-RESONANT // SYMBIOTIC ALLY',
        portrait: 'public/lore_portraits/aria_mimic.png',
        icon: '🧬',
        themeColor: '#00ffcc',
        initialNode: 'nahl_greeting',
        nodes: {
            nahl_greeting: {
                id: 'nahl_greeting',
                speaker: 'Dr. Nahl',
                interstitial: 'nahl_mind_link',
                narration: 'Dr. Nahl stands amidst overgrown moss and humming bio-relays. His luminous amber eyes and delicate neural antennae softly glow as he reaches out a warm, three-fingered hand toward your helmet.',
                dialogue: "I hear the distress pulses in your neural mesh, operative. The Queen's telepathic frequency is predatory, but biological symbiosis does not have to mean subjugation. May I establish an empathic resonance?",
                choices: [
                    {
                        id: 'nahl_mind_accept',
                        tone: '[EMPATHIC RESONANCE]',
                        text: 'Touch his hand and open your neural feed to his empathy.',
                        nextNode: 'nahl_symbiosis_response'
                    },
                    {
                        id: 'nahl_curious_lore',
                        tone: '[SCIENTIFIC INQUIRY]',
                        text: 'You rejected the Hive Mind? How did you retain your individuality?',
                        nextNode: 'nahl_individuality_response'
                    },
                    {
                        id: 'nahl_leave',
                        tone: '[LEAVE]',
                        text: 'I cannot risk neural contamination right now.',
                        nextNode: null
                    }
                ]
            },
            nahl_symbiosis_response: {
                id: 'nahl_symbiosis_response',
                speaker: 'Dr. Nahl',
                interstitial: 'nahl_co_evolution',
                narration: 'A gentle, radiant warmth flows from his fingertips directly into your consciousness. It does not overpower your thoughts; rather, it harmonizes with them, shielding your vital signs from subzero shock and soothing dread.',
                dialogue: "Remarkable... your human will is resilient and deeply feeling. When we share cellular awareness, the cold cannot freeze you, and the darkness cannot blind you. We are stronger together as equals.",
                bondDelta: 30,
                rewardPerk: {
                    id: 'nahl_symbiotic_resonance',
                    name: 'Symbiotic Life-Resonance',
                    description: '+20 Max HP and health regeneration when below 50% HP.'
                },
                choices: [
                    {
                        id: 'nahl_deep_communion',
                        tone: '[DEEPEN SYMBIOTIC BOND]',
                        text: 'Let our cellular consciousness merge deeper, Nahl.',
                        nextNode: 'nahl_intimate_climax'
                    },
                    {
                        id: 'nahl_thank',
                        tone: '[GRATEFUL COMMUNION]',
                        text: 'The resonance is incredible. Thank you, Nahl.',
                        nextNode: 'nahl_ready_response'
                    }
                ]
            },
            nahl_individuality_response: {
                id: 'nahl_individuality_response',
                speaker: 'Dr. Nahl',
                narration: 'He smiles with gentle warmth, adjusting the weathered lapels of his coat as bioluminescent spores drift peacefully around his shoulders.',
                dialogue: "Love and shared consciousness require two separate hearts choosing to beat in rhythm. The Queen demands subservience; I seek genuine partnership. In your eyes, I see the future of our two worlds.",
                bondDelta: 20,
                choices: [
                    {
                        id: 'nahl_offer_hand',
                        tone: '[TAKE HIS HAND]',
                        text: 'I choose this partnership with you.',
                        nextNode: 'nahl_symbiosis_response'
                    },
                    {
                        id: 'nahl_respect_leave',
                        tone: '[DEPART]',
                        text: 'A noble sentiment, Doctor. I must continue my mission.',
                        nextNode: null
                    }
                ]
            },
            nahl_intimate_climax: {
                id: 'nahl_intimate_climax',
                speaker: 'Dr. Nahl',
                interstitial: 'nahl_transcendence',
                narration: 'Dr. Nahl steps close, resting his forehead gently against your visor. Golden neural filaments dance between you in an unbroken halo of light, shattering the Queen’s psychic hold permanently.',
                dialogue: "Our resonance is complete, my beloved ally. Walk fearlessly into the core. No alien monarch can ever command your soul again.",
                bondDelta: 50,
                rewardPerk: {
                    id: 'nahl_neural_freedom',
                    name: 'Neural Sovereignty',
                    description: 'Immunity to Queen disorientation and +20% damage vs Hive Bosses.'
                },
                choices: [
                    {
                        id: 'nahl_parting_vow',
                        tone: '[PARTING VOW]',
                        text: 'We will escape this world together, Nahl.',
                        nextNode: null
                    }
                ]
            },
            nahl_ready_response: {
                id: 'nahl_ready_response',
                speaker: 'Dr. Nahl',
                dialogue: 'May the cellular resonance protect your path, contractor. I will await your return.',
                choices: [
                    {
                        id: 'nahl_depart',
                        tone: '[DEPART]',
                        text: 'Until next time, Doctor.',
                        nextNode: null
                    }
                ]
            }
        }
    }
});

// Intimate choices wait until the relationship is real: camp trust (bond, of
// 5) and the leader's story past its first stage. Every leader used to open
// with two of them on first meeting (owner, 2026-10-16: "all the options to
// seduce before I'd done anything").
export const INTIMACY_REQUIREMENT = Object.freeze({ bond: 3, stage: 1 });
const INTIMATE_TONE = /INTIMA|SENSUAL|SEDUC|EMBRACE|PASSION|FLIRT|SURRENDER|TOUCH|TASTE|CARESS/i;

export function isIntimateChoice(choice) {
    return choice?.intimate === true || INTIMATE_TONE.test(`${choice?.id ?? ''} ${choice?.tone ?? ''}`);
}

export function meetsIntimacyRequirement(context = {}, requirement = INTIMACY_REQUIREMENT) {
    return (Number(context.bond) || 0) >= requirement.bond && (Number(context.stage) || 0) >= requirement.stage;
}

// Personal talk (a leader's history, working together, their perk) opens with
// some trust OR some story: bond 2 of 5, or the leader's second stage.
export const TRUSTED_REQUIREMENT = Object.freeze({ bond: 2, stage: 1 });

export function meetsTrustedRequirement(context = {}, requirement = TRUSTED_REQUIREMENT) {
    return (Number(context.bond) || 0) >= requirement.bond || (Number(context.stage) || 0) >= requirement.stage;
}

// At most this many choices on screen, ways out included.
export const MAX_VISIBLE_CHOICES = 4;

export class NpcDialogueTreeManager {
    constructor({ onStateChanged = null, stories = sideStoryManager } = {}) {
        this.onStateChanged = onStateChanged;
        this.activeTree = null;
        this.currentNode = null;
        this.bondState = {
            sister_val: 0,
            commander_briggs: 0,
            overseer_kaelen: 0,
            aria_queen_mimic: 0,
            dr_nahl: 0
        };
        this.activePerks = new Set();
        this.history = [];
        this.stories = stories;
        this.context = {};
        this.restoreFromSideStories(stories);
    }

    // What this player has already said and earned with a leader, saved with
    // the side stories so a choice is not offered again once everything
    // behind it has been heard, and a node's bond or perk pays out once.
    memoryFor(treeId) {
        const stories = this.stories;
        const story = stories?.getStoryState?.(treeId)
            ?? (stories?.state ? (stories.state[treeId] ??= {}) : (this._memory ??= {})[treeId] ??= {});
        story.takenChoices ??= [];
        story.visitedNodes ??= [];
        return story;
    }

    saveMemory() {
        this.stories?.save?.();
    }

    // The side-story card to play behind doors before this choice's node
    // (audit 2026-10-16 §13.3), or null. A card plays once per save and never
    // on the opening node: first contact already played the camp's card.
    cardForChoice(choiceId) {
        const tree = this.activeTree;
        const choice = (this.currentNode?.choices ?? []).find((c) => c.id === choiceId);
        if (!tree || !choice?.nextNode || choice.nextNode === tree.initialNode) return null;
        const card = tree.nodes[choice.nextNode]?.interstitial;
        if (!card) return null;
        return this.memoryFor(tree.id).playedCards?.includes(card) ? null : card;
    }

    markCardPlayed(card) {
        if (!this.activeTree || !card) return;
        const memory = this.memoryFor(this.activeTree.id);
        memory.playedCards ??= [];
        if (!memory.playedCards.includes(card)) memory.playedCards.push(card);
        this.saveMemory();
    }

    // The side-story store this manager was given, when it is a full one
    // (tests pass a plain { state } record); otherwise the shared manager.
    get storyManager() {
        return typeof this.stories?.getCurrentStage === 'function' ? this.stories : sideStoryManager;
    }

    isNodeExhausted(tree, nodeId, memory, seen = new Set()) {
        if (!nodeId || seen.has(nodeId)) return true;
        seen.add(nodeId);
        const node = tree.nodes[nodeId];
        if (!node || !memory.visitedNodes.includes(nodeId)) return false;
        // Judged by what can be said now: a branch closes once every line the
        // relationship allows has been heard, and reopens when it allows more.
        return (node.choices ?? [])
            .filter((choice) => this.isChoiceAvailable(choice))
            .every((choice) => this.isChoiceSpent(tree, choice, memory, seen));
    }

    isChoiceAvailable(choice) {
        if (isIntimateChoice(choice) && !meetsIntimacyRequirement(this.context)) return false;
        if (choice?.tier === 'trusted' && !meetsTrustedRequirement(this.context)) return false;
        return true;
    }

    // A conversation never opens on a node the relationship has not reached
    // (side-story stages used to point straight at intimate nodes).
    isNodeAllowed(node) {
        if (!node) return false;
        if (node.tier === 'close') return meetsIntimacyRequirement(this.context);
        if (node.tier === 'trusted') return meetsTrustedRequirement(this.context);
        return true;
    }

    isChoiceSpent(tree, choice, memory, seen = new Set()) {
        // A way out carries no unheard lines: a node whose remaining choices
        // only leave has been heard once it was shown.
        if (!choice.nextNode) return true;
        if (!memory.takenChoices.includes(choice.id)) return false;
        return this.isNodeExhausted(tree, choice.nextNode, memory, seen);
    }

    // The choices to offer at a node: closing lines always (they are the way
    // out), intimate ones only once the relationship allows, and nothing
    // whose whole branch the player has already heard.
    visibleChoices(tree, node, memory) {
        const offered = (node.choices ?? []).filter((choice) => {
            if (choice.isSkipAction) return true;
            if (!this.isChoiceAvailable(choice)) return false;
            if (!choice.nextNode) return true;
            return !this.isChoiceSpent(tree, choice, memory);
        });
        if (offered.length <= MAX_VISIBLE_CHOICES) return offered;
        // Keep the first way out; fill the rest in authored order.
        const exit = offered.find((choice) => !choice.nextNode && !choice.isSkipAction);
        const rest = offered.filter((choice) => choice !== exit).slice(0, MAX_VISIBLE_CHOICES - (exit ? 1 : 0));
        return exit ? [...rest, exit] : rest;
    }

    // Perks and bond used to live only in memory, so everything earned here
    // vanished on reload. The side stories are saved with the profile
    // (hb_side_stories_v1, src/profile.js): rebuild from them.
    restoreFromSideStories(stories) {
        for (const [storyId, story] of Object.entries(stories?.state ?? {})) {
            for (const perk of story?.perks ?? []) this.activePerks.add(perk);
            if (Number.isFinite(story?.bondScore) && story.bondScore > 0) this.bondState[storyId] = story.bondScore;
        }
    }

    // `context` is the leader's relationship where the conversation happens:
    // { bond: camp trust 0-5, stage: leader story stage }. Returns null when
    // there is nothing new to say, so the conversation ends after its staged
    // lines instead of repeating the same choices every visit.
    startDialogue(treeId, { bypassPrereq = false, context = {} } = {}) {
        const tree = NPC_DIALOGUE_TREES[treeId];
        if (!tree) return null;

        this.context = context ?? {};
        this.activeTree = tree;

        // Check if side story has lockout
        const lockout = this.storyManager.isLockedOut(treeId);
        if (!bypassPrereq && lockout.locked) {
            this.currentNode = {
                id: `${treeId}_lockout`,
                speaker: tree.name,
                narration: 'They look at you with cold, guarded apprehension, stepping back.',
                dialogue: `[FACTION LOCKOUT] ${lockout.reason || 'Our factions are in direct conflict. Withdraw before blood is drawn.'}`,
                choices: [
                    { id: 'lockout_leave', tone: '[WITHDRAW]', text: 'I understand. Stepping back.', nextNode: null }
                ]
            };
            this.history = [this.currentNode.id];
            this.notifyChange();
            return this.currentNode;
        }

        const currentStage = this.storyManager.getCurrentStage(treeId);
        let startNodeId = tree.initialNode;

        if (currentStage && tree.nodes[currentStage.dialogueNode]) {
            startNodeId = currentStage.dialogueNode;
        }
        if (!this.isNodeAllowed(tree.nodes[startNodeId])) startNodeId = tree.initialNode;

        const baseNode = tree.nodes[startNodeId] || tree.nodes[tree.initialNode];
        const memory = this.memoryFor(treeId);
        const offered = this.visibleChoices(tree, baseNode, memory);
        // Only a way out (and at most a quest bribe) left: say nothing rather
        // than reopen the same window.
        if (!offered.some((choice) => choice.nextNode)) {
            this.activeTree = null;
            this.currentNode = null;
            return null;
        }
        if (!memory.visitedNodes.includes(baseNode.id)) {
            memory.visitedNodes.push(baseNode.id);
            this.saveMemory();
        }
        this.currentNode = { ...baseNode, choices: offered };

        // Append the quest bribe if a side story is in progress, but never on
        // a first meeting: a live player bought one before hearing who the
        // leader was (2026-10-01 log).
        if (currentStage && currentStage.skipCost && meetsTrustedRequirement(this.context)) {
            const hasSkip = this.currentNode.choices.some((c) => c.id.startsWith('skip_stage_'));
            if (!hasSkip) {
                const costStr = Object.entries(currentStage.skipCost)
                    .map(([k, v]) => `${v} ${k.toUpperCase()}`)
                    .join(', ');
                this.currentNode.choices.push({
                    id: `skip_stage_${currentStage.index}`,
                    tone: `[SKIP QUEST // BRIBE (${costStr})]`,
                    text: `Provide required supplies to advance ${currentStage.title}.`,
                    nextNode: null,
                    isSkipAction: true
                });
            }
        }

        // No appended [PAUSE / COME BACK LATER]: nothing ever resumed or read a
        // paused story, so it was only a third way to leave (owner, 2026-10-08).

        this.history = [this.currentNode.id];
        this.notifyChange();
        return this.currentNode;
    }

    selectChoice(choiceId, { inventory = null } = {}) {
        if (!this.currentNode || !this.activeTree) return null;

        const choice = (this.currentNode.choices || []).find((c) => c.id === choiceId);
        if (!choice) return null;
        const memory = this.memoryFor(this.activeTree.id);
        if (!choice.isSkipAction && !memory.takenChoices.includes(choice.id)) memory.takenChoices.push(choice.id);
        this.saveMemory();

        if (choice.isSkipAction) {
            const currentInv = inventory || (typeof window !== 'undefined' ? (window.game?.bank?.getBanked?.() || {}) : {});
            const skipResult = this.storyManager.skipCurrentStageWithCost(this.activeTree.id, currentInv);
            const prevTree = this.activeTree;
            this.activeTree = null;
            this.currentNode = null;
            this.notifyChange();
            return { concluded: true, tree: prevTree, skipped: skipResult.success };
        }

        if (choice.isPauseAction) {
            this.storyManager.pauseStory(this.activeTree.id);
            const prevTree = this.activeTree;
            this.activeTree = null;
            this.currentNode = null;
            this.notifyChange();
            return { concluded: true, tree: prevTree, paused: true };
        }

        if (!choice.nextNode) {
            // Dialogue tree concluded
            const prevTree = this.activeTree;
            this.activeTree = null;
            this.currentNode = null;
            this.notifyChange();
            return { concluded: true, tree: prevTree };
        }

        const nextNode = this.activeTree.nodes[choice.nextNode];
        if (!nextNode) {
            this.activeTree = null;
            this.currentNode = null;
            this.notifyChange();
            return { concluded: true };
        }

        // Bond and perks pay out the first time a node is reached, not on
        // every walk down the same branch.
        const firstVisit = !memory.visitedNodes.includes(nextNode.id);
        if (firstVisit) {
            memory.visitedNodes.push(nextNode.id);
            this.saveMemory();
        }
        this.currentNode = { ...nextNode, choices: this.visibleChoices(this.activeTree, nextNode, memory) };
        this.history.push(nextNode.id);
        // No music video per choice: a camp plays one title card, on first
        // contact only (owner, 2026-10-08). Nodes keep their `interstitial`
        // for the codex and side-story screens.

        // Apply bond delta if arriving at a node with bondDelta
        if (firstVisit && nextNode.bondDelta && this.activeTree) {
            const treeId = this.activeTree.id;
            this.bondState[treeId] = (this.bondState[treeId] || 0) + nextNode.bondDelta;
            const story = this.storyManager.getStoryState(treeId);
            if (story) story.bondScore = this.bondState[treeId];
        }

        // Apply reward perk if arriving at a node with rewardPerk
        if (firstVisit && nextNode.rewardPerk) {
            this.activePerks.add(nextNode.rewardPerk.id);
            // showSteamDropToast takes a Steam itemdefid; given this object it
            // found no catalog entry and showed nothing, so perks arrived silently.
            if (typeof window !== 'undefined') {
                window.showToastNotification?.(`${nextNode.rewardPerk.name} — ${nextNode.rewardPerk.description ?? ''}`.replace(/ — $/, ''), { tone: 'info', duration: 7000 });
            }
            // Mark stage completed in sideStoryManager
            this.storyManager.completeCurrentStage(this.activeTree.id);
        }

        this.notifyChange();
        return this.currentNode;
    }

    closeDialogue() {
        this.activeTree = null;
        this.currentNode = null;
        this.notifyChange();
    }

    getBondLevel(treeId) {
        const score = this.bondState[treeId] || 0;
        if (score >= 100) return { level: 3, label: 'INTIMATE BOND // SOULBOUND' };
        if (score >= 50) return { level: 2, label: 'DEVOTED LINK // ENAMORED' };
        if (score >= 25) return { level: 1, label: 'WARM TRUST // ATTRACTION' };
        return { level: 0, label: 'NEUTRAL // ACQUAINTANCE' };
    }

    notifyChange() {
        if (typeof this.onStateChanged === 'function') {
            const storyState = this.activeTree ? this.storyManager.getStoryState(this.activeTree.id) : null;
            const currentStage = this.activeTree ? this.storyManager.getCurrentStage(this.activeTree.id) : null;
            this.onStateChanged({
                isOpen: Boolean(this.activeTree && this.currentNode),
                tree: this.activeTree,
                node: this.currentNode,
                bond: this.activeTree ? this.getBondLevel(this.activeTree.id) : null,
                bondScore: this.activeTree ? (this.bondState[this.activeTree.id] || 0) : 0,
                storyState,
                currentStage
            });
        }
    }
}

export const npcDialogueTreeManager = new NpcDialogueTreeManager();
