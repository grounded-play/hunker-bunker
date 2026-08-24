Called tool
Called tool
Called tool

Yes. I think this is the better direction.

Hunker Bunker has accumulated a surprising amount of feature depth—Steam systems, multiplayer, economy, progression, narrative systems, procedural world tech, bosses, classes, audio, achievements, etc. The next jump is not “add another system.”

It is:

Make every minute of the existing game feel deliberate, responsive, readable, stable and expensive.

There isn't an official “AAA standard.” What players perceive as AAA is mostly consistency: controls always work, menus behave predictably, animation communicates state, audio sells impacts, frametimes are stable, accessibility/settings are comprehensive, saves are trustworthy, multiplayer recovers gracefully, and very little exposes the machinery underneath.

Your current code already has master/music/VFX/voice mixing, keyboard rebinding, controller-glyph infrastructure, crosshair customization and a Deck-first 16:10 presentation layer. So there is a solid foundation.

Where I think Hunker Bunker sits today
Area Modern polished-game expectation Hunker
Core systems/content Lots to discover and master 🟢 Strong
Steam integration Native-feeling platform support 🟡 Rapidly improving
Multiplayer fundamentals Real synchronized play 🟡/🟢 Recent huge improvement
Combat feel Every shot/movement/action feels great 🟠
Performance/frame pacing Essentially invisible to player 🔴
UI consistency One coherent interaction language 🟠
PC graphics/settings Comprehensive configurability 🔴/🟠
Accessibility Broad options from first boot 🔴
Onboarding Understand game without friction 🟠
Save/recovery Never fear losing progress 🟠
Art consistency Everything looks intentionally from one game 🟠
Audio production Reactive, positional, readable 🟠
Localization International-ready architecture 🔴
Telemetry/crash recovery Production observability 🟠

The biggest issue is not graphics fidelity.

It's that Hunker sometimes appears to have AAA complexity with prototype edges.

Your own earlier teardown captured this well: combat risked becoming walking backward and shooting; minor events took over the screen; information competed for attention; bosses could become HP walls; and game-feel feedback wasn't matching the amount of systems underneath. Some individual observations in that July document are now stale because the game has evolved, but the larger diagnosis remains useful.

The AAA-style work I would prioritize
Performance becomes sacred. The recently merged multiplayer work still documents recurring 60–200 ms stalls and an observed ~6-second main-thread freeze. That destroys the perception of quality faster than almost anything else. I would establish frame budgets, move heavy world/chunk work off the critical frame where possible, pool allocations/VFX aggressively, prewarm assets/shaders, eliminate traversal hitches, and test 1%/0.1% lows rather than celebrating average FPS. Steam's Deck baseline is only 30 FPS at 800p for Verified; our own quality target should be significantly smoother than simply passing that minimum.
Make combat the showcase system. Shooting should have recoil impulse, muzzle flash, strong layered SFX, impact differentiation, enemy reaction, death response, hit confirmation, directional damage feedback and controller feedback. Reloading should have animation/audio tension. Enemies need recognizable combat roles—rusher, ranged pressure, flanker, suppressor, tank, support—not merely different HP totals. Bosses should be encounter designs with telegraphs, phase transitions, positional challenges and exploitable openings. Your July internal teardown already identified combat as the likely review-score bottleneck.
Build a real PC options suite. I would expect Display Mode, resolution, render scale, VSync, frame cap including uncapped, quality presets, shadows, effects, lighting, texture/model quality where applicable, brightness/gamma, camera shake, camera zoom/FOV-equivalent, UI scale, mouse sensitivity, controller sensitivity, stick deadzones, inversion, vibration strength and reset-to-default. Ultrawide and high-refresh behavior should be intentional rather than accidental. Steam expects controller glyphs to follow the active device, allows mixed mouse/keyboard/controller input, and expects controller text-entry to summon an appropriate keyboard.
Treat accessibility as a core feature set, not a later patch. Steam now exposes accessibility support directly on store pages and lets players search by those features. Xbox's current guidelines cover text readability, contrast, captions, audio, remapping, difficulty, UI navigation/focus, motion, photosensitivity and communication accessibility. I would add scalable text/UI, complete subtitles with speaker identification, captions for critical non-speech cues, color-independent enemy/item/objective information, color-vision presets, reduced shake/flashes/motion, hold/toggle choices, controller deadzones, aim assistance, difficulty assists and high-contrast interactables. I couldn't find clear current implementations for subtitles/captions, text scaling, reduced motion or colorblind modes in the current repo searches.
Fix the information architecture. AAA UI usually feels boringly predictable in the best way. One style for notifications. One style for critical warnings. One objective hierarchy. One interaction prompt. One modal grammar. One focus behavior. One back button. Your previous UX audit found numerous notification mechanisms competing for space and even gameplay alerts taking over battlefield visibility. I would establish an explicit hierarchy: ambient toast → objective update → urgent HUD warning → blocking decision modal. Full-screen interruption should be extremely rare.
Make first-hour teaching invisible. Get the player controlling the character quickly. Teach movement while moving, shooting while shooting, interaction at the first interactable, oxygen when it actually matters, crafting when it becomes useful. Explain what persists on death immediately after the first death. Don't front-load seven systems because seven systems exist. The goal should be that a new player can answer: Where am I going? Why? What can kill me? What do I keep? What do I want next?
Make save/recovery bulletproof. This is underrated AAA polish. Autosave at meaningful boundaries, atomic writes, corrupted-save fallback, previous-save backup, clear save indicator, Steam Cloud conflict strategy and session recovery. Steam Cloud is designed to transparently move saves between machines. For multiplayer, reconnect should restore identity/state rather than feel like rejoining from scratch. Losing an hour of progression once can create a negative review immediately.
Finish social multiplayer UX, not only networking. Steam lobby → invite → join friend → ready → play → reconnect → results → rematch should feel like one continuous flow. Add ping/connection-quality indication, AFK handling, host migration, mute/block/report, text communication or contextual ping wheel, party persistence and useful failure messages. Players shouldn't see “socket,” “relay,” “auth ticket,” “fallback,” or technical language unless they're in diagnostics.
Unify the art production rules. Hunker has a distinctive identity; protect it. Lock palette, pixel density, sprite scale, animation cadence, lighting rules, material response, UI typography, VFX shapes and color semantics. Your older teardown explicitly identified scenes where the 3D environment and differently styled generated assets could read as two games composited together. AAA polish often comes less from higher-resolution art than from never breaking the visual contract.
Add localization architecture now. I couldn't find an obvious localization/i18n system in current repo search. Do not leave hundreds of English strings embedded throughout JS/HTML if Steam release is the goal. Externalize strings, support font fallback and variable text lengths, and design UI for 30–50% expansion. Even if you only ship English initially, this prevents a painful rewrite.
One thing I would change strategically

I would pause expansion of the Steam marketplace/season/economy for a little while.

Not abandon it. The infrastructure is valuable.

But players will forgive:

“This game doesn't have enough skins yet.”

They will not forgive:

“It freezes.”

“Controller navigation is weird.”

“I can't read the text.”

“I can't turn off the camera shake.”

“The boss is just a damage sponge.”

“I died and don't know what I lost.”

“My friend disconnected and the match broke.”

“There are five things flashing at me.”

That distinction is where I'd spend engineering time now.

The quality bar I'd set
Metric Target
Normal gameplay frame hitches >50 ms Essentially zero
Multi-second stalls Zero
Death → retry/control <5–10 sec
Second-run boot → control <30 sec
Mouse-required controller screens Zero
Unrebindable gameplay actions Zero
Critical spoken dialogue without subtitles Zero
Critical information conveyed by color alone Zero
Full-screen interruptions during combat Zero
Multiplayer disconnect causing lost identity/match Zero
Unexplained player death Zero
Bosses whose primary identity is “more HP” Zero

I think the next major initiative should therefore be less like Sprint 26: add X and more like:

HUNKER BUNKER — AAA PLAYER EXPERIENCE PASS

Take the game exactly as it exists and make the first 30 minutes, combat loop, UI, controls, accessibility, performance, death/retry loop, multiplayer recovery and presentation meet a commercial premium-PC quality bar before adding another major feature.

That could be the most valuable development phase you've done yet, because the amount of game is increasingly not the limiting factor. How expensive, trustworthy and satisfying that game feels is.

expanding deeply on all this site fixes and other features we need, the game seems to miss the juice still in many ways where is that hook
Called tool
Called tool

Yes. Looking at Hunker Bunker as a game, rather than as a Steam integration project, I think the central problem is this:

There is more game underneath Hunker Bunker than the player currently feels in their hands.

The repo has consequence memory, camps and hives, classes, oxygen pressure, procedural topology, a run director, bosses, narrative state, Steam systems, multiplayer, progression and a manifest/endgame structure. The internal design review already identified the danger accurately: the project can become a sophisticated state machine whose depth is understood by the code more strongly than it is experienced by the player.

So I would make the next design phase about HOOK → FEEL → PAYOFF, in that order.

The actual Hunker Bunker hook

I think the hook should become:

ONE MORE RING

You are running out of oxygen.
You have enough salvage to go home.
The next ring is more dangerous.
But something valuable, strange, or consequential is just beyond the next bulkhead.

Do you turn back—or go deeper?

That is enormously stronger than “procedural isometric shooter.”

And your current systems already support it.

The regional world has explicit rings, gates, progression, authored landmarks and seeded topology. Oxygen is already a fundamental combat/travel pressure. Classes already behave differently, and the combat economy is explicitly built around damage, ammo, oxygen and positioning. The world already remembers faction decisions and feeds them into eventual consequences.

What is missing is making deeper = more exciting every single time.

Right now oxygen can feel like a timer.

It needs to feel like the price of greed.

That means the player's brain should constantly be doing:

I should leave.

...but that door is glowing purple.

...and I haven't found the camp.

...and my scanner just picked up something huge.

...and the reward multiplier is x2.4.

...fuck it. One more room.

That is the roguelike hook I would build the rest of the game around.

1. Make depth visibly increase reward AND danger

The player should feel the transition between rings dramatically.

Not just:

RING 3

but:

RING III // PRESSURE CRITICAL // 2.1× SALVAGE

Crossing a major bulkhead should trigger a short ritual:

door slams behind you → bass hit → lights change → suit warning → environmental tone changes → reward multiplier ticks upward → new enemy pool becomes possible.

Then deeper rings change:

Going deeper increases Going deeper threatens
salvage quality oxygen
rare relic chance enemy density
Steam-drop opportunities elite mutations
lore rarity route complexity
unusual rooms escape distance
faction encounters director aggression
build-changing relics environmental hazards
boss rewards death-loss exposure

Now the environment itself creates anticipation.

Your world generator is already technically sophisticated enough. The current open question in its own design documentation is whether those valid generated worlds actually create readable routes and memorable spaces.

That's exactly where to focus.

2. Hunker Bunker needs a run-build system that can become ridiculous

This may be the largest missing roguelike hook.

Persistent skill trees are useful.

Cosmetics are useful.

Weapon progression is useful.

But a strong roguelike gives me moments where I say:

“Holy shit, look what my build is doing this run.”

Every expedition should create a build that can become meaningfully different.

Not:

+4% damage

but choices like:

CRYO BREACH
Frozen enemies explode and freeze nearby targets.

LAST BREATH
Below 20% O2, weapon damage doubles.

SCRAP CYCLER
Reloading consumes 3 salvage and fires a radial shrapnel blast.

PARASITIC MAGAZINE
Kills refill the magazine but permanently reduce maximum O2.

HIVE SYMBIOSIS
Alien enemies may become neutral. Human camps distrust you.

BLACK BOX PROTOCOL
Carrying a Black Box periodically reveals hidden rooms but attracts Hunters.

ENGINEER // REPLICATION ERROR
Your turret copies your currently equipped weapon.

TANK // IMPACT CORE
Sprint collisions become knockdowns.

SCOUT // GHOST SIGNAL
Sprint leaves a decoy target behind.

Those aren't bonuses.

They create stories.

Then you suddenly have:

“I had this insane low-O2 cryo build and we barely killed the Queen.”

That is Twitch clips. Reddit posts. Build guides. Steam discussions.

That's retention that a battle pass cannot manufacture.

3. Give players a meaningful choice every 2–4 minutes

Your own game-wide review has a fantastic rule:

What decision is the player making right now?

I'd make that a formal game-design metric.

Every few minutes there should be something like:

ROUTE

Safe maintenance tunnel
vs.
Corrupted laboratory with rare relic chance.

RESOURCE

Use oxygen canister now
vs.
carry it deeper.

BUILD

Choose one relic.

STORY

Help the camp
vs.
steal their generator.

TACTICAL

Fight elite guarding cache
vs.
avoid it.

EXTRACTION

Return with 420 salvage
vs.
push deeper for the x1.8 modifier.

The director already exists and reasons about health, safety, depth, faction state and elapsed time; it can spawn pressure actions and apex threats.

Now it should increasingly act like a story generator rather than merely an enemy-event scheduler.

4. Combat needs about five layers more feedback

The combat documentation correctly says the question is no longer whether the mechanics exist—the question is comparative feel.

I'd build a standardized Impact Stack.

Player event Feedback
Fire weapon animation + muzzle light + recoil + bass/transient
Projectile travel tracer / readable trail
Hit flesh sprite reaction + particle + specific impact sound
Hit armor spark + different pitch + armor icon
Critical/weakpoint stronger flash + pitch + reticle confirmation
Stagger physical displacement / animation
Kill silhouette pop + death sound + brief camera impulse
Elite kill stronger VFX + audio sting
Boss damage health-bar chunk animation + impact response
Boss phase break full audiovisual punctuation

The important principle is:

Input → action → contact → consequence

Each must be visually, audibly and physically different.

Not everything needs giant particles.

Sometimes the missing “juice” is information density delivered through tiny feedback.

5. Give enemies physical reactions

An enemy absorbing bullets without responding destroys weapon feel.

Enemies should:

flinch → stagger → lose armor → recoil → stumble → get knocked into geometry → ignite/freeze/corrode → visibly enter low-health state → die with momentum.

And weapon categories should affect them differently.

Shotgun-like impact?

Push.

Heavy projectile?

Hard stagger.

Cryo?

Movement collapse → fracture.

Energy?

Shield flash → overload.

Melee?

Directional knockback.

The goal isn't realistic physics.

It's making the player feel:

I did that.

6. Ordinary enemies need tactical identities

The Director documentation says one of its goals is breaking the dominant backpedal-and-fire rhythm.

That's critical.

Build enemy roles around forcing different player responses.

Enemy Question it asks
Rusher Can you control distance?
Spitter Can you leave cover?
Flanker Are you watching your sides?
Burrower Can you read environmental tells?
Shield Can you reposition for angle?
Support Can you prioritize targets?
Sniper Can you break line-of-sight?
Swarm Can you manage area control?
Leech Can you protect oxygen?
Mimic Do you trust what you're approaching?

Then combinations become encounters.

A shield enemy isn't incredibly interesting.

