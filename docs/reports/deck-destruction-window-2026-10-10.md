# Deck destruction-window reading — 2026-10-10

This reads destruction cost from the newest Deck log. It is not a paired before/after run, so it does not close the "repeat destruction-window profiling" items.

## Source

- **Log:** `hunker-bunker-session-2026-10-07T20-04-50-090Z-muyjdw7z-k6ad.json`, from the drop box.
- **Session:** Steam Deck, 2.4.16-beta `6d5fc7ed`, solo, Act 2, Engineer, 17.3 minutes.
- **Destruction:** 17 `destructible-prop-broken` events, at 207, 230, 236, 399, 401, 684, 717 (×2), 754, 819, 846, 847, 866, 870, 898, 929 and 932 s.
- **Enemies:** this is the Act 2 save where wild enemies didn't attack (fixed in `4a9d7fa6`), so these windows have no combat in them.
- **Build:** it predates the 10-08 light-toggle stall fix, the 10-09 lived-in props (25k triangles each) and the 10-10 KTX2 textures.

## Method

- **Frame-breakdown windows:** each `PERF frame-breakdown` entry within 20 s after a break counts as a destruction window. That gave 23 windows; the other 77 entries are the comparison.
- **Rolling p95:** taken from the `performanceTimeline` samples (one every 30 s) that fall within 35 s after a break.

## Result

| | Windows | Median of the window's average frame | Worst window average | Worst single `renderFrame` |
|---|---|---|---|---|
| After a break | 23 | 38.8 ms | 51.5 ms | 203 ms |
| Everything else | 77 | 35.1 ms | 121.4 ms | 2,639 ms (shader-compile stall) |

- **Rolling p95:** 87–91 ms after the first three breaks. The median over the session's gameplay samples was 98 ms.
- **Whole-session presented p95:** 177 ms, by the [session-log review](session-log-review-2026-10-08.md) method.

## Reading

- **Breaking a prop cost about 4 ms a frame** on the Deck in this build. The worst frame right after a break was 203 ms.
- **The session's big stalls were somewhere else.** They came from shader compiles when lights toggled, which `4a9d7fa6` fixes.
- **This does not compare with the 152 ms baseline.** That figure is a destruction-window p95 from a scripted stress, and this is an ordinary play log.
- **The gate stays open** until there is a paired Deck run on a build with today's props and KTX2 textures.
