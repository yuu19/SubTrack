ALTER TABLE `subscription` ADD COLUMN `cancel_at` integer;
--> statement-breakpoint
ALTER TABLE `subscription` ADD COLUMN `canceled_at` integer;
--> statement-breakpoint
ALTER TABLE `subscription` ADD COLUMN `ended_at` integer;
