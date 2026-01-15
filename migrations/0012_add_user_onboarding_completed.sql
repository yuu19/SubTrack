ALTER TABLE user ADD COLUMN onboarding_completed integer NOT NULL DEFAULT 0;
UPDATE user SET onboarding_completed = 1;
