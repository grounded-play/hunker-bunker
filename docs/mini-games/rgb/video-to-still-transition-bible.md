# RGB Video-to-Still Transition Bible

## Purpose

This is the production map for turning RGB into one continuous chain of short
videos, held still frames, player actions, branch clips, and chapter handoffs.

Every transition follows:

```text
SOURCE FRAME
  → PLAYER ACTION OR AUTOMATIC TRIGGER
  → VIDEO ACTION
  → LANDING FRAME (hold)
  → NEXT PLAYER CHOICE
```

Use this as the edit-decision list. Use `cinematic-branch-prompts.md` and
`cinematic-rail-prompts.md` for the longer existing prompts.
`src/minigames/rgb/content.js` remains the authority for gates and state.

## Global production rules

- Canvas: exact 1280×800, 16:10.
- A clip's first frame must match its named source image.
- Its final frame must match its destination PNG closely enough to dissolve
  into the held PNG without a visible jump.
- Keep identity, clothing, injuries, props, 4A, architecture, lighting, and
  screen direction continuous.
- Inspect clips: 2–4 seconds. Branch and rail clips: 6–11 seconds.
- Hold every landing frame for at least 12 frames before showing controls.
- Never bake dialogue, subtitles, HUD, hotspots, or choices into video.
- Functional red is the only saturated color until the fire route adds amber
  and orange. Muted violet appears only where already specified.
- Inspection clips return to their chapter anchor unless otherwise stated.
- Lock a branch as soon as its clip starts. Never return to the pre-choice
  still after a branch video.

## Transition types

| Type | Meaning | Default ending |
| --- | --- | --- |
| `INSPECT-IN` | Chapter background moves into a detail still | Hold detail PNG |
| `INSPECT-OUT` | Detail still returns to playable scene | Hold chapter anchor |
| `ACTION` | Player performs a physical/interface action | Hold result detail |
| `BRANCH` | Choice changes state or route | Continue into named rail/ending |
| `RAIL` | Unavoidable connective story event | Enter next chapter still |
| `RETRY` | Failure returns to a decision point | Restore named still |

## Master route

```text
Intro → C1 sedan stills → [Answer Lucia | Enter Now] → R1
  → C2 calibration stills → [Honest Log | Clean Metric] → R2
  → C3 review/evidence stills → [Documented | Quiet] → R3
  → C4 kiosk stills → [Give Up → Lockout | Utility Map → R4 → R5]
  → C5 server stills
      ├─ Preserve → R8 → System Loop
      ├─ Expose → R9 → Open Hand
      └─ Sever → R6 → R7 → C6 rescue
                     ├─ Recenter → Ashes & Survival
                     └─ Wrong Grip → Crushed → Retry Rescue
```

---

# Chapter 1 — The Descent

**Playable anchor:** `backgrounds/bg_sedan_interior.png`

| ID | Source → landing frame | Trigger and video action | Next |
| --- | --- | --- | --- |
| `C1-01` | anchor → `interstitials/c1/inspect_albuterol.png` | Select `inspect_bottle`. Camera drops to Elias lifting the bottle; red glow catches the peeling label. | Hold detail; **Take Bottle**. |
| `C1-02` | bottle → anchor | Confirm pickup. His hand lowers and pockets the bottle as camera returns to the car. | `check_balance`. |
| `C1-03` | anchor → `interstitials/c1/check_phone.png` | Select `check_balance`. Elias wakes the cracked phone; `$19.12` resolves through glare. | Hold detail; **Keep Phone**. |
| `C1-04` | phone → same still | Select `listen_voicemail`. A waveform begins; Elias's thumb stops moving. | Play Lucia's message. |
| `C1-05` | phone → `interstitials/c1/inspect_drawing_notebook.png` | Select `inspect_drawing`. Phone lowers as the drawing opens over the notebook; red sneakers appear. | Hold detail; pickup. |
| `C1-06` | drawing → `interstitials/c1/img_c1_marisol_intake.png` | Select `speak_with_marisol`. Outside the fence she looks back: “You look like hell, Eli.” He answers, “That's my good side.” She checks the daycare deadline. | Set `noticedMarisolPressure`; reveal Lucia/clock branch. |
| `C1-07A` | Marisol → `cinematics/c1/end_answer_lucia.png` | Choose `reply_to_lucia`. Elias raises the phone, listens fully, and smooths the drawing. | `R1`; Lucia heard, time +1. |
| `C1-07B` | Marisol → `cinematics/c1/end_enter_now.png` | Choose `enter_now`. Elias locks the phone, folds the drawing into the notebook, and opens the door. | `R1`; no time cost. |
| `R1` | selected end → `cinematics/rails/r1_badge_entry.png` | Cross the lot. Optional Marisol insert: `img_c1_marisol_intake.png`. Finish with `img_c1_badge_turnstile.png` and the steel door opening. | Chapter 2. |

