# Hive Swarm Camps, Humanity Decay, and Boarding Manifest Expansion

Northstar docs:

- `docs/expanded-universe-narrative-design.md`
- `docs/story-arc-endings-design.md`
- `docs/implementation_plan.md`

This document expands the current human-camp multi-ending plan into a dual
faction system: three human camps, three alien hive sites, a player humanity
cover meter, communication networks that can expose the player, and a boarding
manifest solver where every body loaded onto the escape vessel matters.

The core fantasy:

- In Act 1, the player builds human camps and mines strange hive sites for
  resources, not fully understanding that the sites are living alien allies.
- After infection, the same map flips. Human camps become people who may trust,
  fear, expose, or board with you. Hive sites become alien personalities who may
  help, resent, die, or escape with you.
- The ending is no longer just "queen or humans." It is a cargo problem, a
  secrecy problem, and a moral problem.

## Current Ground Truth

### Already In The Codebase

- `src/act2.js` owns persistent Act 2 state in `hb_act2_v1`.
- Human camps already have status states: `alive`, `robbed`, `culled`,
  `recruited`, `turned`.
- Human camps already have `level`, `bond`, `questFlags`, and persisted
  positions.
- Camp order is class-driven:
  - Scout meets Tank, Engineer, then inverted Scout.
  - Tank meets Engineer, Scout, then inverted Tank.
  - Engineer meets Scout, Tank, then inverted Engineer.
- `src/camp.js` renders in-world camp leaders and worker figures.
- `src/threeGame.js` can open a camp decision modal and resolve steal, cull,
  recruit, turn, and board choices.
- `pickAct2Ending()` already reads queen, egg, obedience, and human camp states.
- The current vessel fiction is four seats.

### Not Built Yet

- No separate hive-site state exists.
- No alien ally characters exist.
- No mining/extraction loop exists for hives.
- No humanity, infection, or cover meter exists.
- No camp suspicion or "outed to humans" state exists.
- No communication network state exists.
- No boarding manifest capacity solver exists.
- No way to carry a mix of humans, alien allies, queen, eggs, and player under
  hard seat constraints.
- No mothership infection ending exists.
- No Act 2 vitals/HUD transformation exists beyond queen dialogue.

## Design Pillars

1. Build and steal should both come back later.
   The human side remembers what the player built for them. The hive side
   remembers what the player mined out of them.

2. Humanity is cover, not morality.
   The player can be infected and still act kindly. The danger is whether the
   humans notice before boarding or before the mothership infiltration.

3. The networks are useful and dangerous.
   Linking camps or hives improves coordination, trade, quests, and rescue
   options. If the player is outed, linked bases spread the truth.

4. The vessel is a strict manifest puzzle.
   Every ending should be readable from who physically gets a seat.

5. The queen is not the whole hive.
   The three alien allies are not just queen extensions. They can be rescued,
   abandoned, sacrificed, killed, or taken off-world without her.

## New Core State

Add this as Act 2 state version 3 under the existing `hb_act2_v1` key, unless
we choose to split it later. Keeping the key lets export/import/reset keep
working.

```js
{
    version: 3,

    // Existing fields stay:
    begun: false,
    uplinkSilenced: false,
    dishBuilt: false,
    departed: false,
    queenObedience: 0,
    queenStatus: 'aboard', // aboard | rejected | killed | abandoned
    eggsStatus: 'aboard',  // aboard | destroyed | abandoned | hidden
    camps: [],

    // New player infection/cover axis:
    humanity: 100,          // 0..100, visible human control and masking
    infectionLoad: 0,       // 0..100, alien viral strength
    infectionStage: 'latent',
    coverIntegrity: 100,    // 0..100, how convincing the player appears
    outedToHumans: false,

    // Per-camp suspicion:
    suspicion: {
        camp_meridian: 0,
        camp_tallow: 0,
        camp_vesper: 0
    },

    // Human and hive communication links:
    networks: {
        humanRelayOnline: false,
        hiveSynapseOnline: false,
        bridgeOnline: false,
        knownByCamps: [],
        knownByHives: []
    },

    // New hive sites:
    hives: [
        {
            id: 'hive_suture',
            x: null,
            z: null,
            status: 'dormant',
            extractionLevel: 0,
            bond: 0,
            questFlags: {},
            networked: false,
            aboard: false,
            characterId: 'nahl'
        }
    ],

    // Manifest is computed from state, but saving the last chosen manifest helps
    // cutscenes, debug tools, and resume behavior.
    manifest: {
        player: 'infected',
        humans: [],
        aliens: [],
        queen: false,
        egg: false,
        seatsUsed: 1,
        seatsMax: 4
    }
}
```

