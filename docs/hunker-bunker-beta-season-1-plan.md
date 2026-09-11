# Hunker Bunker — Beta Season 1: Deep Crust Protocol

Planning draft • Repository reviewed 10 September 2026 • No game changes or GitHub publications made

## 1. The decision

Build a small season around a complete promise: **choose a target, descend, make a meaningful survival decision, keep verified progress, spend something, and enter the next run with a visible change.**

Recommended launch: an **eight-week featured season, 30 ranks, 24 featured cosmetic definitions, two deterministic cosmetic recipes, and three weekly directives**. Free players receive a complete progression experience. The Classified Dossier adds ten cosmetic rewards, with identical gameplay access, resource rates, and XP rates. Both tracks remain finishable after the featured window.

Treat “Beta Season 1” as the player-facing successor to the code's existing Season 0. Create a new season record; preserve prior earned inventory and progression. The working title reuses Deep Crust Protocol to minimize art and narrative production, subject to a naming review.

The priority is making the existing game and object library matter. New maps, a larger catalog, another currency, or a complex trading system would delay the proof this beta needs.

All new rates, durations, thresholds, allocations, and targets below are **design proposals**, not measured player behavior or shipped features. The source review identifies code paths and documented acceptance; it is not a live playtest or a verification of the deployed Steam economy.

## 2. What the repository actually supports

