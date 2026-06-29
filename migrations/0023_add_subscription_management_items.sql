CREATE TABLE `subscription_category` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key` text,
	`name` text NOT NULL,
	`color` text DEFAULT 'blue' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscription_category_user_idx` ON `subscription_category` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_category_user_name_idx` ON `subscription_category` (`user_id`, `name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_category_user_key_idx` ON `subscription_category` (`user_id`, `key`);
--> statement-breakpoint
CREATE TABLE `subscription_payment_method` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'other' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscription_payment_method_user_idx` ON `subscription_payment_method` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_payment_method_user_name_idx` ON `subscription_payment_method` (`user_id`, `name`);
--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `category_id` integer REFERENCES `subscription_category`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `payment_method_id` integer REFERENCES `subscription_payment_method`(`id`) ON UPDATE no action ON DELETE set null;