**Match cut:** red reader becomes the red sensor in
`backgrounds/bg_warehouse_line_4a.png`.

---

# Chapter 2 — Not Harder

**Playable anchor:** `backgrounds/bg_warehouse_line_4a.png`

| ID | Source → landing frame | Trigger and video action | Next |
| --- | --- | --- | --- |
| `C2-01` | anchor → `interstitials/c2/observe_4a_crush.png` | Select `observe_4a`. 4A closes; cardboard bows, tears, and sheds dust. | Hold crushed-box detail. |
| `C2-02` | detail → anchor | Back out. Claw remains closed as camera returns to full line. | `read_diagram`. |
| `C2-03` | anchor → `interstitials/c2/img_c2_notebook_diagram.png` | Select `read_diagram`. Elias opens the book; rack focus from real joint to sketch. | Hold notebook. |
| `C2-04` | notebook → `interstitials/c2/img_c2_joint_focus.png` | Select `select_joint`. Match drawn pivot to Joint 3; fingers find two pressure points. | Hold joint macro. |
| `C2-05` | joint → `interstitials/c2/calibrate_joint.png` | Select `apply_pressure`. Light pressure slows chatter; claw opens two inches. | Truth branch. |
| `C2-06` | calibration → `interstitials/c2/img_c2_sensor_sweep.png` | Select `observe_sensor_sweep`. 4A's optical beam crosses Elias's face, pauses, and records the gentle pressure source. Elias leaves one hand resting on the joint. | Hold recognition still; truth branch. |
| `C2-07A` | sensor sweep → `cinematics/c2/end_honest_log.png` | `double_tap_honest`: Tap. Tap. 4A recenters; Elias records and preserves the miss. | `R2`; trust 2. |
| `C2-07B` | sensor sweep → `img_c2_terminal_metric_wipe.png` → `cinematics/c2/end_clean_metric.png` | `double_tap_falsify`: clean sort, then badge wipes error trace. | `R2`; trust 1. |
| `R2` | selected end → `img_c3_collision_impact.png` → `cinematics/rails/r2_collision_aftermath.png` | Work resumes; box catches; 4A breaks its arc. Use impact still as a brief freeze, then continue to Elias on floor. | Chapter 3. |

---

# Chapter 3 — Neutral Language

**Playable anchor:** `backgrounds/bg_incident_review_v2.png`

