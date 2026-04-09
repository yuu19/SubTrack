# Subscription Analytics View Specification

## Change Summary
Add a dedicated analytics view for tracked subscriptions so users can understand how their recurring costs are distributed at a glance.

## Goal
Help users answer two questions quickly:

- Which subscriptions take the largest share of my spending?
- How does that picture change when I look at monthly-equivalent versus yearly-equivalent cost?

## Scope
- Add a new `/analysis` page inside the authenticated storefront experience.
- Add a mobile bottom navigation entry for the analytics page.
- Show a donut chart with a centered total value.
- Support two periods:
  - `monthly`: normalize all subscriptions to a monthly-equivalent amount
  - `yearly`: normalize all subscriptions to a yearly-equivalent amount
- Show a ranked breakdown list under the chart.

## Aggregation Rules
- `monthly`
  - monthly subscription: use `amount`
  - quarterly subscription: use `amount / 3`
  - yearly subscription: use `amount / 12`
- `yearly`
  - monthly subscription: use `amount * 12`
  - quarterly subscription: use `amount * 4`
  - yearly subscription: use `amount`
- Round normalized amounts to whole yen.
- Group duplicate service names together.
- Sort breakdown items by amount descending.

## UI Requirements
- Page title and description explain that the screen summarizes subscription spending.
- Period tabs are visible near the top of the screen.
- Donut chart shows:
  - color-coded segments
  - total amount in the center
  - period label
- Breakdown list shows:
  - matching color swatch
  - service name
  - normalized amount
- Empty state explains that analytics appear after subscriptions are added.

## Acceptance Criteria
- Users can switch between monthly and yearly views without leaving the page.
- The center total matches the sum of the visible breakdown list.
- Multiple entries with the same service name are merged in the breakdown.
- Monthly and yearly totals reflect cycle normalization correctly.
- The analytics page is reachable from mobile navigation.
