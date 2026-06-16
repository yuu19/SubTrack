PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text DEFAULT 'user',
	`locale` text DEFAULT 'ja' NOT NULL,
	`active_theme` text DEFAULT 'rose' NOT NULL,
	`default_notify_days_before` integer DEFAULT 3 NOT NULL,
	`notification_method` text DEFAULT 'email' NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`sample_data_seeded` integer DEFAULT false NOT NULL,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer,
	`stripe_customer_id` text
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "name", "email", "email_verified", "image", "created_at", "updated_at", "role", "locale", "active_theme", "default_notify_days_before", "notification_method", "onboarding_completed", "sample_data_seeded", "banned", "ban_reason", "ban_expires", "stripe_customer_id") SELECT "id", "name", "email", "email_verified", "image", "created_at", "updated_at", "role", "locale", "active_theme", "default_notify_days_before", "notification_method", "onboarding_completed", "sample_data_seeded", "banned", "ban_reason", "ban_expires", "stripe_customer_id" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
UPDATE `user`
SET `notification_method` = 'both'
WHERE
	`notification_method` = 'push'
	AND EXISTS (
		SELECT 1
		FROM `push_subscription`
		WHERE `push_subscription`.`user_id` = `user`.`id`
	);--> statement-breakpoint
UPDATE `user`
SET `notification_method` = 'email'
WHERE `notification_method` = 'push';
