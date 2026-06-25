ALTER TABLE `tracked_subscription` ADD `icon_type` text DEFAULT 'emoji' NOT NULL;--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `icon_value` text DEFAULT '📦' NOT NULL;