| ID | Source → landing frame | Trigger and video action | Next |
| --- | --- | --- | --- |
| `C3-01` | anchor → `interstitials/c3/missing_footage.png` | `demand_footage`: HR scrubs to impact; cursor jumps over the missing two seconds. | Add discrepancy. |
| `C3-02` | footage → anchor | `challenge_neutral_language`: Elias leans forward; HR closes scrub controls, not laptop. | Swab. |
| `C3-03` | anchor → `img_c3_swab_reader.png` | `complete_swab`: swab enters reader; red line hesitates, then stays ambiguous. | Hold reader. |
| `C3-04` | reader → `img_c3_phone_snap_evidence.png` | `photograph_result`: phone frames laptop and reader; shutter pulse. | Add swab photo. |
| `C3-05` | phone → `img_c3_hr_hand_reach.png` | `inspect_notebook_review`: HR's hand slides toward book while Elias still touches it. | Notebook branch. |
| `C3-06A` | reach → anchor | `keep_notebook`: Elias pulls it under his injured arm. | Marisol beat. |
| `C3-06B` | reach → anchor | `surrender_notebook`: Elias releases; HR pulls and sleeves it. | Marisol beat. |
| `C3-07` | anchor → `interstitials/c3/marisol_waiting.png` | `call_marisol`: focus through glass to Marisol checking time. | Witness branch. |
| `C3-08A` | Marisol → anchor | `request_marisol_witness`: she sits outside; phone timer continues. | Exit available. |
| `C3-08B` | Marisol → anchor | `release_marisol_from_request`: Elias waves her off; she leaves reluctantly. | Exit available. |
| `C3-09A` | anchor → `cinematics/c3/end_document_review.png` | `proceed_to_kiosk` with footage, swab photo, or retained book. Consolidate preserved evidence. | `R3`. |
| `C3-09B` | anchor → `cinematics/c3/end_comply_review.png` | Exit without preserved review evidence. Laptop closes; retained material stays with HR. | `R3`. |
| `R3` | selected end → `cinematics/rails/r3_coverage_discharge.png` | Badge returned; phone reports early termination; injured Elias exits without care. | Chapter 4. |

---

# Chapter 4 — Three Inches

**Playable anchor:** `backgrounds/bg_medi_kiosk.png`

| ID | Source → landing frame | Trigger and video action | Next |
| --- | --- | --- | --- |
| `C4-01` | anchor → `interstitials/c4/coverage_denied.png` | `scan_bottle`: scanner wakes red; bag moves into locked slot; coverage denied. | Paycheck. |
| `C4-02` | denial → `img_c4_paycheck_stub.png` | `view_paycheck`: interface expands into deductions while Elias reflects in glass. | Attempts/bag. |
| `C4-03` | paycheck → `interstitials/c4/img_c4_partial_pay_denied.png` | `deposit_partial_pay`: Elias offers the entire $14.00 paycheck. Kiosk rejects partial payment and leaves $272.40 due while Lucia's bag remains visible. | Billing agent. |
| `C4-04` | partial denial → denial/queue | `request_billing_agent`: long queue appears while short session timer drains. | Call HR. |
| `C4-05` | queue → `interstitials/c4/call_lucia.png` | `call_hr`: automated denial ends call; kiosk and bag remain behind him. | Continue. |
| `C4-06` | anchor → `img_c4_medicine_bag_3inch.png` | `document_bag`: move through Elias's hand to bag behind reinforced glass. | Request bag. |
| `C4-07` | bag → denial | `ask_kiosk_release`: Elias presses release; latch stays shut; arm twitches back. | Call Lucia. |
| `C4-08` | anchor → `interstitials/c4/call_lucia.png` | `call_lucia`: Elias turns from red kiosk and steadies breathing before speaking. | Exit branch. |
| `C4-09A` | call → `cinematics/c4/end_lockout.png` | `give_up`: confirm exit; screen blackens; bag retreats. | Lockout; retry C4. |
| `C4-09B` | call → `img_c4_utility_map_spread.png` | `follow_utility_map`: open back cover; finger traces red pencil route. | C4-A/B then R4. |
| `C4-A` | map sequence → `cinematics/c4/end_record_kiosk.png` | With proof, phone records bag, denial, bottle, and pay result together. | `R4`. |
| `C4-B` | map sequence → `cinematics/c4/end_call_lucia.png` | If callback is defining state without kiosk proof, bag recedes behind Elias on call. | `R4`. |
| `R4` | selected end → `cinematics/rails/r4_utility_map.png` | Bag disappears; Elias confirms conduit route beneath parking lamp. | `R5`. |
| `R5` | map rail → `cinematics/rails/r5_utility_return.png` | Return to RGB; bridge service reader; open red-lit utility door. | Chapter 5. |

---

# Chapter 5 — His Own Ghost

**Playable anchor:** `backgrounds/bg_server_room.png`

