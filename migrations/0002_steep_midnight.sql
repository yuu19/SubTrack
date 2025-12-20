ALTER TABLE `subscription` ADD `next_billing_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription` ADD `days_until_next_billing` integer NOT NULL;