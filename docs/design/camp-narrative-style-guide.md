# Camp & Hive Narrative Style Guide

Source: distilled from `docs/sprint25.checkin.md`'s narrative-direction
conversation. This is a writing-craft reference for future camp/hive dialogue
work in `src/npcDialogueTrees.js`, `src/sideStorySystem.js`, and `src/camp.js`
— not new dialogue content itself. Writing 15+ new scenes across six
characters is a creative-authoring task for the user to drive (or explicitly
delegate scene-by-scene); this doc is the rulebook so that work stays
consistent once it happens.

## The narrative north star

**Everyone on Cocytus IV wants custody of your body.** Horizon calls it
corporate property. The Mothership calls it an operator. The camps call it a
survivor. The Queen calls it a carrier. The hives recognize it as kin. The
suit constantly measures it. The player's arc is deciding: *who gets to tell
me what I am?*

This reframes existing systems as body-ownership metaphors, not just
mechanics:
- Oxygen = control of breath.
- Armor = ownership of the body.
- Infection = transformation.
- The manifest = deciding which bodies deserve transport.
- CARRYING (already load-bearing vocabulary in the game's ending material,
  per `project_secret_sauce_review` in memory) becomes the central metaphor:
  what you carry, what you're infected with, whose burdens you carry, who
  gets carried out, what you carry home.

## The power triangle

| Camp | Power | Promise | Threat |
|---|---|---|---|
| Meridian / Kaelen | Infrastructure | "We can make the world work." | Everything becomes measurable |
| Tallow / Martha | Care | "We can keep you alive." | Care can become custody |
| Vesper / Briggs | Violence | "We can keep danger out." | Eventually you may be the danger |

And the alien mirrors, each answering the same question from the other side:

| Human | Alien mirror | Shared question |
|---|---|---|
| Kaelen | Vey | Who controls information? |
| Martha | Nahl | What does healing entitle you to? |
| Briggs | Rhun | What does protection require? |

Every major relationship should eventually offer a *different* answer to:
**what does loving/caring for/protecting someone entitle you to do to them?**
The Queen and Mothership both answer "everything" (possessive). Martha's arc
should land on the thematic counterpoint: *I care for you, therefore I
refuse to own you.*

## The five-beat scene structure (formal rule, apply to every important scene)

| Beat | Function |
|---|---|
| Body | Establish a physical sensation |
| Work | Give characters something real to do with their hands |
| Power | Establish who can permit/deny/protect/expose |
| Intimacy | One character sees something usually hidden |
| Choice | Player decides how much access to grant |

Concretely: replace exposition dumps ("Here is my worldview. Tell me more.
Here is additional lore.") with scenes where labor precedes confession —
characters talk *while doing something physical* (throwing a breaker, tying
a root bundle, clearing a weapon), and the dialogue is what happens alongside
the work, not instead of it. Fewer, denser scenes beat more, thinner ones.

## Dialogue typography rule

Distance from the player maps to case:

- **ALL CAPS** — radio / transmitted / authority / performance register
  (`BRIGGS: HOLD POSITION. WE HAVE MOVEMENT EAST.`)
- **Mixed case, in-person** — normal proximity (`Briggs: Don't move.`)
- **Quiet, private** — the closer someone gets emotionally, the quieter the
  text should read (`Briggs: I know what you are.`)

This is already partially the game's own idea (see the "CAPS as transmitted
speech" note the source conversation attributes to an earlier narrative
review) — this doc formalizes it as a rule for any future dialogue file, so
it can be checked in review rather than re-derived per writer.

## Sensual-writing rule: sensation + restraint, not declaration

Don't write `Martha sensually touches the Operator` or `There is sexual
tension between Briggs and the player.` Write the specific physical detail
and let restraint do the work:

> Her fingers stop at the edge of the seal. "May I?" The glove unlocks with
> a soft pressure hiss.

Implication beats declaration, throughout. "Sensual" here means the world is
*sensuous* — warmth, cold, breath, pressure, fabric, contact — not
necessarily sexual. Bodies are always present in the writing; infection
status is something a character *feels* about the player ("You're warm. Too
warm.") rather than a stat readout the writing describes from outside.

## Per-character arc shape (four-beat pattern, repeat per relationship)

1. **First encounter** — establishes what the character's power lets them
   ask of the player (Kaelen: "stand there again, the relay sang when you
   crossed it" / Martha: won't open a dialogue menu until she's given you
   water / Briggs: "finger. off the trigger.").
2. **Second encounter** — trust built through shared work, not exposition
   (physical labor together; the character's tone changes as a *behavior*,
   not a stated trust value — Briggs stops pointing his weapon at you on
   entry, rather than a "BRIGGS TRUST +1" popup).
3. **Third encounter** — the character notices the transformation through
   something small and physical (a doubled heartbeat, unexplained warmth, a
   wrong blink) rather than a scanner/plot alert.
4. **Post-reveal** — the character's answer to the "what does this entitle
   me to do to you" question gets tested for real (Kaelen's jealousy of the
   machine noticing the player more than him; Martha choosing care without
   ownership; Briggs's gun not firing, or firing, entirely earned by what the
   player actually did with him — not an invisible bond number).

Apply the identical four-beat shape to Vey/Nahl/Rhun, phrased through their
own register (signal/forged identity for Vey; tissue/transformation for
Nahl; oath/obligation for Rhun) rather than reusing the humans' vocabulary.

## Status

This is a reference document, not a content backlog with tickets — the next
action is the user (or a future writing-focused pass) picking one arc (the
source doc's own recommendation is Tallow/Martha + Nahl, "human care versus
alien healing," as the highest-value vertical slice) and drafting scenes
against the five-beat structure above, checked against the typography and
sensual-writing rules before landing in `src/npcDialogueTrees.js` /
`src/sideStorySystem.js`.