| ID | Source → landing frame | Trigger and video action | Next |
| --- | --- | --- | --- |
| `C5-01` | anchor → `interstitials/c5/training_profile.png` | `read_terminal`: reveal Elias as 4A's active calibration source. | Delete. |
| `C5-02` | profile → `interstitials/c5/terminal_decision.png` | `attempt_delete`: confirm delete; terminal slams into red admin lock. | Batteries. |
| `C5-03` | lock → `img_c5_battery_pallet.png` | `inspect_battery_pallet`: flashlight crosses cells, cardboard, and cable with no clearance. | Route choice. |
| `C5-04` | batteries → `interstitials/c5/img_c5_expired_extinguisher.png` | `inspect_extinguisher`: flashlight finds an empty pressure gauge, split hose, and inspection tag expired two years. Elias turns the tag in his hand. | Hold negligence evidence; route choice. |
| `C5-05A` | extinguisher → `cinematics/c5/end_preserve_profile.png` | `walk_away`: lift cutters, decide against them, set down, leave profile intact. | `R8` → System Loop. |
| `C5-05B` | extinguisher → `cinematics/c5/end_expose_profile.png` | `expose_profile`: phone enters maintenance port; evidence races token expiry. | `R9` → Open Hand. |
| `C5-05C` | extinguisher → `img_c5_wire_cutter_trunk.png` | `inspect_cutters`: take cutters and position around trunk. This is preparation, not the cut. | **Take Cutters**. |
| `C5-06C` | cutters → `cinematics/c5/end_sever_trunk.png` | `sever_trunk`: handles close, cable parts, arc reaches unsafe pallet. | `R6`. |
| `R8` | preserve → `cinematics/rails/r8_system_loop.png` | Next shift: 4A repeats correction while Elias gets another temp assignment. | Ending card. |
| `R9` | expose → `cinematics/rails/r9_open_hand.png` | Evidence propagates; mutual aid unlocks medicine; Marisol stands beside Elias. | Ending card. |
| `R6` | sever → `cinematics/rails/r6_fire_propagation.png` | Cardboard ignites; lithium cell vents; fire outruns extinguisher. | `R7`. |
| `R7` | fire → `img_c6_fire_alarm_pull.png` → `cinematics/rails/r7_pinned_before_rescue.png` | Pull alarm, run beneath blast door, then rack collapses and pins Elias. | Chapter 6. |

---

# Chapter 6 — Recenter

**Playable anchor:** `cinematics/rails/r7_pinned_before_rescue.png`

| ID | Source → landing frame | Trigger and video action | Next |
| --- | --- | --- | --- |
| `C6-01` | anchor → `img_c6_fire_alarm_pull.png` | `assess_lockdown`: brief alarm insert; contradictory lockdown light; smoke thickens. | Return pinned. |
| `C6-02` | anchor → `interstitials/c6/reach_drawing.png` | `reach_drawing`: hand drags through ash but stops short; focus finds drawn joint. | Rescue input. |
| `C6-03A` | drawing → `recenter_rescue.png` → `cinematics/c6/end_rescue.png` | Strong trust: `rescue_recenter`. Tap correct point twice; 4A shifts two inches and lifts. | `R10` sacrifice. |
| `C6-03B1` | drawing → `recenter_rescue.png` | Weak trust: `rescue_recenter_weak`. First double tap makes 4A hunt and grip short. | **Again. Tap. Tap.** |
| `C6-03B2` | uncertain grip → `cinematics/c6/end_rescue.png` | `rescue_recenter_again`: Elias holds joint, taps twice; 4A corrects and lifts. | `R10` sacrifice. |
| `C6-03C` | drawing → `cinematics/c6/end_crushed_retry.png` | `rescue_fumble`: grab chassis; 4A grips wrong center and rack drops. | Crushed. |
| `C6-RETRY` | crushed → `interstitials/c6/reach_drawing.png` | **Retry Rescue**: smoke fade restores pinned state immediately before 4A enters. | Rescue input only. |
| `R10` | rescue end → `interstitials/c6/img_c6_4a_destruction.png` | 4A holds the rack while Elias crawls free and reaches Lucia's drawing. Hydraulic lines rupture, the red sensor flickers, and the arm fails only after Elias clears the load. Hold on 4A under the weight. | Ashes epilogue. |
| `EP-A` | destruction → `backgrounds/bg_desert_epilogue_ashes.png` | Elias limps beyond perimeter at dawn with scorched drawing; sirens distant. | Ashes ending card. |

