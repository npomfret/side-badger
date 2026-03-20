## 1. App Shell, Routing, and Global UX

### Core app structure

- Protected routing for authenticated areas.
- Root redirect behavior.
- Dedicated routes for login, registration, password reset, email verification, email-change verification, dashboard, settings, feedback, join-group, group detail, and not-found handling.
- Deep-linked group routes for opening the expense form and expense detail from the URL.

### Global chrome

- Header with branding, main navigation, notifications, and user menu.
- Footer with tenant-config-driven content.
- Language switching across the non-admin app.
- Theme and branding application on public and authenticated surfaces.

### Global account and policy UX

- Email verification banner for unverified users.
- Policy acceptance modal for required policy acknowledgements.
- Policy view modal for reading policy content without leaving the current flow.
- Warning banner surface for cross-cutting notices.
- Shared modal accessibility, keyboard dismissal, and mobile modal behavior.

## 2. Authentication and Account Entry

### Login

- Email/password sign-in.
- Remember-me session behavior.
- Forgot-password entry point from login.
- Turnstile support when configured.
- Default/dev quick-login helper.
- Safe redirect handling after authentication.

### Registration

- New account creation with display name, email, and password.
- Inline validation and reactive form behavior.
- Password confirmation.
- Required policy consent during signup.
- Required and optional email preference collection during signup.
- Policy preview modal from registration checkboxes.
- Turnstile support when configured.

### Password and verification flows

- Request password reset by email.
- Confirm password reset via action code.
- Verify email via action code.
- Verify changed email via action code.
- Language-aware verification flows from URL parameters.

## 3. Dashboard and Home Surface

### Dashboard overview

- Welcome/empty state for users without groups.
- Groups list for active memberships.
- Archived groups view and filtering.
- Dashboard pagination for large group lists.
- Realtime dashboard refresh when groups change.

### Group cards

- Group summary cards with balances.
- Multi-currency balance summaries on cards.
- Archived-state presentation.
- Group header image display on cards where configured.

### Dashboard actions

- Create group.
- Open group detail from dashboard.
- Quick actions menu.
- Group selection modal for actions that need a target group.
- Launch add expense, scan receipt, record settlement, create list, create poll, and invite flows from dashboard entry points.

### Invites and activity

- Pending invitations section on the dashboard.
- Dashboard activity feed surface.
- Notifications dropdown connected to recent activity/events.

## 4. Group Membership, Invites, and Sharing

### Joining groups

- Join groups via share links.
- Group preview before joining.
- Invalid-link handling.
- Already-a-member handling.
- Success state after joining.
- Pending-approval state when approval is required.
- Share-link language propagation.
- Display-name prompt during join flow.

### Inviting members

- Invite via shareable link.
- Configurable link expiration options.
- Link regeneration/refresh.
- Invite via in-app candidate selection.
- Candidate search/filtering.
- Results phase for invite outcomes.

### Membership management

- Leave-group flow.
- Pending member approval and rejection.
- Member role updates.
- Group-specific display name settings.
- Archive and unarchive group memberships from the non-admin surface where permitted.

## 5. Group Detail Experience

### Core group page

- Group header with key group information.
- Members sidebar and member management access.
- Desktop and mobile group-detail layouts.
- Sectioned group experience for expenses, balances, settlements, comments, activity, lists, and polls.

### Navigation and state behavior

- Deep links into group sections and modals.
- Hash-based section expansion.
- Browser back/escape behavior for modal deep links.
- Include-deleted toggles where permissions allow it.
- Group locking banner and locked-state UI.
- Realtime refresh behavior tied to group activity.

### Group actions

- Add expense.
- Settle up.
- Add list.
- Add poll.
- Invite members.
- Open group settings.
- Leave group.
- Archive/unarchive membership where available.

## 6. Group Settings and Security

### Identity and presentation

- Personal display name within a group.
- Group avatar/personal avatar-in-group identity support.
- Group name and description editing.
- Group header image management.

### General settings

- Group currency settings.
- Permitted currencies configuration.
- Default currency selection.
- Conversion currency selection.
- Expense questions feature toggle.
- Group lock/unlock controls.
- Close-group flow with confirmation.

### Security and permissions

- Group settings tab navigation.
- Permission presets.
- Custom permission editing.
- Member role management.
- Pending member approval controls.
- Realtime and optimistic-lock handling in settings flows.

## 7. Balances and Settlements

### Balances

- Live debt summaries showing who owes whom.
- Multi-currency balances.
- Balance grouping and summarization.
- Settle-up entry points from balances UI.

### Settlement workflows

