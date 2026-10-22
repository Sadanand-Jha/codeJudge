-- Creator-defined registration form shown to students before they join a
-- room, plus the answers captured for each membership.
--
-- registration_form shape:
--   {
--     "title": "Student registration",
--     "description": "A few details before you join.",
--     "fields": [
--       { "id": "rf_...", "label": "Roll Number", "type": "text",
--         "required": true, "options": [] }
--     ]
--   }
-- NULL means no form configured (legacy rooms join with credentials only).
ALTER TABLE quiz_rooms
  ADD COLUMN IF NOT EXISTS registration_form JSONB;

-- Answers keyed by the creator-defined field label, e.g.
--   {"Roll Number": "21CS1043", "Branch": "CSE"}
ALTER TABLE room_members
  ADD COLUMN IF NOT EXISTS registration_data JSONB;
