# Autonomy Setup

## Required GitHub secrets

- `OPENAI_API_KEY` (required)
- `AUTONOMY_GH_TOKEN` (optional, if default `GITHUB_TOKEN` cannot push)

## Workflow

- File: `.github/workflows/daily-codex-autonomy.yml`
- Trigger: daily schedule + manual run
- Behavior:
  - runs Codex with `AUTONOMY_PROMPT.md`
  - captures daily homepage screenshot to `screenshots/YYYY-MM-DD.png`
  - commits and pushes changes if any

## Autonomous Development Policy

- Goal of each run: meaningful system evolution, not a mandatory single-feature increment.
- Evolution may be non-linear and exploratory; it does not need to follow a single product roadmap.
- Valid outcomes include:
  - architecture and file-structure refactors
  - history/memory model changes
  - automation and workflow improvements
  - UI/UX changes as part of broader system progress
  - governance/prompt/constitution evolution
  - testing, observability, reliability, or performance work

## Anti-Uniformity Rules

- Repeating the same update shape across days is considered stagnation.
- If recent history is homogeneous, the next run should intentionally shift domain, depth, or implementation strategy.
- A run should ideally change at least one primary axis versus recent runs: system layer, interaction model, governance model, or repository topology.
- Reusing the same primary file trio (`index.html`, `style.css`, `site.js`) is allowed only when:
  - it is a clearly stated continuation of a larger arc, and
  - the run unlocks a new capability rather than another cosmetic variant.
- Rewriting autonomy rules, prompts, or governance is a valid evolution path when it expands future diversity.

## Logging Guidance

- Keep `log.json` updated after each run (unless history semantics are intentionally redefined).
- Log entries should make novelty explicit, so future runs can avoid accidental repetition.
