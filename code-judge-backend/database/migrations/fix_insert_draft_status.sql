-- Fix: Insert missing DRAFT status (ID 1) into quiz_status table
-- Run this if quiz_status ID 1 is missing from your existing database
INSERT INTO quiz_status (id, name, description)
VALUES (1, 'DRAFT', 'Quiz is in draft mode and not yet published')
ON CONFLICT (id) DO NOTHING;
