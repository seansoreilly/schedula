BEGIN;

ALTER TABLE schedula.meetings
  DROP CONSTRAINT IF EXISTS meetings_title_valid;
ALTER TABLE schedula.meetings
  ADD CONSTRAINT meetings_title_valid
  CHECK (title = btrim(title) AND char_length(title) BETWEEN 1 AND 200) NOT VALID;
ALTER TABLE schedula.meetings VALIDATE CONSTRAINT meetings_title_valid;

ALTER TABLE schedula.meetings
  DROP CONSTRAINT IF EXISTS meetings_creator_name_valid;
ALTER TABLE schedula.meetings
  ADD CONSTRAINT meetings_creator_name_valid
  CHECK (creator_name = btrim(creator_name) AND char_length(creator_name) BETWEEN 1 AND 100) NOT VALID;
ALTER TABLE schedula.meetings VALIDATE CONSTRAINT meetings_creator_name_valid;

ALTER TABLE schedula.availability
  DROP CONSTRAINT IF EXISTS availability_participant_name_valid;
ALTER TABLE schedula.availability
  ADD CONSTRAINT availability_participant_name_valid
  CHECK (participant_name = btrim(participant_name) AND char_length(participant_name) BETWEEN 1 AND 100) NOT VALID;
ALTER TABLE schedula.availability VALIDATE CONSTRAINT availability_participant_name_valid;

ALTER TABLE schedula.availability
  DROP CONSTRAINT IF EXISTS availability_start_before_end;
ALTER TABLE schedula.availability
  ADD CONSTRAINT availability_start_before_end
  CHECK (start_time < end_time) NOT VALID;
ALTER TABLE schedula.availability VALIDATE CONSTRAINT availability_start_before_end;

CREATE INDEX IF NOT EXISTS availability_meeting_date_time_idx
  ON schedula.availability (meeting_id, available_date, start_time);

GRANT USAGE ON SCHEMA schedula TO anon, authenticated;
REVOKE ALL ON schedula.meetings, schedula.availability FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON schedula.meetings TO anon, authenticated;
GRANT SELECT, INSERT ON schedula.availability TO anon, authenticated;

DROP POLICY IF EXISTS "Allow all operations on meetings" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow all operations on availability" ON schedula.availability;
DROP POLICY IF EXISTS "Allow public meeting reads" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow public meeting creation" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow public meeting updates" ON schedula.meetings;
DROP POLICY IF EXISTS "Allow public availability reads" ON schedula.availability;
DROP POLICY IF EXISTS "Allow public availability creation" ON schedula.availability;

CREATE POLICY "Allow public meeting reads" ON schedula.meetings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public meeting creation" ON schedula.meetings
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public meeting updates" ON schedula.meetings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public availability reads" ON schedula.availability
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public availability creation" ON schedula.availability
  FOR INSERT TO anon, authenticated WITH CHECK (true);

COMMIT;
