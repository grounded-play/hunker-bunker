# RGB: Riverside Global ’Botics

Design package for an unlockable Hunker Bunker story mini-game.

## One-line pitch

After Hunker Bunker exposes the human cost hidden inside a machine’s training
data, the player unlocks **RGB**, a 45–60 minute point-and-click tragedy about
warehouse technician Elias Morales trying to recover his labor, his dignity,
and his daughter’s medicine before an automated system closes every door.

## Player promise

- Explore six compact, high-contrast scenes.
- Inspect, combine, and apply a small inventory of meaningful objects.
- Manage time, injury, money, and evidence without turning poverty into a score.
- Teach Robot 4A one humane action, then discover whether it remembers.
- Reach one of three endings; dangerous sequences can cause two retryable game
  overs.

## Place in Hunker Bunker

RGB is an unlockable **Archive Simulation**, not a literal event on Hunker
Bunker’s ice world. The recovered record is an old worker-training dataset
whose “calibration source” was a real person. That frame connects RGB’s themes
to Hunker Bunker’s existing questions about copied memory, ownership,
automation, and what is allowed to leave.

The mini-game appears as `ARCHIVE SIM: RGB` on the title menu after its unlock
condition is met. Its progress is saved separately from an active bunker run.

## Canonical documents

- [Game design](game-design.md): scope, player loop, tone, and rules
- [Unlock and integration](unlock-and-integration.md): how it fits the repo
- [Scene flow](scene-flow.md): playable chapter-by-chapter specification
- [Narrative script](narrative-script.md): cleaned story and dialogue spine
- [State and endings](state-and-endings.md): state model, gates, and outcomes
- [Asset manifest](asset-manifest.md): production-ready visual/audio list
- [Production plan](production-plan.md): implementation and asset work lanes
- [Cinematic branch prompts](cinematic-branch-prompts.md): aligned choices,
  first/end frames, and start-to-end video prompts
- [On-rails cinematic prompts](cinematic-rail-prompts.md): unavoidable
  connective shots before, between, and after player choices
- [Video-to-still transition bible](video-to-still-transition-bible.md):
  first-frame, action, landing-frame, return, branch, and convergence map for
  producing continuous motion around every playable interstitial

RGB inherits the game-wide
[Steam Deck-first display and input specification](../../steam-deck-first-display-and-input-spec.md).
It is a buried dream/archive sequence within Hunker Bunker, not a separate app
or platform shell.

## Status

Implemented and playable. `src/minigames/rgb/` holds the runtime, and
`public/minigames/rgb/` holds the produced art, cinematics, ambience, SFX, and
voice. The rough source remains at `docs/story_mini_games.md` for provenance.

Chapters are authored as **staged waves**: each wave gates on the previous one
so at most a few choices are ever live at once, and chapter exits additionally
gate on `requires.minVisitedOf` so a chapter cannot be skipped past the beats
that give its decision meaning. See
`docs/superpowers/specs/2026-07-26-rgb-chapter-flow-and-narrative-design.md`.

Outstanding: three inventory icons are generated placeholders pending final
art, listed in `public/minigames/rgb/ASSET_PROVENANCE.md`.