Shield + spitter + flanker can be.

That's how you produce tactical complexity without needing fifty enemy species.

7. Introduce a proper stagger / armor / weakpoint grammar

This would do enormous work for combat readability.

Players should instantly understand three states:

ARMOR

Shots ricochet/spark. Damage reduced.

EXPOSED

Armor broken. Enemy vulnerable.

WEAKPOINT

High payoff if hit accurately.

Bosses can then be built around:

telegraph → survive mechanic → create opening → punish weakpoint → phase transition.

Your Queen already has armor reduction, add-control gates, phase transitions and weakpoint windows.

That's the right language.

Spread a lighter version throughout elites and other bosses.

8. Every boss needs a memorable sentence

A player should be able to describe each boss without mentioning its HP.

Bad:

“The big ice snail with more health.”

Good:

“The one where you have to hide behind frozen pillars when it screams.”

“The one that tunnels beneath you and collapses the arena.”

“The one where we had to shoot the vents to expose its heart.”

“The Queen where the whole arena starts getting consumed.”

The Queen already has a framework capable of phases.

Bring the others toward mechanic identity, not just statistical identity.

9. Make movement feel expensive

Movement is one of the cheapest places to create quality.

Your classes already have universal sprint and different passive identities.

Add layers like:

acceleration/deceleration rather than digital motion
slight turn lean
velocity-dependent chassis animation
surface-specific footsteps
small dust/snow/debris kicks
sprint camera displacement
heavy vs light footstep timing by class
collision reaction
low-O2 movement cadence
damage limp or suit instability
landing/impact response

Tank shouldn't merely have different numbers.

A Tank should look heavy crossing the same ten meters.

Scout should look like they're barely touching the ground.

Engineer should look mechanically precise.

10. Every class should have an “I chose this class because…” button

Passive stat identities are good.

But players remember verbs.

The current class structure is Scout/EVASIVE, Tank/BULWARK and Engineer/AUTO-TURRET.

I would push signature actives harder:

Scout

Rapid burst movement / scanner marking.

Can mark weakpoints and hidden rooms.

Tank

Shoulder charge / defensive brace.

Physically interrupts enemies.

Engineer

Deployable turret / temporary machinery hack.

Can turn environment into weapon.

And then run upgrades mutate those abilities.

By hour five, the player should have a favorite class because of how it feels, not because a wiki says it has 15% better regeneration.

11. Loot desperately needs ceremony

A generic pickup cannot carry the psychological load of a roguelike reward.

Establish tiers.

Common resource

Magnetizes toward player.

Tiny tick sound.

No interruption.

Useful item

Distinct beam/glow.

Short name card.

Rare relic

Unique sound heard before seeing it.

Vertical beacon.

Controller pulse.

Brief nearby lighting change.

Build-defining item

World briefly quiets.

Item floats.

Name/title appears.

Its effect is described in one brutal sentence.

Then the player's build HUD visibly changes.

Players should recognize a rare-drop sound from another room.

That Pavlovian relationship is incredibly valuable.

12. Give rooms a dramatic grammar

Procedural generation alone doesn't create discovery.

Each room should implicitly be one of:

TENSION

You hear something before entering.

COMBAT

Arena composition matters.

REWARD

A visually inviting safe pocket.

CHOICE

Two meaningful exits/resources.

STORY

Environmental narrative.

FACTION

Human/alien social space.

PUZZLE

Interactable machinery.

SETPIECE

Unusual authored event.

BREATHER

No threat. Let atmosphere work.

Your WFC already has room roles, material styles, props and encounter profiles.

What matters now is pacing the sequence.

Tension → combat → reward → breath → mystery → danger.

Not combat → corridor → combat → corridor → combat.

13. Doors should create anticipation

This sounds small.

It isn't.

A closed bulkhead is one of your game's best potential dramatic objects.

Before opening:

muffled enemy sounds
strange light leaking underneath
scanner interference
blood trail
alien spores
alarm noise

Then:

heavy mechanical animation
pressure hiss
camera vibration
lighting reveal

The player should sometimes hesitate before opening a door.

That's free suspense built directly into navigation.

14. Make the world visibly remember

The repo identifies consequence memory as one of the strongest existing pillars.

Don't hide that in state variables.

If I help a camp:

next visit has more lights
new barricades
NPCs acknowledge me
new equipment appears
music improves
someone I saved is physically there

If I exploit them:

empty beds
damaged generator
graffiti about me
guards track me
shops change
radio conversations change

If a hive is injured:

its geometry changes.

If it trusts me:

creatures stop attacking nearby.

If I betray it:

the surrounding biome becomes hostile.

Consequences should be scenery.

That is much more powerful than TRUST +10.

15. Use the Mothership as the game's narrator/director

You already have a sophisticated LineDirector that chooses commentary based on real depth, danger, objective and narrative context rather than random lines.

That can become part of Hunker Bunker's identity.

The Mothership should react when you:

push dangerously low O2
return rich
return empty
abandon someone
kill something rare
ignore an order
discover a horrifying room
nearly die
change allegiance
carry forbidden cargo
repeat the same mistake

And importantly:

sometimes say nothing.

The current audio architecture already supports context/tension states, music, SFX, world and voice mixing, while the project has 43 soundtrack sources but deliberately uses authored cues rather than dumping everything into random rotation.

That's a great base for a highly authored reactive soundscape.

16. Build dynamic music in layers, not playlists

A run should musically evolve:

SAFE SHIP
↓
EXPLORATION BED
↓
DISTANT THREAT PERCUSSION
↓
ENEMY CONTACT
↓
ELITE LAYER
↓
LOW O2 PULSE
↓
ESCAPE
↓
SHIP DOOR SLAMS
↓
MUSIC RELEASE

Don't just switch songs.

Use stems, percussion overlays, filters and transitions where practical.

The player won't say:

“Excellent adaptive mixing.”

They'll say:

“The game gets fucking intense when you're trying to get home.”

That's juice.

17. The return to the ship should be a ritual

This could become one of Hunker Bunker's signature moments.

Imagine:

you're at 6% O2
being chased
carrying rare salvage
alarms screaming
music escalating
you cross the ship threshold

THUNK.

Door closes.

Exterior sound disappears.

Music collapses.

Oxygen refills.

Suit alarm stops.

Everything you collected pours into the manifest.

Results tally rapidly.

Rare discoveries slam onto screen.

The Mothership comments on what happened.

Then:

BANKED // EXPEDITION SECURED

That transition is incredibly important.

It closes the tension loop.

Without a strong return payoff, oxygen pressure feels punitive.

With it, oxygen pressure creates relief.

18. Death needs equal ceremony

Death shouldn't simply mean failure.

It should answer:

What killed me?

What did I lose?

What did I keep?

What changed in the world?

What did I almost achieve?

Then:

REDEPLOY

Fast.

Your current design thinking already recognizes that players need to understand persistence and consequences clearly.

I'd make the post-run report feel like a black-box flight recorder.

That fits the fiction beautifully.

19. Co-op needs things that are impossible solo

This is critical.

Don't let co-op become:

“single-player but another guy is here.”

You now have the networking foundation.

Build cooperative moments.

Scout marks an exposed weakpoint.

Tank pins the enemy.

Engineer overloads it.

COMBO: SYSTEM RUPTURE

Or:

one player manually holds a bulkhead open
another runs through
third carries wounded teammate
oxygen is falling

Or:

two simultaneous switches.

Or:

Engineer restores a dead turret while Tank holds the room.

Or:

player gets grabbed and needs teammate intervention.

Or:

shared relic effects.

And add a ping wheel:

enemy
loot
danger
go here
need O2
retreat
hold
help

That single system does enormous work for co-op playability.

20. Multiplayer needs “clutch” moments

A good cooperative game creates stories like:

“Everyone was dead and I had 4% oxygen and somehow got both of you up.”

Your new downed/revive system is the beginning.

Now amplify it.

Last-player-standing audio.

Screen desaturation.

Team status.

Longer revive under pressure.

Revive cancel risk.

Dragged/downed movement if appropriate.

Emergency consumables.

“Leave them or save them” tension.

These moments become the stories players remember.

21. Make PvP create hunt tension, not arcade deathmatch

Hunker Bunker's world is potentially more interesting than an arena.

Don't necessarily imitate Counter-Strike.

Imagine:

two squads enter the same procedural bunker.

They can hear distant gunfire.

Both want the same relic.

PvE enemies exist.

Oxygen is still draining.

You might avoid the other team.

You might ambush them.

You might let them weaken the Queen first.

You might race them to extraction.

That's Hunker Bunker PvP.

The world stays the star.

22. Improve the HUD by hiding it

Modern polished games don't necessarily have less information.

They show information when it matters.

At rest:

minimal HUD.

When firing:

ammo becomes prominent.

When injured:

health intensifies.

When O2 drops:

oxygen moves into visual priority.

When entering new ring:

depth/reward appears.

When near objective:

navigation expands.

When receiving rare loot:

loot layer appears.

Then things fade back.

The result feels cinematic without sacrificing systems.

23. Add environmental interactions

This is another relatively cheap richness multiplier.

Shoot:

lights
pipes
steam valves
fuel tanks
ice formations
support cables
organic sacs
electrical boxes

Activate:

doors
cranes
fans
pressure releases
security systems
old turrets

Use them in combat.

Now every room isn't merely geometry around enemies.

It's a toy.

24. Build secrets everywhere

Players love finding things the game didn't explicitly command them to find.

Cracked wall.

Suspicious light.

Strange radio signal.

Hidden crawlspace.

Dead operator with unusual weapon.

Unmarked hive tunnel.

Code hidden in environmental text.

Impossible-looking locked door.

Extremely rare room.

Secret boss.

Alternate extraction.

If 1% of players discover something bizarre and post:

“Has anyone seen THIS?”

you have achieved something valuable.

25. Give the procedural world legendary rooms

Most rooms can be modular.

Some should be holy shit rooms.

A gigantic frozen drilling machine.

Mass grave.

Alien nursery.

Abandoned command theater.

Vertical reactor chamber.

Human settlement annihilated mid-meal.

A room containing hundreds of dormant creatures.

An enormous viewing window into something alive.

Ancient crashed machine.

These rare authored spaces become landmarks people remember despite procedural generation.

The procedural system then becomes the delivery vehicle for authored surprise.

26. Don't confuse content with hook

This is important for where the project is heading.

Another:

20 skins
30 achievements
10 songs
15 Steam items
5 lore entries
battle pass tier
crafting material

does not necessarily make the game better.

A single mechanic that produces:

“One more room.”

may be worth more than all of those combined.

The repo already acknowledges this principle beautifully: new run-director content should only be added if it changes a decision.

Apply that rule everywhere.

What I would build next

I would organize the next development around five transformations, not fifty features.

Transformation Current feeling Target feeling
Exploration traveling between systems “What is behind that door?”
Oxygen timer “Can I risk one more ring?”
Combat functional shooter “Every shot lands.”
Loot resources/stat growth “This item changes my run.”
Consequences state machine “The world remembers me.”
Co-op synchronized players “We survived that together.”
Death reset “I learned something and need another run.”
Extraction end of excursion “GET ME HOME.”

And I would establish one creative test for every feature going forward:

Does this create anticipation, decision, payoff, mastery, surprise, or story?

If it produces none of those, it probably shouldn't be a priority.

The game does not need a new premise. The premise hidden inside the systems is already good:

Descend into an increasingly hostile living bunker. Gamble oxygen against discovery. Build a brokenly powerful operator. Decide who you trust. Push farther than you should. Somehow make it back. And live with what the world remembers.

That is the hook.

Now the entire game—from muzzle flash to doors to loot to music to oxygen to multiplayer to the final manifest—needs to relentlessly sell that one fantasy.

let's expand the stories both at camps and style guides please in our chat on how we can make it more narrativley alligned with the themes and workld and story like RGB that are told in power persepctive, while being sensual
Called tool

Yes. I think this is where the narrative can become much more distinctive.

The current camp writing is already good. Kaelen has machine mysticism, Martha has botanical faith/care, Briggs has military pragmatism, while Nahl speaks through tissue, Vey through signal, and Rhun through oaths/protection. The existing review correctly notes that their voices are unusually well separated.

What they need now is dramatic structure, power, embodiment and intimacy.

The new narrative north star

I would define Hunker Bunker's story with this sentence:

Everyone on Cocytus IV wants custody of your body.

Horizon calls it corporate property.

The Mothership calls it an operator.

The camps call it a survivor.

The Queen calls it a carrier.

The hives recognize it as kin.

The suit constantly measures it.

And eventually the player has to decide:

Who gets to tell me what I am?

That connects almost everything you already built.

Oxygen becomes control of breath.

Armor becomes ownership of the body.

Infection becomes transformation.

The manifest becomes deciding which bodies deserve transport.

The Queen becomes maternal authority.

The Mothership becomes institutional authority.

Camps become small competing societies trying to survive.

Hives become alien forms of care, obligation and belonging.

And RGB becomes thematically related rather than simply another story in the same product.

RGB says systems of power become violent while individually claiming neutrality; it makes labor, money, pain and machinery physical rather than abstract.

Hunker Bunker should do the same thing with survival, authority, care and the body.

What “sensual” should mean here

Not simply sexual.

Make the world sensuous.

Warmth. Cold. Breath. Pressure. Smell. Contact. Fabric. Condensation. Oil. Blood. Chitin. Moss. Static. Vibration. Someone standing slightly too close. Someone touching the plate over your ribs because they know something is wrong underneath it.

Sexual tension can exist between adult characters where appropriate, but the larger style should be:

Bodies are always present in the writing.

Instead of:

“Martha notices your infection has progressed.”

Write around the sensation:

Martha takes your wrist before you can pull it away. Her thumb rests against the seal of your glove.

“You’re warm.”

Not frightened. Not accusing.

“Too warm.”

That's far more intimate.

The game doesn't tell you INFECTION +1.

Someone feels it.

And power should determine perspective

This is where RGB provides the best template.

RGB's scenes work because Elias is constantly encountering systems with more authority than he has. The drama is not “here is some lore about healthcare.” The drama is:

I need something.

The system has it.

The system gets to decide whether I deserve it.

Its redesigned chapter flow deliberately funnels scenes through a few meaningful interactions rather than presenting walls of narrative choices.

Do exactly that at camps.

Every camp scene should ask:

Who has power right now, and what does that power let them ask of the player's body?

Then that relationship changes over time.

The three human camps should form a triangle of power
Camp Power Promise Threat
Meridian / Kaelen Infrastructure “We can make the world work.” Everything becomes measurable
Tallow / Martha Care “We can keep you alive.” Care can become custody
Vesper / Briggs Violence “We can keep danger out.” Eventually you may be the danger

And brilliantly, you already have three alien mirrors:

Human Alien mirror Shared question
Kaelen Vey Who controls information?
Martha Nahl What does healing entitle you to?
Briggs Rhun What does protection require?

That structure could unify the entire narrative.

MERIDIAN — Kaelen

Meridian should be about being seen by systems.