Baseline: [`mothership`, commit dc902c79470a7543a5772f70865cc63e2601dc05](https://github.com/grounded-play/hunker-bunker/tree/dc902c79470a7543a5772f70865cc63e2601dc05). The September 10 Product State is more current than several August design documents and the README.

| Finding | Evidence and implication |
|---|---|
| The core hook already exists | The game has depth pressure, extraction, eight transformative relics, faction consequences, and companion contracts. Build seasonal tasks around these choices. A recorded fresh-player Proof Run is still an open acceptance gate. [Product State](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/PRODUCT_STATE.md) |
| XP is already wired | The current pass has 50 tiers at 5,000 XP each: 250,000 XP total. Objective, boss/milestone, and depth events award XP; bounties also exist. The problem is not literally zero progression code. [Pass](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/seasonPass.js), [UI](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/seasonPassUi.js) |
| Ownership does not complete the season loop | Pass claims call `grantVaultItem`, which updates the local Vault array. Browser sandbox persistence exists, but this is not a Steam season-grant transaction. Refreshing Steam inventory replaces that array. A reward toast therefore does not prove durable Steam ownership. [Vault](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/steamVaultUi.js) |
| The paid entitlement is a prototype | The pass button calls `setPremium(true)` locally. A paid release needs verified entitlement and refund handling. Product State says commerce remains disabled pending approval/configuration. [Pass UI](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/seasonPassUi.js), [Product State](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/PRODUCT_STATE.md) |
| Claim state can get ahead of delivery | `claim()` saves a claimed tier before the UI grants the reward. The replacement must retain a pending receipt until confirmed delivery and recover safely after interruption. [Pass manager](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/seasonPass.js) |
| Free progression has gaps | Only 22 of the 50 free rows have rewards. Completed bounties require a separate visit to claim XP, and rotation regenerates the old list. Auto-settle completion so a player does not lose an unclaimed reward at rotation. [Bounties](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/bountySystem.js) |
| Currency language is inconsistent | Pass “Scrap” maps to `coin`; the ingot exchange describes scrap as `tech`. Bank balances are Tech, Coin, Med, Ammo, and Shells. Use one label and one unit per balance. [Pass UI](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/seasonPassUi.js), [Crafting](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/craftingMatrix.js) |
| Cache keys disagree | The pass grants earned key 4154; the cache-opening path requires key 4001. A visible key can therefore be unusable in that path. Defer new key rewards and define a migration before reactivating caches. [Pass](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/seasonPass.js), [Server recipes](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/server/steamInventory.js) |
| Sinks already exist | Fabrication, camp exchanges, class/weapon upgrades, O2/base upgrades, and repairs spend resources. They need clearer discovery, consistent prices, and proof that spending changes the next expedition. Some upgrades convert their displayed cost definitions into Shell prices. [Bank](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/bank.js), [Fabricator](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/fabricator.js) |
| Trade pricing needs an economy audit | At neutral level/bond, Meridian offers 5 Coin for 40 Shells, while Vesper buys 1 Coin for 25 Shells: a potential cross-camp 40 → 125 Shell loop. Availability and travel costs need runtime confirmation. Tallow's affinity/bond formulas can also reverse its buy/sell spread. Test every accessible cycle before increasing emissions. [Camp economy](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/campEconomy.js) |
| More accurate debrief data is needed | The game-over “banked” label uses `totalPickups`; that is not a per-currency transaction receipt. September work already distinguishes persistent progress from temporary builds in text. Extend it with exact balances and next actions. [Main runtime](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/main.js) |

These findings support a diagnosis of disconnected progression and weak economic feedback. They do not establish which defect the user encountered in a particular build. First implementation work should replay that build and confirm event delivery, HUD state, bank changes, claims, and ownership refresh.

## 3. What to learn from major games

These are documented design examples, including historical seasons where labeled. They establish mechanisms, not evidence that copying them will produce a particular retention uplift.

| Reference | Documented mechanism | Hunker Bunker adaptation |
|---|---|---|
| Fortnite | XP progresses active passes together; rewards have an auto-claim option. [Epic support](https://www.epicgames.com/help/c-34254770/c-33726977/a19736825?lang=en-US) | Let ordinary play progress the Dossier. Automatically settle earned rewards; make viewing the reveal optional. |
| Call of Duty: Black Ops 6 | Pages organize progression, premium access includes immediate rewards, and the Season 01 offering includes free base weapons. [Activision support](https://support.activision.com/black-ops-6/articles/black-ops-6-battle-pass), [Season 01 announcement, November 2024](https://www.callofduty.com/au/en/blog/2024/11/call-of-duty-black-ops-6-season-one-blackcell-bp-bundles-zombies-announcement) | Show a small chapter with a visible hero reward. Keep gameplay tools in the free progression path and give the paid pass an immediate cosmetic. |
| Halo Infinite | Premium passes can be finished after their active period; upgrading unlocks premium rewards through already-earned progress. [Halo support](https://support.halowaypoint.com/hc/en-us/articles/4408373413268-Halo-Infinite-Battle-Pass-Free-to-Play-FAQ) | Preserve progress and grant retroactive paid rewards. For this beta, extend the finish-later policy to the free track too. |
| Deep Rock Galactic — adjacent co-op reference, not a AAA-budget template | Season 01's free Performance Pass combines resources, cosmetics, and a choice-based cosmetic tree; the season adds gameplay content alongside rewards. [Official Season 01 FAQ](https://www.deeprockgalactic.com/season01-faq) | Reuse the bunker, relics, camps, and mission systems for changing weekly priorities. Give players a target they can choose and work toward. |
| Fortnite's August 2024 policy change | Future pass items may appear in the shop after at least 18 months; return is not guaranteed. [Epic announcement](https://www.fortnite.com/news/change-to-item-exclusivity-in-future-fortnite-battle-passes) | Publish the season's return policy before purchase. Avoid promising permanent exclusivity for reused catalog objects. |

The design inference is that a useful season combines anticipation, agency, competence, visible identity, and fresh situations. A progress bar alone will not fix repetitive play. Hunker Bunker's own “one more ring” decision should be the main reason to return; the pass makes its payoffs visible.

Do not import AAA production volume, paid XP boosts, escalating premium editions, randomized paid progression, or daily attendance requirements into the beta.

## 4. Turn the 100+ object universe into understandable roles

The code-derived inventory is **113 catalog objects**: 71 generated Steam items, 30 community skins, and 12 achievement cosmetics. The Steam schema has 73 rows because two additional rows are generators. Its 71 item rows are flagged tradable and 64 are flagged marketable. These are schema settings, not a verification that live trades or listings work.

Sources: [generated catalog](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/data/steamItemCatalog.js), [schema](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/steam/inventory_schema_hunker_bunker.json), [community roster](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/data/communitySkins.js), [achievement catalog](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/data/achievementCosmetics.js), [merged ownership](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/src/itemOwnership.js).

| Existing family | Count | Role and launch treatment |
|---|---:|---|
| Weapon finishes | 13 | Visible weapon identity; selected entries feature in free, paid, and workshop paths. They do not grant their base weapon. |
| Seasonal chassis skins | 8 | Class-compatible identity; one free class choice at rank 15. Verify silhouette, preview, animation, and equip behavior. |
| Decals/emblems | 16 | Early wins, achievement recognition, and set completion. Reuse the chest-mounted patch presentation. |
| Charms | 10 | Frequent visible milestones; test attachment size and compatibility. |
| Rig modules | 8 | Move gameplay effects to permanent free research or existing relic progression. Exclude sale/season placement until effect versus cosmetic identity is resolved. |
| Radio packs, HUD themes, VFX | 6 | Reserve until every advertised effect has an audible/visible runtime consumer. Metadata and a preview card are insufficient. |
| Fragments, reagents, shards | 6 | Launch only the two existing fragment types for deterministic workshop recipes. Preserve legacy inventories; postpone the four seasonal reagent/shard systems. |
| Cache and key products | 4 | Existing holdings remain; no new beta pass rewards or purchase promotion until key compatibility and receipt recovery are proved. |
| Community skins | 30 | Already default-owned. Keep available as the game's free identity library. Feature themed groups and compatible gestures in weekly briefings; do not relock them or sell existing access. |
| Achievement cosmetics | 12 | Preserve permanent mastery paths. Registry reports seven ready models and five pending; stage complete paths only, and keep unfinished items out of reward promises. |

The companion catalog-allocation document assigns every object a proposed role. A role does not certify that an object is ready to ship.

**Featured launch pool: 24 cosmetic definitions.** Twelve possible free-track objects, ten paid-track objects, and two workshop outputs. A player gets ten free cosmetic grants because rank 15 is a one-of-three choice, not all three skins. Paid players get ten more. Existing achievements and default community skins remain available outside this featured pool.

Only promote an item when it has a canonical name, ID, category, acquisition path, price or milestone, rarity, ownership rule, class/weapon compatibility, icon, preview, runtime effect where applicable, and tested persistence. Generate card labels from the catalog; current pass labels already diverge from some canonical names.

## 5. Free and Classified paths

| Moment | Free operator | Classified Dossier holder |
|---|---|---|
| First login | All three classes, existing starter/community identity options, preview of all season rewards; pick a next unlock. | Same access, plus immediate Hazard Stripe SMG finish after verified purchase. |
| First completed onboarding loop | Learn bank versus temporary gear, receive onboarding progress, equip the Sub-Zero Pioneer Patch, and complete a useful fabrication. | Same progression, plus the paid cosmetic already owned. |
| Normal expedition | Earn the same XP and resources; make the same depth, relic, camp, and extraction decisions. | Identical earning, drop qualification, mission access, and combat rules. |
| Weekly return | Three retained directives, one featured situation, and visible progress toward chosen gear. | Same directives; additional cosmetic milestones on the shared XP track. |
| Rank 15 | Choose a compatible Scout, Tank, or Engineer chassis skin. | Also receive the Engineer-themed Bio-Synthesizer Harness on the paid track; other paid chapters cover Scout and Tank identity. |
| Rank 30 | Earn Queen's Carapace Carbine finish and retain all progression. | Also earn Hive-Lord Symbiote Exosuit. Base weapon/frame access remains separate and free. |
| Buy later | Existing free progress is preserved. | Receive every paid milestone already reached; no second grind. |
| After week eight | Keep progressing the archived free Dossier; unclaimed deliveries remain recoverable. | Same, including paid rewards. |

Use one paid product with a clear local-currency price, a complete reward preview, and no auto-renewal. Do not set a price from another game's sticker price. Test willingness to pay with the actual ten-item bundle and support costs after the earning loop works. No second premium edition, tier skips, resource multipliers, better drop odds, or premium-only functional modules in Beta Season 1.

An item acquired through Steam trading grants that item alone, never pass ownership or season XP. Selling/transferring a cosmetic removes its equip entitlement after inventory reconciliation; its collection-history stamp can remain. Never reissue a sold reward through the original season claim.

## 6. Complete proposed 30-rank reward schedule

Every rank takes **1,500 XP**, for **45,000 XP** total. Both tracks share progress. A supply bundle is **5 Tech + 2 Coin + 1 Med**, all banked. The twenty supply ranks total **100 Tech + 40 Coin + 20 Med** across the whole pass; model these alongside run income before release.

| Rank | Free reward | Classified additional reward |
|---:|---|---|
| Purchase | — | 4101 Hazard Stripe SMG finish |
| 1 | 4120 Sub-Zero Pioneer Patch | — |
| 2 | Supply bundle | — |
| 3 | 4130 Mini Cryo-Core Charm | 4121 Radiation Trefoil Emblem |
| 4 | Supply bundle | — |
| 5 | Supply bundle | — |
| 6 | 4100 Sub-Zero Frostbite Sidearm finish | 4131 Spent 50-Cal Casing charm |
| 7 | Supply bundle | — |
| 8 | Supply bundle | — |
| 9 | 4122 Sporesnail Hunter Crest | 4103 Cryo-Plasma Arc Driver finish |
| 10 | Supply bundle | — |
| 11 | Supply bundle | — |
| 12 | 4132 Sporesnail Pearl charm | 4124 Cyber-Skull Tactical Pin |
| 13 | Supply bundle | — |
| 14 | Supply bundle | — |
| 15 | Choose one: 4112 Sub-Terran Drill Engineer / 4113 Cryo-Vanguard Scout / 4114 Trench Warden Heavy | 4116 Bio-Synthesizer Harness |
| 16 | Supply bundle | — |
| 17 | Supply bundle | — |
| 18 | 4104 Rust & Bone Trench Carbine finish | 4134 Glitched RAM Card charm |
| 19 | Supply bundle | — |
| 20 | Supply bundle | — |
| 21 | 4135 Geodetic Compass charm | 4115 Void Commando Recon |
| 22 | Supply bundle | — |
| 23 | Supply bundle | — |
| 24 | Supply bundle | — |
| 25 | 4125 Cryo-Phoenix Insignia | 4138 Dark Matter Micro-Singularity charm |
| 26 | Supply bundle | — |
| 27 | Supply bundle | — |
| 28 | Supply bundle | — |
| 29 | Supply bundle | — |
| 30 | 4110 Queen's Carapace Carbine finish | 4119 Hive-Lord Symbiote Exosuit |

Place ranks into three ten-rank Dossier chapters: **Cold Start**, **Signal Below**, and **The Living Core**. Preview all chapters immediately. Weekly story features can arrive gradually; pass progress must not be time-gated by those releases.

Paid rows intentionally have gaps: sell ten clear cosmetics, not “30 premium rewards.” Show upcoming paid milestones together so the density is understandable. The free path has a useful reward at every rank.

At a class-choice reward, list compatibility before confirmation. If already owned through a legitimate earlier source, offer another unowned choice within that same authorized pool. If the entire pool is owned, grant a clearly identified duplicate once; do not invent additional gameplay currency or arbitrary catalog access as compensation. Deterministic craft outputs likewise show an owned warning before consuming ingredients.

## 7. Earning rates and realistic pacing

Replace the old XP schedule as one versioned season configuration. Do not stack these figures on top of the existing awards.

| Source | Proposed XP and qualification |
|---|---|
| Onboarding | 3,000 total, split across three one-time milestones: read/pin a target; complete a real expedition objective; finish a useful fabrication/equip loop. Never award for repeated menu opens. |
| Valid objective completion | 50 per unique objective, first six per run. Further objectives still yield normal gameplay resources and progress. |
| New depth crossed | 250 for each first forward crossing per run, maximum three. No XP for forced announcements, loading, revisiting, or initial spawn. |
| Qualifying extraction | 300 after at least three distinct completed objectives. Confirm against a trusted run record. No idle-time or restart reward. |
| Boss clear | Additional 500 per unique validated boss encounter. A bonus route, never a requirement for basic completion. |
| Weekly directives | Three × 1,000 XP each; attainable together in roughly three normal sessions. All released directives remain available. |
| Daily login/streak | None required. A “suggested next objective” is navigation, not an expiring reward. |

Example ordinary successful run: four objectives (200) + one new depth (250) + extraction (300) = **750 XP**. An otherwise equivalent failed run keeps its validated 450 objective/depth XP; it does not receive the extraction bonus. Real sessions vary, and several sources may be unavailable early.

Pacing model at 40 minutes per session, with all 24 weekly directives and onboarding completed:

| Behavior assumption | Sessions to 45,000 XP | Approximate play time |
|---|---:|---:|
| Example run, every extraction succeeds | 24 | 16 hours |
| Same objective/depth output, 60% extraction success | 29 | 19.3 hours |
| Same output, 40% extraction success | 32 | 21.3 hours |
| Example run, no weekly directives, onboarding completed | 56 | 37.3 hours |

This reveals a real design risk: weekly directives carry 24,000 of 45,000 XP. Make them overlap normal play, stay available, and auto-settle. If playtests show players miss them or feel forced into them, shift XP from weeklies into expedition milestones; do not add more chores.

Suggested weekly set: complete 8 objectives; make 2 forward depth crossings; complete one chosen activity from fabricate a useful upgrade / finish a companion stage / complete a camp objective. Never force repeat purchases after a player's upgrades are complete. Select alternatives appropriate to account progression and solo/co-op status. Shared goals credit contribution, not the last hit.

Late starters receive all previously released directives. They may finish faster through overlapping objectives. At season end, archive the same finite 24 directives rather than generating infinite new ones. If multiple archived passes eventually exist, choose one active XP destination; that selector is not needed for a single beta pass.

## 8. Earn, spend, keep: the economy contract

Use existing denominations. The primary UI shows **Tech / Coin / Med / Shells**, with Ammo and O2 under expedition supplies. Fragments appear only in the Workshop context. “Salvage” can describe the group but must never imply an interchangeable balance called Scrap.

| Resource | Sources | Meaningful use / sink | Persistence |
|---|---|---|---|
| Tech, Coin, Med | Existing pickups/deposits, verified contract rewards, free supply ranks | Targeted fabrication, base/O2 improvements, repairs, appropriate camp services | Banked amounts stay banked. Pending/recoverable amounts follow explicit black-box rules. |
| Shells | Existing shell collection and verified companion/camp rewards | Existing skill/weapon/tier upgrades and camp purchases, priced in actual Shell units | Banked permanent balance. Audit conversion rates before increasing grants. |
| Ammo, O2, carried supplies | Existing refills, pickups, optional resupply | Firing, survival, actual use of a supply; show the use and quantity | Run state, with existing reserve rules made explicit. |
| Common Relic Fragment 1000 | One per qualifying extraction, up to three per featured week; finite 24 per season from this new source | Consume five for Carbon Fiber Decal; or ten plus two Rare fragments for Chrome finish | Verified inventory items; schema says tradable, not marketable. |
| Rare Relic Fragment 1100 | One for finishing a weekly directive set; finite eight from this new source | Chrome recipe | Same inventory rule. |
| Season XP | Valid gameplay and finite directives | Unlocks ranks; never spent, purchased, or exchanged for tradable value | Retained after failure and season end. |

The extraction-fragment allowance accumulates: by week four a player can earn up to twelve from this source, minus their previously awarded total. After week eight the ceiling stays 24 and remains earnable through the archived Dossier. Rare fragments correspond to the eight named directive sets, not calendar login claims.

The two workshop recipes already exist server-side: **2100 Carbon Fiber Decal = 5 Common**; **2200 Chrome Plated Sidearm = 10 Common + 2 Rare**. Promote these deterministic choices before adding the broader local smelting/shard prototype. Proposed beta reward policy limits each of these featured recipe redemptions to one per account per season; this is new enforcement work, not a current guarantee.

For a fully engaged account, the new fragment source emits 24 Common + 8 Rare. Crafting both outputs consumes 15 Common + 2 Rare and leaves 9 Common + 6 Rare. Keep the remainder for later supported use or trading; do not pretend these finite sinks create a balanced perpetual market. Existing playtime generators, boss drops, promos, and caches are additional sources that must be measured or disabled for new beta emissions through explicit configuration. Do not delete existing holdings.

Never convert Tech, Shells, paid entitlement, or unverified browser saves into tradable cosmetics. Do not consume a cosmetic merely by equipping it. Free supplies and a starter weapon must always allow another attempt; spending should create choices rather than an entry fee.

First-session example, conditional on reachable onboarding prerequisites:

- Earn 20 Tech / 12 Coin / 5 Med from the tutorial route and 20 / 10 / 5 from one-time onboarding grants.
- Completing onboarding plus an example run gives 3,750 XP, reaching rank 2: Pioneer Patch plus one 5 / 2 / 1 supply bundle. Total resource inflow: **45 Tech / 24 Coin / 11 Med**.
- Activate Foundry at the current 25 / 10 / 5 cost, then print Scatter Repeater at its current 12 / 6 / 0 recipe cost. Remaining bank: **8 Tech / 8 Coin / 6 Med**.
- Next deployment uses the newly fabricated weapon and equipped patch. If the current story gate prevents Foundry activation in the first session, shorten the onboarding route or use an already-reachable useful upgrade; do not show a false “ready” action.

This is a test fixture, not an assertion about current drop rates. It is designed to prove both earning and a valuable spend in one session.

For long-term sinks, start with optional consumable use and existing services plus permanent fabrication. Model spend by progression cohort: a veteran who has finished all upgrades will save more. Do not raise prices globally to force a target burn ratio. Delay equipment durability, mandatory repairs after every failure, daily crafting taxes, and cosmetic destruction.

## 9. Make expeditions feel different

The season needs different decisions, not just different reward labels. Use the existing generator, director, camps, companions, and runtime relics.

Each expedition should offer an understandable objective in the first minute, a build-changing choice before the midpoint, at least one quiet/story or camp beat between combat peaks, and a clear extraction-versus-depth decision. Reuse supported effects such as Cryo Breach, Scrap Cycler, and Last Breath where they are valid for the player's equipment and current state.

Prepare three objective packages: **salvage/recovery**, **survey/relay**, and **containment/rescue**. These are configurations of existing interactions, not three new modes. For each, specify its route objective, an optional risk, existing enemy grammar, eligible relic choices, reward receipt, and solo equivalent. If a required interaction is not implemented, substitute an existing objective before promising the package.

Avoid repeating the same opening package in three consecutive expeditions when alternatives are available. A higher reward multiplier should attach only to the resource source it actually changes. The current Depth Contract already affects shell/salvage collection and other depth behavior; do not apply it again to bank settlement, pass XP, or Steam fragments.

| Featured week | Theme | Existing systems to emphasize |
|---:|---|---|
| 1 | Cold Start | First extraction, first fabrication, first cosmetic equip. |
| 2 | Broken Signal | Survey objectives, recon decisions, Meridian interactions. |
| 3 | Tallow's Lifeline | Supply choices, survivor/companion contract progression, extraction timing. |
| 4 | Hazard Shift | Existing elite encounters and reload-oriented relic choices. |
| 5 | The Living Core | Hive/faction consequence, supported infection decisions, contrasting relic builds. |
| 6 | Lost Squad | Recovery routes and existing companion families; solo-friendly alternatives. |
| 7 | Queen's Wake | Optional boss mastery with normal progression elsewhere. |
| 8 | Return Manifest | Catch-up, unfinished workshop recipes, community accomplishments, next-season feedback. |

All content is accessible to both tracks. Weekly features provide an invitation to revisit a familiar place, not eight bespoke content drops. Write short faction dispatches using the existing voice and assets. Do not build a global community-progress backend for this beta; any community target must reflect real counted play, and should remain optional.

## 10. Presentation in Hunker Bunker's visual language

Use the existing bunker-terminal styling, Dossier terminology, item cards, transparent model previews, chest patches, reward sounds, and industrial surfaces. Carry through class accents: Scout cyan, Tank amber, Engineer phosphor green. Keep rarity color separate from class identity. Reference: [Armory theming specification](https://github.com/grounded-play/hunker-bunker/blob/dc902c79470a7543a5772f70865cc63e2601dc05/docs/armory-ui-redesign-and-class-theming-spec.md).

Five linked surfaces are enough:

1. **Briefing:** pinned target, exact requirement, current balance, compatible equipment, and the next mission's purpose. Example: “SCATTER REPEATER — 12 TECH + 6 COIN. AVAILABLE AFTER FOUNDRY ACTIVATION.”
2. **Gameplay HUD:** compact resource gains, one pinned objective, and XP milestone feedback. Keep essential O2/combat information clear; never launch a reward modal during combat.
3. **Depth crossing:** show the actual next-depth benefits and danger. Separate already banked progress from any remaining extraction bonus. Use the authoritative depth label and avoid inventing another ring numbering scheme.
4. **Return Manifest:** line items for earned, spent, retained, pending, and recoverable; pass XP before/after; named unlock; useful next action. Example: “+20 TECH BANKED. SCATTER REPEATER READY TO PRINT.”
5. **Dossier / Armory / Workshop:** item previews share the same ownership state and acquisition rule. A locked item's action is “Track this reward” or “View recipe,” and an owned compatible item offers “Equip.”

On failure, explicitly retain verified XP, permanent unlocks, and banked balances. List the temporary run build ending and the actual recoverable black-box contents. Do not report that all salvage was lost when current bank behavior says otherwise. Show “Extraction bonus not earned” separately from loss of owned resources.

Use a compact claim state vocabulary: **Locked → Available → Delivering → Owned**, plus **Choice required** or **Delivery pending** where necessary. Automatic settlement and skippable reveals can coexist. A disabled action must say why: missing Tech, prerequisite, wrong class, incompatible weapon, or inventory refresh pending.

For the paid preview, display “Buying now includes 4 already-earned cosmetics” using real account state. Every finish says which base weapon it decorates. Avoid an upgrade prompt every time a free player earns something.

Controller/Deck acceptance includes readable labels at 1280×800, focus recovery after a reveal, no clipped totals, no color-only distinctions, optional reduced motion, and screen-reader-friendly numbers where the UI supports accessibility APIs. Reuse lazy loading; preview one selected model rather than loading all 113 objects. Product State reports limited asset-budget headroom, so no new bulk model batch belongs in this launch.

## 11. Trustworthy grants, burns, and trading

Implement one settlement path that owns economic receipts. Reuse the bank, ownership store, server grant wrapper, and fixed exchanges rather than creating another wallet.

Proposed data boundaries:

- Season configuration: season ID, version, rank thresholds, rewards, entitlement product, featured window, archive policy, emission allowances.
- Player progression: trusted XP, unique completed events/directives, earned choice selections, season-specific claim receipts.
- Run settlement: account, server-issued run identity, validated events, resource deltas, outcome, rules version, and status.
- Grant/consume receipt: deterministic account + season + source key, exact item instances/quantities, pending/confirmed/failure state, and external transaction reference.

Sequence: validate eligible event → persist completion/reward intent → execute grant or exchange → record confirmation → refresh authoritative ownership → present receipt. If inventory delivery is unavailable, retain a durable pending reward. Retry with the same key. Never mark an undelivered item owned; never consume inputs twice; never allow a timeout retry to mint another item.

Bind idempotency to the authenticated account and server-approved action, not a client-provided arbitrary nonce. Review concurrent claims, two tabs/devices, reconnects, and refunds. A verified Steam login establishes identity, not truth of a claimed boss kill. The current client-triggered milestone endpoint accepts milestone/run-key data; it is a starting point for delivery, not sufficient evidence for unlimited tradable earning. Validate activity using trusted run state before increasing emissions.

Steam trading is optional distribution of an already-owned cosmetic. Inventory refresh must remove sold/transferred instances from usable ownership; collection history does not recreate the item. Existing non-Steam community and achievement objects must not be advertised as Steam-market objects without actual definitions and grant acceptance. Do not promise sale prices, buyers, liquidity, or player income.

For a browser beta, ordinary local progression can be saved and labeled as local. Tradable inventory and paid entitlement require a secure account and backend. If cross-platform account linking is not ready, launch the free local beta plus the planned UI, and activate the paid/tradable offer only on the verified Steam path. Keep development grants separate and never migrate a self-edited local wallet into Steam value.

Commerce activation is a release decision after end-to-end entitlement/purchase/refund and platform acceptance. This plan performs no activation.

## 12. Small implementation sequence

Estimates are planning ranges for one experienced engineer with part-time design/QA support. They exclude unknown Steam configuration delays and are not a delivery commitment. Reuse existing implementation heavily; review scope after the first package.

| Package | Work | Completion evidence | Estimate |
|---|---|---|---|
| A — Reproduce and freeze | Reproduce user build; audit all sources/sinks, event IDs, price conversions, 24 candidate assets and item compatibility; freeze canonical manifest. | One traced run from gameplay event to balance/ownership; explicit source/sink inventory and exclusions. | 2–3 days |
| B — One useful loop | Exact per-currency return receipt; one reachable guaranteed fabrication and next-run equip; remove misleading labels; fix atomic save/claim boundaries needed for this slice. | Fresh account earns, spends, unlocks, reloads, and uses the result in a second run. | 3–5 days |
| C — Season and ownership | Versioned 30-rank config; three weekly directives with retained progress; premium verification; trusted grant intent/retry; one free class choice. | Free and paid histories reconcile across restarts; duplicate/failure/concurrent claims do not mint or lose items. | 5–8 days |
| D — Deterministic workshop | Verified fragment emissions, allowance accounting, two existing exchanges, once-per-season featured redemption, clear before/after receipt. | Earn 5 fragments, craft, refresh inventory, equip; simulate partial failure and retry safely. | 2–4 days |
| E — Variety and presentation | Three existing objective packages, weekly dispatches, target pinning, Dossier/reveal flow, debrief polish. | Three recorded runs contain different tactical choices and understandable next targets. | 3–5 days |
| F — Playtest and release | Fresh-player comprehension, economic pacing, package/Deck/co-op/Steam acceptance; fix blockers. | Release gates below pass with recorded evidence and a rollback/configuration plan. | 3–5 days |

Approximately **18–30 engineering days** if external dependencies cooperate; sequence work by evidence, not an arbitrary announced launch date.

The first internal vertical slice should expose only ranks 1–3, one fabrication, and one direct cosmetic delivery. Expand to the 30-rank manifest after this loop works. The slice is an implementation checkpoint, not a paid three-rank public offer.

Reuse modules: `seasonPass.js` for progression math; `bountySystem.js` for directives; `seasonPassUi.js` for Dossier presentation; `bank.js` for balances/spend; `fabricator.js` for permanent gear; `itemOwnership.js` for ownership queries; `steamInventory.js` and `steamGrant.js` for service delivery; `main.js` debrief as the current presentation integration point. Exact refactoring boundaries should follow tracing, not this document alone.

Release cuts: no new currency; no new biome/boss; no new global event infrastructure; no premium progression multipliers; no randomized season rewards; no paid key campaign; no new voice-pack promises; no bulk asset production; no durability tax; no full marketplace expansion; no relocking community skins. Keep existing earned holdings and supported legacy paths intact.

## 13. Acceptance and economic validation

Minimum correctness checks:

- Objective/depth/boss events cannot pay twice through replay, forced UI events, load, or repeated crossing. Failure and extraction settle exactly once.
- Credits and receipts persist together. Delivery failures remain pending, recover after restart, and do not leave the user permanently marked claimed without an item.
- The same currency amount and unit appears at the pickup, bank, recipe, receipt, and next-session balance. Insufficient funds never creates a partial spend.
- Crafting consumes the exact quantities across multiple stacks and grants the intended output once, including retry after a timeout.
- Free and paid accounts with identical actions receive identical XP, resource, fragment, and gameplay access outcomes.
- Premium verification, retroactive claims, entitlement removal, and legitimate past inventory are handled through a published support policy. A refunded pass loses future premium access; treatment of already-granted/traded items requires the supported platform flow before launch.
- All 24 featured cosmetic definitions have working art, metadata, compatible equip, and reload/refresh behavior. The rank-15 choice cannot unlock all three through concurrent requests.
- Weekly reset preserves earned XP, pending rewards, and unfinished archived directives. Season rollover preserves inventory and the correct XP destination.
- Account changes, offline browser state, debug inventory, Cloud conflicts, disconnects, and two-device concurrency never cross-contaminate entitlement or tradable supply.
- Audit camp exchange cycles including affinity/bond extremes; no risk-free positive loop should be available. Convert shell-price definitions into a shared actual price display.

Run a tuning simulation before wider playtesting: compare new/established accounts, 2/3/5 sessions weekly, 40/60/80% extraction success, low/high resource intake, catch-up joins, and no-directive players. Check time to first spend, first meaningful unlock, pass completion, balances after all permanent upgrades, and maximum tradable issuance. Include existing generators and achievement sources. Do not calibrate only to a perfect player's run.

Run human acceptance with at least ten fresh players before marketing expansion. Target evidence: at least eight can explain what they earned and name the next unlock without prompting; at least eight complete a useful spend/equip loop during the first session, with no forced purchase. Observe where they get lost instead of explaining the interface to them. Extend the group if devices or player experience differ substantially.

Reuse appropriate existing test suites and add only the necessary economic invariants and integration flows. Repository test counts do not replace the required fresh-player expedition, real Steam ownership refresh, two-account co-op result, physical Deck input, or Cloud conflict proof.

## 14. Attract players, then retain them

Attraction should demonstrate the completed loop in a short clip: survive a dangerous crossing → return with an exact haul → fabricate/equip → visibly change the next run. Lead with “Your next run starts with what you earned.” Publish the actual free track, paid contents, persistence policy, and approximate playtime tested in the beta. A catalog count is supporting detail, not the game's headline.

Start with a small invited cohort from existing interested players/community channels. Prepare a build-notes post, reward preview, and feedback prompt; publication is separate work. Do not buy broad acquisition until activation and earning comprehension are credible. Expand to co-op groups and genre creators only after that loop survives real sessions.

Retention cadence: one concise weekly dispatch, one featured existing objective package, visible personal goals, and a report of improvements made from feedback. No punishment for missing a day. Returning players see their pinned goal and bank first; no purchase modal on return. Multiplayer celebrations should recognize assists, rescues, and useful squad roles as well as kills.

| Measure | Definition | Proposed use |
|---|---|---|
| Activation | New players who finish a valid objective and a useful spend/equip loop within 60 minutes | Primary pre-marketing quality gate; inspect every failure in the small cohort. |
| Reward comprehension | Unprompted explanation of earned/retained progress and next target | Target at least 8 of 10 fresh players before expanding the test. |
| Second expedition | First-time players starting another valid expedition within 24 hours | Compare before/after the overhaul; segment success and failure. |
| D1 / D7 retention | First-play cohort returning on day 1 / day 7, using consistent time windows | Establish baseline first; inspect counts and uncertainty, not just percentages. |
| Spend engagement | Activated players making a voluntary useful spend; purpose and balance before/after | Detect hidden sinks, poverty traps, and exhausted veteran goals. |
| Pass progress | Median and 80th-percentile time to ranks 3, 15, and 30 among active cohorts | Tune against the proposed 16–22 hour engaged-completion range; report incomplete/censored players too. |
| Economy integrity | Grants confirmed/pending/failed; duplicates, unexplained debits, source/sink totals by unit | Zero unresolved duplicate grants or unexplained lost items is the release gate. |
| Fairness | Matched-behavior free/paid XP, earnings, and mission access | Must be equal by rule and by implementation; self-selected cohort averages alone are insufficient. |
| Monetization | Purchase conversion among eligible exposed users, refunds, support burden | Secondary to activation/retention; no beta revenue guarantee. |
| Content variety | Objective-package repeats, relic selection/use, camp choices, depth decisions | Diagnose whether sessions actually ask different questions. |

Suggested telemetry: `run_started`, `objective_validated`, `depth_first_crossed`, `resource_delta`, `run_settled`, `fabrication_confirmed`, `reward_pending`, `reward_confirmed`, `item_equipped`, `directive_completed`, `pass_entitlement_changed`, `inventory_reconciled`. Include anonymous/account identifiers as appropriate, season/rules version, source ID, and outcome. Keep raw personal content out of telemetry.

Predefine test windows and compare similar cohorts. With a small beta, interviews and session traces should explain retention changes; do not announce statistically proven uplift from a handful of players. If players understand rewards but still leave after one run, prioritize tactical variety and feel over additional rewards.

## 15. Release and next-season decisions

Recommended defaults are settled by this draft: eight-week featured window; 30 ranks; free track at every rank; ten extra paid cosmetics; no paid gameplay advantages; two workshop recipes; 24 featured cosmetic definitions; finish-later policy; existing community access retained.

Before implementation completion, resolve: the exact player build showing the reported issue; whether paid launch is Steam-only; readiness and compatibility of the 24 candidates; commerce configuration; treatment of legacy Season 0 claims and real prior purchases; reachable first-session fabrication; and economic rates measured in actual runs. None requires blocking this planning draft.

Run Beta Season 1 in stages: internal first-loop proof → free invited cohort → complete season cohort → verified paid/Steam activation where accepted → wider acquisition. Publish the scope and persistence policy before accepting payments.

Green-light a larger Season 2 only when players can demonstrate the earn/spend/equip loop, different runs produce different decisions, rewards survive refresh and failure, free players retain a worthwhile journey, and the team can sustain the content cadence. Expand one proven dimension at a time: more deterministic collection choices, another finished objective package, or a complete new visual family. The existing 113-object universe supplies the backlog; it does not require 113 simultaneous unlock promises.

## 16. Technical Implementation Plan

Establish an eight-week **Beta Season 1: Deep Crust Protocol** built around an airtight and visible **"earn → spend → unlock → use next run"** progression loop, replacing Season 0's prototype state with a balanced, resilient economy and a 30-rank dual-track Dossier.

### Architecture Decisions & Phasing

- **First Vertical Slice Milestone (Packages A & B):** Minimal closed loop: ranks 1–3, exact per-currency debrief receipts, one reachable fabrication (`Scatter Repeater` or `Mk-I Sidearm`), and equipping the `Sub-Zero Pioneer Patch` (4120) into a subsequent run before expanding to the full 30-rank catalog.
- **Dual-Track Progression (30 Ranks @ 1,500 XP / Rank = 45,000 XP Total):**
  - **Free Track:** Every rank has a reward (10 cosmetic grants including 1 class choice at rank 15, plus 20 supply bundles of 5 Tech + 2 Coin + 1 Med).
  - **Classified Dossier:** 10 premium cosmetics (1 immediate upon purchase: 4101 Hazard Stripe SMG finish; remaining 9 staggered across ranks 3, 6, 9, 12, 15, 18, 21, 25, 30). No gameplay stats or resource multipliers.
  - **Finish-Later Policy:** Both free and paid tracks remain finishable after the 8-week featured period.
- **Currency Disambiguation:**
  - Eliminate all references to ambiguous "Scrap" in progression and recipes. Standardize strictly on the four canonical bank currencies: `Tech`, `Coin`, `Med`, and `Shells` (plus `Ammo` and `O2` in-run).
- **Deterministic Workshop & Fragment Ceilings:**
  - Relic Fragment 1000 (Common) capped at 24 per season (max 3/week from extractions).
  - Relic Fragment 1100 (Rare) capped at 8 per season (1 per weekly directive set).
  - Enable two deterministic recipes: 2100 Carbon Fiber Decal (5 Common) and 2200 Chrome Plated Sidearm (10 Common + 2 Rare), limited to 1 redemption per account per season.
- **Cross-Camp Arbitrage Fix:**
  - Harmonize exchange rates in [campEconomy.js](../src/campEconomy.js) to close the Meridian (40 Shells → 5 Coin) to Vesper (1 Coin → 25 Shells) loop.

### Proposed Code Changes by Package

#### Package A: Reproduce, Audit & Manifest Freeze
- Audit and normalize data schemas, price conversions, and candidate assets.
- `src/data/seasonOneCatalog.js` [NEW]: Define the frozen canonical 24 featured cosmetic definitions for Beta Season 1 with canonical IDs, metadata, class/weapon compatibility, icons, and 3D preview model asset bindings.
- [campEconomy.js](../src/campEconomy.js) [MODIFY]: Rebalance Meridian Coin purchase and Vesper Coin sale prices to eliminate risk-free arbitrage under all affinity/bond states.

#### Package B: One Useful Loop & Exact Return Manifest
- [main.js](../main.js) [MODIFY]: Replace `stats.totalPickups` in game-over and victory debriefs with exact per-currency receipts (`Tech`, `Coin`, `Med`, `Shells` earned/banked) and contextual next action suggestion (`SCATTER REPEATER READY TO FABRICATE`).
- [bank.js](../src/bank.js) [MODIFY]: Audit `shellPriceOf` and ensure all upgrade menus display actual underlying currency requirements instead of confusing proxy prices. Guarantee atomic batch deposits.
- [fabricator.js](../src/fabricator.js) [MODIFY]: Ensure the first-session target weapon (`scatter_rep` or `mk1_sidearm`) is immediately clear, reachable with onboarding earnings, and updates weapon selection seamlessly for the next run.

#### Package C: Season 1 Progression & Ownership Engine
- [seasonPass.js](../src/seasonPass.js) [MODIFY]: Update to `hb_season_pass_v2` (Season 1 Deep Crust Protocol) with 30 ranks @ 1,500 XP = 45,000 XP total across 3 chapters (*Cold Start*, *Signal Below*, *The Living Core*). Free track gets rewards at every rank; Classified track gets 10 cosmetics. Implement idempotent receipt tracking (`pending` → `confirmed` / `failed`) and rank-15 class choice resolution.
- [bountySystem.js](../src/bountySystem.js) [MODIFY]: 3 persistent weekly directives per week (1,000 XP each). All released directives remain active for late starters. Auto-settle completion on rotation so earned XP is never lost.
- [seasonPassUi.js](../src/seasonPassUi.js) [MODIFY]: Support 30-tier chapter layout with clear free/paid track separation, rank 15 class selector modal, and target pinning to HUD/Briefing.

#### Package D: Deterministic Relic Fragment Workshop
- [steamVaultUi.js](../src/steamVaultUi.js) & [craftingMatrix.js](../src/craftingMatrix.js) [MODIFY]: Wire Relic Fragment 1000 (Common) and 1100 (Rare) accounting. Implement deterministic recipes (2100: Carbon Fiber Decal for 5 Common; 2200: Chrome Plated Sidearm for 10 Common + 2 Rare). Enforce 1 craft per recipe per account per season.

#### Package E: Expedition Variety, Objective Packages & Debrief Polish
- [main.js](../main.js) & [objectiveRegistry.js](../src/objectiveRegistry.js) [MODIFY]: Organize expeditions around 3 tactical packages (Salvage/Recovery, Survey/Relay, Containment/Rescue). Prevent consecutive repeats of identical opening packages. Polish depth-crossing ceremony to show exact banked cargo vs remaining extraction risk bonus.

#### Package F: Playtest and Release
- Acceptance suite: execute economy invariant tests, deterministic recipe tests, pending grant recovery tests, and human fresh-player loop verification.

