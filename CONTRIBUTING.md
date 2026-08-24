# Contributing to Hunker Bunker

**Status:** Canonical contributor workflow  
**Last verified:** 2026-08-24

Thanks for helping make Hunker Bunker better. The project is in active development on the path toward a Steam-quality desktop/Steam Deck release, so contribution quality is measured by both implementation and evidence that the implementation is actually connected and behaves correctly in the environment it targets.

## Before you start

Read these first:

- [`README.md`](README.md) — project overview and setup.
- [`PRODUCT_STATE.md`](PRODUCT_STATE.md) — current product truth.
- [`docs/README.md`](docs/README.md) — documentation lifecycle and evidence language.
- [`docs/repo-roadmap.md`](docs/repo-roadmap.md) — prioritized work.
- [`docs/architecture/system-map.md`](docs/architecture/system-map.md) — current runtime ownership/authority boundaries.
- [`docs/sprints/sprint-30-plan.md`](docs/sprints/sprint-30-plan.md) — current active sprint while Sprint 30 is in progress.

Historical sprint plans and audits are useful context, but they do not outrank the current-truth documents above.

## Development setup

### Requirements

- **Node.js 22**
- npm compatible with Node 22

```bash
# Clone your fork or the main repository
git clone https://github.com/grounded-play/hunker-bunker.git
cd hunker-bunker

# Install exactly from package-lock.json
npm ci

# Start the browser development server
npm run dev
```

Vite normally serves the game at `http://localhost:5173`.

## Choosing work

Prefer work in this order:

1. player-blocking defects;
2. open Steam/release acceptance gates;
3. systems already designed/coded but not connected or accepted;
4. measured reliability/performance issues;
5. high-leverage player-facing polish;
6. new content breadth.

This ordering is intentional. Recent sprints showed that adding new lanes faster than old acceptance work closes makes the repository look more complete than the player experience actually is.

## Branches and pull requests

For outside contributors, work from a fork and open a PR into `mothership`.

Suggested branch names:

- `feature/<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- sprint integration branches use `dev/sprint-N` when maintained by the core project.

Keep PRs narrow enough that the acceptance story is understandable. Large sprint integrations may still be broad, but they should have a single plan and a cross-lane integration audit before merge.

## Evidence levels

Use the project-wide vocabulary from [`docs/README.md`](docs/README.md):

- **Designed** — a spec/decision exists.
- **Coded** — implementation exists.
- **Connected** — the live runtime calls it.
- **Tested** — automated assertions cover it.
- **Live-verified** — observed in a running development build.
- **Packaged-verified** — observed in a packaged Electron/Steam-target build.
- **Accepted** — the promised player/hardware/account route passed.

A PR should state the highest evidence level it actually reached. Do not call Steam-, hardware-, or package-dependent work complete based only on unit tests.

## Verification

Run the gates relevant to your change. The common full set is:

```bash
npm run lint
npm test
npm run presubmit
npm run build
npm run coverage
npm run test:e2e
```

Not every small docs-only change needs every gate, but player-facing runtime changes should normally run lint/tests/build/presubmit, plus targeted E2E where applicable.

For Electron, Steamworks, multiplayer, media unpacking, controller, or GPU/performance work, include the package/hardware/account evidence the feature depends on.

## Documentation changes

New documents should follow [`docs/README.md`](docs/README.md):

- put active sprint plans under `docs/sprints/`;
- put measurements/audits under `docs/reports/`;
- put current architecture/ownership references under `docs/architecture/`;
- put releases under `docs/releases/`;
- put prompts under `docs/prompts/`;
- use `docs/archive/` for superseded historical material;
- avoid adding sprint-specific Markdown to the repository root.

When a change alters product truth, update `PRODUCT_STATE.md`. When it alters setup/public status, update `README.md`. When it changes release/version state, update the release roadmap and release notes as appropriate.

## Runtime ownership

Before adding a new gameplay/platform subsystem, read [`docs/architecture/system-map.md`](docs/architecture/system-map.md) and identify:

1. canonical state owner;
2. runtime producer/command/event;
3. live consumer;
4. persistence boundary;
5. multiplayer authority where applicable;
6. acceptance route.

Do not create a second owner for state merely because it is convenient in a UI module. A module with no live runtime consumer is **Coded**, not **Connected**.

## Art, audio, 3D, generated content and provenance

Player-facing and marketing assets are release inputs, not incidental files. Read [`ASSET_PROVENANCE.md`](ASSET_PROVENANCE.md) before contributing art/audio/models/content.

For any new visual, audio, 3D, font, voice, video, store/marketing or similar content contribution, include enough provenance to record:

- creator/contributor or external source;
- source/master location;
- production method;
- commercial-use basis / license when external;
- attribution requirements;
- whether generative AI or AI-assisted content creation was used;
- relevant tool/model/source when disclosure or rights depend on it;
- final runtime/marketing derivative path.

Do not submit third-party content merely because it is available online. The contributor must be able to identify the source and the basis on which the project may redistribute it.

Generative-AI use is not hidden in the repo workflow: if AI-generated or AI-assisted content will be consumed by players or used in store/community/marketing assets, disclose that in the asset provenance record so Steam/content disclosures can be derived from evidence rather than reconstructed later.

Coding-agent assistance should not be represented as ownership of third-party code or assets. Contributors remain responsible for ensuring submitted code/content can be distributed by the project and does not introduce secrets, unlicensed dependencies, copied proprietary material, or credentials.

`tmp/` is not a canonical source-master location. If source material must be preserved, put it in the project's deliberate source-asset structure and record it; otherwise treat temporary output as reproducible working material rather than permanent repo content.

## Security and credentials

Never commit:

- Steam publisher/server keys;
- Steam auth/session tokens;
- backend signing secrets;
- deployment tokens;
- passwords;
- personal access tokens;
- `.env` files containing live credentials.

Use the documented secret/config path for the target environment. If a change introduces a new secret, document its **name, purpose and restoration location/process** without committing the value.

## Code style

- ESLint is the source of truth for JavaScript linting.
- Match surrounding style unless a refactor is explicitly part of the change.
- Prefer small ownership-boundary extractions over sweeping rewrites of `main.js`, `style.css`, `index.html`, or `src/threeGame.js`.
- Add focused tests before deleting or replacing an established runtime path.

## Bugs and feature requests

Use the repository's GitHub issue templates when available. For bugs, include reproduction steps, expected behavior, actual behavior, environment, and whether the failure occurs in browser, packaged Electron, Steam, or specific hardware.

For feature requests, describe the player problem first. New breadth should explain why it outranks existing roadmap/acceptance work.