Kaelen isn't just the machine cult guy.

He believes infrastructure is the last honest authority left because people lie but voltage doesn't.

His tragedy is discovering that machines also reflect whoever controls them.

His existing line about trusting telemetry even when “the math is beautiful” is already moving directly toward this.

The sensual language of Meridian

Dry heat.

Electrical vibration through railings.

Metal sweating condensation.

Ozone.

Warm control panels.

A transformer felt through the soles of your boots.

Kaelen touching machinery much more comfortably than people.

And eventually:

the machine touching you through telemetry.

His story arc

First encounter: YOU ARE A LOAD

Kaelen barely looks at you.

He's watching the grid.

Your suit enters his electrical system and causes a measurable disturbance.

That's what interests him.

Not who you are.

“Stand there again.”

“Why?”

“Because the relay sang when you crossed it.”

You perform physical work with him: throwing breakers, carrying a bus coupler, reconnecting a dangerously hot line.

Labor creates intimacy.

Like RGB, competence precedes confession.

Second encounter: YOU BECOME INTERESTING

Kaelen realizes the grid behaves differently around you.

Doors anticipate you.

Sensors misread you.

Power reroutes.

He starts asking you to participate in experiments.

Not exposition dumps.

Small acts.

Put your hand against the relay housing.

You feel a pulse.

It answers.

Now the player can:

allow the measurement

or

pull away.

The choice doesn't create Good/Bad points.

It defines whether Kaelen believes he is entitled to know you.

Third encounter: KAELEN BECOMES INTIMATE

Not romantically, necessarily.

Obsessively.

He has studied the shape of your telemetry so carefully that he knows something is changing before you do.

“Your heart beat twice just then.”

“It does that.”

“Not the second one.”

That's sensual horror.

No INFECTION STAGE 3 required.

Post-reveal: THE MACHINE LOVES YOU

Now Meridian's systems react to the player.

Lights turn as you pass.

Locks open.

The hum follows you.

Kaelen should experience something close to jealousy.

He dedicated his life to understanding this system.

And it notices you more than it notices him.

Now the relationship becomes emotionally dangerous.

“Twenty-six years.”

His hand stays on the transformer.

“Twenty-six years I listened to this place breathe.”

He finally looks at you.

“You walk in wearing somebody else's skin and it says your name.”

That's much more interesting than “machine cult exposition.”

TALLOW — Martha

Tallow should probably be the game's most sensual and intimate human storyline.

Because its source of power is care.

Warm pipes.

Steam.

Medicine.

Food.

Sleep.

Children.

Skin.

Plants.

Hands.

Tallow is the only place on Cocytus IV where the player's body can temporarily stop being a weapon or machine.

Which makes Martha being the first human to realize what is happening to it much more potent.

Her existing writing already gives you the language: warm moss, steam, seeds, breath, children and something singing inside the infrastructure.

Martha's power

Martha can do something neither Kaelen nor Briggs can:

make you feel safe.

Which means she can ask things of you that you would never allow Briggs to demand.

That's the complexity.

Care is power too.

First encounter: LET ME TAKE CARE OF YOU

Not “welcome traveler.”

Martha immediately notices your condition.

She makes you sit.

You don't get a dialogue menu until she gives you water.

She loosens some suit component so you can breathe more easily.

Maybe she rubs condensation from the faceplate to actually see you.

No seduction.

But intense physical proximity.

“You can keep holding the rifle if it makes you feel better.”

She unwraps your burned palm.

“But give me the hand.”

Now Tallow immediately feels different from every videogame vendor hub.

Second encounter: CARE CREATES TRUST

You work together tending hydro beds.

Harvest something.

Repair irrigation.

Move someone who is injured.

Martha talks while doing work.

Never:

“Let me tell you the history of our settlement.”

Instead:

“Hold that.”

She ties the root bundle.

“We lost six people the winter before you came.”

RGB's labor is knowledge principle translates perfectly.

Story happens because hands are occupied.

Third encounter: SHE KNOWS

This should be one of the best camp scenes in the game.

Martha notices the infection.

But she does not immediately expose you.

Now care becomes morally complicated.

She closes the curtain.

Turns off a monitoring device.

Locks a door.

“Take the helmet off.”

You don't.

“Then I won't ask twice.”

A beat.

“But don't make me pretend I haven't noticed you stopped breathing.”

Now player agency matters.

You can trust her.

Deflect.

Leave.

Allow examination.

Maybe tell a partial truth.

And Martha remembers that boundary.

Post-reveal: LOVE WITHOUT OWNERSHIP

This is where her arc should separate itself from the Queen.

The Queen loves possessively:

YOU ARE MINE BECAUSE I MADE YOU.

Martha's answer should ultimately be:

I care for you, therefore I refuse to own you.

That's an incredibly powerful thematic counterpoint.

Her current final sentiment—decide as yourself—is already basically the seed of this.

Make it her entire philosophy.

VESPER — Briggs

Briggs is about the eroticism and terror of scrutiny—not necessarily sexual eroticism, but the intensity of another competent person watching your every movement.

He notices how you carry your weapon.

He notices hesitation.

He notices your breathing.

He knows exactly how dangerous you are.

And eventually he has to decide whether to pull the trigger.

Sensory vocabulary

Gun oil.

Cold steel.

Canvas.

Powder.

Hot barrel.

Gloves.

Frost collected in seams.

Breath against mask fabric.

The click of a safety.

The weight of someone standing behind you while you clear a weapon.

First encounter: YOU ARE A THREAT

Briggs should not deliver his biography.

He should disarm the situation.

“Finger.”

“What?”

“Off the trigger.”

Then:

“Again.”

He teaches or tests the player through a tiny weapon-handling interaction.

Authority enters through procedure.

He controls the space because everyone agrees that Briggs keeping the rules is why they're alive.

Second encounter: RESPECT THROUGH COMPETENCE

Fight alongside him.

Repair a turret while under pressure.

Hold a defensive line.

Carry an injured Vesper soldier back.

Then his tone changes.

Not:

BRIGGS TRUST +1.

He stops pointing his weapon directly at you when you enter.

That's narrative.

Maybe eventually:

he hands you his gun.

For Briggs, that's practically an embrace.

Third encounter: HE SEES THE CHANGE

Don't make this a scanner alert.

Make Briggs notice movement.

“Do that again.”

“Do what?”

“Blink.”

Silence.

“There.”

He knows.

And unlike Martha, his entire social function says he should kill you.

So he moves closer.

Inspects your face.

Hand near sidearm.

Not drawing.

That tiny distance is the scene.

Post-reveal: THE GUN DOESN'T FIRE

The player returns fully transformed enough that Vesper's automated defenses track them.

Briggs has told us repeatedly:

If the monster wears a friendly face, I'll shoot the face.

So pay it off.

He aims.

The player doesn't get a dialogue wheel immediately.

Let the moment exist.

And then:

he lowers the weapon.

Or doesn't—depending on the relationship.

That decision should be the culmination of everything the player actually did with him, not an invisible bond number.

And then the alien hives answer the human camps

This is where the game could become genuinely special.

Martha ↔ Nahl

Martha heals through human care.

Nahl heals through bodily transformation.

Martha asks:

“Does healing give me permission to touch you?”

Nahl asks:

“Why do humans distinguish healing from changing?”

Nahl already has fantastic bodily language: tissue remembering, skin lying beautifully, wounds closing, the Queen's needle.

Push that much further.

Nahl shouldn't explain affection.

Nahl physically repairs you.

Resin over an armor seam.

A filament wrapping a damaged hand.

Warmth spreading through infected tissue.

Alien intimacy should be strange but not automatically grotesque.

Kaelen ↔ Vey

Kaelen worships information because he thinks measurement produces truth.

Vey understands that signals can be forged.

So Vey knows:

identity is partly whatever the observer can be persuaded to read.

That is a huge thematic idea for a hidden-carrier story.

Kaelen:

the system knows what you are.

Vey:

the system only knows what we tell it.

Their stories should collide.

Briggs ↔ Rhun

Briggs protects through suspicion.

Rhun protects through oath.

Briggs asks:

Who deserves protection?

Rhun asks:

What happens when the thing I swore to protect becomes the danger?

Rhun's current “the question is only ever: guard what” is already the thesis.

That's one of the strongest conceptual mirrors in the game.

The camp scene style guide

I would formalize this into an actual writing rule.

Every important scene needs five beats
Beat Function
Body Establish a physical sensation
Work Give characters something real to do
Power Establish who can permit/deny/protect/expose
Intimacy One character sees something usually hidden
Choice Player decides how much access to grant

So instead of:

KAELEN: Here is my worldview.
PLAYER: Tell me more.
KAELEN: Here is additional lore.

You get:

BODY

Transformer vibration through the player's glove.

WORK

Kaelen asks them to stabilize it manually.

POWER

He controls the camp's grid and could lock the player out.

INTIMACY

The machine reacts to the player. Kaelen notices.

CHOICE

Keep your hand there / pull away / ask him what he saw.

That's a scene.

RGB's restructuring uses essentially the same philosophy: interactions appear in staged waves, usually only one to three at once, and seemingly incidental actions are supposed to carry state or meaning rather than exist as inert flavor.

Dialogue style

I'd also stop making everyone speak at the same apparent volume.

The older narrative review had a great idea: treat CAPS as transmitted/system speech and mixed case as intimacy.

That can become formal.

Radio / authority / performance

BRIGGS: HOLD POSITION. WE HAVE MOVEMENT EAST.

Same person in proximity

Briggs: Don't move.

Private confession

Briggs: I know what you are.

That tiny typography change creates camera distance.

The closer someone gets emotionally, the quieter the text becomes.

Sensual-writing rules

The sensuality should come primarily from specific sensation + restraint.

Don't write:

Martha sensually touches the Operator.

Write:

Her fingers stop at the edge of the seal.
“May I?”

The glove unlocks with a soft pressure hiss.

Don't write:

There is sexual tension between Briggs and the player.

Write:

Briggs reaches across you for the rifle's charging handle. His sleeve catches against your chest plate.

“You're shaking.”

“Cold.”

“No.”

Don't write:

Nahl feels intimate.

Write:

A filament settles into the split in your armor. You expect cold.

It is warmer than your hand.

Implication beats declaration.

The most important thematic distinction

Every major relationship should eventually offer a different answer to:

What does loving/caring for/protecting someone entitle you to do to them?

The Queen says:

Everything. I made you.

Mothership says:

Everything. We own you.

Horizon says:

Everything. You signed the contract.

Briggs initially says:

Whatever keeps everyone else alive.

Kaelen says:

Whatever reveals the truth.

Martha begins closer to:

Whatever keeps you alive.

Nahl says:

Whatever heals the wound.

Vey says:

Whatever keeps your secret.

Rhun says:

Whatever fulfills the oath.

Then the player changes them.

The mature version of these stories is each character discovering the boundary between:

care and control

protection and possession

knowledge and violation

loyalty and obedience

transformation and loss of self

That is much more adult than simply making dialogue darker or sexier.

And it aligns beautifully with the strongest existing concept identified by your own lore review: the main game's genre betrayal only really works when the player's earlier relationships return after the transformation and mean something different.

That is the narrative identity I would chase.

RGB tells stories about systems possessing workers.

Hunker Bunker tells stories about systems, communities, lovers, caretakers, commanders and monsters all trying to define—and sometimes possess—the same body.

And the player's ultimate act of power is deciding:

I will choose what I carry.
I will choose who I carry.
And I will choose what gets to carry me.

That makes CARRYING not just recurring vocabulary in the endings, but the central metaphor of the entire game.

Take this further in ChatGPT Work
Turn your work into a polished document, deck, spreadsheet, report, or website.
Try Work

If you brought Hunker Bunker into an advanced game-design studio course and said, “I want this to become an award-winning indie,” I think a good professor would tell you something uncomfortable but useful:

You have enough game. Now you need authorship.

They would probably be much less impressed by the number of systems than we are as engineers. Steam Inventory, multiplayer, WFC, 43 tracks, endings, factions, classes, bosses, procedural generation, marketplace work—all impressive—but a professor would ask:

What is the experience that could only be Hunker Bunker?

That matters because the major award frameworks aren't really rewarding feature count. IGF explicitly judges Excellence in Design, Narrative, Character, Audio, Visual Art, and even the Nuovo Award for unusual, risk-taking approaches; its Grand Prize considers overall innovation, quality, impressiveness, and enjoyability. BAFTA similarly separates Game Design, Narrative, Artistic Achievement, Audio, New IP, Multiplayer, and more; the 2026 winners demonstrate that excellence can come from very different kinds of games rather than sheer production scale.

So here's the faculty critique I'd give Hunker Bunker.

Your thesis needs to become brutally clear

I think we've now found it:

HUNKER BUNKER is about going farther than you safely should.

You descend into a living industrial underworld with finite breath.

The deeper you go, the more valuable, strange, intimate and dangerous the world becomes.

Every expedition changes your body and your relationships.

Everyone wants to decide what you are becoming.

You decide what to carry home, who to carry with you, and eventually what gets to carry you.

That's the game.

“One more ring” is the mechanical hook.

“Who owns this body?” is the narrative hook.

“The world remembers what you did” is the emotional hook.

Those three need to become the design constitution.

Your existing game-wide review basically reached the same conclusion from another direction: the strongest parts are consequence memory, camps/hives, manifest structure and authored world identity, while the biggest danger is accumulating systems faster than the player can perceive why they matter.

A professor would literally start crossing features off the roadmap if they don't reinforce those three hooks.

Stop trying to become a small AAA game

This is probably the biggest strategic advice.

You should adopt AAA craft standards.

You should not adopt AAA scope.

An award-winning indie generally does not win by having:

50 enemy types, 200 weapons, 500 cosmetics, ranked PvP, crafting, battle passes, giant maps, cinematic campaigns, marketplace systems and every possible Steam feature.

It wins because someone plays twenty minutes and says:

“I've never played anything quite like this.”

Blue Prince winning BAFTA Game Design in 2026 fits that broader tradition alongside previous winners like Inscryption, Vampire Survivors, Outer Wilds and Return of the Obra Dinn: wildly different production scales, but each has an unmistakable design identity.

That's the target.

Not:

“Look how much we built.”

But:

“Nobody else built this.”

I would define three award lanes

Don't attempt to win every category.

Design toward three.

Lane Hunker Bunker's opportunity
Game Design Oxygen × depth × greed × procedural routes × transformative run builds
Narrative / Character Player transformation + camps/hives + bodily autonomy + consequence memory
Audio / Artistic Identity industrial underworld + suit audio + reactive score + tactile retro-futurist aesthetic

And there's a wildcard:

Nuovo / experimental identity

If you really fuse:

procedural roguelike + hidden transformation + persistent social consequences + bodily intimacy + multiplayer

into something structurally unusual, Hunker could potentially become the kind of idiosyncratic work IGF's Nuovo category is explicitly looking for.

But that requires taking a creative risk, not merely having lots of mechanics.

The professor would probably tell you to make one extraordinary 30-minute slice

