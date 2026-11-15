import { ApiError, request } from "./client";
import type {
  Availability,
  AvailabilityDraft,
  Meeting,
  MeetingDraft,
  MeetingPatch,
} from "./types";
import {
  parseAvailability,
  parseAvailabilityList,
  parseMeeting,
} from "./types";

function sendJson(method: "POST" | "PUT", data: unknown): RequestInit {
  return { method, body: JSON.stringify(data) };
}

async function nullOnNotFound<T>(call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export const meetingQueries = {
  async create(data: MeetingDraft): Promise<Meeting> {
    return parseMeeting(await request("/meetings", sendJson("POST", data)));
  },

  async findById(id: string): Promise<Meeting | null> {
    return nullOnNotFound(async () =>
      parseMeeting(await request(`/meetings/${encodeURIComponent(id)}`))
    );
  },

  async update(id: string, data: MeetingPatch): Promise<Meeting | null> {
    return nullOnNotFound(async () =>
      parseMeeting(await request(`/meetings/${encodeURIComponent(id)}`, sendJson("PUT", data)))
    );
  },
};

export const availabilityQueries = {
  async create(data: AvailabilityDraft): Promise<Availability> {
    return parseAvailability(await request("/availability", sendJson("POST", data)));
  },

  async findByMeetingId(meetingId: string): Promise<Availability[]> {
    const searchParams = new URLSearchParams({ meeting_id: meetingId });
    return parseAvailabilityList(await request(`/availability?${searchParams.toString()}`));
  },
};