### Suggested Enums

```js
ACT2_INFECTION_STAGES = [
    'latent',       // infected, no visible tells
    'strained',     // minor tells; suspicion rises near humans
    'symptomatic',  // obvious tells unless masked
    'outed',        // humans know
    'cured',        // alien link severed
    'ascendant'     // no longer pretending to be human
];

ACT2_HIVE_STATUSES = [
    'dormant',
    'mined',
    'wounded',
    'awakened',
    'bonded',
    'rescued',
    'aboard',
    'abandoned',
    'slain',
    'expired_by_cure',
    'queen_consumed'
];

ACT2_HUMAN_PASSENGER_STATES = [
    'none',
    'human_unsuspecting',
    'human_suspicious',
    'human_outed',
    'latent_infected',
    'turned',
    'dead'
];
```

## Three Hive Swarm Sites

These are the alien mirror of Meridian, Tallow, and Vesper. They are not "camps"
in the human sense. In Act 1 they look like mineable bio-industrial anomalies.
After infection, the player can understand the personalities inside them.

### 1. Suture Hive

- Id: `hive_suture`
- Character: Nahl, the Suture
- Role: healer, mask-maker, tissue memory keeper
- Resource when mined: `suture_resin`
- Gameplay specialty: slows humanity loss, creates masking consumables, can
  make infected humans appear clean for a short time.
- Visual identity: green-white membrane, medical tubing grown through metal,
  soft pulse lights, quiet breathing machinery.

Act 1 mining:

- The player drills "resin sacs" for med/shell rewards.
- Each extraction level weakens Nahl and lowers future alien bond.
- High extraction makes Nahl begin Act 2 wounded.

Act 2 quest line:

1. Patch The Cut
   Bring med tech from Tallow or foundry salvage to repair mined tissue.
   Reward: `humanityDecayRate -10%`, Suture bond +1.

2. Mask Protocol
   Recover a clean human bioscan from a camp terminal.
   Reward: unlocks `Masking Serum` consumable.

3. Host Mercy
   Choose whether Nahl helps cure the player or helps preserve the infection.
   Reward branch:
   - cure path: unlocks `uninfectSelf()`, but alien allies begin dying.
   - hive path: unlocks `latentInfectHuman(campId)`.

Boarding role:

- Takes one seat if rescued.
- If aboard, can keep one egg stable without the queen, but only if the Amber
  Nursery was also stabilized or the egg has an incubator upgrade.

### 2. Relay Hive

- Id: `hive_relay`
- Character: Vey, the Listener
- Role: communication, secrecy, synapse routing
- Resource when mined: `neural_filament`
- Gameplay specialty: networks, camp communications, suspicion spread,
  mothership infiltration.
- Visual identity: antenna-like bone spires, pulsing green signal threads,
  organic dishes grown into ruined comm panels.

Act 1 mining:

- The player extracts filaments as "signal cable" for ship/foundry progress.
- Mining improves early radar rewards but damages future hive communication.

Act 2 quest line:

1. Rebuild The Chorus
   Use tech salvage to reconnect the three hive sites.
   Reward: `hiveSynapseOnline = true`; alien quests become easier.

2. Jam The Human Relay
   Sabotage or spoof the human camp network.
   Reward: suspicion no longer automatically spreads between linked human
   camps.

3. False Clearance
   Forge a mothership-friendly crew signature.
   Reward: unlocks the Mothership Infection ending attempt if the manifest
   also qualifies.

Boarding role:

- Takes one seat if rescued.
- If aboard with three aliens and the player, Vey can route the ship away from
  the queen without immediately alerting her.

### 3. Carapace Hive

- Id: `hive_carapace`
- Character: Rhun, the Shield
- Role: defense, hull growth, brood guardian
- Resource when mined: `living_chitin`
- Gameplay specialty: armor upgrades, extra cargo reinforcement, queen/alien
  combat consequences.
