CREATE TABLE `subscription` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text,
	`service_name` text NOT NULL,
	`cycle` text NOT NULL,
	`amount` integer NOT NULL,
	`first_payment_date` text NOT NULL,
	`tags` text NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
