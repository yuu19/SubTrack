ALTER TABLE user ADD COLUMN sample_data_seeded integer NOT NULL DEFAULT 0;
ALTER TABLE tracked_subscription ADD COLUMN is_sample integer NOT NULL DEFAULT 0;