This would be my strongest recommendation.

Forget temporarily about “the whole game.”

Build the best possible 30 minutes of Hunker Bunker.

It should contain the entire thesis in miniature.

Imagine this run.

You wake at the ship.

Everything is safe.

You hear ventilation, suit servos, subdued music.

You choose a class.

Ring 1

You enter.

Combat is immediate and extremely tactile.

You discover an equipment modifier that changes your build.

You hear something behind a sealed door.

You choose to investigate.

You meet Tallow.

Martha treats an injury.

There is quiet human contact.

The player learns that this world contains people, not merely vendors.

You leave.

Ring 2

Oxygen matters now.

The reward multiplier increases.

Enemies behave differently.

You get a build-defining relic.

Maybe:

LAST BREATH — below 20% O2, your weapon overloads.

Suddenly oxygen isn't merely something to preserve.

Now low oxygen is powerful.

The rules collide.

That's design.

You start thinking:

Maybe I'll intentionally stay low.

Ring 3

You find an injured hive.

Nahl recognizes something in you.

Something biologically impossible happens.

Nahl repairs you.

It's intimate and disturbing.

The Mothership reacts strangely.

Now your previous safe assumptions break.

Return

You could turn around.

You're carrying valuable salvage.

8 minutes of progress.

But there is an anomalous signal one ring deeper.

The HUD tells you:

CURRENT HAUL: 840
DEPTH BONUS: ×2.3
O2: 29%

You hesitate.

That's the entire game.

You go anyway.

Of course you go.

Ring 4

The run director changes the situation.

Lights fail.

A Hunter appears.

Your broken build barely saves you.

O2 reaches 5%.

Music becomes frantic.

You sprint home.

Ship door closes behind you.

THUNK.

Silence.

Air returns.

Loot totals.

Martha radios.

The Mothership says something disturbing about your biology.

You learn the world changed because of something you did.

Then:

DEPLOY AGAIN

If those thirty minutes are extraordinary, you have something.

If they're merely “pretty good but the other modes and marketplace are awesome,” you don't yet.

The missing ingredient is authored escalation

Right now Hunker has procedural generation.

An award-quality version needs procedural dramaturgy.

That means the generator should not merely ask:

What room comes next?

It should ask:

What should the player feel next?

The current world-generation documentation already recognizes the unsolved part: the topology can be mathematically valid while still failing to create readable routes, memorable spaces or useful tactical variety.

So give the run a dramatic grammar:

Safety → curiosity → danger → reward → quiet → human connection → uncertainty → escalation → greed → panic → relief.

Then procedural generation picks content that fulfills those roles.

That would be a genuine design achievement.

Make “one more ring” mechanically irresistible

This is where I would spend serious design time.

Every ring should increase something the player desperately wants.

Not merely stronger enemies.

Think of an explicit Depth Contract.

At each threshold:

RING II

+25% salvage
Rare relics enabled
Elites enter spawn pool
O2 efficiency -5%

RING III

+60% salvage
Anomalous rooms enabled
Build-changing relics enabled
Director aggression +1
Extraction distance increased

RING IV

+120% salvage
Legendary events possible
Boss mutations active
Mothership intervention possible

SECTOR ZERO

???

Don't reveal everything.

Now depth isn't “the next level.”

It's a bet.

And the player should decide whether to accept it.

You desperately need transformative run builds

I think a game-design professor would highlight this immediately.

Your permanent systems can be deep.

But moment-to-moment replayability needs:

“You should have seen my build.”

Not:

+7% fire rate

but things that alter rules.

For example:

PUNCTURED LUNG

Max O2 -40%.
Kills restore oxygen.

Now the game changes.

THE RED THREAD

Reviving a teammate permanently links your health pools.

VESPER DOCTRINE

Every empty reload ejects the remaining magazine as an explosive.

NALH'S GIFT

Healing mutates your body. Every third mutation is permanent for the run.

FALSE TELEMETRY

At critical health, enemies temporarily lose track of you.

QUEEN'S MILK

Alien enemies heal you. Human healing hurts.

BLACK BOX

Carry a dead player's recording. Enemy density doubles. Extraction rewards triple.

That's the territory.

The best relic is one where the player initially says:

“Why would I ever take this?”

and ten minutes later:

“Ohhhhhhh.”

Combat must become performative

Right now your combat documentation correctly says the underlying mechanics exist and the real unanswered question is comparative feel.

Award-quality combat needs players to enjoy firing the weapon even in a blank room.

That's an important studio test.

Put the player in an empty gray box.

No progression.

No story.

No loot.

Give them the character and weapon.

Is moving, aiming, firing, reloading, sprinting, hitting a target and breaking something intrinsically satisfying for five minutes?

If not, don't add another biome yet.

Fix:

recoil timing, muzzle impulse, projectile readability, controller rumble, enemy hit response, stagger, audio transient, casing/eject effects, environmental reaction, animation timing, death response, reload cadence, crosshair communication, low-ammo tension.

Your QA should literally videotape hands + screen and tune milliseconds.

That's game-feel work.

Make enemies verbs, not health bars

A professor would probably draw this on the board.

Every enemy needs to force a behavior.

Rusher → reposition.

Sniper → seek cover.

Spitter → leave cover.

Shield → flank.

Burrower → watch the floor.

Leech → protect oxygen.

Support → change target priority.

Mimic → distrust loot.

Swarm → manage area.

Heavy → conserve ammunition / exploit weakpoint.

Then encounter design becomes combinations of verbs.

Shield + Spitter creates one problem.

Rusher + Sniper creates another.

This is much cheaper and better than merely adding another 25 monsters.

One enemy should become iconic

Award-winning games often have something recognizable from one screenshot.

Hunker needs that.

The Queen might be it.

But I'd also consider one persistent Hunter.

Something that doesn't spawn as ordinary combat trash.

You hear it.

You see evidence.

Sometimes the Director chooses it.

Sometimes it sees you and doesn't attack.

Sometimes it follows.

Maybe it remembers previous encounters.

The current Director already has named apex threats and is explicitly intended to produce memorable run stories and break backpedal-and-fire rhythms.

Turn one of those threats into a character.

Give players a name they fear.

The camps should become the emotional center

This is where I think Hunker can move from “great roguelike” to something critics remember.

Don't create thirty camps.

Make three camps astonishingly deep.

Kaelen.

Martha.

Briggs.

Those three should be as important as bosses.

Their state should change:

dialogue
props
NPC population
lighting
music
services
security
their physical relationship to the player
what they know
what they'll permit
what they fear

And every relationship must change again when the player's nature changes.

Your lore review already identified the secret sauce: the genre betrayal works only when earlier kindnesses and relationships come back after the transformation and gain new meaning.

That's an award-level narrative opportunity.

Pre-reveal Martha:

“You're the reason the children sleep through the night.”

Post-reveal:

“The children don't sleep anymore. They say something in the pipes is singing.”

Same relationship.

Different reality.

That hurts.

Good.

Do less dialogue and make scenes better

This would be another professor note.

You don't need enormous trees.

RGB provides the correct lesson.

Its strong structure is:

Observe → Collect → Connect → Choose → Consequence.

And later RGB work deliberately reduced simultaneous choices even while adding authored beats, because pacing and staging were more important than raw content count.

Use the same philosophy in Hunker.

Instead of seven lines of camp lore:

Martha binds your hand.

You hold a failing irrigation line.

She notices blood under your glove.

A child asks whether you're coming back.

You decide whether to tell Martha what's happening.

That's a scene.

The body should be the UI for the transformation

This is potentially Hunker's most original storytelling device.

Please don't make infection primarily:

INFECTION: 63%

Use the body.

Early:

heartbeat audio changes.

Then:

breathing cadence changes.

Then:

suit seal behaves differently.

HUD has unexplained biological telemetry.

Enemies pause before attacking.

Martha notices warmth.

Briggs notices your blink.

Kaelen notices telemetry.

Nahl recognizes you before you understand why.

Eventually:

your idle animation changes.

Your footsteps change.

Your shadow doesn't quite match.

The suit voice changes register.

Your health recovery changes.

You stop breathing normally.

A human NPC unconsciously steps backward.

The player should know they're transforming because everyone and everything reacts differently.

Not because a progress bar tells them.

Audio could be your sleeper award category

You already have the infrastructure and 43 soundtrack sources, but your own audio plan wisely recognizes that this does not mean all 43 should randomly play; it recommends authored cue ownership, priorities, crossfades and contextual usage.

Go much further.

Make Hunker something players recognize with their eyes closed.

Ship:

mechanical heartbeat.

Tallow:

steam + water + soft organic growth.

Meridian:

transformer frequencies.

Vesper:

cloth, metal, distant weapon maintenance.

Hive:

wet resonance rather than monster growls.

Deep ring:

almost no traditional music.

Low O2:

music doesn't merely get louder—the player's breathing becomes rhythmic material.

Queen:

maybe a two-note motif heard unconsciously hours beforehand.

After transformation, realize:

that motif was embedded in the environmental hum the entire game.

That's award-type audio storytelling.

Visual style needs a ruthless art director

Not “make more assets.”

Actually subtract.

One palette bible.

One silhouette philosophy.

One lighting philosophy.

One material language.

One sprite/3D integration rule.

One VFX grammar.

If amber means reward, it always means reward.

If cyan means safe technology, protect it.

If red means hostile/system authority, don't casually use it for decoration.

Alien biology should gradually break the established color rules.

Steam screenshots need to be recognizable as Hunker Bunker without the logo.

That's the test.

The BAFTA Artistic Achievement lineage ranges from Return of the Obra Dinn through Hades, TUNIC, Alan Wake 2, Neva and Death Stranding 2—very different fidelity levels, but all have strong visual authorship.

Cut anything that weakens the thesis

Here's where professor mode gets mean.

For now, I'd deprioritize:

marketplace expansion
season-pass breadth
more currencies
huge cosmetic catalogs
Workshop
additional minor factions
more endings merely for completeness
huge volumes of lore logs
new modes that don't exploit the core systems
additional minigames after RGB
more ordinary enemy reskins

None are inherently bad.

They're just competing against the work that could make Hunker exceptional.

If you have 100 development hours, I'd rather spend:

40 hours making Ring 2 unforgettable

than

40 hours adding 40 items.

Your multiplayer should reinforce the thesis too

Don't bolt Left 4 Dead onto it.

Co-op should make risk and carrying more complicated.

One teammate wants to extract.

One wants another ring.

Someone is carrying the rare artifact.

Someone is infected.

One player has enough O2.

Another doesn't.

Someone gets downed behind the previous bulkhead.

Now the team must decide:

Do we go back?

That's Hunker multiplayer.

PvP too:

don't make a separate sterile deathmatch if you can help it.

Two teams hunting the same deep relic while PvE, oxygen and extraction remain active is far more specific to this game's fantasy.

Measure emotion, not merely systems

This is important.

Your QA currently measures things like connectivity, tests, feasibility and synchronization.

Good.

Now create a design telemetry rubric.

After blind playtests, ask:

What were you trying to do?

When did you first feel unsafe?

Did you ever knowingly take a bad risk because you wanted something?

Which character do you remember?

Which enemy do you remember?

Tell me about your build.

Tell me about something unexpected that happened.

When did you feel relief?

What do you think is happening to your character?

Do you want to play another run? Why?

If a player cannot tell you a story about their run, the procedural system hasn't done enough.

If they describe numbers and progression systems instead, the fiction hasn't done enough.

If they say:

“I had 8% oxygen, Martha had given me this mutation thing, my friend was down behind the blast door, and then that Hunter came back—”

that's the game.

The professor's semester plan

I'd make the next phase effectively a final-year capstone refinement semester:

Phase Question

1. Thesis lock What is Hunker Bunker about mechanically and emotionally?
2. Gray-box feel Is movement/combat satisfying without content?
3. One More Ring Does depth create genuine greed/fear decisions?
4. Run builds Can players produce weird, memorable builds?
5. Signature slice Are the best 30 minutes exceptional?
6. Character integration Do camps react physically/narratively to the player's transformation?
7. Procedural dramaturgy Does room sequencing create emotional pacing?
8. Audiovisual authorship Is every screenshot/sound unmistakably Hunker?
9. Ruthless playtesting Can strangers understand and recount the fantasy?
10. Expansion Only now add breadth around what players loved.

And I'd set one brutal graduation condition:

Do not add another major system until five strangers play the vertical slice and independently describe the experience using the concepts we intended:

going deeper, pushing their luck, transforming, caring about someone, and barely getting home.

If they do that, you're no longer guessing whether the hook works.

What “award-winning” should mean internally

Don't make the objective:

WIN IGF.

That's uncontrollable.

Make the objective:

Build something that an IGF judge can identify after ten seconds, explain after ten minutes, and still be thinking about the next morning.

The IGF criteria explicitly reward execution in design, narrative, character, audio, visual art, and unusual approaches—not production-budget mimicry.

And I think Hunker genuinely has raw material for that.

But the path isn't more.

It's compression.

Compress twenty systems into one fantasy.

Compress hundreds of state variables into visible consequences.

Compress lore into memorable characters.

Compress procedural generation into meaningful decisions.

Compress oxygen, loot and depth into:

One more ring.

Compress the transformation into:

Who owns this body?

Compress the ending into:

What—and who—will I carry out?

If I were the professor signing off on the project, that would be the assignment now:

Stop proving Hunker Bunker has features. Start proving Hunker Bunker has a point of view.

That's the difference between a very impressive indie project and a game that could actually end up on somebody's “best games of the year” list.

Yes. Looking at this specifically as a JavaScript/game-engine programmer, I think Hunker Bunker's biggest opportunity is no longer “write better individual features.”

It's:

Turn the codebase from a game that happens to work into an engine that makes Hunker Bunker easy to improve.

The current code has good subsystems, but the center is overloaded. The July engineering review measured threeGame.js at 16,742 lines and ~406 methods, containing rendering, gameplay, UI glue, audio and progression in one class. It has grown since then. The current file still directly imports world generation, WFC, bosses, camps, hives, multiplayer, economy, dialogue, loot, player rendering, enemy rendering, doors, progression, Steam inventory and much more.

That would be my #1 engineering target.

1. Do NOT rewrite ThreeGame

That would be disastrous.

Use a strangler refactor.

Every time we touch a system, pull that responsibility out of ThreeGame until ThreeGame eventually becomes approximately:

class GameRuntime {
constructor(services) {
this.world = services.world;
this.combat = services.combat;
this.players = services.players;
this.network = services.network;
this.audio = services.audio;
this.presentation = services.presentation;
}

update(dt) {
this.players.update(dt);
this.world.update(dt);
this.combat.update(dt);
this.network.update(dt);
this.presentation.update(dt);
}

render(alpha) {
this.presentation.render(alpha);
}
}

Not tomorrow.

Eventually.

Target modules
src/game/
GameRuntime.js
GameSession.js
GameClock.js
GameEvents.js

src/player/
PlayerState.js
PlayerController.js
PlayerMovement.js
PlayerCombat.js
PlayerVitals.js

