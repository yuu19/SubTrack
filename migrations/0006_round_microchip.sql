CREATE TABLE `plan_group` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`billing_intervals` text NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`plan_group_id` integer NOT NULL,
	`billing_interval` text NOT NULL,
	`price` integer NOT NULL,
	`seat_limit` integer NOT NULL,
	`images` text NOT NULL,
	`slug` text NOT NULL,
	`sku` text,
	`admin_id` text NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plan_group_id`) REFERENCES `plan_group`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_slug_unique` ON `plan` (`slug`);--> statement-breakpoint
DROP INDEX IF EXISTS `name_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `desc_idx`;--> statement-breakpoint
CREATE INDEX `name_idx` ON `plan` (`name`);--> statement-breakpoint
CREATE INDEX `desc_idx` ON `plan` (`description`);--> statement-breakpoint
CREATE TABLE `subscription_plan` (
	`subscription_id` integer NOT NULL,
	`plan_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`subscription_id`, `plan_id`),
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tracked_subscription` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text,
	`service_name` text NOT NULL,
	`cycle` text NOT NULL,
	`amount` integer NOT NULL,
	`first_payment_date` text NOT NULL,
	`next_billing_at` text NOT NULL,
	`days_until_next_billing` integer NOT NULL,
	`notify_days_before` integer DEFAULT 1 NOT NULL,
	`last_notified_at` integer,
	`tags` text NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
DROP TABLE `category`;--> statement-breakpoint
DROP TABLE `order_product`;--> statement-breakpoint
DROP TABLE `product`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cart_item` (
	`cart_id` integer NOT NULL,
	`plan_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`price_at_addition` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`cart_id`, `plan_id`),
	FOREIGN KEY (`cart_id`) REFERENCES `cart`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cart_item`("cart_id", "plan_id", "quantity", "price_at_addition", "updated_at", "created_at") SELECT "cart_id", "product_id", "quantity", "price_at_addition", "updated_at", "created_at" FROM `cart_item`;--> statement-breakpoint
DROP TABLE `cart_item`;--> statement-breakpoint
ALTER TABLE `__new_cart_item` RENAME TO `cart_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_subscription` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer NOT NULL,
	`address_id` integer,
	`code` text NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`address_id`) REFERENCES `address`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_subscription`("id", "user_id", "status", "amount", "address_id", "code", "updated_at", "created_at") SELECT "id", "user_id", "status", "amount", "address_id", "code", "updated_at", "created_at" FROM `order`;--> statement-breakpoint
DROP TABLE `subscription`;--> statement-breakpoint
ALTER TABLE `__new_subscription` RENAME TO `subscription`;
--> statement-breakpoint
DROP TABLE `order`;
