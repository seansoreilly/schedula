import { supabase } from './client';
import type { Meeting, MeetingInsert, MeetingUpdate, Availability, AvailabilityInsert } from './types';

// Meeting queries
export const meetingQueries = {
  async create(data: MeetingInsert): Promise<Meeting> {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        title: data.title,
        creator_name: data.creator_name,
      })
      .select()
      .single();

    if (error) throw error;
    return meeting;
  },

  async getById(id: string): Promise<Meeting | null> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  async update(id: string, data: MeetingUpdate): Promise<Meeting | null> {
    const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
    if (data.title) updateData.title = data.title;
    if (data.creator_name) updateData.creator_name = data.creator_name;

    const { data: meeting, error } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return meeting;
  },
};

// Availability queries
export const availabilityQueries = {
  async create(data: AvailabilityInsert): Promise<Availability> {
    const { data: availability, error } = await supabase
      .from('availability')
      .insert({
        meeting_id: data.meeting_id,
        participant_name: data.participant_name,
        available_date: data.available_date,
        start_time: data.start_time,
        end_time: data.end_time,
      })
      .select()
      .single();

    if (error) throw error;
    return availability;
  },

  async getByMeetingId(meetingId: string): Promise<Availability[]> {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('available_date')
      .order('start_time');

    if (error) throw error;
    return data || [];
  },
};