src/combat/
CombatSystem.js
ProjectileSystem.js
DamageSystem.js
StatusEffectSystem.js
HitResolver.js

src/world/
WorldRuntime.js
ChunkManager.js
ChunkBuilder.js
WorldStreamer.js
InteractionSystem.js

src/entities/
EntityRegistry.js
EnemySystem.js
PickupSystem.js

src/render/
WorldRenderer.js
PlayerRenderer.js
EnemyRenderer.js
EffectsRenderer.js

src/net/
MultiplayerSession.js
NetworkTransport.js
SnapshotBuffer.js

src/ui/
HudController.js
NotificationController.js
ObjectiveController.js

Notice that I would not immediately introduce React, ECS, Redux or another framework.

The game doesn't need a technology transplant.

It needs boundaries.

2. Separate game state from presentation

This may be the most important architectural improvement.

Right now too many pieces of gameplay know about DOM, Three.js objects, globals or UI state. DOM queries are spread across numerous runtime/UI modules, and multiplayer currently still exposes window.activeMultiplayerSession.

I want this direction:

INPUT
↓
GAME COMMAND
↓
SIMULATION
↓
GAME EVENT
↓
┌─────────┬──────────┬─────────┐
UI AUDIO RENDER NETWORK

So combat does this:

events.emit('enemy:damaged', {
enemyId,
amount,
hitPosition,
damageType,
critical
});

It does not do:

document.getElementById(...);
mesh.material.color.set(...);
audio.play(...);

Then presentation reacts.

events.on('enemy:damaged', event => {
hitFx.play(event);
combatAudio.playHit(event);
hud.showDamage(event);
});

This one architectural decision makes the juice pass dramatically easier.

Want stronger hit feedback?

Don't touch combat.

Want accessibility to disable shake?

Don't touch damage logic.

Want multiplayer to reproduce the same event remotely?

You already have an event.

3. Introduce a canonical GameSession

Currently many things effectively ask the environment:

“What kind of game are we in?”

Co-op?

PvP?

Solo?

Act 2?

Who is host?

Seed?

Difficulty?

Build?

Steam player?

Those should belong to one object.

Something like:

const session = new GameSession({
id,
seed,
mode: 'coop',
difficulty: 'standard',
players,
localPlayerId,
authorityPlayerId,
steamLobbyId
});

And:

session.mode
session.isMultiplayer
session.isHost
session.seed
session.players

No global:

window.activeMultiplayerSession

No DOM state deciding game state.

No button clicks as game control flow.

This fixes an enormous class of multiplayer bugs.

4. Change multiplayer from “messages” to “state”

This would be my major networking architecture improvement.

Right now Hunker has already made huge progress with authenticated sockets, ready-up, co-op synchronization and server-mediated PvP.

The next level is:

The network transmits canonical game state and player intentions, not UI consequences.

Player sends:

MOVE
FIRE
INTERACT
USE_ABILITY
REVIVE

Authority determines:

POSITION
PROJECTILE
HIT
DAMAGE
ENEMY_STATE
LOOT
OBJECTIVE_STATE
DEATH

Then periodically send snapshots:

{
tick: 18350,
players: [...],
enemies: [...],
projectiles: [...],
objectives: {...}
}

Clients interpolate between snapshots.

Now reconnect becomes:

CONNECT
↓
AUTHENTICATE STEAMID
↓
JOIN MATCH
↓
RECEIVE SNAPSHOT
↓
RESUME

instead of trying to rebuild history from dozens of events.

5. Give every world object a stable entity ID

This is foundational.

Enemy:

{
id: 'enemy_72f81',
archetype: 'spitter',
position,
hp,
state
}

Door:

door_ring2_004

Loot:

loot_8ab21

Boss:

boss_queen_primary

Camp NPC:

npc_tallow_martha

Then all systems refer to IDs.

Not:

nearest enemy of this type within 3 units.

Not:

whichever sprite matched this position.

Stable IDs make:

multiplayer
save/load
replay
damage
targeting
debugging
telemetry
deterministic testing

vastly easier.

6. Fix the frame architecture

This is probably the highest immediate player-visible engineering payoff.

The recent work already isolated chunk mounting as a source of recurring stalls.

Right now, expensive work must stop being allowed to arbitrarily consume a frame.

I would introduce a frame-budget scheduler.

For 60 FPS:

16.67 ms frame

simulation 3 ms
input/network 1 ms
streaming 2 ms
animation 2 ms
render remaining

Something like:

class FrameBudgetScheduler {
constructor(maxMs = 2) {
this.maxMs = maxMs;
this.queue = [];
}

enqueue(job) {
this.queue.push(job);
}

run() {
const start = performance.now();

    while (this.queue.length) {
      if (performance.now() - start >= this.maxMs) break;


      const job = this.queue[0];


      if (job.step()) {
        this.queue.shift();
      }
    }

}
}

Then a chunk doesn't do:

generate
mesh
materials
props
colliders
lights
spawn enemies
attach scene

in one synchronous call.

It becomes:

frame 1 → topology
frame 2 → geometry
frame 3 → static meshes
frame 4 → collision
frame 5 → props
frame 6 → entities

The player gets continuous frames.

7. Move pure world generation into Web Workers

Not Three.js objects.

Pure data.

This is a perfect JavaScript use case.

Worker:

seed
chunk coordinate
biome
ring
↓
WFC
terrain
room plan
prop plan
encounter plan
↓
serialized chunk description

Main thread:

description
↓
instantiate Three.js objects

For example:

worker.postMessage({
type: 'GENERATE_CHUNK',
seed,
chunkX,
chunkY
});

Worker returns:

{
tiles,
rooms,
doors,
props,
collision,
encounterSpawns
}

This could remove a large amount of world-generation CPU work from the render thread.

Your WFC/world architecture is already nicely decomposed conceptually into topology, tile collapse, metadata, room interpretation and runtime projection.

That's ideal for workerization.

8. Stop allocating garbage inside the frame loop

JavaScript games often stutter because of GC, not raw rendering.

Hunker uses Three.js heavily, so I would audit every hot function for:

new THREE.Vector3()
new THREE.Vector2()
new THREE.Color()
[]
{}
.map()
.filter()
.reduce()

inside update().

Instead:

const \_tempVecA = new THREE.Vector3();
const \_tempVecB = new THREE.Vector3();

Reuse them.

Likewise projectile pools:

new Projectile()
destroy
new Projectile()
destroy
new Projectile()

becomes:

ProjectilePool.acquire()
ProjectilePool.release()

Same for:

bullet impact effects
shell casings
damage indicators
blood/debris
temporary lights
enemy projectiles
loot beams
audio nodes where practical

This is one likely place I'd investigate that observed multi-second mystery freeze: allocation bursts can cause catastrophic GC pauses.

9. Add a real performance profiler layer

You've begun this with \_\_hbLastPerfPhase.

I'd make it systematic.

perf.begin('chunk.mount');
mountChunk();
perf.end('chunk.mount');

Record:

count
avg
p50
p95
p99
max

for:

simulation
render
enemyAI
collision
projectiles
chunkGeneration
chunkMount
lights
network
DOM
VFX

Then the dev overlay could literally show:

FRAME 16.1ms
SIM 2.2
AI 1.0
WORLD 1.4
RENDER 8.7
VFX 0.7
OTHER 2.1

1% LOW: 52 FPS

LONGEST FRAME:
chunk.mount 84.3ms

Now optimization becomes scientific.

10. Use spatial indexing

As enemy/world counts increase, don't repeatedly scan arrays.

Bad:

for (const enemy of enemies) {
if (player.position.distanceTo(enemy.position) < 10) ...
}

for every turret, bullet, AI agent, pickup, interaction, etc.

Use a spatial hash:

world
┌───┬───┬───┐
│ │ E │ │
├───┼───┼───┤
│ P │ E │ E │
├───┼───┼───┤
│ │ │ │
└───┴───┴───┘

Then:

spatial.queryRadius(position, 10);

only tests nearby entities.

This helps:

AI
bullets
melee
turrets
pickups
audio emitters
interaction prompts
network relevance

And multiplayer gains interest management for free:

don't send a client enemy updates 300 meters away.

11. Decouple simulation rate from rendering rate

I would move important gameplay toward a fixed simulation tick.

For example:

const FIXED_DT = 1 / 60;

accumulator += frameDelta;

while (accumulator >= FIXED_DT) {
game.update(FIXED_DT);
accumulator -= FIXED_DT;
}

renderer.render(accumulator / FIXED_DT);

This gives:

consistent movement
consistent damage
reproducible bosses
cleaner networking
easier tests
easier replay/debugging

Animation/rendering can still operate at whatever FPS the display produces.

This becomes especially valuable for PvP.

12. Make randomness deterministic

Every gameplay RNG decision should derive from the run seed.

Avoid gameplay-critical:

Math.random()

Prefer:

rng.enemy.next();
rng.loot.next();
rng.director.next();
rng.world.next();

Separate random streams prevent systems changing each other's outcomes.

RUN SEED 734181

world RNG
loot RNG
director RNG
combat RNG
cosmetic RNG

Then bug report:

Queen disappeared on seed 734181.

can actually be reproduced.

And multiplayer peers don't disagree about random outcomes.

13. Adopt state machines everywhere they're appropriate

Bosses already have good state-machine architecture.

I would expand this philosophy.

Enemy:

IDLE
INVESTIGATE
CHASE
ATTACK
STAGGER
RETREAT
DEAD

Door:

CLOSED
OPENING
OPEN
CLOSING
LOCKED
BREACHED

Player:

NORMAL
SPRINTING
INTERACTING
DOWNED
REVIVING
DEAD

Match:

LOBBY
READY
COUNTDOWN
RUNNING
EXTRACTION
RESULTS

Explicit states beat forests of booleans like:

if (!dead && !downed && active && started && !waiting...) 14. Make combat data-driven

Don't let enemy behavior turn into enormous if(type === ...) chains.

Define enemies declaratively.

const SPITTER = {
movement: {
type: 'rangeKeeper',
preferredRange: [8, 12]
},

attacks: [
{
type: 'projectile',
cooldown: 2.4,
projectile: 'acid_spit'
}
],

reactions: {
staggerThreshold: 4
}
};

Boss:

phases: [
{
hpBelow: 0.66,
attacks: ['charge', 'burst'],
arenaEffect: 'iceCracks'
}
]

Relics should be the same.

This would make the crazy run-build system we were discussing much easier to build.

15. Build gameplay around modifiers instead of hardcoded bonuses

I would introduce a modifier pipeline:

stats.resolve('damage', context);

Internally:

base

- weapon
- class
- relic
- status
- low-O2
- faction
- difficulty

Rather than scattered code:

if (playerType === ...)
if (hasUpgrade(...))
if (oxygen < ...)
if (...)

Example:

modifierRegistry.add({
id: 'last_breath',
stat: 'damage',
when: ctx => ctx.o2Percent < 20,
multiply: 2
});

Now designers can make bizarre relics without rewriting combat.

That's the engineering infrastructure needed for “you should've seen my build.”

16. Build a proper gameplay-event vocabulary

I'd standardize events like:

PLAYER_FIRED
PROJECTILE_HIT
ENEMY_DAMAGED
ENEMY_KILLED
PLAYER_DAMAGED
PLAYER_DOWNED
PLAYER_REVIVED
LOOT_DROPPED
LOOT_COLLECTED
RING_ENTERED
O2_CRITICAL
CAMP_ENTERED
BOSS_PHASE_CHANGED
RUN_EXTRACTED
RUN_FAILED

Then:

Achievements listen.

Steam listens.

Audio listens.

Director listens.

UI listens.

Narrative listens.

Analytics listens.

Multiplayer listens.

Instead of seven systems each discovering that an enemy died independently.

This would make your narrative reactivity vastly easier too.

Martha could listen for:

PLAYER_RETURNED_WITH_LOW_O2
PLAYER_RETURNED_INJURED
PLAYER_RETURNED_MUTATED

without polluting combat code.

17. Create a presentation director

This is specifically for the missing juice.

Gameplay fires:

ENEMY_KILLED

PresentationDirector decides:

impact flash
audio
particles
controller vibration
camera impulse
hit confirmation
slow-motion emphasis?

Example:

presentation.register('enemy:kill', {
sound: 'enemy_kill_confirm',
shake: 0.18,
vibration: [0.12, 0.25],
fx: 'enemy_death_burst'
});

Boss kill:

{
shake: 0.9,
audioDuck: true,
hitPausePresentation: 80,
fx: 'boss_finish',
musicTransition: 'boss_victory'
}

Now juice becomes tunable data, not scattered handcrafted calls.

18. Add an adaptive-quality controller

Because Three.js/WebGL PC hardware varies enormously.

Measure frame performance and automatically control:

dynamic lights
particle count
shadow distance
shadow map resolution
render scale
far-prop density
post-processing

If 1% lows fall:

100% render scale
↓
90%
↓
80%

If GPU time improves:

raise it.

Don't change simulation quality.

Change presentation quality.

19. Build a ResourceManager

There should be one authoritative owner for textures/models/audio.

resources.loadTexture('enemy_spitter');
resources.release('enemy_spitter');

It handles:

caching
deduplication
preload
reference counting
disposal
fallback
GPU budget

Your recent keyed-sprite caching already demonstrated how valuable this is—the multiplayer/performance sprint reported a large boot-cost reduction from persistent sprite caching.

Take that architecture across the entire asset pipeline.

20. Add real lifecycle/disposal discipline

Three.js will punish leaks.

Every system creating:

Geometry
Material
Texture
RenderTarget
Light
Audio
Event listener
Timer

needs matching cleanup.

Use:

system.dispose();

as an enforced interface.

A chunk unload should leave:

0 geometries
0 materials
0 textures
0 listeners

behind except shared cached assets.

Add dev assertions around:

renderer.info.memory.geometries
renderer.info.memory.textures

Run 30 minutes moving between chunks.

Memory should plateau.

If it climbs continuously, fail the test.

21. Gradually type the JavaScript

I would not convert the whole game to TypeScript immediately.

Instead add JSDoc + checkJs.

/\*\*

- @typedef {Object} DamageEvent
- @property {string} sourceId
- @property {string} targetId
- @property {number} amount
- @property {'physical'|'cryo'|'bio'} type
  \*/

Then:

{
"compilerOptions": {
"checkJs": true
}
}

Start with boundaries:

GameSession
network packets
entities
damage
save format
world chunk data
Steam data

Eventually new modules can be .ts.

But don't stop development for a conversion.

22. Version every persistent format

Never save raw runtime objects.

{
version: 4,
profile: {...},
progression: {...}
}

Then:

migrateSave(save);

Same with network protocol:

protocolVersion
buildVersion

If mismatched:

VERSION MISMATCH — UPDATE REQUIRED

not mysterious corruption.

23. Make debug tooling first-class

The repo already has unusually substantial debug tooling.

I'd push that much harder.

Dev command:

/hb spawn spitter 10
/hb ring 4
/hb o2 10
/hb relic last_breath
/hb killall
/hb camp tallow
/hb boss queen
/hb net latency 150
/hb net loss 5

And:

/hb snapshot

writes the entire canonical game state.

Then bugs become reproducible.

24. Build network simulation into development

For multiplayer:

0 ms / 0% loss
50 ms / 0%
150 ms / 0%
100 ms / 2%
200 ms / 5%
disconnect 10 sec

should be one toggle.

Test:

interpolation
prediction
reconnect
revive
doors
bosses
extraction

under those conditions.

A multiplayer game tested only on localhost is lying to you.

25. Use tests differently

The enormous test count is a strength.

But the next stage should emphasize simulation tests, not merely function tests.

Example:

const game = createHeadlessGame({
seed: 123,
class: 'SCOUT'
});

game.advanceSeconds(600);

expect(game.player.isAlive).toBe(true);
expect(game.world.isCompletable()).toBe(true);

Or:

simulateBoss({
boss: 'queen',
playerBuild,
duration: 120
});

Or multiplayer:

const match = createHeadlessMatch(4);

match.disconnect(player2);
match.advance(10);
match.reconnect(player2);

expect(match.players).toHaveLength(4);
expect(match.player(player2).duplicate).toBe(false);

The less gameplay testing requires WebGL or DOM, the faster this game can evolve.

The architectural change I would chase

Today, roughly:

              THREEGAME
       ┌──────────┼──────────┐
       everything everything everything

I want:

                    GameRuntime
                        │
                    GameSession
                        │
              ┌─────────┴─────────┐
              │                   │
          Simulation          Presentation
              │                   │
      ┌───────┼───────┐       ┌───┼────┐
    Player   World   Combat   Three UI Audio
      │       │       │
      └──── GameEvents ────┐
                           │
                      Multiplayer

And GameEvents is the connective tissue.

My first engineering sprints

I wouldn't attempt all 25 things simultaneously.

Engineering Sprint A — Runtime Spine

Create:

GameSession
GameEvents
GameClock
GameController
explicit run/start/end APIs
remove DOM-click orchestration
begin eliminating window.activeMultiplayerSession

No gameplay changes.

Engineering Sprint B — Frame Stability

Build:

profiler
frame-budget scheduler
staged chunk mounting
allocation audit
pools
memory metrics
worker prototype for WFC/chunk planning

Target:

zero >100ms gameplay stalls during a 30-minute traversal test.

Engineering Sprint C — Entity + Combat Core

Create:

EntityRegistry
stable IDs
DamageSystem
ProjectileSystem
status-effects pipeline
combat events

This becomes the foundation for improved enemies, relics and multiplayer.

Engineering Sprint D — Multiplayer State

Create:

canonical player IDs
snapshots
reconnect snapshot
interpolation
action protocol
authority model
network simulation harness

Then Steam lobbies can sit cleanly above it.

Engineering Sprint E — Juice Framework

Create:

PresentationDirector
hit reactions
recoil
impact effects
vibration
audio events
camera impulse system
accessibility scaling

Then we can juice every weapon and enemy consistently instead of adding bespoke hacks.

Engineering Sprint F — Run Modifier Framework

Create:

modifier registry
relic data schema
conditional effects
synergy resolver
run-build HUD

Then start building the wild mechanics we discussed:

LAST BREATH

HIVE SYMBIOSIS

PARASITIC MAGAZINE

etc.

And there are things I would specifically NOT do

I would not:

rewrite the game in Unity
rewrite it in Unreal
replace Three.js
introduce React into gameplay
convert everything to TypeScript at once
introduce a massive ECS framework
rewrite working WFC
refactor every file because it's “ugly”
stop feature work for six months

The existing implementation has earned its architecture through shipping working systems.

I'd preserve that.

But whenever we touch an overloaded area, I'd make it better than we found it.

The guiding engineering principle would be:

Extract pure simulation from presentation. Give every entity an identity. Make every expensive operation budgeted. Make every important state explicit. Make every meaningful gameplay action observable as an event.

Do that and a lot of things we've been discussing suddenly become much cheaper:

better combat becomes easier.

crazy roguelike builds become easier.

reactive narrative becomes easier.

multiplayer becomes safer.

performance becomes measurable.

boss design becomes data-driven.

juice becomes tuneable.

modding someday becomes possible.

And most importantly, adding something ambitious stops meaning:

“Carefully modify six places inside a 17,000-line file and pray.”

and starts meaning:

“Add one system, subscribe to three events, and test it headlessly.”

That is the engineering transformation I'd make before trying to substantially increase Hunker Bunker's scope again.

Looking at Hunker Bunker from a studio-director / product-operations perspective, I see several risks and opportunities we haven’t really discussed yet. None of these are about combat juice, narrative quality, or whether threeGame.js is too large. They’re about whether the project itself is structured to become a durable commercial game.

1. Your open-source and commercial identities need a deliberate boundary

This jumped out immediately.

The README describes Hunker Bunker as a “real MIT-licensed open-source project” and explicitly welcomes outside contributions. The repository's MIT license gives extremely broad rights to use, modify, publish, distribute, sublicense, and sell the covered software.

At the same time, this repository is also carrying the commercial game, Steam assets, soundtrack, narrative, generated artwork, economy definitions and branding.

That combination isn't inherently wrong. Plenty of commercial products have open-source code.

But the boundary needs to be explicit.

I would seriously consider something like:

ENGINE / GAME CODE
MIT

HUNKER BUNKER NAME + LOGO
Trademark / reserved

NARRATIVE + CHARACTER IP
All rights reserved

ART / MUSIC / VIDEO / VO
Separate content license

THIRD-PARTY ASSETS
Individual license records

The important thing is that someone should be able to answer:

“Can I fork this repository, replace the logo, compile it and sell it?”

without interpreting several documents themselves.

I would get proper legal advice before launch, especially because outside contributions complicate chain-of-title.

2. Your asset provenance system is far too small for the actual game

You already have ASSET_PROVENANCE.md, which is good.

But right now it records a handful of RGB item images and the 14 lore-drop sprites.

Meanwhile Hunker contains:

music
videos
portraits
cinematics
Steam capsule art
sprites
3D models
AI-generated images
textures
sound effects
voices
logos
fonts
store imagery

For a tiny hobby project, informal provenance is fine.

For a commercial game going through Steam, potentially press scrutiny, festivals, awards, soundtrack sales, and maybe partnerships, I would create an asset rights database.

Every production asset gets:

asset ID
filename
creator
creation date
creation method
source
AI-assisted? yes/no
AI tool/model if applicable
human modifications
commercial-use rights
third-party license
attribution required?
Steam AI disclosure category
source project / master file
approved for retail?

Not because paperwork makes the game better.

Because two years from now you absolutely do not want:

“Where did this boss sound come from?”

followed by:

“I think one of the agents downloaded it somewhere.”

That is production debt.

3. You are accidentally building a live-service organization

This is different from asking whether the Battle Pass is fun.

The current project already advertises a 50-tier Season 0 Battle Pass, Steam Vault economy and deep progression. Recent sprint work expanded that into a large seasonal catalog and related economy machinery.

A season is not merely a game mechanic.

A season implies:

Season 1.

Which implies:

content schedule
economy balancing
support tickets
item problems
player expectations
patch cadence
community communication
possibly moderation
possibly refunds/purchase issues
possibly anti-cheat/economy fraud
continued backend uptime

You need to make a fundamental product decision:

Is Hunker Bunker a premium authored indie game that happens to have Steam inventory and unlocks?

or

Is Hunker Bunker a continuing live-service game?

Those are different companies.

My inclination from everything we've uncovered about the game's strongest qualities would be the former.

I would rather see:

a fantastic $20–30 game with secrets, unlockable cosmetics, expansions and occasional major updates

than make the project responsible for feeding a content treadmill indefinitely.

You can retain Steam Inventory without promising yourself a live-service job.

4. Your development velocity may actually be too high

That's a strange criticism, but I mean it.

PR #37 contains 53 commits spanning multiplayer architecture, PvP authority, co-op, authentication, performance, UI, Armory work and QA tooling.

That's phenomenal productivity.

It's also dangerous.

At this velocity you can move from:

idea

to

implementation

to

documentation

to

merge

before enough time exists for:

taste.

Games need incubation.

Sometimes a mechanic needs three evenings of play before you realize it should be removed.

AI-assisted development makes this even more pronounced because the production constraint that historically forced designers to say “no” has partially disappeared.

You can now make almost anything.

Therefore your new scarce resource isn't programming labor.

It's editorial judgment.

I would institute a rule:

No major system is considered successful when it merges. It is successful when it survives playtesting two sprints later.

That changes the psychology.

Merge ≠ victory.

Player behavior = victory.

5. The project needs a graveyard

This sounds funny, but I'd add one.

Something like:

docs/cut-features.md

Every removed idea goes there with one sentence explaining why.

For example:

FEATURE: X
CUT: Sprint 27
WHY: duplicated oxygen decision-making and added HUD complexity.
RESURRECT IF: multiplayer extraction requires a second cooperative resource.

Why?

Because ambitious projects frequently re-add their own bad ideas six months later when nobody remembers why they disappeared.

A graveyard creates institutional memory.

Given how many agents and documents are involved here, this would be unusually valuable.

6. You need one canonical product document

Hunker has an enormous amount of documentation.

That's generally excellent.

But I think documentation itself is becoming a form of state.

There are:

reviews
master plans
wave plans
sprint plans
worklogs
truth checks
Steam checklists
implementation guides
teardowns
narrative bibles
specs
retrospectives

The danger is document entropy.

One document says a system is absent.

A later document says it's shipped.

A third says it shipped but isn't live.

A fourth says it's live but unverified.

You've already had to add “this statement is stale” corrections in several system documents. That's not a writing failure; it's a symptom of a fast-moving project.

I would create one tiny canonical file:

PRODUCT_STATE.md

And it contains only:

Category Current truth
Core loop Playable
Act 1 Content complete / polish
Act 2 X
Co-op Beta
PvP Experimental
Steam Lobby Not implemented
Inventory Sandbox/live/etc
Backend X
Performance Known blocker X
Current milestone Vertical-slice polish
Feature freeze YES/NO
Next ship gate X

Every other design document can be historical.

But this file answers:

What is true today?

That will save enormous agent confusion.

7. Your public build strategy is currently too casual

The README says:

“The browser build above is always current — play it, then come tell us what broke.”

Great for development.

Potentially bad for the product later.

Because now you have fundamentally different environments:

browser
local Electron
Steam packaged build
production backend
Steam sandbox/account integration

They're increasingly not the same game environment.

I would formalize channels:

NIGHTLY
Everything. Breakage acceptable.

PLAYTEST
Curated weekly build.
Telemetry enabled with consent.
Known issues listed.

STEAM BETA
Release candidate.
Real Steam services.
Save migration guaranteed.

PRODUCTION
Only certified commits.
Rollback available.

PUBLIC WEB DEMO
Stable curated slice.
Never simply "latest mothership."

Especially once press or streamers discover it.

You absolutely do not want a journalist stumbling onto an always-current build 45 minutes after an agent merged something experimental.

8. Hunker needs production observability, not merely developer diagnostics

This repo has unusually good internal QA tooling.

But I searched for the sort of production systems I'd expect and didn't find an obvious crash/field analytics stack.

That's a different problem.

When 500 strangers have the game, you need to know:

Build 2.1.7
Windows 11
RTX 3060
Seed 812993
Ring 3
Engineer
Crash during chunk mount
Memory 5.4 GB
Last events:
ring-entered
hunter-spawned
chunk-requested
...

Without asking the player to become your debugger.

I'd implement privacy-conscious, opt-in or appropriately disclosed:

crash reports
performance aggregates
session length
death causes
abandon point
hardware profile
multiplayer disconnect reasons
match failures
save migration failures

And absolutely include:

build SHA + run seed.

Those two values make bug reports dramatically more useful.

9. The game needs a reliability budget

You've created performance budgets.

Create a player trust budget too.

Track:

crash-free sessions
save corruption incidents
multiplayer disconnect rate
failed joins
failed Steam auth
softlocks
progression blockers
unrecoverable UI states

Then set launch gates.

For example:

99.5% crash-free sessions
0 known save-loss bugs
0 known progression softlocks

> 98% successful lobby joins under supported conditions
> 0 unhandled promise rejections during standard playthrough

A player forgives a weak texture.

A player does not forgive losing an eight-hour save.

10. Your contributors need clearer ownership rules

CONTRIBUTING.md explains how to fork, branch and submit a PR.

It doesn't currently establish much around:

contributor IP expectations
asset submissions
AI-generated content rules
licensing of submitted music/art
whether contributors certify they own their submission
design authority
canon authority

This will matter if community contribution actually works.

Code is relatively easy.

Someone contributes:

a song
a character portrait
a lore chapter
a logo
a voice recording

and suddenly rights become significantly messier.

I'd create separate:

CODE CONTRIBUTION POLICY

and

CONTENT CONTRIBUTION POLICY

before encouraging large external creative submissions.

11. The README is selling the wrong part of the game

This is subtle.

Your README pitch currently says:

“Crash in. Scavenge O2. Upgrade your suit. Survive the depths.”

Then the feature list sells:

procedural runs
three classes
progression
Battle Pass
10 endings
multiplayer
Steamworks

That's accurate.

But after all the analysis we've done, I don't think that's what is special.

It reads like:

feature-rich survival roguelike.

The actual game we're uncovering is:

You descend farther than you should, become something you don't understand, build relationships with communities that will later have to decide whether you're human, and ultimately choose what escapes with you.

That's a much more intriguing game.

This is not merely marketing.

If your own project front page describes the game primarily as features, contributors will unconsciously build features.

If it describes an experience, they will build toward the experience.

Your README is therefore part of your design culture.

12. You need an explicit “player promise”

I'd literally put this in the repo.

Not mechanics.

Not lore.

Five promises:

Hunker Bunker promises:

Every expedition gives you a meaningful reason to risk going deeper.

Your run build changes how you solve problems, not merely your numbers.

Characters remember what you did.

Your transformation changes how the world treats you.

Getting home should feel like surviving something.

Every proposed feature gets evaluated against those.

If it strengthens none of them, it goes below work that does.

That gives agents an amazingly effective filter.

13. There is a hidden bus-factor problem—even with AI

Ironically, having lots of agents doesn't eliminate the bus factor.

Because you are the design integration layer.

The repo knows how systems work.

The docs know why individual decisions were made.

But a tremendous amount of the actual creative continuity exists in your conversations and your own judgment.

If you vanished from the project for three months, another competent programmer could maintain it.

Could they make the correct Hunker Bunker design decision?

I'm less sure.

That's why I'd create a very small:

CREATIVE_CONSTITUTION.md

containing:

the thesis
the themes
the player promise
visual rules
narrative rules
what the game is not
things never to compromise

Not hundreds of pages.

Maybe 1,500 words.

That's the document a new creative director should be able to read and say:

“I understand what belongs in this game.”

My overall new diagnosis

