import { ACT2_ENDINGS } from './act2Endings.js';
import { getResolution, normalizeLinchpins } from './storyLinchpins.js';

export function buildEndingArchive(state = {}, unlocked = {}) {
    const choices = Object.entries(normalizeLinchpins(state.linchpins));
    return Object.values(ACT2_ENDINGS).map(id => ({
        id,
        discovered: Boolean(unlocked[`ending_${id}`]),
        causes: choices.filter(([key, resolution]) => getResolution(key, resolution).locksEndings?.includes(id))
            .map(([key, resolution]) => ({ id: key, resolution }))
    }));
}

const BESPOKE_REACTIONS = Object.freeze({
    TANK: Object.freeze({
        'mayor_tina:killed': 'BRIGGS: Word from Sector 9: you put the roach mayor down. Good riddance. A monster wearing an election button is still a monster.',
        'mayor_tina:joined': "BRIGGS: What in God's name did you do?! My scouts say Tina is still walking—and she's whispering in your head. Keep that thing far away from Vesper.",
        'scientist_specimen:proved': "BRIGGS: You let that monstrosity crawl away? The doctor's bleeding-heart research will get us all torn apart, Operator.",
        'scientist_specimen:dismissed': "BRIGGS: Good kill. The doctor can cry into her Petri dishes; that's one less set of jaws pacing our perimeter.",
        'queen_offer:accepted': "BRIGGS: You signed the Queen's pact?! Two berths on the shuttle for that abomination?! You're leaving my squad to suffocate in the ice!",
        'queen_offer:refused': 'BRIGGS: You stood before the Brood Mother and told her to burn. Now THAT is soldiering, Operator. Vesper stands with you to the launchpad.',
        'briggs_oath:honored': "BRIGGS: Vesper garrison stands relieved and combat-ready. You honored your word to a soldier, Operator. I won't forget it.",
        'briggs_oath:broken': "BRIGGS: So that's how it is. You cut our supply line and left Vesper to the frost. Watch your back out in the dark.",
        'martha_beacon:broadcast': "BRIGGS: Sister Martha's radio beacon just lit up the sector. Every survivor knows there's hope—and every swarm knows our coordinates.",
        'martha_beacon:silenced': "BRIGGS: Tallow's radio went dark. Cold calculus, Operator, but quiet boots keep the swarm from converging on the escape roads.",
        'kaelen_manifest:disclosed': 'BRIGGS: Kaelen published the true shuttle manifest. No corporate favoritism, no hidden VIP slots. Straight shooting. I respect that.',
        'kaelen_manifest:falsified': "BRIGGS: Kaelen's manifest numbers don't add up. Someone is doctoring the passenger rolls. If my squad got cut, we're going to have words.",
        'suture_host_mercy:cured_human': "BRIGGS: Biometric sweep confirms your infection halted. You're pure human again, soldier. Let's finish this operation clean.",
        'suture_host_mercy:symbiotic_carrier': 'BRIGGS: What did Nahl stitch into your veins?! Your vitals are spiking alien enzymes. Keep your distance from my barricades.',
        'relay_chorus:jammed_camps': "BRIGGS: Heavy static on tactical comms! The Relay Hive jammed human radio! We're blind on the trench perimeters!",
        'relay_chorus:bridge_synapse': "BRIGGS: The radio static cleared into... thoughts? I can feel the swarm's flanks shifting. Wild tech, Operator. Use it to keep us alive.",
        'carapace_oath:shield_queen': "BRIGGS: The Carapace colossus pledged itself to the Queen. We'll have to pierce three inches of bio-armor if that beast blocks our landing.",
        'carapace_oath:shield_operator': "BRIGGS: That walking fortress Rhun is shielding your advance? Ha! I wouldn't mind a beast like that anchoring our frontline."
    }),
    SCOUT: Object.freeze({
        'mayor_tina:killed': 'MARTHA: We heard about Mayor Tina. God forgive us... but at least the transit tunnels between our camps are quiet tonight.',
        'mayor_tina:joined': "MARTHA: Operator... the air smells like sweet mold from the deep shaft. Tina's bio-signature is following you. May heaven have mercy on what you've welcomed in.",
        'scientist_specimen:proved': 'MARTHA: Okonkwo-Vass wept over the comms. She said you held your fire and it listened. Maybe there is still a spark of grace left in this dark.',
        'scientist_specimen:dismissed': 'MARTHA: You crushed it right in front of her... Vass went dark on the frequencies. When hope dies in a scholar, it leaves a terrible silence.',
        'queen_offer:accepted': "MARTHA: The Queen's brood is boarding... We can smell the royal spores through the air scrubbers. How could you trade our salvation for monsters?",
        'queen_offer:refused': 'MARTHA: You turned your back on the Queen\'s temptation. Our prayers were answered. We will make our pilgrimage to the ship as human souls.',
        'briggs_oath:honored': "MARTHA: Commander Briggs broadcast the defense pact. Knowing Vesper's shields are holding our perimeter lets Tallow sleep tonight.",
        'briggs_oath:broken': "MARTHA: Vesper's radio is screaming... You abandoned Briggs's garrison? If the Commander falls, who protects the outer rim?",
        'martha_beacon:broadcast': 'MARTHA: Our beacon is singing into the ice! Every lost soul in the tunnels can hear our choir guiding them to safety.',
        'martha_beacon:silenced': 'MARTHA: We cut the transmission cables. Our voices are silenced... Pray that our quiet footsteps lead us through the valley unharmed.',
        'kaelen_manifest:disclosed': 'MARTHA: Overseer Kaelen told the truth about the shuttle seats. Transparency is bitter, but honesty cleanses the spirit.',
        'kaelen_manifest:falsified': 'MARTHA: Whispers are spreading that the passenger manifest was forged. Fear and suspicion will tear our camps apart before the frost does.',
        'suture_host_mercy:cured_human': 'MARTHA: The plague marks receded from your skin! Praise be—the flesh can be redeemed even in the deep dark.',
        'suture_host_mercy:symbiotic_carrier': 'MARTHA: You let the Suture stitch their spore into your blood... You walk between two worlds now, Operator.',
        'relay_chorus:jammed_camps': 'MARTHA: Our prayer frequencies are drowned in shrieking feedback. The hive chorus has severed our link to the other sanctuaries.',
        'relay_chorus:bridge_synapse': 'MARTHA: The static in the headset... it sounds like singing. Vey opened their minds to us. It is terrifying, yet holy.',
        'carapace_oath:shield_queen': 'MARTHA: The great armored beast knelt before the brood mother. The ancient covenants are reforming beneath the frost.',
        'carapace_oath:shield_operator': 'MARTHA: A giant of chitin and stone has sworn to protect you. May its heavy shell shelter your humanity to the journey\'s end.'
    }),
    ENGINEER: Object.freeze({
        'mayor_tina:killed': "KAELEN: Transmission log confirmed: Tina's neural pulse flatlined. Tragic loss of pre-collapse civic data, but necessary for sector containment.",
        'mayor_tina:joined': "KAELEN: Sensor spike in your suit's auxiliary core. Tina's frequency didn't terminate—it merged with yours. The math on your humanity index is plummeting.",
        'scientist_specimen:proved': 'KAELEN: Telemetry verified: the specimen ceased hostile vibrations and withdrew. Fascinating acoustic damping. Perhaps synthesis is more than theory.',
        'scientist_specimen:dismissed': 'KAELEN: Biological subject liquidated. Vass has ceased log transmissions. Efficient, but we just lost our best translator for the deep hive.',
        'queen_offer:accepted': 'KAELEN: Biological mass overload in Launch Bay 3. Queen alien secured in secondary hold. Our evacuation capacity has been halved. God help us in orbit.',
        'queen_offer:refused': 'KAELEN: Neural lure decoupled. The Queen has retreated into the trench magma. Vessel berths remain clear for civilian manifests.',
        'briggs_oath:honored': "KAELEN: Briggs's tactical perimeter is online. Power fluctuations stabilized across the foundry conduits. Good work securing Vesper.",
        'briggs_oath:broken': 'KAELEN: Distress signals from Camp Vesper went dark. Strategic defense matrix compromised. Meridian is running on emergency reserve.',
        'martha_beacon:broadcast': 'KAELEN: High-frequency civilian broadcast detected from Camp Tallow. Frequencies locked. Guiding refugees toward rendezvous.',
        'martha_beacon:silenced': 'KAELEN: Signal dampeners deployed at Tallow. Civilian broadcast killed. Stealth parameters preserved at cost of civilian morale.',
        'kaelen_manifest:disclosed': 'KAELEN: Authentic vessel logs compiled and distributed. Every seat accounted for. No more corporate secrets between us.',
        'kaelen_manifest:falsified': 'KAELEN: Manifest encrypted and modified. Certain cargo must remain off the official record. I hope you can live with the delta.',
        'suture_host_mercy:cured_human': 'KAELEN: Bio-telemetry normal. Pathogen neutralized. Launch quarantine clearance granted without restrictions.',
        'suture_host_mercy:symbiotic_carrier': 'KAELEN: Symbiotic bond stabilized. You are now a carrier organism. External quarantine seals will be required at launch.',
        'relay_chorus:jammed_camps': 'KAELEN: Human comms band suppressed by acoustic dampening. Only encrypted hive channels remain open.',
        'relay_chorus:bridge_synapse': 'KAELEN: Direct psychic-radio bridge operational. Sensor latency reduced by 94%. We can hear the swarm thinking.',
        'carapace_oath:shield_queen': 'KAELEN: Kinetic field diverted to the Brood Mother. Defensive telemetry re-routed away from human shuttle access.',
        'carapace_oath:shield_operator': 'KAELEN: Kinetic deflection field projected by Carapace unit Rhun. Exosuit survivability increased exponentially.'
    }),
    MAYOR_TINA: Object.freeze({
        'scientist_specimen:proved': "TINA: (chittering softly) The little snail remembered the warm burrow... Vass sees the music now, doesn't she, neighbor?",
        'scientist_specimen:dismissed': 'TINA: (clicking) You crushed the shell... Just like the Council used to crush housing variances. Old habits die cold.',
        'queen_offer:accepted': "TINA: Mother is coming home to the sky with us! Feel the thrum in the pipes, dear? We won't need heat lamps where we're going.",
        'queen_offer:refused': 'TINA: (hissing) You left Her in the sludge?! After everything She spun for you?! The vents will remember this, Operator...',
        'briggs_oath:honored': 'TINA: The soldier built his pretty walls. Chitin grows right over rebar, dear, but let him have his parade.',
        'briggs_oath:broken': 'TINA: Vesper is going dark... More fertilizer for the mushroom gardens. The municipal budget balances itself.',
        'martha_beacon:broadcast': "TINA: Martha's voice is ringing like church bells! It tickles my antennae all the way down in the coolant tanks.",
        'martha_beacon:silenced': "TINA: Silence is so peaceful, isn't it? No elections, no petitions. Just the spore dusting over the quiet floor.",
        'kaelen_manifest:disclosed': 'TINA: The engineer printed the guest list! Did he save a seat under the floorboards for the Mayor?',
        'kaelen_manifest:falsified': 'TINA: (chuckling) Doctoring the paperwork! You really DO have what it takes for city politics, Operator.',
        'suture_host_mercy:cured_human': 'TINA: (whimpering) You burned the spore out?! It was so warm, Operator... Why would you want to be cold and lonely again?',
        'suture_host_mercy:symbiotic_carrier': 'TINA: (purring) Yes... feel the tendrils knitting under your ribs. Welcome to the committee, sister.',
        'relay_chorus:bridge_synapse': "TINA: Vey's song is in your skull now too! Isn't the harmony lovely? We'll never have to speak through tin cans again.",
        'carapace_oath:shield_operator': "TINA: Big brother Rhun has your back. He's slow, but he crushes things that get between friends."
    })
});

export function getLeaderReaction(classId, choiceId, resolution) {
    const key = String(classId ?? '').toUpperCase();
    const subKey = `${choiceId}:${resolution}`;
    if (BESPOKE_REACTIONS[key]?.[subKey]) {
        return BESPOKE_REACTIONS[key][subKey];
    }
    const subject = String(choiceId ?? '').replace(/_/g, ' ');
    const outcome = String(resolution ?? '').replace(/_/g, ' ');
    const fallbackNames = {
        TANK: 'BRIGGS',
        SCOUT: 'MARTHA',
        ENGINEER: 'KAELEN',
        MAYOR_TINA: 'TINA'
    };
    const prefix = fallbackNames[key] ?? key;
    return `${prefix}: Word reached the watch: ${subject}, ${outcome}. I am counting who your decision leaves outside the gate.`;
}
