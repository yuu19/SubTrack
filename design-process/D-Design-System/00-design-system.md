# Design System: Subtrack

> Components, tokens, and patterns that grow from actual usage — not upfront planning.

**Created:** 2026-04-08
**Phase:** 7 — Design System (optional)
**Agent:** Freya (Designer)

---

## What Belongs Here

This folder captures reusable patterns that emerge during UX and delivery work:

- **Design Tokens** — Colors, spacing, typography, shadows
- **Components** — Buttons, inputs, cards, navigation elements
- **Patterns** — Layouts, form structures, content blocks
- **Visual Design** — Mood boards, color and typography exploration
- **Assets** — Logos, icons, images, graphics

Because this project uses **shadcn-svelte**, the formal design-system phase is currently marked optional. Document only what extends or meaningfully diverges from the library.

---

## Folder Structure

```text
D-Design-System/
├── 00-design-system.md
├── 01-Visual-Design/
│   ├── mood-boards/
│   ├── design-concepts/
│   ├── color-exploration/
│   └── typography-tests/
├── 02-Assets/
│   ├── logos/
│   ├── icons/
│   ├── images/
│   └── graphics/
└── components/
    ├── interactive/
    ├── form/
    ├── layout/
    ├── content/
    ├── feedback/
    └── navigation/
```

---

## For Agents

**Workflow:** `skill:wds-7-design-system`
**Agent trigger:** `DS` (Freya)

Before creating any component:
1. Check the existing `shadcn-svelte` component first.
2. Prefer documenting extensions, variants, or local conventions.
3. Pull patterns from actual page specs in `C-UX-Scenarios/`.

---

## Tokens

_Document local design tokens here only if the app extends the base library._

---

## Patterns

_Document reusable patterns here as they recur across real product updates._

