# Engineering Deep Dive: Act 2 State Schema & Humanity

## The Persistence Layer
Hunker Bunker tracks narrative progression via localStorage (to be migrated fully to SQLite for server-side verification). The core Act 2 state is managed in `src/act2.js` under the key `hb_act2_v1`.

## The Schema (Version 3)
To support the complex 4-seat manifest and the dual faction system, the `hb_act2_v1` state object must be expanded in Sprint 22 to include the following schema:

```javascript
{
    version: 3,
    
    // Core Progress
    begun: false,
    departed: false,
    
    // Queen & Brood
    queenObedience: 0,
    queenStatus: 'aboard', // aboard | rejected | killed | abandoned
    eggsStatus: 'aboard',  // aboard | destroyed | abandoned | hidden
    
    // Player Cover & Infection
    humanity: 100,          // 0..100, visible human control
    infectionLoad: 0,       // 0..100, viral strength
    infectionStage: 'latent', // latent | strained | symptomatic | outed | cured
    coverIntegrity: 100,    // 0..100, how convincing the player appears
    outedToHumans: false,
    
    // Factions
    camps: [],              // State of Meridian, Tallow, Vesper
    hives: [                // State of Suture, Relay, Carapace
        {
            id: 'hive_suture',
            status: 'dormant', // dormant | mined | wounded | bonded | aboard
            extractionLevel: 0,
            bond: 0
        }
    ],

    // The Escape Vessel Puzzle
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

## The Logic Solvers
Sprint 22 requires implementing the mathematical solvers that process this schema upon vessel launch.
- `pickAct2Ending()`: Must read `manifest.seatsUsed`. If `seatsUsed > seatsMax`, the launch must be blocked with an error toast: `MANIFEST FULL. SOMEONE MUST BE LEFT BEHIND.`
- Depending on the composition of `manifest.humans` and `manifest.queen`, the solver maps the output to the 5 distinct ending webm files.
