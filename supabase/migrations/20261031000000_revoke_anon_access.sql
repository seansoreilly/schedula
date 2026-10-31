-- Security: API functions now use the service-role key (SUPABASE_SERVICE_ROLE_KEY,
-- server-only). The public anon key must no longer reach schedula tables.
--
-- DEPLOY ORDER: deploy the service-role code and set SUPABASE_SERVICE_ROLE_KEY
-- in Vercel BEFORE applying this migration, or the API loses database access.
BEGIN;

DROP POLICY IF EXISTS "Allow all operations on meetings" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow all operations on availability" ON schedula.availability;
-- Policies from 20260809000000_harden_schedula_schema.sql (also anon-reachable).
DROP POLICY IF EXISTS "Allow public meeting reads" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow public meeting creation" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow public meeting updates" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow public availability reads" ON schedula.availability;
DROP POLICY IF EXISTS "Allow public availability creation" ON schedula.availability;

REVOKE ALL ON schedula.meetings, schedula.availability FROM anon, authenticated;

-- service_role bypasses RLS but still needs privileges on a custom schema.
GRANT USAGE ON SCHEMA schedula TO service_role;
GRANT ALL ON schedula.meetings, schedula.availability TO service_role;

COMMIT;
