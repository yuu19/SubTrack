ALTER TABLE `tracked_subscription` ADD `service_template_id` text;--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `plan_name` text;--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `price_edited_by_user` integer DEFAULT false NOT NULL;