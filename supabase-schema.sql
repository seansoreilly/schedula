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

-- Grant access permissions
GRANT USAGE ON SCHEMA schedula TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA schedula TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA schedula TO anon, authenticated;

-- Enable RLS on tables (optional for security)
ALTER TABLE schedula.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedula.availability ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (since no auth is required)
CREATE POLICY "Allow all operations on meetings" ON schedula.meetings
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on availability" ON schedula.availability
  FOR ALL USING (true);