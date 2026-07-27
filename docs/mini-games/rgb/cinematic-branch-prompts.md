# RGB Cinematic Branch and Video Prompt Book

## Purpose

Each chapter enters on a locked **first frame**, pauses at a player choice, then
plays one short branch video toward a distinct **end frame**. The end frame
becomes the first playable composition after the clip or the visual handoff to
the next chapter.

All clips use the Hunker Bunker 1280×800 logical stage. Generate at 16:10 with
no camera crop, UI, subtitles, logos, or watermark. `--bs 1` means one branch
sample in the intended video workflow.

## Choice alignment

| Gate | Player-facing choice | State changed | What it does not do |
| --- | --- | --- | --- |
| C1 | Answer Lucia / Enter now | message, time | Does not decide an ending |
| C2 | Leave error visible / Clear metric | evidence, scrutiny | Does not make 4A hostile |
| C3 | Document review / Comply quietly | evidence, pain/time | Does not decide Marisol’s fate |
| C4 | Record proof / Call Lucia / Give up | evidence, connection, retry | Cannot buy the medicine |
| C5 | Preserve / Expose / Sever | final route | This is the only ending-route choice |
| C6 | Recenter 4A / Miss the correction | survival or retry | Failure does not erase the run |

## Shared continuity block

Append this to every video prompt:

> Maintain the exact start-frame composition, character identity, clothing,
> prop placement, industrial architecture, high-contrast graphic realism, and
> screen-printed grain. Motion is restrained and physically credible. The
> world remains black, white, charcoal, and industrial gray; only functional
> digital red is colored until the fire route introduces ugly amber and
> orange. Exact 16:10 frame. No cuts to a new location, no dialogue text, no
> captions, no HUD, no interface overlay, no logo, no watermark, no extra
> characters, no morphing hands or machinery.

---

## C1 — The Parking Lot

**First frame:** `backgrounds/bg_sedan_interior.png`

### C1-A: Answer Lucia

**End frame:** `cinematics/c1/end_answer_lucia.png`

**State:** `heardFullMessage = true`, `timeBand += 1`

**Video prompt:**

> Endless. RGB WAREHOUSE. Tractor trailers idle in rows. Heat shimmer bends the
> asphalt. At the far edge of the lot sits a rusted sedan with one mismatched
> door. INT. ELIAS’S SEDAN — CONTINUOUS. Elias Morales, 40s, faded safety vest
> over worn flannel, sits exhausted in the driver’s seat. He raises the cracked
> phone and accepts Lucia’s voice message. The sharp red screen washes over his
> face. His expression barely changes, but his grip on the empty prescription
> bottle loosens. He unfolds the child’s robot drawing, listens to the entire
> message, then presses the paper flat against the calibration notebook. END
> FRAME: Elias still seated, phone held close to his ear, unfolded drawing
> visible, warehouse waiting beyond the windshield. Slow push-in, 7 seconds.
> --bs 1

### C1-B: Enter now

**End frame:** `cinematics/c1/end_enter_now.png`

**State:** `heardFullMessage = false`, no time cost

**Video prompt:**

> Endless. RGB WAREHOUSE. Tractor trailers idle in rows. Heat shimmer bends the
> asphalt. INT. ELIAS’S SEDAN — CONTINUOUS. Elias sees Lucia’s incoming message
> on the cracked red screen but does not play it. He locks the phone, folds the
> child’s drawing into the dog-eared calibration notebook, pockets the empty
> prescription bottle, and opens the driver door. Exterior glare cuts across
> the dark cabin. END FRAME: the driver seat is empty, door open toward the
> warehouse, notebook corner and red badge visible in Elias’s hand as he steps
> out of frame. Locked camera, 6 seconds. --bs 1

---

## C2 — Not Harder

**First frame:** `backgrounds/bg_warehouse_line_4a.png`

The calibration itself always succeeds. The choice concerns ownership of the
error record.

### C2-A: Leave the error visible

**End frame:** `cinematics/c2/end_honest_log.png`

**State:** `honestErrorLog = true`, evidence seed, scrutiny +1

**Video prompt:**

> INT. RGB WAREHOUSE — SHIFT. Robot 4A overgrips a crooked cardboard load.
> Elias places one hand at the maintenance joint and taps the chassis twice.
> Tap. Tap. The claw releases, shifts two inches, finds center, and performs a
> perfect sort. Elias refuses the terminal’s clear-error control. The red error
> trace remains beside the successful correction. He writes the sequence into
> his notebook while the machine’s optical sensor sweeps across him. END FRAME:
> centered box on the outbound belt, 4A open and still, notebook visible, red
> error history deliberately preserved on the terminal. Slow lateral conveyor
> motion, 8 seconds. --bs 1

