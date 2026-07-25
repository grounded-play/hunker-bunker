# Scene Flow

The nine cinematic scenes in the rough script become six playable chapters.
The parking lot and car form one scene; collision and HR form a paired chapter;
the server breach, fire, rescue, and desert epilogue form the final two.

## Flow at a glance

```text
Parking Lot
  → Warehouse Calibration
  → Collision + Incident Review
  → Medi-Kiosk
  → Return / Server Room Choice
      ├─ walk away or preserve profile → System Loop
      ├─ expose with sufficient evidence → Open Hand
      └─ sever trunk → Sector 4 Fire
                           ├─ failed rescue input → Crushed (retry)
                           └─ calibrated 4A rescue → Ashes & Survival
```

## Chapter 1: Parking Lot and Intake

**Goal:** Enter the shift with Elias’s problem, tools, and deadline understood.

**Required beats**

1. Inspect the empty albuterol bottle.
2. Compare the $286.40 refill with the $19.12 balance.
3. Listen to Lucia’s voice message.
4. Inspect the drawing and calibration notebook.
5. Badge into the warehouse.

**Optional choices**

- Reply to Lucia now, costing a time band but preserving the full voice message.
- Speak with Marisol and notice her daycare deadline.
- Inspect the safety poster and security drone for later evidence context.

**Carry-forward:** `heard_full_message`, `noticed_marisol_pressure`,
`late_to_shift`.

## Chapter 2: Warehouse Calibration

**Goal:** Teach 4A to release and recenter an irregular load.

The player uses the notebook diagram to select a joint, applies light pressure,
then performs the double tap. Wrong attempts deform the box and increase the
metric counter but give readable feedback. Three failed attempts enable an
optional guided overlay.

**Optional choice:** Falsify a perfect metric or leave the error visible.
Leaving it visible strengthens later evidence but increases immediate scrutiny.

**Carry-forward:** `calibration_quality` from 0–2, `honest_error_log`,
`trust_4a`.

## Chapter 3: Collision and Incident Review

**Goal:** Preserve evidence while the review process tries to redefine events.

The collision is inevitable; player response determines pain severity. This is
not presented as a dodge that makes the workplace safe.

In HR, the player can:

- demand the preceding two seconds of footage;
- keep or surrender the notebook;
- complete the compulsory swab;
- ask Marisol to stay, knowing her daycare fee has begun;
- photograph the “inconclusive” result before the laptop closes.

Calling Marisol is not a simple good choice. If Elias noticed her pressure, he
can release her from the request without losing trust. Otherwise she stays and
takes a financial penalty.

**Carry-forward:** `pain`, `camera_discrepancy`, `kept_notebook`,
`swab_photo`, `marisol_witness`, `marisol_harmed`.

## Chapter 4: Medi-Kiosk

**Goal:** Exhaust legitimate paths and decide what Elias will do with the
remaining time.

The player scans the bottle, sees coverage terminated at 6:42 PM, and learns
the final paycheck is $14.00. Available actions include requesting a billing
agent, placing a partial payment, calling HR, calling Lucia, or documenting the
bag behind glass.

No combination can buy the medicine tonight. The puzzle is informational:
assemble enough proof to expose the linked system or accept that only direct
sabotage remains.

The medication must never disappear because the player idled in a menu. The
transaction times out only after an explicit set of attempts.

**Carry-forward:** `kiosk_record`, `payroll_record`, `lucia_callback`,
`billing_case`.

## Chapter 5: Server Room

**Goal:** Decide what to do with the training profile.

The utility map in the notebook returns Elias to RGB. At the terminal he learns
that the company kept his calibration as 4A’s active training model.

Available resolutions:

- **Walk away / preserve:** Leave the profile intact and exit.
- **Expose:** If the player has enough independent evidence, copy and transmit
  the record before the access token expires.
- **Sever:** Use insulated cutters on the primary data trunk after deletion is
  denied.

The fire is an unintended consequence of the sever action, caused by a
noncompliant battery pallet beside the trunk. Elias does not enter intending
mass harm.

## Chapter 6: Sector 4 and Epilogue

**Goal:** Escape the collapse using the lesson taught to 4A.

The player pulls the fire alarm, crosses a short focus path, and is pinned by a
collapsed rack. 4A initially grips at the wrong point. The rescue interaction
recalls the same joint, pressure, and double-tap language used in Chapter 2.

- Strong calibration gives generous timing and an audio cue.
- Weak calibration still permits success but requires one additional recenter.
- Accessibility mode removes timing.

Success reaches **Ashes & Survival**. Failure shows **Crushed**, then offers
`RETRY RESCUE`, `LOAD CHAPTER`, or `EXIT SIMULATION`.

## Hint ladder

Each puzzle has three authored hints:

1. Elias identifies the relevant observation.
2. The inventory or notebook highlights the relevant clue.
3. The required hotspot and action are shown directly.

Hints have no effect on endings or completion rewards.

