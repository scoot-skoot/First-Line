-- Ensure caller_relationships.calls_completed is NOT NULL DEFAULT 0.
-- Fixes live Tiger Cloud DBs created before the default was reliable, and
-- rows that may have been inserted with an explicit NULL (pg DEFAULT does
-- not apply when NULL is bound in INSERT).

ALTER TABLE caller_relationships
  ALTER COLUMN calls_completed SET DEFAULT 0;

UPDATE caller_relationships
SET calls_completed = 0
WHERE calls_completed IS NULL;

ALTER TABLE caller_relationships
  ALTER COLUMN calls_completed SET NOT NULL;