- Visual identity: black-green plates, amber cracks, bunker bulkheads plated
  over with living armor.

Act 1 mining:

- The player harvests chitin as a high-value armor/hull material.
- Extraction improves ship rebuild speed or armor upgrades but injures Rhun.

Act 2 quest line:

1. Return The Shell
   Give back living chitin or replace it with metal armor.
   Reward: Carapace bond +1, unlocks alien guard assistance.

2. Hold The Breach
   Defend the hive from queen-controlled drones or human purge teams.
   Reward: temporary combat ally at hive sites.

3. Sever The Guard Oath
   Decide whether Rhun stays loyal to the queen or to the player.
   Reward branch:
   - queen path: Rhun may fight you if you abandon the queen.
   - player path: Rhun can board without the queen.

Boarding role:

- Takes one seat if rescued.
- If aboard with all three alien allies, unlocks the "Alien Exodus" path.

## Human Camps Expanded By Suspicion

Human camps already have `bond` and `status`. Add suspicion and passenger
state as overlays, not replacements.

Per camp:

```js
{
    id: 'camp_meridian',
    status: 'alive',
    bond: 4,
    suspicion: 0,
    passengerState: 'none',
    knowsPlayerInfected: false,
    relayLinked: false,
    leaderAlive: true
}
```

Human-facing Act 2 choices:

- Recruit human:
  Requires bond threshold. Boards as `human_unsuspecting` if suspicion is low.
- Warn human:
  Boards as `human_suspicious`; safer ethically, blocks mothership infection.
- Latent infect:
  Requires Suture quest and low suspicion. Boards as `latent_infected`.
- Turn:
  Existing dark path. Boards as visible alien/turned, blocks "unsuspecting"
  endings.
- Cull:
  Existing path. Kills camp and pleases queen.
- Rob:
  Existing path. Makes camp hostile and unavailable for clean boarding.

## Humanity, Infection, And Being Outed

### Gauge Meanings

Current game:

- O2 is the pressure gauge.
- Health is survival.

After infection:

- O2 should still exist as suit atmosphere, but the story pressure should shift
  to humanity/cover.
- HUD should show:
  - `HUMANITY` or `COVER` as the primary Act 2 bar near humans.
  - `INFECTION LOAD` as the opposing bar or secondary readout.
  - O2 can remain smaller or be renamed by context as suit pressure.

Recommended tuning:

```text
humanity 100..76: latent, safe around humans
humanity 75..51: strained, suspicion rises slowly
humanity 50..26: symptomatic, suspicion rises quickly unless masked
humanity 25..1: near-outed, dialogue and controls glitch
humanity 0: outed or ascendant, depending on current location
```

### Humanity Changes

Humanity decreases when:

- Time passes in Act 2.
- The player uses hive powers.
- The player turns humans.
- The player boards queen/egg choices.
- The player connects bridge networks without masking.

Humanity increases or stabilizes when:

- The player uses Masking Serum.
- The player completes Suture quests.
- The player stays near human camp medical fields.
- The player chooses cure/uninfect actions.

### Suspicion Changes

Per-camp suspicion increases when:

- The player enters camp with low humanity.
- The player uses hive powers in view.
- A camp sees turned humans or alien allies.
- The human relay receives an outing from another camp.
- The player steals/culls nearby or leaves evidence.

Per-camp suspicion decreases when:

- The player completes human bonding quests.
- The player uses forged bioscan credentials.
- The player jams the human relay.
- The player brings useful supplies without visible infection tells.

### Outing Propagation

Rule:

```text
if player is outed at one human camp
and humanRelayOnline is true
and relay is not jammed
then all relayLinked camps set knowsPlayerInfected = true
```

If only two camps are linked, only those two learn. If all three are linked,
one mistake burns the full human path.

Hive network tradeoff:

- `hiveSynapseOnline` lets alien allies coordinate and survive.
- `bridgeOnline` between hive and human systems enables advanced stealth hacks,
  but if cover fails it can leak infection evidence into human comms.

## Consumables And Pickup Recontextualization

The pickup economy can reuse existing assets first, then receive art later.

### Human Act

- O2 canister: restores O2.
- Med pickup: restores health.
- Shells: upgrade/support currency.

### Infected Act

