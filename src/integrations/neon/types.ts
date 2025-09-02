export interface Meeting {
  id: string;
  title: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  meeting_id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface MeetingInsert {
  title: string;
  creator_name: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilityInsert {
  meeting_id: string;
  participant_name: string;
  available_date: string;
  start_time: string;
  end_time: string;
  id?: string;
  created_at?: string;
}

export interface MeetingUpdate {
  title?: string;
  creator_name?: string;
  updated_at?: string;
}

export interface AvailabilityUpdate {
  meeting_id?: string;
  participant_name?: string;
  available_date?: string;
  start_time?: string;
  end_time?: string;
}