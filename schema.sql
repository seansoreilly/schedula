-- Create the meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the availability table
CREATE TABLE IF NOT EXISTS availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL,
    participant_name TEXT NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_availability_meeting_id ON availability(meeting_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(available_date);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger to call the function
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();