import { ApiError, apiClient } from "./client";
import type {
  Availability,
  AvailabilityInsert,
  Meeting,
  MeetingInsert,
  MeetingUpdate,
} from "./types";
import {
  parseAvailability,
  parseAvailabilityList,
  parseMeeting,
} from "./types";

export const meetingQueries = {
  async create(data: MeetingInsert): Promise<Meeting> {
    return parseMeeting(await apiClient.post<unknown>("/meetings", data));
  },

  async findById(id: string): Promise<Meeting | null> {
    try {
      return parseMeeting(
        await apiClient.get<unknown>(`/meetings/${encodeURIComponent(id)}`)
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async update(id: string, data: MeetingUpdate): Promise<Meeting | null> {
    try {
      return parseMeeting(
        await apiClient.put<unknown>(
          `/meetings/${encodeURIComponent(id)}`,
          data
        )
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

export const availabilityQueries = {
  async create(data: AvailabilityInsert): Promise<Availability> {
    return parseAvailability(
      await apiClient.post<unknown>("/availability", data)
    );
  },

  async findByMeetingId(meetingId: string): Promise<Availability[]> {
    const searchParams = new URLSearchParams({ meeting_id: meetingId });
    return parseAvailabilityList(
      await apiClient.get<unknown>(`/availability?${searchParams.toString()}`)
    );
  },
};
