# Mobile-Friendly Subscription Tags Input

## Target
Improve the tags field inside the subscription add/edit modals so users on smartphones can add and remove tags with less precision and less keyboard friction.

## Current State
The add and edit flows both use the shared `TagsInput` component. On mobile, the editable area becomes small once tags exist, adding tags depends heavily on keyboard submit behavior, and deleting existing tags requires relatively precise taps.

## Desired State
On mobile, the input area stays easy to focus and type into, partial tags can be committed naturally, and existing tags remain easy to remove. Desktop behavior should remain familiar.

## User Journey
1. User opens the add or edit subscription modal.
2. User reaches the tags field and starts typing a category like `動画` or `音楽`.
3. If the user types a comma-style separator, pasted list, or finishes editing and leaves the field, completed tags are added automatically.
4. The current input remains visible and wide enough to continue entering the next tag on mobile.
5. Existing tags can be removed with a larger tap target.

## Success Criteria
- The tags field remains comfortably tappable and readable on small screens.
- Entering comma-separated or Japanese-comma-separated tags creates tags without requiring repeated manual submit actions.
- Leaving the field with a pending valid tag commits it.
- Add and edit modals both receive the improvement through the shared component.
- No API or schema changes are required.

## Scope
- Pages/views: subscription add modal, subscription edit modal
- Components: shared `TagsInput`, shared tag chip
- Data changes: none
- Risk level: Low to Medium
