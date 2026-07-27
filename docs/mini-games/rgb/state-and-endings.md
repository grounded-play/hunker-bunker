# State, Endings, and Failure

## Minimal run state

```js
{
  checkpoint: 'parking_lot',
  timeBand: 0,
  pain: 'stable',
  inventory: [],
  evidence: [],
  flags: {
    heardFullMessage: false,
    noticedMarisolPressure: false,
    honestErrorLog: false,
    keptNotebook: false,
    marisolWitness: false,
    marisolHarmed: false,
    luciaCallback: false
  },
  calibrationQuality: 0,
  trust4A: 0,
  finalChoice: null
}
```

`timeBand` is an authored pressure track, not wall-clock time:

- `0`: on time
- `1`: productivity penalty
- `2`: reduced HR options
- `3`: billing agent unavailable

It may close optional evidence routes but may not silently kill Lucia or remove
all endings.

## Evidence

Each item must come from a distinct interaction:

- `camera_discrepancy`
- `swab_photo`
- `payroll_record`
- `kiosk_record`
- `training_profile`

The expose route requires `training_profile` plus any three other records.
Marisol’s witness statement can substitute for one record only if asking her
did not ignore the daycare pressure.

## Outcomes

### Ending A: The System Loop

**Trigger:** Choose to walk away or preserve the profile.

Elias remains separated from RGB; the company retains his training data. A
later employment portal message offers him a lower-paid temp reassignment.
Lucia’s refill remains unresolved. The final image returns to flat monochrome
and 4A continues to sort with Elias’s gentle correction.

This is an ending, not a game over. The player made an intelligible choice to
avoid further immediate harm.

### Ending B: Ashes & Survival

**Trigger:** Sever the data trunk and complete the 4A rescue.

The nearby battery staging violates storage rules; the arc ignites it and the
facility burns. 4A recalls the correction, lifts the rack, and is destroyed.
Elias escapes with Lucia’s scorched drawing as sirens approach. He is alive,
but the medicine and tomorrow remain unresolved.

This is the most visually dramatic ending, not a triumphant “best” ending.

### Ending C: Open Hand

**Trigger:** Copy the training profile and transmit it with sufficient evidence.

The terminal locks Elias out, but not before the archive reaches Marisol, a
labor reporter, and a public mirror. Emergency responders arrive because the
facility’s suppressed collision alert is exposed. A mutual-aid pharmacy
voucher covers Lucia’s refill; the final image introduces muted violet in her
dinosaur sticker rather than the fire’s orange.

The result offers solidarity rather than a fantasy lawsuit jackpot. Marisol’s
closing state changes if Elias made her absorb the daycare cost.

## Retryable game overs

### Crushed

**Trigger:** Fail the rack-rescue interaction.

The lockdown announcement loops as smoke overtakes the scene. The presentation
cuts away before graphic death. Retry begins immediately before 4A enters.

### Lockout

**Trigger:** At the kiosk, explicitly abandon every help/documentation option
and confirm `GIVE UP`.

The bag returns to holding and Lucia’s unanswered message plays. Retry begins
at the kiosk’s first prompt.

This outcome replaces the rough draft’s “insolvency” game over. Being poor is
not player failure; deliberately ending the interaction is.

## Completion tracking

Persist only:

- endings seen;
- game overs seen;
- highest evidence count;
- completion time if desired;
- current checkpoint.

Do not rank endings as good/bad or award a higher score for the fire.

