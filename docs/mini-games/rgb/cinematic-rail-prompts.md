# RGB On-Rails Cinematic Prompt Book

## Purpose

These clips connect gameplay choice gates. They communicate unavoidable story
events, location changes, or consequences. They never present a false choice.

Every rail clip has:

- an existing source frame;
- a generated destination frame;
- a precise video prompt;
- a declared handoff into the next playable or choice state.

Generate at exact 16:10. Preserve character identity, clothing, room geometry,
Robot 4A’s industrial design, and prop continuity. No subtitles, UI, logos,
watermarks, invented signage, extra characters, or camera cuts unless stated.

## Rail map

```text
Archive boot
  → C1 sedan choice
  → R1 badge entry
  → C2 calibration choice
  → R2 collision
  → C3 HR choice
  → R3 coverage discharge
  → C4 kiosk choice
  → R4 utility-map discovery
  → R5 return to RGB
  → C5 final route choice
      ├─ preserve → R8 System Loop epilogue
      ├─ expose   → R9 Open Hand epilogue
      └─ sever    → R6 fire propagation
                       → R7 collapse
                       → C6 rescue choice
                       → Ashes epilogue
```

---

## R1 — Badge Entry

**Source:** either C1 end frame  
**Destination:** `cinematics/rails/r1_badge_entry.png`  
**Handoff:** Chapter 2 warehouse gameplay

**Video prompt:**

> EXT. RGB PARKING LOT TO EMPLOYEE INTAKE — CONTINUOUS. Elias crosses the last
> strip of heat-warped asphalt alone. Tractor trailers idle without drivers. A
> faded safety poster moves slightly against chain-link fence. Inside the cold
> vestibule, Elias joins no line; the previous shift has already disappeared
> through the turnstile. He holds his scratched TEMP CONTRACTOR badge against
> the reader. One sharp red light scans the card, pauses too long, then grants
> entry. The steel door unlocks inward and warehouse noise hits him all at once.
> END FRAME: Elias in profile at the open steel door, badge still against the
> red reader, black warehouse beyond. Slow tracking approach, 7 seconds.
> --bs 1

---

## R2 — Collision Event

**Source:** selected C2 end frame  
**Destination:** `cinematics/rails/r2_collision_aftermath.png`  
**Handoff:** Chapter 3 incident-review room

**Video prompt:**

> INT. RGB WAREHOUSE — LATER. Work resumes. A taped oversized box catches the
> conveyor guardrail and twists sideways. A red productivity counter begins.
> Elias braces his bad leg, reaches across the guardrail, and tears the tape
> free. The box lurches. Robot 4A breaks its marked path without a warning tone.
> Its armature strikes Elias’s shoulder and clips his temple. He hits steel
> racking, then concrete. His hard hat spins across the floor. 4A resets and
> sorts the same box perfectly while workers remain frozen in their assigned
> zones. END FRAME: Elias conscious on the concrete beneath 4A’s red scan,
> split hard hat in foreground, Marisol halted at a distant aisle, no gore.
> One locked wide shot; sudden impact, then long mechanical hold, 9 seconds.
> --bs 1

---

## R3 — Coverage Discharge

**Source:** selected C3 end frame  
**Destination:** `cinematics/rails/r3_coverage_discharge.png`  
**Handoff:** Chapter 4 kiosk exterior

**Video prompt:**

> INT. INCIDENT REVIEW ROOM — CONTINUOUS. The swab reader settles on
> inconclusive. The HR representative closes the laptop and slides Elias’s
> scratched badge back across the table. Elias’s cracked phone vibrates. Its red
> portal screen shows coverage ending at 6:42 PM, hours before the promised
> midnight cutoff. Elias reads it once. The fluorescent room remains perfectly
> still. He pockets the badge, stands with one arm held tight against his body,
> and exits through the warehouse without being offered medical care. END
> FRAME: Elias alone outside the employee door at blue-black night, red phone
> reflected in the glass, warehouse door locked behind him. Begin static in HR,
> dissolve only at the doorway, 8 seconds. --bs 1

---

## R4 — Utility Map

**Source:** C4-A or C4-B end frame  
**Destination:** `cinematics/rails/r4_utility_map.png`  
**Handoff:** return-to-RGB rail

**Video prompt:**

> EXT. AUTOMATED MEDICINE KIOSK — NIGHT. The white prescription bag disappears
> into holding. Elias steps away from the reinforced glass and opens his
> dog-eared calibration notebook beneath the parking-lot lamp. He turns past
> years of joint diagrams, grip angles, and taped labels. At the back he finds a
> hand-drawn utility route connecting an exterior service door to the local
> training backup and server room. His empty prescription bottle remains on the
> kiosk tray behind him. END FRAME: close three-quarter view of Elias holding
> the open utility-map spread, distant RGB warehouse visible across the desert,
> phone and kiosk red lights aligned behind him. Slow push from kiosk reflection
> to notebook, 7 seconds. --bs 1

---

## R5 — Return to RGB

**Source:** `cinematics/rails/r4_utility_map.png`  
**Destination:** `cinematics/rails/r5_utility_return.png`  
**Handoff:** Chapter 5 server room choice

**Video prompt:**

