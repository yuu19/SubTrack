ALTER TABLE `tracked_subscription` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `canceled_at` integer;--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `cancellation_url` text;--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `cancellation_method` text;--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `cancellation_memo` text;--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `cancellation_deadline_memo` text;