-- Additive manual migration. Apply only after verifying the live schema and taking a backup.
-- This repository's journal ends at 0017; do not run a blind historical replay.
ALTER TABLE `tracked_subscription` ADD `review_revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `subscription_review` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
	`subscription_id` integer NOT NULL REFERENCES `tracked_subscription` (`id`) ON DELETE CASCADE,
	`billing_date` text NOT NULL,
	`billing_context` text NOT NULL,
	`decision` text,
	`reviewed_at` integer NOT NULL,
	CONSTRAINT `subscription_review_decision_check` CHECK (`decision` IS NULL OR `decision` IN ('keep', 'review')),
	CONSTRAINT `subscription_review_date_check` CHECK (length(`billing_date`) = 10 AND `billing_date` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_review_cycle_idx` ON `subscription_review` (`subscription_id`, `billing_date`);
--> statement-breakpoint
CREATE INDEX `subscription_review_user_idx` ON `subscription_review` (`user_id`);
