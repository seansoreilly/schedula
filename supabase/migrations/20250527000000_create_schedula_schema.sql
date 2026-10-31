-- Baseline: the schedula schema as it exists in production before
-- 20260809000000_harden_schedula_schema.sql. Idempotent so it is a no-op on
-- databases that were created by hand from supabase-schema.sql.
BEGIN;

CREATE SCHEMA IF NOT EXISTS schedula;

CREATE TABLE IF NOT EXISTS schedula.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedula.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  participant_name TEXT NOT NULL,
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (meeting_id) REFERENCES schedula.meetings(id) ON DELETE CASCADE
);

GRANT USAGE ON SCHEMA schedula TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA schedula TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA schedula TO anon, authenticated;

ALTER TABLE schedula.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedula.availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on meetings" ON schedula.meetings;
CREATE POLICY "Allow all operations on meetings" ON schedula.meetings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on availability" ON schedula.availability;
CREATE POLICY "Allow all operations on availability" ON schedula.availability
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

COMMIT;
