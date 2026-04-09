# Brownfield Codebase Scan

**Project:** Subtrack
**Date:** 2026-04-08
**Purpose:** Capture the current product shape, key constraints, and the most credible first improvement scopes.

---

## Product Snapshot

- **Platform:** Svelte 5 + SvelteKit 2 on Cloudflare Workers
- **UI stack:** Tailwind CSS v4 + `shadcn-svelte` style component structure under `src/lib/components/ui/`
- **Auth/Billing:** Better Auth + Stripe
- **Persistence:** Drizzle ORM with SQLite/D1-style schema
- **Core user flows already present:**
  - Auth and account settings
  - Subscription CRUD
  - Calendar view of billing events
  - Push/email reminder preferences
  - Premium gating and CSV export
  - Admin user listing
  - Onboarding dialog and PWA/service worker support

---

## Strong Existing Capabilities

### 1. The core subscription loop already exists

The app is not a stub. It already supports adding, editing, deleting, viewing, and exporting subscription data, with billing projections and reminders.

Key evidence:
- `src/routes/(storeFront)/subscriptions/+page.svelte`
- `src/routes/(storeFront)/subscriptions/+page.server.ts`
- `src/routes/(storeFront)/calendar/+page.svelte`
- `src/lib/server/notifications.ts`
- `src/routes/(storeFront)/subscriptions/export/+server.ts`

### 2. Offline/PWA direction is already partially implemented

The project already has a service worker and IndexedDB-backed caching/queueing for subscription creation.

Key evidence:
- `src/service-worker.ts`
- `src/lib/offline/subscriptions.ts`
- `docs/pwa.md`

### 3. Monetization and lifecycle hooks are already integrated

The product has free/premium plan handling, billing portal access, trial/cancel handling, and premium messaging throughout onboarding/settings.

Key evidence:
- `src/routes/(storeFront)/me/settings/+page.svelte`
- `src/routes/(storeFront)/me/settings/+page.server.ts`
- `src/lib/server/plan.ts`

---

## Constraints and Friction Points

### 1. Premium messaging is broader than the implemented data model

The UI markets Premium with limits/features around categories, payment methods, and image uploads. The current tracked subscription schema and form model only support service name, cycle, amount, dates, reminder timing, and tags.

This creates a trust risk: the pricing story may be ahead of the product reality.

Evidence:
- Premium promises in:
  - `src/routes/(storeFront)/me/settings/+page.svelte`
  - `src/lib/components/onboarding/OnboardingDialog.svelte`
  - `messages/ja.json`
  - `messages/en.json`
- Current tracked model:
  - `src/lib/server/db/schema.ts`
  - `src/lib/formSchema.ts`

### 2. Offline support is real but incomplete

Offline handling currently covers cached reads and queued **create** actions. Update/delete flows still assume online server success paths. This is consistent with the FAQ language, but it means the offline story is only partially complete.

Evidence:
- Queue implementation only for `action: 'add'`:
  - `src/lib/offline/subscriptions.ts`
- Server-centric update/delete:
  - `src/routes/(storeFront)/subscriptions/+page.server.ts`

### 3. Product naming and technical residue are still mixed

There are remnants of older/template naming, which increases maintenance friction and weakens confidence when the product is inspected closely.

Examples:
- Package name: `svelte5-cloudflare-template`
  - `package.json`
- Offline IndexedDB name: `dishpage-offline`
  - `src/lib/offline/subscriptions.ts`
- README is still minimal and not product-oriented
  - `README.md`

### 4. Growth UX is present, but the first-value path may still be soft

The app has onboarding, sample data seeding, premium nudges, and settings surfaces. But the most important business question is whether users reach value fast enough after first sign-in and first subscription creation.

Evidence:
- Onboarding:
  - `src/lib/components/onboarding/OnboardingDialog.svelte`
  - `src/routes/api/onboarding/+server.ts`
- Sample data seeding:
  - `src/routes/(storeFront)/+layout.server.ts`

---

## Recommended First Improvement Scopes

### Option 1. Premium value alignment

**Strategic challenge:** make the plan story match what the product truly delivers today.

Why this is strong:
- Direct impact on trust and conversion
- Smaller scope than adding entirely new capabilities
- Can be solved through a mix of product decision, copy cleanup, and selective implementation

Likely work:
- Audit premium promises
- Decide which features are real, near-term, or removed from messaging
- Tighten pricing/onboarding/settings copy

### Option 2. Offline CRUD completion

**Strategic challenge:** turn partial offline support into a coherent reliability story.

Why this is strong:
- Fits the existing architecture and docs
- Improves daily utility for mobile/PWA usage
- Clear technical scope with visible user benefit

Likely work:
- Add queued update/delete support
- Clarify sync state in UI
- Define conflict and failure handling

### Option 3. First-value activation

**Strategic challenge:** improve the path from first login to the first meaningful subscription-tracking moment.

Why this is strong:
- Most relevant if activation/retention is the current business bottleneck
- Can combine onboarding, sample data behavior, empty states, and first-subscription guidance

Likely work:
- Review onboarding/premium timing
- Tighten empty-state guidance
- Make first subscription creation more obviously rewarding

---

## Recommended Next WDS Move

Create an **adapted Product Brief** for one of the three scopes above. For brownfield WDS, the best next step is to choose a single strategic challenge and define:

- why it matters now
- what exact scope is in/out
- how success will be measured
- what constraints cannot be changed

This should happen before detailed UX or implementation planning.