Previously I've been evaluating Hunker like a game.

Then like software.

Then like an award candidate.

Looking at it as a studio, I think your largest emerging risk is different:

Hunker Bunker can now produce ideas faster than it can decide which ideas deserve to become Hunker Bunker.

That is an unusual and very modern problem.

You have extraordinary implementation leverage.

The repo already has elaborate build automation, audits, world-seed reports, combat reports, Steam tooling, tests, E2E capture, soundtrack packaging and release machinery. package.json alone exposes a remarkably mature set of production scripts. CI covers presubmit, PR checks, Steam packaging, backend deployment, Lighthouse and CodeQL.

The next organizational technology you need isn't another script.

It's restraint encoded as process.

I would make the next meta-sprint about five things only:

IP/licensing boundary → canonical product state → creative constitution → release channels → production telemetry.

None directly adds fun.

But together they turn this from “an incredibly ambitious repository” into something much closer to a real studio shipping its first major game.

Yes: the most useful untouched POV is probably an indie publisher / acquisitions greenlight committee.

They would not ask whether Hunker Bunker is clever, whether the code is impressive, or whether the lore is good. They would ask:

Can we explain it, sell it, finish it, review it well, and get enough people to care?

And I think that perspective exposes a different set of problems.

The publisher's first reaction

They'd probably say:

“There is clearly a game here, but I don't yet know which game I'm buying.”

Because Hunker Bunker currently contains signals for:

survival roguelike
extraction game
narrative RPG
co-op shooter
PvP game
procedural dungeon crawler
social/faction game
Steam economy game
body-horror story
progression game
seasonal live-service structure

All of those can coexist internally.

They cannot all be equally important in the sales pitch.

A publisher would force you to establish a hierarchy.

I'd recommend:

Hunker Bunker is a narrative survival roguelike about pushing deeper into a frozen biomechanical bunker while your oxygen, body, and relationships deteriorate.

Then:

Primary: solo + co-op PvE
Secondary: narrative consequences and transformation
Supporting: progression/buildcraft
Optional mode: PvP
Platform layer: Steam inventory/etc.

That hierarchy matters tremendously.

1. They would probably tell you PvP is strategically dangerous

Not because PvP is bad.

Because PvP changes the product expectations.

Once you advertise competitive PvP, players start expecting:

matchmaking
low latency
anti-cheat
balance patches
skill fairness
population health
disconnect handling
ranked structure eventually
network authority
weapon parity
competitive readability

And suddenly reviews may evaluate your weird narrative survival game as a competitive shooter.

That's dangerous.

I'd strongly consider making PvP something like:

Invasion / rival expedition / optional high-risk mode

instead of a pillar equal to co-op.

Then Hunker doesn't need to beat dedicated PvP games at being PvP games.

It only needs to create an exciting Hunker-specific player conflict.

2. They would ask who the first 10,000 buyers are

Not:

“Who might theoretically enjoy it?”

Who specifically sees the trailer and immediately says:

That's for me.

I see a potential audience overlap around players who like:

extraction tension
roguelike builds
oppressive sci-fi
environmental storytelling
weird indie narrative
co-op survival stories

That's a good audience.

But if the store page emphasizes Battle Passes, Steam Market items and PvP equally, those players may think:

“Oh, it's some live-service multiplayer thing.”

While multiplayer-first players may think:

“Oh, it's some story-heavy single-player indie.”

You can lose both groups by being too complete.

The commercial pitch needs intentional exclusion.

It's okay for someone to look at Hunker and say:

“Not for me.”

That means the identity is strong enough to discriminate.

3. They would ask for the GIF test

This is important.

Forget a two-minute trailer.

Can you show me five seconds of Hunker Bunker and make me curious?

Right now I'm not sure the signature visual mechanic exists yet.

You need 3–5 highly legible GIF moments.

For example:

GIF 1 — One More Ring

Operator standing at bulkhead.

O2: 18%.

Door opens into a grotesque glowing biome.

RING IV — SALVAGE ×2.5

Player goes in.

That communicates the hook instantly.

GIF 2 — The body changes

Player returns to Martha.

She removes glove.

Something biological moves under the skin.

She looks at the player.

No exposition required.

GIF 3 — Extraction panic

Three co-op players sprinting home.

One down.

Hunter pursuing.

O2 alarm.

Someone goes back for them.

Ship closes.

Silence.

Those are marketing assets because they are design assets.

If the game can't create great GIFs naturally, the publisher will worry about discoverability.

4. They would ask for the streamer sentence

Another useful test:

“What causes someone streaming Hunker to yell?”

This is different from what makes the game sophisticated.

Maybe:

“NO, DON'T OPEN IT—WE HAVE 12% OXYGEN!”

or:

“WAIT, MARTHA KNOWS.”

or:

“THAT THING FROM THREE RUNS AGO IS BACK.”

or:

“Leave me! Take the relic!”

That tells you where virality could come from.

The game needs situations that naturally generate reactions, not just systems worth explaining.

5. They would probably want you to reduce the number of advertised endings

This sounds backwards.

Ten endings are impressive.

But:

10 ENDINGS

is mostly a feature-count statement.

A publisher might prefer:

Every relationship and compromise determines who can leave Cocytus IV with you.

That's emotionally intelligible.

The number ten can exist in the FAQ.

Sell the consequence, not the database cardinality.

Same principle for:

43 soundtrack tracks
60-item catalogs
50 Battle Pass tiers
24 achievements

Those numbers are impressive internally.

They're mostly weak consumer hooks.

6. They would ask whether the game has a "demo lie"

Meaning:

Is the first 30 minutes representative of why the full game is special?

A lot of games have a demo problem.

The most unique systems happen five hours in.

The demo contains:

walk
shoot
loot
tutorial
basic enemies

Then the player thinks:

“I've played this before.”

That would be disastrous for Hunker Bunker.

The demo needs an accelerated micro-version of the transformation/consequence hook.

Don't spoil the full reveal.

But the player should see something impossible.

Maybe one camp relationship.

One hive interaction.

One depth gamble.

One rare build interaction.

One disturbing sign that the player's suit/body is not what they assumed.

The demo should end with:

What the fuck is happening to me?

not:

“Cool procedural shooter.”

7. Price positioning would matter more than you might expect

Hunker Bunker risks sitting between perceived categories.

If it looks like an indie roguelike but asks AAA-adjacent money, players become ruthless.

If it looks enormous but launches too cheaply, players may interpret that as lack of confidence or expect live-service monetization to compensate.

I'd rather see the game become:

dense, authored, replayable, premium

than enormous.

The perceived value should come from:

“I got 25 hours and I still haven't seen everything.”

not:

“There are 87 systems.”

8. They would identify review-score landmines

Publishers think about what reviewers will put in the negative paragraph.

For Hunker, I can already imagine:

“Its fascinating world is undermined by uneven combat.”

“The procedural environments become repetitive.”

“Multiplayer feels bolted onto a game designed around solitary exploration.”

“The abundance of progression systems obscures its strongest narrative ideas.”

“Performance problems interrupt otherwise tense expeditions.”

“Its Steam economy feels oddly out of step with its intimate horror story.”

Those hypothetical review sentences are extremely useful.

Because you can design specifically to prevent them.

I'd literally maintain a document called:

PREDICTED_REVIEW_COMPLAINTS.md

And kill them one by one.

That's a very publisher-ish way of thinking.

9. They would ask what gets cut when you're six months late

This question tells you what the game actually is.

Suppose launch is threatened.

Which survives?

For me:

KEEP NO MATTER WHAT

One More Ring depth gamble
oxygen/extraction
transformative run builds
three excellent human camps
three hive mirrors
body transformation
Queen/endgame
strong solo experience
co-op
performance
great combat feel

CUT BEFORE DELAYING CORE QUALITY

huge marketplace breadth
seasonal content obligations
competitive PvP scope
extra minor modes
unnecessary cosmetic categories
additional endings after the strongest set
side minigames beyond finished commitments
enormous secondary progression systems

That's your actual product hierarchy.

10. They would care enormously about "finishability"

This is probably the biggest difference from every POV we've used.

An acquisitions person doesn't merely ask:

“Can this become amazing?”

They ask:

“Can this become amazing before the developer exhausts themselves?”

Hunker Bunker is incredibly ambitious.

The danger isn't failure of capability.

The danger is successive competence:

you keep proving you can build another thing.

And therefore the project keeps earning permission to become larger.

That's exactly how games never finish.

A publisher might therefore impose a content lock:

No major new pillars after Vertical Slice 2.

You can deepen.

You can polish.

You can replace.

You can cut.

But you don't add another box to the back of the package.

That may be one of the healthiest restrictions possible for this project.

11. They would force you to build the trailer before the game is finished

Not because marketing comes first.

Because a trailer is an extraordinary design diagnostic.

Try making a 60-second trailer right now with this structure:

0–5 sec
Something instantly strange.

5–15 sec
Core physical fantasy.

15–25 sec
One More Ring decision.

25–35 sec
Combat/build escalation.

35–45 sec
Characters / transformation.

45–55 sec
Co-op disaster / Queen / horror escalation.

55–60 sec
Ship closes.

Silence.

Title:

HUNKER BUNKER

If you discover:

“I don't have good footage for seconds 25–45,”

you just discovered where the game is weak.

That's extremely valuable.

12. The commercial hook may actually be this juxtaposition

Here's something I don't think we've articulated before.

Lots of games offer:

greed versus safety.

Lots offer:

body horror.

Lots offer:

relationship consequences.

Lots offer:

procedural co-op.

But Hunker could combine:

A mechanically greedy game and an emotionally intimate game.

That's unusual.

During the expedition:

“Go deeper. Get richer. Become stronger.”

At camp:

“Sit down. Take your glove off. Tell me what happened.”

Then later:

the thing making you stronger is the thing destroying your relationships.

That's a very marketable contradiction.

Your power fantasy becomes the horror story.

The player wants the mutation because it's mechanically incredible.

But characters they're attached to become increasingly frightened of it.

Now progression itself creates narrative tension.

That's strong.

If I were deciding whether to fund it

My greenlight note would probably be:

CONDITIONAL YES.

Strong original world, unusual narrative potential, unusually capable technical execution, and a potentially excellent “one more ring” survival hook.

Primary risk is not technical capability. Primary risk is product dilution caused by excessive feature breadth.

Before full production commitment, prove a 30–45 minute vertical slice where:

combat feels excellent;
the player willingly risks extraction to go deeper;
one build modifier changes their behavior;
one camp character creates genuine attachment;
the body/transformation mystery appears;
one procedural run produces a memorable story;
co-op creates a clutch decision;
performance is invisible.

If you prove those seven things, I'd feel much better about the project than if you showed me another hundred completed features.

Because from the publisher POV, Hunker's biggest question isn't:

“Can you build this?”

You've answered that repeatedly.

It's:

“Can you stop building long enough to discover exactly what we're selling?”

And I think that's a meaningfully different problem from the ones we've been attacking.

Other unexplored perspectives that could produce very different feedback would be a professional game critic, a Twitch/YouTube creator, a speedrunner/system exploiter, a cognitive-psychology UX researcher, or a hostile Steam reviewer doing a refund-window evaluation. Each would expose a completely different set of weaknesses.

The ones I think would be most valuable now are:

The hostile Steam refund-window player. They give Hunker exactly 90 minutes and are actively looking for a reason to quit. This exposes boot friction, tutorial drag, unclear goals, bad first weapons, visual confusion, “why should I care?” moments, and anything that feels cheap before the deeper systems reveal themselves.
The cognitive-psychology / behavioral UX researcher. They ignore whether features are “cool” and study attention, working memory, reward anticipation, loss aversion, information overload, habit formation, spatial memory, decision fatigue, and whether “one more ring” actually produces the psychological push-pull we think it does. This could radically improve HUD, oxygen pressure, loot rarity, camp pacing, and run rhythm.
The systems exploiter / speedrunner. Their goal is to break the game, not experience it properly. They will find dominant builds, movement exploits, oxygen skips, infinite-economy loops, AI manipulation, boss cheese, animation cancels, save abuse, reconnect exploits, and places where the “interesting decision” actually has one mathematically correct answer. This perspective is especially important now that Hunker has so many interacting systems.
The professional narrative editor rather than a game writer. They would examine scene order, dramatic irony, character desire, reversals, thematic repetition, subtext, exposition load, whether characters actually change, and whether Act 2 is a consequence of Act 1 rather than merely following it. They'd probably cut a lot of lines while making the story feel bigger.
The cinematographer / visual-composition director. Not an art director. They ask where the player's eye lands every second: silhouette, value grouping, focal hierarchy, staging, negative space, camera motion, reveal timing, door framing, lighting contrast, and whether a screenshot communicates danger without UI. This could help enormously with the current “systems are there but the game still lacks juice” issue.
The audio dramaturg. Different from a sound designer. They would treat silence, breathing, machinery, music entry, dynamic range, sonic foreshadowing, distance, voice proximity, and recurring motifs as storytelling structure. Hunker might gain more atmosphere from strategically removing audio than adding another hundred sounds.
The accessibility consultant who actually plays with assistive needs. Not simply checking a feature matrix. They would test whether combat information survives without color, whether dialogue works with hearing loss, whether low vision makes your beautiful dark environments miserable, whether motor limitations break hold/timing interactions, whether cognitive load spikes during HUD clutter, and whether your “sensual” bodily storytelling remains legible through alternate channels.
The localization/culturalization director. They would expose something we've barely touched: Hunker currently relies heavily on terse English, wordplay, institutional language, metaphor, typography and voice register. They'd ask whether UI expansion can tolerate German, whether mixed-case/CAPS carries meaning across scripts, how “carrier,” “manifest,” “suture,” “Tallow,” etc. translate, and which cultural assumptions are buried in Horizon/camp politics. Preparing for localization often improves the original English design too.
The community manager six months after launch. They would ask what players will fight about, misunderstand, meme, demand, exploit, spoil, datamine, accuse of being pay-to-win, expect patches for, and organize around. This lens would probably change how you structure PvP, Steam items, patch notes, spoiler handling, Discord, moderation and roadmap promises before they become fires.
The archivist / preservation engineer. Weirdly useful for this project. Hunker depends on Electron, Steamworks, a backend, online services, generated content and many runtime integrations. They'd ask: Can Hunker still be played in 2036? Does single-player survive if the relay disappears? Can an old build load its saves? Is the ending content dependent on a server? Can Steam API failures degrade gracefully? Award-winning indies often become long-lived cultural objects; preservation should not be an afterthought.

There are also some more unusual lenses that could be surprisingly productive: a horror-film director would examine dread and withholding rather than mechanics; an economist would analyze every resource and incentive; an anthropologist would ask whether Meridian/Tallow/Vesper actually behave like societies rather than quest hubs; an intimacy coordinator could help with the bodily/sensual material so it remains deliberate rather than accidentally exploitative; a tabletop RPG designer would look for emergent stories and meaningful choice spaces; and a toy designer would ask whether simply moving, shooting, opening doors, manipulating machinery, and touching the world are pleasurable even without progression.

