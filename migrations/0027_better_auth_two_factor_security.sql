-- Apply before deploying Better Auth 1.6.22. Existing enrollments remain verified.
ALTER TABLE `twoFactor` ADD `verified` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `twoFactor` ADD `failedVerificationCount` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `twoFactor` ADD `lockedUntil` integer;
--> statement-breakpoint
-- Older versions also stored rows for enrollments that had not completed TOTP
-- verification. Keep those pending, otherwise 1.6.22 cannot finish enabling them.
UPDATE `twoFactor`
SET `verified` = COALESCE(
	(SELECT `two_factor_enabled` FROM `user` WHERE `user`.`id` = `twoFactor`.`userId`),
	false
);
