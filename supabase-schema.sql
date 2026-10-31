-- Create schedula schema
CREATE SCHEMA IF NOT EXISTS schedula;

-- Create meetings table in schedula schema
CREATE TABLE IF NOT EXISTS schedula.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create availability table in schedula schema
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

-- Apply validation to existing installations as well as newly created tables.
ALTER TABLE schedula.meetings
  DROP CONSTRAINT IF EXISTS meetings_title_valid;
ALTER TABLE schedula.meetings
  ADD CONSTRAINT meetings_title_valid
  CHECK (title = btrim(title) AND char_length(title) BETWEEN 1 AND 200);

ALTER TABLE schedula.meetings
  DROP CONSTRAINT IF EXISTS meetings_creator_name_valid;
ALTER TABLE schedula.meetings
  ADD CONSTRAINT meetings_creator_name_valid
  CHECK (creator_name = btrim(creator_name) AND char_length(creator_name) BETWEEN 1 AND 100);

ALTER TABLE schedula.availability
  DROP CONSTRAINT IF EXISTS availability_participant_name_valid;
ALTER TABLE schedula.availability
  ADD CONSTRAINT availability_participant_name_valid
  CHECK (participant_name = btrim(participant_name) AND char_length(participant_name) BETWEEN 1 AND 100);

ALTER TABLE schedula.availability
  DROP CONSTRAINT IF EXISTS availability_start_before_end;
ALTER TABLE schedula.availability
  ADD CONSTRAINT availability_start_before_end CHECK (start_time < end_time);

CREATE INDEX IF NOT EXISTS availability_meeting_date_time_idx
  ON schedula.availability (meeting_id, available_date, start_time);

-- Access model: only the server (service_role, via the API functions) touches
-- these tables. anon/authenticated get no grants and no policies.
GRANT USAGE ON SCHEMA schedula TO service_role;
GRANT ALL ON schedula.meetings, schedula.availability TO service_role;
REVOKE ALL ON schedula.meetings, schedula.availability FROM anon, authenticated;

ALTER TABLE schedula.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedula.availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on meetings" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow all operations on availability" ON schedula.availability;
DROP POLICY IF EXISTS "Allow public meeting reads" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow public meeting creation" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow public meeting updates" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow public availability reads" ON schedula.availability;
DROP POLICY IF EXISTS "Allow public availability creation" ON schedula.availability;