- Record settlements between members.
- Edit existing settlements.
- Quick-settle shortcuts based on outstanding debts.
- Settlement history display.
- Settlement pagination.
- Filtering between user-relevant and all settlements.
- Include-deleted toggle for settlements where permitted.
- Locked-state handling for settlement history.

### Settlement currency conversion

- Currency conversion preview during settlement entry.
- Conversion metadata persistence on saved settlements.
- Stale conversion warnings in edit mode.
- Refresh/update flow for stale conversion data.

### Settlement reactions

- Emoji reactions on settlements.

## 8. Expense Management

### Expense lifecycle

- Create expense.
- Edit expense.
- Copy expense.
- View expense detail.
- Deep-link directly to expense detail.
- Delete/archive-aware expense views where permitted.

### Expense form inputs

- Description, amount, currency, date, and time.
- Payer selection.
- Participant selection.
- Labels/tags.
- Notes.
- Location input.
- Google Maps URL parsing support.

### Splitting logic

- Equal split.
- Exact split.
- Percentage split.
- Automatic split recalculation when values change.
- Support for many participants.
- Rounding and precision handling.
- Validation for invalid split totals and invalid monetary values.

### Expense convenience features

- Recent amounts shortcuts.
- Convenience date buttons such as today/yesterday and time presets.
- Unsaved-changes guard.
- Receipt upload and replacement.
- Receipt scan shortcut from the expense modal.

### AI-assisted receipt capture

- AI receipt analysis/autofill flow.
- Autofill of supported expense fields from analyzed receipts.
- Guardrails to avoid overwriting fields the user already changed.
- Graceful handling of failed or partial AI analysis.

### Expense currency and conversion behavior

- Multi-currency expense entry.
- Currency-aware amount display.
- Conversion-aware effective amount handling where applicable.
- Group currency restrictions enforcement in the expense form.

### Expense detail and collaboration

- Expense detail actions.
- Realtime expense detail refresh.
- Locked-state handling for expense detail.
- Expense reactions.
- Expense questions workflow for asking for clarification / marking understood.

## 9. Comments, Activity, and Reactions

### Comments

- Group-level comments.
- Expense comments.
- List comments.
- Poll comments.
- Chat-style comment UI.
- Comment pagination.
- Realtime comment updates.

### Comment attachments

- Attachment upload on supported comment surfaces.
- Attachment display in comment threads.

### Activity feed

- Group activity feed.
- Dashboard activity feed.
- Notifications dropdown backed by recent activity/events.
- Auto-emitted activity entries after supported actions.

### Reactions

- Emoji reactions on comments.
- Emoji reactions on expenses.
- Emoji reactions on settlements.

## 10. Shared Lists

### List management

- Create list.
- Open list detail modal.
- Auto-open list detail after creation.
- Realtime-safe list detail behavior.
- Rename list.
- Copy list.
- Archive list.
- Unarchive list.
- Delete list.
- Archived list filtering.

### List items

- Add items.
- Toggle checked state.
- Delete items.
- Inline edit items.
- Drag-and-drop reorder.
- Quick-entry behavior with autofocus and Enter-to-add flows.
- Progress/counter updates.

### List collaboration rules

- Permission-based list editing behavior.
- Creator/admin-sensitive editing rules.

### List discussion

- Comments on lists.

## 11. Polls

### Poll lifecycle

- Create poll.
- Open poll detail modal.
- View poll summaries and options.
- Close/reopen behavior where supported.
- Delete behavior where supported.

### Poll participation

- Vote on polls.
- Support for anonymous and vote-count-aware poll behavior.
- Realtime poll detail updates.

### Poll discussion

- Comments on polls.

## 12. Personal Settings and Profile

### Profile management

- Profile summary card.
- Display name editing.
- Personal profile/preferences editing.
- Language preference persistence.

### Avatar management

- Upload avatar.
- Switch between avatar history entries.
- Avatar history panel.

### Account security and contact info

- Change email flow.
- Change password flow.

### Communication preferences

- Marketing email preference management.
- Admin email preference visibility and persistence where applicable.

## 13. Feedback and Product Support

### Feedback submission

- Submit product feedback from the user-facing app.
- Support for multiple feedback types.
- Attachment upload on feedback submission.

### Feedback history

- Feedback history page.
- Feedback stats cards.
- Filter by feedback type.
- Filter by feedback status.
- Pagination/load-more behavior.

### Feedback detail and replies

- Feedback detail modal.
- Threaded replies/conversation view.
- Reply submission.
- Attachment support on replies.
- Attachment display in feedback conversations.

## 14. Cross-Cutting Reliability and Safety Features

- Realtime-safe modal and draft-preservation behavior in key flows.
- Rapid-action debouncing/protection against duplicate submissions.
- Authenticated image retry behavior on protected assets.
- Responsive/mobile-specific interaction support for key surfaces.