- O2 canister becomes `Masking Serum` when in Act 2 UI context.
  - Effect: restores `coverIntegrity` or slows suspicion gain.
- Med pickup becomes `Tissue Stabilizer`.
  - Effect: restores health and small humanity.
- Bio-spore pickup becomes `Infection Catalyst`.
  - Effect: increases infectionLoad and powers hive abilities.
- Shells remain useful for humans.
- Hive resources become new currencies:
  - `suture_resin`
  - `neural_filament`
  - `living_chitin`

Implementation note:

- Do not remove O2 immediately. Add a new vitals event first:
  `player-humanity-changed`.
- `VitalsHUD` can choose which bar to emphasize based on arc state.

## Boarding Manifest Rules

The escape vessel has four seat-equivalent slots.

Hard rule:

```text
player = 1 required slot
seatsMax = 4
```

Passenger costs:

| Passenger | Seat cost | Notes |
| --- | ---: | --- |
| Player | 1 | Always aboard if launch succeeds |
| Human leader/passenger | 1 | Must be alive, recruited, and not blocking launch |
| Alien ally | 1 | Must be rescued or bonded |
| Queen | 2 | Cannot fit with three humans or three alien allies |
| Egg/incubator | 1 | Fragile; needs queen, Suture support, or nursery upgrade |

Examples:

| Manifest | Seats | Meaning |
| --- | ---: | --- |
| Player + Queen + Egg | 4 | Full Brood style launch |
| Player + 3 humans | 4 | Clean escape or mothership infection attempt |
| Player + 3 alien allies | 4 | Alien Exodus, queen left behind |
| Player + 2 humans + Egg | 4 | Carrier bargain variant |
| Player + 1 human + 1 alien + Queen | 5 | Invalid unless ship expansion exists |
| Player alone | 1 | Scorched/failed escape variants |

### Egg Fragility

Egg can board only if at least one is true:

- Queen aboard.
- Suture Hive quest completed and Nahl alive.
- Egg incubator upgrade built from `suture_resin` and `living_chitin`.

If egg boards without stabilization:

- It may break during launch.
- Human passengers may discover it.
- Mothership infection plan fails.

## Mothership Infection Attempt

This is the highest stealth path, separate from simple clean escape.

Required state:

```text
player infected but latent
all three human leaders/passengers aboard
humans do not know player is infected
no visible alien allies aboard
queen not aboard
egg not visibly aboard
humanRelay leak contained or jammed
false mothership clearance completed
```

If all conditions pass:

- Ending path: `mothership_infection`.
- The humans believe this is a rescue/debrief flight.
- The player reaches the mothership as an accepted survivor.
- The infection can spread into the mothership interior.

If any condition fails:

- The mothership infection attempt is blocked.
- The game falls back to an escape ending based on manifest:
  - outed humans aboard -> `outed_escape`
  - clean humans and cured player -> `clean_escape`
  - egg hidden but discovered -> `carriers_bargain_failed`
  - mixed passengers -> `mixed_manifest`

## Uninfecting The Player

The cure should be powerful and costly.

Action:

```js
uninfectSelf()
```

Requirements:

- Suture Hive `Host Mercy` cure branch complete.
- Queen link weakened, rejected, or killed.
- Enough med/hive resources for a one-time purge.

Consequences:

- `infectionStage = 'cured'`
- `humanity = 100`
- `infectionLoad = 0`
- Queen telepathy stops or becomes hostile.
- Latent infected humans can be stabilized or exposed depending on tuning.
- Alien allies not already independently stabilized become
  `expired_by_cure`.
- Queen and eggs cannot survive through the player's body anymore.

Narrative use:

- Enables true clean escape.
- Can kill the three alien allies if the player did not rescue/stabilize them.
- Can be used as a tragic choice after bonding with alien allies.

## Killing Alien Allies

Act 2 should allow the player to go too hard against either side.

Alien-side hostile actions:

- Overmine a hive in Act 1.
- Harvest a wounded hive in Act 2.
- Sacrifice an alien ally to the queen.
- Cure self without stabilizing alien allies.
- Cull a hive site directly if queen obedience is high.

Potential statuses:

- `slain`: killed by player/combat.
- `queen_consumed`: sacrificed to queen.
- `expired_by_cure`: dies when player severs infection link.
- `abandoned`: left planet-side alive or dying.

