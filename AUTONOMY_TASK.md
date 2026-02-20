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
