# Contributing to Hunker Bunker

First off, thank you for considering contributing to Hunker Bunker! It's people like you that make this game better for everyone.

## Getting Started

1. **Fork the repository** to your own GitHub account.
2. **Clone the project** to your local machine.
3. Install Node.js 22 or newer, then install dependencies with `npm ci`.
4. Start the development server using `npm run dev`.
5. Open your browser and navigate to the local URL provided by Vite (usually `http://localhost:5173`).

## Submitting Changes

1. **Branch out**: Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name` or `bugfix/issue-number`).
2. **Make your changes**: Write your code and ensure you aren't breaking existing functionality.
3. **Commit your changes**: Write clear, descriptive commit messages.
4. **Push your branch**: Push the changes to your fork on GitHub.
5. **Open a Pull Request**: Submit a Pull Request against our main repository. Please fill out the provided Pull Request template completely so we can review your changes efficiently.

## Code Style

- We use ESLint for code formatting and quality. Please run `npm run lint` before submitting a PR.
- Try to match the existing coding style for consistency.

## Documentation and Verification

- Start with [`docs/README.md`](docs/README.md) and treat
  [`PRODUCT_STATE.md`](PRODUCT_STATE.md) as current truth.
- Follow [`docs/documentation-system.md`](docs/documentation-system.md) for
  lifecycle, placement, naming, and sprint-close rules.
- Run `npm run audit:docs` after changing Markdown, sprint/version references,
  or canonical links.
- Run the smallest relevant tests while developing. Before opening a PR, run
  `npm test`, `npm run lint`, `npm run presubmit`, and `npm run build` unless
  the PR explains why a gate cannot run.
- Keep implementation, automated verification, and human/hardware acceptance
  distinct in status claims.

## Reporting Bugs

If you find a bug, please use the **Bug Report** issue template. Provide as much detail as possible, including steps to reproduce, what you expected to happen, and what actually happened.

## Feature Requests

We are always open to new ideas! If you have a feature request, please use the **Feature Request** issue template and clearly describe the problem it solves and how it would work in the game.

Thank you for contributing!
