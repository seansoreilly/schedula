import { apiClient } from './client';
import { Meeting, Availability, MeetingInsert, AvailabilityInsert, MeetingUpdate } from '../neon/types';

export const meetingQueries = {
  async create(data: MeetingInsert): Promise<Meeting> {
    return apiClient.post('/meetings', data);
  },

  async findById(id: string): Promise<Meeting | null> {
    try {
      return await apiClient.get(`/meetings/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async update(id: string, data: MeetingUpdate): Promise<Meeting | null> {
    try {
      return await apiClient.put(`/meetings/${id}`, data);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },
};

export const availabilityQueries = {
  async create(data: AvailabilityInsert): Promise<Availability> {
    return apiClient.post('/availability', data);
  },

  async findByMeetingId(meetingId: string): Promise<Availability[]> {
    return apiClient.get(`/availability?meeting_id=${meetingId}`);
  },
};