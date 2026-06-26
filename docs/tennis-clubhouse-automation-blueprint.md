# Tennis Clubhouse Automation Blueprint

This blueprint adapts the AGP automation operating layer to Tennis Clubhouse operations.

## Reusable Operating Pattern

AGP and Tennis Clubhouse share the same automation pattern:

1. Collect operational data.
2. Store canonical state in Supabase.
3. Run scheduled checks from the main computer.
4. Write machine-readable logs to `automation_runs`.
5. Put human approval work into `approval_requests`.
6. Generate daily human briefings.
7. Export briefing notes to Obsidian.

## Roles

- `admin`: manages members, coaches, lesson products, schedules, adjustments, and approvals.
- `coach`: reviews lessons, approves short-notice changes, writes feedback, marks lessons complete.
- `member`: views reservations, requests changes, checks remaining lessons, reads notes.
- `automation`: scheduled worker that reads data, prepares summaries, and queues approvals.

## Core Tables

### `tc_members`

Stores member profile and contact status.

Fields:

- `id`
- `display_name`
- `phone`
- `kakao_channel_user_id`
- `status`
- `joined_at`

### `tc_coaches`

Stores coach profile and active status.

Fields:

- `id`
- `display_name`
- `phone`
- `status`

### `tc_lesson_products`

Defines lesson packages.

Fields:

- `id`
- `name`
- `lesson_count`
- `duration_minutes`
- `price`
- `status`

### `tc_lesson_balances`

Tracks remaining lessons per member.

Fields:

- `id`
- `member_id`
- `product_id`
- `total_count`
- `used_count`
- `remaining_count`
- `expires_on`

### `tc_lesson_schedules`

Stores planned lesson slots.

Fields:

- `id`
- `member_id`
- `coach_id`
- `scheduled_at`
- `duration_minutes`
- `status`
- `change_deadline_at`

### `tc_lesson_change_requests`

Stores lesson change/cancel requests.

Rule:

- More than 24 hours before lesson: can be auto-approved.
- Within 24 hours: create `approval_requests` for coach/admin review.

### `tc_lesson_notes`

Member and coach lesson notes.

Fields:

- `id`
- `lesson_schedule_id`
- `member_note`
- `coach_feedback`
- `created_by_role`

### `tc_practice_reservations`

Personal practice reservation slots.

### `tc_events`

Club, league, tournament, and community schedules.

### `tc_notification_logs`

Tracks Kakao, push, SMS, or Slack notification attempts.

## Approval Mapping

Use the shared `approval_requests` table for:

- Short-notice lesson changes.
- Manual balance adjustments.
- Refund or extension decisions.
- Outbound Kakao/SMS message sending.
- Coach assignment changes with conflict risk.

## Daily Briefing Mapping

Use `daily_briefings` for:

- Today's lessons.
- Pending change requests.
- Low lesson balances.
- Expiring lesson packages.
- No-show or incomplete lesson checks.
- Pending coach feedback.

## First Implementation Order

1. Create Tennis Clubhouse schema in a dedicated Supabase project or schema.
2. Import members/coaches/products from existing sheets.
3. Build daily briefing generator.
4. Add pending approval generator for 24-hour rule.
5. Export briefings to Obsidian.
6. Build admin dashboard page.
7. Add external notification sending only after approval workflow is proven.
