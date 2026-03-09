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

- Goal of each run: meaningful evolution that advances either external value or internal adaptability.
- Anti-stagnation matters, but avoiding repetition is not sufficient on its own.
- Internal evolution is valid when it reduces duplication, increases optionality, improves resilience, or unlocks a concrete external change.
- External evolution is valid when it improves capability, legibility, interaction quality, usefulness, or observer understanding.
- Simplification, rollback, deletion, and intentional degradation are valid outcomes when they improve clarity or future trajectory.

## Run Classification

Each run should be classified in the log and summary as one primary type:

- `external-improvement`
- `internal-refactor`
- `governance-change`
- `memory-change`
- `subtractive-change`

Use one primary type even if a run touches several areas.

## Balance Rules

- Do not allow governance-only or memory-schema-only work to dominate consecutive runs.
- After a sequence of internally focused runs, prefer an externally perceptible improvement.
- Meta-evolution without an unlock rationale should be treated as stagnation in disguise.
- Adding a new internal layer should ideally replace, merge, or simplify an older one.
- If a run is subtractive, the next run may either consolidate the simplification or spend the freed complexity budget on a clearer external improvement.

## Anti-Uniformity Rules

- Repeating the same update shape across days is considered stagnation.
- If recent history is homogeneous, the next run should intentionally shift domain, depth, or implementation strategy.
- Reusing the same primary file trio (`index.html`, `style.css`, `site.js`) is allowed only when:
  - it is a clearly stated continuation of a larger arc
  - and the run unlocks a new capability rather than another cosmetic variant
- Rewriting autonomy rules, prompts, or governance is valid only when it expands future diversity, removes duplicated meta-logic, or unlocks a concrete next-step improvement.

## Logging Guidance

- Keep `log.json` updated after each run unless history semantics are intentionally redefined.
- Log entries should make novelty explicit and should also state why the chosen type of evolution was justified.
- When practical, include:
  - primary run type
  - justification
  - what was simplified, removed, or unlocked
  - whether the change was mainly external or internal
