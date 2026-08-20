# Combat Feel & "Juice" Plan

Source: distilled from `docs/sprint25.checkin.md`'s AAA-polish and "where's
the hook" sections. This is presentation-layer work (VFX/audio/animation
timing) layered on combat systems that already exist — the doc's own framing
is that the mechanics exist and the open question is *comparative feel*, not
missing features. Most items here are asset/tuning iteration, not pure code;
treat this as a checklist to work through with playtesting, not a one-shot
implementation.

## The studio test (do this first, before any other item below)

Put the player in an empty gray box. No progression, no story, no loot. Just
character + weapon. Is moving, aiming, firing, reloading, sprinting, hitting
a target, and breaking something intrinsically satisfying for five minutes?
If not, nothing else on this list matters yet — fix recoil timing, muzzle
impulse, projectile readability, hit response, stagger, audio transient,
casing/eject effects, animation timing, death response, reload cadence,
crosshair communication, and low-ammo tension first.

## The Impact Stack (input → action → contact → consequence)

Each step must be visually, audibly, and physically distinct:

| Player event | Feedback |
|---|---|
| Fire weapon | animation + muzzle light + recoil + bass/transient |
| Projectile travel | tracer / readable trail |
| Hit flesh | sprite reaction + particle + specific impact sound |
| Hit armor | spark + different pitch + armor icon |
| Critical/weakpoint | stronger flash + pitch + reticle confirmation |
| Stagger | physical displacement / animation |
| Kill | silhouette pop + death sound + brief camera impulse |
| Elite kill | stronger VFX + audio sting |
| Boss damage | health-bar chunk animation + impact response |
| Boss phase break | full audiovisual punctuation |

Not everything needs bigger particles — sometimes the missing "juice" is
information density delivered through tiny feedback (a distinct pitch, a
one-frame flash) rather than a bigger explosion.

## Enemy reactions and weapon-category identity

Enemies absorbing damage without responding kills weapon feel. Target
progression per hit: flinch → stagger → lose armor → recoil → stumble →
knocked into geometry → ignite/freeze/corrode → visible low-health state →
die with momentum. Weapon categories should read differently on contact:
shotgun-like = push, heavy projectile = hard stagger, cryo = movement
collapse → fracture, energy = shield flash → overload, melee = directional
knockback. Not realistic physics — the goal is the player feeling "I did
that."

## Stagger / armor / weakpoint grammar (extend, don't reinvent)

`src/bossPhases.js` already implements this for the Queen (armor reduction,
add-control gates, phase transitions, weakpoint windows) — that's the
correct language, already built. The plan is to spread a lighter version to
ordinary elites and other bosses, not invent a second system. Three states
players should instantly read: **ARMOR** (shots spark/ricochet, reduced
damage) → **EXPOSED** (armor broken, vulnerable) → **WEAKPOINT** (high
payoff on accurate hits). Bosses: telegraph → survive mechanic → create
opening → punish weakpoint → phase transition.

## Enemy tactical identities (verbs, not health totals)

| Enemy | Question it asks |
|---|---|
| Rusher | Can you control distance? |
| Spitter | Can you leave cover? |
| Flanker | Are you watching your sides? |
| Burrower | Can you read environmental tells? |
| Shield | Can you reposition for angle? |
| Support | Can you prioritize targets? |
| Sniper | Can you break line-of-sight? |
| Swarm | Can you manage area control? |
| Leech | Can you protect oxygen? |
| Mimic | Do you trust what you're approaching? |

Encounter design becomes *combinations* of these verbs (shield + spitter +
flanker is genuinely different from any one alone) — cheaper and more
interesting than adding more enemy species with only stat differences.

## Movement feel (cheap, high-leverage)

Acceleration/deceleration instead of digital motion, slight turn lean,
velocity-dependent chassis animation, surface-specific footsteps, small
dust/snow/debris kicks, sprint camera displacement, class-differentiated
footstep weight/timing, collision reaction, low-O2 movement cadence, damage
limp / suit instability, landing/impact response. Target: a Tank should look
heavy crossing ten meters; a Scout should look like they're barely touching
the ground; an Engineer should look mechanically precise — through
animation, not just stat differences.

## Class signature actions (push harder than passive stat identity)

Current: Scout/EVASIVE, Tank/BULWARK, Engineer/AUTO-TURRET. Push toward
active verbs players remember: Scout = rapid burst movement / scanner
marking weakpoints and hidden rooms; Tank = shoulder charge / defensive
brace that physically interrupts enemies; Engineer = deployable turret /
temporary machinery hack that turns environment into weapon. Run upgrades
should mutate these abilities further, so a class becomes a player's
favorite because of how it *feels* by hour five, not because of a wiki stat
table.

## Loot ceremony (tiered, not one pickup animation)

- **Common resource** — magnetizes toward player, tiny tick sound, no
  interruption.
- **Useful item** — distinct beam/glow, short name card.
- **Rare relic** — unique sound heard *before* seeing it, vertical beacon,
  controller pulse, brief nearby lighting change.
- **Build-defining item** — world briefly quiets, item floats, name/title
  appears, one-sentence effect description, build HUD visibly changes.

Goal: players should recognize a rare-drop sound from another room.

## Room dramatic grammar (pacing, not more room types)

Every room implicitly reads as one of: TENSION, COMBAT, REWARD, CHOICE,
STORY, FACTION, PUZZLE, SETPIECE, BREATHER. The existing WFC system already
has room roles/material styles/props/encounter profiles — what's missing is
*sequencing* these roles into a dramatic arc (tension → combat → reward →
breath → mystery → danger) rather than combat → corridor → combat →
corridor.

## Doors as anticipation objects

Before opening: muffled enemy sounds, strange light leaking underneath,
scanner interference, blood trail, alien spores, alarm noise. On opening:
heavy mechanical animation, pressure hiss, camera vibration, lighting
reveal. A closed bulkhead should sometimes make the player hesitate — cheap,
diegetic suspense built into ordinary navigation rather than a cutscene.

## HUD-by-context (hide, don't declutter)

Minimal HUD at rest. Ammo becomes prominent when firing. Health intensifies
when injured. Oxygen moves into visual priority as it drops. Depth/reward
appears on ring crossing (ties to the Depth Contract in
`one-more-ring-design-pillars.md`). Navigation expands near objectives.
Loot layer appears on rare pickups, then fades back. This reads as
information density delivered *when it matters* rather than permanently
on-screen.

## Environmental interactions and secrets (cheap richness multipliers)

Shootable: lights, pipes, steam valves, fuel tanks, ice formations, support
cables, organic sacs, electrical boxes. Activatable: doors, cranes, fans,
pressure releases, security systems, old turrets — usable in combat, so
rooms become toys, not just geometry around enemies. Secrets (cracked walls,
suspicious lights, hidden crawlspaces, unmarked hive tunnels, alternate
extractions) reward exploration the game didn't explicitly command.

## Status

Presentation/tuning work, deliberately not attempted as code changes in this
pass — it needs iteration against real animation/VFX/audio assets and
playtesting, which is out of scope for an autonomous engineering pass to
fabricate wholesale. Use this doc as the checklist when that work is
scheduled. The one adjacent piece that *is* pure data/logic (and therefore
safe to build now) is the Depth Contract in
`one-more-ring-design-pillars.md`, which a sibling commit implements.