### C2-B: Clear the metric

**End frame:** `cinematics/c2/end_clean_metric.png`

**State:** `honestErrorLog = false`, scrutiny -1

**Video prompt:**

> INT. RGB WAREHOUSE — SHIFT. Robot 4A overgrips a crooked cardboard load.
> Elias performs the practiced double tap. The claw releases and recenters. The
> box sorts perfectly. Elias looks toward the ceiling camera, then uses his
> scratched badge to clear the red variance trace from the terminal. The
> terminal settles to one clean red status lamp. He closes the notebook without
> recording the error. END FRAME: perfect box leaving frame, blank clean metric
> screen, Elias’s badge still against the reader, 4A waiting. Slow mechanical
> settle, 8 seconds. --bs 1

---

## C3 — Neutral Language

**First frame:** `backgrounds/bg_incident_review.png`

### C3-A: Document the review

**End frame:** `cinematics/c3/end_document_review.png`

**State:** add `camera_discrepancy`, `swab_photo`; keep notebook

**Video prompt:**

> INT. INCIDENT REVIEW ROOM — MOMENTS LATER. Elias sits injured beneath sterile
> fluorescent light. The HR representative freezes the laptop at the point of
> impact and begins closing it. Elias stops the lid with his good hand, demands
> the preceding two seconds, and photographs the screen beside the
> inconclusive swab reader. He pulls his calibration notebook back across the
> table before it can be retained. Beyond the safety glass, Marisol pauses but
> keeps moving. END FRAME: Elias’s cracked phone captures laptop, swab reader,
> and timestamp in one composition; notebook secured under his injured arm; HR
> hand frozen above the lid. Controlled push-in, 9 seconds. --bs 1

### C3-B: Comply quietly

**End frame:** `cinematics/c3/end_comply_review.png`

**State:** no review evidence; notebook surrendered; timeBand -1

**Video prompt:**

> INT. INCIDENT REVIEW ROOM — MOMENTS LATER. Elias presses a bloodied paper
> towel to his temple while the HR representative closes the laptop before he
> can see the preceding footage. Elias completes the swab and slides the
> calibration notebook across the table. The reader pulses red. HR seals the
> notebook in a clear evidence sleeve and returns the scratched temp badge.
> END FRAME: closed laptop, sealed notebook on the corporate side of the table,
> badge beneath Elias’s good hand, inconclusive reader glowing red between
> them. Static symmetrical camera, 8 seconds. --bs 1

---

## C4 — Three Inches

**First frame:** `backgrounds/bg_medi_kiosk.png`

### C4-A: Record proof

**End frame:** `cinematics/c4/end_record_kiosk.png`

**State:** add `kiosk_record`, `payroll_record`

**Video prompt:**

> EXT. AUTOMATED MEDICINE KIOSK — NIGHT. The dispenser arm places Lucia
> Morales’s white prescription bag in slot three, inches behind reinforced
> glass. The kiosk screen turns red and the card reader rejects payment. Elias
> holds his cracked phone so one continuous recording contains the medicine
> bag, denial screen, empty prescription bottle, and final-pay notice. The
> dispenser arm waits, then begins withdrawing the bag. END FRAME: Elias’s
> phone in foreground recording all four pieces of proof while the bag remains
> barely inside the slot and the red timeout ring nears completion. Slow rack
> focus from bag to phone, 8 seconds. --bs 1

### C4-B: Call Lucia

**End frame:** `cinematics/c4/end_call_lucia.png`

**State:** `luciaCallback = true`; no kiosk evidence

**Video prompt:**

> EXT. AUTOMATED MEDICINE KIOSK — NIGHT. The medicine bag waits behind glass.
> Elias stops trying payment options and answers Lucia’s call. He turns away
> from the red kiosk light so she cannot hear the machine. His injured shoulder
> drops; he forces his breathing steady and listens. Behind him the small arm
> returns the white bag to holding. END FRAME: Elias in dark profile with phone
> at his ear, empty bottle resting on the scanner tray, medicine bag receding
> into black machinery behind the glass. Very slow pull back, 9 seconds.
> --bs 1

### C4-C: Give up

**End frame:** `cinematics/c4/end_lockout.png`

**State:** retryable `lockout`

**Video prompt:**

> EXT. AUTOMATED MEDICINE KIOSK — NIGHT. Elias exhausts every payment prompt,
> lowers both hands, and confirms that he is finished. The red screen goes
> black. The small robotic arm removes Lucia’s white medicine bag from slot
> three and carries it into a dark holding rack. Elias leaves the empty bottle
> on cold steel and exits frame. END FRAME: abandoned bottle under a single red
> scanner lamp, empty pickup slot, Elias’s reflection disappearing from the
> glass. Locked camera, mechanical arm motion only, 7 seconds. --bs 1