This matters because "save the aliens, leave the queen" should be a real path,
not just "serve the queen differently."

## Expanded Ending Families

These do not need all be cutscenes immediately. First implementation can return
ending IDs and show text cards.

### Existing Endings To Preserve

- `full_brood`
- `clean_escape`
- `mixed_crew`
- `carriers_bargain`
- `scorched_sky`

### New Ending Families

#### Mothership Infection

Conditions:

- Player + all three humans aboard.
- Player is latent infected.
- Humans are unsuspecting.
- False clearance quest complete.
- No outing propagated.

Outcome:

- The ship is accepted as a survivor rescue.
- The player carries the hive into the mothership.
- This is the stealth-hardest infection path.

#### Alien Exodus

Conditions:

- Player + all three alien allies aboard.
- Queen abandoned, rejected, or killed.
- Hives bonded/rescued.

Outcome:

- The player chooses the alien friends over queen and humans.
- The queen remains planet-side, furious or dying.
- The ship leaves with a smaller, independent swarm.

#### Outed Escape

Conditions:

- Humans board but know or strongly suspect infection.
- Mothership infection attempt fails.

Outcome:

- The flight becomes tense containment rather than infiltration.
- Humans may lock the player down or force a quarantine course.

#### Failed Carrier

Conditions:

- Egg hidden aboard.
- Egg unstable or discovered.
- Queen absent.

Outcome:

- The player escapes, but the brood plan is compromised.
- Could branch into egg death, human panic, or quarantine.

#### Empty Husk

Conditions:

- Queen gone.
- Eggs gone.
- Humans dead or absent.
- Alien allies dead or absent.

Outcome:

- A harsher variant of Scorched Sky.
- The player survives with nothing left to carry.

## Ending Picker Inputs

The final function should become:

```text
Ending = f(
  humanity,
  infectionStage,
  coverIntegrity,
  camps,
  hives,
  queenStatus,
  eggsStatus,
  networks,
  manifest
)
```

First pass should keep this pure and heavily tested. Gameplay can be messy;
the picker should not be.

Priority order suggestion:

1. If manifest invalid -> block launch and show why.
2. If mothership infection conditions pass -> `mothership_infection`.
3. If player cured + 3 unsuspecting/clean humans + no queen/egg/aliens ->
   `clean_escape`.
4. If player + queen + stable egg -> `full_brood` or obedient queen path.
5. If player + 3 alien allies + no queen -> `alien_exodus`.
6. If egg aboard without queen -> `carriers_bargain` or failed carrier.
7. If humans know infection -> `outed_escape`.
8. If mixed humans/aliens/queen -> `mixed_manifest`.
9. If nobody meaningful aboard -> `scorched_sky` or `empty_husk`.

## Code Implementation Plan

### Sprint A: Pure State Expansion

Files:

- `src/act2.js`
- `src/act2.test.js`

Add:

- Hive constants and normalizers.
- Humanity/infection/suspicion defaults.
- Network defaults.
- Manifest builder and validator.
- Pure ending picker tests for all new ending families.

Do not touch Three.js yet.

### Sprint B: Hive Site World Objects

Files:

- New `src/hiveSite.js`
- `src/threeGame.js`
- `src/hiveSite.test.js`

Build:

- Three persistent hive sites with positions like camps.
- Placeholder visuals using procedural geometry/colors.
- `setExtractionLevel()`, `setStatus()`, `setBond()`.
- Ambient alien character figures, similar to camp leaders.

### Sprint C: Act 1 Hive Mining

Files:

- `src/threeGame.js`
- `main.js`
- `style.css`

Build:

- Hive proximity prompt.
- Mining interaction.
- Rewards through `BankManager` or new hive resource store.
- Extraction consequences saved to `hives[].extractionLevel`.

### Sprint D: Humanity And Suspicion HUD

Files:

- `src/vitals.js`
- `src/threeGame.js`
- `main.js`
- `style.css`

Build:

- `player-humanity-changed` event.
- `player-suspicion-changed` event.
- HUD mode after `hive_awakened_tease`.
- Masking Serum and Tissue Stabilizer behavior.
- Suspicion increases near human camps if humanity/cover are low.

