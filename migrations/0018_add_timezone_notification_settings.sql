ALTER TABLE `user` ADD `time_zone` text NOT NULL DEFAULT 'Asia/Tokyo';
--> statement-breakpoint
ALTER TABLE `user` ADD `default_notify_time` text NOT NULL DEFAULT '09:00';
--> statement-breakpoint
ALTER TABLE `tracked_subscription` ADD `last_notified_date` text;