---

## C5 — His Own Ghost

**First frame:** `backgrounds/bg_server_room.png`

This is the only gate that selects an ending route.

### C5-A: Preserve the profile

**End frame:** `cinematics/c5/end_preserve_profile.png`

**State:** `finalChoice = preserve` → System Loop

**Video prompt:**

> INT. RGB UTILITY SERVER ROOM — NIGHT. The central terminal shows Elias that
> Robot 4A still runs on his human calibration profile. Delete is denied. Elias
> lifts the insulated cutters, studies the primary data trunk, then slowly sets
> the tool back on the console. He closes the utility notebook and walks toward
> the exit without touching the cable. The server fans never change pitch. END
> FRAME: closed door after Elias leaves, cutters untouched in foreground,
> fiber-optic trunk pulsing red, terminal retaining the active profile. Static
> camera, 8 seconds. --bs 1

### C5-B: Expose the profile

**End frame:** `cinematics/c5/end_expose_profile.png`

**State:** `finalChoice = expose` → Open Hand if evidence gate passes

**Video prompt:**

> INT. RGB UTILITY SERVER ROOM — NIGHT. Delete is denied. Elias inserts his
> cracked phone’s cable into a maintenance port and opens the evidence captured
> during the shift. Red progress lamps travel from the training terminal into
> the phone, then split toward multiple network indicators before access is
> revoked. Elias pulls the cable free as the terminal locks. END FRAME: phone
> in Elias’s hand showing a completed mirrored transfer without readable text,
> multiple outbound red nodes lit across the racks, cutters left unused, exit
> clear. Precise restrained camera push, 9 seconds. --bs 1

### C5-C: Sever the trunk

**End frame:** `cinematics/c5/end_sever_trunk.png`

**State:** `finalChoice = sever` → Sector Four

**Video prompt:**

> INT. RGB UTILITY SERVER ROOM — NIGHT. Delete is denied. Elias braces his
> injured shoulder, places insulated cutters around the thick primary
> fiber-optic trunk, and squeezes. The trunk snaps with a concussive arc. Elias
> is thrown backward. White sparks fall onto dry cardboard beside an unsafe
> lithium-battery pallet. One battery begins to vent. END FRAME: severed cable
> recoiling in white sparks, cutters on the floor, first small amber flame at
> the cardboard edge, red server lamps dying in sequence. Fast physical action
> followed by a one-second hold, 7 seconds. --bs 1

---

## C6 — Recenter

**First frame:** `backgrounds/bg_sector_four.png`

### C6-A: Recenter 4A

**End frame:** `cinematics/c6/end_rescue.png`

**State:** Ashes & Survival

**Video prompt:**

> INT. SECTOR FOUR — CONTINUOUS. Fire invades the monochrome warehouse in ugly
> amber and orange. A collapsed rack pins Elias. Robot 4A breaks evacuation
> protocol, grips too near his leg, and makes the load worse. Elias reaches the
> cold chassis and taps twice. Tap. Tap. 4A freezes, releases, shifts two inches
> left, finds center, and lifts just enough. Elias drags himself free and grabs
> Lucia’s scorched drawing. The machine’s hydraulics rupture as the rack falls
> back onto it. END FRAME: Elias clear of the rack clutching the drawing, 4A
> crushed beneath steel with one fading red sensor, exit visible through smoke.
> One continuous low camera move, 10 seconds. --bs 1

### C6-B: Miss the correction

**End frame:** `cinematics/c6/end_crushed_retry.png`

**State:** retryable `crushed`

**Video prompt:**

> INT. SECTOR FOUR — CONTINUOUS. Robot 4A tries to lift the collapsed rack but
> grips at the wrong center. Elias reaches for the chassis and misses the second
> tap. LOAD INSTABILITY. The claw tightens; steel sinks instead of rising.
> Smoke swallows Elias and the machine while the lockdown light repeats red
> through black haze. Cut away before impact or death is shown. END FRAME:
> nearly black smoke field, faint silhouette of 4A frozen over the rack, one
> repeating red warning lamp, Lucia’s drawing still visible at the very bottom
> edge for the retry transition. Slow loss of visibility, 7 seconds. --bs 1

## Generation order

1. Lock character model sheets for Elias, HR, and Marisol.
2. Generate all end frames using the named chapter background as composition
   reference.
3. Reject any end frame that changes room geometry, prop identity, clothing, or
   Robot 4A’s design.
4. Generate each branch video from its exact start and end images plus the
   corresponding prompt.
5. Use the final held frame as the next gameplay plate or crossfade target.

