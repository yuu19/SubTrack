CREATE TABLE `user_entitlement` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`source` text NOT NULL,
	`stripe_session_id` text,
	`stripe_payment_intent_id` text,
	`granted_at` integer NOT NULL,
	`revoked_at` integer,
	`metadata` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_entitlement_user_idx` ON `user_entitlement` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_entitlement_key_idx` ON `user_entitlement` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_entitlement_stripe_session_idx` ON `user_entitlement` (`stripe_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_entitlement_payment_intent_idx` ON `user_entitlement` (`stripe_payment_intent_id`);