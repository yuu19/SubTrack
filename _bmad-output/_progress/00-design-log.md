# Design Log

## Current

- 2026-04-09: Started Product Evolution cycle for subscription tags input on mobile.
- Target view: subscription add/edit modal tags field.
- Goal: make tag entry easier on smartphones without changing the data model.
- 2026-04-09: Scoped and specified the change under `_bmad-output/evolution/`.
- 2026-04-09: Implemented the shared `TagsInput` mobile update in the current branch/worktree.
- 2026-04-09: Validation note: Svelte autofixer passed for edited components. Full `pnpm check` still fails on unrelated pre-existing project errors.
- 2026-04-09: Started Product Evolution cycle for subscription analytics view.
- Target view: new `/analysis` page plus mobile navigation entry.
- Goal: help users compare spending distribution by service in monthly and yearly equivalent totals.
- 2026-04-09: Started Product Evolution cycle for subscription color selection across create/edit, calendar, and analytics.
- 2026-04-09: Scoped and specified the subscription color selection update under `_bmad-output/evolution/`.
- 2026-04-09: Started Product Evolution analysis cycle for app-wide i18n audit.
- Target scope: audit locale coverage, translation source fragmentation, legal content parity, and untranslated shared/admin UI.
- 2026-04-09: Saved i18n audit analysis under `_bmad-output/evolution/analysis/i18n-audit-2026-04-09.md`.
- 2026-04-09: Scoped the first i18n improvement cycle as shared UI i18n foundation + translation coverage cleanup.
- Scenario file: `_bmad-output/evolution/scenarios/i18n-foundation-and-coverage.md`.
- 2026-04-09: Wrote the implementation-ready mini spec for the first i18n cycle under `_bmad-output/evolution/specs/i18n-foundation-and-coverage.md`.

## Backlog

- Revisit tag suggestions/autocomplete if mobile entry still feels slow after this improvement.
- Evaluate whether similar mobile input treatment is needed for other chip-style inputs.
