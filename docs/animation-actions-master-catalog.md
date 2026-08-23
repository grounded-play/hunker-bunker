# Animation Actions Master Catalog & Character Rig Access Guide

This document catalogs all accessible 3D animation actions available in the repository across Mixamo rigs, character classes, NPCs, and boss creatures.

---

## 1. Tactical Combat & Weapons Actions

*Source Pack: `art/source/mixamo/scout/animations/Basic Shooter Pack` & `Pistol_Handgun Locomotion Pack`*

| Action ID / Clip Name | Type | Description |
|---|:---:|---|
| `firing rifle` / `fire` | One-Shot | Primary weapon discharge with upper-body muzzle recoil impulse |
| `reloading` / `reload` | One-Shot | Tactical magazine ejection, fresh insertion, and bolt chambering |
| `toss grenade` | One-Shot | Overhead grenade throw with left-hand arm extension |
| `hit reaction` / `hit` | One-Shot | Kinetic flinch / stagger impact reaction |
| `rifle aiming idle` | Blendable | Two-handed rifle stance tracking aim reticle |
| `rifle run` / `rifle jump` | Locomotion | Forward sprint & vault while maintaining high-ready rifle grip |
| `strafe left` / `strafe right` | Blendable | Tactical lateral slide steps with weapon leveled |
| `pistol idle` / `pistol run` | Blendable | Compact one-handed / two-handed sidearm handling |
| `pistol kneel to stand` | Transition | Tactical crouch transition |

---

## 2. Stealth, Parkour & Cover Movement Actions

*Source Pack: `art/source/mixamo/scout/animations/Action Adventure Pack`*

| Action ID / Clip Name | Type | Description |
|---|:---:|---|
| `stand to cover` / `cover to stand` | Transition | Dropping against a low barricade or wall and popping back up |
| `left cover sneak` / `right cover sneak`| Blendable | Back-to-wall lateral shuffle along bunker barricades |
| `crouched sneaking left` / `right` | Blendable | Low-profile stealth crawl in combat zones |
| `jumping up` / `jump` | One-Shot | Upward launch with knee tuck |
| `falling idle` / `fall` | Loop | Mid-air suspension for elevation drops and pit falls |
| `falling to roll` | One-Shot | High-velocity landing with dynamic roll recovery |
| `hard landing` / `land` | One-Shot | Heavy impact absorption with knee bend and hand brace |
| `run to stop` | Transition | High-speed braking deceleration with foot plant |

---

## 3. Dialogue & Expressive Personality Gestures

*Source Pack: `art/source/mixamo/scout/animations/Gestures Pack Basic`*

All gestures retarget cleanly onto Scout, Tank, Engineer, and Camp NPCs:

| Gesture Clip Name | Emotion / Tone | Recommended Dialogue Moment |
|---|:---:|---|
| `weight shift` | Neutral / Idling | Routine camp idle, relaxed conversation |
| `head nod yes` | Agreement | Accepting quests, confirming extraction orders |
| `hard head nod` | Resolute / Stern | Military briefing confirmation (Briggs) |
| `lengthy head nod` | Thoughtful / Slow | Reflecting on ancient lore / hive signals (Dr. Nahl) |
| `shaking head no` | Disagreement | Rejecting trade deals, warning of infection danger |
| `thoughtful head shake` | Puzzled / Analyzing | Inspecting broken machinery / schematics (Kaelen) |
| `look away gesture` | Hesitation / Guilt | Revealing tragic backstory, acknowledging losses |
| `relieved sigh` | Relief / Respite | Reaching a safe bunker room, clearing a wave |
| `being cocky` | Confidence / Swagger | Victorious boss kill, claiming rare loot |
| `happy hand gesture` | Joy / Warmth | Friendly reunion at camp fire (Martha) |
| `dismissing gesture` | Dismissal / Impatience | Ending dialogue, brush-off |
| `angry gesture` | Rage / Confrontation | Hostile faction confrontation, betrayal alert |
| `annoyed head shake` | Frustration | Jammed weapon, out of ammo, low O2 |
| `sarcastic head nod` | Cynical / Irony | Dark humor dialogue choices |

---

## 4. Character Signature & Boss Stunt Actions

*Source: `art/source/new3d/` & `public/3d/runtime/new3ds/`*

| Character / Rig | Action / Animation | Description |
|---|---|---|
| **Cryo-Vanguard Scout** | `Strut Walking` | Confident, fluid athletic catwalk gait |
| **Sub-Terran Drill Engineer** | `Opening Rig` | Unfolding back servo arms and calibrating welding tip |
| **Trench Warden / Briggs** | `Beckoning` | Hand gesture waving operatives forward into the breach |
| **Overseer Kaelen** | `Standing Greeting` | Machine-cult formal salutation |
| **Mother Martha** | `Dismissing Gesture` | Maternal hand wave directing survivors to the hearth |
| **Dr. Nahl** | `Rummaging` | Inspecting specimen vials and biological samples |
| **Val** | `Pointing Forward` | Directing attention to generator malfunction / breach point |
| **Aria** | `Floating Trance` | Weightless levitation with pulsing silk conduits |
| **Queen-00** | `Awareness Look-Around`| Eerie, predatory scan with six-arm flare |
| **Corrupted Sister Martha** | `Hip Hop Dancing / Spore Bloom`| Uncanny, hypnotic fungal combat dance |
| **Corrupted Commander Briggs** | `Run To Stop / Juggernaut Charge`| Terrifying heavy rush and seismic ground slam |

---

## 5. Injured & Low-Health Locomotion States

*Source Pack: `art/source/mixamo/scout/animations/Male Injured Pack`*

Triggered automatically when player or NPC HP falls below critical threshold (`< 25% HP`):

| Action Name | Movement Mode | Visual Presentation |
|---|:---:|---|
| `injured idle` / `hurting idle` | Idle | Clutching wounded side/ribs with heavy panting |
| `injured stumble idle` | Idle | Unstable footing, swaying |
| `injured walk` / `injured walk left/right` | Walk | Heavy limp favoring wounded leg |
| `injured run` / `injured run jump` | Run | Desperate limping sprint |
| `injured wave idle` | Idle | Calling for rescue / medical revival |

---

## 6. Creature & Hive Beast Actions

*Source Pack: `art/source/mixamo/scout/animations/Creature Pack`*

Applicable to Bio-Stalkers, Parasites, and Mutated Enemies:

| Action Name | Type | Description |
|---|:---:|---|
| `mutant roaring` | One-Shot | Enrage / combat roar triggering stagger resistance |
| `mutant swiping` | Attack | Heavy claw slash attack |
| `mutant jump attack` | Attack | Pounce leaping strike |
| `mutant flexing muscles` | Stunt | Intimidation / armor hardening stance |
| `mutant dying` | Death | Dramatic collapse and death rattle |
