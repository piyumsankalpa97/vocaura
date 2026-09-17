-- Allow storage_path to be nullable so recordings can have their audio files purged
-- while keeping transcripts, evaluations, and metrics intact.
ALTER TABLE recordings ALTER COLUMN storage_path DROP NOT NULL;