> EXT. RGB WAREHOUSE — NIGHT. Elias’s rusted sedan crosses the empty access road
> without headlights for the final stretch. He parks beyond the employee lot
> and walks along the blank outer wall, injured shoulder rigid, calibration
> notebook open to the utility map. Security drones sweep the main entrance,
> never turning toward the drainage corridor. Elias uses his scratched badge on
> a recessed service reader; it flashes denied. He opens the panel and bridges
> two maintenance contacts using the notebook diagram. The service door releases
> with no alarm. END FRAME: narrow utility door open into a red-lit server
> passage, Elias silhouetted at threshold with notebook and insulated cutters.
> Wide lateral night tracking shot, 9 seconds. --bs 1

---

## R6 — Fire Propagation

**Source:** `cinematics/c5/end_sever_trunk.png`  
**Destination:** `cinematics/rails/r6_fire_propagation.png`  
**Handoff:** Sector Four collapse rail

**Video prompt:**

> INT. RGB SERVER ROOM TO WAREHOUSE — CONTINUOUS. The first amber flame reaches
> a lithium scanner battery. It vents, ruptures, and throws fire across dry
> cardboard stacked against the server rack. Elias pulls a wall extinguisher,
> but a second battery jet crosses the ceiling and defeats the spray. Server
> lights die in red rows. Elias abandons the extinguisher and forces the exit.
> Fire follows through the cable tray above him faster than he can run. END
> FRAME: Elias limping into Sector Four beneath overhead cable fire, server door
> behind him swallowed in amber, distant blast doors beginning to lower.
> Continuous handheld-follow feeling without camera shake, 8 seconds. --bs 1

---

## R7 — The Collapse

**Source:** `cinematics/rails/r6_fire_propagation.png`  
**Destination:** `cinematics/rails/r7_pinned_before_rescue.png`  
**Handoff:** C6 rescue prompt

**Video prompt:**

> INT. SECTOR FOUR — CONTINUOUS. Elias runs through thickening smoke and pulls a
> manual fire alarm. Its small red display orders him to wait. The descending
> blast door is visible at the far aisle. Heat bends a loaded steel rack above
> him. The frame groans, twists, and collapses before he clears it. Elias dives,
> but steel and boxes pin his legs and lower torso. Lucia’s folded drawing slips
> from his vest and lands just beyond his fingers. He reaches once and cannot
> touch it. Through the smoke, Robot 4A’s red sensor appears and stops. END
> FRAME: Elias pinned but conscious, drawing out of reach, 4A at the edge of the
> haze under a conflicting evacuation light. Low camera follows the drawing,
> then holds, 9 seconds. --bs 1

---

## R8 — System Loop Epilogue

**Source:** `cinematics/c5/end_preserve_profile.png`  
**Destination:** `cinematics/rails/r8_system_loop.png`  
**Handoff:** ending card

**Video prompt:**

> INT. RGB WAREHOUSE — NEXT SHIFT. Flat monochrome returns with no amber or
> violet. Robot 4A repeats Elias’s gentle correction on an irregular box: release,
> shift two inches, recenter, perfect sort. At an employment kiosk across town,
> Elias receives a new temp badge and a lower-rate assignment while his empty
> prescription bottle sits beside the scanner. The two machines perform their
> motions in visual rhythm, neither acknowledging him. END FRAME: split-depth
> composition with 4A sorting in the distant warehouse and Elias seated under
> cold kiosk light in foreground reflection, new blank badge in hand, no
> readable text. Slow mechanical cross-dissolve, 10 seconds. --bs 1

---

## R9 — Open Hand Epilogue

**Source:** `cinematics/c5/end_expose_profile.png`  
**Destination:** `cinematics/rails/r9_open_hand.png`  
**Handoff:** ending card

**Video prompt:**

> EXT. AUTOMATED MEDICINE KIOSK — PRE-DAWN. Copies of Elias’s evidence move
> through multiple phones and public mirrors as abstract red transfer nodes.
> Emergency crews enter RGB because the suppressed collision alert is now
> visible. Marisol waits beside Elias at the kiosk without giving up her phone.
> A mutual-aid authorization reaches the dispenser. The small arm places Lucia’s
> white bag into slot three and the lock releases. Elias takes the bag with both
> care and disbelief. The scratched dinosaur sticker on the empty bottle gains
> the story’s first muted violet, never bright or triumphant. END FRAME: Elias
> holding the medicine bag, Marisol beside rather than behind him, violet
> dinosaur sticker in foreground, warehouse small in pale dawn distance.
> Restrained cross-location montage ending in a locked two-shot, 11 seconds.
> --bs 1

## Existing Ashes epilogue

The fire route already has
`backgrounds/bg_desert_epilogue_ashes.png`. Use it after C6-A:

> EXT. DESERT NIGHT — LATER. Elias reaches the dirt beside his rusted sedan and
> sits facing the burning warehouse. Sirens remain distant. He opens his hand:
> Lucia’s drawing is scorched but the robot with shoes remains visible. His
> cracked phone plays her message from the dirt. He is alive, not triumphant.
> END FRAME: preserve the supplied Ashes epilogue composition. Slow pull back,
> 10 seconds. --bs 1