The three I would do next, because I think they'll give us genuinely new discoveries, are the hostile 90-minute Steam player, the cognitive-psychology researcher, and the systems exploiter/speedrunner.

Those three attack Hunker from opposite directions:

Does it hook me before I refund it?
Why does my brain want another run?
Can I destroy the intended game by understanding it too well?

If Hunker survives all three, we learn something much more useful than whether another expert thinks it's “good.”

Yes. One last teardown, with sunk cost removed from the equation:

Hunker Bunker is worth continuing — but not because it is large

If I inherited this repo tomorrow with no emotional attachment to it, I would not continue because it has Steam integration, multiplayer, 10 endings, a 50-tier pass, dozens of items, procedural generation, 1,600+ tests, or a giant amount of code.

Those are assets. They are not the reason to make the game.

I would continue because buried inside all that machinery is a genuinely strong game concept that is only partially realized:

Go farther than you safely should. Become stronger by becoming less certain of what you are. Return to people who remember what you did and increasingly struggle to recognize you. Decide what—and who—you bring home.

That is worth finishing.

And I think the project itself has already diagnosed the same problem: its writing is “better than the game knows,” with the conspiracy, Queen/carrier arc, and camp societies often running alongside each other instead of becoming one experienced story.

That is the entire situation in miniature.

The good game exists. The player isn't feeling enough of it.

What I would throw away mentally

Pretend these achievements do not count:

number of systems
number of items
number of tests
number of endings
Battle Pass tiers
Steam Inventory breadth
technical complexity
amount of documentation
development velocity

They are sunk effort.

The only question is:

Would somebody who doesn't care how hard this was to make want another run?

At this moment, I think the answer is probably:

Sometimes. Not reliably enough yet.

That's the problem to solve.

The strongest thing in the project

It isn't actually oxygen.

It isn't the Queen.

It isn't camps.

It isn't procedural generation.

It's the collision between greed and identity.

Mechanically:

The game encourages me to keep going because deeper means more power.

Narratively:

The power I acquire is changing me.

Socially:

The people I care about can see the change.

Eventually:

What was originally progression becomes the central horror.

That's excellent.

Imagine getting a mutation that is fantastic mechanically.

You love it.

Maybe alien tissue starts regenerating health.

Then you return to Tallow.

Martha sees it.

She becomes afraid.

And for the first time the player realizes:

Oh. The build I am excited about is the thing she is terrified of.

That is Hunker Bunker.

Not another +12% upgrade.

Not another gun.

That contradiction is the game I would protect above everything else.

The second reason it's worth continuing: you have real characters

This is rarer than it seems.

Kaelen, Martha, Briggs, Nahl, Vey and Rhun already have distinct linguistic identities. Your narrative audit correctly identified that as one of the strongest parts of the writing.

And more importantly, we've now uncovered a beautiful structural pairing:

Kaelen / Vey
truth versus constructed signal.

Martha / Nahl
care versus transformation.

Briggs / Rhun
protection versus oath.

Human answer.

Alien answer.

Player caught between them.

That's not generic lore.

That's a real thematic architecture.

I would deepen six characters before creating sixty more.

The third reason: the game can produce stories

Hunker is already technically capable of tracking:

world state
faction decisions
build state
class
depth
death
infection
boss outcomes
camp relationships
hive relationships
multiplayer players
procedural geography

That's enormously useful.

The problem is that today a lot of those variables are system state.

The finished game should turn them into sentences players tell friends.

Not:

“I got Tallow bond level 3.”

But:

“Martha hid my infection from Briggs because I'd saved her people three runs earlier.”

Not:

“We had an elite spawn.”

But:

“We had enough oxygen to leave, but there was a legendary relic one ring down. We went for it, my friend got dropped, and I had to decide whether to leave him.”

That is where procedural games become memorable.

Now the bad news

The current Hunker Bunker has too much middle.

It has beginnings of lots of excellent ideas and infrastructure around them.

But the space between:

input

and

emotion

is often too long.

Shoot enemy
→ system resolves damage
→ eventually enemy dies.

Instead of:

Shoot
→ recoil
→ impact
→ stagger
→ armor cracks
→ enemy changes behavior
→ audio confirms
→ environment reacts.

Likewise:

Support camp
→ state changes.

Instead of:

Bring medicine
→ lights come back on
→ injured person returns
→ Martha remembers
→ later that person dies because of another decision.

The project needs to convert state into sensation and consequence.

I would stop expanding the outer perimeter immediately

Hunker's README currently presents procedural runs, three classes, deep progression, Battle Pass, ten endings, multiplayer and Steam integration as parallel major features.

That breadth is now working against the strongest game inside it.

I would freeze:

Season Pass expansion

Keep the code. Don't feed it.

Steam marketplace/economy expansion

Make existing cosmetics work correctly. Stop adding breadth.

Competitive PvP development

Keep the mode experimental.

Additional story mini-games

RGB gets finished because it's already meaningful. No RGB2.

New endings

Ten is plenty.

New currencies

No.

More minor factions

No.

Huge new enemy catalog

Improve roles before count.

More progression layers

Definitely no.

You have enough horizontal game.

Everything from here should go downward.

Depth, not breadth.

Fittingly.

The game I would actually ship

I would reposition the target mentally as:

A premium solo/co-op narrative survival roguelike.

12–20 hours for a strong first completion.

Much longer for alternate relationships, builds, classes, secrets and endings.

PvP is optional experimentation.

Steam inventory is supporting infrastructure, not the game's identity.

That product is finishable.

And potentially excellent.

The single biggest thing to build now: the Proof Run

Stop thinking about Acts for a moment.

Make one expedition so good that it proves the whole project.

Approximately 35–45 minutes.

It should contain:

Ship

Safe.

Quiet.

Player chooses class/build.

Ring 1

Immediate satisfying combat.

Readable enemies.

Easy oxygen.

One small choice.

Human camp

Preferably Tallow.

Real physical scene with Martha.

Player performs work rather than receiving exposition.

The relationship begins.

Ring 2

First dangerous depth choice.

Rare upgrade.

Build starts changing.

Hive

Nahl.

Something recognizably alien but unexpectedly gentle.

Player's understanding of enemies changes.

Ring 3

Oxygen begins creating genuine tension.

Enemy combinations require tactical adaptation.

The Director creates a surprise.

Transformation beat

Something impossible happens to the player's body.

Not fully explained.

And crucially:

it helps them.

Extraction decision

Enough loot to leave.

Something extraordinary one ring deeper.

The game explicitly tempts them.

Ring 4

Real danger.

Signature enemy/Hunter.

Build gets pushed.

O2 crisis.

Escape

Panic.

Return

Ship door.

Silence.

Breathing settles.

Rewards bank.

Then Martha or Mothership reacts differently because of what happened.

One final sting

Something about the player is no longer normal.

Deploy Again.

If that is fantastic, keep making Hunker.

If we cannot make that fantastic, I would seriously reconsider the project.

That's the test.

And I would make combat the first thing that gets fixed inside it

Because narrative sophistication cannot save a game whose primary verb isn't fun.

I want a gray-box test where there is:

no loot
no story
no progression
no procedural generation

Just:

player
gun
three enemies
walls

And it should be enjoyable.

Every weapon needs:

weight
recoil
sound identity
muzzle behavior
reload rhythm
hit feedback
enemy reaction
distinct purpose

Every enemy needs:

a recognizable silhouette
a recognizable sound
a tactical demand

The project already has systems for phase-driven bosses and encounter analysis; what's missing is not mathematical existence but consistent visceral payoff.

Until that happens, I would not add another combat system.

The next biggest improvement is run builds

This is where I think Hunker currently leaves a lot of replayability on the table.

The player should regularly finish a run saying:

That build was disgusting.

And builds should collide with Hunker's themes.

Not just:

+10% damage

but:

LAST BREATH

Below 20% O2, weapon damage doubles.

Now oxygen becomes temptation.

PARASITE

Kills heal you.

Human medicine stops working.

Now progression affects story.

FALSE SKIN

Humans detect infection more slowly.

Hive creatures recognize you faster.

Now buildcraft affects relationships.

VESPER DOCTRINE

Empty magazines explode when discarded.

Now reload behavior changes.

SUTURE

Reviving someone permanently links part of your health pools for the run.

Now co-op relationship becomes mechanics.

Those kinds of upgrades can make this game sing.

Next: make oxygen into temptation rather than taxation

O2 currently has the raw ingredients of the hook.

But survival timers become annoying when the player experiences them primarily as:

“Time to go back.”

Instead the desired emotional state is:

“I know I should go back.”

Huge difference.

Depth should visibly increase:

reward multiplier
rarity
secret probability
mutation quality
encounter uniqueness
narrative revelation

while increasing:

oxygen exposure
escape distance
enemy threat
risk to current haul

Then leaving becomes a decision.

That is much more powerful than simply surviving the meter.

Next: make every camp physically change

This is cheap relative to what it produces.

When you improve Tallow:

more plants
more light
better food
people sleep safely
steam flows correctly

When it deteriorates:

beds empty
pipes leak
lights dim
NPCs disappear
medicine gets rationed

Meridian:

infrastructure comes alive or begins behaving incorrectly.

Vesper:

defenses improve, then eventually point inward.

Don't make the player open a faction screen to discover consequences.

Put the consequence in the room.

Next: make transformation impossible to ignore

No giant infection percentage.

Use everything.

Movement changes.

Breathing changes.

Suit voice changes.

Enemies hesitate.

Sensors misclassify.

Martha touches your wrist.

Briggs watches your pupils.

Kaelen sees impossible telemetry.

Nahl talks to you differently.

Your shadow changes.

A Steam screenshot taken early and late should show that the same character has become something else.

Then the player's build is also their narrative arc.

Next: kill the stutters

This is less romantic, but absolutely necessary.

Recent work still documents an unexplained multi-second freeze and recurring synchronous chunk-mount hitches.

You cannot build sustained dread if the game freezes.

You cannot make extraction exhilarating when combat hitching breaks player trust.

I would accept less visual complexity before accepting bad frame pacing.

Performance is part of game feel.

There is one thing I would change about how you develop it

Stop asking:

What can we add next?

Start asking:

What existing thing deserves to become unforgettable?

Take:

a door.

Make opening certain doors great.

Take:

Martha.

Make one Martha scene great.

Take:

the rifle.

Make firing it great.

Take:

an oxygen warning.

Make 10% O2 terrifying.

Take:

one rare relic.

Make seeing it exciting.

Take:

one enemy.

Make players hate hearing it approach.

Take:

one extraction.

Make players cheer when that ship door closes.

An award-quality game is often thousands of specific decisions made extraordinary.

Not thousands of features.

What I think is currently fake value

Not fake because it doesn't work.

Fake because it makes the project look farther along than the actual player experience is.

1,600 tests

Excellent engineering.

Doesn't make combat fun.

10 endings

Excellent narrative breadth.

Doesn't make a player care about one ending.

60 Steam items

Excellent infrastructure.

Doesn't make one relic exciting.

Procedural generation

Excellent technology.

Doesn't guarantee one memorable room.

Multiplayer synchronization

Excellent achievement.

Doesn't create one great cooperative story by itself.

43 music sources

Excellent library.

Doesn't guarantee one emotionally perfect music transition.

The work wasn't wasted.

But the next step is converting those assets into experience.

What is real value

These are the things I think would survive even if you deleted half the project tomorrow:

1. One More Ring

A very understandable mechanical temptation.

2. The transformation

Progression becoming horror.

3. The camps and hives

Human and alien philosophies responding to the same changing player.

4. Carrying

What you physically carry.

What you're infected with.

Whose burdens you carry.

Who gets carried out.

What ideology you carry.

What eventually carries you.

Your own narrative review already noticed how load-bearing that language is in the ending material.

5. Cocytus IV

Frozen industrial isolation + buried biological life + failed corporate infrastructure is coherent enough to support a whole game without requiring endless lore.

Those are your franchise-level assets.

My condition for continuing

I would continue Hunker Bunker.

Strongly.

But only under this agreement:

For the next major milestone, adding new breadth is considered failure.

Success is:

existing combat becomes dramatically better;
one expedition becomes dramatically better;
one camp becomes dramatically deeper;
one hive relationship becomes dramatically stranger;
oxygen produces actual bad decisions;
run builds become memorable;
transformation becomes visible;
extraction becomes cathartic;
performance becomes invisible.

That's enough.

The roadmap I'd actually use now

1. Freeze scope.

No new pillars.

2. Build the Proof Run.

One perfect 35–45 minute expedition.

3. Combat Feel Pass.

Make basic shooting/movement worth playing.

4. One More Ring economy.

Explicit increasing temptation.

5. 12–20 transformative relics.

Not 100 stat upgrades.

6. Tallow + Nahl vertical slice.

Human care versus alien healing.

7. Transformation presentation.

Body, sound, HUD, NPC reactions.

8. Signature Hunter.

One enemy people remember.

9. Extraction ritual.

Build the emotional release.

10. Performance gate.

No meaningful traversal/combat stalls.

Then blind-test it.

Don't explain Hunker beforehand.

Afterward ask the player:

Why did you go deeper?

Who do you remember?

What happened to your character?

Tell me about your build.

Tell me about the scariest moment.

Did you ever know you should leave and go anyway?

Do you want another run?

If they spontaneously talk about:

Martha

their mutation

their ridiculous build

running out of oxygen

something that hunted them

barely making it home

then you've got it.

And that's what makes it worth continuing.

Not the enormous repo.

Not what has already been spent.

Not Steam.

Not the technical achievement.

It's worth continuing because there is a version of Hunker Bunker hiding inside the current game where the player loves becoming more powerful and slowly realizes that becoming more powerful is exactly what they should be afraid of.

And when they realize that, the people they've learned to care about are standing there watching it happen.

That is a game with something to say.

Now I would stop making Hunker Bunker bigger and finally make that game impossible to forget.

The psychology researcher says:

Make the player desire the dangerous choice.

The speedrunner says:

Make sure there isn't one boring correct answer.

The cinematographer says:

Make the thesis visible.

The audio director says:

Make it audible.

The hostile Steam player says:

Prove it immediately.

The publisher says:

Sell that and nothing else.

The studio director says:

Stop adding things that dilute it.

And the final teardown says:

The thing worth finishing is already inside the game.

So I would name the entire next development era:

HUNKER BUNKER: ONE MORE RING

Not as a DLC name.

As the internal mandate.

Take the huge systems-rich project that exists today and force every major system—combat, oxygen, loot, procedural generation, transformation, narrative, audio, camps, hives and multiplayer—to serve the same player experience:

I should go home.

But I want to see what's one ring deeper.

And every time I make that choice, I come back a little less certain that home will still recognize me.

That is the version of Hunker Bunker I would organize the entire project around now.
> **Historical Sprint 25 design/check-in transcript.** It is retained for
> creative provenance, not current status. Use
> [`planning/repository-roadmap.md`](planning/repository-roadmap.md) for the
> current disposition of its ideas.
