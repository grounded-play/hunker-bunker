# Superseded — Merged into 07-armory-and-weapon-bench.md

This doc and [`07-armory-and-weapon-bench.md`](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/season-zero-protocol/07-armory-and-weapon-bench.md)
were drafted concurrently by two agents working the same Armory expansion on 2026-08-17. Rather
than ship two contradicting "07" specs, they've been merged:

- **Kept from this doc**: the three named class-unique weapon archetypes (Vector-9 Talon,
  Siege-Breaker 50, Tesla-Lock MK-IV) with their visual/stat flavor, the Armory bench ASCII
  mockup, and the bone/socket hierarchy + spring-physics contract.
- **Superseded by the other doc**: pre-run entry as a dedicated `appPhase='armory'` screen (not a
  modal over the Roster dossier), the 3-class roster lock resolving the orphaned "Assault Carbine"
  skins, and the `LoadoutManager` data-model fix — this doc's §5 still pointed at the single flat
  `hb_loadout_v1` shape, which doesn't account for per-class loadouts or the split
  `steamVaultUi.js` cosmetic-storage bug found during research.

Read **`07-armory-and-weapon-bench.md`** as the authoritative spec going forward. This file is
kept (not deleted) so its git history and content remain easy to diff against.
