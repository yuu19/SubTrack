# Subscription Tags Input — Mobile Update Specification

## Change Summary
Refine the shared tags input used by the subscription add/edit modals so mobile users can keep typing comfortably, commit tags more naturally, and remove tags with less precision, while preserving the existing bound-array API.

## Before
The field renders tags and the input in a compact inline cluster. On small screens the remaining input width shrinks quickly, adding tags relies mostly on keyboard submit behavior, and tag removal buttons are small.

## After
The shared tags input keeps a full-width input row on mobile, preserves the compact inline layout on larger screens, and commits tags in more natural situations:

- Completed tags are created when the user types separators such as `,`, `，`, `、`, or newline.
- Leaving the field commits the remaining valid pending tag.
- Pressing Enter still commits the current pending tag.
- Existing tags keep their chip layout, but delete hit areas are easier to tap on touch devices.

## Components
- `TagsInput`
  - Keep `bind:value` API unchanged.
  - Detect separator-driven entry and pasted lists.
  - Commit pending valid input on blur.
  - Render the text input as full width on mobile and compact inline on larger screens.
- `TagsInputTag`
  - Increase touch target and maintain current delete behavior.

## Responsive Behavior
- Mobile: input appears as a full-width row inside the field and uses touch-friendly sizing.
- Tablet/Desktop: field remains compact and inline-focused, matching the current form density.

## Acceptance Criteria
- Users can enter multiple tags with comma-like separators in one pass.
- Users do not lose a valid pending tag when they tap outside the field.
- Mobile tap targets for deleting tags are easier to hit than before.
- Add and edit subscription modals both reflect the new behavior without extra modal-specific logic.
- Existing form submission and hidden `tagsinput` values continue to work unchanged.