### Sprint E: Network Propagation

Files:

- `src/act2.js`
- `src/threeGame.js`
- Tests in `src/act2.test.js`

Build:

- Human relay links.
- Hive synapse links.
- Bridge/jam actions.
- `propagateOuting(campId)` reducer.
- Tests for linked and unlinked camp knowledge.

### Sprint F: Expanded Choice Modal

Files:

- `main.js`
- `src/threeGame.js`
- `style.css`

Build:

- Human choice modal shows suspicion and passenger state.
- Hive choice modal shows extraction wounds, bond, network state.
- Choices:
  - human recruit
  - warn
  - latent infect
  - turn
  - cull
  - rob
  - hive rescue
  - hive harvest
  - hive network
  - hive board

### Sprint G: Boarding Manifest Screen

Files:

- `main.js`
- `style.css`
- `src/threeGame.js`
- `src/act2.js`

Build:

- Before launch, show all eligible passengers.
- Enforce four seat capacity.
- Queen cost is two.
- Egg cost is one and requires stabilization.
- Explain why invalid manifests cannot launch.
- Commit manifest before `depart()`.

### Sprint H: Ending Text Cards First, Videos Later

Files:

- `src/act2.js`
- `main.js`
- `docs/ending-and-camp-assets-plan.md`

Build:

- Add ending IDs and dialogue lines.
- Map IDs to video names but allow missing assets to fall through.
- Use text cards for:
  - `mothership_infection`
  - `alien_exodus`
  - `outed_escape`
  - `failed_carrier`
  - `empty_husk`
  - `mixed_manifest`

## Asset Needs

Hive sites:

- `public/hive_suture_site.png`
- `public/hive_relay_site.png`
- `public/hive_carapace_site.png`

Alien character sprites:

- `public/alien_nahl_walk.png`
- `public/alien_vey_walk.png`
- `public/alien_rhun_walk.png`

HUD/UI:

- Humanity/Cover icon.
- Infection Load icon.
- Suspicion/Outed icon.
- Hive resource icons:
  - suture resin
  - neural filament
  - living chitin

Ending stills/videos later:

- `ending-mothershipinfection`
- `ending-alienexodus`
- `ending-outedescape`
- `ending-failedcarrier`
- `ending-emptyhusk`
- `ending-mixedmanifest`

## Verification Plan

Pure tests:

- Old `hb_act2_v1` saves migrate into v3 defaults safely.
- Hive statuses normalize safely.
- Humanity clamps to `0..100`.
- Suspicion clamps to `0..100`.
- Outing propagates only through linked human relays.
- Jammed relays stop outing propagation.
- Manifest capacity rejects invalid passenger sets.
- Queen + egg + player uses exactly four seats.
- Player + three humans uses exactly four seats.
- Player + three aliens uses exactly four seats.
- Mothership infection picker requires all three unsuspecting humans.
- Cure marks unstabilized alien allies `expired_by_cure`.

Gameplay smoke tests:

- Hive mining creates rewards and increases extraction level.
- Low humanity near a human camp raises suspicion.
- Masking Serum temporarily slows suspicion.
- Boarding modal prevents five-seat manifests.
- Missing ending video does not stall the game.

## Open Design Questions

- Does latent-infecting all three humans improve the mothership infection path,
  or does it make suspicion too likely?
- Can the ship ever be upgraded beyond four seats, or should four seats remain
  a hard narrative law?
- Does curing the player always kill alien allies, or only those not stabilized
  by their final quests?
- Can the queen force herself aboard if obedience is high and a valid manifest
  excludes her?
- Should hive resources live in `BankManager`, or should `Act2Manager` own them
  because they are story-state resources?
- Should O2 remain mechanically important in Act 2, or should humanity/cover
  become the main depletion pressure while O2 becomes background survival?

## Recommended First Cut

Start with pure systems, not visuals:

1. Add v3 state: hives, humanity, suspicion, networks, manifest.
2. Add pure reducers and tests.
3. Add manifest validation and ending picker tests.
4. Add simple hive world objects with procedural placeholders.
5. Add mining and suspicion loops.
6. Add boarding manifest UI.

That gets the story rules playable before the asset pass. The visuals can then
replace placeholder hives, aliens, HUD icons, and ending cards without changing
the state machine.
