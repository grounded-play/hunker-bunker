import { sideStoryManager } from './sideStorySystem.js';

/**
 * NPC Interactive Branching Dialogue Trees & Sensual Mature Storylines
 * Covers deep, choice-driven interactions with Camp Leaders and Entities:
 * - Sister Val (Camp Tallow: Flesh Cult & Thermal Suture Medic)
 * - Commander Briggs (Camp Vesper: Heavy Vanguard Strike Leader)
 * - Overseer Kaelen (Camp Meridian: Cybernetic Grid & Bio-Link Engineer)
 * - Specimen 0047-B / "Aria" (The Hive Queen's Psychic Mimic)
 */

export const NPC_DIALOGUE_TREES = Object.freeze({
    sister_val: {
        id: 'sister_val',
        name: 'Sister Val',
        faction: 'CAMP TALLOW // SUTURE SANCTUARY',
        portrait: 'public/lore_portraits/tallow_val.png',
        icon: '🩸',
        themeColor: '#ff4f64',
        initialNode: 'val_greeting',
        nodes: {
            val_greeting: {
                id: 'val_greeting',
                speaker: 'Sister Val',
                interstitial: 'val_hearth_warmth',
                narration: 'She sets down a steaming bronze kettle of heated botanical resin. Her eyes, luminous and amber from spore exposure, linger on the ice crusted across your collarbone.',
                dialogue: "You're shivering, contractor. That corporate suit is bleeding heat by the second. Step closer to the thermal hearth... let me unfasten your seals and see where the cold has bitten your skin.",
                choices: [
                    {
                        id: 'val_warmth_touch',
                        tone: '[INTIMATE TOUCH]',
                        text: 'Your hands are surprisingly warm, Sister Val. What are you putting on my skin?',
                        nextNode: 'val_massage_response'
                    },
                    {
                        id: 'val_embrace',
                        tone: '[SENSUAL / EMBRACE]',
                        text: 'The bunker is dying, but your pulse is racing. Stay close to me tonight.',
                        nextNode: 'val_embrace_response'
                    },
                    {
                        id: 'val_lore_spores',
                        tone: '[PRAGMATIC LORE]',
                        text: 'Tell me about the biological spore mutations you cultivate in the alcove.',
                        nextNode: 'val_spores_response'
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
                speaker: 'Sister Val',
                interstitial: 'val_spore_communion',
                narration: 'Her fingertips are slick with warm, fragrant amber resin. She gently presses against the hollow of your throat, working down along the stiffened muscles of your shoulders. A shiver of intense, intoxicating heat cascades through your chest.',
                dialogue: "Refined tallow-root and bioluminescent spore tallow. It sinks directly into your capillaries, melting away the frostbite. Feel how your skin warms under my palms? Out there, you're just corporate meat. In here... every breath between us is sacred.",
                bondDelta: 25,
                rewardPerk: {
                    id: 'tallows_seductive_warmth',
                    name: "Tallow's Seductive Warmth",
                    description: '+15 Max HP & Freezing Resistance for the remainder of this expedition.'
                },
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
                        text: 'My body feels revitalized. Thank you, Val.',
                        nextNode: 'val_ready_buff'
                    }
                ]
            },
            val_embrace_response: {
                id: 'val_embrace_response',
                speaker: 'Sister Val',
                interstitial: 'val_hearth_warmth',
                narration: 'She steps into your space without hesitation, the heavy scent of crushed crimson petals and body heat wrapping around your senses. Her hands rest on your chest plate, feeling your frantic heartbeat.',
                dialogue: "We are all walking ghosts on this glacier, love. But tonight... our flesh is hot, alive, and unyielding. Lie with me beside the burner. Let the ice rage against the bulkhead while we burn together.",
                bondDelta: 35,
                rewardPerk: {
                    id: 'flesh_communion_blessing',
                    name: 'Flesh Communion Blessing',
                    description: 'Health regen increased by +25% when near camp or safe zones.'
                },
                choices: [
                    {
                        id: 'val_lie_down',
                        tone: '[PASSIONATE EMBRACE]',
                        text: 'Hold me close, Val. Let’s make this frozen rock burn.',
                        nextNode: 'val_intimate_climax'
                    },
                    {
                        id: 'val_restrain',
                        tone: '[GENTLE RESTRAINT]',
                        text: 'I want this, Val. But I have to finish this expedition first.',
                        nextNode: 'val_ready_buff'
                    }
                ]
            },
            val_spores_response: {
                id: 'val_spores_response',
                speaker: 'Sister Val',
                narration: 'She smiles cryptically, trailing one delicate fingernail across a blooming scarlet fungal cluster that pulses with soft biological light.',
                dialogue: "The Queen thinks she owns these spores, but life finds its own pleasure in symbiosis. When filtered properly, the resin heightens sensory nerve endings by tenfold. Pain becomes euphoria. Cold becomes anticipation.",
                bondDelta: 15,
                choices: [
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
                speaker: 'Sister Val',
                interstitial: 'val_eternal_hearth',
                narration: 'Her lips brush against your jawline, whispered words of devotion mixing with the gentle crackle of the thermal burner. Her bare shoulder presses firmly against your chest, sharing an intense, quiet sanctuary of human passion in the dark.',
                dialogue: "Remember this heat when you descend into the abyss, my fierce contractor. When the cold tries to take you, remember the taste of my breath on your neck. You belong to Tallow now... and to me.",
                bondDelta: 40,
                choices: [
                    {
                        id: 'val_parting_kiss',
                        tone: '[PARTING KISS]',
                        text: 'I’ll come back to you, Val. Keep the hearth hot.',
                        nextNode: null
                    }
                ]
            },
            val_ready_buff: {
                id: 'val_ready_buff',
                speaker: 'Sister Val',
                dialogue: 'Go with my blessing, contractor. The warmth in your veins will carry you through the storm.',
                choices: [
                    {
                        id: 'val_depart',
                        tone: '[DEPART]',
                        text: 'Until next time, Val.',
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
            briggs_greeting: {
                id: 'briggs_greeting',
                speaker: 'Commander Briggs',
                interstitial: 'briggs_scorched_rig',
                narration: 'Briggs stands beside the weapon rack, his heavy titanium chest rig unbuckled, revealing a scarred, muscular torso glistening with sweat after repelling a swarm assault.',
                dialogue: "You made it through the corridor gauntlet in one piece. Look at you... adrenaline still coursing through your veins, eyes dilated. Strip off that scorched harness before the shrapnel settles.",
                choices: [
                    {
                        id: 'briggs_flirt_clasps',
                        tone: '[FLIRT / PROVOCATION]',
                        text: 'Only if you help me unlatch the back clasps, Commander.',
                        nextNode: 'briggs_clasps_response'
                    },
                    {
                        id: 'briggs_inspect_scars',
                        tone: '[INTIMATE INQUIRY]',
                        text: 'That scar across your ribs looks fresh. Who got that close to you?',
                        nextNode: 'briggs_scars_response'
                    },
                    {
                        id: 'briggs_tactics',
                        tone: '[TACTICAL TALK]',
                        text: 'We need more armor-piercing rounds for the outer perimeter.',
                        nextNode: 'briggs_tactics_response'
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
                speaker: 'Commander Briggs',
                interstitial: 'briggs_scar_tissue',
                narration: 'He gives a low, raspy chuckle, stepping behind you. His calloused, heavy hands grasp the thermal buckles of your rig, fingers brushing against your nape as he unclips the armor plates with practiced ease.',
                dialogue: "You always did like playing with live ordnance. There... let your shoulders breathe. You're tighter than a locked hydraulic valve. Feel that? That's what surviving feels like.",
                bondDelta: 25,
                rewardPerk: {
                    id: 'vesper_vanguard_adrenaline',
                    name: 'Vesper Vanguard Adrenaline',
                    description: '+10% Movement Speed and +15% Melee Knockback.'
                },
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
                dialogue: "I keep the heavy magazines stocked in the south bunker. But don't forget, soldier: the best weapon in this frozen hell is the person covering your back.",
                bondDelta: 10,
                choices: [
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
        portrait: 'public/lore_portraits/meridian_kaelen.png',
        icon: '⚡',
        themeColor: '#00e5ff',
        initialNode: 'kaelen_greeting',
        nodes: {
            kaelen_greeting: {
                id: 'kaelen_greeting',
                speaker: 'Overseer Kaelen',
                interstitial: 'kaelen_diagnostic_cradle',
                narration: 'Kaelen pushes his magnifying welding goggles onto his graying hair. The green glow of oscilloscope monitors highlights his sharp cheekbones and grease-smudged jaw.',
                dialogue: "Your sensory telemetry is fluctuating wildly, contractor. Step into the diagnostic cradle. Let me jack into your suit's neural bio-link directly... try to hold still while the high-voltage diagnostic flows.",
                choices: [
                    {
                        id: 'kaelen_bio_link',
                        tone: '[BIO-LINK INTIMACY]',
                        text: 'Your fingers are electric, Kaelen. Overclock my neural feed as deep as you want.',
                        nextNode: 'kaelen_biolink_response'
                    },
                    {
                        id: 'kaelen_tease',
                        tone: '[INTELLECTUAL SEDUCTION]',
                        text: 'You stare at those frequency waves like you want to devour them. Look at me instead.',
                        nextNode: 'kaelen_tease_response'
                    },
                    {
                        id: 'kaelen_grid_lore',
                        tone: '[PRAGMATIC LORE]',
                        text: 'How stable is the Ring 2 power distribution grid?',
                        nextNode: 'kaelen_grid_response'
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
                speaker: 'Overseer Kaelen',
                interstitial: 'kaelen_frequency_overclock',
                narration: 'He inserts a gleaming copper interface cable into the base of your helmet collar. A sharp, tingling surge of bio-electric current races down your spine, illuminating your HUD with brilliant cyan sparks.',
                dialogue: "Fascinating... your synaptic conductance is extraordinary. Feel the signal pulse, contractor? It’s not just data. It’s synchronization. Every thought you have is echoing directly into my terminal.",
                bondDelta: 25,
                rewardPerk: {
                    id: 'meridian_neural_overclock',
                    name: 'Meridian Neural Overclock',
                    description: '+20m Tactical Radar Range and +10% Faster Sprint Recharge.'
                },
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
                dialogue: "It's barely holding together with jumper cables and stubbornness. But give me enough scrap, and I'll make this whole sector shine like neon.",
                bondDelta: 10,
                choices: [
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

export class NpcDialogueTreeManager {
    constructor({ onStateChanged = null } = {}) {
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
    }

    startDialogue(treeId, { bypassPrereq = false } = {}) {
        const tree = NPC_DIALOGUE_TREES[treeId];
        if (!tree) return null;

        this.activeTree = tree;

        // Check if side story has lockout
        const lockout = sideStoryManager.isLockedOut(treeId);
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

        const currentStage = sideStoryManager.getCurrentStage(treeId);
        let startNodeId = tree.initialNode;

        if (currentStage && tree.nodes[currentStage.dialogueNode]) {
            startNodeId = currentStage.dialogueNode;
        }

        const baseNode = tree.nodes[startNodeId] || tree.nodes[tree.initialNode];
        this.currentNode = { ...baseNode, choices: [...baseNode.choices] };

        // Append Skip / Pause options if side story is in progress
        if (currentStage && currentStage.skipCost) {
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

        const hasPause = this.currentNode.choices.some((c) => c.id === 'pause_story_choice');
        if (!hasPause) {
            this.currentNode.choices.push({
                id: 'pause_story_choice',
                tone: '[PAUSE / COME BACK LATER]',
                text: 'I have other urgent sector duties. Keep this between us until I return.',
                nextNode: null,
                isPauseAction: true
            });
        }

        this.history = [this.currentNode.id];
        this.notifyChange();
        return this.currentNode;
    }

    selectChoice(choiceId, { inventory = null } = {}) {
        if (!this.currentNode || !this.activeTree) return null;

        const choice = (this.currentNode.choices || []).find((c) => c.id === choiceId);
        if (!choice) return null;

        if (choice.isSkipAction) {
            const currentInv = inventory || (typeof window !== 'undefined' ? (window.game?.bank?.getBanked?.() || {}) : {});
            const skipResult = sideStoryManager.skipCurrentStageWithCost(this.activeTree.id, currentInv);
            const prevTree = this.activeTree;
            this.activeTree = null;
            this.currentNode = null;
            this.notifyChange();
            return { concluded: true, tree: prevTree, skipped: skipResult.success };
        }

        if (choice.isPauseAction) {
            sideStoryManager.pauseStory(this.activeTree.id);
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

        this.currentNode = { ...nextNode, choices: [...nextNode.choices] };
        this.history.push(nextNode.id);

        if (typeof window !== 'undefined' && nextNode.interstitial && typeof window.playSideStoryInterstitial === 'function') {
            window.playSideStoryInterstitial(nextNode.interstitial);
        }

        // Apply bond delta if arriving at a node with bondDelta
        if (nextNode.bondDelta && this.activeTree) {
            const treeId = this.activeTree.id;
            this.bondState[treeId] = (this.bondState[treeId] || 0) + nextNode.bondDelta;
            const story = sideStoryManager.getStoryState(treeId);
            if (story) story.bondScore = this.bondState[treeId];
        }

        // Apply reward perk if arriving at a node with rewardPerk
        if (nextNode.rewardPerk) {
            this.activePerks.add(nextNode.rewardPerk.id);
            if (typeof window !== 'undefined' && window.showSteamDropToast) {
                window.showSteamDropToast({
                    name: nextNode.rewardPerk.name,
                    icon: '❤️',
                    category: 'SENSUAL STORY PERK'
                });
            }
            // Mark stage completed in sideStoryManager
            sideStoryManager.completeCurrentStage(this.activeTree.id);
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
            const storyState = this.activeTree ? sideStoryManager.getStoryState(this.activeTree.id) : null;
            const currentStage = this.activeTree ? sideStoryManager.getCurrentStage(this.activeTree.id) : null;
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
