# Generated Audio Provenance

The WAV files under `public/audio/generated/` are original procedural assets
generated for Hunker Bunker by `scripts/generate-plan-sfx.js`.

- No third-party recordings, sample packs, models, or copyrighted melodies
  are used.
- The generator uses elementary oscillators, deterministic seeded noise, and
  amplitude envelopes written in this repository.
- Regenerate with `npm run audio:plan-sfx`.
- Verify checked-in files byte-for-byte with
  `npm run audio:plan-sfx:check`.

The set closes the plan-listed camp audio gaps:

| Runtime key | Purpose |
| --- | --- |
| `camp_worker_alerted` | short attention/data chirp |
| `camp_worker_armed` | latch and low warning pulse |
| `camp_worker_panicked` | unstable rising alarm |
| `camp_worker_fleeing` | hurried impacts and air rush |
| `camp_worker_infected` | slow biomorphic wobble |
| `camp_verb_meridian` | short route-intelligence data burst |
| `camp_verb_tallow` | organic treatment and rising heal chime |
| `camp_verb_vesper` | mechanical reload, lock, and metal clang |