---

# Branch convergence

| Branch | Diverges at | Rejoins at |
| --- | --- | --- |
| Answer Lucia / Enter Now | `C1-07` | `R1` |
| Honest Log / Clean Metric | `C2-07` | `R2` |
| Keep / Surrender Notebook | `C3-06` | Marisol/exit |
| Ask / Release Marisol | `C3-08` | `proceed_to_kiosk` |
| Documented / Quiet Review | `C3-09` | `R3` |
| Kiosk proof / Lucia emphasis | C4 evidence state | `R4` |
| Give Up | `C4-08A` | Only after Chapter 4 retry |
| Preserve / Expose / Sever | `C5-05` | Never; selects ending route |
| Strong / Weak recenter | `C6-03` | Successful rescue end |
| Failed rescue | `C6-03C` | Rescue input after retry |

# New transition video filenames

```text
public/minigames/rgb/cinematics/transitions/
  C1-01_bottle_inspect.mp4
  C1-02_bottle_return.mp4
  C1-03_phone_balance.mp4
  ...
  C6-RETRY_restore_rescue.mp4
```

Keep these IDs stable. If one transition needs two shots, suffix `_a` and `_b`;
do not renumber later transitions.

# Per-clip generation template

```text
CLIP ID:
SOURCE IMAGE:
DESTINATION IMAGE:
DURATION:

Begin from the source image with exact identity, pose, wardrobe, prop
placement, lighting, lens, architecture, and screen direction.

ACTION:
[Only the physical motion required to reach the destination.]

CAMERA:
[Locked / slow push / rack focus / restrained track.]

END CONDITION:
Match the destination image and hold the final composition for 12 frames.

Exact 16:10. High-contrast graphic realism with screen-printed grain.
Black, charcoal, gray, and functional red only, except the fire route.
No subtitles, HUD, captions, logo, watermark, extra characters, morphing
hands, changing wardrobe, changing machine design, or unrequested camera cut.
```

# Runtime integration target

Add transition metadata beside each cutaway:

```js
cutaway: {
    image: `${INTERSTITIALS}/c2/img_c2_joint_focus.png`,
    video: `${CINEMATIC_BASE}/transitions/C2-04_joint_focus.mp4`,
    returnVideo: `${CINEMATIC_BASE}/transitions/C2-04_joint_return.mp4`,
    label: 'PIVOT OFFSET // TWO INCHES'
}
```

Playback order:

1. Disable input.
2. Play transition video from current held frame.
3. Hold destination PNG.
4. Show dialogue and pickup/choice controls.
5. On close, play `returnVideo`, or cross-fade to the chapter anchor.
6. Re-enable only newly available hotspots.

## Current-runtime gaps to resolve before final video integration

These are implementation observations, not changes to the desired story map:

1. `activateHotspot()` clears `activeCutaway` immediately when an advancing
   hotspot has a cinematic sequence. A preparation still such as the utility
   map or terminal wipe therefore will not be held before that branch video
   without an explicit transition-video step.
2. `C3-B` is effectively unreachable in the current chapter order:
   `demand_footage` is mandatory and always adds `camera_discrepancy`, while
   `proceed_to_kiosk` treats that evidence as the documented branch.
3. `C4-B` is effectively unreachable in the current chapter order:
   `scan_bottle` is mandatory and always adds `kiosk_record`, while the
   resolver selects the Lucia-only branch only when that record is absent.
4. `img_c1_marisol_intake.png`, `img_c1_badge_turnstile.png`, and
   `img_c3_collision_impact.png` are currently production inserts rather than
   directly mapped playable hotspot cutaways. Their intended positions are R1
   and R2 as defined above.
5. The runtime currently supports one held `cutaway.image`, but not
   `cutaway.video` or `returnVideo`. Implement the metadata and playback order
   above before producing the complete inspect-in/inspect-out clip set.

Decide whether C3-B and C4-B should become reachable state branches or remain
unused alternates before commissioning their replacement videos.
