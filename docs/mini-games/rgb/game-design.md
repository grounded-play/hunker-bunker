# Game Design

## Identity

**Display title:** RGB: Riverside Global ’Botics  
**Hunker Bunker label:** ARCHIVE SIM: RGB  
**Format:** Single-player point-and-click narrative mini-game  
**Target length:** 45–60 minutes on a first play, 25–35 on replay  
**Target input:** Steam Deck/controller first; keyboard and mouse parity  
**Content tone:** Adult workplace horror; grounded, intimate, and unsentimental

The name RGB is ironic. Almost the entire game is black, white, and industrial
gray. Scanner lights, corporate screens, and warnings are red. Warm color
arrives only when the controlled system is irreversibly broken.

## Design pillars

### Labor is knowledge

Elias does not win because he finds a magic key. He reads machines, notices
weight, remembers error codes, and understands where a system is fragile.
Every central puzzle should express competence learned through work.

### Bureaucracy is the antagonist

There is no cackling villain. Separate “neutral” systems—metrics, incident
review, benefits, payroll, and pharmacy billing—combine into violence while
each denies responsibility.

### Resources create pressure, not moral judgment

Time, money, pain, and evidence alter available options. The game must never
imply that Elias fails because the player budgeted badly. Resource pressure
shows how little margin the system gives him.

### The machine remembers gentleness

The double-tap calibration is introduced as ordinary work, rehearsed as a
puzzle, and paid off in the finale. Robot 4A does not become human; it repeats
a humane lesson Elias embedded in it.

## Inspiration translated into original mechanics

From classic resource-travel games, RGB borrows visible scarcity, elapsed-time
pressure, and decisions made with incomplete margins. It does not copy a
journey structure or punish the player with arbitrary illness.

From somber inventory adventures, RGB borrows environmental storytelling,
small-item puzzles, terminal interactions, and irreversible moral choices. It
does not use verb-command clutter, obscure combination chains, or comedy logic.

## Core loop

1. **Observe:** Sweep hotspots and hear Elias’s concise interpretation.
2. **Collect:** Acquire a small number of persistent, story-bearing items.
3. **Connect:** Apply an item, clue, or learned gesture to a machine or person.
4. **Choose:** Trade time, pain, evidence, or safety for a possible advantage.
5. **Consequences:** Update the world and carry the result into a later scene.

There should be no pixel hunting. Controller focus reveals all nearby
hotspots, and holding the focus action briefly reveals every hotspot in the
current scene.

## Interaction grammar

| Action | Keyboard / mouse | Steam Input action |
| --- | --- | --- |
| Move focus | Pointer / arrows / WASD | `archive_focus` |
| Inspect | Click / `E` | `archive_confirm` |
| Open inventory | `Tab` | `archive_inventory` |
| Select or use item | Click / `Enter` | `archive_confirm` |
| Cancel / back | `Esc` | `archive_back` |
| Reveal hotspots | Hold `Q` | `archive_reveal` |
| Pause | `Esc` | `pause` |

RGB must use Hunker Bunker’s semantic action layer rather than physical button
numbers. It inherits the fixed 1280×800 stage, safe frame, glyph service, and
aspect-preserving scaling from the game-wide display/input specification.

## Resources

- **Time:** Advances at authored decision points, not continuously while the
  player reads. It controls lateness, the HR cutoff, and kiosk options.
- **Pain:** `stable`, `injured`, or `severe`. It changes animation, narration,
  and the finale’s timing assistance.
- **Money:** Presented honestly as insufficient. It can pay for transit or a
  small pharmacy deposit, but cannot simply solve the story.
- **Evidence:** Camera discrepancy, notebook records, and Marisol’s witness
  state can unlock the strongest ending.
- **4A trust:** Built by careful calibration and refusing a destructive
  shortcut. It controls how much assistance the player receives in the fire.

## Difficulty and accessibility

- Timers pause while dialogue, inventory, or pause menus are open.
- Every timed interaction has a non-timed accessibility mode.
- Quick-time sequences use large focus targets and input buffering.
- Failure returns to the start of the current sequence, never the whole game.
- Subtitles identify speakers and important machine sounds.
- Red-only signals also use shape, label, and animation.
- Flashing fire/strobe sequences respect reduced-flash and screen-shake
  settings.
- A recap screen states the current goal, known facts, and consequential
  choices without revealing future outcomes.

## Scope boundaries

Version one contains six playable chapters, three endings, two retryable game
overs, approximately 25 inventory/hotspot interactions, and no free walking.
It does not contain combat, procedural scenes, voice acting, online features,
or a separate economy.
