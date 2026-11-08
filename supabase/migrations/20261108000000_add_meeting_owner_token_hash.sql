-- OWNER ACTION REQUIRED: this migration is NOT applied automatically.
-- The repository owner applies it manually to the shared Supabase project
-- (ogdfhmnnhlmqwuhlikem) before the owner-token API change is deployed.
--
-- Adds a nullable SHA-256 hash of the per-meeting owner token. NULL means a
-- legacy meeting created before owner tokens (still editable via the API).
-- Access is server-side only (service role); anon/authenticated have no
-- privileges on schedula tables (see 20261031000000_revoke_anon_access.sql).
BEGIN;

ALTER TABLE schedula.meetings
  ADD COLUMN IF NOT EXISTS owner_token_hash TEXT;

COMMIT;
