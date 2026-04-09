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

## Backlog

- Revisit tag suggestions/autocomplete if mobile entry still feels slow after this improvement.
- Evaluate whether similar mobile input treatment is needed for other chip-style inputs.
